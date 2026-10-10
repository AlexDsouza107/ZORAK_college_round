import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import Dust from './Dust';
import Reticle from './Reticle';
import TreeGraph from './TreeGraph';
import { COLORS } from './palette';
import { resetStore, type SceneStore } from './store';
import { BROKEN_CENTER, TREE } from './treeData';

const damp = THREE.MathUtils.damp;
const DEBUG = typeof location !== 'undefined' && location.search.includes('debug');

interface SceneProps { store: SceneStore; resetKey: number; reduced: boolean; onPatched: (count: number, node: number) => void }

function Scene({ store, resetKey, reduced, onPatched }: SceneProps) {
  const { gl } = useThree();
  const group = useRef<THREE.Group>(null);
  const pointerLocal = useMemo(() => new THREE.Vector3(99, 99, 0), []);
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), []);
  const hit = useMemo(() => new THREE.Vector3(), []);
  const perf = useRef({ acc: 0, frames: 0 });
  const drag = useRef({ active: false, x: 0, y: 0, yaw: 0, pitch: 0, moved: 0 });
  const placed = useRef(false);

  useEffect(() => { store.onPatched = onPatched; }, [store, onPatched]);
  useEffect(() => { resetStore(store); store.fixed.fill(0); }, [resetKey, store]);

  /* drag to rotate: pointer down on empty space starts a drag; yaw/pitch ease back to rest after release */
  useEffect(() => {
    const el = gl.domElement, d = drag.current;
    const down = (e: PointerEvent) => { if (store.hovered >= 0) return; d.active = true; d.x = e.clientX; d.y = e.clientY; d.moved = 0; el.setPointerCapture?.(e.pointerId); };
    const move = (e: PointerEvent) => {
      if (!d.active) return;
      const dx = e.clientX - d.x, dy = e.clientY - d.y; d.x = e.clientX; d.y = e.clientY; d.moved += Math.abs(dx) + Math.abs(dy);
      d.yaw = THREE.MathUtils.clamp(d.yaw + dx * 0.0075, -1.25, 1.25); d.pitch = THREE.MathUtils.clamp(d.pitch + dy * 0.005, -0.55, 0.55);
    };
    const up = (e: PointerEvent) => { d.active = false; el.releasePointerCapture?.(e.pointerId); };
    el.addEventListener('pointerdown', down); el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    return () => { el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); el.style.cursor = ''; };
  }, [gl, store]);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 1 / 30), g = group.current; if (!g) return;
    const t = state.clock.elapsedTime, { pointer, viewport } = state, d = drag.current;

    // fit the tree into the window: slightly cropped on the left so the broken cluster stays centred and legible
    const narrow = viewport.width / viewport.height < 1.05;
    const s = Math.min((viewport.width * (narrow ? 1.55 : 1.12)) / TREE.width, (viewport.height * 0.94) / TREE.height);
    const cx = -BROKEN_CENTER.x * s * (narrow ? 1 : 0.55);
    const cy = narrow ? -BROKEN_CENTER.y * s + viewport.height * 0.02 : -BROKEN_CENTER.y * s * 0.12 - viewport.height * 0.02;
    if (!placed.current && viewport.width > 0) { g.position.set(cx, cy, 0); g.scale.setScalar(s); placed.current = true; }   // snap on the first frame — no zoom-in at load
    g.position.x = damp(g.position.x, cx, 4, dt); g.position.y = damp(g.position.y, cy, 4, dt);
    const ns = damp(g.scale.x, s, 4, dt); g.scale.setScalar(ns); store.groupScale = ns;

    // rotation = mouse-follow tilt + drag offset; the drag offset springs back slowly after release
    if (!d.active) { d.yaw = damp(d.yaw, 0, 0.9, dt); d.pitch = damp(d.pitch, 0, 0.9, dt); }
    const ry = reduced ? d.yaw : pointer.x * 0.26 + Math.sin(t * 0.22) * 0.05 + d.yaw, rx = reduced ? d.pitch : -pointer.y * 0.14 + Math.cos(t * 0.18) * 0.025 + d.pitch;
    g.rotation.y = damp(g.rotation.y, ry, 5, dt); g.rotation.x = damp(g.rotation.x, rx, 5, dt);

    gl.domElement.style.cursor = store.hovered >= 0 ? 'none' : d.active ? 'grabbing' : 'grab';

    // pointer ray → plane z=0 → tree-local coordinates (drives the repel physics)
    state.raycaster.setFromCamera(pointer, state.camera);
    if (state.raycaster.ray.intersectPlane(plane, hit)) { g.updateWorldMatrix(true, false); pointerLocal.copy(g.worldToLocal(hit)); }

    if (DEBUG) {
      const out: { x: number; y: number; fixed: number }[] = [], r = gl.domElement.getBoundingClientRect();
      TREE.nodes.forEach((n, i) => { if (n.broken) out.push({ x: r.left + store.screen[i * 2], y: r.top + store.screen[i * 2 + 1], fixed: store.fixed[i] }); });
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
