// Runs in every page at document_start (isolated world). Asks the background worker whether this origin is a
// PATCHWORK-managed site; if so the worker injects the patch runtime into the same isolated world.
(function () {
  if (window.__PW_EXT_LOADED__) return; window.__PW_EXT_LOADED__ = true;
  const origin = location.origin;
  const send = (msg) => new Promise((res) => { try { chrome.runtime.sendMessage(msg, (r) => res(chrome.runtime.lastError ? null : r)); } catch (e) { res(null); } });
  // hooks the runtime uses instead of same-origin fetches (page CORS / mixed content would block them)
  window.__PW_EXT__ = {
    fetchConfig: () => send({ type: 'config', origin }),
    report: (data) => { send({ type: 'report', data }); }
  };
  send({ type: 'init', origin });
  chrome.runtime.onMessage.addListener((msg, _s, reply) => {
    if (msg.type === 'state') {
      const st = window.__PW_STATE__ || {}; const list = Object.values(st.patches || {});
      reply({ ready: !!st.ready, release: st.release || null, total: list.length, applied: list.filter((p) => ['exact', 'healed'].includes(p.status)).length, healed: list.filter((p) => p.status === 'healed').length, lost: list.filter((p) => ['orphaned', 'review', 'error'].includes(p.status)).length, site: window.__PW_BOOT__ && window.__PW_BOOT__.site });
    }
  });
})();
