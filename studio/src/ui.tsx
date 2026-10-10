import { ReactNode, useEffect, useRef, useState } from 'react';
import * as L from 'lucide-react';
import { useApp } from './ctx';

export const I = L;

export const STATUS: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Draft', cls: '' }, review: { label: 'In review', cls: 'info' }, approved: { label: 'Approved', cls: 'good' }, live: { label: 'Live', cls: 'accent' },
  rejected: { label: 'Rejected', cls: 'bad' }, reverted: { label: 'Reverted', cls: 'warn' },
  staged: { label: 'Staged', cls: 'info' }, canary: { label: 'Canary', cls: 'warn' }, superseded: { label: 'Superseded', cls: '' }, rolled_back: { label: 'Rolled back', cls: 'bad' }, cancelled: { label: 'Cancelled', cls: '' },
  pass: { label: 'Passed', cls: 'good' }, warn: { label: 'Warnings', cls: 'warn' }, fail: { label: 'Failed', cls: 'bad' }, running: { label: 'Running', cls: 'info' }, error: { label: 'Error', cls: 'bad' },
  exact: { label: 'Exact match', cls: 'good' }, healed: { label: 'Self-healed', cls: 'accent' }, review_t: { label: 'Needs review', cls: 'warn' }, orphaned: { label: 'Lost', cls: 'bad' }, reanchored: { label: 'Re-anchored', cls: 'good' }, unchecked: { label: 'Not checked', cls: '' }
};
export function Status({ s, dot = true }: { s: string; dot?: boolean }) {
  const m = STATUS[s] || { label: s, cls: '' };
  return <span className={`badge ${m.cls}`}>{dot && <span className={`dot ${s === 'running' ? 'pulse' : ''}`} />}{m.label}</span>;
}
export function Avatar({ id, size = '' }: { id: string; size?: '' | 'sm' | 'lg' }) {
  const { userOf } = useApp(); const u = userOf(id);
  if (id === 'system') return <span className={`avatar ${size}`} style={{ background: '#64748b' }} title="PATCHWORK"><I.Bot size={size === 'sm' ? 12 : 15} /></span>;
  if (id === 'external') return <span className={`avatar ${size}`} style={{ background: '#94a3b8' }} title="External"><I.Globe size={size === 'sm' ? 12 : 15} /></span>;
  return <span className={`avatar ${size}`} style={{ background: u?.color || '#888' }} title={u?.name || id}>{(u?.name || id).charAt(0)}</span>;
}
export const Who = ({ id }: { id: string }) => { const { userOf } = useApp(); return <span className="row gap-sm"><Avatar id={id} size="sm" /><span>{id === 'system' ? 'PATCHWORK' : id === 'external' ? 'Vendor' : userOf(id)?.name?.split(' ')[0] || id}</span></span>; };

