import { useEffect, useState } from 'react';
import { api } from '../api';
import { useApp } from '../ctx';
import { Btn, Card, Field, I, Page, Status, Switch, useAsync } from '../ui';

export default function Settings() {
  const { data, siteId, can, refresh, users, aiStatus, toast } = useApp();
  const { busy, run } = useAsync();
  const cfg = data?.site?.config;
  const [f, setF] = useState<any>(null);
  const [flows, setFlows] = useState(''); const [flowErr, setFlowErr] = useState('');
  useEffect(() => { if (cfg && !f) { setF({ ...cfg, thresholds: { ...cfg.thresholds }, visual: { ...cfg.visual }, pages: (cfg.verifyPages || []).join(', ') }); setFlows(JSON.stringify(cfg.flows || [], null, 2)); } }, [cfg]); // eslint-disable-line
  if (!f) return null;
  const admin = can('admin');
  const set = (k: string, v: any) => setF({ ...f, [k]: v });

  const save = () => {
    let parsed; try { parsed = JSON.parse(flows); setFlowErr(''); } catch (e: any) { setFlowErr(e.message); return; }
    run('save', async () => {
      await api(`/sites/${siteId}/config`, 'PUT', { thresholds: f.thresholds, visual: f.visual, autoRollback: f.autoRollback, errorThreshold: Number(f.errorThreshold), verifyPages: f.pages.split(',').map((s: string) => s.trim()).filter(Boolean), flows: parsed, pollMs: Number(f.pollMs) });
      await refresh();
    }, 'Settings saved');
  };

  return (
    <Page title="Settings" sub={`${data.site.name} · ${data.site.origin}`} actions={<Btn variant="primary" icon={I.Save} loading={busy === 'save'} disabled={!admin} onClick={save}>Save changes</Btn>}>
      <div className="col gap-lg">
        {!admin && <div className="row" style={{ background: 'var(--warn-soft)', color: 'var(--warn)', padding: '12px 16px', borderRadius: 14 }}><I.Lock size={16} /><span className="small">Only admins can change settings. Switch user (bottom-left) to Alex.</span></div>}
        <div className="grid g2" style={{ alignItems: 'start' }}>
          <Card title="Safety net" icon={I.ShieldCheck}>
            <div className="col">
              <div className="row between"><div><div className="bold small">Auto-rollback</div><div className="tiny muted">Revert a release automatically if it breaks</div></div><Switch on={!!f.autoRollback} onChange={(v) => admin && set('autoRollback', v)} /></div>
              <Field label={`Error threshold · ${f.errorThreshold} patch errors / minute`} hint="Runtime errors reported by visitors’ browsers before rollback triggers"><input type="range" min={1} max={20} value={f.errorThreshold} disabled={!admin} onChange={(e) => set('errorThreshold', +e.target.value)} /></Field>
              <Field label={`Telemetry poll · ${f.pollMs / 1000}s`} hint="How quickly open pages pick up a deploy or rollback"><input type="range" min={1000} max={15000} step={1000} value={f.pollMs} disabled={!admin} onChange={(e) => set('pollMs', +e.target.value)} /></Field>
            </div>
          </Card>
          <Card title="Element tracking" icon={I.Crosshair}>
            <div className="col">
              <Field label={`Self-heal threshold · ${Math.round(f.thresholds.healed * 100)}%`} hint="Confidence needed to apply a patch to a moved element"><input type="range" min={55} max={95} value={f.thresholds.healed * 100} disabled={!admin} onChange={(e) => setF({ ...f, thresholds: { ...f.thresholds, healed: +e.target.value / 100 } })} /></Field>
              <Field label={`Review band floor · ${Math.round(f.thresholds.review * 100)}%`} hint="Between this and the threshold above, patches are held back for a human"><input type="range" min={30} max={80} value={f.thresholds.review * 100} disabled={!admin} onChange={(e) => setF({ ...f, thresholds: { ...f.thresholds, review: +e.target.value / 100 } })} /></Field>
            </div>
          </Card>
        </div>

        <Card title="Verification" icon={I.ScanEye} sub="What a release is tested against">
          <div className="grid g2" style={{ alignItems: 'start' }}>
            <div className="col">
              <Field label="Pages to check" hint="Comma-separated paths loaded on desktop and mobile"><input className="input" disabled={!admin} value={f.pages} onChange={(e) => set('pages', e.target.value)} /></Field>
              <Field label={`Visual: warn above ${(f.visual.warnRatio * 100).toFixed(0)}% unexpected change`}><input type="range" min={1} max={20} value={f.visual.warnRatio * 100} disabled={!admin} onChange={(e) => setF({ ...f, visual: { ...f.visual, warnRatio: +e.target.value / 100 } })} /></Field>
              <Field label={`Visual: fail above ${(f.visual.failRatio * 100).toFixed(0)}% unexpected change`}><input type="range" min={2} max={40} value={f.visual.failRatio * 100} disabled={!admin} onChange={(e) => setF({ ...f, visual: { ...f.visual, failRatio: +e.target.value / 100 } })} /></Field>
            </div>
            <Field label="Critical flows (JSON)" hint="Steps: goto · click · fill · expectVisible · expectUrl · expectText. Selectors use Playwright syntax."><textarea className="textarea mono" rows={12} disabled={!admin} value={flows} onChange={(e) => setFlows(e.target.value)} />{flowErr && <div className="tiny" style={{ color: 'var(--bad)' }}>Invalid JSON: {flowErr}</div>}</Field>
          </div>
        </Card>

        <div className="grid g2" style={{ alignItems: 'start' }}>
          <Card title="Team & roles" icon={I.Users}>
            <table className="tbl"><tbody>{users.map((u) => <tr key={u.id}><td><b>{u.name}</b></td><td><span className={`badge ${u.role === 'admin' ? 'accent' : u.role === 'reviewer' ? 'good' : ''}`}>{u.role}</span></td></tr>)}</tbody></table>
            <div className="tiny muted" style={{ marginTop: 10 }}><b>Developers</b> create, edit and submit patches. <b>Reviewers</b> approve or reject (never their own), create and deploy releases, and roll back. <b>Admins</b> also approve script patches, override verification and change settings.</div>
          </Card>
          <Card title="AI assistant" icon={I.Sparkles}>
            <div className="col">
              <div className="row between"><span className="small">Provider</span>{aiStatus?.hasKey ? <span className="badge good">Claude connected</span> : <span className="badge">Rule-based fallback</span>}</div>
              <div className="row between"><span className="small">Model</span><span className="mono small">{aiStatus?.model}</span></div>
              <div className="tiny muted">Add <span className="mono">ANTHROPIC_API_KEY=…</span> to a <span className="mono">.env</span> file in the project folder and restart to turn on natural-language patch generation and AI conflict suggestions. Without a key, a simple rule-based assistant handles common requests.</div>
            </div>
          </Card>
        </div>
      </div>
    </Page>
  );
}
