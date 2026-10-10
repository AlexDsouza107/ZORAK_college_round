// Automated verification: loads the *current live* site (baseline) and the *candidate* patch set in a real
// Chromium, then compares them. A release can only ship if this passes (admins may override, and it is audited).
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { get, run, ARTIFACT_DIR } from './db.js';
import * as store from './store.js';
import * as audit from './audit.js';
import { emit } from './bus.js';
import { createPreview, urlFor } from './proxy.js';
import { sha, now } from './util.js';

const require = createRequire(import.meta.url);
const AXE_SRC = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const VIEWPORTS = { desktop: { width: 1366, height: 820 }, mobile: { width: 390, height: 844 } };
const STEP_TIMEOUT = 3000;

let browserPromise = null;
export const getBrowser = () => (browserPromise ||= chromium.launch({ headless: true }));
export async function closeBrowser() { if (browserPromise) { const b = await browserPromise; browserPromise = null; await b.close(); } }

let queue = Promise.resolve();
const enqueue = (fn) => (queue = queue.then(fn, fn));

export const setHash = (patches) => sha(patches.map((p) => `${p.id}@${p.rev}`).sort().join(','));
export const slug = (s) => (s === '/' ? 'home' : s.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, ''));

export function getVerification(id) {
  const v = get('SELECT * FROM verifications WHERE id = ?', id);
  if (!v) return null;
  return { id: v.id, siteId: v.site_id, patchIds: v.patch_ids, setHash: v.set_hash, status: v.status, report: v.report, startedBy: v.started_by, createdAt: v.created_at, finishedAt: v.finished_at };
}
export const latestVerificationFor = (siteId, hash) => {
  const v = get("SELECT id FROM verifications WHERE site_id = ? AND set_hash = ? AND status IN ('pass','warn') ORDER BY id DESC LIMIT 1", siteId, hash);
  return v ? getVerification(v.id) : null;
};

export function startVerification(site, patchIds, user) {
  const patches = store.getPatches(patchIds);
  const hash = setHash(patches);
  const r = run('INSERT INTO verifications (site_id, patch_ids_json, set_hash, status, report_json, started_by, created_at) VALUES (?,?,?,?,?,?,?)',
    site.id, JSON.stringify(patchIds), hash, 'running', JSON.stringify({ stage: 'queued', checks: [] }), user.id, now());
  const id = Number(r.lastInsertRowid);
  audit.record(site.id, user.id, 'verify.started', `${user.name} started verification #${id} (${patches.length} patches)`, { verificationId: id, patchIds });
  emit('verification', { siteId: site.id, id, stage: 'queued', progress: 0 });
  enqueue(() => execute(site, id, patches, user)).catch(() => {});
  return id;
}

function progress(siteId, id, stage, pct, extra = {}) {
  const v = get('SELECT report_json FROM verifications WHERE id = ?', id);
  const rep = { ...(v?.report || {}), stage, progress: pct, ...extra };
  run('UPDATE verifications SET report_json = ? WHERE id = ?', JSON.stringify(rep), id);
  emit('verification', { siteId, id, stage, progress: pct });
}

