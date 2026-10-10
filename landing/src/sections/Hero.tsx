import { motion } from 'framer-motion';
import { ArrowRight, ArrowUpRight, Check, MousePointerClick, RotateCcw, Zap } from 'lucide-react';
import { lazy, Suspense, useCallback, useState } from 'react';
import { useInView } from '../hooks/useInView';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useWebGL } from '../hooks/useWebGL';
import { BROKEN_COUNT } from '../scene/treeData';
import { STUDIO_URL } from '../lib/env';
import { Badge, Dot } from '../ui/Badge';
import { PrimaryButton, SecondaryButton } from '../ui/Button';

const HeroScene = lazy(() => import('../scene/HeroScene'));

const reveal = (i: number) => ({ initial: { opacity: 0, y: 26, filter: 'blur(6px)' }, animate: { opacity: 1, y: 0, filter: 'blur(0px)' }, transition: { type: 'spring' as const, stiffness: 90, damping: 20, delay: 0.15 + i * 0.09 } });

function StaticTree() {
  // graceful fallback when WebGL is unavailable
  return (
    <svg viewBox="0 0 400 300" className="absolute right-[4%] top-1/2 hidden h-[70%] -translate-y-1/2 text-steel-400 lg:block" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden>
      {[[200, 30, 80, 100], [200, 30, 200, 100], [200, 30, 320, 100], [80, 100, 50, 180], [80, 100, 120, 180], [200, 100, 200, 180], [320, 100, 290, 180], [320, 100, 350, 180]].map(([a, b, c, d], i) => <path key={i} d={`M${a} ${b + 14} V${(b + d) / 2} H${c} V${d - 14}`} />)}
      {[[200, 30], [80, 100], [200, 100], [320, 100], [50, 180], [120, 180], [200, 180], [290, 180], [350, 180]].map(([x, y], i) => <rect key={i} x={x - 30} y={y - 14} width="60" height="28" rx="4" className={i === 6 ? 'animate-softPulse text-coral' : ''} stroke={i === 6 ? '#DE6A5F' : 'currentColor'} />)}
    </svg>
  );
}

