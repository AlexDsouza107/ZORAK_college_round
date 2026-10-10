import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import Dust from './Dust';
import Reticle from './Reticle';
import TreeGraph from './TreeGraph';
import { COLORS } from './palette';
import { createStore, resetStore } from './store';
import { BROKEN_CENTER, TREE } from './treeData';

const damp = THREE.MathUtils.damp;
const DEBUG = typeof location !== 'undefined' && location.search.includes('debug');

interface SceneProps { resetKey: number; reduced: boolean; onPatched: (count: number, node: number) => void }

function Scene({ resetKey, reduced, onPatched }: SceneProps) {
  const store = useMemo(createStore, []);
  const group = useRef<THREE.Group>(null);
  const pointerLocal = useMemo(() => new THREE.Vector3(99, 99, 0), []);
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), []);
  const hit = useMemo(() => new THREE.Vector3(), []);
  const perf = useRef({ acc: 0, frames: 0 });

  useEffect(() => { store.onPatched = onPatched; }, [store, onPatched]);
  useEffect(() => { resetStore(store); store.fixed.fill(0); }, [resetKey, store]);
  useEffect(() => () => { document.body.style.cursor = ''; }, []);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 1 / 30), g = group.current; if (!g) return;
    const t = state.clock.elapsedTime, { pointer, viewport } = state;

    // responsive layout: tree sits to the right of the copy on wide screens, below it on narrow ones
    const wide = viewport.width / viewport.height > 1.15;
    const s = wide ? Math.min((viewport.width * 0.5) / TREE.width, (viewport.height * 0.82) / TREE.height) : Math.min((viewport.width * 1.5) / TREE.width, (viewport.height * 0.95) / TREE.height);
    g.position.x = damp(g.position.x, wide ? viewport.width * 0.235 : -BROKEN_CENTER.x * s, 4, dt);
    g.position.y = damp(g.position.y, wide ? -0.1 : -BROKEN_CENTER.y * s + viewport.height * 0.04, 4, dt);
    const ns = damp(g.scale.x, s, 4, dt); g.scale.setScalar(ns); store.groupScale = ns;

    // mouse-follow tilt with a slow idle drift
    const ry = reduced ? 0 : pointer.x * 0.34 + Math.sin(t * 0.22) * 0.07, rx = reduced ? 0 : -pointer.y * 0.17 + Math.cos(t * 0.18) * 0.03;
    g.rotation.y = damp(g.rotation.y, ry, 3.2, dt); g.rotation.x = damp(g.rotation.x, rx, 3.2, dt);

    // pointer ray → plane z=0 → tree-local coordinates (drives the repel physics)
    state.raycaster.setFromCamera(pointer, state.camera);
    if (state.raycaster.ray.intersectPlane(plane, hit)) { g.updateWorldMatrix(true, false); pointerLocal.copy(g.worldToLocal(hit)); }

    // test hook (only with ?debug): screen positions of the broken nodes, so automated tests can hover them
    if (DEBUG) {
      const out: { x: number; y: number; fixed: number }[] = [];
      TREE.nodes.forEach((n, i) => { if (!n.broken || !store.objs[i]) return; store.objs[i]!.getWorldPosition(hit); hit.project(state.camera); out.push({ x: ((hit.x + 1) / 2) * state.size.width, y: ((1 - hit.y) / 2) * state.size.height, fixed: store.fixed[i] }); });
      (window as unknown as { __broken?: unknown }).__broken = out;
    }

    // adaptive resolution: if the GPU struggles, quietly drop the pixel ratio
    const p = perf.current; p.acc += rawDt; p.frames++;
    if (p.frames === 90) { if (p.acc / 90 > 0.027 && state.viewport.dpr > 1) state.setDpr(Math.max(1, state.viewport.dpr - 0.25)); p.acc = 0; p.frames = 0; }
  });

  return (
    <>
      <fog attach="fog" args={[COLORS.fog, 15, 36]} />
      <group ref={group}><TreeGraph store={store} reduced={reduced} pointerLocal={pointerLocal} groupRef={group} /></group>
      <Dust reduced={reduced} />
      <Reticle store={store} />
    </>
  );
}

export default function HeroScene({ active, ...props }: SceneProps & { active: boolean }) {
  const dpr = useMemo<[number, number]>(() => [1, (navigator.hardwareConcurrency ?? 8) <= 4 ? 1.25 : 1.75], []);
  return (
    <Canvas dpr={dpr} frameloop={active ? 'always' : 'never'} camera={{ position: [0, 0, 12.5], fov: 34, near: 0.1, far: 60 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }} style={{ touchAction: 'pan-y' }} aria-hidden>
      <Scene {...props} />
    </Canvas>
  );
}
