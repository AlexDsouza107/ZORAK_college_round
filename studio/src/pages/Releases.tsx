import { useEffect, useMemo, useRef, useState } from 'react';
import { api, ago, dateTime, Release } from '../api';
import { useApp } from '../ctx';
import { Btn, Card, Empty, I, Modal, Page, Status, useAsync, Who, Confirm } from '../ui';

export default function Releases() {
  const { patches, releases, data, siteId, can, go, user, refresh, siteUrl, toast } = useApp();
  const { busy, run } = useAsync();
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [runs, setRuns] = useState<any[]>([]);
  const [hash, setHash] = useState('');
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [note, setNote] = useState('');
  const [override, setOverride] = useState('');
  const [deployFor, setDeployFor] = useState<Release | null>(null);
  const [rollFor, setRollFor] = useState<{ version: number | null } | null>(null);
  const [tt, setTT] = useState<number | null>(null);
  const [ttPath, setTtPath] = useState('/cart');
  const init = useRef(false);

  const active = releases.find((r) => r.id === data?.site?.activeReleaseId) || null;
  const canary = releases.find((r) => r.id === data?.site?.canaryReleaseId) || null;
  const liveIds = new Set(active?.patchIds || []);
  const candidates = patches.filter((p) => ['approved', 'live'].includes(p.status));

  useEffect(() => {
    if (init.current || !patches.length) return; init.current = true;
    let pre: string[] = []; try { pre = JSON.parse(sessionStorage.getItem('pw.selection') || '[]'); } catch { /* ignore */ }
    sessionStorage.removeItem('pw.selection');
    setSel(new Set(pre.length ? [...pre, ...patches.filter((p) => p.status === 'live').map((p) => p.id)] : patches.filter((p) => p.status === 'live' || p.status === 'approved').map((p) => p.id)));
  }, [patches]);

  const ids = useMemo(() => [...sel].sort(), [sel]);
  useEffect(() => {
    if (!ids.length) { setHash(''); setConflicts([]); return; }
    api(`/sites/${siteId}/set-hash`, 'POST', { patchIds: ids }).then((r) => setHash(r.hash)).catch(() => {});
    api(`/sites/${siteId}/conflicts?ids=${ids.join(',')}`).then(setConflicts).catch(() => {});
    api(`/sites/${siteId}/verifications`).then(setRuns).catch(() => {});
  }, [ids.join(','), patches]); // eslint-disable-line
  const ver = runs.find((r) => r.setHash === hash && ['pass', 'warn'].includes(r.status));
  const failedRun = runs.find((r) => r.setHash === hash && r.status === 'fail');
  const hard = conflicts.filter((c) => c.severity === 'high');
  const unapproved = [...sel].map((i) => patches.find((p) => p.id === i)).filter((p) => p && !['approved', 'live'].includes(p.status));
  const sameAsLive = active && ids.join(',') === [...active.patchIds].sort().join(',');
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const create = () => run('create', async () => { await api(`/sites/${siteId}/releases`, 'POST', { patchIds: ids, note, overrideReason: !ver ? override : undefined }); setNote(''); setOverride(''); await refresh(); }, 'Release staged — deploy it when ready');
  const needsOverride = !ver;

  /* time machine */
  const versions = [{ version: 0, label: 'Original', release: null as Release | null }, ...[...releases].filter((r) => !['staged', 'cancelled'].includes(r.status) || r.deployedAt).sort((a, b) => a.version - b.version).map((r) => ({ version: r.version, label: `v${r.version}`, release: r }))];
  const ttVersion = tt ?? (active?.version ?? 0);
  const ttIdx = Math.max(0, versions.findIndex((v) => v.version === ttVersion));
  const ttCur = versions[ttIdx]?.release || null, ttPrev = ttIdx > 0 ? versions[ttIdx - 1].release : null;
  const diff = useMemo(() => {
    const cur = ttCur?.snapshot || [], prev = ttPrev?.snapshot || [];
    const pm = Object.fromEntries(prev.map((p: any) => [p.id, p])), cm = Object.fromEntries(cur.map((p: any) => [p.id, p]));
    return { added: cur.filter((p: any) => !pm[p.id]), removed: prev.filter((p: any) => !cm[p.id]), changed: cur.filter((p: any) => pm[p.id] && pm[p.id].rev !== p.rev) };
  }, [ttCur, ttPrev]);

  return (
    <Page big title="Releases">
      <div className="col gap-lg">
        {(active || canary) && <div className="grid g2">
          {active && <Card className="hover"><div className="row between"><div><div className="eyebrow">In production</div><div className="row"><h2 style={{ fontSize: 30 }}>v{active.version}</h2><Status s="live" /></div><div className="small muted">{active.patchIds.length} patches · deployed {ago(active.deployedAt)} by <Who id={active.createdBy} /></div></div>
            <Btn variant="danger" icon={I.Undo2} disabled={!can('reviewer')} onClick={() => setRollFor({ version: null })}>Roll back</Btn></div></Card>}
          {canary ? <Card className="hover"><div className="row between"><div><div className="eyebrow">Canary</div><div className="row"><h2 style={{ fontSize: 30 }}>v{canary.version}</h2><span className="badge warn"><I.Bird size={12} />{data.site.canaryPct}% of visitors</span></div><div className="small muted">Watching health before wider rollout</div></div>
            <div className="col gap-sm"><Btn variant="good" icon={I.TrendingUp} disabled={!can('reviewer')} loading={busy === 'promote'} onClick={() => run('promote', async () => { await api(`/releases/${canary.id}/promote`, 'POST'); await refresh(); }, `v${canary.version} promoted to 100%`)}>Promote</Btn>
              <Btn size="sm" variant="danger" disabled={!can('reviewer')} onClick={() => run('cc', async () => { await api(`/sites/${siteId}/rollback`, 'POST', { canaryOnly: true, reason: 'cancelled by operator' }); await refresh(); }, 'Canary cancelled')}>Cancel canary</Btn></div></div></Card> :
            <Card><div className="small muted" style={{ padding: 4 }}><I.Bird size={14} style={{ verticalAlign: -2 }} /> No canary running. When you deploy, choose a percentage of visitors to receive the new release first.</div></Card>}
        </div>}

        <Card title="Build a release" icon={I.PackagePlus} sub="Choose which patches ship together. Everything currently live is kept unless you untick it.">
          {candidates.length === 0 ? <Empty icon={I.PackagePlus} title="No approved patches yet" action={<Btn variant="primary" onClick={() => go('/patches')}>Go to Patches</Btn>}>Patches must be reviewed and approved before they can be released.</Empty> : <div className="grid g-main" style={{ alignItems: 'start' }}>
            <div className="col" style={{ gap: 4 }}>{candidates.map((p) => <label key={p.id} className="layer" style={{ cursor: 'pointer', margin: 0 }}><input type="checkbox" checked={sel.has(p.id)} onChange={() => toggle(p.id)} />
              <div style={{ flex: 1, minWidth: 0 }}><div className="bold small trunc">{p.title}</div><div className="tiny muted row gap-sm"><Status s={p.status} dot={false} /><span className="mono">{p.page}</span><Who id={p.author} /></div></div>{liveIds.has(p.id) && <span className="badge accent">in v{active?.version}</span>}</label>)}</div>
            <div className="col">
              <div className="col" style={{ gap: 8, padding: 14, borderRadius: 14, background: 'var(--surface-2)', border: '1px solid var(--line)' }}>
                <div className="eyebrow">Release gate</div>
                <Gate ok={!unapproved.length} label="All patches approved" />
                <Gate ok={!hard.length} label={hard.length ? `${hard.length} unresolved conflict(s)` : 'No conflicts'} action={hard.length ? <a style={{ cursor: 'pointer' }} onClick={() => go('/patches')}>Resolve</a> : undefined} />
                <Gate ok={!!ver} warn={!ver && !failedRun} label={ver ? `Verified (run #${ver.id}, ${ver.status})` : failedRun ? `Verification FAILED (run #${failedRun.id})` : 'Not verified yet'} action={!ver ? <a style={{ cursor: 'pointer' }} onClick={() => { sessionStorage.setItem('pw.selection', JSON.stringify(ids)); go('/verify'); }}>Run verification</a> : undefined} />
              </div>
              <input className="input" placeholder="Release note (what and why)" value={note} onChange={(e) => setNote(e.target.value)} />
              {needsOverride && user.role === 'admin' && <div className="col" style={{ gap: 6 }}><div className="tiny" style={{ color: 'var(--warn)' }}><I.TriangleAlert size={12} style={{ verticalAlign: -2 }} /> Admin override: skip verification (recorded in the audit trail)</div><input className="input" placeholder="Reason for overriding verification" value={override} onChange={(e) => setOverride(e.target.value)} /></div>}
              <Btn variant="primary" icon={I.Package} loading={busy === 'create'} onClick={create} disabled={!can('reviewer') || !ids.length || !!unapproved.length || !!hard.length || !!sameAsLive || (needsOverride && !(user.role === 'admin' && override.trim()))}>Create release</Btn>
              {!can('reviewer') && <div className="tiny muted"><I.Lock size={11} style={{ verticalAlign: -2 }} /> Reviewers and admins can create releases.</div>}
              {sameAsLive && <div className="tiny muted">This is identical to the live release.</div>}
            </div></div>}
        </Card>

        <Card title="Release history" icon={I.History} pad={false}>
          {releases.length === 0 ? <Empty icon={I.Rocket} title="No releases yet">Create your first release above.</Empty> : <div style={{ padding: '10px 22px 6px' }} className="timeline">
            {releases.map((r) => {
              const tone = r.status === 'live' ? '' : r.status === 'canary' ? 'warn' : r.status === 'rolled_back' ? 'bad' : r.status === 'staged' ? '' : 'muted';
              return <div key={r.id} className={`tl-item ${tone}`}>
                <div className="row between wrap"><div className="row"><b style={{ fontSize: 16 }}>v{r.version}</b><Status s={r.status} />{r.kind !== 'manual' && <span className="badge outline">{r.kind === 'auto-heal' ? 'auto-heal' : r.kind}</span>}{r.overrideReason && <span className="badge warn"><I.TriangleAlert size={11} />verification overridden</span>}{r.verificationId && <span className="badge good"><I.ShieldCheck size={11} />verified #{r.verificationId}</span>}</div>
                  <div className="row gap-sm">
                    {r.status === 'staged' && <Btn size="sm" variant="primary" icon={I.Rocket} disabled={!can('reviewer')} onClick={() => setDeployFor(r)}>Deploy…</Btn>}
                    {['superseded'].includes(r.status) && <Btn size="sm" icon={I.RotateCcw} disabled={!can('reviewer')} onClick={() => setRollFor({ version: r.version })}>Restore v{r.version}</Btn>}
                    <Btn size="sm" variant="ghost" icon={I.History} onClick={() => { setTT(r.version); document.getElementById('time-machine')?.scrollIntoView({ behavior: 'smooth' }); }}>View</Btn></div></div>
                <div className="small ink2" style={{ margin: '3px 0' }}>{r.note || '—'}</div>
                <div className="tiny muted">{r.patchIds.length} patches · staged by {user.id === r.createdBy ? 'you' : r.createdBy} · {dateTime(r.createdAt)}{r.deployedAt ? ` · deployed ${ago(r.deployedAt)}` : ''}</div>
                {r.overrideReason && <div className="tiny" style={{ color: 'var(--warn)' }}>Override reason: {r.overrideReason}</div>}
              </div>;
            })}</div>}
        </Card>

        <div id="time-machine"><Card title="Time machine" icon={I.History} sub="Scrub through every version of the live site, exactly as visitors saw it"
          action={<div className="pill-nav">{(data?.site?.config?.verifyPages || ['/']).map((p: string) => <Btn key={p} size="sm" className={ttPath === p ? 'active' : ''} onClick={() => setTtPath(p)}>{p}</Btn>)}</div>}>
          <div className="slider-wrap" style={{ padding: '4px 12px 18px' }}>
            <div className="row" style={{ alignItems: 'flex-start', gap: 0 }}>{versions.map((v, i) => <div key={v.version} className={`tt-dot ${i === ttIdx ? 'on' : ''} ${v.release?.status === 'live' ? 'live' : ''}`} style={{ flex: 1 }} onClick={() => setTT(v.version)}><i /><div className="small bold">{v.label}</div><div className="tiny muted">{v.release ? v.release.status.replace('_', ' ') : 'no patches'}</div></div>)}</div>
          </div>
          <div className="grid" style={{ gridTemplateColumns: '1fr 280px', alignItems: 'start' }}>
            <div className="shot" style={{ height: 480 }}><iframe key={ttVersion + ttPath} title="time machine" src={siteUrl(ttVersion === 0 ? { kind: 'none' } : { kind: 'release', version: ttVersion }, false, ttPath)} style={{ width: '100%', height: '100%', border: 0 }} /></div>
            <div className="col">
              <div className="eyebrow">{ttVersion === 0 ? 'The original site' : `v${ttVersion} vs ${ttPrev ? 'v' + ttPrev.version : 'original'}`}</div>
              {ttVersion === 0 && <div className="small muted">No patches applied — exactly what the site owner ships, bugs included.</div>}
              {diff.added.map((p: any) => <div key={p.id} className="opchip" style={{ background: 'var(--good-soft)', color: 'var(--good)', borderColor: 'transparent' }}><I.Plus size={12} /><span className="trunc">{p.title}</span></div>)}
              {diff.changed.map((p: any) => <div key={p.id} className="opchip"><I.Pencil size={12} /><span className="trunc">{p.title}</span></div>)}
              {diff.removed.map((p: any) => <div key={p.id} className="opchip" style={{ background: 'var(--bad-soft)', color: 'var(--bad)', borderColor: 'transparent' }}><I.Minus size={12} /><span className="trunc">{p.title}</span></div>)}
              {ttVersion !== 0 && !diff.added.length && !diff.changed.length && !diff.removed.length && <div className="small muted">Identical patch set.</div>}
              {ttCur && <div className="tiny muted">{ttCur.snapshot.length} patches in this version.</div>}
            </div>
          </div>
        </Card></div>
      </div>

      {deployFor && <DeployModal rel={deployFor} hasActive={!!active} onClose={() => setDeployFor(null)} onGo={(pct) => run('deploy', async () => { await api(`/releases/${deployFor.id}/deploy`, 'POST', { canaryPct: pct }); setDeployFor(null); await refresh(); }, pct ? `Canary of v${deployFor.version} started at ${pct}%` : `v${deployFor.version} is live`)} />}
      {rollFor && <Confirm title={rollFor.version != null ? `Restore v${rollFor.version}?` : 'Roll back the live release?'} danger confirm="Roll back now" onNo={() => setRollFor(null)}
        body={rollFor.version != null ? `v${active?.version} will be marked rolled back and v${rollFor.version} goes live immediately for all visitors.` : `v${active?.version} will be marked rolled back and the previous release (or the original site) goes live immediately for all visitors — open pages update within seconds.`}
        onYes={(reason: string) => { const v = rollFor.version; setRollFor(null); run('rb', async () => { await api(`/sites/${siteId}/rollback`, 'POST', { toVersion: v ?? undefined, reason: reason || 'manual rollback' }); await refresh(); }, 'Rolled back'); }}>
        {(reason: string, setReason: any) => <input className="input" style={{ marginTop: 14 }} placeholder="Reason (recorded in the audit trail)" value={reason} onChange={(e) => setReason(e.target.value)} />}</Confirm>}
    </Page>
  );
}

function Gate({ ok, warn, label, action }: { ok: boolean; warn?: boolean; label: string; action?: any }) {
  return <div className="row small"><div className={`ico ${ok ? 'pass' : warn ? 'warn' : 'fail'}`} style={{ width: 20, height: 20, borderRadius: '50%', display: 'grid', placeItems: 'center', background: ok ? 'var(--good-soft)' : warn ? 'var(--warn-soft)' : 'var(--bad-soft)', color: ok ? 'var(--good)' : warn ? 'var(--warn)' : 'var(--bad)' }}>{ok ? <I.Check size={12} /> : warn ? <I.Minus size={12} /> : <I.X size={12} />}</div><span>{label}</span><span className="spacer" />{action}</div>;
}

function DeployModal({ rel, hasActive, onClose, onGo }: { rel: Release; hasActive: boolean; onClose: () => void; onGo: (pct?: number) => void }) {
  const [mode, setMode] = useState<'full' | 'canary'>('full'); const [pct, setPct] = useState(20);
  return <Modal title={`Deploy v${rel.version}`} sub={rel.note} onClose={onClose} foot={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" icon={I.Rocket} onClick={() => onGo(mode === 'canary' ? pct : undefined)}>{mode === 'canary' ? `Start ${pct}% canary` : 'Deploy to everyone'}</Btn></>}>
    <div className="col">
      <div className="card pad-sm hover" style={{ cursor: 'pointer', borderColor: mode === 'full' ? 'var(--accent)' : undefined }} onClick={() => setMode('full')}><div className="bold">Full rollout</div><div className="small muted">All visitors get v{rel.version} straight away. A smoke test runs right after; a regression triggers automatic rollback.</div></div>
      <div className="card pad-sm hover" style={{ cursor: hasActive ? 'pointer' : 'not-allowed', opacity: hasActive ? 1 : .5, borderColor: mode === 'canary' ? 'var(--accent)' : undefined }} onClick={() => hasActive && setMode('canary')}>
        <div className="bold">Canary rollout</div><div className="small muted">Only a share of visitors (chosen at random, sticky per browser) get v{rel.version}. Promote it when the health numbers look good{hasActive ? '.' : ' — needs an existing live release.'}</div>
        {mode === 'canary' && <div style={{ marginTop: 12 }}><div className="row between small"><span>Share of traffic</span><b>{pct}%</b></div><input type="range" min={5} max={90} step={5} value={pct} onChange={(e) => setPct(+e.target.value)} /></div>}</div>
      <div className="tiny muted"><I.ShieldCheck size={12} style={{ verticalAlign: -2 }} /> Rolling back is always one click, and every action is written to the audit trail.</div>
    </div></Modal>;
}
