import { useEffect, useMemo, useState } from 'react';
import { api, ago } from '../api';
import { useApp } from '../ctx';
import { Btn, Card, Conf, Confirm, Empty, I, Page, Status, useAsync, Who } from '../ui';
import { AuditIcon } from '../auditMeta';

function Kpi({ icon: Icon, label, value, sub, tone, onClick }: any) {
  return (
    <div className={`kpi ${onClick ? 'clickable' : ''}`} onClick={onClick}>
      <div className={`kpi-ico ${tone || ''}`}><Icon size={22} /></div>
      <div style={{ minWidth: 0 }}>
        <div className="kpi-label">{label}</div>
        <div className={`kpi-value ${tone || ''}`}>{value}</div>
        <div className="kpi-sub trunc">{sub}</div>
      </div>
    </div>
  );
}

/** Collapse runs of the same noisy event (e.g. dozens of automatic drift checks) into one line. */
function groupFeed(rows: any[]) {
  const out: { key: number; type: string; text: string; ts: number; count: number }[] = [];
  for (const r of rows) {
    const last = out[out.length - 1];
    if (last && r.type === 'drift.checked' && last.type === 'drift.checked') { last.count++; continue; }
    out.push({ key: r.seq, type: r.type, text: r.summary, ts: r.ts, count: 1 });
  }
  return out;
}

