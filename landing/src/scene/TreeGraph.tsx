import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { COLORS } from './palette';
import { TREE } from './treeData';
import { patchNode, type SceneStore } from './store';

const EDGES = TREE.nodes.map((n, i) => ({ p: n.parent, c: i })).filter((e) => e.p >= 0);
const BOX_CACHE = new Map<string, THREE.EdgesGeometry>();
const edgesFor = (w: number, h: number, d: number) => {
  const k = `${w}|${h}|${d}`; let g = BOX_CACHE.get(k);
  if (!g) { g = new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d)); BOX_CACHE.set(k, g); }
  return g;
};

function makeLabelTexture(text: string) {
  const c = document.createElement('canvas'); c.width = 320; c.height = 64;
  const g = c.getContext('2d')!; g.font = '500 26px "JetBrains Mono", ui-monospace, Menlo, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#fff'; g.fillText(text, 160, 33);
  const t = new THREE.CanvasTexture(c); t.anisotropy = 4; t.colorSpace = THREE.SRGBColorSpace; return t;
}

interface Props { store: SceneStore; reduced: boolean; pointerLocal: THREE.Vector3; groupRef: React.RefObject<THREE.Group> }

/** The wireframe component tree: nodes are spring-driven (they ease away from the cursor), wires follow them, broken nodes pulse coral. */
export default function TreeGraph({ store, reduced, pointerLocal, groupRef }: Props) {
  const N = TREE.nodes.length;
  const edgeGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(EDGES.length * 6 * 3), 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(EDGES.length * 6 * 3), 3));
    return g;
  }, []);
  const edgeMat = useMemo(() => new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.95, fog: true }), []);
  const refs = useRef({
    edgeMats: [] as (THREE.LineBasicMaterial | null)[], fillMats: [] as (THREE.MeshBasicMaterial | null)[], haloMats: [] as (THREE.LineBasicMaterial | null)[],
    halos: [] as (THREE.LineSegments | null)[], labelMats: [] as (THREE.SpriteMaterial | null)[],
    off: new Float32Array(N * 3), vel: new Float32Array(N * 3), cur: new Float32Array(N * 3)
  });
  const textures = useMemo(() => TREE.nodes.map((n) => (n.labelled ? makeLabelTexture(n.label) : null)), []);
  const tmp = useMemo(() => ({ v: new THREE.Vector3(), c: new THREE.Color() }), []);

  useEffect(() => { document.fonts?.ready?.then(() => textures.forEach((t) => t && (t.needsUpdate = true))); }, [textures]);
  useLayoutEffect(() => { for (let i = 0; i < N; i++) { const p = TREE.nodes[i].pos; refs.current.cur.set(p, i * 3); } }, [N]);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 1 / 30), t = state.clock.elapsedTime, R = refs.current, g = groupRef.current;
    if (!g) return;

    /* ---- dwell auto-patch ---- */
    if (store.hovered >= 0 && !store.fixedTarget[store.hovered]) { store.dwell += dt; if (store.dwell > 0.75) patchNode(store, store.hovered); } else store.dwell = 0;
    if (store.shock.node >= 0) store.shock.t += dt;

    /* ---- node physics: springs toward base position, repelled by the cursor ---- */
    for (let i = 0; i < N; i++) {
      const n = TREE.nodes[i]; const o = i * 3;
      let tx = 0, ty = 0, tz = 0;
      if (!reduced) {
        tz = Math.sin(t * 0.7 + i * 1.3) * 0.07; ty = Math.cos(t * 0.55 + i * 0.9) * 0.05;
        const dx = n.pos[0] - pointerLocal.x, dy = n.pos[1] - pointerLocal.y, d = Math.hypot(dx, dy);
        if (d < 2.6 && d > 0.001) { const k = (1 - d / 2.6) ** 2 * (n.broken && !store.fixedTarget[i] ? 0.18 : 1); tx += (dx / d) * k * 0.55; ty += (dy / d) * k * 0.55; tz += k * 0.7; }
      }
      for (let a = 0; a < 3; a++) {
        const target = a === 0 ? tx : a === 1 ? ty : tz;
        R.vel[o + a] += ((target - R.off[o + a]) * 46 - R.vel[o + a] * 8.5) * dt;
        R.off[o + a] += R.vel[o + a] * dt;
        R.cur[o + a] = n.pos[a] + R.off[o + a];
      }
      const obj = store.objs[i]; if (obj) obj.position.set(R.cur[o], R.cur[o + 1], R.cur[o + 2]);
    }

    /* ---- per-node look: colour state machine steel → coral(pulse) → sage, depth-of-field falloff ---- */
    const focusZ = 0;
    for (let i = 0; i < N; i++) {
      const n = TREE.nodes[i], obj = store.objs[i]; if (!obj) continue;
      store.fixed[i] += (store.fixedTarget[i] - store.fixed[i]) * Math.min(1, dt * 3.2);
      const f = store.fixed[i], broken = n.broken ? 1 - f : 0;
      const pulse = reduced ? 0.6 : 0.5 + 0.5 * Math.sin(t * 2.3 + i * 0.7);
      tmp.v.setFromMatrixPosition(obj.matrixWorld);
      const dof = Math.min(1, Math.max(0, (Math.abs(tmp.v.z - focusZ) - 0.9) / 3.2));
      const col = tmp.c.copy(COLORS.steel);
      if (n.broken) { col.lerp(COLORS.coral, broken * (0.5 + 0.5 * pulse)); col.lerp(COLORS.sage, f); }
      const hov = store.hovered === i ? 1 : 0;
      const base = n.depth === 0 ? 1 : 0.9;
      const em = R.edgeMats[i]; if (em) { em.color.copy(col); em.opacity = Math.min(1, base + broken * 0.2 * pulse) * (1 - 0.4 * dof); }
      const fm = R.fillMats[i]; if (fm) { fm.color.copy(col); fm.opacity = (0.035 + (n.broken ? broken * 0.09 * pulse + f * 0.07 : 0) + hov * 0.07) * (1 - 0.5 * dof); }
      const halo = R.halos[i], hm = R.haloMats[i];
      if (halo && hm) { const s = 1 + broken * (0.05 + 0.13 * pulse) + (f > 0.02 && f < 0.98 ? 0.18 * (1 - f) : 0); halo.scale.setScalar(s); hm.color.copy(col); hm.opacity = broken * (0.18 + 0.32 * (1 - pulse)) * (1 - 0.5 * dof); }
      const lm = R.labelMats[i]; if (lm) { lm.color.copy(n.broken ? col : COLORS.steel); lm.opacity = (n.broken ? 1 : 0.8) * (1 - 0.5 * dof); }
      obj.scale.setScalar(1 + f * 0.0 + hov * 0.04);
    }

    /* ---- wires: follow springy nodes, tint with the child's state ---- */
    const pos = edgeGeo.attributes.position as THREE.BufferAttribute, colA = edgeGeo.attributes.color as THREE.BufferAttribute;
    for (let e = 0; e < EDGES.length; e++) {
      const { p, c } = EDGES[e]; const pn = TREE.nodes[p], cn = TREE.nodes[c];
      const px = R.cur[p * 3], py = R.cur[p * 3 + 1] - pn.size[1] / 2, pz = R.cur[p * 3 + 2];
      const cx = R.cur[c * 3], cy = R.cur[c * 3 + 1] + cn.size[1] / 2, cz = R.cur[c * 3 + 2], my = (py + cy) / 2;
      const o = e * 18;
      pos.array.set([px, py, pz, px, my, pz, px, my, pz, cx, my, cz, cx, my, cz, cx, cy, cz], o);
      const f = store.fixed[c], broken = cn.broken ? 1 - f : 0, pulse = reduced ? 0.6 : 0.5 + 0.5 * Math.sin(t * 2.3 + c * 0.7);
      const col = tmp.c.copy(COLORS.steelDim);
      if (cn.broken) { col.lerp(COLORS.coral, broken * (0.55 + 0.45 * pulse)); col.lerp(COLORS.sage, f); }
      for (let v = 0; v < 6; v++) { colA.array[o + v * 3] = col.r; colA.array[o + v * 3 + 1] = col.g; colA.array[o + v * 3 + 2] = col.b; }
    }
    pos.needsUpdate = true; colA.needsUpdate = true;
  });

  return (
    <group>
      <lineSegments geometry={edgeGeo} material={edgeMat} frustumCulled={false} />
      {TREE.nodes.map((n, i) => {
        const [w, h, d] = n.size; const tex = textures[i];
        return (
          <group key={n.id} ref={(o) => { store.objs[i] = o; }} position={n.pos}>
            <lineSegments geometry={edgesFor(w, h, d)}>
              <lineBasicMaterial ref={(m) => { refs.current.edgeMats[i] = m; }} color={COLORS.steel} transparent fog />
            </lineSegments>
            <lineSegments geometry={edgesFor(w, h, d)} ref={(o) => { refs.current.halos[i] = o; }}>
              <lineBasicMaterial ref={(m) => { refs.current.haloMats[i] = m; }} color={COLORS.coral} transparent opacity={0} depthWrite={false} fog />
            </lineSegments>
            <mesh
              onPointerOver={(e) => { if (n.broken && !store.fixedTarget[i]) { e.stopPropagation(); store.hovered = i; document.body.style.cursor = 'none'; } }}
              onPointerOut={() => { if (store.hovered === i) { store.hovered = -1; document.body.style.cursor = ''; } }}
              onClick={(e) => { if (n.broken) { e.stopPropagation(); patchNode(store, i); document.body.style.cursor = ''; } }}
              onPointerDown={(e) => { if (n.broken && e.pointerType === 'touch') patchNode(store, i); }}>
              <boxGeometry args={[w * 1.3, h * 2.3, d * 1.4]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
            <mesh>
              <boxGeometry args={[w, h, d]} />
              <meshBasicMaterial ref={(m) => { refs.current.fillMats[i] = m; }} color={COLORS.steel} transparent opacity={0.04} depthWrite={false} side={THREE.DoubleSide} fog />
            </mesh>
            {tex && (
              <sprite position={[0, h / 2 + 0.24, 0]} scale={[1.95, 0.39, 1]}>
                <spriteMaterial ref={(m) => { refs.current.labelMats[i] = m; }} map={tex} transparent depthWrite={false} color={COLORS.steel} />
              </sprite>
            )}
          </group>
        );
      })}
    </group>
  );
}
