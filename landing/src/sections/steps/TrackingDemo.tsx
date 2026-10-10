import { AnimatePresence, motion } from 'framer-motion';
import { Check, Crosshair, Minus, RotateCcw, Rocket, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/cn';
import { Pill } from '../../ui/Badge';

type Phase = 'v1' | 'lost' | 'scanning' | 'healed';
const SIGNALS: [string, 'hit' | 'partial' | 'miss', string][] = [
  ['text', 'hit', '“Proceed to chekout →” ≈ 0.91'], ['aria-label', 'hit', 'equal'], ['tag / role', 'hit', 'button'], ['structure', 'partial', 'parents moved'], ['id', 'miss', 'checkout-btn → pay-cta'], ['classes', 'miss', 'btn* → ui-btn*']
];

/** Step 02 — ship a redesign; the selector dies; the tracker re-locks onto the element from semantic signals. */
export default function TrackingDemo() {
  const [phase, setPhase] = useState<Phase>('v1'); const [shown, setShown] = useState(0); const timers = useRef<number[]>([]);
  const clear = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  useEffect(() => clear, []);
  const ship = () => {
    clear(); setPhase('lost'); setShown(0);
    timers.current.push(window.setTimeout(() => setPhase('scanning'), 900));
    SIGNALS.forEach((_, i) => timers.current.push(window.setTimeout(() => setShown(i + 1), 1300 + i * 280)));
    timers.current.push(window.setTimeout(() => setPhase('healed'), 1300 + SIGNALS.length * 280 + 250));
  };
  const reset = () => { clear(); setPhase('v1'); setShown(0); };
  const v2 = phase !== 'v1';

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Code title="v1 · what you patched" active={!v2}>
          <L>{'<aside class="cart-summary">'}</L>
          <L i={1} hl={phase === 'v1' ? 'accent' : undefined}>{'<button id="checkout-btn"'}</L>
          <L i={2}>{'class="btn btn-primary"'}</L><L i={2}>{'aria-label="Proceed to checkout">'}</L>
          <L i={2}>Proceed to chekout</L><L i={1}>{'</button>'}</L><L>{'</aside>'}</L>
        </Code>
        <Code title="v2 · vendor redesign" active={v2} dim={!v2}>
          <L>{'<div class="grid">'}</L><L i={1}>{'<aside class="order-summary">'}</L>
          <L i={2} hl={phase === 'healed' ? 'accent' : phase === 'lost' ? 'danger' : undefined}>{'<button id="pay-cta"'}</L>
          <L i={3}>{'class="ui-btn ui-btn--cta"'}</L><L i={3}>{'aria-label="Proceed to checkout">'}</L>
          <L i={3}>Proceed to chekout →</L><L i={2}>{'</button>'}</L>
        </Code>
      </div>

      <div className="surface rounded-xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="mono-label">Target selector</span>
            <code className={cn('rounded-md px-2 py-1 font-mono text-[12px] transition-all duration-500', phase === 'v1' && 'bg-accent-soft text-accent-deep', phase === 'lost' && 'bg-danger-soft text-danger-deep line-through', (phase === 'scanning') && 'bg-neutral-100 text-neutral-600', phase === 'healed' && 'bg-accent-soft text-accent-deep')}>
              {phase === 'healed' ? '#pay-cta' : phase === 'scanning' ? 'locating…' : '#checkout-btn'}
            </code>
            {phase === 'lost' && <Pill tone="danger">selector broken</Pill>}
            {phase === 'v1' && <Pill tone="accent">attached</Pill>}
            {phase === 'healed' && <Pill tone="accent"><Check size={11} />self-healed</Pill>}
          </div>
          <div className="flex gap-2">
            {phase === 'v1' ? (
              <button type="button" onClick={ship} className="group flex items-center gap-2 rounded-lg bg-ink px-4 py-2 text-[13px] font-semibold text-canvas shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition-all hover:bg-white active:scale-[0.98]"><Rocket size={14} />Ship the redesign</button>
            ) : (
              <button type="button" onClick={reset} className="flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-panel px-3.5 py-2 font-mono text-[11.5px] text-neutral-700 transition-colors hover:text-ink"><RotateCcw size={12} />Replay</button>
            )}
          </div>
        </div>

        <AnimatePresence initial={false}>
          {(phase === 'scanning' || phase === 'healed') && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ type: 'spring', stiffness: 160, damping: 24 }} className="overflow-hidden">
              <div className="mt-4 grid gap-x-6 gap-y-1.5 border-t border-neutral-200/80 pt-4 sm:grid-cols-2">
                {SIGNALS.map(([name, kind, note], i) => (
                  <motion.div key={name} initial={{ opacity: 0, x: -8 }} animate={i < shown ? { opacity: 1, x: 0 } : { opacity: 0.18, x: 0 }} className="flex items-center gap-2 text-[12px]">
                    <span className={cn('grid h-4 w-4 shrink-0 place-items-center rounded-full', kind === 'hit' ? 'bg-accent text-white' : kind === 'partial' ? 'bg-neutral-300 text-white' : 'bg-danger-soft text-danger-deep')}>
                      {kind === 'hit' ? <Check size={10} strokeWidth={3} /> : kind === 'partial' ? <Minus size={10} strokeWidth={3} /> : <X size={10} strokeWidth={3} />}
                    </span>
                    <span className="w-[74px] font-mono font-medium text-ink">{name}</span><span className="truncate text-neutral-600">{note}</span>
                  </motion.div>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-3">
                <Crosshair size={15} className={phase === 'healed' ? 'text-accent' : 'animate-spin text-neutral-500'} style={{ animationDuration: '2.4s' }} />
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-100"><motion.div className="h-full rounded-full bg-accent" initial={{ width: 0 }} animate={{ width: phase === 'healed' ? '84%' : `${(shown / SIGNALS.length) * 70}%` }} transition={{ type: 'spring', stiffness: 70, damping: 18 }} /></div>
                <span className="w-24 text-right font-mono text-[12px] font-semibold tabular-nums text-ink">{phase === 'healed' ? '84% confident' : 'scoring…'}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {phase === 'v1' && <p className="mt-3 text-[12.5px] text-neutral-600">Your patch is attached to <code className="font-mono text-ink">#checkout-btn</code>. Ship a redesign and watch what a plain selector would do.</p>}
      </div>
    </div>
  );
}

function Code({ title, children, active, dim }: { title: string; children: React.ReactNode; active?: boolean; dim?: boolean }) {
  return (
    <div className={cn('rounded-xl border bg-panel p-4 transition-all duration-500', active ? 'border-neutral-300 shadow-sm' : 'border-neutral-200', dim && 'opacity-45')}>
      <div className="mono-label mb-3">{title}</div><div className="space-y-0.5 font-mono text-[11.5px] leading-[1.7] text-neutral-700">{children}</div>
    </div>
  );
}
function L({ children, i = 0, hl }: { children: React.ReactNode; i?: number; hl?: 'accent' | 'danger' }) {
  return <div className={cn('truncate rounded px-1.5 transition-colors duration-500', hl === 'accent' && 'bg-accent-soft text-accent-deep', hl === 'danger' && 'bg-danger-soft text-danger-deep')} style={{ paddingLeft: 6 + i * 14 }}>{children}</div>;
}
