/** An abstract component tree (a small shop UI). Three leaves are "broken production elements". */
export interface TreeNode {
  id: string; label: string; parent: number; depth: number;
  pos: [number, number, number]; size: [number, number, number];
  broken: boolean; labelled: boolean; tag: string; code: string;
}
interface Spec { id: string; label: string; broken?: boolean; tag?: string; code?: string; children?: Spec[] }

const SPEC: Spec = {
  id: 'app', label: '<App/>', children: [
    { id: 'header', label: '<Header/>', children: [{ id: 'logo', label: '<Logo/>' }, { id: 'nav', label: '<Nav/>' }, { id: 'cart-icon', label: '<CartIcon/>' }] },
    { id: 'main', label: '<Main/>', children: [
      { id: 'hero', label: '<Hero/>' },
      { id: 'grid', label: '<ProductGrid/>', children: [{ id: 'card-a', label: '<Card/>' }, { id: 'card-b', label: '<Card/>' }, { id: 'card-c', label: '<Card/>' }] },
      { id: 'cart', label: '<Cart/>', children: [
        { id: 'summary', label: '<Summary/>', children: [{ id: 'total', label: '<Total/>', broken: true, tag: '<span.total>', code: '422 Invalid Total' }, { id: 'promo', label: '<PromoBanner/>', broken: true, tag: '<div.promo>', code: '404 Not Found' }] },
        { id: 'checkout', label: '<CheckoutBtn/>', broken: true, tag: '<button.checkout>', code: '500 Internal Error' }
      ] }
    ] },
    { id: 'footer', label: '<Footer/>', children: [{ id: 'links', label: '<Links/>' }, { id: 'news', label: '<Newsletter/>' }] }
  ]
};

const X_STEP = 1.24, Y_STEP = 1.8;

export const TREE: { nodes: TreeNode[]; width: number; height: number } = (() => {
  const nodes: TreeNode[] = []; let leaf = 0;
  const rec = (s: Spec, parent: number, depth: number): { idx: number; x: number } => {
    const idx = nodes.length;
    nodes.push({ id: s.id, label: s.label, parent, depth, pos: [0, 0, 0], size: [1, 0.36, 0.4], broken: !!s.broken, labelled: depth <= 1 && !s.broken, tag: s.tag ?? s.label, code: s.code ?? '' });
    let x: number;
    if (!s.children) { x = leaf++ * X_STEP; }
    else { const xs = s.children.map((c) => rec(c, idx, depth + 1).x); x = (Math.min(...xs) + Math.max(...xs)) / 2; }
    const n = nodes[idx];
    const w = s.children ? (depth === 0 ? 2.1 : 1.45) : s.broken ? 0.98 : 0.86;
    n.size = [w, depth === 0 ? 0.46 : 0.38, 0.42];
    n.pos = [x, -depth * Y_STEP, Math.sin(idx * 1.9 + depth * 0.8) * 0.85 - depth * 0.18];
    return { idx, x };
  };
  rec(SPEC, -1, 0);
  const minX = Math.min(...nodes.map((n) => n.pos[0])), maxX = Math.max(...nodes.map((n) => n.pos[0])), maxD = Math.max(...nodes.map((n) => n.depth));
  const cx = (minX + maxX) / 2, cy = (maxD * Y_STEP) / 2;
  for (const n of nodes) { n.pos[0] -= cx; n.pos[1] += cy; }   // centre the tree on the origin
  return { nodes, width: maxX - minX + 2, height: maxD * Y_STEP + 1 };
})();

export const BROKEN_COUNT = TREE.nodes.filter((n) => n.broken).length;
/** Centroid of the broken nodes (tree-local) — small screens centre the camera here instead of on the whole tree. */
export const BROKEN_CENTER = (() => { const b = TREE.nodes.filter((n) => n.broken); return { x: b.reduce((a, n) => a + n.pos[0], 0) / b.length, y: b.reduce((a, n) => a + n.pos[1], 0) / b.length }; })();
