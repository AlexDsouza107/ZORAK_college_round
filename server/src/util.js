import crypto from 'node:crypto';
export const now = () => Date.now();
export const rid = (prefix = '') => prefix + crypto.randomBytes(4).toString('hex');
export const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
export const stable = (o) => JSON.stringify(o, (k, v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map((x) => [x, v[x]])) : v));
export class HttpError extends Error {
  constructor(status, message, extra) { super(message); this.status = status; this.extra = extra; }
}
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
