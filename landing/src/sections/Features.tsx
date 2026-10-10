import { motion } from 'framer-motion';
import { Crosshair, FlaskConical, Link2, Network, ShieldCheck, Undo2, type LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useInView } from '../hooks/useInView';
import { cn } from '../lib/cn';
import { Dot } from '../ui/Badge';
import { SectionHeading } from '../ui/SectionHeading';

interface F { icon: LucideIcon; tag: string; title: string; body: string; span: string; visual: React.ReactNode }

function Bars() {
  const rows: [string, number][] = [['text', 91], ['aria-label', 100], ['structure', 62], ['context', 74], ['id', 0]];
  return <div className="mt-6 space-y-2.5">{rows.map(([n, v], i) => (
    <div key={n} className="flex items-center gap-3 font-mono text-[11px]"><span className="w-20 text-steel-500">{n}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-steel-100"><motion.div initial={{ width: 0 }} whileInView={{ width: `${v}%` }} viewport={{ once: true }} transition={{ type: 'spring', stiffness: 60, damping: 18, delay: 0.1 + i * 0.07 }} className={cn('h-full rounded-full', v === 0 ? 'bg-coral/50' : 'bg-sage')} /></div>
      <span className="w-9 text-right tabular-nums text-ink">{v}%</span></div>))}
    <div className="flex items-center justify-between border-t border-ink/[0.07] pt-3 font-mono text-[11.5px]"><span className="text-steel-500">match confidence</span><span className="rounded-full bg-sage-soft px-2.5 py-0.5 font-semibold text-sage-deep">84% · self-healed</span></div></div>;
}
function Hosts() {
  const rows: [string, string, 'sage' | 'steel' | 'coral'][] = [['shop.example.com', 'live', 'sage'], ['pv3fa9bc.shop.example.com', 'preview', 'steel'], ['rel2.shop.example.com', 'v2', 'steel']];
  return <div className="mt-6 space-y-2">{rows.map(([h, l, t]) => <div key={h} className="flex items-center gap-2.5 rounded-lg border border-ink/[0.07] bg-white/70 px-3 py-2 font-mono text-[11px]"><Dot tone={t} /><span className="truncate text-ink">{h}</span><span className="ml-auto text-steel-500">{l}</span></div>)}</div>;
}
function Checks() {
  const rows: [string, 'pass' | 'warn'][] = [['critical flow · checkout', 'pass'], ['console & network', 'pass'], ['accessibility · axe', 'pass'], ['visual diff · 2 viewports', 'warn']];
  return <div className="mt-6 space-y-2">{rows.map(([n, s], i) => <motion.div key={n} initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 + i * 0.09 }} className="flex items-center gap-2.5 text-[12px] text-ink-soft">
    <span className={cn('grid h-4 w-4 place-items-center rounded-full text-white', s === 'pass' ? 'bg-sage' : 'bg-steel-400')}><svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d={s === 'pass' ? 'M2.5 6.5l2.2 2.2L9.5 3.5' : 'M3 6h6'} /></svg></span>{n}</motion.div>)}</div>;
}
function Gauge() {
  const [v, setV] = useState(1); const [ref, inView] = useInView<HTMLDivElement>();
  useEffect(() => { if (!inView) return; let t = 0; const id = setInterval(() => { t = (t + 1) % 22; setV(t < 14 ? t * 0.55 : 0.3); }, 160); return () => clearInterval(id); }, [inView]);
  const tripped = v >= 4;
  return <div ref={ref} className="mt-9"><div className="relative h-10">
    <div className="absolute inset-0 overflow-hidden rounded-xl bg-steel-100"><motion.div className={cn('absolute inset-y-0 left-0 rounded-xl transition-colors', tripped ? 'bg-coral' : 'bg-sage')} animate={{ width: `${Math.min(100, (v / 8) * 100)}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} /></div>
    <div className="absolute -inset-y-1.5 w-px bg-ink/60" style={{ left: '50%' }}><span className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[9.5px] text-ink">limit 4</span></div></div>
    <div className="mt-2 flex justify-between font-mono text-[11px]"><span className="text-steel-500">errors / min <b className="text-ink">{v.toFixed(1)}</b></span><span className={tripped ? 'text-coral-deep' : 'text-sage-deep'}>{tripped ? '↩ auto-rollback' : 'within threshold'}</span></div></div>;
}
function Chain() {
  return <div className="mt-6"><div className="flex items-center gap-1.5">{['9c1f', 'a07e', '3b52', 'e48d'].map((h, i) => <div key={h} className="flex items-center gap-1.5"><div className="rounded-lg border border-ink/[0.08] bg-white/80 px-2 py-2 text-center font-mono text-[10px] leading-tight"><div className="text-steel-400">#{i + 1}</div><div className="text-ink">{h}…</div></div>{i < 3 && <span className="h-px w-2 bg-sage" />}</div>)}</div><div className="mt-3 flex items-center gap-2 font-mono text-[11px] text-sage-deep"><span className="h-1.5 w-1.5 rounded-full bg-sage" />chain intact · 4 / 4 seals verified</div></div>;
}

const FEATURES: F[] = [
  { icon: Crosshair, tag: 'Tracking', title: 'Smart Element Tracking', body: 'Weighted signals — text, ARIA labels, structure and context — keep patches attached after redesigns. Ambiguous matches are held back, never applied to the wrong element.', span: 'lg:col-span-4', visual: <Bars /> },
  { icon: Network, tag: 'Isolation', title: 'Isolated Sandbox Previews', body: 'Every patch set gets its own origin. Test against real data without a single visitor seeing it.', span: 'lg:col-span-2', visual: <Hosts /> },
  { icon: FlaskConical, tag: 'Verification', title: 'Automated Synthetic Regressions', body: 'Real browsers replay your critical flows against live and candidate, then diff console, accessibility and pixels.', span: 'lg:col-span-2', visual: <Checks /> },
  { icon: Undo2, tag: 'Safety net', title: 'Safety-Net Threshold Rollbacks', body: 'Cross an error threshold and the release reverts itself — before a human notices.', span: 'lg:col-span-2', visual: <Gauge /> },
  { icon: Link2, tag: 'Integrity', title: 'SHA-256 Hash Chain Integrity', body: 'Every action seals the one before it. Rewrite history and the break is pinpointed.', span: 'lg:col-span-2', visual: <Chain /> }
];

export default function Features() {
  return (
    <section id="features" className="section-pad relative">
      <div className="container-x">
        <SectionHeading eyebrow="Features" title={<>Built for the <span className="font-serif font-normal italic">worst</span> Friday afternoon.</>}>
          Five systems that make hotfixing production feel boring — in the best way.
        </SectionHeading>
        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-6">
          {FEATURES.map((f, i) => (
            <motion.div key={f.title} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ type: 'spring', stiffness: 90, damping: 20, delay: (i % 3) * 0.06 }}
              whileHover={{ y: -6 }} className={cn('group glass relative overflow-hidden rounded-[26px] p-6 transition-shadow duration-500 hover:shadow-lift sm:p-7', f.span)}>
              <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-sage/0 blur-3xl transition-colors duration-700 group-hover:bg-sage/15" />
              <div className="flex items-center justify-between">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-ink text-sage shadow-pill"><f.icon size={18} /></span>
                <span className="mono-label">{f.tag}</span>
              </div>
              <h3 className="mt-6 font-display text-[22px] font-semibold leading-tight tracking-[-0.025em]">{f.title}</h3>
              <p className="mt-2.5 text-[14.5px] leading-relaxed text-steel-600">{f.body}</p>
              {f.visual}
            </motion.div>
          ))}
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ type: 'spring', stiffness: 90, damping: 20, delay: 0.12 }} className="relative flex flex-col items-start justify-between gap-6 overflow-hidden rounded-[26px] bg-ink p-7 text-alabaster-50 shadow-lift sm:flex-row sm:items-center sm:p-9 md:col-span-2 lg:col-span-6">
            <div aria-hidden className="pointer-events-none absolute -right-24 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-sage/20 blur-[90px]" />
            <div className="relative flex items-center gap-5"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/10 text-sage"><ShieldCheck size={22} /></span>
              <div className="font-display text-[26px] font-semibold leading-[1.1] tracking-[-0.035em] sm:text-[32px]">All of it, <span className="font-serif font-normal italic text-[#9FD3B8]">one click</span> from undone.</div></div>
            <p className="relative max-w-sm text-[14.5px] leading-relaxed text-steel-300">Patches are reversible by design. Nothing you ship here is permanent — and everything is on the record.</p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