export default function Hero() {
  const webgl = useWebGL(), reduced = useReducedMotion();
  const [ref, inView] = useInView<HTMLElement>({ threshold: 0.02 });
  const [resetKey, setResetKey] = useState(0);
  const [patched, setPatched] = useState(0);
  const onPatched = useCallback((c: number) => setPatched(c), []);
  const touch = typeof matchMedia !== 'undefined' && matchMedia('(hover: none)').matches;
  const open = BROKEN_COUNT - patched, allFixed = open === 0;

  return (
    <section id="top" ref={ref} className="relative isolate min-h-[100svh] overflow-hidden bg-gradient-to-b from-alabaster-50 via-alabaster-100 to-alabaster-200 noise">
      <div aria-hidden className="grid-bg pointer-events-none absolute inset-0 -z-10" />
      <div aria-hidden className="pointer-events-none absolute -left-40 top-1/3 -z-10 h-[560px] w-[560px] rounded-full bg-sage/10 blur-[110px]" />
      <div aria-hidden className="pointer-events-none absolute -right-32 top-10 -z-10 h-[460px] w-[460px] rounded-full bg-coral/10 blur-[110px]" />

      {/* 3D canvas — fills the hero; copy sits above it with pointer-events disabled except on controls */}
      <div className="absolute inset-x-0 bottom-0 z-0 h-[480px] lg:inset-0 lg:h-auto" role="img" aria-label="Interactive 3D wireframe of a web component tree with three broken elements that can be hotfixed by hovering or clicking them">
        {webgl ? <Suspense fallback={null}><HeroScene active={inView} reduced={reduced} resetKey={resetKey} onPatched={onPatched} /></Suspense> : <StaticTree />}
      </div>

      <div className="pointer-events-none relative z-10 mx-auto flex min-h-[100svh] w-full max-w-[1264px] flex-col justify-start px-5 pb-[500px] pt-32 sm:px-8 lg:justify-center lg:pb-24 lg:pt-28">
        <div className="max-w-[640px]">
          <motion.div {...reveal(0)} className="pointer-events-auto inline-block">
            <Badge icon={<Zap size={13} className="text-sage" fill="currentColor" />}>[ Instant Hotfixes <span className="mx-1 text-steel-400">•</span> Zero Full-Site Redeploys ]</Badge>
          </motion.div>
          <motion.h1 {...reveal(1)} className="mt-7 font-display text-[46px] font-semibold leading-[0.98] tracking-[-0.05em] text-ink sm:text-[64px] lg:text-[80px]">
            Hotfix Production <br className="hidden sm:block" />in <span className="font-serif font-normal italic tracking-[-0.03em]">Seconds.</span>{' '}
            <span className="text-steel-400">Not&nbsp;Sprints.</span>
          </motion.h1>
          <motion.p {...reveal(2)} className="mt-7 max-w-[540px] text-[17px] leading-[1.65] text-steel-600 sm:text-[18px]">
            Visually patch live web apps, semantically track moved DOM elements, and auto-rollback regressions before users notice. Complete with isolated sandboxes and cryptographic audit trails.
          </motion.p>
          <motion.div {...reveal(3)} className="pointer-events-auto mt-9 flex flex-wrap items-center gap-3">
            <PrimaryButton href={STUDIO_URL} icon={<ArrowRight size={14} />}>Open Visual Studio</PrimaryButton>
            <SecondaryButton href="#playground" icon={<ArrowUpRight size={15} />}>Explore Live Demo</SecondaryButton>
          </motion.div>
          <motion.p {...reveal(4)} className="mono-label mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 normal-case tracking-[0.04em]">
            <span className="flex items-center gap-2"><Dot tone="sage" />No rebuild</span><span className="flex items-center gap-2"><Dot tone="sage" />Any origin</span><span className="flex items-center gap-2"><Dot tone="sage" />Chrome extension</span>
          </motion.p>
        </div>
      </div>

      {/* live HUD: incidents → patched */}
      {webgl && (
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9, type: 'spring', stiffness: 100, damping: 18 }} className="pointer-events-none absolute inset-x-0 bottom-6 z-20">
          <div className="mx-auto flex w-full max-w-[1264px] flex-col items-stretch gap-3 px-5 sm:px-8 lg:flex-row lg:items-end lg:justify-between">
            <p className="mono-label hidden items-center gap-2 normal-case tracking-[0.04em] lg:flex"><MousePointerClick size={14} className="text-steel-400" />{touch ? 'Tap a pulsing node to hotfix it' : 'Hover a pulsing node to lock on · hold or click to hotfix'}</p>
            <div className="glass-strong pointer-events-auto flex items-center gap-4 rounded-2xl px-4 py-3 sm:gap-6 sm:px-5" role="status" aria-live="polite">
              <div>
                <div className="mono-label">Incidents</div>
                <div className="mt-1.5 flex items-center gap-2">
                  {Array.from({ length: BROKEN_COUNT }).map((_, i) => <span key={i} className={`h-2.5 w-2.5 rounded-full transition-all duration-500 ${i < patched ? 'scale-100 bg-sage' : 'animate-softPulse bg-coral'}`} />)}
                  <span className="whitespace-nowrap font-mono text-[13px] font-medium tabular-nums text-ink">{allFixed ? 'all hotfixed' : `${open} open`}</span>
                </div>
              </div>
              <div className="h-9 w-px bg-ink/10" />
              <div><div className="mono-label">Redeploys</div><div className="mt-1 font-mono text-[15px] font-semibold tabular-nums text-ink">0</div></div>
              <div className="h-9 w-px bg-ink/10" />
              <button onClick={() => { setPatched(0); setResetKey((k) => k + 1); }} className="group flex items-center gap-2 rounded-full border border-ink/10 px-3 py-1.5 font-mono text-[11.5px] font-medium text-steel-600 transition-colors hover:border-ink/30 hover:text-ink" aria-label="Reset the scene">
                {allFixed ? <Check size={13} className="text-sage" /> : <RotateCcw size={13} className="transition-transform duration-500 group-hover:-rotate-180" />}{allFixed ? 'Break it again' : 'Reset'}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </section>
  );
}
