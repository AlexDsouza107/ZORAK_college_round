import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { COLORS } from './palette';
import { TREE } from './treeData';
import type { SceneStore } from './store';

const damp = THREE.MathUtils.damp;
const RING_SEGS = 72;

function circleGeometry(segs: number) {
  const pts: number[] = [];
  for (let i = 0; i < segs; i++) { const a = (i / segs) * Math.PI * 2; pts.push(Math.cos(a), Math.sin(a), 0); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); return g;
}
function bracketGeometry(arm = 0.24) {
  const h = 0.5, a = arm, pts: number[] = [];
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    pts.push(sx * h, sy * h, 0, sx * (h - a), sy * h, 0, sx * h, sy * h, 0, sx * h, sy * (h - a), 0);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); return g;
}

/** The 3D cursor: a small ring that follows the pointer, then snaps and tightens into corner brackets around a broken node. */
export default function Reticle({ store }: { store: SceneStore }) {
  const root = useRef<THREE.Group>(null), free = useRef<THREE.Group>(null), br = useRef<THREE.Group>(null);
  const arc = useRef<THREE.LineLoop>(null), shock = useRef<THREE.Mesh>(null);
  const mats = useRef({ free: null as THREE.LineBasicMaterial | null, dot: null as THREE.MeshBasicMaterial | null, br: null as THREE.LineBasicMaterial | null, arc: null as THREE.LineBasicMaterial | null, shock: null as THREE.MeshBasicMaterial | null });
  const geo = useMemo(() => ({ ring: circleGeometry(RING_SEGS), brackets: bracketGeometry(), shock: new THREE.RingGeometry(0.92, 1, 64) }), []);
  const st = useMemo(() => ({ lock: 0, v: new THREE.Vector3(), tgt: new THREE.Vector3(), inited: false, visible: 0 }), []);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 1 / 30), m = mats.current, r = root.current; if (!r) return;
    const { pointer, viewport } = state;
    const h = store.hovered;
    const locked = h >= 0 && !!store.objs[h];
    st.lock = damp(st.lock, locked ? 1 : 0, 11, dt);
    // pointer in world space, floating slightly in front of the tree
    st.tgt.set((pointer.x * viewport.width) / 2, (pointer.y * viewport.height) / 2, 1.6);
    let size: [number, number, number] | null = null;
    if (locked) { store.objs[h]!.getWorldPosition(st.v); st.tgt.copy(st.v); size = TREE.nodes[h].size; }
    if (!st.inited) { r.position.copy(st.tgt); st.inited = true; }
    const k = locked ? 16 : 30;
    r.position.set(damp(r.position.x, st.tgt.x, k, dt), damp(r.position.y, st.tgt.y, k, dt), damp(r.position.z, st.tgt.z, k, dt));
    // idle cursor visibility: fade when the pointer has never entered the canvas
    const seen = pointer.x !== 0 || pointer.y !== 0; st.visible = damp(st.visible, seen ? 1 : 0, 6, dt);

    const gs = store.groupScale;
    if (free.current && m.free && m.dot) {
      free.current.scale.setScalar(0.22 * (1 + st.lock * 0.6)); free.current.rotation.z += dt * 0.9;
      m.free.opacity = (1 - st.lock) * 0.75 * st.visible; m.dot.opacity = (1 - st.lock) * 0.9 * st.visible;
    }
    if (br.current && m.br) {
      const w = size ? size[0] * gs * 1.22 + 0.22 : 0.9, hh = size ? size[1] * gs * 1.9 + 0.22 : 0.5;
      const zoom = 1 + (1 - st.lock) * 0.9;
      br.current.scale.set(w * zoom, hh * zoom, 1); m.br.opacity = st.lock * 0.95;
      if (arc.current && m.arc) {
        const prog = Math.min(1, store.dwell / 0.75);
        arc.current.geometry.setDrawRange(0, Math.floor(prog * RING_SEGS));
        arc.current.scale.setScalar(Math.hypot(w, hh) * 0.42 + 0.05); m.arc.opacity = st.lock * (prog > 0.01 ? 1 : 0);
      }
    }
    // success shockwave
    const sh = store.shock;
    if (shock.current && m.shock) {
      if (sh.node >= 0 && sh.t < 1.3 && store.objs[sh.node]) {
        store.objs[sh.node]!.getWorldPosition(shock.current.position);
        shock.current.scale.setScalar((0.25 + sh.t * 3.4) * Math.max(0.7, gs));
        m.shock.opacity = Math.max(0, 1 - sh.t / 1.3) * 0.55; shock.current.visible = true;
      } else shock.current.visible = false;
    }
  });

  return (
    <>
      <group ref={root}>
        <group ref={free}>
          <lineLoop geometry={geo.ring}><lineBasicMaterial ref={(x) => { mats.current.free = x; }} color={COLORS.ink} transparent opacity={0.7} depthTest={false} /></lineLoop>
          <mesh scale={0.12}><circleGeometry args={[1, 24]} /><meshBasicMaterial ref={(x) => { mats.current.dot = x; }} color={COLORS.ink} transparent opacity={0.9} depthTest={false} /></mesh>
        </group>
        <group ref={br}>
          <lineSegments geometry={geo.brackets}><lineBasicMaterial ref={(x) => { mats.current.br = x; }} color={COLORS.ink} transparent opacity={0} depthTest={false} /></lineSegments>
        </group>
        <lineLoop ref={arc} geometry={geo.ring}><lineBasicMaterial ref={(x) => { mats.current.arc = x; }} color={COLORS.accent} transparent opacity={0} depthTest={false} /></lineLoop>
      </group>
      <mesh ref={shock} geometry={geo.shock} visible={false}><meshBasicMaterial ref={(x) => { mats.current.shock = x; }} color={COLORS.accent} transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} /></mesh>
    </>
  );
}
