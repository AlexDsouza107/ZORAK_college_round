import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import { api, session, setSessionUser, User, Patch, Release, Role } from './api';

type Listener = (e: any) => void;
interface Ctx {
  users: User[]; user: User; switchUser: (id: string) => void; can: (r: Role) => boolean;
  siteId: string; data: any; patches: Patch[]; releases: Release[]; ready: boolean; refresh: () => Promise<void>;
  toast: (msg: string, kind?: 'good' | 'bad' | 'info') => void; toasts: any[];
  route: string; go: (r: string) => void;
  theme: string; toggleTheme: () => void;
  subscribe: (fn: Listener) => () => void;
  siteUrl: (src: { kind: 'live' | 'none' | 'release' | 'preview'; version?: number; token?: string }, edit: boolean, path?: string) => string;
  setActivity: (a: string) => void; presence: any[]; aiStatus: any;
  userOf: (id: string) => User | undefined;
}
const C = createContext<Ctx>(null as any);
export const useApp = () => useContext(C);

export function AppProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>([]);
  const [userId, setUserId] = useState(session.user);
  const [siteId] = useState('shoplite');
  const [data, setData] = useState<any>(null);
  const [patches, setPatches] = useState<Patch[]>([]);
  const [releases, setReleases] = useState<Release[]>([]);
  const [ready, setReady] = useState(false);
  const [toasts, setToasts] = useState<any[]>([]);
  const [presence, setPresence] = useState<any[]>([]);
  const [aiStatus, setAi] = useState<any>(null);
  const [route, setRoute] = useState(location.hash.slice(1) || '/overview');
  const [theme, setTheme] = useState(localStorage.getItem('pw.theme') || 'light');
  const listeners = useRef<Set<Listener>>(new Set());
  const activity = useRef('');

  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); localStorage.setItem('pw.theme', theme); }, [theme]);
  useEffect(() => { const h = () => setRoute(location.hash.slice(1) || '/overview'); addEventListener('hashchange', h); return () => removeEventListener('hashchange', h); }, []);

  const refresh = useCallback(async () => {
    try {
      const [d, p, r] = await Promise.all([api(`/sites/${siteId}`), api(`/sites/${siteId}/patches`), api(`/sites/${siteId}/releases`)]);
      setData(d); setPatches(p); setReleases(r); setPresence(d.presence || []); setReady(true);
    } catch (e) { /* server restarting */ }
  }, [siteId]);

  useEffect(() => { api('/users').then(setUsers); api('/ai/status').then(setAi).catch(() => {}); refresh(); }, [refresh]);

  useEffect(() => {
    let t: any; let es: EventSource;
    const connect = () => {
      es = new EventSource('/api/stream');
      es.onmessage = (m) => {
        const e = JSON.parse(m.data);
        listeners.current.forEach((l) => l(e));
        if (e.type === 'presence') { if (e.siteId === siteId) setPresence(e.users); return; }
        if (['patch', 'release', 'site', 'health', 'drift', 'audit', 'telemetry'].includes(e.type)) { clearTimeout(t); t = setTimeout(refresh, 150); }
      };
      es.onerror = () => { es.close(); setTimeout(connect, 2000); };
    };
    connect();
    return () => { es?.close(); clearTimeout(t); };
  }, [refresh, siteId]);

  useEffect(() => {
    const beat = () => api('/presence', 'POST', { siteId, activity: activity.current }).catch(() => {});
    beat(); const i = setInterval(beat, 8000); return () => clearInterval(i);
  }, [siteId, userId]);

  const user = users.find((u) => u.id === userId) || { id: userId, name: userId, role: 'developer' as Role, color: '#888' };
  const rank = { developer: 1, reviewer: 2, admin: 3 } as any;
  const value: Ctx = useMemo(() => ({
    users, user, switchUser: (id) => { setSessionUser(id); setUserId(id); }, can: (r) => rank[user.role] >= rank[r],
    siteId, data, patches, releases, ready, refresh,
    toast: (msg, kind = 'info') => { const id = Math.random(); setToasts((t) => [...t, { id, msg, kind }]); setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'bad' ? 6000 : 3500); },
    toasts, route, go: (r) => { location.hash = r; },
    theme, toggleTheme: () => setTheme((t) => (t === 'light' ? 'dark' : 'light')),
    subscribe: (fn) => { listeners.current.add(fn); return () => listeners.current.delete(fn); },
    siteUrl: (src, edit, path = '/') => {
      const labels: string[] = [];
      if (edit) labels.push('edit');
      if (src.kind === 'none') labels.push('none'); else if (src.kind === 'release') labels.push('rel' + src.version); else if (src.kind === 'preview') labels.push('pv' + src.token);
      labels.push(siteId);
      return `http://${labels.join('.')}.localhost:${data?.proxyPort || location.port || 4000}${path}`;
    },
    setActivity: (a) => { activity.current = a; }, presence, aiStatus, userOf: (id) => users.find((u) => u.id === id)
  }), [users, user, siteId, data, patches, releases, ready, refresh, toasts, route, theme, presence, aiStatus]);
  return <C.Provider value={value}>{children}</C.Provider>;
}