async function execute(site, id, patches, user) {
  const t0 = Date.now();
  const checks = [];
  const add = (c) => checks.push(c);
  const dir = path.join(ARTIFACT_DIR, `v${id}`);
  fs.mkdirSync(dir, { recursive: true });
  try {
    progress(site.id, id, 'launching browser', 3);
    const browser = await getBrowser();
    const active = site.activeReleaseId ? store.getRelease(site.activeReleaseId) : null;
    const baseSrc = active ? { kind: 'release', version: active.version } : { kind: 'none' };
    const token = createPreview(site.id, patches.map((p) => p.id));
    const candSrc = { kind: 'preview', token };
    const baseLabel = active ? `Live release v${active.version}` : 'Original site (no patches)';

    const concrete = patches.map((p) => p.page).filter((p) => p && !p.includes('*'));
    const pages = [...new Set([...(site.config.verifyPages || ['/']), ...concrete])];
    const vpNames = Object.keys(VIEWPORTS);
    const artifacts = [];
    const patchResults = {};
    const consoleBase = {}, a11yAll = { fixed: [], introduced: [] };
    const total = pages.length * vpNames.length;
    let done = 0;

    for (const vp of vpNames) {
      for (const pg of pages) {
        progress(site.id, id, `checking ${pg} (${vp})`, 5 + Math.round((done / total) * 55));
        const [b, c] = await Promise.all([
          capture(browser, urlFor(site.id, baseSrc, false, pg), VIEWPORTS[vp], vp === 'mobile'),
          capture(browser, urlFor(site.id, candSrc, false, pg), VIEWPORTS[vp], vp === 'mobile')
        ]);
        done++;
        const tag = `${vp} ${pg}`;
        // 1. patches apply
        for (const p of patches) {
          const st = c.state?.patches?.[p.id];
          if (!st || st.status === 'skipped') continue;
          const prev = patchResults[p.id];
          if (!prev || rank(st.status) > rank(prev.status)) patchResults[p.id] = { ...st, page: pg, viewport: vp };
          else if (prev && !prev.bboxBefore && st.bboxBefore) patchResults[p.id] = { ...prev, bboxBefore: st.bboxBefore };
        }
        // 2. console + network regressions
        const newErrors = c.errors.filter((e) => !b.errors.includes(e));
        const newNet = c.failedRequests.filter((e) => !b.failedRequests.includes(e));
        if (newErrors.length) add({ id: `console:${tag}`, name: `No new console errors — ${tag}`, status: 'fail', detail: newErrors.slice(0, 3).join(' | '), viewport: vp, page: pg });
        if (newNet.length) add({ id: `net:${tag}`, name: `No new failed requests — ${tag}`, status: 'fail', detail: newNet.slice(0, 3).join(' | '), viewport: vp, page: pg });
        if (!newErrors.length && !newNet.length && vp === 'desktop') add({ id: `console:${tag}`, name: `No new console errors or failed requests — ${pg}`, status: 'pass', detail: `${c.errors.length} console messages (baseline ${b.errors.length})`, viewport: vp, page: pg });
        // 3. accessibility
        const ax = diffA11y(b.axe, c.axe);
        a11yAll.fixed.push(...ax.fixed.map((x) => ({ ...x, page: pg, viewport: vp })));
        a11yAll.introduced.push(...ax.introduced.map((x) => ({ ...x, page: pg, viewport: vp })));
        if (ax.introduced.some((x) => ['serious', 'critical'].includes(x.impact))) add({ id: `a11y:${tag}`, name: `Accessibility — ${tag}`, status: 'fail', detail: 'New serious violations: ' + ax.introduced.map((x) => `${x.id} (${x.nodes})`).join(', '), viewport: vp, page: pg });
        else if (ax.introduced.length) add({ id: `a11y:${tag}`, name: `Accessibility — ${tag}`, status: 'warn', detail: 'New minor issues: ' + ax.introduced.map((x) => `${x.id} (${x.nodes})`).join(', '), viewport: vp, page: pg });
        else if (vp === 'desktop') add({ id: `a11y:${tag}`, name: `Accessibility — ${pg}`, status: 'pass', detail: ax.fixed.length ? `Fixed ${ax.fixed.length} existing issue(s): ${ax.fixed.map((x) => x.id).join(', ')}` : `No new violations (${c.axe.length} existing)`, viewport: vp, page: pg });
        // 4. visual regression
        const regions = [];
        for (const p of patches) { const st = c.state?.patches?.[p.id]; if (st?.bboxBefore) regions.push(st.bboxBefore); if (st?.bboxAfter) regions.push(st.bboxAfter); }
        const vis = visualDiff(b.png, c.png, regions, dir, `${vp}-${slug(pg)}`);
        const files = { before: `${vp}-${slug(pg)}-before.png`, after: `${vp}-${slug(pg)}-after.png`, diff: `${vp}-${slug(pg)}-diff.png` };
        artifacts.push({ viewport: vp, page: pg, ...Object.fromEntries(Object.entries(files).map(([k, f]) => [k, `/api/artifacts/v${id}/${f}`])), ratio: vis.ratio, unexpected: vis.unexpected, heightBefore: vis.h0, heightAfter: vis.h1 });
        const { failRatio, warnRatio } = site.config.visual;
        const st = vis.unexpected > failRatio ? 'fail' : vis.unexpected > warnRatio ? 'warn' : 'pass';
        add({ id: `visual:${tag}`, name: `Visual regression — ${tag}`, status: st, viewport: vp, page: pg,
          detail: `${(vis.ratio * 100).toFixed(2)}% of pixels changed; ${(vis.unexpected * 100).toFixed(2)}% outside the patched regions${vis.shift ? ` · content shifted ${vis.shift > 0 ? '+' : ''}${vis.shift}px vertically — accounted for` : ''}${vis.h0 !== vis.h1 ? ` · page height ${vis.h0}px → ${vis.h1}px` : ''}` });
        // 5. blast radius
        if (vp === 'desktop') {
          for (const p of patches) {
            const r = c.state?.patches?.[p.id];
            if (!r?.bboxBefore) continue;
            const area = (r.bboxBefore.w * r.bboxBefore.h) / (VIEWPORTS.desktop.width * Math.max(vis.h0, VIEWPORTS.desktop.height));
            const destructive = p.ops.some((o) => o.type === 'remove' || (o.type === 'setStyle' && ((o.prop === 'display' && o.value === 'none') || (o.prop === 'visibility' && o.value === 'hidden') || (o.prop === 'opacity' && Number(o.value) === 0))) || (o.type === 'setHTML' && !o.value));
            if (destructive && area > 0.25) add({ id: `blast:${p.id}:${pg}`, name: `Blast radius — "${p.title}"`, status: 'fail', detail: `Hides or removes an element covering ${(area * 100).toFixed(0)}% of the page on ${pg}.`, page: pg });
          }
        }
      }
    }

    // patch application checks (aggregated across pages)
    for (const p of patches) {
      const r = patchResults[p.id];
      if (p.ops.every((o) => o.type === 'css')) { add({ id: `apply:${p.id}`, name: `Applies: ${p.title}`, status: 'pass', detail: 'Stylesheet patch injected.' }); continue; }
      if (!r) add({ id: `apply:${p.id}`, name: `Applies: ${p.title}`, status: 'warn', detail: `Not exercised: page "${p.page}" is not part of the verification pages.` });
      else if (r.status === 'error') add({ id: `apply:${p.id}`, name: `Applies: ${p.title}`, status: 'fail', detail: `Runtime error while applying: ${r.error}` });
      else if (r.status === 'orphaned' || r.status === 'review') add({ id: `apply:${p.id}`, name: `Applies: ${p.title}`, status: 'fail', detail: `Target element could not be located confidently (${r.status}, ${Math.round((r.confidence || 0) * 100)}%).` });
      else add({ id: `apply:${p.id}`, name: `Applies: ${p.title}`, status: 'pass', detail: r.status === 'healed' ? `Re-anchored to a moved element (${Math.round(r.confidence * 100)}% confidence).` : `Target found (${Math.round((r.confidence || 1) * 100)}%).` });
    }

    // critical flows (baseline vs candidate)
    const flowReports = [];
    const flows = site.config.flows || [];
    for (let i = 0; i < flows.length; i++) {
      const flow = flows[i];
      progress(site.id, id, `running flow "${flow.name}"`, 62 + Math.round((i / Math.max(1, flows.length)) * 30));
      const [fb, fc] = await Promise.all([
        runFlow(browser, urlFor(site.id, baseSrc, false, '/'), flow, VIEWPORTS.desktop),
        runFlow(browser, urlFor(site.id, candSrc, false, '/'), flow, VIEWPORTS.desktop)
      ]);
      flowReports.push({ id: flow.id, name: flow.name, baseline: fb, candidate: fc });
      if (fc.ok) add({ id: `flow:${flow.id}`, name: `Critical flow: ${flow.name}`, status: 'pass', detail: fb.ok ? `All ${fc.steps.length} steps pass.` : `Fixed — failed at "${fb.failedStep}" on the baseline, passes with these patches.`, fixed: !fb.ok });
      else if (!fb.ok) add({ id: `flow:${flow.id}`, name: `Critical flow: ${flow.name}`, status: 'warn', detail: `Still failing at "${fc.failedStep}" (already failing on the baseline).` });
      else add({ id: `flow:${flow.id}`, name: `Critical flow: ${flow.name}`, status: 'fail', detail: `Regression — passed on the baseline but now fails at "${fc.failedStep}": ${fc.error}` });
    }

    const summary = { pass: 0, warn: 0, fail: 0 };
    checks.forEach((c) => summary[c.status]++);
    const status = summary.fail ? 'fail' : summary.warn ? 'warn' : 'pass';
    const report = {
      stage: 'done', progress: 100, baseline: baseLabel, baselineSource: baseSrc, pages, viewports: vpNames, checks, summary, artifacts,
      flows: flowReports, a11y: a11yAll, durationMs: Date.now() - t0,
      patches: patches.map((p) => ({ id: p.id, title: p.title, state: patchResults[p.id] ? { status: patchResults[p.id].status, confidence: patchResults[p.id].confidence, matchedOn: patchResults[p.id].matchedOn } : null }))
    };
    run('UPDATE verifications SET status=?, report_json=?, finished_at=? WHERE id=?', status, JSON.stringify(report), now(), id);
    audit.record(site.id, user.id, 'verify.finished', `Verification #${id} ${status.toUpperCase()} — ${summary.pass} passed, ${summary.warn} warnings, ${summary.fail} failed`, { verificationId: id, status, summary });
    emit('verification', { siteId: site.id, id, stage: 'done', progress: 100, status });
  } catch (e) {
    const report = { stage: 'error', progress: 100, error: String(e.message || e), checks };
    run('UPDATE verifications SET status=?, report_json=?, finished_at=? WHERE id=?', 'error', JSON.stringify(report), now(), id);
    audit.record(site.id, user.id, 'verify.finished', `Verification #${id} errored: ${e.message}`, { verificationId: id });
    emit('verification', { siteId: site.id, id, stage: 'error', progress: 100, status: 'error' });
  }
}

