const $ = (id) => document.getElementById(id);
const DEFAULTS = { server: 'http://localhost:4000', user: 'alex', enabled: true };
(async () => {
  const s = { ...DEFAULTS, ...(await chrome.storage.local.get(Object.keys(DEFAULTS))) };
  $('server').value = s.server; $('user').value = s.user; $('enabled').checked = s.enabled;
  $('studio').href = s.server;
  $('save').onclick = async () => { await chrome.storage.local.set({ server: $('server').value.trim(), user: $('user').value }); window.close(); };
  $('enabled').onchange = (e) => chrome.storage.local.set({ enabled: e.target.checked });
  const ping = await chrome.runtime.sendMessage({ type: 'ping' });
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const box = $('status');
  if (!ping || !ping.ok) { box.innerHTML = '<span class="badge bad">Server offline</span><div class="muted" style="margin-top:6px">Start Patchwork (<code>npm start</code>) or fix the server URL under Connection.</div>'; $('edit').disabled = true; return; }
  let st = null; try { st = await chrome.tabs.sendMessage(tab.id, { type: 'state' }); } catch (e) { /* no content script */ }
  if (!st || !st.site) { box.innerHTML = '<span class="badge warn">Not a managed site</span><div class="muted" style="margin-top:6px">' + (tab.url ? new URL(tab.url).origin : '') + ' is not registered in Patchwork, so no patches apply here.</div>'; $('edit').disabled = true; return; }
  box.innerHTML = `<div class="muted">Managed site · ${st.site}</div><div class="big">${st.release ? 'Release v' + st.release.version : 'No release'}</div>
    <div class="row"><div><b>${st.applied}/${st.total}</b><span class="muted">patches applied</span></div><div><b>${st.healed}</b><span class="muted">self-healed</span></div><div><b>${st.lost}</b><span class="muted">need attention</span></div></div>`;
  $('edit').onclick = async () => { await chrome.runtime.sendMessage({ type: 'edit', tabId: tab.id }); window.close(); };
})();
