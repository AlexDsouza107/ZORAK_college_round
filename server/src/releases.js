// Release management: immutable versioned patch sets, canary rollout, rollback, health monitoring.
import { all, get, run, tx } from './db.js';
import * as store from './store.js';
import * as audit from './audit.js';
import { emit } from './bus.js';
import { requireRole } from './users.js';
import { HttpError, now } from './util.js';
import { setHash, latestVerificationFor, smokeCheck, getBrowser } from './verify.js';
import { urlFor } from './proxy.js';

const { Core } = store;

const snapshotPatch = (p) => ({ id: p.id, title: p.title, page: p.page, target: p.target, ops: p.ops, author: p.author, rev: p.rev, status: 'live' });

export function createRelease(siteId, user, { patchIds, note = '', overrideReason, kind = 'manual', skipChecks = false }) {
  requireRole(user, 'reviewer');
  const site = store.mustSite(siteId);
  const patches = store.getPatches(patchIds || []);
  if (!patches.length) throw new HttpError(400, 'Select at least one patch for the release.');
  if (!skipChecks) {
    const unapproved = patches.filter((p) => !['approved', 'live'].includes(p.status));
    if (unapproved.length) throw new HttpError(409, `These patches are not approved yet: ${unapproved.map((p) => p.title).join(', ')}`);
    const conflicts = Core.detectConflicts(patches).filter((c) => c.severity === 'high');
    if (conflicts.length) throw new HttpError(409, `Resolve ${conflicts.length} conflict(s) before releasing.`, { conflicts });
  }
  const hash = setHash(patches);
  const ver = latestVerificationFor(siteId, hash);
  if (!ver && !skipChecks) {
    if (!overrideReason) throw new HttpError(412, 'This exact patch set has not passed verification. Run verification first (admins can override with a reason).', { needsVerification: true });
    requireRole(user, 'admin');
  }
  const version = (get('SELECT MAX(version) AS v FROM releases WHERE site_id = ?', siteId)?.v || 0) + 1;
  const r = run('INSERT INTO releases (site_id, version, status, note, created_by, patch_ids_json, snapshot_json, verification_id, override_reason, kind, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
    siteId, version, 'staged', note, user.id, JSON.stringify(patches.map((p) => p.id)), JSON.stringify(patches.map(snapshotPatch)), ver?.id ?? null, ver || skipChecks ? null : overrideReason || null, kind, now());
  const rel = store.getRelease(Number(r.lastInsertRowid));
  audit.record(siteId, user.id, 'release.created', `${user.name} staged release v${version} (${patches.length} patches)${ver ? ` — verification #${ver.id} ${ver.status}` : skipChecks ? ' — seeded baseline release' : ` — VERIFICATION OVERRIDDEN: ${overrideReason}`}`,
    { releaseId: rel.id, version, patchIds: rel.patchIds, verificationId: ver?.id, override: overrideReason || null });
  emit('release', { siteId, releaseId: rel.id, action: 'staged' });
  return rel;
}

export function deploy(releaseId, user, { canaryPct } = {}) {
  requireRole(user, 'reviewer');
  const rel = store.getRelease(releaseId);
  if (!rel) throw new HttpError(404, 'Unknown release');
  if (rel.status !== 'staged') throw new HttpError(409, `Release v${rel.version} is ${rel.status}, not staged.`);
  const site = store.mustSite(rel.siteId);
  const isCanary = canaryPct && canaryPct > 0 && canaryPct < 100 && site.activeReleaseId;
  const prev = site.activeReleaseId ? store.getRelease(site.activeReleaseId) : null;
  tx(() => {
    if (isCanary) {
      if (site.canaryReleaseId) run("UPDATE releases SET status='cancelled', ended_at=? WHERE id=?", now(), site.canaryReleaseId);
      run('UPDATE sites SET canary_release_id=?, canary_pct=? WHERE id=?', rel.id, canaryPct, site.id);
      run("UPDATE releases SET status='canary', deployed_at=? WHERE id=?", now(), rel.id);
    } else {
      if (prev) run("UPDATE releases SET status='superseded', ended_at=? WHERE id=?", now(), prev.id);
      if (site.canaryReleaseId) run("UPDATE releases SET status='cancelled', ended_at=? WHERE id=?", now(), site.canaryReleaseId);
      run('UPDATE sites SET active_release_id=?, canary_release_id=NULL, canary_pct=0 WHERE id=?', rel.id, site.id);
      run("UPDATE releases SET status='live', deployed_at=? WHERE id=?", now(), rel.id);
      syncPatchStatuses(prev, rel);
    }
  });
  audit.record(site.id, user.id, isCanary ? 'release.canary' : 'release.deployed',
    isCanary ? `${user.name} started a ${canaryPct}% canary of release v${rel.version}` : `${user.name} deployed release v${rel.version} to 100% of traffic`, { releaseId: rel.id, version: rel.version, canaryPct: isCanary ? canaryPct : 100 });
  emit('release', { siteId: site.id, releaseId: rel.id, action: isCanary ? 'canary' : 'deployed' });
  emit('patch', { siteId: site.id, action: 'bulk' });
  postDeployCheck(site.id, rel.id, prev?.id).catch((e) => console.error('[post-deploy]', e.message));
  return store.getRelease(rel.id);
}

