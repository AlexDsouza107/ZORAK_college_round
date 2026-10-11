import fs from 'node:fs';
import * as store from './store.js';
import * as audit from './audit.js';
import * as conflicts from './conflicts.js';
import * as releases from './releases.js';
import * as drift from './drift.js';
import * as ai from './ai.js';
import { USERS, userFrom, requireRole } from './users.js';
import { sseHandler, touchPresence, listPresence, emit } from './bus.js';
import { createPreview, urlFor, PORT } from './proxy.js';
import { startVerification, getVerification, setHash } from './verify.js';
import { proposeFix } from './autofix.js';
import { all, get } from './db.js';
import { HttpError } from './util.js';
import { seedDemo } from './seed.js';

const DEMO_URL = process.env.SHOPLITE_URL || `http://localhost:${process.env.SHOPLITE_PORT || 4100}`;

export default async function routes(app) {
  app.get('/api/health', async () => ({ ok: true, port: PORT, ai: ai.aiStatus() }));
  app.get('/api/users', async () => Object.values(USERS));
  app.get('/api/stream', sseHandler);
  app.post('/api/presence', async (req) => { const u = userFrom(req); touchPresence(u.id, req.body.siteId, req.body.activity); return { users: listPresence(req.body.siteId) }; });
  app.get('/api/sites/:id/presence', async (req) => listPresence(req.params.id));

  /* ---------------------------------------------------------------- sites */
  app.get('/api/sites', async () => store.listSites());
  app.post('/api/sites', async (req) => { requireRole(userFrom(req), 'admin'); const s = store.createSite(req.body); audit.record(s.id, userFrom(req).id, 'site.created', `Registered site ${s.name} (${s.origin})`, {}); return s; });
  app.get('/api/sites/:id', async (req) => {
    const site = store.mustSite(req.params.id);
    const patches = store.listPatches(site.id);
    const counts = patches.reduce((m, p) => ((m[p.status] = (m[p.status] || 0) + 1), m), {});
    const active = site.activeReleaseId ? store.getRelease(site.activeReleaseId) : null;
    const canary = site.canaryReleaseId ? store.getRelease(site.canaryReleaseId) : null;
    const strip = (r) => r && { ...r, snapshot: undefined };
    return {
      site, counts, active: strip(active), canary: strip(canary),
      health: active ? releases.releaseHealth(site.id, active.id) : null, canaryHealth: canary ? releases.releaseHealth(site.id, canary.id) : null,
      proxyPort: PORT, presence: listPresence(site.id)
    };
  });
  app.put('/api/sites/:id/config', async (req) => {
    requireRole(userFrom(req), 'admin');
    const s = store.updateSiteConfig(req.params.id, req.body);
    audit.record(s.id, userFrom(req).id, 'site.config', `${userFrom(req).name} changed site settings`, { keys: Object.keys(req.body) });
    emit('site', { siteId: s.id });
    return s;
  });

  /* -------------------------------------------------------------- patches */
  const withHealth = (siteId, list) => {
    const health = store.listHealth(siteId);
    return list.map((p) => ({ ...p, health: Object.fromEntries(health.filter((h) => h.patchId === p.id).map((h) => [h.source, h])), usesScript: store.usesScript(p.ops) }));
  };
  app.get('/api/sites/:id/patches', async (req) => withHealth(req.params.id, store.listPatches(req.params.id)));
  app.post('/api/sites/:id/patches', async (req) => store.createPatch(req.params.id, userFrom(req), req.body));
  app.get('/api/patches/:id', async (req) => { const p = store.mustPatch(req.params.id); return { ...withHealth(p.siteId, [p])[0], comments: store.listComments(p.id) }; });
  app.put('/api/patches/:id', async (req) => store.updatePatch(req.params.id, userFrom(req), req.body));
  app.delete('/api/patches/:id', async (req) => { store.deletePatch(req.params.id, userFrom(req)); return { ok: true }; });
  app.post('/api/patches/:id/comments', async (req) => { store.addComment(req.params.id, userFrom(req), req.body.body); return store.listComments(req.params.id); });
  app.post('/api/patches/:id/submit', async (req) => {
    const p = store.mustPatch(req.params.id);
    if (!['draft', 'rejected', 'reverted'].includes(p.status)) throw new HttpError(409, `A ${p.status} patch cannot be submitted.`);
    return store.setStatus(p.id, 'review', userFrom(req), req.body?.note, 'patch.submitted');
  });
  app.post('/api/patches/:id/withdraw', async (req) => store.setStatus(req.params.id, 'draft', userFrom(req), 'withdrawn', 'patch.withdrawn'));
  app.post('/api/patches/:id/approve', async (req) => {
    const u = userFrom(req); requireRole(u, 'reviewer');
    const p = store.mustPatch(req.params.id);
    if (p.status !== 'review') throw new HttpError(409, 'Only patches in review can be approved.');
    if (p.author === u.id && u.role !== 'admin') throw new HttpError(403, 'Four-eyes rule: you cannot approve your own patch.');
    if (store.usesScript(p.ops) && u.role !== 'admin') throw new HttpError(403, 'Patches that run custom scripts need an admin to approve them.');
    if (req.body?.comment) store.addComment(p.id, u, req.body.comment, 'review');
    return store.setStatus(p.id, 'approved', u, req.body?.comment, 'patch.approved');
  });
  app.post('/api/patches/:id/reject', async (req) => {
    const u = userFrom(req); requireRole(u, 'reviewer');
    const p = store.mustPatch(req.params.id);
    if (!['review', 'approved'].includes(p.status)) throw new HttpError(409, 'Only patches in review/approved can be rejected.');
    if (req.body?.comment) store.addComment(p.id, u, req.body.comment, 'review');
    return store.setStatus(p.id, 'rejected', u, req.body?.comment, 'patch.rejected');
  });

  /* ------------------------------------------------------------ conflicts */
  app.get('/api/sites/:id/conflicts', async (req) => {
    const ids = req.query.ids ? String(req.query.ids).split(',').filter(Boolean) : null;
    return ids ? conflicts.conflictsFor(ids) : conflicts.siteConflicts(req.params.id);
  });
  app.post('/api/conflicts/resolve', async (req) => conflicts.resolve(userFrom(req), req.body));
  app.post('/api/conflicts/suggest', async (req) => {
    const { conflict } = req.body;
    return ai.suggestResolution({ conflict, patchA: store.mustPatch(conflict.a), patchB: store.mustPatch(conflict.b) });
  });

  /* ------------------------------------------------- previews & verification */
  app.post('/api/sites/:id/previews', async (req) => {
    const ids = req.body.patchIds || [];
    const token = createPreview(req.params.id, ids);
    return { token, url: urlFor(req.params.id, { kind: 'preview', token }, false, req.body.path || '/') };
  });
  app.post('/api/sites/:id/verify', async (req) => {
    const site = store.mustSite(req.params.id);
    if (!req.body.patchIds?.length) throw new HttpError(400, 'Choose patches to verify.');
    return { id: startVerification(site, req.body.patchIds, userFrom(req)) };
  });
  app.post('/api/verifications/:id/fix', async (req) => {
    const v = getVerification(Number(req.params.id)); if (!v) throw new HttpError(404, 'Not found');
    return proposeFix(v.siteId, v.id);
  });
  app.get('/api/verifications/:id', async (req) => { const v = getVerification(Number(req.params.id)); if (!v) throw new HttpError(404, 'Not found'); return v; });
  app.get('/api/sites/:id/verifications', async (req) => all('SELECT id FROM verifications WHERE site_id = ? ORDER BY id DESC LIMIT 20', req.params.id).map((r) => { const v = getVerification(r.id); return { ...v, report: { summary: v.report.summary, stage: v.report.stage, progress: v.report.progress } }; }));
  app.post('/api/sites/:id/set-hash', async (req) => ({ hash: setHash(store.getPatches(req.body.patchIds || [])) }));

  /* ------------------------------------------------------------- releases */
  app.get('/api/sites/:id/releases', async (req) => store.listReleases(req.params.id));
  app.post('/api/sites/:id/releases', async (req) => releases.createRelease(req.params.id, userFrom(req), req.body));
  app.post('/api/releases/:id/deploy', async (req) => releases.deploy(Number(req.params.id), userFrom(req), req.body || {}));
  app.post('/api/releases/:id/promote', async (req) => releases.promote(Number(req.params.id), userFrom(req)));
  app.post('/api/sites/:id/rollback', async (req) => releases.rollback(req.params.id, userFrom(req), req.body || {}));
  app.post('/api/sites/:id/traffic', async (req) => ({ visits: await releases.simulateTraffic(req.params.id, req.body?.visits || 6, req.body?.paths) }));
  app.get('/api/sites/:id/events', async (req) => all('SELECT * FROM events WHERE site_id = ? ORDER BY id DESC LIMIT 60', req.params.id).map((e) => ({ id: e.id, releaseId: e.release_id, type: e.type, patchId: e.patch_id, payload: e.payload, ts: e.ts })));

  /* ---------------------------------------------------------------- drift */
  app.get('/api/sites/:id/drift', async (req) => ({ latest: drift.latestDrift(req.params.id), health: store.listHealth(req.params.id) }));
  app.post('/api/sites/:id/drift/run', async (req) => drift.runDrift(req.params.id, userFrom(req)));
  app.post('/api/sites/:id/drift/heal', async (req) => {
    const u = userFrom(req); requireRole(u, 'reviewer');
    drift.healAndRelease(req.params.id, u).catch((e) => emit('drift', { siteId: req.params.id, stage: 'error', message: e.message }));
    return { started: true };
  });

  /* ----------------------------------------------------------- demo site */
  app.get('/api/demo/version', async () => { try { return await (await fetch(DEMO_URL + '/__admin/version')).json(); } catch { return { version: null }; } });
  app.post('/api/demo/redeploy', async (req) => {
    const u = userFrom(req); requireRole(u, 'developer');
    const v = req.body.version === 'v2' ? 'v2' : 'v1';
    const r = await (await fetch(DEMO_URL + '/__admin/version', { method: 'POST', body: JSON.stringify({ version: v }) })).json();
    audit.record('shoplite', 'external', 'site.redeployed', `The site owner's vendor redeployed ShopLite ${r.version} (outside PATCHWORK)`, { version: r.version });
    emit('site', { siteId: 'shoplite', redeployed: r.version });
    return r;
  });
  app.post('/api/demo/reset', async (req) => { requireRole(userFrom(req), 'admin'); await seedDemo({ reset: true }); return { ok: true }; });

  /* ---------------------------------------------------------------- audit */
  app.get('/api/audit', async (req) => audit.list(req.query.siteId, { type: req.query.type, actor: req.query.actor, exclude: req.query.exclude, limit: Number(req.query.limit) || 300 })
    .map((a) => ({ seq: a.seq, siteId: a.site_id, actor: a.actor, type: a.type, summary: a.summary, payload: a.payload, ts: a.ts, hash: a.hash, prevHash: a.prev_hash })));
  app.get('/api/audit/verify', async () => audit.verifyChain());
  app.post('/api/audit/tamper', async () => ({ seq: audit.tamperDemo() }));
  app.post('/api/audit/repair', async () => { audit.repairDemo(); return audit.verifyChain(); });

  /* ------------------------------------------------------------------- AI */
  app.get('/api/ai/status', async () => ai.aiStatus());
  app.post('/api/ai/patch', async (req) => ai.generatePatch(req.body));

  /* ------------------------------------------------------------ extension */
  app.get('/api/ext/site', async (req) => {
    const origin = String(req.query.origin || '').replace(/\/$/, '');
    const s = store.listSites().find((x) => x.origin === origin);
    if (!s) return { site: null };
    const rel = s.activeReleaseId ? store.getRelease(s.activeReleaseId) : null;
    return { site: { id: s.id, name: s.name, thresholds: s.config.thresholds }, release: rel && { id: rel.id, version: rel.version }, patches: rel ? rel.snapshot : [] };
  });
  app.post('/api/ext/report', async (req) => { const b = req.body || {}; if (b.siteId) store.logEvent(b.siteId, b.release, b.type, b.patchId, b); return { ok: true }; });

  /* ------------------------------------------------------------ artifacts */
  app.get('/api/artifacts/:run/:file', async (req, reply) => {
    const { ARTIFACT_DIR } = await import('./db.js');
    const { run, file } = req.params;
    if (!/^v\d+$/.test(run) || !/^[\w.-]+\.png$/.test(file)) throw new HttpError(400, 'bad path');
    const p = `${ARTIFACT_DIR}/${run}/${file}`;
    if (!fs.existsSync(p)) throw new HttpError(404, 'missing');
    reply.header('content-type', 'image/png').header('cache-control', 'public, max-age=3600');
    return fs.createReadStream(p);
  });
}
