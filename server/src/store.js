import { get, all, run, tx } from './db.js';
import { rid, now, HttpError } from './util.js';
import { emit } from './bus.js';
import * as audit from './audit.js';
import { createRequire } from 'node:module';
const Core = createRequire(import.meta.url)('../../shared/core.cjs');
export { Core };

export const DEFAULT_CONFIG = {
  thresholds: { exact: 0.97, healed: 0.7, review: 0.5, selectorKeep: 0.75 },
  autoRollback: true, autoHeal: false, errorThreshold: 4, pollMs: 3000,
  verifyPages: ['/', '/cart', '/checkout'],
  visual: { failRatio: 0.08, warnRatio: 0.02 },
  flows: []
};

/* ---------------------------------------------------------------- sites */
export function siteView(s) {
  if (!s) return null;
  const config = { ...DEFAULT_CONFIG, ...(s.config || {}) };
  config.thresholds = { ...DEFAULT_CONFIG.thresholds, ...(config.thresholds || {}) };
  return {
    id: s.id, name: s.name, origin: s.origin, activeReleaseId: s.active_release_id, canaryReleaseId: s.canary_release_id,
    canaryPct: s.canary_pct, config, createdAt: s.created_at
  };
}
export const getSite = (id) => siteView(get('SELECT * FROM sites WHERE id = ?', id));
export const mustSite = (id) => { const s = getSite(id); if (!s) throw new HttpError(404, `Unknown site "${id}"`); return s; };
export const listSites = () => all('SELECT * FROM sites ORDER BY created_at').map(siteView);
export function createSite({ id, name, origin, config }) {
  if (!/^[a-z0-9][a-z0-9-]{1,30}$/.test(id) || ['edit', 'none', 'live'].includes(id) || /^(rel\d+|pv[a-z0-9]+)$/.test(id)) throw new HttpError(400, 'Site id must be 2–31 chars of a-z, 0-9 and "-" (and not a reserved word).');
  if (getSite(id)) throw new HttpError(409, 'A site with this id already exists');
  run('INSERT INTO sites (id,name,origin,config_json,created_at) VALUES (?,?,?,?,?)', id, name, origin.replace(/\/$/, ''), JSON.stringify(config || {}), now());
  return getSite(id);
}
export function updateSiteConfig(id, patch) {
  const s = mustSite(id);
  const cfg = { ...s.config, ...patch };
  run('UPDATE sites SET config_json = ? WHERE id = ?', JSON.stringify(cfg), id);
  return getSite(id);
}

/* -------------------------------------------------------------- patches */
export function patchView(p) {
  if (!p) return null;
  return {
    id: p.id, siteId: p.site_id, page: p.page, title: p.title, description: p.description, author: p.author, status: p.status,
    target: p.target, ops: p.ops, baseHash: p.base_hash, dependsOn: p.depends || [], rev: p.rev, createdAt: p.created_at, updatedAt: p.updated_at
  };
}
export const getPatch = (id) => patchView(get('SELECT * FROM patches WHERE id = ?', id));
export const mustPatch = (id) => { const p = getPatch(id); if (!p) throw new HttpError(404, `Unknown patch ${id}`); return p; };
export const listPatches = (siteId) => all('SELECT * FROM patches WHERE site_id = ? ORDER BY created_at', siteId).map(patchView);
export const getPatches = (ids) => ids.map(getPatch).filter(Boolean);

const OP_TYPES = ['setText', 'setHTML', 'setAttr', 'setStyle', 'addClass', 'removeClass', 'remove', 'move', 'insert', 'css', 'injectJS'];
export function validateOps(ops) {
  if (!Array.isArray(ops) || !ops.length) throw new HttpError(400, 'A patch needs at least one operation.');
  for (const op of ops) {
    if (!OP_TYPES.includes(op.type)) throw new HttpError(400, `Unsupported operation "${op.type}".`);
    if (op.type === 'setStyle' && (!op.prop || op.value == null)) throw new HttpError(400, 'setStyle needs prop and value.');
    if (op.type === 'setAttr' && !op.name) throw new HttpError(400, 'setAttr needs a name.');
    if (op.type === 'move' && !op.ref) throw new HttpError(400, 'move needs a reference element.');
  }
}
export const usesScript = (ops) => ops.some((o) => o.type === 'injectJS');

