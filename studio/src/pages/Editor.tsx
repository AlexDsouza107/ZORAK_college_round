import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, describeOp, opKey, Op, Patch } from '../api';
import { useApp } from '../ctx';
import { Avatar, Btn, Empty, I, Status, Switch, Seg, Field, useAsync } from '../ui';

const DEVICES = { desktop: { w: '100%', label: 'Desktop', icon: I.Monitor }, tablet: { w: '820px', label: 'Tablet', icon: I.Tablet }, mobile: { w: '390px', label: 'Mobile', icon: I.Smartphone } } as const;
type Device = keyof typeof DEVICES;

const rgbToHex = (v: string) => {
  const m = String(v || '').match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!m) return /^#/.test(v) ? v : '#000000';
  if (m[4] !== undefined && Number(m[4]) === 0) return '#ffffff';
  return '#' + [m[1], m[2], m[3]].map((x) => Number(x).toString(16).padStart(2, '0')).join('');
};
const px = (v: string) => parseFloat(v) || 0;

interface Draft { patchId?: string; title: string; titleTouched: boolean; ops: Op[]; target: any; page: string; baseHash?: string; scope: 'page' | 'all' }

export default function Editor() {
  const app = useApp();
  const { siteId, patches, data, user, siteUrl, toast, refresh, setActivity, presence, aiStatus } = app;
  const { busy, run } = useAsync();
  const iframe = useRef<HTMLIFrameElement>(null);
  const pages: string[] = useMemo(() => data?.site?.config?.verifyPages || ['/'], [data]);
  const [path, setPath] = useState(() => sessionStorage.getItem('pw.edpath') || '/cart');
  const [frameSrc, setFrameSrc] = useState('');
  const [device, setDevice] = useState<Device>('desktop');
  const [mode, setMode] = useState<'select' | 'interact'>('select');
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState<Set<string>>(new Set());
  const [layerFilter, setLayerFilter] = useState<'page' | 'all'>('page');
  const [sel, setSel] = useState<any>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const [frameState, setFrameState] = useState<any>({});
  const [pageHash, setPageHash] = useState<string>();
  const [open, setOpen] = useState<Record<string, boolean>>({ content: true, appearance: true, attrs: false, advanced: false });
  const [prompt, setPrompt] = useState('');
  const [aiNote, setAiNote] = useState<any>(null);
  const draftRef = useRef<Draft | null>(null); draftRef.current = draft;
  const pendingRef = useRef<{ patch?: Patch; aiOps?: Op[]; aiTitle?: string } | null>(null);
  const outlineReq = useRef<Record<string, (s: string) => void>>({});
  const visibleRef = useRef(visible); visibleRef.current = visible;
  const showRef = useRef(showPreview); showRef.current = showPreview;
  const modeRef = useRef(mode); modeRef.current = mode;
  const selRef = useRef<any>(null); selRef.current = sel;

  const origin = useMemo(() => { try { return new URL(siteUrl({ kind: 'none' }, true, '/')).origin; } catch { return ''; } }, [siteUrl]);
  const send = useCallback((type: string, extra: any = {}) => { iframe.current?.contentWindow?.postMessage({ pwStudio: true, type, ...extra }, origin); }, [origin]);

  /* ---- canvas loading ---- */
  useEffect(() => { if (data) { setLoading(true); setFrameSrc(siteUrl({ kind: 'none' }, true, path)); sessionStorage.setItem('pw.edpath', path); } }, [data?.proxyPort, path]); // eslint-disable-line

  const pushPatches = useCallback(() => {
    const d = draftRef.current;
    const list = patches.filter((p) => visibleRef.current.has(p.id) && p.id !== d?.patchId).map((p) => ({ id: p.id, title: p.title, page: p.page, target: p.target, ops: p.ops }));
    send('setPatches', { patches: list, reapplyDraft: showRef.current && d && selRef.current ? d.ops : undefined });
  }, [patches, send]);
  useEffect(() => { pushPatches(); }, [visible, patches, pushPatches]);

  const previewOps = useCallback((ops: Op[]) => send(showRef.current ? 'previewOps' : 'clearPreview', { ops }), [send]);

  /* ---- messages from the page ---- */
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const d = e.data;
      if (!d?.pwEditor || e.source !== iframe.current?.contentWindow) return;
      if (d.type === 'ready') {
        setLoading(false); setSel(null); setPageHash(d.pageHash); setFrameState(d.state || {});
        if (d.path && d.path !== path) { setPath(d.path); sessionStorage.setItem('pw.edpath', d.path); setFrameSrc((s) => s); }
        send('mode', { mode: modeRef.current }); pushPatches();
        if (draftRef.current?.patchId) setDraft(null);
      } else if (d.type === 'state') setFrameState(d.state || {});
      else if (d.type === 'select') {
        if (!d.el) { setSel(null); if (d.notFound) toast('Could not find that element on this page — it may have moved.', 'bad'); return; }
        const pend = pendingRef.current; pendingRef.current = null;
        setSel(d.el);
        setDraft((cur) => {
          if (pend?.patch) {
            const p = pend.patch;
            return { patchId: p.id, title: p.title, titleTouched: true, ops: p.ops, target: p.target, page: p.page, baseHash: p.baseHash, scope: p.page === '*' ? 'all' : 'page' };
          }
          if (cur && cur.target && JSON.stringify(cur.target.selector) === JSON.stringify(d.el.descriptor.selector)) return cur;   // same element re-selected
          return { title: '', titleTouched: false, ops: pend?.aiOps || [], target: d.el.descriptor, page: path, scope: 'page' as const };
        });
        if (pend?.aiOps) setTimeout(() => previewOps(pend.aiOps!), 30);
        if (pend?.patch) setTimeout(() => previewOps(pend.patch!.ops), 30);
      } else if (d.type === 'move') {
        addOp({ type: 'move', ref: d.ref, position: d.position, label: d.refLabel });
      } else if (d.type === 'outline') outlineReq.current[d.reqId]?.(d.outline);
    };
    addEventListener('message', onMsg); return () => removeEventListener('message', onMsg);
  }); // eslint-disable-line

  useEffect(() => { send('mode', { mode }); if (mode === 'interact') send('deselect'); }, [mode, send]);
  useEffect(() => { setActivity(draft ? `editing “${draft.title || 'a new patch'}”` : ''); return () => setActivity(''); }, [draft?.title, !!draft, setActivity]); // eslint-disable-line

  /* ---- draft operations ---- */
  const setOps = useCallback((fn: (ops: Op[]) => Op[]) => {
    setDraft((d) => {
      if (!d) return d;
      const ops = fn(d.ops); previewOps(ops);
      return { ...d, ops };
    });
  }, [previewOps]);
  const addOp = useCallback((op: Op, remove = false) => {
    setOps((ops) => {
      const key = opKey(op);
      const rest = ops.filter((o) => opKey(o) !== key);
      return remove ? rest : [...rest, op];
    });
  }, [setOps]);
  const removeAt = (i: number) => setOps((ops) => ops.filter((_, k) => k !== i));
  const toggleShow = (v: boolean) => { setShowPreview(v); showRef.current = v; if (draft) send(v ? 'previewOps' : 'clearPreview', { ops: draft.ops }); };

  const autoTitle = (d: Draft, s: any) => {
    if (d.ops.length === 0) return '';
    const first = d.ops[0]; const what = s ? `${s.tag}${s.descriptor?.id ? '#' + s.descriptor.id : ''}` : 'element';
    const t = first.type === 'setText' ? `Change ${what} text` : first.type === 'remove' ? `Hide ${what}` : first.type === 'setStyle' ? `Restyle ${what}` : first.type === 'setAttr' ? (first.value == null ? `Fix ${first.name} on ${what}` : `Update ${first.name} on ${what}`) : `Patch ${what}`;
    return d.ops.length > 1 ? `${t} (+${d.ops.length - 1})` : t;
  };

  /* ---- layers ---- */
  const layerList = patches.filter((p) => !['rejected'].includes(p.status) && (layerFilter === 'all' || p.page === '*' || p.page === path));
  const editPatch = (p: Patch) => {
    if (draft?.ops.length && !confirm('You have unsaved changes. Discard them and open this patch?')) return;
    if (mode !== 'select') setMode('select');
    pendingRef.current = { patch: p };
    setSel(null); setDraft(null);
    const pg = p.page !== '*' ? p.page : path;
    const need = pg !== path;
    const go = () => { setTimeout(() => { pushPatchesExcluding(p.id); send('selectTarget', { descriptor: p.target }); }, need ? 600 : 0); };
    if (need) { setPath(pg); go(); } else go();
  };
  useEffect(() => {
    const id = sessionStorage.getItem('pw.openPatch'); if (!id || loading || !patches.length) return;
    const p = patches.find((x) => x.id === id); if (!p) return;
    sessionStorage.removeItem('pw.openPatch'); editPatch(p);
  }, [loading, patches.length]); // eslint-disable-line
  const pushPatchesExcluding = (id: string) => {
    const list = patches.filter((p) => visibleRef.current.has(p.id) && p.id !== id).map((p) => ({ id: p.id, title: p.title, page: p.page, target: p.target, ops: p.ops }));
    send('setPatches', { patches: list });
  };
  const toggleLayer = (id: string) => setVisible((v) => { const n = new Set(v); n.has(id) ? n.delete(id) : n.add(id); return n; });

  /* ---- saving ---- */
  const save = async (submit: boolean) => {
    if (!draft || !draft.ops.length) return;
    const title = draft.title.trim() || autoTitle(draft, sel) || 'Untitled patch';
    const body = { title, ops: draft.ops.map(({ label, _k, ...o }: any) => o), target: draft.target, page: draft.scope === 'all' ? '*' : draft.page, baseHash: pageHash };
    const p = await run('save', async () => {
      const p = draft.patchId ? await api(`/patches/${draft.patchId}`, 'PUT', body) : await api(`/sites/${siteId}/patches`, 'POST', body);
      if (submit) await api(`/patches/${p.id}/submit`, 'POST', {});
      return p;
    }, submit ? 'Patch saved and sent for review' : 'Patch saved as draft');
    if (!p) return;
    setDraft(null); setSel(null); send('deselect'); await refresh();
    setVisible((v) => new Set(v).add(p.id));
    try {
      const cs: any[] = await api(`/sites/${siteId}/conflicts`);
      const mine = cs.filter((c) => (c.a === p.id || c.b === p.id) && c.severity === 'high');
      if (mine.length) toast(`Heads up: this patch conflicts with another (${mine[0].message}) — resolve it in Patches.`, 'info');
    } catch { /* ignore */ }
  };
  const discard = () => { setDraft(null); setSel(null); send('deselect'); send('clearPreview'); pushPatches(); };

  /* ---- AI ---- */
  const askOutline = () => new Promise<string>((res) => { const id = Math.random().toString(36).slice(2); outlineReq.current[id] = res; send('outline', { reqId: id }); setTimeout(() => res(''), 1500); });
  const askAI = async () => {
    if (!prompt.trim()) return;
    const outline = await askOutline();
    const selected = sel ? { tag: sel.tag, text: sel.text?.slice(0, 120), attrs: sel.attrs, style: sel.style, html: sel.html } : null;
    const out = await run('ai', () => api('/ai/patch', 'POST', { prompt, selected, outline }));
    if (!out) return;
    setAiNote(out);
    if (!out.ops?.length) { toast(out.explanation || 'No changes suggested.', 'info'); return; }
    if (sel) { setDraft((d) => { const base = d || { title: '', titleTouched: false, ops: [], target: sel.descriptor, page: path, scope: 'page' as const }; return { ...base, ops: mergeOps(base.ops, out.ops), title: base.titleTouched ? base.title : out.title, titleTouched: base.titleTouched }; }); setTimeout(() => setOps((o) => o), 0); setTimeout(() => previewOps(mergeOps(draftRef.current?.ops || [], [])), 60); }
    else if (out.targetSelector) { pendingRef.current = { aiOps: out.ops, aiTitle: out.title }; send('resolve', { selector: out.targetSelector }); }
    else toast('Select an element first, or describe which element you mean.', 'info');
    setPrompt('');
  };
  const mergeOps = (a: Op[], b: Op[]) => { const keys = new Set(b.map(opKey)); return [...a.filter((o) => !keys.has(opKey(o))), ...b]; };
  useEffect(() => { if (draft && draft.ops.length) previewOps(draft.ops); }, [aiNote]); // eslint-disable-line

  const others = presence.filter((p: any) => p.user !== user.id && p.activity);

  return (
    <div className="editor">
      {/* ----------------------------- layers */}
      <aside className="ed-left">
        <div className="ed-panel-head"><I.Layers size={16} className="muted" /><h4>Patches</h4><span className="spacer" />
          <Seg value={layerFilter} onChange={setLayerFilter} options={[{ v: 'page', label: 'This page' }, { v: 'all', label: 'All' }]} /></div>
        {others.length > 0 && <div style={{ padding: '8px 14px 0' }}>{others.map((o: any) => <div key={o.user} className="row small" style={{ padding: '6px 10px', background: 'var(--warn-soft)', borderRadius: 9, marginBottom: 6 }}><Avatar id={o.user} size="sm" /><span><b>{app.userOf(o.user)?.name.split(' ')[0]}</b> is {o.activity}</span></div>)}</div>}
        <div className="ed-scroll" style={{ padding: '8px 0' }}>
          {layerList.length === 0 && <Empty icon={I.Layers} title="No patches here yet">Click any element on the page to start your first patch.</Empty>}
          {layerList.map((p) => {
            const st = frameState[p.id];
            return <div key={p.id} className={`layer ${draft?.patchId === p.id ? 'on' : ''}`} onClick={() => editPatch(p)}>
              <button className={`eye ${visible.has(p.id) ? 'on' : ''}`} title={visible.has(p.id) ? 'Hide this patch on the canvas' : 'Show this patch on the canvas'} onClick={(e) => { e.stopPropagation(); toggleLayer(p.id); }}>{visible.has(p.id) ? <I.Eye size={16} /> : <I.EyeOff size={16} />}</button>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="trunc bold" style={{ fontSize: 13 }}>{p.title}</div>
                <div className="row gap-sm tiny muted" style={{ marginTop: 2 }}><Status s={p.status} dot={false} /><span>{p.ops.length} change{p.ops.length > 1 ? 's' : ''}</span>
                  {st && st.status && st.status !== 'skipped' && <span title={`Tracking: ${st.status}`}>· {st.status === 'healed' ? `healed ${Math.round((st.confidence || 0) * 100)}%` : st.status}</span>}</div>
              </div>
              <Avatar id={p.author} size="sm" />
            </div>;
          })}
        </div>
        <div style={{ padding: 12, borderTop: '1px solid var(--line)' }} className="tiny muted">
          <I.Eye size={12} style={{ verticalAlign: -2 }} /> Toggle the eye to overlay a patch on the canvas. For the most accurate targeting, select elements while no layers are visible.
        </div>
      </aside>

      {/* ----------------------------- canvas */}
      <section className="ed-center">
        <div className="ed-toolbar">
          <Seg value={mode} onChange={setMode} options={[{ v: 'select', label: 'Select', icon: I.MousePointer2, title: 'Click elements to patch them' }, { v: 'interact', label: 'Browse', icon: I.Hand, title: 'Use the site normally (navigate, click)' }]} />
          <div className="pill-nav">{pages.map((p) => <Btn key={p} size="sm" className={path === p ? 'active' : ''} onClick={() => { if (!draft?.ops.length || confirm('Discard unsaved changes?')) { setDraft(null); setPath(p); } }}>{p}</Btn>)}</div>
          <span className="spacer" />
          <Seg value={device} onChange={setDevice} options={(Object.keys(DEVICES) as Device[]).map((d) => ({ v: d, icon: DEVICES[d].icon, title: DEVICES[d].label }))} />
          <div className="row gap-sm" title="Toggle the live preview of your unsaved edits"><span className="small muted">Preview edits</span><Switch on={showPreview} onChange={toggleShow} /></div>
          <Btn size="sm" icon={I.RefreshCw} onClick={() => { setLoading(true); setFrameSrc(siteUrl({ kind: 'none' }, true, path) + '?r=' + Date.now()); }} title="Reload page" />
        </div>
        <div className="ed-stage" style={{ position: 'relative' }}>
          <div className="ed-frame" style={{ width: DEVICES[device].w, maxWidth: '100%' }}>
            <div className="chrome"><i /><i /><i /><div className="url">{frameSrc.replace('http://', '').replace('edit.none.', '')}</div></div>
            {frameSrc && <iframe ref={iframe} src={frameSrc} title="Site canvas" onLoad={() => setTimeout(() => send('ping'), 200)} />}
            {loading && <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,.55)' }}><I.Loader2 className="muted" style={{ animation: 'spin 1s linear infinite' }} /></div>}
          </div>
          {mode === 'select' && !sel && !loading && <div className="hint-tip">Click any element to inspect and patch it · <span className="kbd">↑</span><span className="kbd">↓</span> parent / child · <span className="kbd">Esc</span> clear</div>}
        </div>
        <div className="ai-bar">
          <div className="badge accent"><I.Sparkles size={13} /> AI</div>
          <input className="input" placeholder={sel ? `Describe a change to the selected <${sel.tag}> — e.g. “make it green and rounded”` : 'Describe a change — e.g. “hide the hero button” (select an element first for best results)'} value={prompt}
            onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && askAI()} />
          <Btn variant="primary" icon={I.WandSparkles} loading={busy === 'ai'} onClick={askAI} disabled={!prompt.trim()}>Generate</Btn>
        </div>
        {aiNote && <div style={{ padding: '8px 16px', background: 'var(--surface)', borderTop: '1px solid var(--line)' }} className="row small">
          <span className={`badge ${aiNote.provider === 'claude' ? 'accent' : ''}`}>{aiNote.provider === 'claude' ? `Claude · ${aiNote.model}` : 'Rule-based assistant'}</span><span className="ink2">{aiNote.explanation}</span>
          {aiNote.warning && <span className="muted tiny">· {aiNote.warning}</span>}<span className="spacer" /><Btn variant="ghost" size="sm" icon={I.X} onClick={() => setAiNote(null)} /></div>}
      </section>

      {/* ----------------------------- inspector */}
      <aside className="ed-right">
        <div className="ed-panel-head"><I.SlidersHorizontal size={16} className="muted" /><h4>Inspector</h4><span className="spacer" />
          {draft?.patchId && <span className="badge accent">Editing existing</span>}</div>
        {!sel ? <div className="ed-scroll"><Empty icon={I.MousePointerClick} title="Nothing selected">Select an element on the page to edit its text, styles and behaviour. Every change becomes a small, reversible patch.</Empty></div> :
          <Inspector sel={sel} draft={draft} setDraft={setDraft} addOp={addOp} open={open} setOpen={setOpen} send={send} user={user} removeAt={removeAt}
            frameState={frameState} patches={patches} onSave={save} onDiscard={discard} busy={busy} autoTitle={autoTitle} />}
      </aside>
    </div>
  );
}

