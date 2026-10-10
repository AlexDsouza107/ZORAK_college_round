import { useEffect, useMemo, useState } from 'react';
import { api, dateTime } from '../api';
import { useApp } from '../ctx';
import { Avatar, Btn, Card, Empty, I, Page, Seg, useAsync, Who } from '../ui';
import { AuditIcon } from '../auditMeta';

const CATS: Record<string, { label: string; match: string[] }> = {
  all: { label: 'Everything', match: [] }, patch: { label: 'Patches', match: ['patch.', 'conflict.'] }, release: { label: 'Releases', match: ['release.'] },
  verify: { label: 'Verification', match: ['verify.'] }, health: { label: 'Health & tracking', match: ['health.', 'drift.'] }, site: { label: 'Site', match: ['site.'] }
};
export default function Audit() {
  const { siteId, can, subscribe, users } = useApp();
  const { busy, run } = useAsync();
  const [rows, setRows] = useState<any[]>([]);
  const [cat, setCat] = useState('all'); const [actor, setActor] = useState(''); const [q, setQ] = useState('');
  const [open, setOpen] = useState<number | null>(null);
  const [chain, setChain] = useState<any>(null);

  const load = () => api(`/audit?siteId=${siteId}&limit=400`).then(setRows);
  const verify = () => api('/audit/verify').then(setChain);
  useEffect(() => { load(); verify(); }, []); // eslint-disable-line
  useEffect(() => subscribe((e) => { if (e.type === 'audit') load(); }), [subscribe]); // eslint-disable-line

  const list = useMemo(() => rows.filter((r) => (cat === 'all' || CATS[cat].match.some((m) => r.type.startsWith(m))) && (!actor || r.actor === actor) && (!q || (r.summary + r.type).toLowerCase().includes(q.toLowerCase()))), [rows, cat, actor, q]);
  const days = useMemo(() => { const m: Record<string, any[]> = {}; list.forEach((r) => { const d = new Date(r.ts).toDateString(); (m[d] = m[d] || []).push(r); }); return Object.entries(m); }, [list]);

  return (
    <Page title="Audit trail" sub="A tamper-evident history of every change, review, deployment, conflict and rollback"
      actions={<Btn icon={I.ShieldCheck} loading={busy === 'v'} onClick={() => run('v', verify)}>Verify integrity</Btn>}>
      <div className="col gap-lg">
        <Card>
          <div className="row between wrap" style={{ gap: 16 }}>
            <div className="row" style={{ gap: 14 }}>
              <div style={{ width: 46, height: 46, borderRadius: 14, display: 'grid', placeItems: 'center', background: chain?.valid === false ? 'var(--bad-soft)' : 'var(--good-soft)', color: chain?.valid === false ? 'var(--bad)' : 'var(--good)' }}>{chain?.valid === false ? <I.ShieldX size={24} /> : <I.Link2 size={24} />}</div>
              <div><div className="bold">{chain == null ? 'Checking…' : chain.valid ? 'Hash chain intact' : `Tampering detected at entry #${chain.brokenAt}`}</div>
                <div className="small muted">{chain?.valid ? `${chain.total} entries, each sealed with SHA-256 over the previous entry — editing history breaks every later seal.` : chain ? 'A stored record no longer matches its seal. The records after it can’t be trusted.' : ''}</div></div></div>
            {can('admin') && <div className="row gap-sm"><span className="tiny muted">Demo:</span>
              <Btn size="sm" variant="danger" icon={I.Pencil} onClick={() => run('t', async () => { await api('/audit/tamper', 'POST'); await verify(); await load(); }, 'A record was silently edited — verify again')}>Simulate tampering</Btn>
              {chain?.valid === false && <Btn size="sm" icon={I.Wrench} onClick={() => run('r', async () => { await api('/audit/repair', 'POST'); await verify(); await load(); }, 'Chain restored')}>Restore</Btn>}</div>}
          </div>
        </Card>

        <div className="row wrap between">
          <Seg value={cat} onChange={setCat} options={Object.entries(CATS).map(([v, c]) => ({ v, label: c.label }))} />
          <div className="row gap-sm">
            <select className="select" style={{ width: 150 }} value={actor} onChange={(e) => setActor(e.target.value)}><option value="">Everyone</option>{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}<option value="system">PATCHWORK (system)</option><option value="external">Vendor</option></select>
            <div style={{ position: 'relative' }}><I.Search size={14} className="muted" style={{ position: 'absolute', left: 11, top: 11 }} /><input className="input" style={{ paddingLeft: 32, width: 220 }} placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} /></div></div>
        </div>

        {list.length === 0 ? <Card><Empty icon={I.ScrollText} title="No matching entries" /></Card> : days.map(([day, items]) => <div key={day}><div className="eyebrow" style={{ margin: '4px 4px 10px' }}>{day === new Date().toDateString() ? 'Today' : day}</div>
          <Card pad={false}>{items.map((r) => {
            return <div key={r.seq} style={{ borderBottom: '1px solid var(--line)' }}>
              <div className="row" style={{ padding: '12px 18px', alignItems: 'flex-start', cursor: 'pointer' }} onClick={() => setOpen(open === r.seq ? null : r.seq)}>
                <AuditIcon type={r.type} size={32} />
                <div style={{ flex: 1, minWidth: 0 }}><div className="small" style={{ lineHeight: 1.4 }}>{r.summary}</div><div className="row gap-sm tiny muted" style={{ marginTop: 3 }}><Who id={r.actor} /><span>· {dateTime(r.ts)}</span><span className="mono">· #{r.seq}</span></div></div>
                <span className="badge outline mono">{r.hash.slice(0, 8)}</span></div>
              {open === r.seq && <div style={{ padding: '0 18px 16px 64px' }}><div className="grid g2"><div><div className="eyebrow" style={{ marginBottom: 4 }}>Event</div><div className="mono small">{r.type}</div><div className="eyebrow" style={{ margin: '10px 0 4px' }}>Seal</div><div className="mono tiny muted" style={{ wordBreak: 'break-all' }}>hash {r.hash}<br />prev {r.prevHash}</div></div>
                <div><div className="eyebrow" style={{ marginBottom: 4 }}>Details</div><pre className="mono tiny" style={{ margin: 0, background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 10, padding: 10, maxHeight: 180, overflow: 'auto', whiteSpace: 'pre-wrap' }}>{JSON.stringify(r.payload, null, 2)}</pre></div></div></div>}
            </div>; })}</Card></div>)}
      </div>
    </Page>
  );
}
