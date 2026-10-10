import { useEffect, useState } from 'react';
import { api, ago, dateTime } from '../api';
import { useApp } from '../ctx';
import { Avatar, Btn, Card, Conf, Confirm, Empty, I, Page, Status, useAsync, Who } from '../ui';

const AUDIT_ICON: Record<string, any> = {
  'patch.created': I.FilePlus2, 'patch.updated': I.Pencil, 'patch.submitted': I.Send, 'patch.approved': I.CircleCheck, 'patch.rejected': I.CircleX, 'patch.reanchored': I.Crosshair,
  'release.created': I.Package, 'release.deployed': I.Rocket, 'release.canary': I.Bird, 'release.promoted': I.TrendingUp, 'release.rollback': I.Undo2, 'release.auto_rollback': I.ShieldAlert,
  'verify.started': I.Play, 'verify.finished': I.ShieldCheck, 'drift.checked': I.Radar, 'site.redeployed': I.Globe, 'conflict.resolved': I.GitMerge, 'health.smoke_pass': I.HeartPulse, 'health.smoke_fail': I.HeartCrack
};

export default function Overview() {
  const { data, patches, releases, go, siteId, user, can, toast, refresh, subscribe } = useApp();
  const { busy, run } = useAsync();
  const [audit, setAudit] = useState<any[]>([]);
  const [drift, setDrift] = useState<any>(null);
  const [demoVer, setDemoVer] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const load = () => {
    api(`/audit?siteId=${siteId}&limit=9`).then(setAudit).catch(() => {});
    api(`/sites/${siteId}/drift`).then(setDrift).catch(() => {});
    api('/demo/version').then((v) => setDemoVer(v.version)).catch(() => {});
  };
  useEffect(load, [data?.active?.id, patches.length, releases.length]); // eslint-disable-line
  useEffect(() => subscribe((e) => { if (['audit', 'drift', 'site'].includes(e.type)) load(); }), [subscribe]); // eslint-disable-line

  if (!data) return null;
  const c = data.counts || {};
  const active = data.active, canary = data.canary, h = data.health;
  const dsum = drift?.latest?.report?.summary;
  const stages = [{ k: 'draft', l: 'Draft', i: I.Pencil }, { k: 'review', l: 'In review', i: I.Eye }, { k: 'approved', l: 'Approved', i: I.CircleCheck }, { k: 'live', l: 'Live', i: I.Rocket }];
  const degraded = h && h.errors > 0;

  return (
    <Page title="Overview" sub={`${data.site.name} · ${data.site.origin.replace('http://', '')}`}
      actions={<><Btn icon={I.ExternalLink} onClick={() => window.open(`http://${siteId}.localhost:${data.proxyPort}/`, '_blank')}>Open live site</Btn><Btn variant="primary" icon={I.MousePointerClick} onClick={() => go('/editor')}>Open visual editor</Btn></>}>
      <div className="col gap-lg">
        <div className="hero-banner">
          <div className="eyebrow" style={{ color: 'var(--accent-ink)' }}>Welcome back, {user.name.split(' ')[0]}</div>
          <h2 style={{ marginTop: 6 }}>Fix the live site in minutes — without rebuilding a thing.</h2>
          <p className="ink2" style={{ margin: '10px 0 16px', maxWidth: 620 }}>Patches are small, reversible changes layered over {data.site.name}. Each one is reviewed, verified in a real browser, released as a versioned set, and can be rolled back in one click.</p>
          <div className="row wrap">
            <Btn variant="ink" icon={I.MousePointerClick} onClick={() => go('/editor')}>Create a patch</Btn>
            <Btn icon={I.GitPullRequestDraft} onClick={() => go('/patches')}>{c.review ? `Review ${c.review} patch${c.review > 1 ? 'es' : ''}` : 'Browse patches'}</Btn>
            <Btn icon={I.Rocket} onClick={() => go('/releases')}>Releases</Btn>
          </div>
        </div>

        <div className="grid g4">
          <Card pad={false} className="stat"><div className="v">{c.live || 0}</div><div className="l">Patches live in production</div></Card>
          <Card pad={false} className="stat"><div className="v">{c.review || 0}</div><div className="l">Awaiting review</div></Card>
          <Card pad={false} className="stat"><div className="v">{active ? `v${active.version}` : '—'}</div><div className="l">Current release{canary ? ` · canary v${canary.version} @ ${data.site.canaryPct}%` : ''}</div></Card>
          <Card pad={false} className="stat"><div className="v" style={{ color: degraded ? 'var(--bad)' : 'var(--good)' }}>{degraded ? 'Degraded' : 'Healthy'}</div><div className="l">{h ? `${h.errors} errors · ${h.healed} self-heals (last min)` : 'No release deployed'}</div></Card>
        </div>

        <div className="grid g-main">
          <div className="col gap-lg">
            <Card title="Patch pipeline" icon={I.Workflow} sub="Every change moves through the same safe path">
              <div className="row between" style={{ gap: 6 }}>
                {stages.map((s, i) => <div key={s.k} className="row" style={{ flex: 1, gap: 6 }}>
                  <div style={{ flex: 1, padding: '14px 16px', borderRadius: 14, background: s.k === 'live' ? 'var(--accent-soft)' : 'var(--surface-2)', border: '1px solid var(--line)', cursor: 'pointer' }} onClick={() => go('/patches')}>
                    <div className="row gap-sm muted small"><s.i size={14} />{s.l}</div><div style={{ fontFamily: 'var(--serif)', fontSize: 28, fontWeight: 600 }}>{c[s.k] || 0}</div></div>
                  {i < stages.length - 1 && <I.ChevronRight size={16} className="muted" />}
                </div>)}
              </div>
              {(c.rejected || c.reverted) ? <div className="small muted" style={{ marginTop: 12 }}>{c.rejected ? `${c.rejected} rejected` : ''}{c.rejected && c.reverted ? ' · ' : ''}{c.reverted ? `${c.reverted} reverted by rollback` : ''}</div> : null}
            </Card>

            <Card title="Production health" icon={I.HeartPulse} action={<div className="row gap-sm">
              <Btn size="sm" icon={I.Users} loading={busy === 'traffic'} disabled={!active} onClick={() => run('traffic', () => api(`/sites/${siteId}/traffic`, 'POST', { visits: 5 }), 'Simulated 5 visitors')}>Simulate traffic</Btn>
              <Btn size="sm" variant="danger" icon={I.Undo2} disabled={!active || !can('reviewer')} onClick={() => go('/releases')}>Roll back…</Btn></div>}>
              {!active ? <Empty icon={I.Rocket} title="Nothing deployed yet">Build a release from approved patches to take them live.</Empty> : <div className="col">
                <div className="row wrap" style={{ gap: 28 }}>
                  <div><div className="eyebrow">Release</div><div className="row"><b style={{ fontSize: 18 }}>v{active.version}</b><Status s={active.status} /></div><div className="tiny muted">{active.patchIds.length} patches · deployed {ago(active.deployedAt)}</div></div>
                  <div><div className="eyebrow">Patch errors</div><b style={{ fontSize: 18, color: h.errors ? 'var(--bad)' : undefined }}>{h.errors}</b><div className="tiny muted">last 60s · auto-rollback at {data.site.config.errorThreshold}</div></div>
                  <div><div className="eyebrow">Self-heals</div><b style={{ fontSize: 18 }}>{h.healed}</b><div className="tiny muted">elements re-located</div></div>
                  <div><div className="eyebrow">Lost targets</div><b style={{ fontSize: 18, color: h.orphaned ? 'var(--warn)' : undefined }}>{h.orphaned}</b><div className="tiny muted">need attention</div></div>
                </div>
                {data.site.config.autoRollback && <div className="small muted"><I.ShieldCheck size={13} style={{ verticalAlign: -2 }} /> Auto-rollback is armed: if a release starts throwing errors or fails its post-deploy smoke test, PATCHWORK reverts it automatically.</div>}
              </div>}
            </Card>

            <Card title="Element tracking" icon={I.Crosshair} action={<Btn size="sm" icon={I.Radar} loading={busy === 'drift'} onClick={() => run('drift', async () => { await api(`/sites/${siteId}/drift/run`, 'POST'); load(); }, 'Drift check complete')} disabled={!active}>Run drift check</Btn>}
              sub="Are live patches still attached to the right elements?">
              {!dsum ? <div className="muted small">No drift check yet. Run one to see whether the site has changed under your patches.</div> : <div className="row wrap" style={{ gap: 10 }}>
                <Status s="exact" /> <b>{dsum.exact || 0}</b><Status s="healed" /> <b>{dsum.healed || 0}</b><Status s="review_t" /> <b>{dsum.review || 0}</b><Status s="orphaned" /> <b>{dsum.orphaned || 0}</b>
                {drift.latest.report.siteChanged && <span className="badge warn"><I.TriangleAlert size={12} />Site structure changed</span>}
                <span className="spacer" /><Btn size="sm" variant="ghost" onClick={() => go('/tracking')} icon={I.ArrowRight}>Details</Btn></div>}
            </Card>
          </div>

          <div className="col gap-lg">
            <Card title="Recent activity" icon={I.Activity} action={<Btn size="sm" variant="ghost" onClick={() => go('/audit')}>View all</Btn>} pad={false}>
              <div style={{ padding: '6px 20px 14px' }}>{audit.length === 0 ? <div className="muted small" style={{ padding: 14 }}>No activity yet.</div> : audit.map((a) => {
                const Ic = AUDIT_ICON[a.type] || I.Dot;
                return <div key={a.seq} className="row" style={{ padding: '10px 0', borderBottom: '1px solid var(--line)', alignItems: 'flex-start' }}>
                  <div style={{ width: 28, height: 28, borderRadius: 9, background: 'var(--surface-3)', display: 'grid', placeItems: 'center', flexShrink: 0 }}><Ic size={14} className="ink2" /></div>
                  <div style={{ minWidth: 0 }}><div className="small" style={{ lineHeight: 1.35 }}>{a.summary}</div><div className="tiny muted">{ago(a.ts)}</div></div></div>;
              })}</div>
            </Card>

            <Card title="Demo controls" icon={I.FlaskConical} sub="Stage the story for judges" className="hover">
              <div className="col">
                <div className="row between"><div><div className="bold small">ShopLite vendor deploy</div><div className="tiny muted">Pretend the site owner ships a redesign you don’t control</div></div>
                  <span className="badge outline">currently {demoVer || '…'}</span></div>
                <div className="row gap-sm">
                  <Btn size="sm" className={demoVer === 'v1' ? 'active' : ''} onClick={() => run('v1', () => api('/demo/redeploy', 'POST', { version: 'v1' }).then((r) => setDemoVer(r.version)), 'ShopLite is back on v1')}>Site v1 (original)</Btn>
                  <Btn size="sm" variant={demoVer === 'v2' ? '' : 'primary'} className={demoVer === 'v2' ? 'active' : ''} icon={I.Rocket} onClick={() => run('v2', () => api('/demo/redeploy', 'POST', { version: 'v2' }).then((r) => setDemoVer(r.version)), 'ShopLite v2 deployed — markup changed under your patches')}>Redeploy as v2</Btn>
                </div>
                <div className="tiny muted">After v2 ships, open <b>Element tracking</b> and run a drift check, or just reload the live site — your patches re-anchor automatically.</div>
                <div className="divider" style={{ margin: '4px 0' }} />
                <Btn size="sm" variant="ghost" icon={I.RotateCcw} disabled={!can('admin')} onClick={() => setConfirmReset(true)}>Reset demo data</Btn>
              </div>
            </Card>
          </div>
        </div>
      </div>
      {confirmReset && <Confirm title="Reset the demo?" danger confirm="Reset everything" body="This wipes all patches, releases, verification runs and the audit trail, then re-seeds the ShopLite demo." onNo={() => setConfirmReset(false)} onYes={async () => { setConfirmReset(false); await run('reset', () => api('/demo/reset', 'POST'), 'Demo reset'); refresh(); load(); }} />}
    </Page>
  );
}
