import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, ArrowUpRight, Check, Lock, RotateCcw, Zap } from 'lucide-react';
import { lazy, Suspense, useCallback, useMemo, useState } from 'react';
import { useInView } from '../hooks/useInView';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useWebGL } from '../hooks/useWebGL';
import Callouts from '../scene/Callouts';
import { createStore } from '../scene/store';
import { BROKEN_COUNT } from '../scene/treeData';
import { STUDIO_URL } from '../lib/env';
import { Badge, Dot } from '../ui/Badge';
import { PrimaryButton, SecondaryButton } from '../ui/Button';

const HeroScene = lazy(() => import('../scene/HeroScene'));
const reveal = (i: number) => ({ initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { type: 'spring' as const, stiffness: 110, damping: 22, delay: 0.1 + i * 0.07 } });

function StaticTree() {
  return (
    <svg viewBox="0 0 400 300" className="absolute inset-0 m-auto h-[80%] w-[90%] text-neutral-400" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden>
      {[[200, 30, 80, 100], [200, 30, 200, 100], [200, 30, 320, 100], [80, 100, 50, 180], [80, 100, 120, 180], [200, 100, 200, 180], [320, 100, 290, 180], [320, 100, 350, 180]].map(([a, b, c, d], i) => <path key={i} d={`M${a} ${b + 14} V${(b + d) / 2} H${c} V${d - 14}`} />)}
      {[[200, 30], [80, 100], [200, 100], [320, 100], [50, 180], [120, 180], [200, 180], [290, 180], [350, 180]].map(([x, y], i) => <rect key={i} x={x - 30} y={y - 14} width="60" height="28" rx="4" className={i === 6 ? 'text-danger' : ''} stroke={i === 6 ? '#F2555C' : 'currentColor'} />)}
    </svg>
  );
}

