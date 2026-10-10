import { useEffect, useState } from 'react';
import { api, ago } from '../api';
import { useApp } from '../ctx';
import { Btn, Card, Conf, Confirm, Empty, I, Page, Status, useAsync, Who } from '../ui';

const AUDIT_ICON: Record<string, any> = {
  'patch.created': I.FilePlus2, 'patch.updated': I.Pencil, 'patch.submitted': I.Send, 'patch.approved': I.CircleCheck, 'patch.rejected': I.CircleX, 'patch.reanchored': I.Crosshair,
  'release.created': I.Package, 'release.deployed': I.Rocket, 'release.canary': I.Bird, 'release.promoted': I.TrendingUp, 'release.rollback': I.Undo2, 'release.auto_rollback': I.ShieldAlert,
  'verify.started': I.Play, 'verify.finished': I.ShieldCheck, 'drift.checked': I.Radar, 'site.redeployed': I.Globe, 'conflict.resolved': I.GitMerge, 'health.smoke_pass': I.HeartPulse, 'health.smoke_fail': I.HeartCrack
};

function Kpi({ icon: Icon, label, value, sub, tone, onClick }: any) {
  return (
    <div className={`kpi ${onClick ? 'clickable' : ''}`} onClick={onClick}>
      <div className={`kpi-ico ${tone || ''}`}><Icon size={20} /></div>
      <div style={{ minWidth: 0 }}>
        <div className="kpi-label">{label}</div>
        <div className={`kpi-value ${tone || ''}`}>{value}</div>
        <div className="kpi-sub trunc">{sub}</div>
      </div>
    </div>
  );
}

