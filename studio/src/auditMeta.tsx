import { I } from './ui';

/** One source of truth for how an audit event looks (icon + colour), used by the Audit trail and the Overview feed. */
export const AUDIT_ICON: Record<string, any> = {
  'patch.created': I.FilePlus2, 'patch.updated': I.Pencil, 'patch.submitted': I.Send, 'patch.approved': I.CircleCheck, 'patch.rejected': I.CircleX,
  'patch.reanchored': I.Crosshair, 'patch.deleted': I.Trash2, 'patch.withdrawn': I.Undo2,
  'release.created': I.Package, 'release.deployed': I.Rocket, 'release.canary': I.Bird, 'release.promoted': I.TrendingUp, 'release.rollback': I.Undo2, 'release.auto_rollback': I.ShieldAlert,
  'verify.started': I.Play, 'verify.finished': I.ShieldCheck, 'drift.checked': I.Radar, 'drift.heal_blocked': I.ShieldX,
  'site.redeployed': I.Globe, 'site.created': I.Globe, 'site.config': I.Settings, 'conflict.resolved': I.GitMerge, 'health.smoke_pass': I.HeartPulse, 'health.smoke_fail': I.HeartCrack
};

export const auditTone = (t: string): '' | 'bad' | 'good' | 'warn' =>
  /rollback|fail|rejected|blocked|deleted/.test(t) ? 'bad' : /approved|deployed|pass|promoted|finished/.test(t) ? 'good' : /canary|redeployed|drift/.test(t) ? 'warn' : '';

const TILE: Record<string, { bg: string; fg: string }> = {
  bad: { bg: 'var(--bad-soft)', fg: 'var(--bad)' }, good: { bg: 'var(--good-soft)', fg: 'var(--good)' }, warn: { bg: 'var(--warn-soft)', fg: 'var(--warn)' }, '': { bg: 'var(--surface-3)', fg: 'var(--ink-2)' }
};

export function AuditIcon({ type, size = 32 }: { type: string; size?: number }) {
  const Ic = AUDIT_ICON[type] || I.CircleDot, c = TILE[auditTone(type)];
  return <div style={{ width: size, height: size, borderRadius: 10, flexShrink: 0, display: 'grid', placeItems: 'center', background: c.bg, color: c.fg }}><Ic size={Math.round(size / 2)} /></div>;
}
