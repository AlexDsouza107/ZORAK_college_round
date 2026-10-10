// Interaction test for the landing page. Needs `npm run build -w landing && npx vite preview --port 5174` (run from /landing) first.
import { chromium } from 'playwright';
const URL = process.env.LANDING_URL || 'http://localhost:5174/';
let fails = 0; const ok = (c, m, x = '') => { console.log(`${c ? ' ✓' : ' ✗'} ${m}${x ? ' — ' + x : ''}`); if (!c) fails++; };
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });
const page = await ctx.newPage(); const errs = [];
page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await page.goto(URL + '?debug'); await page.waitForTimeout(3000);

// hero: lock-on + hotfix all three
const pos = async () => page.evaluate(() => window.__broken);
for (let k = 0; k < 3; k++) {
  const nodes = (await pos()).filter((n) => n.fixed < 0.5); if (!nodes.length) break;
  const n = nodes[0]; await page.mouse.move(n.x - 40, n.y - 30); await page.mouse.move(n.x, n.y, { steps: 8 }); await page.waitForTimeout(250);
  const n2 = (await pos()).filter((q) => q.fixed < 0.5)[0]; if (n2) await page.mouse.click(n2.x, n2.y);
  await page.waitForTimeout(700);
}
await page.waitForTimeout(900);
const fixed = (await pos()).filter((n) => n.fixed > 0.9).length;
ok(fixed === 3, 'hero: all 3 broken nodes can be hotfixed by pointing + clicking', `${fixed}/3`);
ok((await page.locator('[role=status]').first().innerText()).toLowerCase().includes('all hotfixed'), 'hero: status bar reports "all hotfixed"');
ok((await page.getByText('200 OK').count()) >= 3, 'hero: callouts flip to "200 OK" on every patched node');
await page.getByRole('button', { name: 'Reset the scene' }).click(); await page.waitForTimeout(800);
ok((await pos()).every((n) => n.fixed < 0.2), 'hero: reset re-breaks the scene');

// frame pacing (software GL in CI is slower than real GPUs — this is a sanity floor)
const fps = await page.evaluate(() => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n++; performance.now() - t0 < 2000 ? requestAnimationFrame(f) : res(n / 2); }; requestAnimationFrame(f); }));
ok(fps > 15, 'hero: render loop alive', `${fps.toFixed(0)} fps on software WebGL`);

// step 1 picker
await page.locator('#how').scrollIntoViewIfNeeded(); await page.waitForTimeout(600);
await page.getByLabel('Checkout button (click to select)').click(); await page.waitForTimeout(300);
ok((await page.getByText('0 ops').count()) > 0, 'step 1: clicking the button selects it and opens the inspector');
await page.getByRole('switch').click(); await page.waitForTimeout(300);
ok((await page.getByText('1 op', { exact: false }).count()) > 0, 'step 1: toggling "Enabled" registers an operation');

// step 2 tracking
await page.getByRole('button', { name: 'Ship the redesign' }).scrollIntoViewIfNeeded(); await page.getByRole('button', { name: 'Ship the redesign' }).click();
await page.waitForSelector('text=84% confident', { timeout: 8000 }); ok(true, 'step 2: tracker re-locks onto the element at 84%');
await page.waitForSelector('text=self-healed');

// step 3 canary + chain
await page.getByRole('button', { name: 'Tamper with block #2' }).scrollIntoViewIfNeeded(); await page.waitForTimeout(800);
await page.getByRole('button', { name: 'Tamper with block #2' }).click(); await page.waitForSelector('text=broken at #2', { timeout: 5000 });
ok(true, 'step 3: tampering breaks the real SHA-256 chain at block #2');
await page.getByRole('button', { name: 'Restore' }).click(); await page.waitForSelector('text=chain intact'); ok(true, 'step 3: restore re-validates the chain');
await page.getByRole('button', { name: /1-click rollback/ }).click(); await page.waitForSelector('text=rolled back'); ok(true, 'step 3: one-click rollback');

// playground
await page.locator('#playground').scrollIntoViewIfNeeded(); await page.waitForTimeout(1500);
ok((await page.getByText('Checkout Failure').count()) > 0, 'playground: starts at "500 Checkout Failure"');
const lat = async () => Number((await page.locator('text=p95 latency').first().locator('xpath=following-sibling::div').first().innerText()).replace(/[^0-9]/g, '').slice(0, 5));
const l0 = await lat(); ok(l0 > 1200, 'playground: broken p95 latency is high', `${l0}ms`);
await page.getByRole('button', { name: 'Simulate Fix' }).click();
await page.getByText('OK • Patch Injected').waitFor({ timeout: 8000 }); ok(true, 'playground: flips to "200 OK • Patch Injected"');
await page.waitForTimeout(2500); const l1 = await lat(); ok(l1 < 400, 'playground: latency settles low after the patch', `${l1}ms`);
ok((await page.locator('text=PATCH LIVE').count()) > 0, 'playground: terminal logs the live patch');
await page.getByRole('button', { name: 'Replay the demo' }).click(); await page.waitForTimeout(500); ok((await page.getByRole('button', { name: 'Simulate Fix' }).count()) > 0, 'playground: replay resets');

// footer
await page.locator('footer').scrollIntoViewIfNeeded();
await page.getByRole('button', { name: /Copy npm i/ }).click(); await page.waitForTimeout(300);
const clip = await page.evaluate(() => navigator.clipboard.readText().catch(() => '')); ok(clip === 'npm i @patchwork/runtime', 'footer: copy button puts the install command on the clipboard', clip);
ok((await page.locator('footer').innerText()).includes('GitHub repository'), 'footer: GitHub link present');
ok(errs.filter((e) => !/GPU stall|ReadPixels|Failed to load resource/.test(e)).length === 0, 'no page errors', errs.slice(0, 2).join(' | '));

// mobile
const m = await ctx.newPage(); await m.setViewportSize({ width: 390, height: 844 }); await m.goto(URL); await m.waitForTimeout(3000);
const ow = await m.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth }));
ok(ow.sw <= ow.iw + 1, 'mobile 390px: no horizontal overflow', `${ow.sw} ≤ ${ow.iw}`);
await m.screenshot({ path: '/tmp/land_mobile_hero.png' });
await m.evaluate(() => document.getElementById('how').scrollIntoView()); await m.waitForTimeout(700); await m.screenshot({ path: '/tmp/land_mobile_how.png' });
await m.evaluate(() => document.getElementById('playground').scrollIntoView()); await m.waitForTimeout(900); await m.screenshot({ path: '/tmp/land_mobile_play.png' });
const ow2 = await m.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth })); ok(ow2.sw <= ow2.iw + 1, 'mobile: still no overflow after scrolling the demos');
await b.close(); console.log(fails ? `\n${fails} FAILED\n` : '\nLanding checks passed\n'); process.exit(fails ? 1 : 0);