/* ====================================================================== inspector */
function Section({ id, title, icon: Icon, open, setOpen, children, badge }: any) {
  return <div className="sec"><div className="sec-h" onClick={() => setOpen({ ...open, [id]: !open[id] })}><Icon size={14} className="muted" />{title}{badge ? <span className="badge accent">{badge}</span> : null}<span className="spacer" />{open[id] ? <I.ChevronUp size={14} className="muted" /> : <I.ChevronDown size={14} className="muted" />}</div>{open[id] && <div className="sec-b">{children}</div>}</div>;
}

function Inspector({ sel, draft, setDraft, addOp, open, setOpen, send, user, removeAt, frameState, patches, onSave, onDiscard, busy, autoTitle }: any) {
  const ops: Op[] = draft?.ops || [];
  const get = (k: string) => ops.find((o) => o.type === 'setStyle' && o.prop === k)?.value;
  const setStyle = (prop: string, value: string | null) => addOp({ type: 'setStyle', prop, value }, value == null || value === '');
  const attrOp = (name: string) => ops.find((o) => o.type === 'setAttr' && o.name === name);
  const textOp = ops.find((o) => o.type === 'setText');
  const hidden = ops.some((o) => o.type === 'remove');
  const countFor = (kinds: string[]) => ops.filter((o) => kinds.includes(o.type)).length;
  const patchedBy = patches.filter((p: Patch) => ['live', 'approved', 'review', 'draft'].includes(p.status) && p.target?.selector === sel.descriptor.selector && p.id !== draft?.patchId);
  const [attrName, setAttrName] = useState(''); const [attrVal, setAttrVal] = useState('');
  const [css, setCss] = useState(''); const [html, setHtml] = useState(''); const [ins, setIns] = useState({ position: 'afterend', html: '' }); const [js, setJs] = useState('');
  const cur = (k: string, f: (v: string) => any = (x) => x) => f(get(k) ?? sel.style[k] ?? '');

  return <>
    <div className="ed-scroll">
      <div className="target-card">
        <div className="row between"><span className="badge accent mono">&lt;{sel.tag}&gt;</span><span className="tiny muted">{sel.rect.w} × {sel.rect.h}px</span></div>
        <div className="crumbs" style={{ marginTop: 8 }}>{sel.crumbs.map((c: string, i: number) => <span key={i}>{i === sel.crumbs.length - 1 ? <b>{c}</b> : c}{i < sel.crumbs.length - 1 && ' ›'}</span>)}</div>
        {sel.text && <div className="small ink2 trunc" style={{ marginTop: 8 }}>“{sel.text.slice(0, 70)}”</div>}
        <div className="row gap-sm" style={{ marginTop: 10 }}>
          <Btn size="sm" icon={I.CornerLeftUp} onClick={() => send('selectRelative', { dir: 'parent' })}>Parent</Btn>
          <Btn size="sm" icon={I.CornerRightDown} onClick={() => send('selectRelative', { dir: 'child' })}>Child</Btn>
          <Btn size="sm" icon={I.ArrowLeft} onClick={() => send('selectRelative', { dir: 'prev' })} title="Previous sibling" />
          <Btn size="sm" icon={I.ArrowRight} onClick={() => send('selectRelative', { dir: 'next' })} title="Next sibling" />
        </div>
        {patchedBy.length > 0 && <div className="small" style={{ marginTop: 10, color: 'var(--warn)' }}><I.TriangleAlert size={12} style={{ verticalAlign: -2 }} /> Also patched by: {patchedBy.map((p: Patch) => p.title).join(', ')}</div>}
      </div>

      <Section id="content" title="Content" icon={I.Type} open={open} setOpen={setOpen} badge={countFor(['setText']) || null}>
        <Field label="Text" hint={sel.hasChildElements ? 'Only this element’s own text is replaced; inner elements are kept.' : undefined}>
          <textarea className="textarea" rows={2} value={textOp ? textOp.value : sel.ownText || sel.text || ''} onChange={(e) => addOp({ type: 'setText', value: e.target.value, node: sel.hasChildElements ? 'own' : 'all' })} />
        </Field>
        <div className="row between"><div><div className="bold small">Hide this element</div><div className="tiny muted">Removes it from view (reversible)</div></div><Switch on={hidden} onChange={(v) => addOp({ type: 'remove' }, !v)} /></div>
      </Section>

      <Section id="appearance" title="Appearance" icon={I.Palette} open={open} setOpen={setOpen} badge={countFor(['setStyle']) || null}>
        <div className="grid g2" style={{ gap: 10 }}>
          <Field label="Text colour"><div className="row gap-sm"><input type="color" value={rgbToHex(cur('color'))} onChange={(e) => setStyle('color', e.target.value)} /><input className="input sm" value={get('color') ?? rgbToHex(sel.style.color)} onChange={(e) => setStyle('color', e.target.value)} /></div></Field>
          <Field label="Background"><div className="row gap-sm"><input type="color" value={rgbToHex(cur('backgroundColor'))} onChange={(e) => setStyle('background-color', e.target.value)} /><input className="input sm" value={get('background-color') ?? rgbToHex(sel.style.backgroundColor)} onChange={(e) => setStyle('background-color', e.target.value)} /></div></Field>
        </div>
        <Field label={`Font size · ${Math.round(px(get('font-size') ?? sel.style.fontSize))}px`}><input type="range" min={10} max={64} value={px(get('font-size') ?? sel.style.fontSize)} onChange={(e) => setStyle('font-size', e.target.value + 'px')} /></Field>
        <Field label={`Corner radius · ${Math.round(px(get('border-radius') ?? sel.style.borderRadius))}px`}><input type="range" min={0} max={48} value={px(get('border-radius') ?? sel.style.borderRadius)} onChange={(e) => setStyle('border-radius', e.target.value + 'px')} /></Field>
        <Field label={`Opacity · ${Math.round(Number(get('opacity') ?? sel.style.opacity) * 100)}%`}><input type="range" min={0} max={100} value={Number(get('opacity') ?? sel.style.opacity) * 100} onChange={(e) => setStyle('opacity', String(Number(e.target.value) / 100))} /></Field>
        <div className="grid g2" style={{ gap: 10 }}>
          <Field label="Weight"><select className="select" value={get('font-weight') ?? sel.style.fontWeight} onChange={(e) => setStyle('font-weight', e.target.value)}>{['300', '400', '500', '600', '700', '800'].map((w) => <option key={w}>{w}</option>)}</select></Field>
          <Field label="Align"><select className="select" value={get('text-align') ?? sel.style.textAlign} onChange={(e) => setStyle('text-align', e.target.value)}>{['start', 'left', 'center', 'right'].map((w) => <option key={w}>{w}</option>)}</select></Field>
          <Field label="Padding"><input className="input sm" placeholder="e.g. 12px 24px" value={get('padding') ?? ''} onChange={(e) => setStyle('padding', e.target.value)} /></Field>
          <Field label="Margin"><input className="input sm" placeholder="e.g. 0 auto" value={get('margin') ?? ''} onChange={(e) => setStyle('margin', e.target.value)} /></Field>
        </div>
      </Section>

      <Section id="attrs" title="Attributes & behaviour" icon={I.Settings2} open={open} setOpen={setOpen} badge={countFor(['setAttr']) || null}>
        {Object.entries(sel.attrs).filter(([k]) => !['style', 'class'].includes(k)).map(([k, v]: any) => {
          const o = attrOp(k); const removed = o && o.value == null;
          return <div key={k} className="row gap-sm" style={{ opacity: removed ? .55 : 1 }}>
            <span className="mono small" style={{ width: 82, flexShrink: 0 }} title={k}>{k}</span>
            <input className="input sm" disabled={removed} value={o && o.value != null ? o.value : v} onChange={(e) => addOp({ type: 'setAttr', name: k, value: e.target.value })} />
            <Btn size="sm" icon={removed ? I.Undo2 : I.Trash2} title={removed ? 'Keep attribute' : 'Remove attribute'} variant={removed ? '' : k === 'disabled' ? 'primary' : ''} onClick={() => addOp({ type: 'setAttr', name: k, value: null }, !!removed)}>{k === 'disabled' && !removed ? 'Enable' : ''}</Btn>
          </div>;
        })}
        <div className="row gap-sm"><input className="input sm" placeholder="name" style={{ width: 90 }} value={attrName} onChange={(e) => setAttrName(e.target.value)} /><input className="input sm" placeholder="value" value={attrVal} onChange={(e) => setAttrVal(e.target.value)} />
          <Btn size="sm" icon={I.Plus} disabled={!attrName} onClick={() => { addOp({ type: 'setAttr', name: attrName.trim(), value: attrVal }); setAttrName(''); setAttrVal(''); }} /></div>
      </Section>

      <Section id="advanced" title="Advanced" icon={I.Code2} open={open} setOpen={setOpen} badge={countFor(['css', 'setHTML', 'insert', 'injectJS']) || null}>
        <Field label="Custom CSS rule"><textarea className="textarea mono" rows={2} placeholder={'.btn:hover { filter: brightness(1.1) }'} value={css} onChange={(e) => setCss(e.target.value)} /></Field>
        <Btn size="sm" disabled={!css.trim()} onClick={() => { addOp({ type: 'css', rule: css, _k: Math.random() }); setCss(''); }} icon={I.Plus}>Add CSS</Btn>
        <Field label="Replace inner HTML"><textarea className="textarea mono" rows={2} value={html} onChange={(e) => setHtml(e.target.value)} placeholder="<strong>Hello</strong>" /></Field>
        <Btn size="sm" disabled={!html.trim()} onClick={() => { addOp({ type: 'setHTML', value: html }); setHtml(''); }} icon={I.Plus}>Replace HTML</Btn>
        <Field label="Insert new element next to this one">
          <div className="row gap-sm"><select className="select" style={{ width: 120 }} value={ins.position} onChange={(e) => setIns({ ...ins, position: e.target.value })}>{['beforebegin', 'afterbegin', 'beforeend', 'afterend'].map((p) => <option key={p}>{p}</option>)}</select></div>
          <textarea className="textarea mono" rows={2} value={ins.html} onChange={(e) => setIns({ ...ins, html: e.target.value })} placeholder={'<div class="note">New note</div>'} />
        </Field>
        <Btn size="sm" disabled={!ins.html.trim()} onClick={() => { addOp({ type: 'insert', position: ins.position, html: ins.html, _k: Math.random() }); setIns({ ...ins, html: '' }); }} icon={I.Plus}>Insert element</Btn>
        <Field label="Custom script" hint={user.role === 'admin' ? 'Runs with `el` = the target element. Needs admin approval; blocked by verification if it throws.' : 'Only admins can add scripts.'}>
          <textarea className="textarea mono" rows={2} disabled={user.role !== 'admin'} value={js} onChange={(e) => setJs(e.target.value)} placeholder="el.addEventListener('click', () => console.log('hi'))" />
        </Field>
        <Btn size="sm" disabled={!js.trim() || user.role !== 'admin'} onClick={() => { addOp({ type: 'injectJS', code: js, _k: Math.random() }); setJs(''); }} icon={I.Plus}>Add script</Btn>
        <div className="tiny muted">Drag the <b>⠿</b> handle on the canvas to move an element.</div>
      </Section>
    </div>

    {/* draft footer */}
    <div style={{ borderTop: '1px solid var(--line)', padding: 14, background: 'var(--surface-2)', display: 'flex', flexDirection: 'column', gap: 10, maxHeight: '46%', overflow: 'auto' }}>
      <div className="row between"><div className="eyebrow">Your patch · {ops.length} change{ops.length === 1 ? '' : 's'}</div>
        {draft && <Seg value={draft.scope} onChange={(v: any) => setDraft({ ...draft, scope: v })} options={[{ v: 'page', label: 'This page' }, { v: 'all', label: 'All pages' }]} />}</div>
      {ops.length === 0 ? <div className="small muted">Make a change above and it will appear here. Nothing is published until it is reviewed, verified and released.</div> :
        <div className="col" style={{ gap: 6 }}>{ops.map((o, i) => <div key={i} className="opchip"><I.CircleDot size={12} /><span className="trunc">{describeOp(o)}</span><button onClick={() => removeAt(i)} title="Remove this change"><I.X size={13} /></button></div>)}</div>}
      <input className="input" placeholder={draft ? autoTitle(draft, sel) || 'Name this patch' : 'Name this patch'} value={draft?.title || ''} onChange={(e) => setDraft(draft ? { ...draft, title: e.target.value, titleTouched: true } : draft)} />
      <div className="row"><Btn onClick={onDiscard} icon={I.Undo2} size="sm" title="Discard these changes" /><span className="spacer" />
        <Btn size="sm" disabled={!ops.length} loading={busy === 'save'} onClick={() => onSave(false)}>Save draft</Btn>
        <Btn size="sm" variant="primary" disabled={!ops.length} loading={busy === 'save'} onClick={() => onSave(true)} icon={I.Send}>Submit</Btn></div>
    </div>
  </>;
}

