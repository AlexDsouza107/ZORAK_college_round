import { EventEmitter } from 'node:events';
export const bus = new EventEmitter();
bus.setMaxListeners(100);
const presence = new Map(); // key -> {user, siteId, activity, ts}

export const emit = (type, payload = {}) => bus.emit('evt', { type, ts: Date.now(), ...payload });

export function touchPresence(user, siteId, activity) {
  presence.set(`${siteId}:${user}`, { user, siteId, activity: activity || '', ts: Date.now() });
  emit('presence', { siteId, users: listPresence(siteId) });
}
export function listPresence(siteId) {
  const cutoff = Date.now() - 20000;
  for (const [k, v] of presence) if (v.ts < cutoff) presence.delete(k);
  return [...presence.values()].filter((p) => p.siteId === siteId);
}
setInterval(() => {
  const before = presence.size; listPresence('x');
  if (presence.size !== before) emit('presence', { siteId: '*', users: [...presence.values()] });
}, 10000).unref();

export function sseHandler(req, reply) {
  reply.hijack();
  const res = reply.raw;
  res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive', 'access-control-allow-origin': '*' });
  res.write('retry: 2000\n\n');
  const send = (e) => res.write(`data: ${JSON.stringify(e)}\n\n`);
  bus.on('evt', send);
  const ka = setInterval(() => res.write(': ka\n\n'), 15000);
  req.raw.on('close', () => { bus.off('evt', send); clearInterval(ka); });
}
