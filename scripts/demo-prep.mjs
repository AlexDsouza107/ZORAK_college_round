// Puts PATCHWORK into the exact state the live demo starts from (run with the stack already started):  npm run demo:prep
//   - fresh ShopLite v1 + seeded data
//   - "Hero button contrast" and "Free-shipping banner" reviewed and approved (so the release step is quick)
//   - "Checkout analytics hook" submitted for review (admin approves it live, in the disaster scene)
//   - left on purpose: typo-vs-rename conflict, risky "Hide order summary" draft, nothing deployed beyond v1
const API = 'http://localhost:4000/api';
const api = async (p, m = 'GET', b, u = 'alex') => {
  const r = await fetch(API + p, { method: m, headers: { 'content-type': 'application/json', 'x-pw-user': u }, body: m === 'GET' ? undefined : JSON.stringify(b ?? {}) });
  const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(`${p}: ${j.error || r.status}`); return j;
};
try { await api('/health'); } catch { console.error('\n  ✗ PATCHWORK is not running. Start it first with:  npm start\n'); process.exit(1); }
await api('/demo/reset', 'POST'); await new Promise((r) => setTimeout(r, 3500));
const P = await api('/sites/shoplite/patches'); const id = (t) => P.find((p) => p.title.includes(t)).id;
await api(`/patches/${id('Hero button')}/approve`, 'POST', { comment: 'Contrast fix looks good' }, 'jordan');
await api(`/patches/${id('Free-shipping')}/submit`, 'POST', {}, 'riya');
await api(`/patches/${id('Free-shipping')}/approve`, 'POST', {}, 'jordan');
await api(`/patches/${id('analytics')}/submit`, 'POST', {}, 'sam');
const demo = await api('/demo/version');
console.log(`\n  ✓ Demo is ready (ShopLite ${demo.version}).\n    Release v1 live · 2 approved patches ready to ship · 1 conflict waiting · 1 risky draft · 1 script patch awaiting admin\n    Open http://localhost:4000 in Chrome, signed in as Alex.\n`);