const RANK = { orphaned: 0, review: 1, error: 1, healed: 3, exact: 4 };
const rank = (s) => RANK[s] ?? 2;

async function capture(browser, url, viewport, mobile) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile });
  const page = await ctx.newPage();
  const errors = [], failedRequests = [];
  page.on('pageerror', (e) => errors.push('Uncaught: ' + String(e.message).slice(0, 140)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 140)); });
  page.on('response', (r) => { if (r.status() >= 400 && !/favicon/.test(r.url())) failedRequests.push(`${r.status()} ${new URL(r.url()).pathname}`); });
  page.on('requestfailed', (r) => { if (!/favicon/.test(r.url())) failedRequests.push(`FAILED ${new URL(r.url()).pathname}`); });
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 15000 });
    await page.waitForFunction(() => window.__PW_STATE__ && window.__PW_STATE__.ready, null, { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(450);
    const state = await page.evaluate(() => JSON.parse(JSON.stringify(window.__PW_STATE__ || {}))).catch(() => ({}));
    await page.addScriptTag({ content: AXE_SRC });
    const axeRes = await page.evaluate(() => axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'], resultTypes: ['violations'] })).catch(() => ({ violations: [] }));
    const png = await page.screenshot({ fullPage: true });
    return { png, state, errors: [...new Set(errors)], failedRequests: [...new Set(failedRequests)], axe: axeRes.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help })) };
  } finally { await ctx.close(); }
}

