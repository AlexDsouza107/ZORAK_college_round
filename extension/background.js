// Service worker: talks to the PATCHWORK server (page-level fetches would hit CORS / mixed-content limits).
const DEFAULTS = { server: 'http://localhost:4000', user: 'alex', enabled: true };
const tabsInfo = {}; // tabId -> { siteId, site, release }

const settings = async () => ({ ...DEFAULTS, ...(await chrome.storage.local.get(Object.keys(DEFAULTS))) });
async function api(path, method = 'GET', body) {
  const s = await settings();
  const r = await fetch(s.server.replace(/\/$/, '') + '/api' + path, { method, headers: { 'content-type': 'application/json', 'x-pw-user': s.user }, body: method === 'GET' ? undefined : JSON.stringify(body || {}) });
  const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'HTTP ' + r.status); return j;
}
const setBadge = (tabId, text, color = '#5b4bdb') => { chrome.action.setBadgeText({ tabId, text }); chrome.action.setBadgeBackgroundColor({ tabId, color }); };

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  (async () => {
    const tabId = sender.tab && sender.tab.id;
    if (msg.type === 'init') {
      const s = await settings(); if (!s.enabled) return reply(null);
      let j; try { j = await api('/ext/site?origin=' + encodeURIComponent(msg.origin)); } catch (e) { setBadge(tabId, '!', '#c8374a'); return reply(null); }
      if (!j.site) { setBadge(tabId, ''); return reply(null); }
      tabsInfo[tabId] = { siteId: j.site.id, site: j.site, release: j.release };
      const boot = { site: j.site.id, mode: 'live', release: j.release, patches: j.patches, thresholds: j.site.thresholds, pollMs: 4000, edit: false, studioOrigins: [], extension: true };
      await chrome.scripting.executeScript({ target: { tabId }, func: (b) => { window.__PW_BOOT__ = b; }, args: [boot] });
      await chrome.scripting.executeScript({ target: { tabId }, files: ['core.js', 'runtime.js'] });
      setBadge(tabId, j.release ? 'v' + j.release.version : '·');
      return reply({ ok: true });
    }
    if (msg.type === 'config') { const j = await api('/ext/site?origin=' + encodeURIComponent(msg.origin)); if (tabId && tabsInfo[tabId]) setBadge(tabId, j.release ? 'v' + j.release.version : '·'); return reply({ release: j.release, patches: j.patches }); }
    if (msg.type === 'report') { try { await api('/ext/report', 'POST', msg.data); } catch (e) { /* offline */ } return reply(true); }
    if (msg.type === 'save-patch') { const info = tabsInfo[tabId]; if (!info) return reply({ error: 'This site is not registered in PATCHWORK.' }); try { return reply({ patch: await api(`/sites/${info.siteId}/patches`, 'POST', msg.body) }); } catch (e) { return reply({ error: e.message }); } }
    if (msg.type === 'edit') { // from popup
      await chrome.scripting.executeScript({ target: { tabId: msg.tabId }, files: ['panel.js'] }); return reply(true);
    }
    if (msg.type === 'ping') { try { const s = await settings(); const r = await fetch(s.server.replace(/\/$/, '') + '/api/health'); return reply({ ok: r.ok }); } catch (e) { return reply({ ok: false }); } }
    reply(null);
  })().catch((e) => reply({ error: String(e.message || e) }));
  return true;
});
chrome.tabs.onRemoved.addListener((id) => delete tabsInfo[id]);
