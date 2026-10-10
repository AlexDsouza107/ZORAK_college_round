// Mini visual editor injected into the page on demand: pick an element, tweak it, send it to PATCHWORK as a draft patch.
(function () {
  const Core = window.PWCore, PW = window.__PW__, B = window.__PW_BOOT__;
  if (window.__PW_PANEL__) { window.__PW_PANEL__.toggle(); return; }
  if (!Core || !PW || !B) { alert('PATCHWORK: this site is not registered, or the server is offline.'); return; }

  const host = document.createElement('div'); host.setAttribute('data-pw-ui', '');
  host.style.cssText = 'all:initial;position:fixed;inset:0;z-index:2147483647;pointer-events:none';
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `<style>
    *{box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif}
    .cap{position:fixed;inset:0;pointer-events:auto;cursor:crosshair}
    .box{position:fixed;display:none;border-radius:3px;pointer-events:none}.hv{border:1.5px solid rgba(91,75,219,.55);background:rgba(91,75,219,.07)}.sl{border:2px solid #5b4bdb;background:rgba(91,75,219,.1);box-shadow:0 0 0 4px rgba(91,75,219,.14)}
    .panel{position:fixed;right:18px;bottom:18px;width:318px;background:#fff;color:#1c1b22;border:1px solid #e8e5dd;border-radius:18px;box-shadow:0 24px 60px -20px rgba(28,27,34,.35);pointer-events:auto;font-size:13px;overflow:hidden}
    .hd{display:flex;align-items:center;gap:8px;padding:12px 14px;border-bottom:1px solid #e8e5dd;background:#faf9f6}.hd b{font-family:'Iowan Old Style',Georgia,serif;font-size:16px}.logo{width:22px;height:22px;border-radius:7px;background:linear-gradient(145deg,#6f5ff0,#4a3bc8)}
    .x{margin-left:auto;border:0;background:none;cursor:pointer;font-size:18px;color:#8a8795}.bd{padding:12px 14px;display:flex;flex-direction:column;gap:10px;max-height:60vh;overflow:auto}
    label{font-size:11.5px;font-weight:600;color:#4a4856;display:block;margin-bottom:4px}input[type=text],textarea{width:100%;border:1px solid #d8d4c8;border-radius:9px;padding:7px 9px;font-size:13px;outline:none}input[type=text]:focus,textarea:focus{border-color:#5b4bdb;box-shadow:0 0 0 3px #eeebff}
    .row{display:flex;gap:8px;align-items:center}.btn{border:1px solid #d8d4c8;background:#fff;border-radius:9px;padding:6px 11px;font-weight:600;font-size:12.5px;cursor:pointer}.btn.p{background:#5b4bdb;border-color:#4a3cc4;color:#fff}.btn:disabled{opacity:.5}
    .tag{display:inline-block;background:#eeebff;color:#4338ca;border-radius:99px;padding:2px 9px;font:600 11px ui-monospace,Menlo,monospace}.muted{color:#8a8795;font-size:11.5px}.ops{display:flex;flex-direction:column;gap:4px}.op{background:#eeebff;border:1px solid #d5cffa;color:#4338ca;border-radius:8px;padding:4px 8px;font-size:11.5px;font-weight:600;display:flex;justify-content:space-between}.op button{border:0;background:none;color:inherit;cursor:pointer}
    .toast{padding:8px 10px;border-radius:9px;font-size:12px;font-weight:600}.toast.ok{background:#e6f5ee;color:#1b8a5f}.toast.err{background:#fbe9ec;color:#c8374a}
  </style><div class="cap" id="cap"></div><div class="box hv" id="hv"></div><div class="box sl" id="sl"></div>
  <div class="panel"><div class="hd"><div class="logo"></div><b>Patchwork</b><span class="muted">${B.site}</span><button class="x" id="close" title="Close">×</button></div><div class="bd" id="bd"></div></div>`;
  document.documentElement.appendChild(host);
  const $ = (id) => root.getElementById(id);
  let sel = null, hov = null, ops = [], msg = null, title = '';
  const isUi = (n) => n && n.closest && n.closest('[data-pw-ui]');
  const at = (x, y) => document.elementsFromPoint(x, y).find((n) => !isUi(n) && n !== host) || null;
  const place = (box, el) => { if (!el || !el.isConnected) { box.style.display = 'none'; return; } const r = el.getBoundingClientRect(); Object.assign(box.style, { display: 'block', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' }); };
  (function loop() { place($('sl'), sel); place($('hv'), hov && hov !== sel ? hov : null); requestAnimationFrame(loop); })();
  $('cap').addEventListener('mousemove', (e) => { hov = at(e.clientX, e.clientY); });
  $('cap').addEventListener('click', (e) => { const el = at(e.clientX, e.clientY); if (el) pick(el); });
  $('close').addEventListener('click', close);
  function close() { PW.revertTemp('draft'); host.remove(); window.__PW_PANEL__ = null; }
  window.__PW_PANEL__ = { toggle: () => { host.style.display = host.style.display === 'none' ? '' : 'none'; } };

  const key = (o) => o.type + (o.prop || o.name || '');
  const setOp = (o, drop) => { ops = ops.filter((x) => key(x) !== key(o)); if (!drop) ops.push(o); PW.applyTemp('draft', sel, ops); render(); };
  function pick(el) { PW.revertTemp('draft'); sel = el; ops = []; msg = null; render(); }
  const cs = () => getComputedStyle(sel);
  const hex = (v) => { const m = String(v).match(/\d+/g); return m ? '#' + m.slice(0, 3).map((x) => (+x).toString(16).padStart(2, '0')).join('') : '#000000'; };

  function render() {
    const bd = $('bd');
    if (!sel) { bd.innerHTML = '<div class="muted">Click any element on the page to patch it. Your change previews instantly and is sent to Patchwork Studio as a <b>draft</b> for review — nothing goes live until it is verified and released.</div>'; return; }
    const st = cs(), disabled = sel.hasAttribute('disabled'), own = [...sel.childNodes].filter((n) => n.nodeType === 3).map((n) => n.nodeValue).join('').trim();
    const fs = parseFloat(st.fontSize) || 14;
    bd.innerHTML = `<div class="row"><span class="tag">&lt;${sel.tagName.toLowerCase()}&gt;</span><span class="muted">${Math.round(sel.getBoundingClientRect().width)}×${Math.round(sel.getBoundingClientRect().height)}</span></div>
      <div><label>Text</label><input type="text" id="txt" value="${(ops.find((o) => o.type === 'setText')?.value ?? (own || sel.textContent.trim().slice(0, 80))).replace(/"/g, '&quot;')}"></div>
      <div class="row"><div style="flex:1"><label>Text colour</label><input type="color" id="col" value="${hex(ops.find((o) => o.prop === 'color')?.value || st.color)}"></div><div style="flex:1"><label>Background</label><input type="color" id="bg" value="${hex(ops.find((o) => o.prop === 'background-color')?.value || st.backgroundColor)}"></div></div>
      <div><label>Font size · ${Math.round(fs)}px</label><input type="range" id="fs" min="10" max="60" value="${fs}" style="width:100%"></div>
      <div class="row">${disabled ? '<button class="btn p" id="en">Enable (remove disabled)</button>' : ''}<button class="btn" id="hide">${ops.some((o) => o.type === 'remove') ? 'Unhide' : 'Hide element'}</button></div>
      ${ops.length ? '<div class="ops">' + ops.map((o, i) => `<div class="op"><span>${Core.describeOp(o)}</span><button data-i="${i}">×</button></div>`).join('') + '</div>' : ''}
      <div><label>Patch title</label><input type="text" id="title" placeholder="Describe this fix" value="${title.replace(/"/g, '&quot;')}"></div>
      ${msg ? `<div class="toast ${msg.ok ? 'ok' : 'err'}">${msg.text}</div>` : ''}
      <div class="row"><button class="btn" id="reset">Reset</button><span style="flex:1"></span><button class="btn p" id="save" ${ops.length ? '' : 'disabled'}>Save draft patch</button></div>`;
    const on = (id, ev, fn) => { const n = bd.querySelector('#' + id); if (n) n.addEventListener(ev, fn); };
    on('title', 'input', (e) => { title = e.target.value; });
    on('txt', 'change', (e) => setOp({ type: 'setText', value: e.target.value, node: sel.children.length ? 'own' : 'all' }));
    on('col', 'input', (e) => setOp({ type: 'setStyle', prop: 'color', value: e.target.value }));
    on('bg', 'input', (e) => setOp({ type: 'setStyle', prop: 'background-color', value: e.target.value }));
    on('fs', 'input', (e) => setOp({ type: 'setStyle', prop: 'font-size', value: e.target.value + 'px' }));
    on('en', 'click', () => setOp({ type: 'setAttr', name: 'disabled', value: null }));
    on('hide', 'click', () => setOp({ type: 'remove' }, ops.some((o) => o.type === 'remove')));
    on('reset', 'click', () => { PW.revertTemp('draft'); ops = []; render(); });
    bd.querySelectorAll('.op button').forEach((b) => b.addEventListener('click', () => { ops.splice(+b.dataset.i, 1); PW.applyTemp('draft', sel, ops); render(); }));
    on('save', 'click', () => {
      const name = title.trim() || `Patch ${sel.tagName.toLowerCase()}${sel.id ? '#' + sel.id : ''}`;
      chrome.runtime.sendMessage({ type: 'save-patch', body: { title: name, page: location.pathname, target: Core.describe(sel), ops, baseHash: Core.pageHash(document) } }, (r) => {
        msg = r && r.patch ? { ok: true, text: 'Saved as a draft — open Patchwork Studio to review it.' } : { ok: false, text: (r && r.error) || 'Could not reach Patchwork.' };
        if (r && r.patch) { PW.revertTemp('draft'); ops = []; title = ''; } render();
      });
    });
  }
  render();
})();
