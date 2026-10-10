import { motion } from 'framer-motion';

const STATS = [
  { v: '0', l: 'full-site redeploys', d: 'The origin is never modified' },
  { v: '84%', l: 'self-heal confidence', d: 'After a full redesign shipped' },
  { v: '17+', l: 'automated checks', d: 'Per release, desktop + mobile' },
  { v: 'SHA-256', l: 'sealed audit chain', d: 'Tamper-evident history' }
];

export default function Stats() {
  return (
    <section className="relative z-10 mt-10 px-5 sm:px-8" aria-label="Key numbers">
      <motion.div initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ type: 'spring', stiffness: 80, damping: 20 }}
        className="glass-strong container-x grid grid-cols-2 overflow-hidden rounded-3xl md:grid-cols-4">
        {STATS.map((s, i) => (
          <div key={s.l} className={`px-6 py-7 sm:px-8 ${i % 2 === 1 ? 'border-l' : ''} ${i > 1 ? 'border-t md:border-t-0' : ''} ${i > 0 ? 'md:border-l' : ''} border-ink/[0.07]`}>
            <div className="font-display text-[34px] font-semibold leading-none tracking-[-0.04em] text-ink sm:text-[40px]">{s.v}</div>
            <div className="mono-label mt-3 text-ink-mute">{s.l}</div>
            <div className="mt-1 text-[13px] text-steel-500">{s.d}</div>
          </div>
        ))}
      </motion.div>
    </section>
  );
}
