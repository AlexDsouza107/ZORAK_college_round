// Starts the demo storefront (:4100) and the PATCHWORK server (:4000). `--dev` also runs the Vite dev server (:5173).
// Runs a pre-flight check first so problems are explained in plain language instead of as stack traces.
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dev = process.argv.includes('--dev');
const PORT = Number(process.env.PORT || 4000), SHOP = Number(process.env.SHOPLITE_PORT || 4100);
const bad = (msg, fix) => { console.error(`\n  ✗ ${msg}\n    → ${fix}\n`); process.exit(1); };
const ok = (msg) => console.log(`  ✓ ${msg}`);

console.log('\n  PATCHWORK pre-flight');

// 1. Node version (needs the built-in node:sqlite module)
const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 22 || (major === 22 && minor < 13)) bad(`Node ${process.versions.node} is too old.`, 'Install Node 22.13 or newer (Node 24 recommended) from https://nodejs.org');
ok(`Node ${process.versions.node}`);

// 2. Dependencies
if (!fs.existsSync(path.join(root, 'node_modules', 'fastify')) || !fs.existsSync(path.join(root, 'node_modules', 'playwright'))) {
  bad('Dependencies are not installed.', 'Run:  npm run setup');
}
ok('Dependencies installed');

// 3. Chromium for Playwright (used by verification, drift checks and traffic simulation)
try {
  const { createRequire } = await import('node:module');
  const { chromium } = createRequire(path.join(root, 'server', 'package.json'))('playwright');
  if (!fs.existsSync(chromium.executablePath())) bad('The Chromium browser used for verification is missing.', 'Run:  npx playwright install chromium');
  ok('Chromium available');
} catch (e) { bad('Could not load Playwright: ' + e.message, 'Run:  npm run setup'); }

// 4. Studio build
if (!dev && !fs.existsSync(path.join(root, 'studio', 'dist', 'index.html'))) {
  console.log('  … building Studio (first run)');
  const r = spawnSync('npm', ['run', 'build', '-w', 'studio'], { cwd: root, stdio: 'inherit' });
  if (r.status !== 0) bad('Studio failed to build.', 'Run:  npm run build   and read the error above');
}
ok('Studio built');

// 5. Ports
const free = (port) => new Promise((res) => { const s = net.createServer().once('error', () => res(false)).once('listening', () => s.close(() => res(true))).listen(port, '0.0.0.0'); });
for (const [port, what] of [[PORT, 'PATCHWORK'], [SHOP, 'the ShopLite demo site']]) {
  if (!(await free(port))) {
    bad(`Port ${port} is already in use (needed for ${what}).`,
      `An earlier PATCHWORK is probably still running. Stop it with:  lsof -ti :${port} | xargs kill   — then run npm start again.`);
  }
}
ok(`Ports ${PORT} and ${SHOP} are free`);

const procs = [];
let stopping = false;
const run = (name, cmd, args, cwd = root, env = {}) => {
  const p = spawn(cmd, args, { cwd, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
  const tag = `[${name}] `;
  const pipe = (stream, out) => stream.on('data', (d) => out.write(String(d).split('\n').filter(Boolean).map((l) => tag + l).join('\n') + '\n'));
  pipe(p.stdout, process.stdout); pipe(p.stderr, process.stderr);
  p.on('exit', (c) => { if (c && !stopping) { console.error(`\n  ✗ ${name} stopped unexpectedly (exit code ${c}). See the messages above.\n`); stop(1); } });
  procs.push(p); return p;
};
const stop = (code = 0) => { stopping = true; procs.forEach((p) => p.kill('SIGINT')); setTimeout(() => process.exit(code), 400); };
process.on('SIGINT', () => stop(0)); process.on('SIGTERM', () => stop(0));

run('shoplite', 'node', ['demo-site/server.js']);
setTimeout(() => run('patchwork', 'node', ['--disable-warning=ExperimentalWarning', 'server/src/index.js']), 600);
if (dev) run('studio', 'npx', ['vite', '--host', '--port', '5173'], path.join(root, 'studio'));
console.log(`\n  Open in Chrome →  http://localhost:${PORT}      (ShopLite demo store: http://localhost:${SHOP})\n  Press Ctrl+C to stop.\n`);
