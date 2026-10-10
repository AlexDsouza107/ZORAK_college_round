// Drift watcher: re-opens the ORIGINAL site (no patches) in a real browser, asks the tracker where each live
// patch's target is now, and reports which ones moved, healed, or were lost. Can re-anchor + re-release automatically.
import fs from 'node:fs';
import path from 'node:path';
import { get, run, all } from './db.js';
import * as store from './store.js';
import * as audit from './audit.js';
import { emit } from './bus.js';
import { getBrowser, startVerification, getVerification } from './verify.js';
import { createRelease, deploy } from './releases.js';
import { urlFor } from './proxy.js';
import { now, sleep } from './util.js';

const { Core } = store;
const SYSTEM = { id: 'system', name: 'PATCHWORK Drift Watcher', role: 'admin' };

export function latestDrift(siteId) {
  const r = get('SELECT * FROM drift_runs WHERE site_id = ? ORDER BY id DESC LIMIT 1', siteId);
  return r ? { id: r.id, siteId: r.site_id, status: r.status, report: r.report, createdAt: r.created_at, finishedAt: r.finished_at } : null;
}

function watchedPatches(site) {
  const ids = new Set();
  for (const rid of [site.activeReleaseId, site.canaryReleaseId].filter(Boolean)) store.getRelease(rid)?.patchIds.forEach((i) => ids.add(i));
  return store.getPatches([...ids]);
}

export async function runDrift(siteId, actor = SYSTEM) {
  const site = store.mustSite(siteId);
  const patches = watchedPatches(site);
  const r = run('INSERT INTO drift_runs (site_id, status, report_json, created_at) VALUES (?,?,?,?)', siteId, 'running', '{}', now());
  const id = Number(r.lastInsertRowid);
  emit('drift', { siteId, id, stage: 'running' });
  const prev = latestDrift(siteId);
  const browser = await getBrowser();
  const pages = [...new Set(patches.flatMap((p) => (p.page && !p.page.includes('*') ? [p.page] : site.config.verifyPages || ['/'])))];
  const results = {}, pageHashes = {};
  try {
    for (const pg of pages) {
      const ctx = await browser.newContext({ viewport: { width: 1366, height: 820 } });
      const page = await ctx.newPage();
      try {
        await page.goto(urlFor(siteId, { kind: 'none' }, false, pg), { waitUntil: 'load', timeout: 15000 });
        await page.waitForTimeout(400);
        const out = await page.evaluate((list) => {
          const C = window.PWCore;
          const res = list.map((p) => {
            if (!C.pageMatches(p.page, location.pathname)) return null;
            const r = C.locate(document, p.target);
            const el = r.el || r.bestEl;
            return { id: p.id, status: r.status, confidence: r.confidence, matchedOn: r.matchedOn, changed: r.changed, candidates: r.candidates,
              newTarget: el ? C.describe(el) : null, selectorHit: r.selectorHit };
          }).filter(Boolean);
          return { res, hash: C.pageHash(document) };
        }, patches.map((p) => ({ id: p.id, page: p.page, target: p.target })));
        pageHashes[pg] = out.hash;
        for (const x of out.res) if (!results[x.id] || x.confidence > results[x.id].confidence) results[x.id] = { ...x, page: pg };
      } finally { await ctx.close(); }
    }
    const rows = patches.map((p) => {
      const x = results[p.id];
      if (!x) return { patchId: p.id, title: p.title, status: 'unchecked', confidence: 0, page: p.page, matchedOn: [], changed: [], oldSelector: p.target.selector };
      store.setHealth(p.id, 'drift', x.status, x.confidence, { matchedOn: x.matchedOn, changed: x.changed, selector: x.newTarget?.selector, page: x.page });
      return { patchId: p.id, title: p.title, status: x.status, confidence: x.confidence, page: x.page, matchedOn: x.matchedOn, changed: x.changed,
        oldSelector: p.target.selector, newSelector: x.newTarget?.selector, candidates: x.candidates, newTarget: x.newTarget, oldText: p.target.text, newText: x.newTarget?.text };
    });
    const summary = { exact: 0, healed: 0, review: 0, orphaned: 0, unchecked: 0 };
    rows.forEach((x) => (summary[x.status] = (summary[x.status] || 0) + 1));
    const siteChanged = prev?.report?.pageHashes ? Object.keys(pageHashes).some((k) => prev.report.pageHashes[k] && prev.report.pageHashes[k] !== pageHashes[k]) : false;
    const report = { rows, summary, pageHashes, siteChanged, pages, patchCount: patches.length };
    run('UPDATE drift_runs SET status=?, report_json=?, finished_at=? WHERE id=?', 'done', JSON.stringify(report), now(), id);
    audit.record(siteId, actor.id, 'drift.checked', `Drift check #${id}: ${summary.exact} exact, ${summary.healed} healed, ${summary.review} need review, ${summary.orphaned} lost${siteChanged ? ' — SITE STRUCTURE CHANGED' : ''}`, { driftId: id, summary, siteChanged });
    emit('drift', { siteId, id, stage: 'done' });
    return latestDrift(siteId);
  } catch (e) {
    run('UPDATE drift_runs SET status=?, report_json=?, finished_at=? WHERE id=?', 'error', JSON.stringify({ error: e.message }), now(), id);
    emit('drift', { siteId, id, stage: 'error' });
    throw e;
  }
}

