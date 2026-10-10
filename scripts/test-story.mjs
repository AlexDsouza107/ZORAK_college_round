// Full demo storyline against a freshly reset stack: review -> conflict -> verify -> release -> vendor redeploy
// -> auto-heal -> bad release -> auto-rollback -> audit integrity.
const API = 'http://localhost:4000/api';
const api = async (p, method = 'GET', body, user = 'alex') => {
  const r = await fetch(API + p, { method, headers: { 'content-type': 'application/json', 'x-pw-user': user }, body: method === 'GET' ? undefined : JSON.stringify(body ?? {}) });
  const j = await r.json().catch(() => ({})); if (!r.ok) throw Object.assign(new Error(j.error || r.status), { body: j }); return j;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const ok = (c, m, x = '') => { console.log(`${c ? ' ✓' : ' ✗'} ${m}${x ? '  — ' + x : ''}`); if (!c) fails++; };
const waitFor = async (fn, ms = 90000) => { const t = Date.now(); while (Date.now() - t < ms) { const v = await fn(); if (v) return v; await sleep(700); } return null; };
const verify = async (ids) => { const { id } = await api('/sites/shoplite/verify', 'POST', { patchIds: ids }); return waitFor(async () => { const v = await api('/verifications/' + id); return v.status !== 'running' ? v : null; }); };

await api('/demo/reset', 'POST'); await sleep(2500);
let P = await api('/sites/shoplite/patches'); const id = (t) => P.find((p) => p.title.includes(t)).id;
const [p1, p2, p3, p4, p5, p6, p7] = ['Enable the checkout', 'chekout', 'Hero button', 'Free-shipping', 'Secure checkout', 'Hide order', 'analytics'].map(id);

console.log('\n1. Review & permissions');
try { await api(`/patches/${p5}/approve`, 'POST', {}, 'sam'); ok(false, 'developer must not approve'); } catch (e) { ok(/requires reviewer/.test(e.message), 'developers cannot approve', e.message); }
try { await api(`/patches/${p5}/approve`, 'POST', {}, 'sam'); } catch { /* */ }
await api(`/patches/${p3}/approve`, 'POST', { comment: 'Good catch on contrast' }, 'jordan'); ok(true, 'reviewer approved the contrast fix');
await api(`/patches/${p4}/submit`, 'POST', {}, 'riya'); await api(`/patches/${p4}/approve`, 'POST', {}, 'jordan'); ok(true, 'banner submitted and approved');
try { await api(`/patches/${p7}/submit`, 'POST', {}, 'sam'); await api(`/patches/${p7}/approve`, 'POST', {}, 'jordan'); ok(false, 'script patch needs admin'); } catch (e) { ok(/admin/.test(e.message), 'script patch cannot be approved by a reviewer', e.message); }

console.log('\n2. Conflicts');
let cs = await api('/sites/shoplite/conflicts'); const col = cs.find((c) => c.kind === 'collision');
ok(!!col, 'typo fix vs "Secure checkout" collision detected', col?.message);
const sug = await api('/conflicts/suggest', 'POST', { conflict: col }); ok(!!sug.strategy, 'AI/rule suggestion returned', `${sug.provider}: ${sug.strategy}`);
await api('/conflicts/resolve', 'POST', { conflict: col, strategy: 'keepA' }, 'jordan');
P = await api('/sites/shoplite/patches'); ok(P.find((p) => p.id === p5).status === 'rejected', 'losing patch rejected after resolution');
try { await api('/sites/shoplite/releases', 'POST', { patchIds: [p1, p2, p6] }); ok(false, 'should block'); } catch (e) { ok(/not approved|conflict/i.test(e.message), 'release blocked for unapproved/conflicting set', e.message); }

console.log('\n3. Verify -> release v2 (canary then promote)');
let v = await verify([p1, p2, p3, p4]); ok(['pass', 'warn'].includes(v.status), `verification ${v.status}`, JSON.stringify(v.report.summary));
await api('/patches/' + p6 + '/submit', 'POST', {}, 'sam'); await api('/patches/' + p6 + '/approve', 'POST', {}, 'jordan');
try { await api('/sites/shoplite/releases', 'POST', { patchIds: [p1, p2, p3, p4] }, 'sam'); ok(false, 'dev cannot release'); } catch (e) { ok(/requires reviewer/.test(e.message), 'developers cannot create releases'); }
const r2 = await api('/sites/shoplite/releases', 'POST', { patchIds: [p1, p2, p3, p4], note: 'Contrast + banner' }, 'jordan');
await api(`/releases/${r2.id}/deploy`, 'POST', { canaryPct: 40 }, 'jordan');
let site = await api('/sites/shoplite'); ok(site.canary?.version === 2 && site.site.canaryPct === 40, 'v2 running as a 40% canary');
await api(`/releases/${r2.id}/promote`, 'POST', {}, 'jordan'); site = await api('/sites/shoplite'); ok(site.active.version === 2, 'v2 promoted to production');

console.log('\n4. Vendor redeploys the site (v2 markup) -> auto-heal');
await api('/demo/redeploy', 'POST', { version: 'v2' });
const d = await api('/sites/shoplite/drift/run', 'POST'); ok(d.report.summary.healed >= 3, 'drift watcher sees moved elements', JSON.stringify(d.report.summary));
await api('/sites/shoplite/drift/heal', 'POST', {}, 'jordan');
site = await waitFor(async () => { const s = await api('/sites/shoplite'); return s.active.version >= 3 ? s : null; }, 120000);
ok(!!site, 'auto-heal verified and released a new version', site ? `v${site.active.version}` : 'timed out');
const rels = await api('/sites/shoplite/releases'); ok(rels.some((r) => r.kind === 'auto-heal'), 'release is tagged auto-heal');
const d2 = await api('/sites/shoplite/drift/run', 'POST'); ok(d2.report.summary.exact + d2.report.summary.healed >= 4 && !d2.report.summary.orphaned, 'all patches tracked after heal', JSON.stringify(d2.report.summary));

console.log('\n5. Bad release -> auto-rollback');
await api(`/patches/${p7}/approve`, 'POST', {}, 'alex');
const bad = await api('/sites/shoplite/releases', 'POST', { patchIds: [...site.active.patchIds, p7], note: 'oops', overrideReason: 'demo: skipping verification' }, 'alex');
const before = site.active.version;
await api(`/releases/${bad.id}/deploy`, 'POST', {}, 'alex');
await api('/sites/shoplite/traffic', 'POST', { visits: 6 });
const rolled = await waitFor(async () => { const s = await api('/sites/shoplite'); return s.active.version === before ? s : null; }, 30000);
ok(!!rolled, `bad release v${bad.version} auto-rolled back to v${before}`);
const audit = await api('/audit?siteId=shoplite&limit=100'); ok(audit.some((a) => a.type === 'release.auto_rollback'), 'auto-rollback recorded in audit trail', audit.find((a) => a.type === 'release.auto_rollback')?.summary);
P = await api('/sites/shoplite/patches'); ok(P.find((p) => p.id === p7).status === 'reverted', 'bad patch marked reverted');

console.log('\n6. Audit integrity');
const chain = await api('/audit/verify'); ok(chain.valid, 'hash chain valid', `${chain.total} entries`);
await api('/audit/tamper', 'POST'); const broken = await api('/audit/verify'); ok(!broken.valid, 'tampering detected', `entry #${broken.brokenAt}`); await api('/audit/repair', 'POST');

await api('/demo/redeploy', 'POST', { version: 'v1' });
console.log(fails ? `\n${fails} check(s) FAILED\n` : '\nFull storyline passed\n'); process.exit(fails ? 1 : 0);
