/*
 * PATCHWORK runtime — injected into every proxied page (and by the Chrome extension).
 * Applies patches non-destructively (every change can be reverted), re-applies them
 * when the page re-renders, self-heals moved elements and reports telemetry.
 */
(function () {
  'use strict';
  var B = window.__PW_BOOT__;
  var Core = window.PWCore;
  if (!B || !Core || window.__PW_RUNTIME__) return;

  var records = {};          // patchId -> { el, reverts[], sig }
  var temp = {};             // owner -> { reverts[] }  (editor previews)
  var jsDone = new WeakMap();
  var reported = {};
  var scheduled = null;
  var lastLocateTry = {};
  var STATE = window.__PW_STATE__ = { mode: B.mode, release: B.release, ready: false, patches: {}, pageHash: null };
  var patches = (B.patches || []).slice();

  function path() { return location.pathname; }
  function log() { if (B.debug) console.log.apply(console, ['[patchwork]'].concat([].slice.call(arguments))); }

  /* ------------------------------------------------------------ operations */
  function setOwnText(el, value) {
    var node = null;
    for (var n = el.firstChild; n; n = n.nextSibling) if (n.nodeType === 3 && n.nodeValue.trim()) { node = n; break; }
    if (!node) { el.insertBefore(document.createTextNode(value), el.firstChild); return; }
    var lead = node.nodeValue.match(/^\s*/)[0], trail = node.nodeValue.match(/\s*$/)[0];
    node.nodeValue = lead + value + trail;
  }
  function currentOwnText(el) {
    var t = '';
    for (var n = el.firstChild; n; n = n.nextSibling) if (n.nodeType === 3) t += n.nodeValue;
    return t.trim();
  }
  var OPS = {
    setText: function (el, op) {
      var own = op.node === 'own' || (op.node !== 'all' && el.children.length > 0);
      if (own ? currentOwnText(el) === op.value : el.textContent === op.value) return null;
      var prev = el.innerHTML;
      if (own) setOwnText(el, op.value); else el.textContent = op.value;
      return function () { el.innerHTML = prev; };
    },
    setHTML: function (el, op) {
      if (el.innerHTML === op.value) return null;
      var prev = el.innerHTML; el.innerHTML = op.value;
      return function () { el.innerHTML = prev; };
    },
    setAttr: function (el, op) {
      var had = el.hasAttribute(op.name), prev = el.getAttribute(op.name);
      if (op.value == null) {
        if (!had) return null;
        el.removeAttribute(op.name);
        if (op.name === 'disabled' && 'disabled' in el) el.disabled = false;
      } else {
        if (had && prev === String(op.value)) return null;
        el.setAttribute(op.name, op.value);
      }
      return function () { if (had) el.setAttribute(op.name, prev); else el.removeAttribute(op.name); };
    },
    setStyle: function (el, op) {
      var pv = el.style.getPropertyValue(op.prop), pp = el.style.getPropertyPriority(op.prop);
      if (pv === op.value && pp === 'important') return null;
      el.style.setProperty(op.prop, op.value, 'important');
      return function () { if (pv) el.style.setProperty(op.prop, pv, pp); else el.style.removeProperty(op.prop); };
    },
    addClass: function (el, op) {
      if (el.classList.contains(op.name)) return null;
      el.classList.add(op.name);
      return function () { el.classList.remove(op.name); };
    },
    removeClass: function (el, op) {
      if (!el.classList.contains(op.name)) return null;
      el.classList.remove(op.name);
      return function () { el.classList.add(op.name); };
    },
    remove: function (el) {
      if (el.hasAttribute('data-pw-removed')) return null;
      var pv = el.style.getPropertyValue('display'), pp = el.style.getPropertyPriority('display');
      el.style.setProperty('display', 'none', 'important'); el.setAttribute('data-pw-removed', '');
      return function () { el.removeAttribute('data-pw-removed'); if (pv) el.style.setProperty('display', pv, pp); else el.style.removeProperty('display'); };
    },
    insert: function (el, op, ctx) {
      var key = ctx.owner + ':' + ctx.idx;
      if (document.querySelector('[data-pw-ins="' + key + '"]')) return null;
      var tpl = document.createElement('template'); tpl.innerHTML = op.html;
      var nodes = [].slice.call(tpl.content.childNodes), first = tpl.content.firstElementChild;
      if (first) first.setAttribute('data-pw-ins', key);
      var frag = tpl.content;
      var pos = op.position || 'afterend';
      if (pos === 'beforebegin') el.parentNode.insertBefore(frag, el);
      else if (pos === 'afterbegin') el.insertBefore(frag, el.firstChild);
      else if (pos === 'beforeend') el.appendChild(frag);
      else el.parentNode.insertBefore(frag, el.nextSibling);
      return function () { nodes.forEach(function (n) { if (n.parentNode) n.parentNode.removeChild(n); }); };
    },
    move: function (el, op) {
      if (!op.ref) return null;
      var res = Core.locate(document, op.ref, { thresholds: B.thresholds });
      var ref = res.el || (res.status === 'review' ? res.bestEl : null);
      if (!ref || ref === el || el.contains(ref)) return null;
      var pos = op.position || 'beforebegin';
      var done = (pos === 'beforebegin' && ref.previousElementSibling === el) || (pos === 'afterend' && ref.nextElementSibling === el) ||
        (pos === 'beforeend' && ref.lastElementChild === el) || (pos === 'afterbegin' && ref.firstElementChild === el);
      if (done) return null;
      var parent = el.parentNode, next = el.nextSibling;
      ref.insertAdjacentElement(pos, el);
      return function () { parent.insertBefore(el, next); };
    },
    css: function (el, op, ctx) {
      var key = ctx.owner + ':' + ctx.idx;
      if (document.querySelector('style[data-pw-css="' + key + '"]')) return null;
      var st = document.createElement('style'); st.setAttribute('data-pw-css', key); st.textContent = op.rule;
      (document.head || document.documentElement).appendChild(st);
      return function () { if (st.parentNode) st.parentNode.removeChild(st); };
    },
    injectJS: function (el, op) {
      var seen = jsDone.get(el) || {};
      if (seen[op.code]) return null;
      seen[op.code] = 1; jsDone.set(el, seen);
      new Function('el', 'PW', op.code)(el, window.__PW__);
      return null;
    }
  };

  function applyOps(el, ops, owner, rec, onError) {
    ops.forEach(function (op, idx) {
      var fn = OPS[op.type];
      if (!fn) return;
      try {
        var rev = fn(el, op, { owner: owner, idx: idx });
        if (rev) rec.reverts.push(rev);
      } catch (e) { onError(e, op, idx); }
    });
  }
  function revertRec(rec) {
    if (!rec) return;
    for (var i = rec.reverts.length - 1; i >= 0; i--) { try { rec.reverts[i](); } catch (e) { /* element gone */ } }
    rec.reverts = [];
  }

  /* ------------------------------------------------------------ telemetry */
  function report(type, data) {
    if (B.mode !== 'live' && B.mode !== 'canary') return;
    var key = type + ':' + (data.patchId || '') + ':' + (data.status || '');
    if (reported[key]) return; reported[key] = 1;
    var payload = Object.assign({ type: type, release: B.release && B.release.id, path: path() }, data);
    if (window.__PW_EXT__) { try { window.__PW_EXT__.report(Object.assign({ siteId: B.site }, payload)); } catch (e) { /* ignore */ } return; }
    var body = JSON.stringify(payload);
    try { if (navigator.sendBeacon) navigator.sendBeacon('/__pw/report', new Blob([body], { type: 'application/json' })); else fetch('/__pw/report', { method: 'POST', body: body, keepalive: true }); } catch (e) { /* ignore */ }
  }

  /* ----------------------------------------------------------- reconcile */
  function applyPatch(p) {
    var st = STATE.patches[p.id] = STATE.patches[p.id] || {};
    if (!Core.pageMatches(p.page, path())) {
      if (records[p.id]) { revertRec(records[p.id]); delete records[p.id]; }
      st.status = 'skipped'; st.reason = 'page'; return;
    }
    var rec = records[p.id];
    var el = rec && rec.el && rec.el.isConnected ? rec.el : null;
    var res = null;
    if (!el) {
      var now = Date.now();
      if (lastLocateTry[p.id] && now - lastLocateTry[p.id] < 250 && st.status === 'orphaned') return;
      lastLocateTry[p.id] = now;
      res = Core.locate(document, p.target, { thresholds: B.thresholds });
      var allowReview = B.mode === 'preview' || B.edit;
      if (res.el || (allowReview && res.status === 'review' && res.bestEl)) {
        el = res.el || res.bestEl;
        if (rec) revertRec(rec);
        rec = records[p.id] = { el: el, reverts: [] };
        st.status = res.status; st.confidence = res.confidence; st.matchedOn = res.matchedOn; st.changed = res.changed;
        st.selector = Core.cssPath(el);
      } else {
        if (rec) { revertRec(rec); delete records[p.id]; }
        st.status = res.status === 'review' ? 'review' : 'orphaned'; st.confidence = res.confidence; st.matchedOn = res.matchedOn; st.changed = res.changed;
        if (B.mode === 'live' || B.mode === 'canary') report(st.status === 'review' ? 'heal' : 'orphan', { patchId: p.id, status: st.status, confidence: res.confidence, matchedOn: res.matchedOn, changed: res.changed });
        return;
      }
      if (res.status === 'healed') report('heal', { patchId: p.id, status: 'healed', confidence: res.confidence, matchedOn: res.matchedOn, changed: res.changed, selector: st.selector });
      var r0 = el.getBoundingClientRect();
      st.bboxBefore = { x: Math.round(r0.left + scrollX), y: Math.round(r0.top + scrollY), w: Math.round(r0.width), h: Math.round(r0.height) };
    }
    var errs = [];
    applyOps(el, p.ops || [], p.id, rec, function (e, op, idx) { errs.push({ message: String(e && e.message || e), op: op.type, idx: idx }); });
    if (errs.length) {
      st.status = 'error'; st.error = errs[0].message;
      report('error', { patchId: p.id, status: 'error', message: errs[0].message, op: errs[0].op });
    }
    var r1 = el.getBoundingClientRect();
    st.bboxAfter = { x: Math.round(r1.left + scrollX), y: Math.round(r1.top + scrollY), w: Math.round(r1.width), h: Math.round(r1.height) };
  }
  function reconcile() {
    scheduled = null;
    patches.forEach(function (p) { try { applyPatch(p); } catch (e) { log('patch failed', p.id, e); STATE.patches[p.id] = { status: 'error', error: String(e && e.message || e) }; } });
    STATE.pageHash = Core.pageHash(document);
    STATE.ready = true;
    window.dispatchEvent(new CustomEvent('pw:applied', { detail: STATE }));
  }
  function schedule() { if (scheduled) return; scheduled = setTimeout(reconcile, 30); }
  function setPatches(list, release) {
    Object.keys(records).forEach(function (id) { revertRec(records[id]); delete records[id]; });
    patches = (list || []).slice(); STATE.patches = {}; lastLocateTry = {}; reported = {};
    if (release !== undefined) { B.release = release; STATE.release = release; }
    reconcile();
  }

  /* ------------------------------------------------- temp (editor preview) */
  function applyTemp(owner, el, ops) {
    revertTemp(owner);
    var rec = temp[owner] = { reverts: [] };
    applyOps(el, ops, 'tmp-' + owner, rec, function (e) { log('preview error', e); });
  }
  function revertTemp(owner) { if (temp[owner]) { revertRec(temp[owner]); delete temp[owner]; } }

  window.__PW__ = {
    boot: B, state: STATE, core: Core, setPatches: setPatches, reconcile: reconcile, applyTemp: applyTemp, revertTemp: revertTemp,
    getPatches: function () { return patches; }, applyOps: OPS
  };
  window.__PW_RUNTIME__ = true;

  /* ------------------------------------------------------------------ boot */
  var mo = new MutationObserver(function () { schedule(); });
  function start() {
    reconcile();
    mo.observe(document.documentElement, { childList: true, subtree: true, attributes: true, characterData: false, attributeFilter: ['class', 'style', 'disabled', 'hidden', 'id', 'href', 'aria-label'] });
  }
  ['pushState', 'replaceState'].forEach(function (m) {
    var orig = history[m];
    history[m] = function () { var r = orig.apply(this, arguments); schedule(); return r; };
  });
  window.addEventListener('popstate', schedule);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
    mo.observe(document, { childList: true, subtree: true });
  } else start();
  window.addEventListener('load', function () { schedule(); setTimeout(schedule, 400); });

  window.addEventListener('error', function (e) {
    report('js_error', { message: String(e.message || '').slice(0, 200), status: String(e.message || '').slice(0, 60) });
  });

  /* live updates: pick up deploys / rollbacks without a reload */
  if (B.mode === 'live' || B.mode === 'canary') {
    setInterval(function () {
      if (document.hidden) return;
      (window.__PW_EXT__ ? window.__PW_EXT__.fetchConfig() : fetch('/__pw/config', { cache: 'no-store' }).then(function (r) { return r.json(); })).then(function (cfg) {
        if (!cfg) return;
        var cur = B.release ? B.release.id : null, next = cfg.release ? cfg.release.id : null;
        if (cur !== next) { log('release changed', cur, '->', next); setPatches(cfg.patches, cfg.release); }
      }).catch(function () { /* offline */ });
    }, B.pollMs || 3000);
  }

  /* editor overlay (only inside Studio) */
  if (B.edit) {
    var s = document.createElement('script');
    s.src = '/__pw/editor.js'; s.defer = true;
    (document.head || document.documentElement).appendChild(s);
  }
})();
