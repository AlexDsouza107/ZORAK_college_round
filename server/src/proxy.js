// Reverse proxy: serves the ORIGINAL website untouched and injects the PATCHWORK runtime + patch set.
// The view is encoded in the hostname so each mode gets its own origin (cookies/localStorage never leak):
//   <site>.localhost            live release (with canary bucketing)
//   none.<site>.localhost       original site, no patches
//   rel<N>.<site>.localhost     release version N (time travel)
//   pv<token>.<site>.localhost  a saved preview set (isolated preview)
//   edit.<...>                  same, plus the visual-editor overlay
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { get, run } from './db.js';
import * as store from './store.js';
import { emit } from './bus.js';
import { rid } from './util.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const PORT = Number(process.env.PORT || 4000);
const ASSETS = {
  '/__pw/core.js': path.join(root, 'shared/core.cjs'),
  '/__pw/runtime.js': path.join(root, 'runtime/runtime.js'),
  '/__pw/editor.js': path.join(root, 'runtime/editor.js')
};
const STUDIO_ORIGINS = [`http://localhost:${PORT}`, `http://127.0.0.1:${PORT}`, 'http://localhost:5173', 'http://127.0.0.1:5173'];

export function parseHost(hostHeader) {
  const host = String(hostHeader || '').split(':')[0].toLowerCase();
  if (!host.endsWith('.localhost')) return null;
  const labels = host.slice(0, -'.localhost'.length).split('.');
  const siteId = labels.pop();
  const out = { siteId, edit: false, kind: 'live' };
  for (const l of labels) {
    if (l === 'edit') out.edit = true;
    else if (l === 'none') out.kind = 'none';
    else if (/^rel\d+$/.test(l)) { out.kind = 'release'; out.version = Number(l.slice(3)); }
    else if (/^pv[a-z0-9]+$/.test(l)) { out.kind = 'preview'; out.token = l.slice(2); }
  }
  return out;
}
export function hostFor(siteId, source = { kind: 'live' }, edit = false) {
  const labels = [];
  if (edit) labels.push('edit');
  if (source.kind === 'none') labels.push('none');
  else if (source.kind === 'release') labels.push('rel' + source.version);
  else if (source.kind === 'preview') labels.push('pv' + source.token);
  labels.push(siteId);
  return `${labels.join('.')}.localhost:${PORT}`;
}
export const urlFor = (siteId, source, edit, p = '/') => `http://${hostFor(siteId, source, edit)}${p}`;

export function createPreview(siteId, patchIds) {
  const token = rid('').slice(0, 6);
  run('INSERT INTO previews (token, site_id, patch_ids_json, created_at) VALUES (?,?,?,?)', token, siteId, JSON.stringify(patchIds), Date.now());
  return token;
}

function parseCookies(h) {
  const out = {};
  String(h || '').split(';').forEach((c) => { const i = c.indexOf('='); if (i > 0) out[c.slice(0, i).trim()] = decodeURIComponent(c.slice(i + 1).trim()); });
  return out;
}

export function resolveSource(site, parsed, bucket) {
  const snapshotOf = (r) => (r ? (r.snapshot || []).map(clean) : []);
  if (parsed.kind === 'none') return { mode: 'none', release: null, patches: [] };
  if (parsed.kind === 'release') {
    const r = store.releaseByVersion(site.id, parsed.version);
    return { mode: 'release', release: r ? { id: r.id, version: r.version } : null, patches: snapshotOf(r) };
  }
  if (parsed.kind === 'preview') {
    const pv = get('SELECT * FROM previews WHERE token = ? AND site_id = ?', parsed.token, site.id);
    const list = pv ? store.getPatches(pv.patch_ids) : [];
    return { mode: 'preview', release: null, patches: list.map(clean) };
  }
  let rid_ = site.activeReleaseId, mode = 'live';
  if (site.canaryReleaseId && bucket < (site.canaryPct || 0)) { rid_ = site.canaryReleaseId; mode = 'canary'; }
  const r = rid_ ? store.getRelease(rid_) : null;
  return { mode, release: r ? { id: r.id, version: r.version } : null, patches: snapshotOf(r) };
}
const clean = (p) => ({ id: p.id, title: p.title, page: p.page, target: p.target, ops: p.ops, status: p.status });

const safeJson = (o) => JSON.stringify(o).replace(/</g, '\\u003c').replace(/[\u2028\u2029]/g, (c) => '\\u' + c.charCodeAt(0).toString(16));

function send(res, status, headers, body) { res.writeHead(status, headers); res.end(body); }

