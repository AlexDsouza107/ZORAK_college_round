import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const DATA_DIR = process.env.PW_DATA || path.join(root, 'data');
export const ARTIFACT_DIR = path.join(DATA_DIR, 'artifacts');
fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

export const db = new DatabaseSync(path.join(DATA_DIR, 'patchwork.db'));
db.exec(`
PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS sites (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, origin TEXT NOT NULL,
  active_release_id INTEGER, canary_release_id INTEGER, canary_pct INTEGER DEFAULT 0,
  config_json TEXT NOT NULL DEFAULT '{}', created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS patches (
  id TEXT PRIMARY KEY, site_id TEXT NOT NULL, page TEXT NOT NULL DEFAULT '*', title TEXT NOT NULL, description TEXT DEFAULT '',
  author TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'draft', target_json TEXT NOT NULL, ops_json TEXT NOT NULL,
  base_hash TEXT, depends_json TEXT NOT NULL DEFAULT '[]', rev INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_patches_site ON patches(site_id);
CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT, patch_id TEXT NOT NULL, author TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'comment',
  body TEXT NOT NULL, created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS releases (
  id INTEGER PRIMARY KEY AUTOINCREMENT, site_id TEXT NOT NULL, version INTEGER NOT NULL, status TEXT NOT NULL,
  note TEXT DEFAULT '', created_by TEXT NOT NULL, patch_ids_json TEXT NOT NULL, snapshot_json TEXT NOT NULL,
  verification_id INTEGER, override_reason TEXT, kind TEXT DEFAULT 'manual',
  created_at INTEGER NOT NULL, deployed_at INTEGER, ended_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_releases_site ON releases(site_id);
CREATE TABLE IF NOT EXISTS verifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT, site_id TEXT NOT NULL, patch_ids_json TEXT NOT NULL, set_hash TEXT NOT NULL,
  status TEXT NOT NULL, report_json TEXT NOT NULL DEFAULT '{}', started_by TEXT, created_at INTEGER NOT NULL, finished_at INTEGER
);
CREATE TABLE IF NOT EXISTS previews (
  token TEXT PRIMARY KEY, site_id TEXT NOT NULL, patch_ids_json TEXT NOT NULL, created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS audit (
  seq INTEGER PRIMARY KEY AUTOINCREMENT, site_id TEXT, actor TEXT NOT NULL, type TEXT NOT NULL, summary TEXT NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}', ts INTEGER NOT NULL, prev_hash TEXT NOT NULL, hash TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT, site_id TEXT NOT NULL, release_id INTEGER, type TEXT NOT NULL,
  patch_id TEXT, payload_json TEXT NOT NULL DEFAULT '{}', ts INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_site ON events(site_id, ts);
CREATE TABLE IF NOT EXISTS patch_health (
  patch_id TEXT NOT NULL, source TEXT NOT NULL, status TEXT NOT NULL, confidence REAL, details_json TEXT NOT NULL DEFAULT '{}',
  updated_at INTEGER NOT NULL, PRIMARY KEY (patch_id, source)
);
CREATE TABLE IF NOT EXISTS drift_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT, site_id TEXT NOT NULL, status TEXT NOT NULL, report_json TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL, finished_at INTEGER
);
`);

const parseRow = (row) => {
  if (!row) return null;
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    if (k.endsWith('_json')) out[k.slice(0, -5)] = v == null ? null : JSON.parse(v);
    else out[k] = v;
  }
  return out;
};
export const get = (sql, ...p) => parseRow(db.prepare(sql).get(...p));
export const all = (sql, ...p) => db.prepare(sql).all(...p).map(parseRow);
export const run = (sql, ...p) => db.prepare(sql).run(...p);
export const tx = (fn) => {
  db.exec('BEGIN');
  try { const r = fn(); db.exec('COMMIT'); return r; } catch (e) { db.exec('ROLLBACK'); throw e; }
};