// Re-anchor healed patches to their new location, verify the result, and ship it as a new release.
export async function healAndRelease(siteId, actor = SYSTEM) {
  const site = store.mustSite(siteId);
  emit('drift', { siteId, stage: 'healing', message: 'Checking where elements moved…' });
  const d = await runDrift(siteId, actor);
  const healable = d.report.rows.filter((x) => x.status === 'healed' && x.newTarget && x.newSelector !== x.oldSelector);
  if (!healable.length) {
    emit('drift', { siteId, stage: 'healed', message: 'Nothing to re-anchor.' });
    return { released: false, reason: 'No patches needed re-anchoring.', drift: d };
  }
  for (const x of healable) {
    const p = store.getPatch(x.patchId);
    run('UPDATE patches SET target_json=?, rev=rev+1, updated_at=? WHERE id=?', JSON.stringify({ ...x.newTarget }), now(), p.id);
    audit.record(siteId, actor.id, 'patch.reanchored', `Re-anchored "${p.title}" ${x.oldSelector} → ${x.newSelector} (${Math.round(x.confidence * 100)}% confidence)`, { patchId: p.id, from: x.oldSelector, to: x.newSelector, confidence: x.confidence, matchedOn: x.matchedOn });
    store.setHealth(p.id, 'drift', 'reanchored', x.confidence, { from: x.oldSelector, to: x.newSelector });
  }
  emit('drift', { siteId, stage: 'verifying', message: `Re-anchored ${healable.length} patch(es). Verifying…` });
  const active = store.getRelease(site.activeReleaseId);
  const ids = active.patchIds;
  const vid = startVerification(site, ids, actor);
  let v;
  for (let i = 0; i < 180; i++) { await sleep(1000); v = getVerification(vid); if (v.status !== 'running') break; }
  if (v.status === 'fail' || v.status === 'error') {
    audit.record(siteId, actor.id, 'drift.heal_blocked', `Auto-heal release blocked: verification #${vid} ${v.status}`, { verificationId: vid });
    emit('drift', { siteId, stage: 'blocked', message: 'Verification failed — nothing was released.' });
    return { released: false, reason: 'Verification failed', verificationId: vid };
  }
  const rel = createRelease(siteId, actor, { patchIds: ids, note: `Auto-heal: re-anchored ${healable.length} patch(es) after the site changed`, kind: 'auto-heal' });
  deploy(rel.id, actor, {});
  emit('drift', { siteId, stage: 'healed', message: `Released v${rel.version} with ${healable.length} re-anchored patch(es).` });
  return { released: true, release: rel, verificationId: vid };
}

export function startDriftWatcher() {
  setInterval(async () => {
    for (const s of store.listSites()) {
      const sec = Number(s.config.driftWatchSec || 0);
      if (!sec || !s.activeReleaseId) continue;
      const last = latestDrift(s.id);
      if (last && now() - last.createdAt < sec * 1000) continue;
      try { s.config.autoHeal ? await healAndRelease(s.id) : await runDrift(s.id); } catch (e) { console.error('[drift]', e.message); }
    }
  }, 5000).unref();
}
