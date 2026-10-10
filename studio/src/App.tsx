import { useApp } from './ctx';
import { Avatar, Btn, I, Menu } from './ui';
import Overview from './pages/Overview';
import Editor from './pages/Editor';
import Patches from './pages/Patches';
import Verify from './pages/Verify';
import Releases from './pages/Releases';
import Tracking from './pages/Tracking';
import Audit from './pages/Audit';
import Settings from './pages/Settings';

const NAV = [
  { group: 'Workspace', items: [
    { path: '/overview', label: 'Overview', icon: I.LayoutDashboard },
    { path: '/editor', label: 'Visual editor', icon: I.MousePointerClick },
    { path: '/patches', label: 'Patches', icon: I.GitPullRequestDraft, count: 'review' }] },
  { group: 'Ship safely', items: [
    { path: '/verify', label: 'Verification', icon: I.ShieldCheck },
    { path: '/releases', label: 'Releases', icon: I.Rocket }] },
  { group: 'Operate', items: [
    { path: '/tracking', label: 'Element tracking', icon: I.Crosshair },
    { path: '/audit', label: 'Audit trail', icon: I.ScrollText },
    { path: '/settings', label: 'Settings', icon: I.Settings }] }
];
const PAGES: Record<string, any> = { '/overview': Overview, '/editor': Editor, '/patches': Patches, '/verify': Verify, '/releases': Releases, '/tracking': Tracking, '/audit': Audit, '/settings': Settings };

export default function App() {
  const { route, go, data, users, user, switchUser, toggleTheme, theme, presence, toasts, aiStatus, patches, ready } = useApp();
  const base = '/' + (route.split('/')[1] || 'overview');
  const Page = PAGES[base] || Overview;
  const reviewCount = patches.filter((p) => p.status === 'review').length;
  const online = presence.filter((p: any) => p.user !== user.id);
  return (
    <div className={`app ${base === '/editor' ? 'rail' : ''}`}>
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M7 5h6.5a4.5 4.5 0 010 9H11v5" /></svg></div>
          <div><div className="brand-name">Patchwork</div><div className="brand-sub">Hotfix the internet</div></div></div>
        <div className="site-switch"><div className="site-dot">{data?.site?.name?.charAt(0) || 'S'}</div>
          <div style={{ minWidth: 0 }}><div className="bold trunc">{data?.site?.name || '…'}</div><div className="tiny muted trunc">{data?.site?.origin?.replace('http://', '')}</div></div>
          <span className="spacer" />{data?.active ? <span className="badge accent" title="Live release">v{data.active.version}</span> : <span className="badge">no release</span>}</div>
        <nav className="nav">{NAV.map((g) => <div key={g.group}><div className="nav-label">{g.group}</div>
          {g.items.map((it: any) => <a key={it.path} title={it.label} className={base === it.path ? 'active' : ''} onClick={() => go(it.path)}><it.icon size={17} />{it.label}{it.count === 'review' && reviewCount > 0 && <span className="count">{reviewCount}</span>}</a>)}</div>)}</nav>
        <div className="sidebar-foot">
          {online.length > 0 && <div className="row small muted"><div className="avatars">{online.slice(0, 4).map((o: any) => <Avatar key={o.user} id={o.user} size="sm" />)}</div><span>{online.length} teammate{online.length > 1 ? 's' : ''} online</span></div>}
          <div className="row small muted" title={aiStatus ? `Model: ${aiStatus.model}` : ''}><I.Sparkles size={13} /> AI: {aiStatus?.hasKey ? <b style={{ color: 'var(--good)' }}>Claude connected</b> : <span>rule-based fallback</span>}</div>
          <div className="row">
            <Menu up block trigger={(open, t) => <button className="btn ghost" style={{ width: '100%', justifyContent: 'flex-start', padding: '6px 8px' }} onClick={t}><Avatar id={user.id} /><span style={{ textAlign: 'left', lineHeight: 1.2 }}><div className="bold small">{user.name}</div><div className="tiny muted">{user.role}</div></span><span className="spacer" /><I.ChevronsUpDown size={14} className="muted" /></button>}>
              {(close) => <>{users.map((u) => <button key={u.id} className={u.id === user.id ? 'on' : ''} onClick={() => { switchUser(u.id); close(); }}><Avatar id={u.id} /><span style={{ textAlign: 'left' }}><div className="bold small">{u.name}</div><div className="tiny muted">{u.role}</div></span>{u.id === user.id && <I.Check size={14} className="muted" style={{ marginLeft: 'auto' }} />}</button>)}</>}
            </Menu>
            <Btn variant="ghost" icon={theme === 'light' ? I.Moon : I.Sun} onClick={toggleTheme} title="Toggle theme" />
          </div>
        </div>
      </aside>
      <main className="main">{ready ? <Page /> : <div className="content"><div className="empty">Connecting to PATCHWORK…</div></div>}</main>
      <div className="toasts">{toasts.map((t) => <div key={t.id} className={`toast ${t.kind}`}>{t.kind === 'bad' ? <I.CircleAlert size={16} /> : t.kind === 'good' ? <I.CircleCheck size={16} /> : <I.Info size={16} />}{t.msg}</div>)}</div>
    </div>
  );
}