export function createPatch(siteId, user, body) {
  mustSite(siteId);
  if (!body.title || !body.target) throw new HttpError(400, 'title and target are required');
  validateOps(body.ops);
  const id = rid('p_');
  run('INSERT INTO patches (id,site_id,page,title,description,author,status,target_json,ops_json,base_hash,depends_json,rev,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
    id, siteId, body.page || '*', body.title, body.description || '', user.id, 'draft', JSON.stringify(body.target), JSON.stringify(body.ops),
    body.baseHash || null, JSON.stringify(body.dependsOn || []), 1, now(), now());
  const p = getPatch(id);
  audit.record(siteId, user.id, 'patch.created', `${user.name} created patch "${p.title}"`, { patchId: id, ops: p.ops.map(Core.describeOp), page: p.page });
  emit('patch', { siteId, patchId: id, action: 'created', by: user.id });
  return p;
}
export function updatePatch(id, user, body) {
  const p = mustPatch(id);
  if (p.status === 'live') throw new HttpError(409, 'This patch is live in a release. Create a new patch or roll back first.');
  const next = {
    title: body.title ?? p.title, description: body.description ?? p.description, page: body.page ?? p.page,
    target: body.target ?? p.target, ops: body.ops ?? p.ops, dependsOn: body.dependsOn ?? p.dependsOn
  };
  validateOps(next.ops);
  const wasReviewed = p.status === 'review' || p.status === 'approved' || p.status === 'rejected' || p.status === 'reverted';
  run('UPDATE patches SET title=?, description=?, page=?, target_json=?, ops_json=?, depends_json=?, status=?, rev=rev+1, updated_at=? WHERE id=?',
    next.title, next.description, next.page, JSON.stringify(next.target), JSON.stringify(next.ops), JSON.stringify(next.dependsOn), 'draft', now(), id);
  const out = getPatch(id);
  audit.record(p.siteId, user.id, 'patch.updated', `${user.name} edited "${out.title}" (rev ${out.rev})${wasReviewed ? ' — returned to draft' : ''}`, { patchId: id, ops: out.ops.map(Core.describeOp) });
  emit('patch', { siteId: p.siteId, patchId: id, action: 'updated', by: user.id });
  return out;
}
export function setStatus(id, status, user, note, auditType) {
  const p = mustPatch(id);
  run('UPDATE patches SET status=?, updated_at=? WHERE id=?', status, now(), id);
  audit.record(p.siteId, user.id, auditType || `patch.${status}`, `${user.name} set "${p.title}" to ${status}${note ? ' — ' + note : ''}`, { patchId: id, from: p.status, to: status, note });
  emit('patch', { siteId: p.siteId, patchId: id, action: status, by: user.id });
  return getPatch(id);
}
export function deletePatch(id, user) {
  const p = mustPatch(id);
  if (p.status === 'live') throw new HttpError(409, 'Cannot delete a live patch.');
  run('DELETE FROM patches WHERE id = ?', id); run('DELETE FROM comments WHERE patch_id = ?', id);
  audit.record(p.siteId, user.id, 'patch.deleted', `${user.name} deleted "${p.title}"`, { patchId: id });
  emit('patch', { siteId: p.siteId, patchId: id, action: 'deleted', by: user.id });
}
export const listComments = (patchId) => all('SELECT * FROM comments WHERE patch_id = ? ORDER BY created_at', patchId)
  .map((c) => ({ id: c.id, patchId: c.patch_id, author: c.author, kind: c.kind, body: c.body, createdAt: c.created_at }));
export function addComment(patchId, user, body, kind = 'comment') {
  const p = mustPatch(patchId);
  run('INSERT INTO comments (patch_id,author,kind,body,created_at) VALUES (?,?,?,?,?)', patchId, user.id, kind, body, now());
  emit('patch', { siteId: p.siteId, patchId, action: 'comment', by: user.id });
}

/* ------------------------------------------------------------- releases */
export function releaseView(r) {
  if (!r) return null;
  return {
    id: r.id, siteId: r.site_id, version: r.version, status: r.status, note: r.note, createdBy: r.created_by, patchIds: r.patch_ids,
    snapshot: r.snapshot, verificationId: r.verification_id, overrideReason: r.override_reason, kind: r.kind,
    createdAt: r.created_at, deployedAt: r.deployed_at, endedAt: r.ended_at
  };
}
export const getRelease = (id) => releaseView(get('SELECT * FROM releases WHERE id = ?', id));
export const listReleases = (siteId) => all('SELECT * FROM releases WHERE site_id = ? ORDER BY version DESC', siteId).map(releaseView);
export const releaseByVersion = (siteId, version) => releaseView(get('SELECT * FROM releases WHERE site_id = ? AND version = ?', siteId, version));

/* ---------------------------------------------------------------- health */
export function setHealth(patchId, source, status, confidence, details = {}) {
  run(`INSERT INTO patch_health (patch_id,source,status,confidence,details_json,updated_at) VALUES (?,?,?,?,?,?)
       ON CONFLICT(patch_id,source) DO UPDATE SET status=excluded.status, confidence=excluded.confidence, details_json=excluded.details_json, updated_at=excluded.updated_at`,
    patchId, source, status, confidence ?? null, JSON.stringify(details), now());
}
export const listHealth = (siteId) => all(`SELECT h.* FROM patch_health h JOIN patches p ON p.id = h.patch_id WHERE p.site_id = ?`, siteId)
  .map((h) => ({ patchId: h.patch_id, source: h.source, status: h.status, confidence: h.confidence, details: h.details, updatedAt: h.updated_at }));
export function logEvent(siteId, releaseId, type, patchId, payload) {
  run('INSERT INTO events (site_id,release_id,type,patch_id,payload_json,ts) VALUES (?,?,?,?,?,?)', siteId, releaseId || null, type, patchId || null, JSON.stringify(payload || {}), now());
}
export { tx };
