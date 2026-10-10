// End-to-end smoke test of PATCHWORK's core promises against the running stack (npm start must be running).
import { chromium } from 'playwright';
const API = 'http://localhost:4000/api';
const api = async (p, method = 'GET', body, user = 'alex') => {
  const r = await fetch(API + p, { method, headers: { 'content-type': 'application/json', 'x-pw-user': user }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({})); if (!r.ok) throw Object.assign(new Error(j.error || r.status), { body: j }); return j;
};
let fails = 0;
const ok = (c, msg, extra = '') => { console.log(`${c ? ' ✓' : ' ✗'} ${msg}${extra ? '  — ' + extra : ''}`); if (!c) fails++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const patches = await api('/sites/shoplite/patches');
const byTitle = (t) => patches.find((p) => p.title.includes(t)).id;
const [p1, p2, p3, p4, p5, p6, p7] = ['Enable the checkout', 'chekout', 'Hero button', 'Free-shipping', 'Secure checkout', 'Hide order', 'analytics'].map(byTitle);

const browser = await chromium.launch();
async function cartState(host, btnSel) {
  const ctx = await browser.newContext();
  await ctx.addInitScript(() => localStorage.setItem('shoplite.cart', JSON.stringify([{ id: 'hp', qty: 1 }])));
  const page = await ctx.newPage();
  await page.goto(`http://${host}:4000/cart`);
  await page.waitForFunction(() => window.__PW_STATE__?.ready); await page.waitForTimeout(400);
  const r = await page.evaluate((s) => { const b = document.querySelector(s); return { disabled: b?.disabled, text: b?.textContent.trim(), state: window.__PW_STATE__.patches }; }, btnSel);
  await ctx.close(); return r;
}

console.log('\n1. Live patching on ShopLite v1');
let r = await cartState('none.shoplite.localhost', '#checkout-btn');
ok(r.disabled === true && r.text === 'Proceed to chekout', 'original site is broken (disabled + typo)');
r = await cartState('shoplite.localhost', '#checkout-btn');
ok(r.disabled === false && r.text === 'Proceed to checkout', 'live release v1 fixes the button without touching the origin', JSON.stringify(Object.values(r.state).map((s) => s.status)));

console.log('\n2. Site is redeployed (v2: ids, classes, structure all renamed)');
await api('/demo/redeploy', 'POST', { version: 'v2' });
r = await cartState('none.shoplite.localhost', '#pay-cta');
ok(r.disabled === true, 'v2 still has the bug');
r = await cartState('shoplite.localhost', '#pay-cta');
const st = Object.values(r.state);
ok(r.disabled === false && r.text === 'Proceed to checkout', 'patches self-healed onto the new markup', st.map((s) => `${s.status}@${Math.round((s.confidence || 0) * 100)}%`).join(', '));
ok(st.every((s) => ['healed', 'exact'].includes(s.status)), 'tracker reports healed/exact for every patch');

console.log('\n3. Drift watcher');
const d = await api('/sites/shoplite/drift/run', 'POST');
ok(d.report.summary.healed >= 2, 'drift check detects moved elements', JSON.stringify(d.report.summary));

console.log('\n4. Verification gate (v2 site, baseline = live release)');
async function verify(ids) { const { id } = await api('/sites/shoplite/verify', 'POST', { patchIds: ids }); for (let i = 0; i < 120; i++) { await sleep(1000); const v = await api('/verifications/' + id); if (v.status !== 'running') return v; } throw new Error('timeout'); }
let v = await verify([p1, p2, p3, p4]);
ok(['pass', 'warn'].includes(v.status), `good patch set → ${v.status.toUpperCase()}`, JSON.stringify(v.report.summary));
v.report.checks.filter((c) => c.status !== 'pass').forEach((c) => console.log(`      ${c.status}: ${c.name} — ${c.detail}`));
ok(v.report.checks.some((c) => c.id.startsWith('flow:') && c.status === 'pass'), 'checkout flow passes', v.report.checks.find((c) => c.id.startsWith('flow:'))?.detail);
v = await verify([p1, p2, p6]);
ok(v.status === 'fail', 'dangerous "hide order summary" patch is BLOCKED', v.report.checks.filter((c) => c.status === 'fail').map((c) => c.name).join(' | '));
v = await verify([p1, p2, p7]);
ok(v.status === 'fail', 'script patch that throws is BLOCKED', v.report.checks.filter((c) => c.status === 'fail').map((c) => c.detail).join(' | ').slice(0, 120));

console.log('\n5. Release gate');
try { await api('/sites/shoplite/releases', 'POST', { patchIds: [p1, p2, p3] }); ok(false, 'unapproved patch should not release'); } catch (e) { ok(/not approved/.test(e.message), 'unapproved patches cannot be released', e.message); }

await api('/demo/redeploy', 'POST', { version: 'v1' });
await browser.close();
console.log(fails ? `\n${fails} check(s) FAILED\n` : '\nAll checks passed\n');
process.exit(fails ? 1 : 0);
