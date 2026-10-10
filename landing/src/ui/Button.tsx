import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

interface Props { href?: string; onClick?: () => void; children: ReactNode; icon?: ReactNode; className?: string; external?: boolean; ariaLabel?: string }

const spring = { type: 'spring', stiffness: 420, damping: 26, mass: 0.6 } as const;

/** Obsidian pill with a soft gloss highlight and a magnetic arrow. */
export function PrimaryButton({ href, onClick, children, icon, className, external, ariaLabel }: Props) {
  const Comp: any = href ? motion.a : motion.button;
  return (
    <Comp href={href} onClick={onClick} aria-label={ariaLabel} {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
      whileHover={{ y: -2 }} whileTap={{ scale: 0.97, y: 0 }} transition={spring}
      className={cn('group relative inline-flex items-center gap-2.5 overflow-hidden rounded-full bg-ink px-6 py-3.5 text-[15px] font-medium text-alabaster-50 shadow-pill ring-1 ring-black/60', className)}>
      <span aria-hidden className="pointer-events-none absolute inset-x-3 top-0 h-1/2 rounded-b-[999px] bg-gradient-to-b from-white/[0.22] to-transparent" />
      <span aria-hidden className="pointer-events-none absolute -inset-y-6 -left-1/2 w-1/3 -skew-x-12 bg-white/10 opacity-0 transition-all duration-700 group-hover:left-[130%] group-hover:opacity-100" />
      <span className="relative">{children}</span>
      <span className="relative grid h-6 w-6 place-items-center rounded-full bg-white/10 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:bg-sage/90">{icon}</span>
    </Comp>
  );
}

/** Minimal bordered pill: a sage dot blooms into a fill on hover. */
export function SecondaryButton({ href, onClick, children, icon, className, ariaLabel }: Props) {
  const Comp: any = href ? motion.a : motion.button;
  return (
    <Comp href={href} onClick={onClick} aria-label={ariaLabel} whileHover={{ y: -2 }} whileTap={{ scale: 0.97, y: 0 }} transition={spring}
      className={cn('group relative inline-flex items-center gap-2.5 overflow-hidden rounded-full border border-ink/15 bg-white/40 px-6 py-3.5 text-[15px] font-medium text-ink backdrop-blur transition-colors duration-300 hover:border-sage/60', className)}>
      <span aria-hidden className="absolute left-[22px] top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-sage transition-[transform,background-color] duration-500 ease-out group-hover:scale-[60] group-hover:bg-sage-deep" style={{ transformOrigin: 'center' }} />
      <span aria-hidden className="relative h-2 w-2 rounded-full bg-sage/0" />
      <span className="relative transition-colors duration-300 group-hover:text-white">{children}</span>
      {icon && <span className="relative transition-colors duration-300 group-hover:text-white">{icon}</span>}
    </Comp>
  );
}
