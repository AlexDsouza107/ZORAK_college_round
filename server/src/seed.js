// Seeds the ShopLite demo: site, flows, a realistic backlog of patches (including deliberate conflicts and
// a deliberately dangerous patch) and one live release. Descriptors are captured from the real DOM.
import fs from 'node:fs';
import { db, get, run, ARTIFACT_DIR } from './db.js';
import * as store from './store.js';
import * as audit from './audit.js';
import { USERS } from './users.js';
import { getBrowser } from './verify.js';
import { urlFor } from './proxy.js';
import { createRelease, deploy } from './releases.js';

const DEMO_URL = process.env.SHOPLITE_URL || `http://localhost:${process.env.SHOPLITE_PORT || 4100}`;

const FLOWS = [{
  id: 'checkout', name: 'Customer can check out',
  steps: [
    { do: 'goto', url: '/', label: 'Open the store' },
    { do: 'click', sel: 'button:has-text("Add to cart") >> nth=0', label: 'Add the first product to the cart' },
    { do: 'goto', url: '/cart', label: 'Open the cart' },
    { do: 'click', sel: 'text=/proceed to check?out/i', label: 'Click "Proceed to checkout"' },
    { do: 'expectUrl', value: '/checkout', label: 'Arrive at /checkout' },
    { do: 'click', sel: 'button:has-text("Place order")', label: 'Place the order' },
    { do: 'expectText', sel: 'h1', value: 'Order confirmed', label: 'See "Order confirmed"' }
  ]
}];

async function describeAll(specs) {
  const browser = await getBrowser();
  const out = {};
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 820 } });
  await ctx.addInitScript(() => { try { localStorage.setItem('shoplite.cart', JSON.stringify([{ id: 'hp', qty: 1 }])); } catch (e) { /* ignore */ } });
  for (const [key, spec] of Object.entries(specs)) {
    const page = await ctx.newPage();
    await page.goto(urlFor('shoplite', { kind: 'none' }, false, spec.page), { waitUntil: 'load' });
    await page.waitForTimeout(300);
    out[key] = await page.evaluate((sel) => { const el = document.querySelector(sel); return { target: window.PWCore.describe(el), hash: window.PWCore.pageHash(document) }; }, spec.sel);
    await page.close();
  }
  await ctx.close();
  return out;
}

export async function seedDemo({ reset = false } = {}) {
  if (reset) {
    for (const t of ['sites', 'patches', 'comments', 'releases', 'verifications', 'previews', 'audit', 'events', 'patch_health', 'drift_runs']) db.exec(`DELETE FROM ${t}`);
    db.exec("DELETE FROM sqlite_sequence");
    fs.rmSync(ARTIFACT_DIR, { recursive: true, force: true }); fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
    try { await fetch(DEMO_URL + '/__admin/version', { method: 'POST', body: JSON.stringify({ version: 'v1' }) }); } catch { /* demo site down */ }
  }
  if (get('SELECT id FROM sites LIMIT 1')) return;
  try { await fetch(DEMO_URL + '/healthz'); } catch { console.warn(`[seed] ShopLite is not reachable at ${DEMO_URL}; skipping demo seed.`); return; }

  const alex = USERS.alex, jordan = USERS.jordan, sam = USERS.sam, riya = USERS.riya;
  store.createSite({ id: 'shoplite', name: 'ShopLite', origin: DEMO_URL, config: { flows: FLOWS, verifyPages: ['/', '/cart', '/checkout'] } });
  audit.record('shoplite', alex.id, 'site.created', `${alex.name} registered ShopLite (${DEMO_URL})`, {});

  const d = await describeAll({
    checkout: { page: '/cart', sel: '#checkout-btn' }, hero: { page: '/', sel: '#hero-cta' },
    header: { page: '/', sel: '.site-header' }, summary: { page: '/cart', sel: '.cart-summary' }
  });
  const mk = (user, body) => store.createPatch('shoplite', user, body);

  const p1 = mk(alex, { title: 'Enable the checkout button', description: 'The button ships with a stray `disabled` attribute so customers cannot check out.', page: '/cart', target: d.checkout.target, baseHash: d.checkout.hash, ops: [{ type: 'setAttr', name: 'disabled', value: null }] });
  const p2 = mk(alex, { title: 'Fix "chekout" typo', description: 'Button label is misspelled.', page: '/cart', target: d.checkout.target, baseHash: d.checkout.hash, ops: [{ type: 'setText', value: 'Proceed to checkout' }] });
  const p3 = mk(riya, { title: 'Hero button contrast', description: 'Light grey text on white fails WCAG AA (contrast 1.7:1).', page: '/', target: d.hero.target, baseHash: d.hero.hash, ops: [{ type: 'setStyle', prop: 'color', value: '#1f2937' }, { type: 'setStyle', prop: 'font-weight', value: '700' }] });
  const p4 = mk(riya, { title: 'Free-shipping banner', description: 'Announce free shipping above the fold.', page: '*', target: d.header.target, baseHash: d.header.hash, ops: [{ type: 'insert', position: 'afterend', html: '<div style="background:#ecfdf5;color:#065f46;text-align:center;padding:9px 12px;font:600 14px system-ui">🚚 Free shipping on orders over $50</div>' }] });
  const p5 = mk(sam, { title: 'Rename CTA to "Secure checkout"', description: 'Marketing wants a trust-focused label.', page: '/cart', target: d.checkout.target, baseHash: d.checkout.hash, ops: [{ type: 'setText', value: 'Secure checkout →' }] });
  const p6 = mk(sam, { title: 'Hide order summary (experiment)', description: 'Try a distraction-free cart.', page: '/cart', target: d.summary.target, baseHash: d.summary.hash, ops: [{ type: 'remove' }] });
  const p7 = mk(sam, { title: 'Checkout analytics hook', description: 'Initialise the (missing) tracker on the checkout button.', page: '/cart', target: d.checkout.target, baseHash: d.checkout.hash, ops: [{ type: 'injectJS', code: 'window.checkoutTracker.init(el);' }] });

  for (const p of [p1, p2]) { store.setStatus(p.id, 'review', alex, null, 'patch.submitted'); store.setStatus(p.id, 'approved', jordan, 'Looks right', 'patch.approved'); }
  store.setStatus(p3.id, 'review', riya, null, 'patch.submitted');
  store.setStatus(p5.id, 'review', sam, null, 'patch.submitted');
  store.addComment(p5.id, jordan, 'This overlaps with the typo fix — can we agree on one label?', 'review');

  const rel = createRelease('shoplite', alex, { patchIds: [p1.id, p2.id], note: 'Initial hotfix: make checkout work', skipChecks: true, kind: 'baseline' });
  deploy(rel.id, alex, {});
  console.log('[seed] ShopLite demo seeded (7 patches, release v1 live)');
}
