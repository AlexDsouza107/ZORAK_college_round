import { motion } from 'framer-motion';
import { useSpotlight } from '../hooks/useSpotlight';

const STATS = [
  { v: '0', l: 'full-site redeploys', d: 'The origin is never modified.' },
  { v: '84%', l: 'self-heal confidence', d: 'Measured after a full redesign shipped.' },
  { v: '17+', l: 'automated checks', d: 'Per release, on desktop and mobile.' },
  { v: 'SHA-256', l: 'sealed audit chain', d: 'Every action is tamper-evident.' }
];

export default function Stats() {
  const spot = useSpotlight();
  return (
    <section className="px-5 sm:px-8" aria-label="Key numbers">
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ type: 'spring', stiffness: 100, damping: 22 }}
        onMouseMove={spot} className="surface spot container-x grid grid-cols-2 divide-neutral-200/80 md:grid-cols-4 md:divide-x">
        {STATS.map((s, i) => (
          <div key={s.l} className={`px-6 py-6 sm:px-7 ${i % 2 === 1 ? 'border-l border-neutral-200/80 md:border-l-0' : ''} ${i > 1 ? 'border-t border-neutral-200/80 md:border-t-0' : ''}`}>
            <div className="font-mono text-[28px] font-medium leading-none tracking-[-0.03em] text-neutral-900 sm:text-[32px]">{s.v}</div>
            <div className="mono-label mt-3">{s.l}</div>
            <div className="mt-1 text-[13.5px] leading-snug text-neutral-700">{s.d}</div>
          </div>
        ))}
      </motion.div>
    </section>
  );
}
