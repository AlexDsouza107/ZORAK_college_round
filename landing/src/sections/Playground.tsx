import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Check, Loader2, RotateCcw, Wrench } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useInView } from '../hooks/useInView';
import { cn } from '../lib/cn';
import { Dot, Pill } from '../ui/Badge';
import { SectionHeading } from '../ui/SectionHeading';
import TelemetryChart from './TelemetryChart';

type Phase = 'broken' | 'patching' | 'fixed';
const N = 64;
const initial = () => Array.from({ length: N }, (_, i) => 8 + (i / N) ** 1.6 * 70 + Math.sin(i * 0.8) * 3);
const ERRORS = ['TypeError: submitOrder is not a function', 'Unhandled click · #checkout-btn', 'POST /api/orders → 0 (no request sent)', 'ReferenceError: handler is undefined'];
const spring = { type: 'spring', stiffness: 220, damping: 22 } as const;

export default function Playground() {
  const [ref, inView] = useInView<HTMLDivElement>({ threshold: 0.2 });
  const [phase, setPhase] = useState<Phase>('broken');
  const [points, setPoints] = useState<number[]>(initial), [errors, setErrors] = useState(412);
  const level = useRef(70), phaseRef = useRef<Phase>('broken'); phaseRef.current = phase;
  const [toast, setToast] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const id = setInterval(() => {
      const p = phaseRef.current, target = p === 'fixed' ? 2 : p === 'patching' ? 40 : 88;
      level.current += (target - level.current) * (p === 'fixed' ? 0.12 : 0.05);
      const noise = (Math.random() - 0.5) * (p === 'fixed' ? 1.6 : 9);
      setPoints((pts) => [...pts.slice(1), Math.max(0, level.current + noise)]);
      if (p !== 'fixed') setErrors((e) => e + 1 + Math.floor(Math.random() * (p === 'patching' ? 2 : 4)));
    }, 140);
    return () => clearInterval(id);
  }, [inView]);
  useEffect(() => { if (phase !== 'broken' || !inView) return; const id = setInterval(() => setToast((t) => t + 1), 1700); return () => clearInterval(id); }, [phase, inView]);

  const apply = () => { setPhase('patching'); setTimeout(() => setPhase('fixed'), 900); };
  const reset = () => { setPhase('broken'); level.current = 70; setPoints(initial()); setErrors(412); };
  const fixed = phase === 'fixed', broken = phase === 'broken';

  return (
    <section id="playground" className="section-pad relative overflow-hidden bg-gradient-to-b from-transparent via-alabaster-200/60 to-transparent">
      <div className="container-x" ref={ref}>
        <SectionHeading eyebrow="Live playground" title={<>Watch a regression <span className="font-serif font-normal italic">level out</span>.</>}>
          A checkout button ships broken and the error rate climbs. Apply the patch: the layout resolves, the handler is fixed, and telemetry flattens — no redeploy.
        </SectionHeading>

        <div className="mt-14 grid gap-6 lg:grid-cols-[1.05fr_1fr]">
          {/* storefront preview */}
          <motion.div layout transition={spring} className="glass-strong overflow-hidden rounded-[28px]">
            <div className="flex items-center gap-3 border-b border-ink/[0.07] bg-white/50 px-5 py-3">
              <div className="flex gap-1.5">{[0, 1, 2].map((i) => <i key={i} className="h-2.5 w-2.5 rounded-full bg-steel-200" />)}</div>
              <div className="mono-label flex-1 truncate rounded-full bg-white/70 px-3 py-1 normal-case tracking-normal">shop.example.com/checkout</div>
              <Pill tone={fixed ? 'sage' : 'coral'}><Dot tone={fixed ? 'sage' : 'coral'} pulse={broken} />{fixed ? 'healthy' : 'regression'}</Pill>
            </div>
            <div className="relative p-6 sm:p-8">
              <div className="mono-label mb-5">Order summary</div>
              <div className="space-y-3 text-[14px]">
                <div className="flex justify-between text-steel-600"><span>Aurora Headphones × 1</span><span>$129.00</span></div>
                <div className="flex justify-between text-steel-600"><span>Shipping</span><span>Free</span></div>
                <div className="h-px bg-ink/[0.08]" />
                <div className="flex items-start justify-between text-[16px] font-semibold text-ink">
                  <span>Total</span>
                  <span className={cn('origin-right text-right transition-all duration-700', !fixed && 'w-14 break-all leading-tight text-coral-deep')}>$129.00</span>
                </div>
              </div>

              <div className="relative mt-7 overflow-visible">
                <motion.button type="button" aria-disabled={!fixed} tabIndex={-1} animate={fixed ? { rotate: 0, x: 0, scale: 1 } : { rotate: -1.2, x: 14, scale: 1.02 }} transition={spring}
                  className={cn('block w-full select-none px-5 py-4 text-[15px] font-medium transition-[background-color,opacity,color,box-shadow] duration-700', fixed ? 'bg-ink text-alabaster-50 shadow-pill' : 'cursor-not-allowed bg-steel-300 text-white opacity-60')} style={{ borderRadius: fixed ? 14 : 6 }}>
                  <span className={cn('inline-flex items-center justify-center gap-2 transition-all duration-500', !fixed && 'max-w-[7rem] whitespace-normal text-center leading-tight')}>
                    {fixed && <Check size={16} className="text-sage" />}Place order
                  </span>
                </motion.button>
                {!fixed && <span className="mono-label absolute -bottom-6 left-1 normal-case tracking-normal text-coral-deep">onClick = undefined · layout overflow +14px</span>}
              </div>

              <div className="mt-10 min-h-[84px]">
                <AnimatePresence mode="wait">
                  {broken || phase === 'patching' ? (
                    <motion.div key="err" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-1.5">
                      {[0, 1].map((k) => <div key={k + toast} className="flex items-center gap-2 rounded-lg border border-coral-line bg-coral-soft px-3 py-1.5 font-mono text-[11px] text-coral-deep"><AlertTriangle size={12} />{ERRORS[(toast + k) % ERRORS.length]}</div>)}
                    </motion.div>
                  ) : (
                    <motion.div key="ok" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2.5 rounded-lg border border-sage-line bg-sage-soft px-3.5 py-3 text-[13px] text-sage-deep">
                      <Check size={15} /> Order submitted · handler resolved · layout stable
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="mt-6 flex items-center justify-between border-t border-ink/[0.07] pt-4 font-mono text-[11px] text-steel-500"><span>release v2.14.0</span><span className={fixed ? 'text-sage-deep' : 'text-coral-deep'}>{fixed ? 'patched live · 0 redeploys' : 'broken since deploy'}</span></div>
            </div>
          </motion.div>

          {/* telemetry + patch controls */}
          <div className="flex flex-col gap-6">
            <div className="glass-strong rounded-[28px] p-6 sm:p-7">
              <div className="flex items-start justify-between">
                <div><div className="mono-label">Errors since deploy</div>
                  <div className={cn('mt-2 font-display text-[54px] font-semibold leading-none tracking-[-0.05em] tabular-nums transition-colors duration-700', fixed ? 'text-sage-deep' : 'text-ink')}>{errors.toLocaleString()}</div></div>
                <div className="text-right"><div className="mono-label">Error rate</div>
                  <div className={cn('mt-2 font-mono text-[20px] font-semibold tabular-nums transition-colors duration-700', fixed ? 'text-sage-deep' : 'text-coral-deep')}>{Math.round(points[points.length - 1])}<span className="text-[12px] font-normal text-steel-500"> /min</span></div></div>
              </div>
              <div className="mt-5"><TelemetryChart points={points} healthy={fixed} /></div>
              <div className="mono-label mt-1 flex justify-between normal-case tracking-normal"><span>−9 min</span><span>now</span></div>
            </div>

            <div className="glass rounded-[24px] p-5">
              <div className="mono-label mb-3 flex items-center justify-between">Patch · p_8f21<span className={fixed ? 'text-sage-deep' : 'text-steel-500'}>{fixed ? 'live' : 'draft'}</span></div>
              <div className="overflow-hidden rounded-xl border border-ink/[0.08] bg-ink p-3.5 font-mono text-[12px] leading-[1.75]">
                <div className="text-steel-400">{'<button id="checkout-btn"'}</div>
                <AnimatePresence mode="wait" initial={false}>
                  {fixed ? (
                    <motion.div key="a" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="-mx-3.5 bg-sage/15 px-3.5 text-[#9FD3B8]">{'+ onClick={submitOrder}  style={{ width: "100%" }}'}</motion.div>
                  ) : (
                    <motion.div key="b" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} className="-mx-3.5 bg-coral/15 px-3.5 text-[#F2A59D]">{'- onClick={undefined}  style={{ width: "108%" }}'}</motion.div>
                  )}
                </AnimatePresence>
                <div className="text-steel-400">{'>Place order</button>'}</div>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <motion.button type="button" onClick={apply} disabled={!broken} whileHover={broken ? { y: -2 } : undefined} whileTap={broken ? { scale: 0.97 } : undefined} transition={spring}
                  className={cn('relative flex flex-1 items-center justify-center gap-2.5 overflow-hidden rounded-full px-6 py-3.5 text-[15px] font-medium transition-colors duration-500', broken ? 'bg-ink text-alabaster-50 shadow-pill' : fixed ? 'bg-sage text-white' : 'bg-steel-600 text-white')}>
                  {broken && <span aria-hidden className="pointer-events-none absolute inset-x-3 top-0 h-1/2 rounded-b-[999px] bg-gradient-to-b from-white/20 to-transparent" />}
                  {phase === 'patching' ? <><Loader2 size={16} className="animate-spin" />Applying patch…</> : fixed ? <><Check size={16} />Patch live · 0 redeploys</> : <><Wrench size={16} />Apply Patch</>}
                </motion.button>
                <button type="button" onClick={reset} aria-label="Replay the demo" className="grid h-[50px] w-[50px] place-items-center rounded-full border border-ink/10 text-steel-600 transition-colors hover:border-ink/30 hover:text-ink"><RotateCcw size={16} /></button>
              </div>
            </div>
          </div>
        </div>
        <p className="mono-label mt-6 text-center normal-case tracking-normal">Simulated telemetry for illustration — in the real Studio these numbers come from visitors’ browsers.</p>
      </div>
    </section>
  );
}
