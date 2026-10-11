// Verification "Fix with AI": a failing patch set is diagnosed, corrected, re-verified and passes.
const API = 'http://localhost:4000/api';
let fails = 0; const ok = (c, m, d = '') => { console.log(`${c ? ' ✓' : ' ✗'} ${m}${d ? '  — ' + d : ''}`); if (!c) fails++; };
const api = async (p, m = 'GET', b, u = 'alex') => { const r = await fetch(API + p, { method: m, headers: { 'content-type': 'application/json', 'x-pw-user': u }, body: m === 'GET' ? undefined : JSON.stringify(b ?? {}) }); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(`${p}: ${j.error || r.status}`); return j; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const verify = async (patchIds) => { const { id } = await api('/sites/shoplite/verify', 'POST', { patchIds }); for (let i = 0; i < 90; i++) { await sleep(1500); const v = await api(`/verifications/${id}`); if (v.status !== 'running' && v.status !== 'queued') return v; } throw new Error('verification timed out'); };

await api('/demo/reset', 'POST'); await sleep(4500);
const P = await api('/sites/shoplite/patches'); const by = (t) => P.find((p) => p.title.includes(t));
const live = P.filter((p) => p.status === 'live').map((p) => p.id);
const hero = by('Hero button').id, hide = by('Hide order summary').id, script = by('analytics').id;

console.log('\n1. Candidate that drops the live patches');
let v = await verify([hero]);
ok(v.status === 'fail', 'verification fails', v.report.summary && JSON.stringify(v.report.summary));
let f = await api(`/verifications/${v.id}/fix`, 'POST');
ok(f.fixable && live.every((id) => f.patchIds.includes(id)), 'fix adds the live patches back', f.actions.map((a) => `${a.type}:${a.title}`).join(', '));
v = await verify(f.patchIds); ok(v.status === 'pass', 're-verification passes', JSON.stringify(v.report.summary));

console.log('\n2. Candidate with a patch that hides most of the page');
v = await verify([...live, hide]);
ok(v.status === 'fail', 'verification fails (flow / blast radius)', v.report.checks.filter((c) => c.status === 'fail').map((c) => c.name).join('; '));
f = await api(`/verifications/${v.id}/fix`, 'POST');
ok(f.fixable && f.actions.some((a) => a.type === 'remove' && a.patchId === hide), 'fix removes the destructive patch', f.summary);
v = await verify(f.patchIds); ok(v.status !== 'fail', 're-verification no longer fails', v.status);

console.log('\n3. Candidate with a script that throws');
v = await verify([...live, script]);
ok(v.status === 'fail', 'verification fails', v.status);
f = await api(`/verifications/${v.id}/fix`, 'POST');
ok(f.fixable && f.actions.some((a) => a.type === 'remove' && a.patchId === script), 'fix removes the script patch', f.summary);
v = await verify(f.patchIds); ok(v.status !== 'fail', 're-verification no longer fails', v.status);

console.log('\n4. Nothing to fix');
f = await api(`/verifications/${v.id}/fix`, 'POST');
ok(!f.fixable, 'a passing set reports no fix needed');
console.log(fails ? `\n${fails} FAILED` : '\nAuto-fix checks passed'); process.exit(fails ? 1 : 0);
