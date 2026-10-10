import { db, all, get, run } from './db.js';
import { sha } from './util.js';
import { emit } from './bus.js';

const GENESIS = '0'.repeat(64);
const digest = (e, prev) => sha(`${prev}|${e.siteId || ''}|${e.actor}|${e.type}|${e.summary}|${JSON.stringify(e.payload || {})}|${e.ts}`);

export function record(siteId, actor, type, summary, payload = {}) {
  const last = get('SELECT hash FROM audit ORDER BY seq DESC LIMIT 1');
  const prev = last ? last.hash : GENESIS;
  const ts = Date.now();
  const hash = digest({ siteId, actor, type, summary, payload, ts }, prev);
  const r = run('INSERT INTO audit (site_id, actor, type, summary, payload_json, ts, prev_hash, hash) VALUES (?,?,?,?,?,?,?,?)',
    siteId || null, actor, type, summary, JSON.stringify(payload), ts, prev, hash);
  emit('audit', { siteId, seq: Number(r.lastInsertRowid), auditType: type });
  return hash;
}
export function list(siteId, { type, actor, exclude, limit = 300 } = {}) {
  let sql = 'SELECT * FROM audit WHERE 1=1'; const p = [];
  if (siteId) { sql += ' AND site_id = ?'; p.push(siteId); }
  if (type) { sql += ' AND type LIKE ?'; p.push(type + '%'); }
  if (actor) { sql += ' AND actor = ?'; p.push(actor); }
  if (exclude) { sql += ' AND type NOT LIKE ?'; p.push(exclude + '%'); }
  sql += ' ORDER BY seq DESC LIMIT ?'; p.push(limit);
  return all(sql, ...p);
}
export function verifyChain() {
  const rows = all('SELECT * FROM audit ORDER BY seq ASC');
  let prev = GENESIS;
  for (const r of rows) {
    const expect = digest({ siteId: r.site_id, actor: r.actor, type: r.type, summary: r.summary, payload: r.payload, ts: r.ts }, prev);
    if (r.prev_hash !== prev || r.hash !== expect) return { valid: false, total: rows.length, brokenAt: r.seq };
    prev = r.hash;
  }
  return { valid: true, total: rows.length, head: prev };
}
// Demo helper: silently alter a stored record so the chain verification can show tamper detection.
export function tamperDemo() {
  const row = get('SELECT seq FROM audit ORDER BY seq DESC LIMIT 1 OFFSET 2') || get('SELECT seq FROM audit ORDER BY seq DESC LIMIT 1');
  if (!row) return null;
  run("UPDATE audit SET summary = summary || ' (edited)' WHERE seq = ?", row.seq);
  return row.seq;
}
export function repairDemo() {
  const rows = all('SELECT * FROM audit ORDER BY seq ASC'); let prev = GENESIS;
  db.exec('BEGIN');
  for (const r of rows) {
    const summary = r.summary.replace(/ \(edited\)$/, '');
    const hash = digest({ siteId: r.site_id, actor: r.actor, type: r.type, summary, payload: r.payload, ts: r.ts }, prev);
    run('UPDATE audit SET summary=?, prev_hash=?, hash=? WHERE seq=?', summary, prev, hash, r.seq); prev = hash;
  }
  db.exec('COMMIT');
}
