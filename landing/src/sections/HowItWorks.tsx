import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { SectionHeading } from '../ui/SectionHeading';
import CanaryChainDemo from './steps/CanaryChainDemo';
import PickerDemo from './steps/PickerDemo';
import TrackingDemo from './steps/TrackingDemo';

const STEPS: { n: string; tag: string; title: string; body: string; points: string[]; demo: ReactNode }[] = [
  { n: '01', tag: 'Inspect & patch', title: 'Inspect & Visually Patch', body: 'Point at any element on the live page — even a disabled one — and change its text, style, attributes or position. No source access, no rebuild. Every edit is a tiny reversible operation.',
    points: ['DOM visual picker with live preview', 'Reversible operations, never raw code', 'AI drafts patches from plain English'], demo: <PickerDemo /> },
  { n: '02', tag: 'Semantic tracking', title: 'Semantic Auto-Tracking', body: 'Selectors rot the moment a site is redesigned. PATCHWORK fingerprints each element by what it says, how it is labelled and where it sits — then re-locks onto it after the code changes.',
    points: ['Weighted signals: text, ARIA, structure, context', 'Confident matches self-heal; unsure ones wait for review', 'Drift watcher re-anchors and re-releases automatically'], demo: <TrackingDemo /> },
  { n: '03', tag: 'Canary & audit', title: 'Canary Deploy & Hash-Chain Audit', body: 'Ship to a slice of traffic first. If error rates climb, the release reverts itself. Every action is sealed into a SHA-256 chain, so history cannot be quietly rewritten.',
    points: ['Percentage rollouts with sticky buckets', 'Auto-rollback on regressions or failed smoke tests', 'Tamper-evident audit trail you can verify'], demo: <CanaryChainDemo /> }
];

export default function HowItWorks() {
  return (
    <section id="how" className="section-pad relative">
      <div className="container-x">
        <SectionHeading eyebrow="How it works" title={<>Three steps from broken to shipped.</>}>
          Every step below is live — click, drag and tamper with it.
        </SectionHeading>
        <div className="mt-20 space-y-24 md:space-y-32">
          {STEPS.map((s, i) => (
            <motion.article key={s.n} initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-120px' }} transition={{ type: 'spring', stiffness: 70, damping: 20 }}
              className={`grid items-center gap-10 lg:gap-16 ${i % 2 ? "lg:grid-cols-[1.18fr_0.82fr]" : "lg:grid-cols-[0.82fr_1.18fr]"}`}>
              <div className={i % 2 ? 'lg:order-2' : ''}>
                <div className="flex items-center gap-3">
                  <span className="grid h-8 w-8 place-items-center rounded-lg border border-neutral-300 bg-white font-mono text-[12px] font-semibold text-neutral-900 shadow-subtle">{s.n}</span>
                  <span className="mono-label">{s.tag}</span><span className="h-px flex-1 bg-neutral-200" />
                </div>
                <h3 className="mt-5 text-[26px] font-semibold leading-[1.12] tracking-[-0.03em] text-neutral-900 sm:text-[32px]">{s.title}</h3>
                <p className="mt-4 text-[16.5px] leading-relaxed text-neutral-700">{s.body}</p>
                <ul className="mt-6 space-y-3">{s.points.map((p) => <li key={p} className="flex items-start gap-3 text-[15px] text-neutral-800"><span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border border-accent-line bg-accent-soft text-accent-deep"><Check size={12} strokeWidth={3} /></span>{p}</li>)}</ul>
              </div>
              <div className={i % 2 ? 'lg:order-1' : ''}>
                <div className="surface-raised p-2.5 sm:p-3"><div className="inset p-3 sm:p-4">{s.demo}</div></div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