export function Btn({ icon: Icon, children, variant = '', size = '', loading, ...p }: any) {
  return <button {...p} disabled={p.disabled || loading} className={`btn ${variant} ${size} ${!children ? 'icon' : ''} ${p.className || ''}`}>
    {loading ? <I.Loader2 size={14} className="spin" style={{ animation: 'spin 1s linear infinite' }} /> : Icon && <Icon size={size === 'sm' ? 13 : 15} />}{children}</button>;
}
export function Card({ title, icon: Icon, action, children, pad = true, className = '', sub }: any) {
  return <div className={`card ${className}`}>{(title || action) && <div className="card-head">{Icon && <Icon size={17} className="muted" />}<div><h3>{title}</h3>{sub && <div className="small muted">{sub}</div>}</div><span className="spacer" />{action}</div>}
    <div className={pad ? 'card-body' : ''}>{children}</div></div>;
}
export function Modal({ title, sub, children, foot, onClose, wide }: any) {
  useEffect(() => { const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose?.(); addEventListener('keydown', h); return () => removeEventListener('keydown', h); }, [onClose]);
  return <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
    <div className={`modal ${wide ? 'wide' : ''}`}><div className="modal-head"><div><h3>{title}</h3>{sub && <div className="muted small" style={{ marginTop: 2 }}>{sub}</div>}</div><span className="spacer" /><Btn variant="ghost" size="sm" icon={I.X} onClick={onClose} /></div>
      <div className="modal-body">{children}</div>{foot && <div className="modal-foot">{foot}</div>}</div></div>;
}
export function Drawer({ title, sub, children, onClose, actions }: any) {
  useEffect(() => { const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose?.(); addEventListener('keydown', h); return () => removeEventListener('keydown', h); }, [onClose]);
  return <><div className="overlay drawer-backdrop" onMouseDown={onClose} />
    <aside className="drawer"><div className="ed-panel-head" style={{ padding: '18px 22px' }}><div style={{ minWidth: 0 }}><h3 className="trunc">{title}</h3>{sub && <div className="small muted">{sub}</div>}</div><span className="spacer" />{actions}<Btn variant="ghost" size="sm" icon={I.X} onClick={onClose} /></div>
      <div className="ed-scroll" style={{ padding: 22 }}>{children}</div></aside></>;
}
export function Switch({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) { return <button type="button" className={`switch ${on ? 'on' : ''}`} onClick={() => onChange(!on)} aria-pressed={on} />; }
export function Seg({ value, onChange, options }: { value: string; onChange: (v: any) => void; options: { v: string; label?: string; icon?: any; title?: string }[] }) {
  return <div className="seg">{options.map((o) => <button key={o.v} title={o.title} className={value === o.v ? 'on' : ''} onClick={() => onChange(o.v)}>{o.icon && <o.icon size={14} />}{o.label}</button>)}</div>;
}
export function Tabs({ value, onChange, tabs }: { value: string; onChange: (v: any) => void; tabs: { v: string; label: string; count?: number; icon?: any }[] }) {
  return <div className="tabs">{tabs.map((t) => <button key={t.v} className={value === t.v ? 'on' : ''} onClick={() => onChange(t.v)}>{t.icon && <t.icon size={15} />}{t.label}{t.count != null && <span className="badge">{t.count}</span>}</button>)}</div>;
}
export function Field({ label, children, hint }: any) { return <div className="field"><label>{label}</label>{children}{hint && <div className="tiny muted">{hint}</div>}</div>; }
export function Empty({ icon: Icon = I.Inbox, title, children, action }: any) {
  return <div className="empty"><div className="art"><Icon size={24} /></div><h3>{title}</h3><div>{children}</div>{action && <div style={{ marginTop: 14 }}>{action}</div>}</div>;
}
export function Conf({ v }: { v?: number | null }) {
  if (v == null) return <span className="muted">—</span>;
  const c = v >= 0.95 ? 'var(--good)' : v >= 0.7 ? 'var(--accent)' : v >= 0.5 ? 'var(--warn)' : 'var(--bad)';
  return <span className="conf"><span className="bar"><i style={{ width: `${v * 100}%`, background: c }} /></span><b style={{ fontVariantNumeric: 'tabular-nums' }}>{Math.round(v * 100)}%</b></span>;
}
export function Page({ title, sub, actions, children, flush, wide, big }: any) {
  return <><div className={`topbar ${big ? 'big' : ''}`}><div><h1>{title}</h1>{sub && <div className="sub">{sub}</div>}</div><span className="spacer" />{actions}</div>
    <div className={`content ${flush ? 'flush' : ''}`}>{flush ? children : <div className={`page ${wide ? 'wide' : ''}`}>{children}</div>}</div></>;
}
export function Menu({ trigger, children, up, block }: { trigger: (open: boolean, toggle: () => void) => ReactNode; children: (close: () => void) => ReactNode; up?: boolean; block?: boolean }) {
  const [open, setOpen] = useState(false); const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); }; addEventListener('mousedown', h); return () => removeEventListener('mousedown', h); }, []);
  return <div ref={ref} style={{ position: 'relative', ...(block ? { flex: 1, minWidth: 0 } : {}) }}>{trigger(open, () => setOpen(!open))}{open && <div className={`menu ${up ? 'up' : ''}`}>{children(() => setOpen(false))}</div>}</div>;
}
export function Confirm({ title, body, confirm = 'Confirm', danger, onYes, onNo, children }: any) {
  const [reason, setReason] = useState('');
  return <Modal title={title} onClose={onNo} foot={<><Btn onClick={onNo}>Cancel</Btn><Btn variant={danger ? 'danger solid' : 'primary'} onClick={() => onYes(reason)}>{confirm}</Btn></>}>
    <div className="ink2">{body}</div>{children && children(reason, setReason)}</Modal>;
}
export const Code = ({ children }: any) => <code style={{ background: 'var(--surface-3)', padding: '1px 6px', borderRadius: 6 }}>{children}</code>;
export function useAsync() {
  const [busy, setBusy] = useState<string | null>(null); const { toast } = useApp();
  const run = async (key: string, fn: () => Promise<any>, ok?: string) => {
    setBusy(key);
    try { const r = await fn(); if (ok) toast(ok, 'good'); return r; } catch (e: any) { toast(e.message, 'bad'); return undefined; } finally { setBusy(null); }
  };
  return { busy, run };
}
