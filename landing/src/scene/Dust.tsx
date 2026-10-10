import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function softDisc() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32); grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.45, 'rgba(255,255,255,.55)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function cloud(count: number, spread: [number, number, number], seed: number) {
  const a = new Float32Array(count * 3); let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < count; i++) { a[i * 3] = (rnd() - 0.5) * spread[0]; a[i * 3 + 1] = (rnd() - 0.5) * spread[1]; a[i * 3 + 2] = (rnd() - 0.5) * spread[2]; }
  return new THREE.BufferAttribute(a, 3);
}

/** Two layers of soft particles — a fine far layer and a few large, faint near "bokeh" discs — to sell depth of field. */
export default function Dust({ reduced }: { reduced: boolean }) {
  const far = useRef<THREE.Points>(null), near = useRef<THREE.Points>(null);
  const tex = useMemo(softDisc, []);
  const farPos = useMemo(() => cloud(110, [24, 14, 14], 7), []);
  const nearPos = useMemo(() => cloud(14, [20, 11, 5], 21), []);
  useFrame((state, dt) => {
    if (reduced) return;
    const { pointer } = state;
    if (far.current) { far.current.rotation.y += dt * 0.012; far.current.position.x = THREE.MathUtils.damp(far.current.position.x, -pointer.x * 0.35, 2.5, dt); far.current.position.y = THREE.MathUtils.damp(far.current.position.y, -pointer.y * 0.2, 2.5, dt); }
    if (near.current) { near.current.position.x = THREE.MathUtils.damp(near.current.position.x, pointer.x * 0.9, 2, dt); near.current.position.y = THREE.MathUtils.damp(near.current.position.y, pointer.y * 0.5, 2, dt); near.current.rotation.z += dt * 0.01; }
  });
  return (
    <>
      <points ref={far} position={[0, 0, -2]}>
        <bufferGeometry><primitive attach="attributes-position" object={farPos} /></bufferGeometry>
        <pointsMaterial map={tex} size={0.1} sizeAttenuation transparent opacity={0.28} depthWrite={false} color="#9AA3B5" fog />
      </points>
      <points ref={near} position={[0, 0, 4.5]}>
        <bufferGeometry><primitive attach="attributes-position" object={nearPos} /></bufferGeometry>
        <pointsMaterial map={tex} size={0.75} sizeAttenuation transparent opacity={0.05} depthWrite={false} color="#B8C0D0" fog={false} />
      </points>
    </>
  );
}
