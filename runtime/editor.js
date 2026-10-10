/*
 * PATCHWORK visual-editor overlay. Loaded only inside Studio's iframe (hosts starting with "edit.").
 * Talks to Studio through postMessage:  child -> parent  "pw:*" events,  parent -> child  "pw:*" commands.
 */
(function () {
  'use strict';
  var PW = window.__PW__, Core = window.PWCore, B = window.__PW_BOOT__;
  if (!PW || !Core || window.__PW_EDITOR__) return;
  window.__PW_EDITOR__ = true;

  var mode = 'select';           // select | interact
  var selected = null, hovered = null, highlightEl = null;
  var drag = null;
  var parentWin = window.parent;
  var parentOrigin = (location.ancestorOrigins && location.ancestorOrigins[0]) || null;
  function post(type, data) {
    var msg = Object.assign({ pwEditor: true, type: type }, data || {});
    var targets = parentOrigin && B.studioOrigins.indexOf(parentOrigin) !== -1 ? [parentOrigin] : B.studioOrigins;
    targets.forEach(function (o) { try { parentWin.postMessage(msg, o); } catch (e) { /* wrong origin */ } });
  }
  function isUi(n) { return n && n.closest && n.closest('[data-pw-ui]'); }

  /* ----------------------------------------------------------- overlay UI */
  var host = document.createElement('div');
  host.setAttribute('data-pw-ui', '');
  host.style.cssText = 'all:initial;position:fixed;inset:0;z-index:2147483647;pointer-events:none;';
  var root = host.attachShadow({ mode: 'open' });
  root.innerHTML = '<style>' +
    '.box{position:fixed;pointer-events:none;border-radius:3px;transition:all .08s ease-out;display:none}' +
    '.hover{border:1.5px solid rgba(91,75,219,.55);background:rgba(91,75,219,.07)}' +
    '.sel{border:2px solid #5b4bdb;background:rgba(91,75,219,.10);box-shadow:0 0 0 4px rgba(91,75,219,.14)}' +
    '.hl{border:2px dashed #c7861a;background:rgba(199,134,26,.10)}' +
    '.chip{position:fixed;display:none;font:600 11px/1 -apple-system,system-ui,sans-serif;background:#5b4bdb;color:#fff;padding:5px 8px;border-radius:6px;pointer-events:none;white-space:nowrap;box-shadow:0 4px 12px rgba(40,30,120,.25)}' +
    '.hchip{background:#fff;color:#4338ca;border:1px solid rgba(91,75,219,.35)}' +
    '.handle{position:fixed;display:none;width:22px;height:22px;border-radius:7px;background:#fff;border:1.5px solid #5b4bdb;color:#5b4bdb;font:700 12px/19px system-ui;text-align:center;cursor:grab;pointer-events:auto;box-shadow:0 3px 10px rgba(40,30,120,.2)}' +
    '.drop{position:fixed;display:none;height:3px;background:#5b4bdb;border-radius:2px;pointer-events:none;box-shadow:0 0 0 3px rgba(91,75,219,.2)}' +
    '.capture{position:fixed;inset:0;pointer-events:auto;cursor:crosshair;background:transparent}' +
    '</style><div class="capture" id="cp"></div>' +
    '<div class="box hover" id="hv"></div><div class="box hl" id="hl"></div><div class="box sel" id="sl"></div>' +
    '<div class="chip hchip" id="hc"></div><div class="chip" id="sc"></div><div class="handle" id="hd" title="Drag to move">⠿</div><div class="drop" id="dp"></div>';
  document.documentElement.appendChild(host);
  var $ = function (id) { return root.getElementById(id); };
  var cp = $('cp'), hv = $('hv'), sl = $('sl'), hl = $('hl'), hc = $('hc'), sc = $('sc'), hd = $('hd'), dp = $('dp');

  function label(el) {
    var t = el.tagName.toLowerCase();
    if (el.id) t += '#' + el.id; else if (el.classList.length) t += '.' + el.classList[0];
    var r = el.getBoundingClientRect();
    return t + '  ' + Math.round(r.width) + '×' + Math.round(r.height);
  }
  function place(box, el, chip) {
    if (!el || !el.isConnected) { box.style.display = 'none'; if (chip) chip.style.display = 'none'; return; }
    var r = el.getBoundingClientRect();
    box.style.display = 'block';
    box.style.left = r.left + 'px'; box.style.top = r.top + 'px'; box.style.width = r.width + 'px'; box.style.height = r.height + 'px';
    if (chip) {
      chip.style.display = 'block'; chip.textContent = label(el);
      var top = r.top - 26; if (top < 4) top = r.bottom + 6;
      chip.style.left = Math.max(4, Math.min(r.left, window.innerWidth - 180)) + 'px'; chip.style.top = top + 'px';
    }
  }
  function frame() {
    place(sl, selected, sc);
    place(hv, hovered && hovered !== selected ? hovered : null, hc);
    place(hl, highlightEl, null);
    if (selected && mode === 'select' && selected.isConnected) {
      var r = selected.getBoundingClientRect();
      hd.style.display = 'block'; hd.style.left = Math.max(2, r.left - 11) + 'px'; hd.style.top = Math.max(2, r.top - 11) + 'px';
    } else hd.style.display = 'none';
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* --------------------------------------------------------- selection */
  var STYLE_KEYS = ['color', 'backgroundColor', 'fontSize', 'fontWeight', 'fontFamily', 'textAlign', 'display', 'opacity', 'borderRadius', 'padding', 'margin', 'width', 'height', 'lineHeight', 'letterSpacing', 'borderWidth', 'borderColor', 'boxShadow'];
  function info(el) {
    var cs = getComputedStyle(el), attrs = {}, i;
    for (i = 0; i < el.attributes.length; i++) { var a = el.attributes[i]; if (a.name.indexOf('data-pw') === 0) continue; attrs[a.name] = a.value.slice(0, 200); }
    var style = {}; STYLE_KEYS.forEach(function (k) { style[k] = cs[k]; });
    var crumbs = [], c = el;
    while (c && c.tagName !== 'HTML' && crumbs.length < 6) { crumbs.unshift(c.tagName.toLowerCase() + (c.id ? '#' + c.id : c.classList[0] ? '.' + c.classList[0] : '')); c = c.parentElement; }
    var r = el.getBoundingClientRect();
    return {
      descriptor: Core.describe(el), tag: el.tagName.toLowerCase(), text: (el.textContent || '').trim().slice(0, 300), ownText: Core.describe(el).ownText,
      hasChildElements: el.children.length > 0, attrs: attrs, style: style, crumbs: crumbs, rect: { w: Math.round(r.width), h: Math.round(r.height) },
      html: el.outerHTML.slice(0, 700), patched: !!(PW.getPatches().some(function (p) { var s = PW.state.patches[p.id]; return s && s.selector && el.matches && safeMatches(el, s.selector); }))
    };
  }
  function safeMatches(el, sel) { try { return el.matches(sel); } catch (e) { return false; } }
  function select(el) {
    if (!el || isUi(el)) return;
    if (selected !== el) PW.revertTemp('draft');
    selected = el;
    post('select', { el: info(el) });
  }
  function deselect() { selected = null; PW.revertTemp('draft'); post('select', { el: null }); }

  // A transparent layer captures the pointer in Select mode so that disabled controls (which swallow mouse
  // events in Chrome), links and forms can all be selected without ever triggering the site's own handlers.
  function targetAt(x, y) {
    var list = document.elementsFromPoint(x, y);
    for (var i = 0; i < list.length; i++) { var n = list[i]; if (!isUi(n) && n !== host) return n === document.documentElement ? document.body : n; }
    return null;
  }
  cp.addEventListener('mousemove', function (e) { if (!drag) hovered = targetAt(e.clientX, e.clientY); });
  cp.addEventListener('mouseleave', function () { hovered = null; });
  cp.addEventListener('click', function (e) { if (drag) return; var el = targetAt(e.clientX, e.clientY); if (el) select(el); });
  cp.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  function applyMode() { cp.style.display = mode === 'select' ? 'block' : 'none'; }
  applyMode();
  document.addEventListener('keydown', function (e) {
    if (mode !== 'select' || !selected) return;
    var t = e.target; if (t && /input|textarea|select/i.test(t.tagName)) return;
    if (e.key === 'Escape') { deselect(); e.preventDefault(); }
    else if (e.key === 'ArrowUp' && selected.parentElement && selected.parentElement !== document.documentElement) { select(selected.parentElement); e.preventDefault(); }
    else if (e.key === 'ArrowDown' && selected.firstElementChild) { select(selected.firstElementChild); e.preventDefault(); }
  }, true);

  /* ------------------------------------------------------------- drag */
  hd.addEventListener('pointerdown', function (e) {
    if (!selected) return;
    e.preventDefault(); hd.setPointerCapture(e.pointerId);
    drag = { el: selected, ref: null, pos: null };
    hd.style.cursor = 'grabbing';
  });
  hd.addEventListener('pointermove', function (e) {
    if (!drag) return;
    var els = document.elementsFromPoint(e.clientX, e.clientY).filter(function (n) { return !isUi(n) && !drag.el.contains(n) && n !== document.documentElement && n !== document.body; });
    var ref = els[0]; if (!ref) { dp.style.display = 'none'; drag.ref = null; return; }
    var r = ref.getBoundingClientRect(), rel = (e.clientY - r.top) / Math.max(1, r.height);
    drag.ref = ref; drag.pos = rel < 0.5 ? 'beforebegin' : 'afterend';
    dp.style.display = 'block'; dp.style.left = r.left + 'px'; dp.style.width = r.width + 'px'; dp.style.top = (drag.pos === 'beforebegin' ? r.top - 2 : r.bottom - 1) + 'px';
    hovered = ref;
  });
  hd.addEventListener('pointerup', function (e) {
    if (!drag) return;
    var d = drag; drag = null; dp.style.display = 'none'; hd.style.cursor = 'grab';
    try { hd.releasePointerCapture(e.pointerId); } catch (x) { /* ignore */ }
    if (d.ref) post('move', { ref: Core.describe(d.ref), position: d.pos, refLabel: label(d.ref) });
  });

  /* ------------------------------------------------- commands from Studio */
  function outline() {
    var lines = [], seen = 0;
    var els = document.body.querySelectorAll('h1,h2,h3,button,a,input,label,nav,header,footer,main,section,aside,form,p,img,[role=button]');
    for (var i = 0; i < els.length && seen < 120; i++) {
      var el = els[i]; if (isUi(el) || el.hasAttribute('data-pw-ins')) continue;
      var t = (el.textContent || el.getAttribute('aria-label') || el.getAttribute('alt') || '').replace(/\s+/g, ' ').trim().slice(0, 50);
      lines.push(el.tagName.toLowerCase() + ' ' + Core.cssPath(el) + (t ? ' "' + t + '"' : '')); seen++;
    }
    return lines.join('\n');
  }
  function sendReady() {
    post('ready', { path: location.pathname, title: document.title, pageHash: Core.pageHash(document), state: PW.state.patches, url: location.href });
  }
  window.addEventListener('message', function (e) {
    var d = e.data; if (!d || !d.pwStudio || e.source !== parentWin) return;
    if (B.studioOrigins.indexOf(e.origin) === -1) return;
    switch (d.type) {
      case 'mode': mode = d.mode; applyMode(); if (mode === 'interact') { hovered = null; } break;
      case 'setPatches':
        PW.revertTemp('draft'); PW.setPatches(d.patches || []);
        if (selected && d.reapplyDraft) PW.applyTemp('draft', selected, d.reapplyDraft);
        post('state', { state: PW.state.patches });
        break;
      case 'previewOps': if (selected) { PW.applyTemp('draft', selected, d.ops || []); } break;
      case 'clearPreview': PW.revertTemp('draft'); break;
      case 'selectTarget': {
        var res = Core.locate(document, d.descriptor);
        var el = res.el || res.bestEl;
        if (el) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); select(el); } else post('select', { el: null, notFound: true });
        break;
      }
      case 'resolve': {
        var t; try { t = document.querySelector(d.selector); } catch (x) { t = null; }
        if (t) { t.scrollIntoView({ block: 'center' }); select(t); } else post('select', { el: null, notFound: true });
        break;
      }
      case 'selectRelative': {
        if (!selected) break;
        var n = d.dir === 'parent' ? selected.parentElement : d.dir === 'child' ? selected.firstElementChild : d.dir === 'next' ? selected.nextElementSibling : selected.previousElementSibling;
        if (n && n !== document.documentElement) select(n);
        break;
      }
      case 'deselect': selected = null; PW.revertTemp('draft'); break;
      case 'highlight':
        if (!d.descriptor) highlightEl = null;
        else { var r2 = Core.locate(document, d.descriptor); highlightEl = r2.el || r2.bestEl || null; if (highlightEl && d.scroll) highlightEl.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
        break;
      case 'outline': post('outline', { reqId: d.reqId, outline: outline() }); break;
      case 'navigate': location.href = d.path; break;
      case 'ping': sendReady(); break;
    }
  });
  window.addEventListener('pw:applied', function () { post('state', { state: PW.state.patches }); });
  window.addEventListener('scroll', function () { hovered = null; }, true);

  if (document.readyState === 'complete') sendReady(); else window.addEventListener('load', function () { setTimeout(sendReady, 150); });
})();
