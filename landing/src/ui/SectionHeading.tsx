import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

export function SectionHeading({ eyebrow, title, children, align = 'left' }: { eyebrow: string; title: ReactNode; children?: ReactNode; align?: 'left' | 'center' }) {
  return (
    <motion.div initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ type: 'spring', stiffness: 90, damping: 20 }}
      className={align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      <div className="mono-label mb-4 flex items-center gap-2" style={{ justifyContent: align === 'center' ? 'center' : 'flex-start' }}><span className="h-px w-6 bg-steel-300" />{eyebrow}</div>
      <h2 className="font-display text-[34px] font-semibold leading-[1.05] tracking-[-0.035em] text-ink sm:text-5xl">{title}</h2>
      {children && <p className="mt-5 text-[17px] leading-relaxed text-steel-600">{children}</p>}
    </motion.div>
  );
}
