import { motion } from 'framer-motion';
import { Crosshair, FlaskConical, Link2, MousePointerClick, Network, Undo2, type LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useInView } from '../hooks/useInView';
import { cn } from '../lib/cn';
import { Dot, Pill } from '../ui/Badge';
import { SectionHeading } from '../ui/SectionHeading';

/* Every card shares one surface, one padding, one header and one fixed-height "inset" for its visual. */
function Frame({ children }: { children: React.ReactNode }) { return <div className="inset flex h-[176px] flex-col justify-center gap-2 p-4">{children}</div>; }

function Tracking() {
  const rows: [string, number][] = [['text', 91], ['aria-label', 100], ['structure', 62], ['id', 0]];
  return <Frame>{rows.map(([n, v], i) => (
    <div key={n} className="flex items-center gap-3 font-mono text-[11.5px]"><span className="w-[76px] text-neutral-700">{n}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-sm bg-neutral-200"><motion.div initial={{ width: 0 }} whileInView={{ width: `${v}%` }} viewport={{ once: true }} transition={{ type: 'spring', stiffness: 70, damping: 18, delay: 0.1 + i * 0.07 }} className={cn('h-full rounded-sm', v === 0 ? 'bg-danger/60' : 'bg-accent')} /></div>
      <span className="w-9 text-right tabular-nums text-neutral-900">{v}%</span></div>))}
    <div className="mt-1 flex items-center justify-between border-t border-neutral-200 pt-2.5 font-mono text-[11.5px]"><span className="text-neutral-700">confidence</span><Pill tone="accent">84% · self-healed</Pill></div></Frame>;
}
function Hosts() {
  const rows: [string, string, 'accent' | 'neutral'][] = [['shop.example.com', 'live', 'accent'], ['pv3fa9bc.shop.example.com', 'preview', 'neutral'], ['rel2.shop.example.com', 'v2', 'neutral']];
  return <Frame>{rows.map(([h, l, t]) => <div key={h} className="flex items-center gap-2.5 rounded-md border border-neutral-200 bg-white px-3 py-2 font-mono text-[11.5px]"><Dot tone={t} /><span className="truncate text-neutral-900">{h}</span><span className="ml-auto text-neutral-600">{l}</span></div>)}</Frame>;
}
function Checks() {
  const rows: [string, 'pass' | 'warn'][] = [['critical flow · checkout', 'pass'], ['console & network', 'pass'], ['accessibility · axe', 'pass'], ['visual diff · 2 viewports', 'warn']];
  return <Frame>{rows.map(([n, s], i) => <motion.div key={n} initial={{ opacity: 0, x: -8 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 + i * 0.08 }} className="flex items-center gap-2.5 font-mono text-[11.5px] text-neutral-800">
    <span className={cn('grid h-4 w-4 place-items-center rounded-[5px] text-white', s === 'pass' ? 'bg-accent' : 'bg-neutral-400')}><svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d={s === 'pass' ? 'M2.5 6.5l2.2 2.2L9.5 3.5' : 'M3 6h6'} /></svg></span>{n}<span className="ml-auto text-neutral-600">{s}</span></motion.div>)}</Frame>;
}
function Gauge() {
  const [v, setV] = useState(1); const [ref, inView] = useInView<HTMLDivElement>();
  useEffect(() => { if (!inView) return; let t = 0; const id = setInterval(() => { t = (t + 1) % 24; setV(t < 15 ? t * 0.55 : 0.3); }, 160); return () => clearInterval(id); }, [inView]);
  const tripped = v >= 4;
  return <div ref={ref}><Frame>
    <div className="relative mt-4 h-9"><div className="absolute inset-0 overflow-hidden rounded-md bg-neutral-200"><motion.div className={cn('absolute inset-y-0 left-0 transition-colors', tripped ? 'bg-danger' : 'bg-accent')} animate={{ width: `${Math.min(100, (v / 8) * 100)}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} /></div>
      <div className="absolute -inset-y-1 w-px bg-neutral-900/70" style={{ left: '50%' }}><span className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[10px] text-neutral-900">limit 4</span></div></div>
    <div className="mt-1 flex justify-between font-mono text-[11.5px]"><span className="text-neutral-700">errors/min <b className="tabular-nums text-neutral-900">{v.toFixed(1)}</b></span><span className={tripped ? 'font-medium text-danger-deep' : 'text-accent-deep'}>{tripped ? '↩ auto-rollback' : 'within threshold'}</span></div>
  </Frame></div>;
}
function Chain() {
  return <Frame><div className="flex items-center justify-center gap-1.5">{['9c1f', 'a07e', '3b52', 'e48d'].map((h, i) => <div key={h} className="flex items-center gap-1.5"><div className="rounded-md border border-neutral-200 bg-white px-2.5 py-2 text-center font-mono text-[10.5px] leading-tight"><div className="text-neutral-500">#{i + 1}</div><div className="text-neutral-900">{h}…</div></div>{i < 3 && <span className="h-px w-2.5 bg-accent" />}</div>)}</div>
    <div className="flex items-center justify-center gap-2 font-mono text-[11.5px] text-accent-deep"><Dot tone="accent" />chain intact · 4 / 4 seals verified</div></Frame>;
}
function Ops() {
  const ops = ['setAttr  disabled → null', 'setText  “Proceed to checkout”', 'setStyle  width: 100%'];
  return <Frame>{ops.map((o, i) => <motion.div key={o} initial={{ opacity: 0, x: -8 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 + i * 0.09 }} className="flex items-center gap-2.5 rounded-md border border-neutral-200 bg-white px-3 py-2 font-mono text-[11.5px] text-neutral-900"><span className="text-accent">+</span>{o}</motion.div>)}
    <div className="font-mono text-[11px] text-neutral-600">3 operations · reversible · reviewed</div></Frame>;
}

interface F { icon: LucideIcon; tag: string; title: string; body: string; visual: React.ReactNode }
const FEATURES: F[] = [
  { icon: Crosshair, tag: 'tracking', title: 'Smart Element Tracking', body: 'Weighted signals — text, ARIA labels, structure and context — keep patches attached after redesigns. Ambiguous matches are held back.', visual: <Tracking /> },
  { icon: Network, tag: 'isolation', title: 'Isolated Sandbox Previews', body: 'Every patch set gets its own origin. Test against real data without a single visitor seeing it.', visual: <Hosts /> },
  { icon: FlaskConical, tag: 'verification', title: 'Automated Synthetic Regressions', body: 'Real browsers replay your critical flows against live and candidate, then diff console, accessibility and pixels.', visual: <Checks /> },
  { icon: Undo2, tag: 'safety net', title: 'Safety-Net Threshold Rollbacks', body: 'Cross an error threshold and the release reverts itself — before a human notices.', visual: <Gauge /> },
  { icon: Link2, tag: 'integrity', title: 'SHA-256 Hash Chain Integrity', body: 'Every action seals the one before it. Rewrite history and the break is pinpointed to the entry.', visual: <Chain /> },
  { icon: MousePointerClick, tag: 'patching', title: 'Visual Patching', body: 'Point at any element — even a disabled one — and edit it. Every change is a small, reversible operation.', visual: <Ops /> }
];

export default function Features() {
  return (
    <section id="features" className="section-pad relative">
      <div className="container-x">
        <SectionHeading eyebrow="Features" title="Built for the worst Friday afternoon.">Six systems that make hotfixing production feel boring — in the best way.</SectionHeading>
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.article key={f.title} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ type: 'spring', stiffness: 110, damping: 22, delay: (i % 3) * 0.05 }}
              whileHover={{ y: -3 }} className="surface flex flex-col p-6 transition-shadow duration-300 hover:shadow-pop">
              <div className="flex items-center justify-between">
                <span className="grid h-9 w-9 place-items-center rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-900"><f.icon size={17} /></span>
                <span className="mono-label">{f.tag}</span>
              </div>
              <h3 className="mt-5 text-[19px] font-semibold leading-tight tracking-[-0.02em] text-neutral-900">{f.title}</h3>
              <p className="mb-5 mt-2 text-[14.5px] leading-relaxed text-neutral-700">{f.body}</p>
              <div className="mt-auto">{f.visual}</div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
