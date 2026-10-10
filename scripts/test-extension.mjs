// Loads the Chrome extension into Chromium and checks it patches the REAL site origin (no proxy involved).
import { chromium } from 'playwright';
import path from 'node:path'; import fs from 'node:fs'; import os from 'node:os'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const API = 'http://localhost:4000/api';
const api = async (p, m = 'GET', b) => (await fetch(API + p, { method: m, headers: { 'content-type': 'application/json', 'x-pw-user': 'alex' }, body: m === 'GET' ? undefined : JSON.stringify(b ?? {}) })).json();
let fails = 0; const ok = (c, m, x = '') => { console.log(`${c ? ' ✓' : ' ✗'} ${m}${x ? '  — ' + x : ''}`); if (!c) fails++; };
await api('/demo/reset', 'POST'); await new Promise((r) => setTimeout(r, 3000));
const ext = path.join(root, 'extension');
const ctx = await chromium.launchPersistentContext(fs.mkdtempSync(path.join(os.tmpdir(), 'pw-ext-')), {
  channel: 'chromium', headless: true, args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`]
});
let [sw] = ctx.serviceWorkers(); if (!sw) sw = await ctx.waitForEvent('serviceworker', { timeout: 15000 });
ok(!!sw, 'extension service worker running');
await ctx.addInitScript(() => { try { localStorage.setItem('shoplite.cart', JSON.stringify([{ id: 'hp', qty: 1 }])); } catch (e) { /* */ } });
const page = await ctx.newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto('http://localhost:4100/cart');
await page.waitForFunction(() => { const b = document.querySelector('#checkout-btn'); return b && !b.disabled; }, null, { timeout: 12000 }).catch(() => {});
const r = await page.evaluate(() => { const b = document.querySelector('#checkout-btn'); return { disabled: b.disabled, text: b.textContent.trim() }; });
ok(r.disabled === false && r.text === 'Proceed to checkout', 'live patches applied on the real site origin by the extension', JSON.stringify(r));

// mini editor
const tabId = await sw.evaluate(async () => (await chrome.tabs.query({ url: 'http://localhost:4100/*' }))[0].id);
await sw.evaluate((id) => chrome.scripting.executeScript({ target: { tabId: id }, files: ['panel.js'] }), tabId);
await page.waitForSelector('[data-pw-ui] >> text=Click any element', { timeout: 5000 });
ok(true, 'mini editor panel opens in the page');
const box = await page.locator('.link-btn, a.link').first().boundingBox();
await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
await page.waitForSelector('[data-pw-ui] #txt', { timeout: 5000 });
await page.locator('[data-pw-ui] #title').fill('Extension: tweak link');
await page.locator('[data-pw-ui] #hide').click();
await page.locator('[data-pw-ui] #save').click();
await page.waitForSelector('[data-pw-ui] >> text=Saved as a draft', { timeout: 6000 }); ok(true, 'draft patch saved from the extension');
const patches = await api('/sites/shoplite/patches');
const mine = patches.find((p) => p.title === 'Extension: tweak link');
ok(!!mine && mine.status === 'draft' && mine.ops[0].type === 'remove', 'patch arrived in Studio as a draft', mine && `${mine.id} by ${mine.author}`);
await ctx.close();
if (errs.length) console.log('page errors:', errs.slice(0, 3));
console.log(fails ? `\n${fails} FAILED\n` : '\nExtension checks passed\n'); process.exit(fails ? 1 : 0);