export function promote(releaseId, user) {
  requireRole(user, 'reviewer');
  const rel = store.getRelease(releaseId);
  if (!rel || rel.status !== 'canary') throw new HttpError(409, 'Only a canary release can be promoted.');
  const site = store.mustSite(rel.siteId);
  const prev = site.activeReleaseId ? store.getRelease(site.activeReleaseId) : null;
  tx(() => {
    if (prev) run("UPDATE releases SET status='superseded', ended_at=? WHERE id=?", now(), prev.id);
    run('UPDATE sites SET active_release_id=?, canary_release_id=NULL, canary_pct=0 WHERE id=?', rel.id, site.id);
    run("UPDATE releases SET status='live' WHERE id=?", rel.id);
    syncPatchStatuses(prev, rel);
  });
  audit.record(site.id, user.id, 'release.promoted', `${user.name} promoted canary v${rel.version} to 100%`, { releaseId: rel.id, version: rel.version });
  emit('release', { siteId: site.id, releaseId: rel.id, action: 'promoted' });
  emit('patch', { siteId: site.id, action: 'bulk' });
  return store.getRelease(rel.id);
}

function syncPatchStatuses(prev, next) {
  const keep = new Set(next.patchIds);
  for (const id of next.patchIds) run("UPDATE patches SET status='live', updated_at=? WHERE id=?", now(), id);
  if (prev) for (const id of prev.patchIds) if (!keep.has(id)) run("UPDATE patches SET status='reverted', updated_at=? WHERE id=? AND status='live'", now(), id);
}

export function rollback(siteId, user, { toVersion, reason = '', auto = false, canaryOnly = false } = {}) {
  if (!auto) requireRole(user, 'reviewer');
  const site = store.mustSite(siteId);
  if (canaryOnly || (site.canaryReleaseId && toVersion == null && !site.activeReleaseId)) {
    if (!site.canaryReleaseId) throw new HttpError(409, 'No canary running.');
    const c = store.getRelease(site.canaryReleaseId);
    run("UPDATE releases SET status='rolled_back', ended_at=?, note=note||? WHERE id=?", now(), reason ? ` [rollback: ${reason}]` : '', c.id);
    run('UPDATE sites SET canary_release_id=NULL, canary_pct=0 WHERE id=?', siteId);
    audit.record(siteId, user.id, auto ? 'release.auto_rollback' : 'release.rollback', `${auto ? 'AUTO-ROLLBACK' : user.name + ' cancelled'}: canary v${c.version} stopped${reason ? ' — ' + reason : ''}`, { releaseId: c.id, version: c.version, reason, auto });
    emit('release', { siteId, action: 'rollback' });
    return store.getSite(siteId);
  }
  const cur = site.activeReleaseId ? store.getRelease(site.activeReleaseId) : null;
  if (!cur) throw new HttpError(409, 'Nothing is deployed, so there is nothing to roll back.');
  let target = null;
  if (toVersion != null) {
    if (Number(toVersion) !== 0) { target = store.releaseByVersion(siteId, Number(toVersion)); if (!target) throw new HttpError(404, `No release v${toVersion}`); }
  } else {
    target = store.listReleases(siteId).find((r) => r.version < cur.version && r.status === 'superseded') || null;
  }
  tx(() => {
    run("UPDATE releases SET status='rolled_back', ended_at=?, note = note || ? WHERE id=?", now(), reason ? ` [rollback: ${reason}]` : '', cur.id);
    if (site.canaryReleaseId) run("UPDATE releases SET status='cancelled', ended_at=? WHERE id=?", now(), site.canaryReleaseId);
    if (target) run("UPDATE releases SET status='live', ended_at=NULL, deployed_at=? WHERE id=?", now(), target.id);
    run('UPDATE sites SET active_release_id=?, canary_release_id=NULL, canary_pct=0 WHERE id=?', target ? target.id : null, siteId);
    const keep = new Set(target ? target.patchIds : []);
    for (const id of cur.patchIds) if (!keep.has(id)) run("UPDATE patches SET status='reverted', updated_at=? WHERE id=? AND status='live'", now(), id);
    for (const id of keep) run("UPDATE patches SET status='live', updated_at=? WHERE id=?", now(), id);
  });
  audit.record(siteId, user.id, auto ? 'release.auto_rollback' : 'release.rollback',
    `${auto ? 'AUTO-ROLLBACK' : user.name + ' rolled back'}: v${cur.version} → ${target ? 'v' + target.version : 'original site'}${reason ? ' — ' + reason : ''}`,
    { from: cur.version, to: target ? target.version : 0, reason, auto });
  emit('release', { siteId, action: auto ? 'auto_rollback' : 'rollback' });
  emit('patch', { siteId, action: 'bulk' });
  return store.getSite(siteId);
}