function diffA11y(base, cand) {
  const bm = Object.fromEntries(base.map((v) => [v.id, v])), cm = Object.fromEntries(cand.map((v) => [v.id, v]));
  const introduced = [], fixed = [];
  for (const v of cand) if (!bm[v.id] || v.nodes > bm[v.id].nodes) introduced.push(v);
  for (const v of base) if (!cm[v.id] || cm[v.id].nodes < v.nodes) fixed.push(v);
  return { introduced, fixed };
}

function visualDiff(pngA, pngB, regions, dir, name) {
  const a = PNG.sync.read(pngA), b = PNG.sync.read(pngB);
  const w = Math.max(a.width, b.width), h = Math.max(a.height, b.height);
  const pad = (img) => {
    if (img.width === w && img.height === h) return img;
    const out = new PNG({ width: w, height: h }); out.data.fill(255); PNG.bitblt(img, out, 0, 0, img.width, img.height, 0, 0); return out;
  };
  const A = pad(a), Bp = pad(b), out = new PNG({ width: w, height: h });
  const mismatched = pixelmatch(A.data, Bp.data, out.data, w, h, { threshold: 0.12, includeAA: false, alpha: 0.35 });
  const rects = regions.map((r) => ({ x0: r.x - 40, y0: r.y - 40, x1: r.x + r.w + 40, y1: r.y + r.h + 40 }));
  let unexpected = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (out.data[i] === 255 && out.data[i + 1] === 0 && out.data[i + 2] === 0) {
        if (rects.some((r) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1)) { out.data[i] = 99; out.data[i + 1] = 102; out.data[i + 2] = 241; }
        else unexpected++;
      }
    }
  }
  // Layout-shift tolerance: a patch that inserts/removes content moves everything below it. Search for the vertical
  // offset that best re-aligns the lower part of the page, then count only the differences that remain.
  let delta = 0;
  if (regions.length && unexpected / (w * h) > 0.004) {
    const y0 = Math.max(0, Math.min(...regions.map((r) => r.y + r.h)));
    const inRect = (x, y, yb) => rects.some((r) => x >= r.x0 && x <= r.x1 && ((y >= r.y0 && y <= r.y1) || (yb >= r.y0 && yb <= r.y1)));
    const count = (d, step) => {
      let n = 0;
      for (let y = 0; y < a.height; y += step) {
        const yb = y >= y0 ? y + d : y;
        if (yb < 0 || yb >= b.height) continue;
        for (let x = 0; x < w && x < a.width && x < b.width; x += step) {
          if (inRect(x, y, yb)) continue;
          const i = (y * a.width + x) * 4, k = (yb * b.width + x) * 4;
          if (Math.abs(a.data[i] - b.data[k]) + Math.abs(a.data[i + 1] - b.data[k + 1]) + Math.abs(a.data[i + 2] - b.data[k + 2]) > 60) n++;
        }
      }
      return n;
    };
    let best = { d: 0, n: count(0, 3) };
    for (let d = -400; d <= 400; d += 1) { if (d === 0) continue; const n = count(d, 5); if (n * 2.2 < best.n) best = { d, n: n * 2.2 }; }
    if (best.d !== 0) {
      const full = count(best.d, 1);
      if (full < unexpected) { unexpected = full; delta = best.d; }
    }
  }
  fs.writeFileSync(path.join(dir, `${name}-before.png`), PNG.sync.write(a));
  fs.writeFileSync(path.join(dir, `${name}-after.png`), PNG.sync.write(b));
  fs.writeFileSync(path.join(dir, `${name}-diff.png`), PNG.sync.write(out));
  return { ratio: mismatched / (w * h), unexpected: unexpected / (w * h), h0: a.height, h1: b.height, shift: delta };
}