export default function Overview() {
  const { data, patches, releases, go, siteId, user, can, refresh, subscribe } = useApp();
  const { busy, run } = useAsync();
  const [audit, setAudit] = useState<any[]>([]);
  const [drift, setDrift] = useState<any>(null);
  const [demoVer, setDemoVer] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const load = () => {
    api(`/audit?siteId=${siteId}&limit=14`).then(setAudit).catch(() => {});
    api(`/sites/${siteId}/drift`).then(setDrift).catch(() => {});
    api('/demo/version').then((v) => setDemoVer(v.version)).catch(() => {});
  };
  useEffect(load, [data?.active?.id, patches.length, releases.length]); // eslint-disable-line
  useEffect(() => subscribe((e) => { if (['audit', 'drift', 'site'].includes(e.type)) load(); }), [subscribe]); // eslint-disable-line

  if (!data) return null;
  const c = data.counts || {};
  const active = data.active, canary = data.canary, h = data.health;
  const rep = drift?.latest?.report, dsum = rep?.summary, rows: any[] = rep?.rows || [];
  const stages = [{ k: 'draft', l: 'Draft', i: I.Pencil }, { k: 'review', l: 'In review', i: I.Eye }, { k: 'approved', l: 'Approved', i: I.CircleCheck }, { k: 'live', l: 'Live', i: I.Rocket }];
  const degraded = h && h.errors > 0;
  const total = patches.length || 1;
  const queue = [...patches.filter((p) => p.status === 'review'), ...patches.filter((p) => p.status === 'approved'), ...patches.filter((p) => p.status === 'draft')];

  return (
    <Page wide title="Overview" sub={`${data.site.name} · ${data.site.origin.replace('http://', '')}`}
      actions={<><Btn icon={I.ExternalLink} onClick={() => window.open(`http://${siteId}.localhost:${data.proxyPort}/`, '_blank')}>Open live site</Btn></>}>
      <div className="dash">
        {/* slim welcome strip */}
        <div className="strip">
          <div style={{ minWidth: 0 }}>
            <div className="strip-title">Welcome back, {user.name.split(' ')[0]}</div>
            <div className="strip-sub">Patches are small, reversible changes layered over {data.site.name}: reviewed, verified in a real browser, released as a versioned set, and rolled back in one click.</div>
          </div>
          <span className="spacer" />
          <div className="row wrap" style={{ justifyContent: 'flex-end' }}>
            <Btn variant="primary" icon={I.MousePointerClick} onClick={() => go('/editor')}>Create a patch</Btn>
            <Btn icon={I.GitPullRequestDraft} onClick={() => go('/patches')}>{c.review ? `Review ${c.review}` : 'Patches'}</Btn>
            <Btn icon={I.Rocket} onClick={() => go('/releases')}>Releases</Btn>
          </div>
        </div>

        {/* KPIs */}
        <div className="dash-kpis">
          <Kpi icon={I.Rocket} label="Live in production" value={c.live || 0} sub={`${c.live || 0} of ${patches.length} patches`} onClick={() => go('/patches')} />
          <Kpi icon={I.Eye} label="Awaiting review" value={c.review || 0} sub={`${c.draft || 0} drafts · ${c.approved || 0} approved`} tone={c.review ? 'warn' : ''} onClick={() => go('/patches')} />
          <Kpi icon={I.Package} label="Current release" value={active ? `v${active.version}` : '—'} sub={canary ? `canary v${canary.version} @ ${data.site.canaryPct}%` : active ? `deployed ${ago(active.deployedAt)}` : 'nothing deployed'} onClick={() => go('/releases')} />
          <Kpi icon={I.HeartPulse} label="Production health" value={!active ? '—' : degraded ? 'Degraded' : 'Healthy'} sub={h ? `${h.errors} errors · ${h.healed} self-heals · last min` : 'no release deployed'} tone={!active ? '' : degraded ? 'bad' : 'good'} />
        </div>

        <div className="dash-main">
          {/* column A: pipeline + health */}
          <div className="dash-col">
            <Card title="Patch pipeline" icon={I.Workflow} sub="Every change moves through the same safe path">
              <div className="pipe">
                {stages.map((s, i) => (
                  <div key={s.k} className="pipe-wrap">
                    <div className={`pipe-stage ${s.k === 'live' ? 'live' : ''}`} onClick={() => go('/patches')}>
                      <div className="pipe-top"><s.i size={15} /><span>{s.l}</span></div>
                      <div className="pipe-n">{c[s.k] || 0}</div>
                      <div className="pipe-bar"><i style={{ width: `${((c[s.k] || 0) / total) * 100}%` }} /></div>
                    </div>
                    {i < stages.length - 1 && <I.ChevronRight size={16} className="muted pipe-arrow" />}
                  </div>
                ))}
              </div>
              {(c.rejected || c.reverted) ? <div className="small muted" style={{ marginTop: 12 }}>{c.rejected ? `${c.rejected} rejected` : ''}{c.rejected && c.reverted ? ' · ' : ''}{c.reverted ? `${c.reverted} reverted by rollback` : ''}</div> : null}
            </Card>

            <Card title="Production health" icon={I.HeartPulse}
              action={<div className="row gap-sm"><Btn size="sm" icon={I.Users} loading={busy === 'traffic'} disabled={!active} onClick={() => run('traffic', () => api(`/sites/${siteId}/traffic`, 'POST', { visits: 5 }), 'Simulated 5 visitors')}>Simulate traffic</Btn>
                <Btn size="sm" variant="danger" icon={I.Undo2} disabled={!active || !can('reviewer')} onClick={() => go('/releases')}>Roll back…</Btn></div>}>
              {!active ? <Empty icon={I.Rocket} title="Nothing deployed yet">Build a release from approved patches to take them live.</Empty> : <>
                <div className="metrics">
                  <div className="metric"><div className="eyebrow">Release</div><div className="metric-v">v{active.version} <Status s={active.status} /></div><div className="metric-s">{active.patchIds.length} patches · {ago(active.deployedAt)}</div></div>
                  <div className="metric"><div className="eyebrow">Patch errors</div><div className="metric-v" style={{ color: h.errors ? 'var(--bad)' : undefined }}>{h.errors}</div><div className="metric-s">last 60s · rollback at {data.site.config.errorThreshold}</div></div>
                  <div className="metric"><div className="eyebrow">Self-heals</div><div className="metric-v">{h.healed}</div><div className="metric-s">elements re-located</div></div>
                  <div className="metric"><div className="eyebrow">Lost targets</div><div className="metric-v" style={{ color: h.orphaned ? 'var(--warn)' : undefined }}>{h.orphaned}</div><div className="metric-s">need attention</div></div>
                </div>
                {data.site.config.autoRollback && <div className="note"><I.ShieldCheck size={14} /> Auto-rollback is armed — a release that throws errors or fails its smoke test is reverted automatically.</div>}
              </>}
            </Card>

            <Card title="Demo controls" icon={I.FlaskConical} sub="Stage the story for judges">
              <div className="row between" style={{ alignItems: 'flex-start', gap: 14 }}>
                <div><div className="bold">ShopLite vendor deploy</div><div className="small muted" style={{ marginTop: 2 }}>Pretend the site owner ships a redesign you don’t control.</div></div>
                <span className="badge outline">now {demoVer || '…'}</span>
              </div>
              <div className="row gap-sm wrap" style={{ marginTop: 12 }}>
                <Btn size="sm" className={demoVer === 'v1' ? 'active' : ''} onClick={() => run('v1', () => api('/demo/redeploy', 'POST', { version: 'v1' }).then((r) => setDemoVer(r.version)), 'ShopLite is back on v1')}>Site v1 (original)</Btn>
                <Btn size="sm" variant={demoVer === 'v2' ? '' : 'primary'} className={demoVer === 'v2' ? 'active' : ''} icon={I.Rocket} onClick={() => run('v2', () => api('/demo/redeploy', 'POST', { version: 'v2' }).then((r) => setDemoVer(r.version)), 'ShopLite v2 deployed — markup changed under your patches')}>Redeploy as v2</Btn>
                <span className="spacer" />
                <Btn size="sm" variant="ghost" icon={I.RotateCcw} disabled={!can('admin')} onClick={() => setConfirmReset(true)}>Reset demo data</Btn>
              </div>
            </Card>
          </div>

          {/* column B: tracking + demo controls */}
          <div className="dash-col">
            <Card title="Element tracking" icon={I.Crosshair} sub="Are live patches still attached to the right elements?"
              action={<Btn size="sm" icon={I.Radar} loading={busy === 'drift'} disabled={!active} onClick={() => run('drift', async () => { await api(`/sites/${siteId}/drift/run`, 'POST'); load(); }, 'Drift check complete')}>Run drift check</Btn>}>
              {!dsum ? <div className="muted">No drift check yet. Run one to see whether the site has changed under your patches.</div> : <>
                <div className="chips">
                  <span className="chip"><Status s="exact" dot={false} /><b>{dsum.exact || 0}</b></span>
                  <span className="chip"><Status s="healed" dot={false} /><b>{dsum.healed || 0}</b></span>
                  <span className="chip"><Status s="review_t" dot={false} /><b>{dsum.review || 0}</b></span>
                  <span className="chip"><Status s="orphaned" dot={false} /><b>{dsum.orphaned || 0}</b></span>
                </div>
                {rep.siteChanged && <div className="note warn"><I.TriangleAlert size={14} /> Site structure changed since the last check.</div>}
                <div className="track-list">
                  {rows.slice(0, 5).map((r) => (
                    <div key={r.patchId} className="track-row"><span className="trunc bold" style={{ flex: 1 }}>{r.title}</span><Status s={r.status === 'review' ? 'review_t' : r.status} dot={false} /><Conf v={r.confidence} /></div>
                  ))}
                </div>
                <div className="row between" style={{ marginTop: 10 }}><span className="tiny muted">Checked {ago(drift.latest.createdAt)}</span><Btn size="sm" variant="ghost" icon={I.ArrowRight} onClick={() => go('/tracking')}>Details</Btn></div>
              </>}
            </Card>

            <Card title="Review queue" icon={I.GitPullRequestDraft} sub="In review, ready to release, and drafts" action={<Btn size="sm" variant="ghost" icon={I.ArrowRight} onClick={() => go('/patches')}>All patches</Btn>} className="grow">
              {queue.length === 0 ? <div className="muted">Nothing is waiting. New patches submitted for review show up here.</div> : (
                <div className="track-list" style={{ marginTop: 0 }}>
                  {queue.slice(0, 7).map((p) => (
                    <div key={p.id} className="track-row" style={{ cursor: 'pointer' }} onClick={() => go('/patches')}>
                      <Who id={p.author} /><span className="trunc bold" style={{ flex: 1 }}>{p.title}</span><span className="badge outline mono">{p.page}</span><Status s={p.status} dot={false} />
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* column C: activity */}
          <div className="dash-col col-c">
            <Card title="Recent activity" icon={I.Activity} action={<Btn size="sm" variant="ghost" onClick={() => go('/audit')}>View all</Btn>} pad={false}>
              <div className="activity">
                {audit.length === 0 ? <div className="muted" style={{ padding: 16 }}>No activity yet.</div> : audit.map((a) => {
                  const Ic = AUDIT_ICON[a.type] || I.Dot;
                  return (
                    <div key={a.seq} className="act-row">
                      <div className="act-ico"><Ic size={15} /></div>
                      <div style={{ minWidth: 0, flex: 1 }}><div className="act-text">{a.summary}</div></div>
                      <div className="act-time">{ago(a.ts)}</div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
      </div>
      {confirmReset && <Confirm title="Reset the demo?" danger confirm="Reset everything" body="This wipes all patches, releases, verification runs and the audit trail, then re-seeds the ShopLite demo." onNo={() => setConfirmReset(false)} onYes={async () => { setConfirmReset(false); await run('reset', () => api('/demo/reset', 'POST'), 'Demo reset'); refresh(); load(); }} />}
    </Page>
  );
}
