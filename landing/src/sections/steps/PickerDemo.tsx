import { AnimatePresence, motion } from 'framer-motion';
import { MousePointer2, RotateCcw, Undo2 } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../../lib/cn';
import { Pill } from '../../ui/Badge';

const SWATCHES = [['#1F2937', 'Carbon'], ['#10B981', 'Emerald'], ['#6B7280', 'Slate']] as const;
const spring = { type: 'spring', stiffness: 380, damping: 28 } as const;

/** Step 01 — pick an element, tweak its properties, watch it change live. Everything shown here is a reversible "operation". */
export default function PickerDemo() {
  const [selected, setSelected] = useState(false), [hover, setHover] = useState(false);
  const [enabled, setEnabled] = useState(false), [label, setLabel] = useState('Proceed to chekout'), [tone, setTone] = useState(2), [radius, setRadius] = useState(8);
  const ops = (enabled ? 1 : 0) + (label !== 'Proceed to chekout' ? 1 : 0) + (tone !== 2 ? 1 : 0) + (radius !== 8 ? 1 : 0);
  const reset = () => { setSelected(false); setEnabled(false); setLabel('Proceed to chekout'); setTone(2); setRadius(8); };

  return (
    <div className="grid gap-4 sm:grid-cols-[1.15fr_1fr]">
      {/* mock page */}
      <div className="relative overflow-hidden rounded-xl border border-neutral-200 bg-panel p-5 shadow-sm">
        <div className="mono-label mb-4 flex items-center justify-between"><span>shop.example.com/cart</span><span className="flex gap-1">{[0, 1, 2].map((i) => <i key={i} className="h-1.5 w-1.5 rounded-full bg-neutral-200" />)}</span></div>
        <div className="space-y-2.5 text-[13px] text-neutral-700">
          <div className="flex justify-between"><span>Aurora Headphones</span><span className="font-medium text-ink">$129.00</span></div>
          <div className="flex justify-between"><span>Shipping</span><span>Free</span></div>
          <div className="h-px bg-white/[0.08]" />
          <div className="flex justify-between text-[14px] font-medium text-ink"><span>Total</span><span>$129.00</span></div>
        </div>
        <div className="relative mt-5">
          <motion.button type="button" onHoverStart={() => setHover(true)} onHoverEnd={() => setHover(false)} onClick={() => setSelected(true)} layout transition={spring}
            className={cn('relative w-full px-4 py-3 text-[14px] font-medium text-white transition-[opacity,filter] duration-300', !enabled && 'cursor-pointer opacity-50 saturate-0')}
            style={{ background: SWATCHES[tone][0], borderRadius: radius }} aria-label="Checkout button (click to select)">
            {label}
          </motion.button>
          <AnimatePresence>
            {(hover || selected) && (
              <motion.div initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={spring} aria-hidden
                className={cn('pointer-events-none absolute -inset-1.5 rounded-[14px] border-[1.5px]', selected ? 'border-accent bg-accent/[0.06]' : 'border-ink/40 border-dashed')}>
                <span className={cn('absolute -top-[26px] left-0 rounded-md px-2 py-1 font-mono text-[10.5px] text-white', selected ? 'bg-accent-deep' : 'bg-ink')}>button#checkout-btn</span>
              </motion.div>
            )}
          </AnimatePresence>
          {!selected && (
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="pointer-events-none absolute -bottom-7 right-1 flex items-center gap-1.5 font-mono text-[10.5px] text-neutral-600">
              <MousePointer2 size={12} className="animate-floaty" />click the button
            </motion.span>
          )}
        </div>
        <div className="mt-9 flex items-center gap-2 text-[11px] text-neutral-600">
          <Pill tone={enabled ? 'accent' : 'danger'}>{enabled ? 'disabled=false' : 'disabled=true'}</Pill>
          {label === 'Proceed to chekout' && <Pill tone="danger">typo</Pill>}
          <span className="ml-auto font-mono text-neutral-600">&lt;button.checkout&gt;</span>
        </div>
      </div>

      {/* inspector */}
      <div className="surface rounded-xl p-4">
        <div className="mono-label mb-3 flex items-center justify-between">Inspector<span className="text-accent-deep">{selected ? `${ops} op${ops === 1 ? '' : 's'}` : 'no selection'}</span></div>
        <div className={cn('space-y-4 transition-opacity duration-300', !selected && 'pointer-events-none opacity-40')}>
          <label className="block"><span className="mono-label">Text</span>
            <input value={label} onChange={(e) => setLabel(e.target.value)} className="mt-1.5 w-full rounded-lg border border-neutral-300 bg-panel px-3 py-2 text-[13px] outline-none transition-shadow focus:shadow-[0_0_0_3px_rgba(95,156,128,.25)]" />
          </label>
          <div className="flex items-center justify-between"><span className="mono-label">Enabled</span>
            <button type="button" role="switch" aria-checked={enabled} onClick={() => setEnabled((v) => !v)} className={cn('relative h-6 w-11 rounded-full transition-colors duration-300', enabled ? 'bg-accent' : 'bg-neutral-300')}>
              <motion.span layout transition={spring} className="absolute top-0.5 h-5 w-5 rounded-full bg-panel shadow" style={{ left: enabled ? 22 : 2 }} />
            </button>
          </div>
          <div><span className="mono-label">Colour</span>
            <div className="mt-2 flex gap-2">{SWATCHES.map(([c, n], i) => <button key={c} type="button" aria-label={n} onClick={() => setTone(i)} className={cn('h-7 w-7 rounded-full ring-offset-2 ring-offset-white/60 transition-all', tone === i ? 'scale-110 ring-2 ring-ink/70' : 'hover:scale-105')} style={{ background: c }} />)}</div></div>
          <label className="block"><span className="mono-label">Radius · {radius}px</span><input type="range" min={0} max={26} value={radius} onChange={(e) => setRadius(+e.target.value)} style={{ ["--fill" as string]: `${(radius / 26) * 100}%` }} className="mt-2 w-full" /></label>
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-neutral-200/80 pt-3">
          <span className="text-[11.5px] text-neutral-600">Every change is a small, reversible patch.</span>
          <button type="button" onClick={reset} className="flex items-center gap-1.5 font-mono text-[11px] text-neutral-600 transition-colors hover:text-ink">{ops ? <Undo2 size={12} /> : <RotateCcw size={12} />}Reset</button>
        </div>
      </div>
    </div>
  );
}
