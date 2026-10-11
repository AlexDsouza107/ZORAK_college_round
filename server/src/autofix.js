// "Fix with AI": reads a failed/warned verification, works out what is wrong with the patch set and proposes a
// corrected set. The corrections are deterministic rules (so they are safe and repeatable); Claude, when available,
// only writes the plain-English explanation. The caller re-runs verification on the returned set.
import * as store from './store.js';
import { getVerification } from './verify.js';
import { explainFix } from './ai.js';

const SCRIPT_OPS = new Set(['injectJS']);
const isDestructive = (o) => o.type === 'remove' || (o.type === 'setStyle' && ((o.prop === 'display' && o.value === 'none') || (o.prop === 'visibility' && o.value === 'hidden') || (o.prop === 'opacity' && Number(o.value) === 0)));

export async function proposeFix(siteId, verificationId) {
  const v = getVerification(verificationId);
  if (!v) return null;
  const site = store.mustSite(siteId);
  const rep = v.report || {};
  const checks = rep.checks || [];
  const bad = checks.filter((c) => c.status === 'fail' || c.status === 'warn');
  const active = site.activeReleaseId ? store.getRelease(site.activeReleaseId) : null;
  const byId = (id) => store.getPatch(id);
  const title = (id) => byId(id)?.title || id;

  let ids = [...v.patchIds];
  const actions = [];
  const add = (type, patchId, reason) => { actions.push({ type, patchId, title: title(patchId), reason }); };

  // 1. A release replaces the live set — bring back live patches the candidate silently dropped.
  for (const pid of active?.patchIds || []) {
    if (!ids.includes(pid)) { ids.push(pid); add('add', pid, 'It is live today, and leaving it out removes its fix from the site.'); }
  }

  // 2. Patches that cannot be applied, or that hide too much of the page, are taken out of the set.
  const drop = (pid, reason) => {
    if (!ids.includes(pid) || (active?.patchIds || []).includes(pid)) return;
    ids = ids.filter((x) => x !== pid); add('remove', pid, reason);
  };
  for (const c of bad.filter((x) => x.status === 'fail')) {
    if (c.id.startsWith('apply:')) drop(c.id.slice(6), `It could not be applied: ${c.detail}`);
    if (c.id.startsWith('blast:')) drop(c.id.split(':')[1], c.detail);
  }
  // 3. New console/network errors with a script patch in the set: the script is the likely cause.
  if (bad.some((c) => c.status === 'fail' && /^(console|net):/.test(c.id))) {
    for (const pid of [...ids]) if (byId(pid)?.ops?.some((o) => SCRIPT_OPS.has(o.type))) drop(pid, 'It injects a script, and the candidate shows new console or network errors.');
  }

  // 3b. A user flow that now fails, with a patch in the set that hides or removes elements: that patch is the likely cause.
  if (bad.some((c) => c.status === 'fail' && c.id.startsWith('flow:'))) {
    for (const pid of [...ids]) if (byId(pid)?.ops?.some(isDestructive)) drop(pid, 'It hides or removes part of the page, and a critical user flow now fails.');
  }

  // 4. Things a re-run cannot repair on its own.
  const unapproved = ids.map(byId).filter((p) => p && !['approved', 'live'].includes(p.status));
  const notes = [];
  if (unapproved.length) notes.push(`${unapproved.length} patch(es) still need approval before release: ${unapproved.map((p) => p.title).join(', ')}.`);
  const unresolved = bad.filter((c) => c.status === 'fail' && !/^(apply|blast):/.test(c.id) && !c.id.startsWith('flow:') && !/^(console|net):/.test(c.id));
  if (unresolved.length) notes.push(`Not auto-fixable: ${unresolved.map((c) => c.name).join('; ')}.`);

  const changed = actions.length > 0;
  const failures = bad.map((c) => ({ name: c.name, status: c.status, detail: String(c.detail || '').slice(0, 300) }));
  const explanation = await explainFix({ failures, actions, notes, changed });
  return {
    verificationId, fixable: changed, patchIds: ids, actions, notes,
    summary: explanation.text, provider: explanation.provider
  };
}
