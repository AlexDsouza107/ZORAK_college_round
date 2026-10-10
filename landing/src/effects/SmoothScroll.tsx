import Lenis from 'lenis';
import { useEffect } from 'react';
import { useReducedMotion } from '../hooks/useReducedMotion';

/** Inertial smooth scrolling (Lenis). Anchor links glide to their target; disabled for reduced-motion users. */
export default function SmoothScroll() {
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) return;
    const lenis = new Lenis({ duration: 1.2, easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true, wheelMultiplier: 0.95 });
    let raf = 0; const loop = (t: number) => { lenis.raf(t); raf = requestAnimationFrame(loop); }; raf = requestAnimationFrame(loop);
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element)?.closest?.('a[href^="#"]') as HTMLAnchorElement | null; if (!a) return;
      const id = a.getAttribute('href'); if (!id || id.length < 2) return;
      const el = document.querySelector(id); if (!el) return;
      e.preventDefault(); lenis.scrollTo(el as HTMLElement, { offset: -84, duration: 1.4 });
    };
    document.addEventListener('click', onClick);
    return () => { cancelAnimationFrame(raf); document.removeEventListener('click', onClick); lenis.destroy(); };
  }, [reduced]);
  return null;
}