export default function Overview() {
  const { data, patches, releases, go, siteId, user, can, refresh, subscribe } = useApp();
  const { busy, run } = useAsync();
  const [audit, setAudit] = useState<any[]>([]);
  const [drift, setDrift] = useState<any>(null);
  const [demoVer, setDemoVer] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const load = () => {
    Promise.all([api(`/audit?siteId=${siteId}&limit=30&exclude=drift.`), api(`/audit?siteId=${siteId}&limit=1&type=drift.`)])
      .then(([events, drifts]) => setAudit([...events, ...drifts].sort((a, b) => b.seq - a.seq))).catch(() => {});
    api(`/sites/${siteId}/drift`).then(setDrift).catch(() => {});
    api('/demo/version').then((v) => setDemoVer(v.version)).catch(() => {});
  };
  useEffect(load, [data?.active?.id, patches.length, releases.length]); // eslint-disable-line
  useEffect(() => subscribe((e) => { if (['audit', 'drift', 'site'].includes(e.type)) load(); }), [subscribe]); // eslint-disable-line
  const feed = useMemo(() => groupFeed(audit).slice(0, 5), [audit]);

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
      actions={<Btn icon={I.ExternalLink} onClick={() => window.open(`http://${siteId}.localhost:${data.proxyPort}/`, '_blank')}>Open live site</Btn>}>
      <div className="dash">
        {/* welcome strip */}
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

        {/* at-a-glance numbers */}
        <div className="dash-kpis">
          <Kpi icon={I.Rocket} label="Live patches" value={c.live || 0} sub={`${c.live || 0} of ${patches.length} in production`} onClick={() => go('/patches')} />
          <Kpi icon={I.Eye} label="Awaiting review" value={c.review || 0} sub={`${c.draft || 0} drafts · ${c.approved || 0} approved`} tone={c.review ? 'warn' : ''} onClick={() => go('/patches')} />
          <Kpi icon={I.Package} label="Release" value={active ? `v${active.version}` : '—'} sub={canary ? `canary v${canary.version} @ ${data.site.canaryPct}%` : active ? `deployed ${ago(active.deployedAt)}` : 'nothing deployed'} onClick={() => go('/releases')} />
          <Kpi icon={I.HeartPulse} label="Health" value={!active ? '—' : degraded ? 'Degraded' : 'Healthy'} sub={h ? `${h.errors} errors · ${h.healed} self-heals` : 'no release deployed'} tone={!active ? '' : degraded ? 'bad' : 'good'} />
        </div>

        <div className="dash-grid">
          {/* 1 — pipeline, full width */}
          <Card className="span2" title="Patch pipeline" icon={I.Workflow} sub="Every change moves through the same safe path">
            <div className="pipe">
              {stages.map((s, i) => (
                <div key={s.k} className="pipe-wrap">
                  <div className={`pipe-stage ${s.k === 'live' ? 'live' : ''}`} onClick={() => go('/patches')}>
                    <div className="pipe-top"><s.i size={17} /><span>{s.l}</span></div>
                    <div className="pipe-n">{c[s.k] || 0}</div>
                    <div className="pipe-bar"><i style={{ width: `${((c[s.k] || 0) / total) * 100}%` }} /></div>
                  </div>
                  {i < stages.length - 1 && <I.ChevronRight size={20} className="muted pipe-arrow" />}
                </div>
              ))}
            </div>
            {(c.rejected || c.reverted) ? <div className="muted" style={{ marginTop: 14 }}>{c.rejected ? `${c.rejected} rejected` : ''}{c.rejected && c.reverted ? ' · ' : ''}{c.reverted ? `${c.reverted} reverted by rollback` : ''}</div> : null}
          </Card>

          {/* 2 — health | tracking */}
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
              {data.site.config.autoRollback && <div className="note"><I.ShieldCheck size={16} /> Auto-rollback is armed — a release that throws errors or fails its smoke test is reverted automatically.</div>}
            </>}
          </Card>

          <Card title="Element tracking" icon={I.Crosshair} sub="Are live patches still attached to the right elements?"
            action={<Btn size="sm" icon={I.Radar} loading={busy === 'drift'} disabled={!active} onClick={() => run('drift', async () => { await api(`/sites/${siteId}/drift/run`, 'POST'); load(); }, 'Drift check complete')}>Run drift check</Btn>}>
            {!dsum ? <div className="muted">No drift check yet. Run one to see whether the site has changed under your patches.</div> : <>
              <div className="chips">
                <span className="chip"><Status s="exact" dot={false} /><b>{dsum.exact || 0}</b></span>
                <span className="chip"><Status s="healed" dot={false} /><b>{dsum.healed || 0}</b></span>
                <span className="chip"><Status s="review_t" dot={false} /><b>{dsum.review || 0}</b></span>
                <span className="chip"><Status s="orphaned" dot={false} /><b>{dsum.orphaned || 0}</b></span>
              </div>
              {rep.siteChanged && <div className="note warn"><I.TriangleAlert size={16} /> Site structure changed since the last check.</div>}
              <div className="track-list">
                {rows.slice(0, 5).map((r) => (
                  <div key={r.patchId} className="track-row"><span className="trunc bold" style={{ flex: 1 }}>{r.title}</span><Status s={r.status === 'review' ? 'review_t' : r.status} dot={false} /><Conf v={r.confidence} /></div>
                ))}
              </div>
              <div className="row between" style={{ marginTop: 12 }}><span className="muted">Checked {ago(drift.latest.createdAt)}</span><Btn size="sm" variant="ghost" icon={I.ArrowRight} onClick={() => go('/tracking')}>Details</Btn></div>
            </>}
          </Card>

          {/* 3 — review queue | demo controls */}
          <Card title="Review queue" icon={I.GitPullRequestDraft} sub="In review, ready to release, and drafts" action={<Btn size="sm" variant="ghost" icon={I.ArrowRight} onClick={() => go('/patches')}>All patches</Btn>}>
            {queue.length === 0 ? <div className="muted">Nothing is waiting. New patches submitted for review show up here.</div> : (
              <div className="track-list" style={{ marginTop: 0 }}>
                {queue.slice(0, 6).map((p) => (
                  <div key={p.id} className="track-row" style={{ cursor: 'pointer' }} onClick={() => go('/patches')}>
                    <Who id={p.author} /><span className="trunc bold" style={{ flex: 1 }}>{p.title}</span><span className="badge outline mono">{p.page}</span><Status s={p.status} dot={false} />
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="Demo controls" icon={I.FlaskConical} sub="Stage the story for judges">
            <div className="row between" style={{ alignItems: 'flex-start', gap: 14 }}>
              <div><div className="bold" style={{ fontSize: 16 }}>ShopLite vendor deploy</div><div className="muted" style={{ marginTop: 3 }}>Pretend the site owner ships a redesign you don’t control.</div></div>
              <span className="badge outline">now {demoVer || '…'}</span>
            </div>
            <div className="row gap-sm wrap" style={{ marginTop: 18 }}>
              <Btn className={demoVer === 'v1' ? 'active' : ''} onClick={() => run('v1', () => api('/demo/redeploy', 'POST', { version: 'v1' }).then((r) => setDemoVer(r.version)), 'ShopLite is back on v1')}>Site v1 (original)</Btn>
              <Btn variant={demoVer === 'v2' ? '' : 'primary'} className={demoVer === 'v2' ? 'active' : ''} icon={I.Rocket} onClick={() => run('v2', () => api('/demo/redeploy', 'POST', { version: 'v2' }).then((r) => setDemoVer(r.version)), 'ShopLite v2 deployed — markup changed under your patches')}>Redeploy as v2</Btn>
              <span className="spacer" />
              <Btn variant="ghost" icon={I.RotateCcw} disabled={!can('admin')} onClick={() => setConfirmReset(true)}>Reset demo data</Btn>
            </div>
          </Card>

          {/* 4 — recent activity, full width at the bottom */}
          <Card className="span2" title="Recent activity" icon={I.Activity} action={<Btn size="sm" variant="ghost" onClick={() => go('/audit')}>View all</Btn>} pad={false}>
            <div className="activity">
              {feed.length === 0 ? <div className="muted" style={{ padding: 20 }}>No activity yet.</div> : feed.map((a) => {
                return (
                  <div key={a.key} className="act-row">
                    <AuditIcon type={a.type} size={36} />
                    <div className="act-text">{a.count > 1 ? <><b>{a.count} automatic drift checks</b> — latest: {a.text.replace(/^Drift check #\d+: /, '')}</> : a.text}</div>
                    <div className="act-time">{ago(a.ts)}</div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
      {confirmReset && <Confirm title="Reset the demo?" danger confirm="Reset everything" body="This wipes all patches, releases, verification runs and the audit trail, then re-seeds the ShopLite demo." onNo={() => setConfirmReset(false)} onYes={async () => { setConfirmReset(false); await run('reset', () => api('/demo/reset', 'POST'), 'Demo reset'); refresh(); load(); }} />}
    </Page>
  );
}
