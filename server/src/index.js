import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import fstatic from '@fastify/static';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
// tiny .env loader (no dependency)
try {
  for (const line of fs.readFileSync(path.join(root, '.env'), 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch { /* no .env */ }

const { handleProxy, parseHost, PORT } = await import('./proxy.js');
const { default: routes } = await import('./routes.js');
const { seedDemo } = await import('./seed.js');
const { startHealthMonitor } = await import('./releases.js');
const { startDriftWatcher } = await import('./drift.js');
const { closeBrowser } = await import('./verify.js');
const { listSites } = await import('./store.js');

const app = Fastify({ logger: false, bodyLimit: 20 * 1024 * 1024 });
await app.register(cors, { origin: true, methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], allowedHeaders: ['content-type', 'x-pw-user'] });

app.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
  try { done(null, body ? JSON.parse(body) : {}); } catch (e) { e.statusCode = 400; done(e); }
});

// Requests for <site>.localhost are served by the patching proxy; everything else is Studio + API.
app.addHook('onRequest', async (req, reply) => {
  if (parseHost(req.headers.host)) { reply.hijack(); await handleProxy(req.raw, reply.raw).catch((e) => { try { reply.raw.writeHead(500); reply.raw.end('proxy error: ' + e.message); } catch { /* closed */ } }); }
});
app.setErrorHandler((err, req, reply) => {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error('[error]', req.method, req.url, err);
  reply.status(status).send({ error: err.message, ...(err.extra || {}) });
});

await app.register(routes);

const dist = path.join(root, 'studio/dist');
if (fs.existsSync(dist)) {
  await app.register(fstatic, { root: dist, setHeaders: (res) => res.setHeader('cache-control', 'no-cache') });
  app.setNotFoundHandler((req, reply) => (req.url.startsWith('/api/') ? reply.status(404).send({ error: 'Not found' }) : reply.sendFile('index.html')));
} else {
  app.get('/', async (_, reply) => reply.type('text/html').send('<h2>PATCHWORK API is running.</h2><p>Studio is not built yet: run <code>npm run build</code> (or <code>npm run dev</code> for the Vite dev server on :5173).</p>'));
}

await app.listen({ port: PORT, host: '0.0.0.0' });
console.log(`[patchwork] Studio + API + proxy on http://localhost:${PORT}`);
await seedDemo({ reset: false });
startHealthMonitor();
startDriftWatcher();
console.log(`[patchwork] ready — sites: ${listSites().map((s) => s.id).join(', ') || '(none)'}`);
const stop = async () => { await closeBrowser().catch(() => {}); process.exit(0); };
process.on('SIGINT', stop); process.on('SIGTERM', stop);