export async function runFlow(browser, baseUrl, flow, viewport) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const origin = new URL(baseUrl).origin;
  const steps = [];
  try {
    for (const s of flow.steps) {
      const label = s.label || `${s.do} ${s.sel || s.url || s.value || ''}`.trim();
      try {
        if (s.do === 'goto') await page.goto(origin + s.url, { waitUntil: 'load', timeout: 10000 });
        else if (s.do === 'click') await page.locator(s.sel).first().click({ timeout: STEP_TIMEOUT });
        else if (s.do === 'fill') await page.locator(s.sel).first().fill(s.value, { timeout: STEP_TIMEOUT });
        else if (s.do === 'expectVisible') await page.locator(s.sel).first().waitFor({ state: 'visible', timeout: STEP_TIMEOUT });
        else if (s.do === 'expectUrl') await page.waitForURL((u) => u.pathname === s.value, { timeout: STEP_TIMEOUT });
        else if (s.do === 'expectText') await page.locator(s.sel).first().filter({ hasText: s.value }).waitFor({ timeout: STEP_TIMEOUT });
        steps.push({ label, ok: true });
      } catch (e) {
        steps.push({ label, ok: false });
        const msg = String(e.message || e).split('\n')[0];
        return { ok: false, steps, failedStep: label, error: /Timeout/.test(msg) ? `timed out after ${STEP_TIMEOUT / 1000}s (element missing, disabled or covered)` : msg.slice(0, 160) };
      }
    }
    return { ok: true, steps };
  } finally { await ctx.close(); }
}

// Used by post-deploy smoke tests and drift checks
export async function smokeCheck(site, source, flowsOnly = true) {
  const browser = await getBrowser();
  const results = [];
  for (const flow of site.config.flows || []) results.push({ flow, ...(await runFlow(browser, urlFor(site.id, source, false, '/'), flow, VIEWPORTS.desktop)) });
  return results;
}
