import { useEffect, useMemo, useRef } from 'react';
import { TREE } from './treeData';
import type { SceneStore } from './store';

// order = [total, promo, checkout]; fanned out so neighbouring callouts never overlap
const OFFSETS = [{ dx: -74, dy: 40 }, { dx: 76, dy: 44 }, { dx: 86, dy: -34 }];

/** Crisp HTML callouts pinned to the broken 3D nodes: element tag + HTTP status, flipping from red error to green 200. */
export default function Callouts({ store, patched }: { store: SceneStore; patched: number }) {
  const idx = useMemo(() => TREE.nodes.map((n, i) => (n.broken ? i : -1)).filter((i) => i >= 0), []);
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      idx.forEach((ni, k) => {
        const el = refs.current[k]; if (!el) return;
        const o = OFFSETS[k % OFFSETS.length], box = el.parentElement!, W = box.clientWidth, Hh = box.clientHeight, w = el.offsetWidth, h = el.offsetHeight;
        const sc = W < 520 ? 0.5 : 1;                                   // tighter fan-out on narrow frames
        const x = Math.min(Math.max(store.screen[ni * 2] + o.dx * sc, w / 2 + 6), W - w / 2 - 6);   // never clipped by the frame
        const y = Math.min(Math.max(store.screen[ni * 2 + 1] + o.dy * sc, h / 2 + 44), Hh - h / 2 - 8);
        el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
        el.style.opacity = store.screen[ni * 2] ? '1' : '0';
      });
      raf = requestAnimationFrame(loop);
    };
    loop(); return () => cancelAnimationFrame(raf);
  }, [idx, store]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {idx.map((ni, k) => {
        const n = TREE.nodes[ni], ok = !!store.fixedTarget[ni];
        return (
          <div key={n.id} ref={(el) => { refs.current[k] = el; }} className="absolute left-0 top-0 opacity-0 transition-opacity duration-300 will-change-transform">
            <div className={`rounded-md border bg-white px-2 py-1 font-mono shadow-subtle transition-colors duration-500 ${ok ? 'border-accent-line' : 'border-danger-line'}`}>
              <div className="text-[10px] leading-tight text-neutral-600">{n.tag}</div>
              <div className={`mt-0.5 flex items-center gap-1.5 whitespace-nowrap text-[10.5px] font-medium leading-tight ${ok ? 'text-accent-deep' : 'text-danger-deep'}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${ok ? 'bg-accent' : 'animate-softPulse bg-danger'}`} />{ok ? '200 OK' : n.code}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
