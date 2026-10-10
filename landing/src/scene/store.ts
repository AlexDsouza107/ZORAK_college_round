import type * as THREE from 'three';
import { TREE } from './treeData';

/** Mutable per-scene state shared between the graph, the reticle and the HTML HUD (kept out of React state so useFrame stays allocation-free). */
export interface SceneStore {
  hovered: number;            // node index under the pointer (broken & unfixed only) or -1
  dwell: number;              // seconds the pointer has rested on the hovered node
  fixedTarget: Float32Array;  // 0|1 per node
  fixed: Float32Array;        // eased 0..1 per node
  objs: (THREE.Object3D | null)[];
  shock: { node: number; t: number };
  groupScale: number;
  screen: Float32Array;       // projected canvas-pixel x,y per node (read by the HTML callouts)
  patchedCount: number;
  onPatched?: (count: number, node: number) => void;
}

export function createStore(): SceneStore {
  const n = TREE.nodes.length;
  return { hovered: -1, dwell: 0, fixedTarget: new Float32Array(n), fixed: new Float32Array(n), objs: new Array(n).fill(null), shock: { node: -1, t: 9 }, groupScale: 1, screen: new Float32Array(n * 2), patchedCount: 0 };
}

export function resetStore(s: SceneStore) {
  s.hovered = -1; s.dwell = 0; s.fixedTarget.fill(0); s.shock.node = -1; s.shock.t = 9; s.patchedCount = 0;
}

export function patchNode(s: SceneStore, i: number) {
  if (!TREE.nodes[i].broken || s.fixedTarget[i]) return;
  s.fixedTarget[i] = 1; s.shock.node = i; s.shock.t = 0; s.hovered = -1; s.dwell = 0;
  s.patchedCount += 1; s.onPatched?.(s.patchedCount, i);
}
