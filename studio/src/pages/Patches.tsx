import { useEffect, useMemo, useState } from 'react';
import { api, ago, describeOp, dateTime, Patch } from '../api';
import { useApp } from '../ctx';
import { Avatar, Btn, Card, Conf, Drawer, Empty, I, Modal, Page, Status, Tabs, useAsync, Who } from '../ui';

const FILTERS = [{ v: 'all', l: 'All' }, { v: 'draft', l: 'Drafts' }, { v: 'review', l: 'In review' }, { v: 'approved', l: 'Approved' }, { v: 'live', l: 'Live' }, { v: 'rejected', l: 'Rejected' }, { v: 'reverted', l: 'Reverted' }];
const KIND_LABEL: Record<string, string> = { collision: 'Collision', duplicate: 'Duplicate', 'target-removed': 'Target removed', 'ancestor-removed': 'Container removed', 'missing-dependency': 'Missing dependency' };

export default function Patches() {
  const { patches, siteId, go, can, user, refresh, toast, subscribe, userOf } = useApp();
  const { busy, run } = useAsync();
  const [tab, setTab] = useState('patches');
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [conflicts, setConflicts] = useState<any[]>([]);

  const loadConflicts = () => api(`/sites/${siteId}/conflicts`).then(setConflicts).catch(() => {});
  useEffect(() => { loadConflicts(); }, [patches]); // eslint-disable-line
  useEffect(() => subscribe((e) => { if (e.type === 'patch') loadConflicts(); }), [subscribe]); // eslint-disable-line

  const conflictCount = useMemo(() => { const m: Record<string, number> = {}; conflicts.filter((c) => c.severity === 'high' || c.severity === 'medium').forEach((c) => { m[c.a] = (m[c.a] || 0) + 1; m[c.b] = (m[c.b] || 0) + 1; }); return m; }, [conflicts]);
  const counts = useMemo(() => patches.reduce((m: any, p) => ((m[p.status] = (m[p.status] || 0) + 1), m), { all: patches.length }), [patches]);
  const list = patches.filter((p) => (filter === 'all' || p.status === filter) && (!q || (p.title + p.description + p.author).toLowerCase().includes(q.toLowerCase())));
  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const open = patches.find((p) => p.id === openId) || null;
  const high = conflicts.filter((c) => c.severity !== 'low');

  const sendTo = (path: string) => { sessionStorage.setItem('pw.selection', JSON.stringify([...selected])); go(path); };

  return (
    <Page title="Patches" sub="Propose, review and resolve changes before anything reaches production"
      actions={<>{selected.size > 0 && <><span className="small muted">{selected.size} selected</span><Btn icon={I.ShieldCheck} onClick={() => sendTo('/verify')}>Verify</Btn><Btn variant="primary" icon={I.Rocket} onClick={() => sendTo('/releases')}>Build release</Btn></>}
        <Btn variant="primary" icon={I.Plus} onClick={() => go('/editor')}>New patch</Btn></>}>
      <div className="col gap-lg">
        <Tabs value={tab} onChange={setTab} tabs={[{ v: 'patches', label: 'All patches', count: patches.length, icon: I.GitPullRequestDraft }, { v: 'conflicts', label: 'Conflicts', count: high.length, icon: I.GitMerge }]} />

        {tab === 'patches' && <>
          <div className="row wrap between">
            <div className="row wrap gap-sm">{FILTERS.map((f) => <Btn key={f.v} size="sm" className={filter === f.v ? 'active' : ''} onClick={() => setFilter(f.v)}>{f.l}{counts[f.v] ? ` · ${counts[f.v]}` : ''}</Btn>)}</div>
            <div style={{ position: 'relative', width: 260 }}><I.Search size={14} className="muted" style={{ position: 'absolute', left: 11, top: 11 }} /><input className="input" style={{ paddingLeft: 32 }} placeholder="Search patches…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          </div>
          {high.length > 0 && <div className="row" style={{ background: 'var(--warn-soft)', color: 'var(--warn)', padding: '12px 16px', borderRadius: 14 }}><I.TriangleAlert size={16} /><span className="small"><b>{high.length} conflict{high.length > 1 ? 's' : ''}</b> detected between patches. They must be resolved before these patches can ship together.</span><span className="spacer" /><Btn size="sm" onClick={() => setTab('conflicts')}>Resolve</Btn></div>}
          <Card pad={false}>
            {list.length === 0 ? <Empty icon={I.GitPullRequestDraft} title="No patches match" action={<Btn variant="primary" onClick={() => go('/editor')}>Create one in the editor</Btn>}>Try a different filter, or make a new patch.</Empty> :
              <table className="tbl"><thead><tr><th style={{ width: 36 }} /><th>Patch</th><th>Status</th><th>Page</th><th>Changes</th><th>Author</th><th>Tracking</th><th>Updated</th></tr></thead><tbody>
                {list.map((p) => {
                  const h = p.health?.runtime || p.health?.drift;
                  return <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => setOpenId(p.id)}>
                    <td onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} /></td>
                    <td><div className="bold">{p.title}</div><div className="row gap-sm tiny muted">{p.usesScript && <span className="badge warn"><I.FileCode size={11} />script</span>}{conflictCount[p.id] ? <span className="badge bad"><I.GitMerge size={11} />{conflictCount[p.id]} conflict{conflictCount[p.id] > 1 ? 's' : ''}</span> : null}<span className="trunc" style={{ maxWidth: 360 }}>{p.description}</span></div></td>
                    <td><Status s={p.status} /></td>
                    <td><span className="badge outline mono">{p.page}</span></td>
                    <td><span className="small">{p.ops.length} · {p.ops[0] ? describeOp(p.ops[0]).slice(0, 34) : ''}</span></td>
                    <td><Who id={p.author} /></td>
                    <td>{h ? <div className="row gap-sm"><Status s={h.status === 'heal' ? 'healed' : h.status} dot={false} /></div> : <span className="muted tiny">—</span>}</td>
                    <td className="muted small">{ago(p.updatedAt)}</td></tr>;
                })}
              </tbody></table>}
          </Card>
        </>}

        {tab === 'conflicts' && <ConflictsPanel conflicts={conflicts} reload={() => { loadConflicts(); refresh(); }} />}
      </div>
      {open && <PatchDrawer patch={open} onClose={() => setOpenId(null)} conflicts={conflicts.filter((c) => c.a === open.id || c.b === open.id)} gotoConflicts={() => { setOpenId(null); setTab('conflicts'); }} />}
    </Page>
  );
}

