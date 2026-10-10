import { useEffect, useState } from 'react';
import { api, ago } from '../api';
import { useApp } from '../ctx';
import { Btn, Card, Conf, Empty, I, Page, Status, Switch, useAsync } from '../ui';

const SIGNALS = [
  ['Text', 30, 'What the element says'], ['Attributes', 15, 'aria-label, type, name, href…'], ['Structure', 10, 'The chain of parents around it'], ['Tag / role', 10, 'button ≈ link ≈ role=button'],
  ['Context', 8, 'Nearby headings & labels'], ['Classes', 5, 'Ignoring generated names'], ['Siblings', 5, 'What sits before and after'], ['Position', 4, 'Where it renders'], ['id / test-id', 20, 'Strong when equal, ignored when changed'], ['Old selector', 3, 'Still matches? bonus']
];

export default function Tracking() {
  const { siteId, data, can, refresh, subscribe, go, toast } = useApp();
  const { busy, run } = useAsync();
  const [drift, setDrift] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ stage: string; message?: string } | null>(null);
  const cfg = data?.site?.config || {};

  const load = () => { api(`/sites/${siteId}/drift`).then(setDrift); api(`/sites/${siteId}/events`).then(setEvents); };
  useEffect(load, [siteId, data?.active?.id]); // eslint-disable-line
  useEffect(() => subscribe((e) => {
    if (e.type === 'drift') { setBanner(['done', 'healed', 'blocked', 'error'].includes(e.stage) ? (e.stage === 'done' ? null : { stage: e.stage, message: e.message }) : { stage: e.stage, message: e.message }); load(); if (['healed', 'blocked'].includes(e.stage)) setTimeout(() => setBanner(null), 5000); }
    if (e.type === 'telemetry') load();
  }), [subscribe]); // eslint-disable-line

  const rep = drift?.latest?.report; const rows: any[] = rep?.rows || [];
  const saveCfg = (patch: any) => run('cfg', async () => { await api(`/sites/${siteId}/config`, 'PUT', patch); await refresh(); });

  return (
    <Page title="Element tracking" sub="How PATCHWORK keeps patches attached to the right element when the site changes underneath them"
      actions={<><Btn icon={I.Radar} loading={busy === 'run'} disabled={!data?.active} onClick={() => run('run', async () => { await api(`/sites/${siteId}/drift/run`, 'POST'); load(); }, 'Drift check complete')}>Run drift check</Btn>
        <Btn variant="primary" icon={I.Wand} disabled={!data?.active || !can('reviewer')} loading={busy === 'heal'} onClick={() => run('heal', () => api(`/sites/${siteId}/drift/heal`, 'POST'))}>Re-anchor & release</Btn></>}>
      <div className="col gap-lg">
        {banner && <div className="row" style={{ background: banner.stage === 'blocked' || banner.stage === 'error' ? 'var(--bad-soft)' : 'var(--accent-soft)', border: '1px solid var(--accent-line)', borderRadius: 14, padding: '12px 16px' }}>
          {['healed', 'blocked', 'error'].includes(banner.stage) ? <I.Info size={16} /> : <I.Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}<b className="small">{banner.message || banner.stage}</b></div>}

        {!data?.active ? <Card><Empty icon={I.Crosshair} title="Nothing to track yet">Deploy a release first — tracking watches the patches that are live.</Empty></Card> : <>
          <div className="grid g4">
            {[['exact', 'Exact match', 'Found right where it was left'], ['healed', 'Self-healed', 'Moved or renamed — re-located confidently'], ['review', 'Needs review', 'Several plausible candidates'], ['orphaned', 'Lost', 'No credible match on the page']].map(([k, l, d]) => {
              const key = k === 'review' ? 'review' : k; const n = rep?.summary?.[key] || 0;
              return <Card key={k} pad={false} className="stat"><div className="v" style={{ color: k === 'orphaned' && n ? 'var(--bad)' : k === 'review' && n ? 'var(--warn)' : k === 'healed' && n ? 'var(--accent-ink)' : undefined }}>{rep ? n : '—'}</div><div className="l"><b>{l}</b><br />{d}</div></Card>;
            })}
          </div>

          {rep?.siteChanged && <div className="row" style={{ background: 'var(--warn-soft)', color: 'var(--warn)', padding: '12px 16px', borderRadius: 14 }}><I.TriangleAlert size={16} /><span className="small"><b>The site’s structure changed since the previous check.</b> {rep.summary.healed ? `${rep.summary.healed} patch(es) were re-located automatically — click “Re-anchor & release” to make the new locations permanent.` : ''}</span></div>}

          <Card title="Patch health" icon={I.Crosshair} sub={drift?.latest ? `Last checked ${ago(drift.latest.createdAt)} · opens the original site in a real browser and asks the tracker where each patch’s target is now` : 'Run a drift check to see results'} pad={false}>
            {!rows.length ? <Empty icon={I.Radar} title="No drift check yet">Click “Run drift check” — try it after using Demo controls to redeploy ShopLite as v2.</Empty> :
              <table className="tbl"><thead><tr><th>Patch</th><th>Status</th><th>Confidence</th><th>Matched on</th><th>Changed</th><th /></tr></thead><tbody>
                {rows.map((r) => <>
                  <tr key={r.patchId} style={{ cursor: 'pointer' }} onClick={() => setOpen(open === r.patchId ? null : r.patchId)}>
                    <td><div className="bold">{r.title}</div><div className="tiny muted mono">{r.page}</div></td><td><Status s={r.status === 'review' ? 'review_t' : r.status} /></td><td><Conf v={r.confidence} /></td>
                    <td><div className="row wrap gap-sm">{(r.matchedOn || []).map((m: string) => <span key={m} className="badge good">{m}</span>)}</div></td>
                    <td><div className="row wrap gap-sm">{(r.changed || []).map((m: string) => <span key={m} className="badge warn">{m}</span>)}</div></td>
                    <td>{open === r.patchId ? <I.ChevronUp size={15} className="muted" /> : <I.ChevronDown size={15} className="muted" />}</td></tr>
                  {open === r.patchId && <tr key={r.patchId + 'd'}><td colSpan={6} style={{ background: 'var(--surface-2)' }}>
                    <div className="grid g2"><div><div className="eyebrow" style={{ marginBottom: 6 }}>When the patch was made</div><div className="diffcell a">{r.oldSelector}<div className="tiny" style={{ marginTop: 4 }}>“{r.oldText}”</div></div></div>
                      <div><div className="eyebrow" style={{ marginBottom: 6 }}>Where it is now</div><div className="diffcell b">{r.newSelector || 'not found'}<div className="tiny" style={{ marginTop: 4 }}>“{r.newText}”</div></div></div></div>
                    {r.candidates?.length > 0 && <div className="small muted" style={{ marginTop: 10 }}>Top candidates: {r.candidates.map((c: any, i: number) => <span key={i} className="badge outline" style={{ marginRight: 6 }}>{c.tag} “{c.text}” · {Math.round(c.score * 100)}%</span>)}</div>}
                  </td></tr>}
                </>)}
              </tbody></table>}
          </Card>
        </>}

        <div className="grid g2" style={{ alignItems: 'start' }}>
          <Card title="Autopilot" icon={I.Bot} sub="Let PATCHWORK watch the site for you">
            <div className="col">
              <div className="row between"><div><div className="bold small">Watch for changes</div><div className="tiny muted">Re-check every 30 seconds while a release is live</div></div><Switch on={!!cfg.driftWatchSec} onChange={(v) => can('admin') ? saveCfg({ driftWatchSec: v ? 30 : 0 }) : toast('Admins only', 'bad')} /></div>
              <div className="row between"><div><div className="bold small">Auto-heal</div><div className="tiny muted">When patches moved: re-anchor, verify and release a new version automatically</div></div><Switch on={!!cfg.autoHeal} onChange={(v) => can('admin') ? saveCfg({ autoHeal: v }) : toast('Admins only', 'bad')} /></div>
              <div className="tiny muted">Auto-heal only ships when verification passes — otherwise it stops and tells you.</div>
            </div>
          </Card>
          <Card title="How the tracker decides" icon={I.Brain} sub="Every candidate element is scored on weighted signals">
            <div className="col" style={{ gap: 6 }}>{SIGNALS.map(([n, w, d]: any) => <div key={n} className="row small"><span style={{ width: 96 }} className="bold">{n}</span><div className="progress" style={{ width: 90 }}><div style={{ width: `${Math.min(100, w * 3)}%` }} /></div><span className="muted tiny">{d}</span></div>)}
              <div className="tiny muted" style={{ marginTop: 6 }}>≥ {Math.round((cfg.thresholds?.healed || .7) * 100)}% → applied (self-healed) · {Math.round((cfg.thresholds?.review || .5) * 100)}–{Math.round((cfg.thresholds?.healed || .7) * 100)}% → held back for review · below → lost. A clear winner over the runner-up raises confidence.</div></div>
          </Card>
        </div>

        <Card title="Live telemetry" icon={I.Activity} sub="Reported by real visitors’ browsers" pad={false}>
          {events.length === 0 ? <div className="muted small" style={{ padding: 20 }}>No events yet. Use “Simulate traffic” on the Overview, or just browse the live site.</div> :
            <table className="tbl"><tbody>{events.slice(0, 12).map((e) => <tr key={e.id}><td style={{ width: 120 }}><span className={`badge ${e.type === 'error' || e.type === 'js_error' ? 'bad' : e.type === 'orphan' ? 'warn' : 'accent'}`}>{e.type}</span></td><td className="small">{e.payload?.message || (e.payload?.status ? `${e.payload.status}${e.payload.confidence ? ' · ' + Math.round(e.payload.confidence * 100) + '%' : ''}` : '')} <span className="muted mono tiny">{e.payload?.path}</span></td><td className="muted small" style={{ width: 100 }}>{ago(e.ts)}</td></tr>)}</tbody></table>}
        </Card>
      </div>
    </Page>
  );
}
