import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

export function SectionHeading({ eyebrow, title, children }: { eyebrow: string; title: ReactNode; children?: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ type: 'spring', stiffness: 110, damping: 22 }} className="max-w-2xl">
      <div className="mono-label mb-4 flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-accent" />{eyebrow}</div>
      <h2 className="text-[34px] font-semibold leading-[1.08] tracking-[-0.03em] text-neutral-900 sm:text-[44px]">{title}</h2>
      {children && <p className="mt-4 text-[17px] leading-relaxed text-neutral-700">{children}</p>}
    </motion.div>
  );
}