/* ====================================================================== drawer */
function PatchDrawer({ patch, onClose, conflicts, gotoConflicts }: { patch: Patch; onClose: () => void; conflicts: any[]; gotoConflicts: () => void }) {
  const { user, can, siteId, go, refresh, userOf, siteUrl, toast } = useApp();
  const { busy, run } = useAsync();
  const [detail, setDetail] = useState<any>(null);
  const [comment, setComment] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const load = () => { api(`/patches/${patch.id}`).then(setDetail); api(`/audit?siteId=${siteId}&limit=400`).then((a) => setHistory(a.filter((x: any) => x.payload?.patchId === patch.id))); };
  useEffect(load, [patch.id, patch.rev, patch.status]); // eslint-disable-line
  const act = (key: string, path: string, body: any = {}, ok?: string) => run(key, async () => { await api(`/patches/${patch.id}/${path}`, 'POST', body); await refresh(); load(); }, ok);
  const t = patch.target;
  const health = patch.health || {};

  const preview = async () => {
    const r = await run('prev', () => api(`/sites/${siteId}/previews`, 'POST', { patchIds: [patch.id], path: patch.page === '*' ? '/' : patch.page }));
    if (r) window.open(r.url, '_blank');
  };
  const canReview = can('reviewer') && patch.status === 'review';

  return <Drawer title={patch.title} onClose={onClose} sub={<span className="row gap-sm"><Status s={patch.status} /> <span>rev {patch.rev}</span> · <Who id={patch.author} /></span>}
    actions={<Btn size="sm" icon={I.MousePointerClick} onClick={() => { sessionStorage.setItem('pw.openPatch', patch.id); go('/editor'); }}>Open in editor</Btn>}>
    <div className="col gap-lg">
      {patch.description && <div className="ink2">{patch.description}</div>}
      {conflicts.length > 0 && <div style={{ background: 'var(--warn-soft)', color: 'var(--warn)', padding: '10px 14px', borderRadius: 12 }} className="small"><b><I.GitMerge size={13} style={{ verticalAlign: -2 }} /> {conflicts.length} conflict{conflicts.length > 1 ? 's' : ''}</b> — {conflicts[0].message} <a style={{ cursor: 'pointer', fontWeight: 600 }} onClick={gotoConflicts}>Resolve →</a></div>}

      <div><div className="eyebrow" style={{ marginBottom: 8 }}>Changes</div><div className="col" style={{ gap: 6 }}>{patch.ops.map((o, i) => <div key={i} className="opchip"><I.CircleDot size={12} /><span>{describeOp(o)}</span></div>)}</div></div>

      <div><div className="eyebrow" style={{ marginBottom: 8 }}>Target element</div>
        <div className="target-card" style={{ margin: 0 }}>
          <div className="row between"><span className="badge accent mono">&lt;{t.tag}&gt;</span><span className="badge outline mono">{patch.page}</span></div>
          <div className="mono small" style={{ marginTop: 8, wordBreak: 'break-all' }}>{t.selector}</div>
          {t.text && <div className="small ink2" style={{ marginTop: 6 }}>“{t.text.slice(0, 80)}”</div>}
          <div className="tiny muted" style={{ marginTop: 6 }}>Tracked by {[t.id && 'id', t.attrs && Object.keys(t.attrs).length && `${Object.keys(t.attrs).length} attributes`, t.text && 'text', t.ancestors?.length && 'structure', t.bbox && 'position'].filter(Boolean).join(' · ')}</div>
        </div></div>

      {(health.runtime || health.drift) && <div><div className="eyebrow" style={{ marginBottom: 8 }}>Tracking health</div>
        {Object.entries(health).map(([src, h]: any) => <div key={src} className="row between" style={{ padding: '6px 0' }}><span className="small muted" style={{ textTransform: 'capitalize' }}>{src}</span><div className="row"><Status s={h.status === 'heal' ? 'healed' : h.status} /><Conf v={h.confidence} /></div></div>)}</div>}

      <div className="row wrap">
        {['draft', 'rejected', 'reverted'].includes(patch.status) && <Btn variant="primary" icon={I.Send} loading={busy === 'submit'} onClick={() => act('submit', 'submit', {}, 'Sent for review')}>Submit for review</Btn>}
        {patch.status === 'review' && patch.author === user.id && <Btn icon={I.Undo2} loading={busy === 'withdraw'} onClick={() => act('withdraw', 'withdraw', {}, 'Moved back to drafts')}>Withdraw</Btn>}
        {canReview && <><Btn variant="good" icon={I.Check} loading={busy === 'approve'} onClick={() => act('approve', 'approve', { comment }, 'Approved')}>Approve</Btn><Btn variant="danger" icon={I.X} loading={busy === 'reject'} onClick={() => act('reject', 'reject', { comment: comment || 'Needs changes' }, 'Rejected')}>Reject</Btn></>}
        <Btn icon={I.ExternalLink} loading={busy === 'prev'} onClick={preview}>Isolated preview</Btn>
        {patch.status !== 'live' && <Btn variant="ghost" icon={I.Trash2} onClick={() => confirm(`Delete “${patch.title}”?`) && run('del', async () => { await api(`/patches/${patch.id}`, 'DELETE'); onClose(); await refresh(); }, 'Deleted')} />}
      </div>
      {patch.status === 'review' && !can('reviewer') && <div className="small muted"><I.Lock size={12} style={{ verticalAlign: -2 }} /> Waiting for a reviewer. Switch user (bottom-left) to try the review flow.</div>}
      {canReview && patch.author === user.id && user.role !== 'admin' && <div className="small muted">Four-eyes rule: you can’t approve your own patch.</div>}
      {patch.usesScript && <div className="small" style={{ color: 'var(--warn)' }}><I.ShieldAlert size={12} style={{ verticalAlign: -2 }} /> Contains a custom script — only an admin can approve it.</div>}

      <div><div className="eyebrow" style={{ marginBottom: 8 }}>Discussion</div>
        <div className="col">{(detail?.comments || []).length === 0 && <div className="small muted">No comments yet.</div>}
          {(detail?.comments || []).map((c: any) => <div key={c.id} className="row" style={{ alignItems: 'flex-start', gap: 10 }}><Avatar id={c.author} size="sm" /><div style={{ background: c.kind === 'system' ? 'var(--surface-3)' : 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 12, padding: '8px 12px', flex: 1 }}><div className="tiny muted">{userOf(c.author)?.name || c.author} · {ago(c.createdAt)}{c.kind === 'review' ? ' · review' : ''}</div><div className="small">{c.body}</div></div></div>)}
          <div className="row"><input className="input" placeholder={canReview ? 'Add a review note (sent with approve / reject)…' : 'Write a comment…'} value={comment} onChange={(e) => setComment(e.target.value)} />
            <Btn icon={I.MessageSquarePlus} disabled={!comment.trim()} onClick={() => run('c', async () => { await api(`/patches/${patch.id}/comments`, 'POST', { body: comment }); setComment(''); load(); })} /></div></div></div>

      <div><div className="eyebrow" style={{ marginBottom: 8 }}>History</div>
        <div className="timeline">{history.length === 0 && <div className="small muted">Nothing yet.</div>}{history.map((h) => <div key={h.seq} className="tl-item"><div className="small">{h.summary}</div><div className="tiny muted">{dateTime(h.ts)}</div></div>)}</div></div>
    </div>
  </Drawer>;
}

