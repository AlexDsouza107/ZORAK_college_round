/*
 * PATCHWORK core — shared by the browser runtime, the server and the drift watcher.
 *  - describe(el)        : builds a multi-signal "fingerprint" of a DOM element
 *  - compare(t, c)       : scores how likely candidate c is the same element as target t
 *  - locate(doc, target) : finds the best element for a stored target (self-healing)
 *  - detectConflicts()   : finds clashing patches (pure data, no DOM)
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PWCore = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var THRESH = { exact: 0.97, healed: 0.7, review: 0.5, selectorKeep: 0.75 };
  var TESTID_KEYS = ['data-testid', 'data-test', 'data-qa', 'data-cy'];
  var TEXT_ATTRS = ['aria-label', 'placeholder', 'title', 'alt'];
  var STABLE_ATTRS = TESTID_KEYS.concat(['name', 'aria-label', 'role', 'type', 'placeholder', 'alt', 'title', 'for', 'href', 'value']);
  var CLICKABLE = { button: 1, a: 1, input: 1 };

  /* ---------------------------------------------------------------- text utils */
  function norm(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim().toLowerCase(); }
  function tokens(s) { return norm(s).split(/[^\p{L}\p{N}]+/u).filter(Boolean); }
  function jaccard(a, b) {
    if (!a.length && !b.length) return null;
    var sa = {}, sb = {}, i, inter = 0, uni = 0;
    for (i = 0; i < a.length; i++) sa[a[i]] = 1;
    for (i = 0; i < b.length; i++) sb[b[i]] = 1;
    for (var k in sa) { uni++; if (sb[k]) inter++; }
    for (var k2 in sb) if (!sa[k2]) uni++;
    return uni ? inter / uni : 0;
  }
  function levRatio(a, b) {
    if (a === b) return 1;
    if (!a.length || !b.length) return 0;
    var prev = [], cur = [], i, j;
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      cur[0] = i;
      for (j = 1; j <= b.length; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1));
      }
      var t = prev; prev = cur; cur = t;
    }
    return 1 - prev[b.length] / Math.max(a.length, b.length);
  }
  function textSim(a, b) {
    var na = norm(a), nb = norm(b);
    if (!na && !nb) return null;
    if (!na || !nb) return 0;
    if (na === nb) return 1;
    var best = Math.max(levRatio(na.slice(0, 160), nb.slice(0, 160)), jaccard(tokens(na), tokens(nb)) || 0);
    var short = na.length <= nb.length ? na : nb, long = na.length <= nb.length ? nb : na;
    if (short.length >= 4 && long.indexOf(short) !== -1) best = Math.max(best, 0.6 + 0.4 * (short.length / long.length));
    return best;
  }
  function round(n) { return Math.round(n * 1000) / 1000; }

  function isGeneratedToken(c) {
    return /\d{4,}/.test(c) || /^(css|sc|jsx|svelte|astro|emotion|_)[-_]?[a-z0-9]{4,}$/i.test(c) ||
      (/^[a-z0-9]{8,}$/i.test(c) && /\d/.test(c) && /[a-z]/i.test(c)) || /^:r[0-9a-z]+:$/.test(c) || /^(ember|react|ng-)\d+/.test(c);
  }
  function stableClasses(el, max) {
    var out = [], list = el.classList || [];
    for (var i = 0; i < list.length && out.length < max; i++) if (!isGeneratedToken(list[i]) && list[i].indexOf('pw-') !== 0) out.push(list[i]);
    return out;
  }
  function cssEscape(s) {
    return (typeof CSS !== 'undefined' && CSS.escape) ? CSS.escape(s) : String(s).replace(/([^\w-])/g, '\\$1');
  }
  function hrefKey(v) {
    try { var u = new URL(v, 'http://x'); return u.pathname + (u.hash || ''); } catch (e) { return v; }
  }

  /* ------------------------------------------------------------ DOM: describe */
  function cssPath(el) {
    var doc = el.ownerDocument;
    function uniq(sel) { try { var l = doc.querySelectorAll(sel); return l.length === 1 && l[0] === el; } catch (e) { return false; } }
    if (el.id && !isGeneratedToken(el.id) && uniq('#' + cssEscape(el.id))) return '#' + cssEscape(el.id);
    for (var i = 0; i < TESTID_KEYS.length; i++) {
      var tv = el.getAttribute(TESTID_KEYS[i]);
      if (tv) { var s = '[' + TESTID_KEYS[i] + '="' + tv.replace(/"/g, '\\"') + '"]'; if (uniq(s)) return s; }
    }
    var segs = [], cur = el;
    while (cur && cur.nodeType === 1 && cur !== doc.documentElement) {
      var seg = cur.tagName.toLowerCase();
      if (cur.id && !isGeneratedToken(cur.id)) { segs.unshift('#' + cssEscape(cur.id)); if (uniq(segs.join(' > '))) return segs.join(' > '); break; }
      var cls = stableClasses(cur, 2);
      if (cls.length) seg += '.' + cls.map(cssEscape).join('.');
      var parent = cur.parentElement;
      if (parent) {
        var same = 0, idx = 0;
        for (var c = parent.firstElementChild; c; c = c.nextElementSibling) { if (c.tagName === cur.tagName) { same++; if (c === cur) idx = same; } }
        if (same > 1) seg += ':nth-of-type(' + idx + ')';
      }
      segs.unshift(seg);
      if (uniq(segs.join(' > '))) return segs.join(' > ');
      cur = parent;
    }
    return segs.join(' > ');
  }
  function xpathOf(el) {
    var parts = [];
    for (var cur = el; cur && cur.nodeType === 1; cur = cur.parentElement) {
      var idx = 1;
      for (var s = cur.previousElementSibling; s; s = s.previousElementSibling) if (s.tagName === cur.tagName) idx++;
      parts.unshift(cur.tagName.toLowerCase() + '[' + idx + ']');
    }
    return '/' + parts.join('/');
  }
  function ownText(el) {
    var t = '';
    for (var n = el.firstChild; n; n = n.nextSibling) if (n.nodeType === 3) t += n.nodeValue + ' ';
    return t.replace(/\s+/g, ' ').trim();
  }
  function visibleText(el) {
    return (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 140);
  }
  function sibDesc(s) {
    if (!s) return null;
    return { tag: s.tagName.toLowerCase(), text: visibleText(s).slice(0, 40) };
  }
  function contextText(el, own) {
    var cur = el.parentElement, depth = 0;
    while (cur && depth < 4 && cur.tagName !== 'BODY') {
      var t = (cur.textContent || '').replace(/\s+/g, ' ').trim();
      if (t.length > own.length + 8) {
        var rest = own ? t.replace(own, '') : t;
        return rest.trim().slice(0, 100);
      }
      cur = cur.parentElement; depth++;
    }
    return '';
  }
  function describe(el) {
    var doc = el.ownerDocument, win = doc.defaultView;
    var tag = el.tagName.toLowerCase();
    var attrs = {};
    for (var i = 0; i < STABLE_ATTRS.length; i++) {
      var a = STABLE_ATTRS[i], v = el.getAttribute(a);
      if (v != null && v !== '') attrs[a] = a === 'href' ? hrefKey(v) : String(v).slice(0, 120);
    }
    var text = visibleText(el);
    var anc = [], cur = el.parentElement;
    while (cur && cur.tagName !== 'HTML' && anc.length < 5) {
      var idx = 1;
      for (var s = cur.previousElementSibling; s; s = s.previousElementSibling) if (s.tagName === cur.tagName) idx++;
      anc.push({
        tag: cur.tagName.toLowerCase(),
        id: cur.id && !isGeneratedToken(cur.id) ? cur.id : undefined,
        classes: stableClasses(cur, 3), role: cur.getAttribute('role') || undefined, idx: idx
      });
      cur = cur.parentElement;
    }
    var r = el.getBoundingClientRect();
    var sx = win ? win.scrollX : 0, sy = win ? win.scrollY : 0;
    return {
      v: 1, tag: tag,
      id: el.id && !isGeneratedToken(el.id) ? el.id : undefined,
      classes: stableClasses(el, 8), attrs: attrs,
      text: text, ownText: ownText(el).slice(0, 120), context: contextText(el, text),
      bbox: { x: Math.round(r.left + sx), y: Math.round(r.top + sy), w: Math.round(r.width), h: Math.round(r.height) },
      vw: win ? win.innerWidth : 0,
      ancestors: anc, siblings: { prev: sibDesc(el.previousElementSibling), next: sibDesc(el.nextElementSibling) },
      childCount: el.children.length, selector: cssPath(el), xpath: xpathOf(el)
    };
  }
  function pageHash(doc) {
    var all = doc.body ? doc.body.getElementsByTagName('*') : [], s = '', n = Math.min(all.length, 500);
    for (var i = 0; i < n; i++) { var e = all[i]; s += e.tagName.charAt(0) + (e.id && !isGeneratedToken(e.id) ? '#' + e.id : '') + ';'; }
    var h = 5381;
    for (var j = 0; j < s.length; j++) h = ((h << 5) + h + s.charCodeAt(j)) | 0;
    return 'ph' + (h >>> 0).toString(16);
  }

  /* ----------------------------------------------------------------- compare */
  function tagSim(t, c) {
    if (t.tag === c.tag) return 1;
    function clickable(d) { return d.tag === 'button' || d.tag === 'a' || (d.tag === 'input' && /button|submit/.test((d.attrs && d.attrs.type) || '')) || (d.attrs && d.attrs.role === 'button'); }
    if (clickable(t) && clickable(c)) return 0.7;
    var hs = /^h[1-6]$/;
    if (hs.test(t.tag) && hs.test(c.tag)) return 0.7;
    if ((t.tag === 'div' || t.tag === 'section' || t.tag === 'span' || t.tag === 'p') && (c.tag === 'div' || c.tag === 'section' || c.tag === 'span' || c.tag === 'p')) return 0.5;
    return 0;
  }
  function ancSim(ta, ca) {
    var n = Math.min(ta.length, ca.length, 4);
    if (!n) return ta.length === ca.length ? 1 : 0.3;
    var tot = 0, wsum = 0;
    for (var i = 0; i < n; i++) {
      var a = ta[i], b = ca[i], s = 0;
      s += 0.4 * (a.tag === b.tag ? 1 : 0);
      if (a.id || b.id) s += 0.3 * (a.id === b.id ? 1 : 0); else s += 0.3;
      var j = jaccard(a.classes || [], b.classes || []);
      s += 0.3 * (j == null ? 1 : j);
      var w = 1 / (i + 1);
      tot += s * w; wsum += w;
    }
    return tot / wsum;
  }
  function sibSim(ts, cs) {
    var parts = [];
    ['prev', 'next'].forEach(function (k) {
      var a = ts && ts[k], b = cs && cs[k];
      if (!a && !b) return;
      if (!a || !b) { parts.push(0); return; }
      parts.push(0.5 * (a.tag === b.tag ? 1 : 0) + 0.5 * (textSim(a.text, b.text) || (a.text === b.text ? 1 : 0)));
    });
    return parts.length ? parts.reduce(function (x, y) { return x + y; }, 0) / parts.length : null;
  }
  function compare(t, c, o) {
    o = o || {};
    var num = 0, den = 0, sig = {};
    function add(name, w, s) { if (s == null || isNaN(s)) return; sig[name] = round(s); num += w * s; den += w; }
    if (t.id) { if (c.id === t.id) add('id', 0.2, 1); else add('id', 0.03, 0); }
    for (var i = 0; i < TESTID_KEYS.length; i++) {
      var k = TESTID_KEYS[i];
      if (t.attrs && t.attrs[k]) { if (c.attrs && c.attrs[k] === t.attrs[k]) add('testid', 0.2, 1); else add('testid', 0.03, 0); break; }
    }
    var keys = Object.keys(t.attrs || {}).filter(function (k) { return TESTID_KEYS.indexOf(k) === -1; });
    if (keys.length) {
      var sum = 0;
      keys.forEach(function (k) {
        var av = t.attrs[k], bv = c.attrs && c.attrs[k];
        if (bv == null) { sum += 0; return; }
        sum += TEXT_ATTRS.indexOf(k) !== -1 ? (textSim(av, bv) || 0) : (norm(av) === norm(bv) ? 1 : 0);
      });
      add('attrs', 0.15, sum / keys.length);
    }
    add('text', 0.3, textSim(t.text, c.text));
    add('context', 0.08, t.context ? textSim(t.context, c.context) : null);
    if (t.classes && t.classes.length) add('classes', 0.05, jaccard(t.classes, c.classes || []) || 0);
    add('tag', 0.1, tagSim(t, c));
    add('structure', 0.1, ancSim(t.ancestors || [], c.ancestors || []));
    add('siblings', 0.05, sibSim(t.siblings, c.siblings));
    if (t.selector) add('selector', 0.03, o.selectorHit ? 1 : 0);
    if (t.bbox && c.bbox && t.vw && c.vw && Math.abs(t.vw - c.vw) < 250) {
      var dx = (t.bbox.x + t.bbox.w / 2) - (c.bbox.x + c.bbox.w / 2), dy = (t.bbox.y + t.bbox.h / 2) - (c.bbox.y + c.bbox.h / 2);
      add('position', 0.04, Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / (Math.max(t.vw, 300) * 0.6)));
    }
    return { score: den ? num / den : 0, signals: sig };
  }

  /* ------------------------------------------------------------------ locate */
  function candidatesFor(doc, target, wide) {
    var out = [], list;
    if (wide) list = doc.body ? doc.body.querySelectorAll('*') : [];
    else {
      var tags = [target.tag];
      if (CLICKABLE[target.tag] || (target.attrs && target.attrs.role === 'button')) tags = ['button', 'a', 'input'];
      if (/^h[1-6]$/.test(target.tag)) tags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
      list = [];
      tags.forEach(function (tg) { var l = doc.getElementsByTagName(tg); for (var i = 0; i < l.length; i++) list.push(l[i]); });
    }
    for (var i = 0; i < list.length && out.length < 3000; i++) {
      var e = list[i], tn = e.tagName;
      if (tn === 'SCRIPT' || tn === 'STYLE' || tn === 'NOSCRIPT' || tn === 'HEAD') continue;
      if (e.hasAttribute('data-pw-ins') || (e.closest && e.closest('[data-pw-ui]'))) continue;
      out.push(e);
    }
    return out;
  }
  function topSignals(sig, good) {
    return Object.keys(sig).filter(function (k) { return good ? sig[k] >= 0.8 : sig[k] < 0.5; });
  }
  function locate(doc, target, opts) {
    opts = opts || {};
    var th = opts.thresholds || THRESH;
    var selHits = [];
    try { selHits = Array.prototype.slice.call(doc.querySelectorAll(target.selector || '')); } catch (e) { selHits = []; }
    function run(wide) {
      var scored = candidatesFor(doc, target, wide).map(function (el) {
        var r = compare(target, describe(el), { selectorHit: selHits.indexOf(el) !== -1 });
        return { el: el, score: r.score, signals: r.signals };
      });
      scored.sort(function (a, b) { return b.score - a.score; });
      return scored;
    }
    var scored = run(false);
    if (!scored.length || scored[0].score < 0.5) { var w = run(true); if (w.length && (!scored.length || w[0].score > scored[0].score)) scored = w; }
    if (!scored.length) return { el: null, status: 'orphaned', confidence: 0, matchedOn: [], changed: [], candidates: [] };
    var best = scored[0], second = scored[1];
    var gap = second ? best.score - second.score : best.score;
    var conf = Math.min(1, best.score + (1 - best.score) * 0.5 * Math.max(0, Math.min(1, gap)));
    var status;
    var selectorOk = selHits.length === 1 && selHits[0] === best.el && best.score >= th.selectorKeep;
    if (selectorOk && best.score >= 0.85) { status = 'exact'; conf = Math.max(conf, 0.97); }
    else if (selectorOk) status = 'healed';
    else if (conf >= th.healed) status = 'healed';
    else if (conf >= th.review) status = 'review';
    else status = 'orphaned';
    if (status === 'healed' && second && gap < 0.04 && !selectorOk) status = 'review';
    return {
      el: status === 'orphaned' ? null : best.el, bestEl: best.el, status: status, confidence: round(conf),
      selectorHit: selectorOk, matchedOn: topSignals(best.signals, true), changed: topSignals(best.signals, false), signals: best.signals,
      candidates: scored.slice(0, 3).map(function (s) { return { score: round(s.score), text: visibleText(s.el).slice(0, 50), tag: s.el.tagName.toLowerCase() }; })
    };
  }

  /* --------------------------------------------------------- page & conflicts */
  function globToRe(p) { return new RegExp('^' + String(p).replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$'); }
  function pageMatches(pattern, path) {
    if (!pattern || pattern === '*') return true;
    return globToRe(pattern).test(path);
  }
  function pagesOverlap(a, b) {
    if (!a || !b || a === '*' || b === '*') return true;
    return a === b || globToRe(a).test(b) || globToRe(b).test(a);
  }
  function opKey(op) {
    switch (op.type) {
      case 'setText': case 'setHTML': return 'content';
      case 'setAttr': return 'attr:' + op.name;
      case 'setStyle': return 'style:' + op.prop;
      case 'addClass': case 'removeClass': return 'class:' + op.name;
      case 'remove': return 'remove';
      case 'move': return 'position';
      default: return null;
    }
  }
  function opValue(op) {
    switch (op.type) {
      case 'setText': case 'setHTML': return op.value;
      case 'setAttr': return op.value == null ? '(removed)' : op.value;
      case 'setStyle': return op.value;
      case 'addClass': return '+' + op.name;
      case 'removeClass': return '-' + op.name;
      case 'move': return (op.position || '') + ' ' + ((op.ref && (op.ref.selector || op.ref.text)) || '');
      default: return '';
    }
  }
  function sameTarget(a, b) {
    if (a.selector && a.selector === b.selector) return true;
    return compare(a, b, { selectorHit: a.selector === b.selector }).score >= 0.82;
  }
  function isAncestorTarget(anc, desc) {
    return (desc.ancestors || []).some(function (x) {
      if (anc.id && x.id === anc.id) return true;
      return x.tag === anc.tag && (anc.classes || []).length > 0 && jaccard(x.classes || [], anc.classes) >= 0.99 && (anc.classes || []).length > 0 && !anc.id;
    });
  }
  /**
   * @param patches array of {id,title,author,page,target,ops,dependsOn,status}
   * @param ctx optional {liveIds:Set-like array} used for dependency checks
   */
  function detectConflicts(patches, ctx) {
    var out = [], ids = {};
    patches.forEach(function (p) { ids[p.id] = p; });
    for (var i = 0; i < patches.length; i++) {
      var A = patches[i];
      (A.dependsOn || []).forEach(function (d) {
        if (!ids[d]) out.push({ id: 'dep:' + A.id + ':' + d, kind: 'missing-dependency', severity: 'high', a: A.id, b: d, key: 'depends', message: A.title + ' depends on ' + d + ', which is not part of this change set.' });
      });
      for (var j = i + 1; j < patches.length; j++) {
        var B = patches[j];
        if (!pagesOverlap(A.page, B.page)) continue;
        var same = sameTarget(A.target, B.target);
        if (same) {
          var ak = {}, bk = {};
          (A.ops || []).forEach(function (o) { var k = opKey(o); if (k) ak[k] = o; });
          (B.ops || []).forEach(function (o) { var k = opKey(o); if (k) bk[k] = o; });
          Object.keys(ak).forEach(function (k) {
            if (bk[k]) {
              var va = opValue(ak[k]), vb = opValue(bk[k]);
              out.push({
                id: (va === vb ? 'dup:' : 'col:') + A.id + ':' + B.id + ':' + k, kind: va === vb ? 'duplicate' : 'collision', severity: va === vb ? 'low' : 'high',
                a: A.id, b: B.id, key: k, aValue: va, bValue: vb, aOp: ak[k], bOp: bk[k],
                message: va === vb ? A.title + ' and ' + B.title + ' make the same change to ' + k + '.' :
                  A.title + ' and ' + B.title + ' both change ' + k + ' on the same element with different values.'
              });
            }
          });
          if (ak.remove && Object.keys(bk).some(function (k) { return k !== 'remove'; })) out.push({ id: 'rm:' + A.id + ':' + B.id, kind: 'target-removed', severity: 'high', a: A.id, b: B.id, key: 'remove', message: A.title + ' removes an element that ' + B.title + ' modifies.' });
          if (bk.remove && Object.keys(ak).some(function (k) { return k !== 'remove'; })) out.push({ id: 'rm:' + B.id + ':' + A.id, kind: 'target-removed', severity: 'high', a: B.id, b: A.id, key: 'remove', message: B.title + ' removes an element that ' + A.title + ' modifies.' });
        } else {
          var aRem = (A.ops || []).some(function (o) { return o.type === 'remove'; });
          var bRem = (B.ops || []).some(function (o) { return o.type === 'remove'; });
          if (aRem && isAncestorTarget(A.target, B.target)) out.push({ id: 'arm:' + A.id + ':' + B.id, kind: 'ancestor-removed', severity: 'medium', a: A.id, b: B.id, key: 'remove', message: A.title + ' removes a container that holds the element patched by ' + B.title + '.' });
          if (bRem && isAncestorTarget(B.target, A.target)) out.push({ id: 'arm:' + B.id + ':' + A.id, kind: 'ancestor-removed', severity: 'medium', a: B.id, b: A.id, key: 'remove', message: B.title + ' removes a container that holds the element patched by ' + A.title + '.' });
        }
      }
    }
    return out;
  }

  function describeOp(op) {
    switch (op.type) {
      case 'setText': return 'Text → "' + String(op.value).slice(0, 60) + '"';
      case 'setHTML': return 'HTML replaced';
      case 'setAttr': return op.value == null ? 'Remove attribute ' + op.name : 'Set ' + op.name + '="' + String(op.value).slice(0, 50) + '"';
      case 'setStyle': return op.prop + ': ' + op.value;
      case 'addClass': return 'Add class .' + op.name;
      case 'removeClass': return 'Remove class .' + op.name;
      case 'remove': return 'Remove element';
      case 'move': return 'Move ' + (op.position || '') + ' another element';
      case 'insert': return 'Insert new element (' + op.position + ')';
      case 'css': return 'Inject CSS';
      case 'injectJS': return 'Run custom script';
      default: return op.type;
    }
  }

  return {
    THRESH: THRESH, norm: norm, textSim: textSim, describe: describe, compare: compare, locate: locate, pageHash: pageHash,
    pageMatches: pageMatches, pagesOverlap: pagesOverlap, detectConflicts: detectConflicts, opKey: opKey, opValue: opValue, describeOp: describeOp,
    sameTarget: sameTarget, cssPath: cssPath
  };
});