/* ------------------------------------------------- post-deploy smoke test */
async function postDeployCheck(siteId, releaseId, prevId) {
  const site = store.getSite(siteId);
  if (!site || !(site.config.flows || []).length) return;
  const rel = store.getRelease(releaseId);
  const source = { kind: 'release', version: rel.version };
  const now_ = await smokeCheck(site, source);
  const failed = now_.filter((r) => !r.ok);
  emit('health', { siteId, releaseId, stage: 'smoke', ok: !failed.length });
  if (!failed.length) {
    audit.record(siteId, 'system', 'health.smoke_pass', `Post-deploy smoke test passed for v${rel.version} (${now_.length} flow${now_.length > 1 ? 's' : ''})`, { releaseId });
    return;
  }
  // only a regression if the same flow passed before this release
  const prevRel = prevId ? store.getRelease(prevId) : null;
  const before = await smokeCheck(site, prevRel ? { kind: 'release', version: prevRel.version } : { kind: 'none' });
  const regressions = failed.filter((f) => before.find((b) => b.flow.id === f.flow.id)?.ok);
  audit.record(siteId, 'system', 'health.smoke_fail', `Post-deploy smoke test: ${failed.map((f) => f.flow.name).join(', ')} failing on v${rel.version}${regressions.length ? ' (REGRESSION)' : ' (pre-existing)'}`, { releaseId, failed: failed.map((f) => ({ flow: f.flow.id, step: f.failedStep })) });
  if (regressions.length && site.config.autoRollback) {
    const fresh = store.getSite(siteId);
    if (fresh.activeReleaseId === releaseId || fresh.canaryReleaseId === releaseId) {
      rollback(siteId, { id: 'system', name: 'PATCHWORK', role: 'admin' }, { auto: true, reason: `smoke test failed: ${regressions[0].flow.name} at "${regressions[0].failedStep}"`, canaryOnly: fresh.canaryReleaseId === releaseId });
    }
  }
}

/* ------------------------------------------------- telemetry health monitor */
export function releaseHealth(siteId, releaseId, windowMs = 60000) {
  const since = now() - windowMs;
  const rows = all("SELECT type, COUNT(*) AS n FROM events WHERE site_id = ? AND release_id = ? AND ts > ? GROUP BY type", siteId, releaseId, since);
  const n = Object.fromEntries(rows.map((r) => [r.type, r.n]));
  return { errors: n.error || 0, healed: n.heal || 0, orphaned: n.orphan || 0, jsErrors: n.js_error || 0, windowMs };
}
export function startHealthMonitor() {
  setInterval(() => {
    for (const site of store.listSites()) {
      if (!site.config.autoRollback) continue;
      for (const rid of [site.canaryReleaseId, site.activeReleaseId].filter(Boolean)) {
        const h = releaseHealth(site.id, rid);
        if (h.errors >= (site.config.errorThreshold || 4)) {
          const rel = store.getRelease(rid);
          try {
            rollback(site.id, { id: 'system', name: 'PATCHWORK', role: 'admin' }, { auto: true, canaryOnly: rid === site.canaryReleaseId, reason: `${h.errors} patch runtime errors in the last minute on v${rel.version}` });
          } catch (e) { /* already handled */ }
          break;
        }
      }
    }
  }, 4000).unref();
}

/* ---------------------------------------------------- synthetic traffic */
export async function simulateTraffic(siteId, visits = 6, paths = ['/', '/cart']) {
  const site = store.mustSite(siteId);
  const browser = await getBrowser();
  const out = [];
  for (let i = 0; i < visits; i++) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    try {
      for (const p of paths) {
        await page.goto(urlFor(site.id, { kind: 'live' }, false, p), { waitUntil: 'load', timeout: 12000 });
        await page.waitForFunction(() => window.__PW_STATE__ && window.__PW_STATE__.ready, null, { timeout: 5000 }).catch(() => {});
        await page.waitForTimeout(250);
      }
      out.push(await page.evaluate(() => ({ mode: window.__PW_STATE__?.mode, release: window.__PW_STATE__?.release?.version })));
    } catch (e) { out.push({ error: e.message }); }
    await ctx.close();
  }
  emit('telemetry', { siteId, kind: 'traffic' });
  return out;
}