export async function handleProxy(req, res) {
  const parsed = parseHost(req.headers.host);
  const site = store.getSite(parsed.siteId);
  if (!site) return send(res, 404, { 'content-type': 'text/html' }, `<h2>PATCHWORK</h2><p>No site registered with id <code>${parsed.siteId}</code>.</p>`);
  const url = new URL(req.url, 'http://x');
  const cookies = parseCookies(req.headers.cookie);
  let bucket = Number(cookies.__pw_b);
  const newBucket = !Number.isFinite(bucket);
  if (newBucket) bucket = Math.floor(Math.random() * 100);
  const bucketCookie = newBucket ? [`__pw_b=${bucket}; Path=/; SameSite=Lax; Max-Age=2592000`] : [];

  if (url.pathname.startsWith('/__pw/')) {
    if (ASSETS[url.pathname]) {
      let body;
      try { body = fs.readFileSync(ASSETS[url.pathname]); } catch { return send(res, 404, {}, 'missing'); }
      return send(res, 200, { 'content-type': 'application/javascript; charset=utf-8', 'cache-control': 'no-store' }, body);
    }
    if (url.pathname === '/__pw/config') {
      const src = resolveSource(site, parsed, bucket);
      return send(res, 200, { 'content-type': 'application/json', 'cache-control': 'no-store', ...(bucketCookie.length ? { 'set-cookie': bucketCookie } : {}) }, JSON.stringify(src));
    }
    if (url.pathname === '/__pw/report' && req.method === 'POST') {
      const chunks = []; for await (const c of req) chunks.push(c);
      let b = {}; try { b = JSON.parse(Buffer.concat(chunks).toString() || '{}'); } catch { /* ignore */ }
      recordReport(site.id, b);
      return send(res, 204, {}, '');
    }
    return send(res, 404, {}, 'not found');
  }

  // ---- forward to the original site
  const headers = {};
  for (const [k, v] of Object.entries(req.headers)) {
    if (['host', 'connection', 'content-length', 'accept-encoding', 'origin', 'referer'].includes(k)) continue;
    headers[k] = v;
  }
  if (headers.cookie) headers.cookie = headers.cookie.split(';').filter((c) => !c.trim().startsWith('__pw_')).join(';');
  headers['accept-encoding'] = 'identity';
  if (req.headers.referer) headers.referer = req.headers.referer.replace(/^https?:\/\/[^/]+/, site.origin);
  const init = { method: req.method, headers, redirect: 'manual' };
  if (!['GET', 'HEAD'].includes(req.method)) { init.body = Readable.toWeb(req); init.duplex = 'half'; }

  let upstream;
  try { upstream = await fetch(site.origin + url.pathname + url.search, init); }
  catch (e) {
    return send(res, 502, { 'content-type': 'text/html' }, `<h2>PATCHWORK proxy</h2><p>Could not reach <code>${site.origin}</code>: ${e.cause?.code || e.message}</p>`);
  }
  const proxyOrigin = `http://${req.headers.host}`;
  const out = {};
  const drop = new Set(['content-encoding', 'content-length', 'transfer-encoding', 'connection', 'content-security-policy', 'content-security-policy-report-only', 'x-frame-options', 'strict-transport-security', 'set-cookie', 'keep-alive']);
  upstream.headers.forEach((v, k) => { if (!drop.has(k)) out[k] = v; });
  if (out.location) out.location = out.location.startsWith(site.origin) ? proxyOrigin + out.location.slice(site.origin.length) : out.location;
  const setCookies = (upstream.headers.getSetCookie?.() || []).map((c) => c.replace(/;\s*Domain=[^;]+/i, '').replace(/;\s*Secure/i, ''));
  const allCookies = [...setCookies, ...bucketCookie];
  const ct = upstream.headers.get('content-type') || '';
  if (!ct.includes('text/html') || req.method === 'HEAD') {
    if (allCookies.length) out['set-cookie'] = allCookies;
    res.writeHead(upstream.status, out);
    if (!upstream.body || req.method === 'HEAD') return res.end();
    return Readable.fromWeb(upstream.body).pipe(res);
  }

  let html = await upstream.text();
  html = html.split(site.origin).join(proxyOrigin);
  const src = resolveSource(site, parsed, bucket);
  const boot = {
    site: site.id, mode: src.mode, release: src.release, patches: src.patches, thresholds: site.config.thresholds,
    pollMs: site.config.pollMs, edit: parsed.edit, studioOrigins: STUDIO_ORIGINS, siteName: site.name
  };
  const tag = `<script>window.__PW_BOOT__=${safeJson(boot)}</script><script src="/__pw/core.js"></script><script src="/__pw/runtime.js"></script>`;
  if (/<head[^>]*>/i.test(html)) html = html.replace(/<head[^>]*>/i, (m) => m + tag);
  else if (/<html[^>]*>/i.test(html)) html = html.replace(/<html[^>]*>/i, (m) => m + tag);
  else html = tag + html;
  out['content-type'] = 'text/html; charset=utf-8';
  out['cache-control'] = 'no-store';
  if (allCookies.length) out['set-cookie'] = allCookies;
  res.writeHead(upstream.status, out);
  res.end(html);
}

function recordReport(siteId, b) {
  if (!b || !b.type) return;
  store.logEvent(siteId, b.release, b.type, b.patchId, { path: b.path, message: b.message, status: b.status, confidence: b.confidence, matchedOn: b.matchedOn, changed: b.changed, selector: b.selector });
  if (b.patchId && (b.type === 'heal' || b.type === 'orphan' || b.type === 'error')) {
    store.setHealth(b.patchId, 'runtime', b.status || b.type, b.confidence, { matchedOn: b.matchedOn, changed: b.changed, selector: b.selector, message: b.message, path: b.path, release: b.release });
  }
  emit('telemetry', { siteId, kind: b.type, patchId: b.patchId });
}
