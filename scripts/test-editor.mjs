// Drives the Studio visual editor in a real browser: select an element, edit it, preview, save.
import { chromium } from 'playwright';
let fails = 0; const ok = (c, m) => { console.log(`${c ? ' ✓' : ' ✗'} ${m}`); if (!c) fails++; };
const b = await chromium.launch(); const page = await b.newPage({ viewport: { width: 1600, height: 960 } });
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto('http://localhost:4000/#/editor');
const fr = page.frameLocator('iframe');
await fr.locator('#checkout-btn').waitFor({ timeout: 15000 });
await page.waitForTimeout(1500);
ok(true, 'editor canvas loaded the proxied ShopLite cart');
await fr.locator('#checkout-btn').click({ force: true });
await page.waitForSelector('text=<button>', { timeout: 5000 }); ok(true, 'clicking an element selects it and fills the inspector');
await page.getByText('Attributes & behaviour').click();
await page.getByRole('button', { name: 'Enable' }).click();
await page.waitForTimeout(300);
ok(await fr.locator('#checkout-btn').isEnabled(), 'live preview: disabled attribute removed on the canvas instantly');
await page.locator('textarea').first().fill('Proceed to checkout');
await page.waitForTimeout(300);
ok((await fr.locator('#checkout-btn').innerText()).trim() === 'Proceed to checkout', 'live preview: text edited on the canvas');
await page.screenshot({ path: '/tmp/editor1.png' });
await page.getByPlaceholder(/Enable|Fix|Name this/).fill('E2E: fix checkout button');
await page.getByRole('button', { name: 'Save draft' }).click();
await page.waitForSelector('text=E2E: fix checkout button', { timeout: 6000 }); ok(true, 'patch saved and appears in the layer list');
// AI bar (rule-based fallback) on another element
await fr.locator('#hero-cta, .card-body, .cart-summary h2').first().click({ force: true }).catch(() => {});
await page.screenshot({ path: '/tmp/editor2.png' });
await b.close();
if (errs.length) console.log('page errors:', errs.slice(0, 3));
console.log(fails ? `\n${fails} FAILED` : '\nEditor checks passed'); process.exit(fails ? 1 : 0);
