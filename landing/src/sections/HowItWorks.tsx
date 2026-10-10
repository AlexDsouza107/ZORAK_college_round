import { motion, useScroll, useSpring, useTransform } from 'framer-motion';
import { Check } from 'lucide-react';
import { useRef, type ReactNode } from 'react';
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

type Step = (typeof STEPS)[number];

/** One step. Its connecting line fills, its number lights up and its demo drifts as the step scrolls through the viewport. */
function StepRow({ s, i }: { s: Step; i: number }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 78%', 'end 45%'] });
  const fill = useSpring(scrollYProgress, { stiffness: 120, damping: 24, mass: 0.4 });
  const demoY = useTransform(scrollYProgress, [0, 1], [34, -34]);
  const lit = useTransform(scrollYProgress, [0, 0.12], [0, 1]);
  return (
    <motion.article ref={ref} initial={{ opacity: 0, y: 48, filter: 'blur(8px)' }} whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }} viewport={{ once: true, margin: '-120px' }} transition={{ type: 'spring', stiffness: 70, damping: 20 }}
      className={`grid items-center gap-10 lg:gap-16 ${i % 2 ? 'lg:grid-cols-[1.18fr_0.82fr]' : 'lg:grid-cols-[0.82fr_1.18fr]'}`}>
      <div className={i % 2 ? 'lg:order-2' : ''}>
        <div className="flex items-center gap-3">
          <motion.span style={{ boxShadow: useTransform(lit, (v) => `0 0 0 1px rgba(16,185,129,${0.55 * v}), 0 0 ${24 * v}px rgba(16,185,129,${0.45 * v})`) }}
            className="grid h-8 w-8 place-items-center rounded-lg border border-white/15 bg-panel font-mono text-[12px] font-semibold text-neutral-900">{s.n}</motion.span>
          <span className="mono-label">{s.tag}</span>
          <span className="relative h-px flex-1 bg-white/10"><motion.span style={{ scaleX: fill }} className="absolute inset-0 origin-left bg-gradient-to-r from-accent to-accent-bright shadow-[0_0_10px_rgba(52,211,153,0.8)]" /></span>
        </div>
        <h3 className="mt-5 text-[26px] font-semibold leading-[1.12] tracking-[-0.03em] text-neutral-900 sm:text-[32px]">{s.title}</h3>
        <p className="mt-4 text-[16.5px] leading-relaxed text-neutral-700">{s.body}</p>
        <ul className="mt-6 space-y-3">{s.points.map((p) => <li key={p} className="flex items-start gap-3 text-[15px] text-neutral-800"><span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border border-accent-line bg-accent-soft text-accent-deep"><Check size={12} strokeWidth={3} /></span>{p}</li>)}</ul>
      </div>
      <motion.div style={{ y: demoY }} className={i % 2 ? 'lg:order-1' : ''}>
        <div className="surface-raised p-2.5 shadow-pop sm:p-3"><div className="inset p-3 sm:p-4">{s.demo}</div></div>
      </motion.div>
    </motion.article>
  );
}

export default function HowItWorks() {
  return (
    <section id="how" className="section-pad relative">
      <div className="container-x">
        <SectionHeading eyebrow="How it works" title={<>Three steps from broken to shipped.</>}>
          Every step below is live — click, drag and tamper with it.
        </SectionHeading>
        <div className="mt-20 space-y-24 md:space-y-32">
          {STEPS.map((s, i) => <StepRow key={s.n} s={s} i={i} />)}
        </div>
      </div>
    </section>
  );
}
