// Walks through the demo guide's scenes 3-10 with real UI clicks (needs `npm start` + `npm run demo:prep`).
import { chromium } from 'playwright';
let fails = 0; const ok = (c, m) => { console.log(`${c ? ' ✓' : ' ✗'} ${m}`); if (!c) fails++; };
const b = await chromium.launch(); const page = await b.newPage({ viewport: { width: 1600, height: 1000 } });
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
const go = async (r) => { await page.goto('http://localhost:4000/#' + r); await page.waitForTimeout(900); };
const user = async (name) => { await page.locator('.sidebar-foot button.btn.ghost').first().click(); await page.locator('.menu button', { hasText: name }).click(); await page.waitForTimeout(400); };
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
page.setDefaultTimeout(Number(process.env.STEP_TIMEOUT || 30000));
const step = async (name, fn) => {
  if (ONLY && !ONLY.some((n) => name.startsWith(`scene ${n}:`))) return;
  try { await fn(); ok(true, name); } catch (e) { ok(false, `${name} — ${String(e.message).split('\n').slice(0, 4).join(' | ')}`); await page.screenshot({ path: '/tmp/demo_fail_' + name.slice(0, 8).replace(/\W+/g, '') + '.png' }); }
};
await go('/overview'); await user('Alex');

await step('scene 3: AI bar changes the link text live', async () => {
  await go('/editor'); const fr = page.frameLocator('iframe'); await fr.locator('a.link').waitFor({ timeout: 15000 }); await page.waitForTimeout(1200);
  await fr.locator('a.link').click({ force: true }); await page.waitForSelector('text=<a>');
  await page.getByPlaceholder(/Describe a change/).fill('change the text to "Keep shopping" and make it bold'); await page.getByRole('button', { name: 'Generate' }).click();
  await page.waitForFunction(() => document.querySelector('iframe') && true); await page.waitForTimeout(1200);
  if ((await fr.locator('a.link').innerText()).trim() !== 'Keep shopping') throw new Error('text not changed: ' + (await fr.locator('a.link').innerText()));
});
await step('scene 3: patch submitted for review', async () => {
  await page.locator('.ed-right input.input').last().fill('Friendlier link'); await page.getByRole('button', { name: 'Submit' }).click(); await page.waitForSelector('.layer >> text=Friendlier link', { timeout: 6000 });
});
await step('scene 4: developer sees no Approve, reviewer approves', async () => {
  await go('/patches'); await user('Sam'); await page.getByText('Friendlier link').first().click(); await page.waitForSelector('text=Waiting for a reviewer');
  if (await page.getByRole('button', { name: 'Approve', exact: true }).count()) throw new Error('developer can see Approve');
  await page.keyboard.press('Escape'); await user('Jordan'); await page.getByText('Friendlier link').first().click(); await page.getByRole('button', { name: 'Approve', exact: true }).click();
  await page.waitForSelector('.drawer >> text=Approved', { timeout: 5000 }); await page.keyboard.press('Escape');
});
await step('scene 5: conflict resolved with Ask AI → Apply', async () => {
  await user('Alex'); await go('/patches'); await page.locator('.tabs button', { hasText: 'Conflicts' }).click();
  await page.waitForSelector('text=Collision'); await page.getByRole('button', { name: 'Ask AI' }).first().click(); await page.waitForSelector('text=Rule-based pick, text=suggests', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(800); await page.getByRole('button', { name: 'Apply', exact: true }).first().click(); await page.waitForTimeout(1500);
  if (await page.locator('.card >> text=Collision').count()) throw new Error('collision still present');
});
await step('scene 6: default set verifies as Safe to release', async () => {
  await go('/verify'); await page.getByRole('button', { name: /Run verification/ }).click(); await page.waitForSelector('text=Safe to release', { timeout: 90000 });
});
await step('scene 6: adding the risky patch shows Blocked', async () => {
  await page.locator('label.layer', { hasText: 'Hide order summary' }).locator('input').check(); await page.getByRole('button', { name: /Run verification/ }).click();
  await page.waitForSelector('text=Blocked', { timeout: 90000 });
});
await step('scene 7: release gate verified → create → canary → promote', async () => {
  await go('/releases'); await page.waitForSelector('text=Verified (run', { timeout: 8000 });
  await page.getByPlaceholder(/Release note/).fill('Demo release'); await page.getByRole('button', { name: 'Create release' }).click();
  await page.getByRole('button', { name: 'Deploy…' }).first().waitFor(); await page.getByRole('button', { name: 'Deploy…' }).first().click();
  await page.getByText('Canary rollout').click(); await page.getByRole('button', { name: /Start .* canary/ }).click();
  await page.getByRole('button', { name: 'Promote' }).waitFor({ timeout: 8000 }); await page.getByRole('button', { name: 'Promote' }).click(); await page.waitForSelector('text=No canary running', { timeout: 8000 });
});
await step('scene 8: redeploy v2 → drift check shows Self-healed', async () => {
  await go('/overview'); await page.getByRole('button', { name: 'Redeploy as v2' }).click(); await page.waitForTimeout(800);
  await go('/tracking'); await page.getByRole('button', { name: 'Run drift check' }).click(); await page.waitForSelector('text=Self-healed >> nth=-1', { timeout: 60000 });
});
await step('scene 8: Re-anchor & release creates an auto-heal release', async () => {
  await page.getByRole('button', { name: /Re-anchor/ }).click(); await page.waitForTimeout(500);
  await go('/releases'); await page.waitForSelector('text=auto-heal', { timeout: 120000 });
});
await step('scene 9: bad release auto-rolls back', async () => {
  await go('/patches'); await page.getByText('Checkout analytics hook').first().click(); await page.getByRole('button', { name: 'Approve', exact: true }).click(); await page.waitForSelector('.drawer >> text=Approved'); await page.keyboard.press('Escape');
  await go('/releases'); await page.getByPlaceholder(/Reason for overriding/).fill('demo'); await page.getByPlaceholder(/Release note/).fill('oops'); await page.getByRole('button', { name: 'Create release' }).click();
  await page.getByRole('button', { name: 'Deploy…' }).first().waitFor(); await page.getByRole('button', { name: 'Deploy…' }).first().click(); await page.getByRole('button', { name: 'Deploy to everyone' }).click(); await page.waitForTimeout(1500);
  await go('/overview'); await page.getByRole('button', { name: 'Simulate traffic' }).click(); await page.waitForTimeout(9000);
  await go('/audit'); await page.waitForSelector('text=AUTO-ROLLBACK', { timeout: 30000 });
});
await step('scene 10: tamper detected then restored', async () => {
  await page.getByRole('button', { name: 'Simulate tampering' }).click(); await page.waitForSelector('text=Tampering detected');
  await page.getByRole('button', { name: 'Restore' }).click(); await page.waitForSelector('text=Hash chain intact');
});
await b.close(); if (errs.length) console.log('page errors:', errs.slice(0, 3));
console.log(fails ? `\n${fails} step(s) FAILED\n` : '\nDemo UI walkthrough passed\n'); process.exit(fails ? 1 : 0);