/* ================================================================== conflicts */
function ConflictsPanel({ conflicts, reload }: { conflicts: any[]; reload: () => void }) {
  const { busy, run } = useAsync();
  const { toast, userOf } = useApp();
  const [ai, setAi] = useState<Record<string, any>>({});
  const [custom, setCustom] = useState<Record<string, string>>({});
  const list = conflicts.filter((c) => c.severity !== 'low' || c.kind === 'duplicate');
  if (!list.length) return <Card><Empty icon={I.GitMerge} title="No conflicts">Patches that touch the same element and property, remove a container another patch needs, or depend on something missing show up here.</Empty></Card>;

  const resolve = (c: any, strategy: string, customValue?: string) => run('r' + c.id + strategy, async () => { await api('/conflicts/resolve', 'POST', { conflict: c, strategy, customValue }); reload(); }, 'Conflict resolved — affected patches were sent back to draft for re-review');
  const suggest = (c: any) => run('s' + c.id, async () => { const s = await api('/conflicts/suggest', 'POST', { conflict: c }); setAi((m) => ({ ...m, [c.id]: s })); });

  return <div className="col gap-lg">{list.map((c) => {
    const s = ai[c.id];
    return <Card key={c.id} className="hover">
      <div className="row between" style={{ marginBottom: 6 }}>
        <div className="row"><span className={`badge ${c.severity === 'high' ? 'bad' : c.severity === 'medium' ? 'warn' : ''}`}><I.GitMerge size={12} />{KIND_LABEL[c.kind] || c.kind}</span><span className="small muted mono">{c.key}</span></div>
      </div>
      <div className="ink2" style={{ marginBottom: 14 }}>{c.message}</div>
      {c.kind === 'collision' ? <div className="diffrow">
        <div><div className="row gap-sm small" style={{ marginBottom: 6 }}><Avatar id={c.patchA.author} size="sm" /><b>{c.patchA.title}</b><Status s={c.patchA.status} dot={false} /></div><div className="diffcell a">{String(c.aValue)}</div></div>
        <div><div className="row gap-sm small" style={{ marginBottom: 6 }}><Avatar id={c.patchB.author} size="sm" /><b>{c.patchB.title}</b><Status s={c.patchB.status} dot={false} /></div><div className="diffcell b">{String(c.bValue)}</div></div>
      </div> : <div className="diffrow">
        <div className="diffcell a"><b>{c.patchA?.title}</b><div className="tiny">{c.patchA?.ops.join(' · ')}</div></div>
        <div className="diffcell b"><b>{c.patchB?.title || c.b}</b><div className="tiny">{c.patchB?.ops?.join(' · ')}</div></div></div>}

      {s && <div className="row" style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-line)', borderRadius: 12, padding: '10px 14px', marginTop: 14, alignItems: 'flex-start' }}>
        <I.Sparkles size={16} style={{ color: 'var(--accent-ink)', marginTop: 2 }} /><div className="small"><b>{s.provider === 'claude' ? 'Claude suggests' : 'Suggestion'}: {s.strategy === 'keepA' ? `keep “${c.patchA.title}”` : s.strategy === 'keepB' ? `keep “${c.patchB.title}”` : `use “${s.customValue}”`}</b><div className="ink2">{s.reasoning}</div></div>
        <span className="spacer" /><Btn size="sm" variant="primary" onClick={() => resolve(c, s.strategy, s.customValue || undefined)}>Apply</Btn></div>}

      <div className="row wrap" style={{ marginTop: 14 }}>
        {c.kind === 'missing-dependency' ? <Btn size="sm" onClick={() => resolve(c, 'keepA')}>Drop the dependency</Btn> : <>
          <Btn size="sm" icon={I.ArrowLeftToLine} loading={busy === 'r' + c.id + 'keepA'} onClick={() => resolve(c, 'keepA')}>Keep “{c.patchA?.title?.slice(0, 26)}”</Btn>
          {c.kind !== 'duplicate' && <Btn size="sm" icon={I.ArrowRightToLine} loading={busy === 'r' + c.id + 'keepB'} onClick={() => resolve(c, 'keepB')}>Keep “{c.patchB?.title?.slice(0, 26)}”</Btn>}
          {c.kind === 'collision' && <div className="row gap-sm"><input className="input sm" style={{ width: 200 }} placeholder="…or type a merged value" value={custom[c.id] || ''} onChange={(e) => setCustom({ ...custom, [c.id]: e.target.value })} /><Btn size="sm" disabled={!custom[c.id]} onClick={() => resolve(c, 'custom', custom[c.id])}>Merge</Btn></div>}</>}
        <span className="spacer" /><Btn size="sm" icon={I.Sparkles} loading={busy === 's' + c.id} onClick={() => suggest(c)}>Ask AI</Btn>
      </div>
    </Card>;
  })}</div>;
}