export default function Hero() {
  const webgl = useWebGL(), reduced = useReducedMotion();
  const [ref, inView] = useInView<HTMLElement>({ threshold: 0.02 });
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const copyY = useTransform(scrollYProgress, [0, 1], [0, -90]), copyO = useTransform(scrollYProgress, [0, 0.8], [1, 0.15]);
  const frameY = useTransform(scrollYProgress, [0, 1], [0, 70]), frameS = useTransform(scrollYProgress, [0, 1], [1, 0.95]);
  const store = useMemo(createStore, []);
  const [resetKey, setResetKey] = useState(0), [patched, setPatched] = useState(0);
  const onPatched = useCallback((c: number) => setPatched(c), []);
  const touch = typeof matchMedia !== 'undefined' && matchMedia('(hover: none)').matches;
  const open = BROKEN_COUNT - patched, allFixed = open === 0;

  return (
    <section id="top" ref={ref} className="relative isolate overflow-hidden pb-16 pt-32 lg:pb-24 lg:pt-40">
      <div aria-hidden className="grid-bg pointer-events-none absolute inset-0 -z-10" />
      <div className="mx-auto w-full max-w-[1264px] px-5 sm:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-[0.95fr_1.1fr] lg:gap-14">
          {/* copy */}
          <motion.div style={{ y: copyY, opacity: copyO }} className="relative">
            <div aria-hidden className="pointer-events-none absolute -inset-x-20 -inset-y-14 -z-10 bg-[radial-gradient(ellipse_at_42%_46%,rgba(6,7,11,0.86),rgba(6,7,11,0.55)_52%,transparent_74%)]" />
            <motion.div {...reveal(0)}><Badge icon={<Zap size={12} className="text-accent" fill="currentColor" />}>[ Instant Hotfixes <span className="mx-0.5 text-neutral-400">•</span> Zero Full-Site Redeploys ]</Badge></motion.div>
            <motion.h1 {...reveal(1)} className="mt-6 text-[44px] font-semibold leading-[1.02] tracking-[-0.045em] text-neutral-900 sm:text-[58px] lg:text-[64px]">
              Hotfix Production in Seconds. <span className="text-neutral-500">Not&nbsp;Sprints.</span>
            </motion.h1>
            <motion.p {...reveal(2)} className="mt-6 max-w-[520px] text-[17px] leading-[1.65] text-neutral-700">
              Visually patch live web apps, semantically track moved DOM elements, and auto-rollback regressions before users notice. Complete with isolated sandboxes and cryptographic audit trails.
            </motion.p>
            <motion.div {...reveal(3)} className="mt-8 flex flex-wrap items-center gap-3">
              <PrimaryButton href={STUDIO_URL} icon={<ArrowRight size={13} />}>Open Visual Studio</PrimaryButton>
              <SecondaryButton href="#playground" icon={<ArrowUpRight size={15} />}>Explore Live Demo</SecondaryButton>
            </motion.div>
            <motion.dl {...reveal(4)} className="mt-9 grid max-w-[520px] grid-cols-3 gap-6 border-t border-neutral-200 pt-6">
              {[['v1.4.2', 'runtime'], ['212ms', 'p95 after patch'], ['0', 'redeploys']].map(([v, l]) => (
                <div key={l}><dt className="font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-600">{l}</dt><dd className="mt-1.5 font-mono text-[19px] font-medium tabular-nums text-neutral-900">{v}</dd></div>
              ))}
            </motion.dl>
          </motion.div>

          {/* 3D scene in an intentional browser frame */}
          <motion.div style={{ y: frameY, scale: frameS }}>
          <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 80, damping: 20, delay: 0.25 }} className="surface-raised overflow-hidden">
            <div className="flex h-10 items-center gap-3 border-b border-neutral-200/80 bg-neutral-50 px-3.5">
              <div className="flex gap-1.5" aria-hidden>{[0, 1, 2].map((i) => <i key={i} className="h-2.5 w-2.5 rounded-full bg-neutral-300" />)}</div>
              <div className="mx-auto flex h-6 w-full max-w-[300px] items-center gap-2 rounded-md border border-neutral-200 bg-panel px-2.5 font-mono text-[11px] text-neutral-700"><Lock size={10} className="text-neutral-500" /><span className="truncate">shop.example.com/checkout</span></div>
              <span className="hidden font-mono text-[11px] text-neutral-600 sm:inline">v1.4.2</span>
            </div>
            <div className="dot-bg relative h-[400px] bg-canvas sm:h-[460px] lg:h-[500px]" role="img" aria-label="Interactive 3D wireframe of a web component tree. Three broken elements can be hotfixed by clicking them.">
              {webgl ? <Suspense fallback={null}><HeroScene store={store} active={inView} reduced={reduced} resetKey={resetKey} onPatched={onPatched} /></Suspense> : <StaticTree />}
              {webgl && <Callouts store={store} patched={patched} />}
              <span className="pointer-events-none absolute right-3 top-3 max-w-[calc(100%-1.5rem)] truncate rounded-md border border-neutral-200 bg-panel/95 px-2 py-1 font-mono text-[10px] text-neutral-700 shadow-subtle sm:text-[10.5px]">[ ✦ Drag to rotate • {touch ? 'Tap' : 'Click'} node to patch ]</span>
              <span className="pointer-events-none absolute bottom-3 left-3 hidden items-center gap-1.5 rounded-md sm:top-3 sm:bottom-auto sm:flex border border-neutral-200 bg-panel/95 px-2 py-1 font-mono text-[10.5px] font-medium text-neutral-800 shadow-subtle">
                <Dot tone={allFixed ? 'accent' : 'danger'} pulse={!allFixed} />{allFixed ? 'PATCHED · 200 OK' : 'PRODUCTION · 3 FAILING'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-neutral-200/80 bg-neutral-50 px-4 py-2.5" role="status" aria-live="polite">
              <div className="flex items-center gap-5">
                <div className="flex items-center gap-2"><span className="mono-label hidden sm:inline">Incidents</span>
                  <span className="flex items-center gap-1">{Array.from({ length: BROKEN_COUNT }).map((_, i) => <span key={i} className={`h-2 w-2 rounded-full transition-colors duration-500 ${i < patched ? 'bg-accent' : 'animate-softPulse bg-danger'}`} />)}</span>
                  <span className="whitespace-nowrap font-mono text-[12px] font-medium tabular-nums text-neutral-900">{allFixed ? 'all hotfixed' : `${open} open`}</span></div>
                <div className="flex items-center gap-2"><span className="mono-label">Redeploys</span><span className="font-mono text-[12px] font-medium tabular-nums text-neutral-900">0</span></div>
              </div>
              <button onClick={() => { setPatched(0); setResetKey((k) => k + 1); }} aria-label="Reset the scene" className="group flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-panel px-2.5 py-1 font-mono text-[11px] font-medium text-neutral-800 shadow-subtle transition-colors hover:border-neutral-400">
                {allFixed ? <Check size={12} className="text-accent" /> : <RotateCcw size={12} className="transition-transform duration-500 group-hover:-rotate-180" />}{allFixed ? 'Break again' : 'Reset'}
              </button>
            </div>
          </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
