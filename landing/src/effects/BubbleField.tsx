import { useEffect, useRef } from 'react';
import { useReducedMotion } from '../hooks/useReducedMotion';

/**
 * Full-page ambient background: glassy bubbles and stitched "patch" squares drifting upward.
 * Patch-themed: a bubble starts RED (a broken `×`), and when it rises past its own line it is hotfixed — it ripples and turns
 * EMERALD (`✓`). Everything parallaxes with scroll, repels from the cursor, and pops on click.
 */
type RGB = [number, number, number];
const RED: RGB = [242, 85, 92], GREEN: RGB = [16, 185, 129], MIST: RGB = [150, 163, 192];
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const rgba = (c: RGB, a: number) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

interface P { patch: boolean; x: number; y: number; r: number; depth: number; vy: number; phase: number; wob: number; rot: number; spin: number; fix: boolean; fixed: boolean; t: number; flipY: number; glyph: string; ix: number; iy: number }
interface Ring { x: number; y: number; r: number; max: number; a: number }
interface Spark { x: number; y: number; vx: number; vy: number; life: number; col: RGB }

export default function BubbleField() {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const cv = ref.current!, ctx = cv.getContext('2d')!;
    let W = 0, H = 0, dpr = 1, raf = 0, last = performance.now(), time = 0, lastScroll = window.scrollY, hidden = false;
    const mouse = { x: -999, y: -999 };
    let ps: P[] = []; const rings: Ring[] = [], sparks: Spark[] = [];
    const rnd = (a: number, b: number) => a + Math.random() * (b - a);

    const spawn = (p: P | null, initial: boolean): P => {
      const patch = Math.random() < 0.28, r = patch ? rnd(13, 28) : 7 + Math.pow(Math.random(), 2.4) * 50;
      const depth = 0.3 + (r / 60) * 0.7, fix = Math.random() < 0.55;
      const q: P = p || ({} as P);
      Object.assign(q, { patch, r, depth, fix, x: rnd(0, W), y: initial ? rnd(0, H) : H + r + rnd(20, 160), vy: -(7 + Math.random() * 13) * (0.5 + depth), phase: rnd(0, 6.28), wob: rnd(0.3, 1.2), rot: rnd(0, 6.28), spin: rnd(-0.25, 0.25),
        flipY: H * rnd(0.28, 0.62), ix: 0, iy: 0, fixed: false, t: 0, glyph: patch ? ['+', '−', '</>'][(Math.random() * 3) | 0] : '' });
      if (initial && fix && q.y < q.flipY) { q.fixed = true; q.t = 1; }
      return q;
    };
    const init = () => {
      W = window.innerWidth; H = window.innerHeight; dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.max(10, Math.min(30, Math.round((W * H) / 52000)));
      ps = Array.from({ length: n }, () => spawn(null, true)).sort((a, b) => a.depth - b.depth);
    };
    const pop = (p: P) => {
      const col = p.fix ? mix(RED, GREEN, p.t) : MIST;
      for (let i = 0; i < 12; i++) { const a = (i / 12) * 6.28 + Math.random(), s = rnd(40, 130); sparks.push({ x: p.x, y: p.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, col }); }
      rings.push({ x: p.x, y: p.y, r: p.r, max: p.r + 40, a: 0.5 }); spawn(p, false);
    };

    const rrect = (x: number, y: number, w: number, h: number, r: number) => { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); };
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      for (const p of ps) {
        const col = p.fix ? mix(RED, GREEN, p.t) : MIST, base = 0.3 + 0.55 * p.depth;
        ctx.save(); ctx.globalAlpha = base; ctx.translate(p.x, p.y);
        if (p.patch) {
          ctx.rotate(p.rot); const s = p.r * 2;
          rrect(-p.r, -p.r, s, s, 6); ctx.fillStyle = rgba(col, 0.05); ctx.fill();
          ctx.setLineDash([5, 4]); ctx.strokeStyle = rgba(col, 0.55); ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([]);
          ctx.rotate(-p.rot); ctx.fillStyle = rgba(col, 0.85); ctx.font = `500 ${Math.round(p.r * 0.7)}px "Geist Mono", ui-monospace, monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(p.fix ? (p.fixed ? '✓' : '×') : p.glyph, 0, 1);
        } else {
          const g = ctx.createRadialGradient(-p.r * 0.3, -p.r * 0.35, p.r * 0.08, 0, 0, p.r);
          g.addColorStop(0, rgba(col, 0.02)); g.addColorStop(0.72, rgba(col, 0.05)); g.addColorStop(1, rgba(col, 0.22));
          ctx.beginPath(); ctx.arc(0, 0, p.r, 0, 6.2832); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = rgba(col, 0.38); ctx.lineWidth = 1; ctx.stroke();
          if (p.r > 12) {
            ctx.beginPath(); ctx.arc(0, 0, p.r * 0.78, 3.5, 4.35); ctx.strokeStyle = 'rgba(255,255,255,0.32)'; ctx.lineWidth = 1.4; ctx.lineCap = 'round'; ctx.stroke();
            ctx.beginPath(); ctx.arc(-p.r * 0.42, -p.r * 0.5, Math.max(1, p.r * 0.07), 0, 6.2832); ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fill();
          }
          if (p.fix && p.r >= 17) { ctx.fillStyle = rgba(col, 0.9); ctx.font = `500 ${Math.round(p.r * 0.62)}px "Geist Mono", ui-monospace, monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(p.fixed ? '✓' : '×', 0, 1); }
        }
        ctx.restore();
      }
      for (const r of rings) { ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, 6.2832); ctx.strokeStyle = rgba(GREEN, r.a); ctx.lineWidth = 1.5; ctx.stroke(); }
      for (const s of sparks) { ctx.globalAlpha = Math.max(0, s.life); ctx.beginPath(); ctx.arc(s.x, s.y, 2, 0, 6.2832); ctx.fillStyle = rgba(s.col, 0.9); ctx.fill(); }
      ctx.globalAlpha = 1;
    };

    const step = (now: number) => {
      raf = requestAnimationFrame(step);
      if (hidden) { last = now; return; }
      const dt = Math.min((now - last) / 1000, 1 / 30); last = now; time += dt;
      const sy = window.scrollY, ds = sy - lastScroll; lastScroll = sy;
      for (const p of ps) {
        p.y += p.vy * dt - ds * p.depth * 0.55;                 // upward drift + scroll parallax
        p.x += Math.sin(time * 0.6 + p.phase) * p.wob * 10 * dt;
        p.rot += p.spin * dt;
        const dx = p.x - mouse.x, dy = p.y - mouse.y, d = Math.hypot(dx, dy), R = 150 + p.r;
        if (d < R && d > 0.1) { const f = Math.pow(1 - d / R, 2) * 520 * dt; p.ix += (dx / d) * f; p.iy += (dy / d) * f; }
        p.x += p.ix * dt * 6; p.y += p.iy * dt * 6; const k = Math.exp(-3 * dt); p.ix *= k; p.iy *= k;
        if (p.fix && !p.fixed && p.y < p.flipY) { p.fixed = true; rings.push({ x: p.x, y: p.y, r: p.r, max: p.r + 46, a: 0.55 }); }
        p.t += ((p.fixed ? 1 : 0) - p.t) * Math.min(1, dt * 3);
        if (p.y < -p.r - 60 || p.x < -120 || p.x > W + 120) spawn(p, false); else if (p.y > H + p.r + 420) { spawn(p, false); p.y = -p.r - 30; }
      }
      for (let i = rings.length - 1; i >= 0; i--) { const r = rings[i]; r.r += (r.max - r.r) * Math.min(1, dt * 3.2) + dt * 10; r.a -= dt * 0.55; if (r.a <= 0) rings.splice(i, 1); }
      for (let i = sparks.length - 1; i >= 0; i--) { const s = sparks[i]; s.x += s.vx * dt; s.y += s.vy * dt; s.vx *= 0.96; s.vy *= 0.96; s.life -= dt * 1.4; if (s.life <= 0) sparks.splice(i, 1); }
      draw();
    };

    const onMove = (e: PointerEvent) => { mouse.x = e.clientX; mouse.y = e.clientY; };
    const onLeave = () => { mouse.x = mouse.y = -999; };
    const onDown = (e: PointerEvent) => {
      if ((e.target as Element)?.closest?.('a,button,input,select,textarea,canvas,[role=switch],[role=button],label')) return;
      for (let i = ps.length - 1; i >= 0; i--) { const p = ps[i]; if (Math.hypot(e.clientX - p.x, e.clientY - p.y) < p.r + 6) { pop(p); break; } }
    };
    const onVis = () => { hidden = document.hidden; };

    init();
    window.addEventListener('resize', init); window.addEventListener('pointermove', onMove, { passive: true }); window.addEventListener('pointerdown', onDown, { passive: true });
    document.addEventListener('mouseleave', onLeave); document.addEventListener('visibilitychange', onVis);
    if (reduced) { for (const p of ps) { p.fixed = p.fix && p.y < H * 0.5; p.t = p.fixed ? 1 : 0; } draw(); }
    else raf = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', init); window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerdown', onDown); document.removeEventListener('mouseleave', onLeave); document.removeEventListener('visibilitychange', onVis); };
  }, [reduced]);

  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-0 h-full w-full" />;
}
