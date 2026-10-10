import * as store from './store.js';
import * as audit from './audit.js';
import { emit } from './bus.js';
import { HttpError } from './util.js';
import { requireRole } from './users.js';

const { Core } = store;

export function conflictsFor(patchIds) {
  const patches = store.getPatches(patchIds);
  const list = Core.detectConflicts(patches);
  const byId = Object.fromEntries(patches.map((p) => [p.id, p]));
  return list.map((c) => ({ ...c, patchA: byId[c.a] ? brief(byId[c.a]) : null, patchB: byId[c.b] ? brief(byId[c.b]) : null }));
}
const brief = (p) => ({ id: p.id, title: p.title, author: p.author, status: p.status, rev: p.rev, ops: p.ops.map(Core.describeOp) });

export function siteConflicts(siteId) {
  const active = store.listPatches(siteId).filter((p) => ['draft', 'review', 'approved'].includes(p.status));
  const live = store.listPatches(siteId).filter((p) => p.status === 'live');
  return conflictsFor([...live, ...active].map((p) => p.id));
}

export function resolve(user, { conflict, strategy, customValue }) {
  requireRole(user, 'developer');
  const A = store.mustPatch(conflict.a);
  const B = conflict.kind === 'missing-dependency' ? null : store.mustPatch(conflict.b);
  const keyOf = Core.opKey;
  const dropKey = (patch, key, kept) => {
    const ops = patch.ops.filter((o) => keyOf(o) !== key);
    if (!ops.length) {
      store.setStatus(patch.id, 'rejected', user, `superseded by conflict resolution (${conflict.kind})`, 'conflict.resolved');
      store.addComment(patch.id, user, `Rejected: all of its changes conflicted with "${kept.title}" and were dropped.`, 'system');
      return;
    }
    if (patch.status === 'live') throw new HttpError(409, `"${patch.title}" is live — roll back before resolving.`);
    store.updatePatch(patch.id, user, { ops });
    store.addComment(patch.id, user, `Conflict on ${key} resolved in favour of "${kept.title}".`, 'system');
  };
  if (conflict.kind === 'missing-dependency') {
    store.updatePatch(A.id, user, { dependsOn: A.dependsOn.filter((d) => d !== conflict.b) });
  } else if (conflict.kind === 'duplicate') {
    dropKey(B, conflict.key, A);
  } else if (conflict.kind === 'collision') {
    if (strategy === 'custom') {
      if (customValue == null) throw new HttpError(400, 'customValue required');
      const ops = A.ops.map((o) => (keyOf(o) === conflict.key ? setValue(o, customValue) : o));
      store.updatePatch(A.id, user, { ops });
      dropKey(B, conflict.key, A);
    } else if (strategy === 'keepA') dropKey(B, conflict.key, A);
    else if (strategy === 'keepB') dropKey(A, conflict.key, B);
    else throw new HttpError(400, 'Unknown strategy');
  } else if (conflict.kind === 'target-removed' || conflict.kind === 'ancestor-removed') {
    // A removes something B depends on
    if (strategy === 'keepA') {
      store.setStatus(B.id, 'rejected', user, 'its target is removed by another patch', 'conflict.resolved');
    } else if (strategy === 'keepB') dropKey(A, 'remove', B);
    else throw new HttpError(400, 'Unknown strategy');
  }
  audit.record(A.siteId, user.id, 'conflict.resolved', `${user.name} resolved ${conflict.kind} (${conflict.key}) between "${A.title}" and "${B ? B.title : conflict.b}" — ${strategy}`, { conflict: conflict.id, strategy, customValue });
  emit('patch', { siteId: A.siteId, action: 'conflict-resolved', by: user.id });
  return { ok: true };
}
function setValue(op, v) {
  if (op.type === 'setText' || op.type === 'setHTML' || op.type === 'setAttr' || op.type === 'setStyle') return { ...op, value: v };
  return op;
}
