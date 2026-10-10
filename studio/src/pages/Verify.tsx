import { useEffect, useMemo, useRef, useState } from 'react';
import { api, ago, dateTime } from '../api';
import { useApp } from '../ctx';
import { Btn, Card, Empty, I, Page, Seg, Status, useAsync, Who } from '../ui';

const GROUPS: { id: string; label: string; icon: any; match: (id: string) => boolean }[] = [
  { id: 'apply', label: 'Patches apply cleanly', icon: I.Crosshair, match: (i) => i.startsWith('apply:') },
  { id: 'flow', label: 'Critical user flows', icon: I.Route, match: (i) => i.startsWith('flow:') },
  { id: 'console', label: 'Console & network', icon: I.Terminal, match: (i) => i.startsWith('console:') || i.startsWith('net:') },
  { id: 'a11y', label: 'Accessibility', icon: I.Accessibility, match: (i) => i.startsWith('a11y:') },
  { id: 'visual', label: 'Visual regression', icon: I.ScanEye, match: (i) => i.startsWith('visual:') },
  { id: 'blast', label: 'Blast radius', icon: I.Bomb, match: (i) => i.startsWith('blast:') }
];

export default function Verify() {
  const { patches, data, siteId, go, subscribe, user } = useApp();
  const { busy, run } = useAsync();
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [runs, setRuns] = useState<any[]>([]);
  const [current, setCurrent] = useState<any>(null);
  const [prog, setProg] = useState<{ stage: string; progress: number } | null>(null);
  const init = useRef(false);

  const eligible = patches.filter((p) => !['rejected'].includes(p.status));
  useEffect(() => {
    if (init.current || !patches.length) return; init.current = true;
    let pre: string[] = []; try { pre = JSON.parse(sessionStorage.getItem('pw.selection') || '[]'); } catch { /* ignore */ }
    if (pre.length) { setSel(new Set(pre)); sessionStorage.removeItem('pw.selection'); }
    else setSel(new Set(patches.filter((p) => p.status === 'live' || p.status === 'approved').map((p) => p.id)));
  }, [patches]);

  const loadRuns = () => api(`/sites/${siteId}/verifications`).then((r) => { setRuns(r); return r; });
  const openRun = (id: number) => api(`/verifications/${id}`).then(setCurrent);
  useEffect(() => { loadRuns().then((r) => r[0] && openRun(r[0].id)); }, []); // eslint-disable-line
  useEffect(() => subscribe((e) => {
    if (e.type !== 'verification') return;
    setProg({ stage: e.stage, progress: e.progress });
    if (e.stage === 'done' || e.stage === 'error') { loadRuns(); openRun(e.id); setTimeout(() => setProg(null), 600); }
  }), [subscribe]); // eslint-disable-line

  const start = async () => {
    const r = await run('go', () => api(`/sites/${siteId}/verify`, 'POST', { patchIds: [...sel] }));
    if (r) { setProg({ stage: 'queued', progress: 2 }); setCurrent(null); loadRuns(); }
  };
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const running = !!prog && prog.stage !== 'done';
  const rep = current?.report;

  return (
    <Page title="Verification" sub="A real browser tests the live site against your proposed patch set — nothing ships on a red result"
      actions={<Btn variant="primary" icon={I.Play} loading={busy === 'go' || running} disabled={!sel.size} onClick={start}>Run verification ({sel.size})</Btn>}>
      <div className="grid" style={{ gridTemplateColumns: '330px 1fr', alignItems: 'start' }}>
        <div className="col gap-lg">
          <Card title="Patch set" icon={I.ListChecks} sub="The release you’re about to propose" pad={false}>
            <div style={{ padding: '4px 8px 12px', maxHeight: 420, overflow: 'auto' }}>
              {eligible.map((p) => <label key={p.id} className="layer" style={{ cursor: 'pointer' }}>
                <input type="checkbox" checked={sel.has(p.id)} onChange={() => toggle(p.id)} />
                <div style={{ minWidth: 0, flex: 1 }}><div className="trunc bold small">{p.title}</div><div className="tiny muted row gap-sm"><Status s={p.status} dot={false} /><span className="mono">{p.page}</span></div></div></label>)}
            </div>
            <div style={{ padding: '10px 16px 14px', borderTop: '1px solid var(--line)' }} className="tiny muted">
              Baseline: <b>{data?.active ? `live release v${data.active.version}` : 'the original site'}</b>. Candidate: your selection. Checks run on desktop and mobile.
            </div>
          </Card>
          <Card title="Run history" icon={I.History} pad={false}>
            <div style={{ padding: '4px 8px 10px' }}>{runs.length === 0 && <div className="muted small" style={{ padding: 12 }}>No runs yet.</div>}
              {runs.map((r) => <div key={r.id} className={`layer ${current?.id === r.id ? 'on' : ''}`} onClick={() => openRun(r.id)}>
                <div style={{ flex: 1 }}><div className="row gap-sm"><b className="small">#{r.id}</b><Status s={r.status} /></div><div className="tiny muted">{r.patchIds.length} patches · {ago(r.createdAt)}</div></div><Who id={r.startedBy} /></div>)}</div>
          </Card>
        </div>

        <div className="col gap-lg" style={{ minWidth: 0 }}>
          {running && <Card><div className="col"><div className="row between"><div className="row"><I.Loader2 size={18} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)' }} /><b>Verifying in a real browser…</b></div><span className="small muted">{prog?.stage}</span></div>
            <div className="progress"><div style={{ width: `${prog?.progress || 4}%` }} /></div>
            <div className="tiny muted">Loading baseline and candidate side by side, then comparing console output, accessibility, pixels and user flows.</div></div></Card>}

          {!running && !rep && <Card><Empty icon={I.ShieldCheck} title="Ready when you are">Select the patches that make up your release and run verification. You’ll get a pass / warn / fail verdict backed by screenshots and flow traces.</Empty></Card>}

          {!running && rep && rep.stage === 'error' && <Card><Empty icon={I.CircleAlert} title="Verification could not complete">{rep.error}</Empty></Card>}

          {!running && rep && rep.checks && rep.summary && <Results run={current} rep={rep} patches={patches} onRelease={() => { sessionStorage.setItem('pw.selection', JSON.stringify(current.patchIds)); go('/releases'); }} />}
        </div>
      </div>
    </Page>
  );
}

function Results({ run, rep, patches, onRelease }: any) {
  const [aIdx, setAIdx] = useState(0);
  const [view, setView] = useState<'compare' | 'diff'>('compare');
  const verdict = run.status;
  const tone = verdict === 'pass' ? 'var(--good)' : verdict === 'warn' ? 'var(--warn)' : 'var(--bad)';
  const titleOf = (id: string) => patches.find((p: any) => p.id === id)?.title || id;
  const art = rep.artifacts?.[aIdx];
  return <>
    <Card>
      <div className="row between wrap" style={{ gap: 20 }}>
        <div className="row" style={{ gap: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: 18, background: verdict === 'pass' ? 'var(--good-soft)' : verdict === 'warn' ? 'var(--warn-soft)' : 'var(--bad-soft)', color: tone, display: 'grid', placeItems: 'center' }}>{verdict === 'pass' ? <I.ShieldCheck size={28} /> : verdict === 'warn' ? <I.ShieldAlert size={28} /> : <I.ShieldX size={28} />}</div>
          <div><h2 style={{ fontSize: 26 }}>{verdict === 'pass' ? 'Safe to release' : verdict === 'warn' ? 'Releasable with warnings' : 'Blocked — do not release'}</h2>
            <div className="small muted">Run #{run.id} · {run.patchIds.length} patches vs {rep.baseline} · {(rep.durationMs / 1000).toFixed(1)}s · {ago(run.createdAt)}</div></div></div>
        <div className="row" style={{ gap: 22 }}>{(['pass', 'warn', 'fail'] as const).map((k) => <div key={k} className="center"><div style={{ fontFamily: 'var(--serif)', fontSize: 30, fontWeight: 600, color: k === 'pass' ? 'var(--good)' : k === 'warn' ? 'var(--warn)' : 'var(--bad)' }}>{rep.summary[k]}</div><div className="tiny muted">{k === 'pass' ? 'passed' : k === 'warn' ? 'warnings' : 'failed'}</div></div>)}</div>
      </div>
      <div className="row" style={{ marginTop: 16 }}>
        {verdict !== 'fail' ? <Btn variant="primary" icon={I.Rocket} onClick={onRelease}>Continue to release</Btn> : <span className="small" style={{ color: 'var(--bad)' }}>Fix the failing checks below, then re-run. Admins can override from the Releases screen with a recorded reason.</span>}
        {rep.flows?.some((f: any) => !f.baseline.ok && f.candidate.ok) && <span className="badge good"><I.Sparkles size={12} />Fixes a broken user flow</span>}
        {rep.a11y?.fixed?.length > 0 && <span className="badge good"><I.Accessibility size={12} />Fixes {new Set(rep.a11y.fixed.map((x: any) => x.id)).size} accessibility issue(s)</span>}
      </div>
    </Card>

    <div className="grid g2" style={{ alignItems: 'start' }}>
      <Card title="Checks" icon={I.ListChecks} pad={false}>
        <div style={{ maxHeight: 560, overflow: 'auto' }}>
          {GROUPS.map((g) => {
            const items = rep.checks.filter((c: any) => g.match(c.id)); if (!items.length) return null;
            return <div key={g.id}><div className="row" style={{ padding: '12px 16px 6px' }}><g.icon size={14} className="muted" /><span className="eyebrow">{g.label}</span></div>
              {items.map((c: any) => <div key={c.id} className="check"><div className={`ico ${c.status}`}>{c.status === 'pass' ? <I.Check size={13} /> : c.status === 'warn' ? <I.Minus size={13} /> : <I.X size={13} />}</div>
                <div style={{ minWidth: 0 }}><div className="bold small">{c.name}</div><div className="small muted" style={{ wordBreak: 'break-word' }}>{c.detail}</div></div></div>)}</div>;
          })}
        </div>
      </Card>

      <div className="col gap-lg" style={{ minWidth: 0 }}>
        <Card title="Patch tracking" icon={I.Crosshair} pad={false}>
          <div style={{ padding: '4px 16px 12px' }}>{rep.patches.map((p: any) => <div key={p.id} className="row between" style={{ padding: '9px 0', borderBottom: '1px solid var(--line)' }}><span className="small bold trunc" style={{ maxWidth: 230 }}>{p.title}</span>{p.state ? <div className="row gap-sm"><Status s={p.state.status} /><span className="small muted">{Math.round((p.state.confidence || 0) * 100)}%</span></div> : <span className="muted small">not exercised</span>}</div>)}</div>
        </Card>
        {rep.flows?.length > 0 && rep.flows.map((f: any) => <Card key={f.id} title={f.name} icon={I.Route} sub="Baseline vs. candidate, step by step">
          <div className="grid g2">{(['baseline', 'candidate'] as const).map((k) => <div key={k}><div className="eyebrow" style={{ marginBottom: 6 }}>{k === 'baseline' ? 'Before (live)' : 'After (your patches)'}</div>
            {f[k].steps.map((s: any, i: number) => <div key={i} className="row small" style={{ padding: '3px 0', color: s.ok ? 'var(--ink-2)' : 'var(--bad)' }}>{s.ok ? <I.CircleCheck size={13} style={{ color: 'var(--good)' }} /> : <I.CircleX size={13} />}<span>{s.label}</span></div>)}
            {!f[k].ok && <div className="tiny" style={{ color: 'var(--bad)', marginTop: 4 }}>{f[k].error}</div>}</div>)}</div>
        </Card>)}
      </div>
    </div>

    {rep.artifacts?.length > 0 && art && <Card title="Visual evidence" icon={I.ScanEye} action={<div className="row"><Seg value={view} onChange={setView} options={[{ v: 'compare', label: 'Before / after' }, { v: 'diff', label: 'Diff map' }]} /></div>}>
      <div className="row wrap gap-sm" style={{ marginBottom: 14 }}>{rep.artifacts.map((a: any, i: number) => <Btn key={i} size="sm" className={aIdx === i ? 'active' : ''} onClick={() => setAIdx(i)} icon={a.viewport === 'mobile' ? I.Smartphone : I.Monitor}>{a.page} {a.viewport === 'mobile' ? '· mobile' : ''}</Btn>)}</div>
      <div className="row small muted" style={{ marginBottom: 10 }}><span>{(art.ratio * 100).toFixed(2)}% of pixels changed · {(art.unexpected * 100).toFixed(2)}% outside patched regions</span></div>
      <div style={{ maxWidth: art.viewport === 'mobile' ? 360 : '100%', margin: '0 auto' }}>
        {view === 'compare' ? <Compare before={art.before} after={art.after} /> : <div className="shot"><img src={art.diff} alt="diff" /></div>}
      </div>
      {view === 'diff' && <div className="row small muted" style={{ marginTop: 10 }}><span className="badge" style={{ background: '#6366f1', color: '#fff' }}>indigo</span> expected change inside a patched element <span className="badge bad">red</span> unexpected change</div>}
    </Card>}
  </>;
}

function Compare({ before, after }: { before: string; after: string }) {
  const [pos, setPos] = useState(50); const box = useRef<HTMLDivElement>(null); const [w, setW] = useState(0);
  useEffect(() => { const el = box.current; if (!el) return; const ro = new ResizeObserver(() => setW(el.clientWidth)); ro.observe(el); setW(el.clientWidth); return () => ro.disconnect(); }, []);
  const move = (e: React.PointerEvent) => { const r = box.current!.getBoundingClientRect(); setPos(Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100))); };
  return <div>
    <div className="row between tiny muted" style={{ marginBottom: 6 }}><span>◀ Before (live)</span><span>After (with patches) ▶</span></div>
    <div ref={box} className="compare" style={{ cursor: 'ew-resize', touchAction: 'none' }} onPointerDown={(e) => { (e.target as Element).setPointerCapture?.(e.pointerId); move(e); }} onPointerMove={(e) => e.buttons && move(e)}>
      <img src={after} alt="after" draggable={false} />
      <div className="top" style={{ width: `${pos}%` }}><img src={before} alt="before" draggable={false} style={{ width: w || undefined }} /></div>
      <div className="bar" style={{ left: `${pos}%` }} />
    </div></div>;
}
