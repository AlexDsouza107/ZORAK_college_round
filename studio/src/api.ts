export const session = { user: localStorage.getItem('pw.user') || 'alex' };
export const setSessionUser = (u: string) => { session.user = u; localStorage.setItem('pw.user', u); };

export class ApiError extends Error { data: any; status: number; constructor(m: string, status: number, data: any) { super(m); this.data = data; this.status = status; } }

export async function api<T = any>(path: string, method = 'GET', body?: any): Promise<T> {
  const r = await fetch('/api' + path, {
    method, headers: { 'content-type': 'application/json', 'x-pw-user': session.user },
    body: method === 'GET' ? undefined : JSON.stringify(body ?? {})
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new ApiError(j.error || `Request failed (${r.status})`, r.status, j);
  return j;
}

export type Role = 'developer' | 'reviewer' | 'admin';
export interface User { id: string; name: string; role: Role; color: string }
export interface Op { type: string; [k: string]: any }
export interface Patch {
  id: string; siteId: string; page: string; title: string; description: string; author: string; status: string;
  target: any; ops: Op[]; rev: number; dependsOn: string[]; createdAt: number; updatedAt: number; baseHash?: string;
  health?: Record<string, { status: string; confidence: number; details: any; updatedAt: number }>; usesScript?: boolean;
}
export interface Release {
  id: number; siteId: string; version: number; status: string; note: string; createdBy: string; patchIds: string[]; snapshot: any[];
  verificationId?: number; overrideReason?: string; kind: string; createdAt: number; deployedAt?: number; endedAt?: number;
}

export const OP_LABEL: Record<string, string> = {
  setText: 'Text', setHTML: 'HTML', setAttr: 'Attribute', setStyle: 'Style', addClass: 'Add class', removeClass: 'Remove class',
  remove: 'Hide / remove', move: 'Move', insert: 'Insert', css: 'CSS', injectJS: 'Script'
};
export function describeOp(op: Op): string {
  switch (op.type) {
    case 'setText': return `Text → “${String(op.value).slice(0, 48)}”`;
    case 'setHTML': return 'Replace inner HTML';
    case 'setAttr': return op.value == null ? `Remove attribute “${op.name}”` : `${op.name} = “${String(op.value).slice(0, 40)}”`;
    case 'setStyle': return `${op.prop}: ${op.value}`;
    case 'addClass': return `Add class .${op.name}`;
    case 'removeClass': return `Remove class .${op.name}`;
    case 'remove': return 'Hide element';
    case 'move': return `Move ${op.position === 'beforebegin' ? 'before' : 'after'} another element`;
    case 'insert': return `Insert element (${op.position})`;
    case 'css': return 'Inject CSS rule';
    case 'injectJS': return 'Run custom script';
    default: return op.type;
  }
}
export const opKey = (o: Op) => ({ setText: 'content', setHTML: 'content', setAttr: 'attr:' + o.name, setStyle: 'style:' + o.prop, addClass: 'class:' + o.name, removeClass: 'class:' + o.name, remove: 'remove', move: 'position' } as any)[o.type] || o.type + Math.random();

export const ago = (ts?: number | null) => {
  if (!ts) return '—';
  const s = Math.max(1, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`; if (s < 3600) return `${Math.round(s / 60)}m ago`; if (s < 86400) return `${Math.round(s / 3600)}h ago`; return `${Math.round(s / 86400)}d ago`;
};
export const clock = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
export const dateTime = (ts: number) => new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
