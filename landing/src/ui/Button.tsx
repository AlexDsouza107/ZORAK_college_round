import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

interface Props { href?: string; onClick?: () => void; children: ReactNode; icon?: ReactNode; className?: string; external?: boolean; ariaLabel?: string; disabled?: boolean }
const spring = { type: 'spring', stiffness: 460, damping: 30, mass: 0.6 } as const;

/** Primary CTA — deep carbon, crisp 12px radius, 1px inner highlight. */
export function PrimaryButton({ href, onClick, children, icon, className, external, ariaLabel, disabled }: Props) {
  const Comp: any = href ? motion.a : motion.button;
  return (
    <Comp href={href} onClick={onClick} aria-label={ariaLabel} disabled={disabled} {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
      whileHover={disabled ? undefined : { y: -1 }} whileTap={disabled ? undefined : { scale: 0.98, y: 0 }} transition={spring}
      className={cn('group relative inline-flex items-center justify-center gap-2.5 rounded-xl bg-ink px-5 py-3 text-[15px] font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_1px_2px_rgba(17,24,39,0.35)] transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60', className)}>
      <span>{children}</span>
      {icon && <span className="grid h-5 w-5 place-items-center rounded-md bg-white/10 transition-transform duration-200 group-hover:translate-x-0.5">{icon}</span>}
    </Comp>
  );
}

/** Secondary CTA — white surface, hairline border; a live emerald dot is the only colour. */
export function SecondaryButton({ href, onClick, children, icon, className, ariaLabel }: Props) {
  const Comp: any = href ? motion.a : motion.button;
  return (
    <Comp href={href} onClick={onClick} aria-label={ariaLabel} whileHover={{ y: -1 }} whileTap={{ scale: 0.98, y: 0 }} transition={spring}
      className={cn('group inline-flex items-center justify-center gap-2.5 rounded-xl border border-neutral-300 bg-white px-5 py-3 text-[15px] font-medium text-neutral-900 shadow-subtle transition-colors hover:border-neutral-400 hover:bg-neutral-50', className)}>
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent transition-transform duration-300 group-hover:scale-150" />
      <span>{children}</span>
      {icon && <span className="text-neutral-600 transition-colors group-hover:text-neutral-900">{icon}</span>}
    </Comp>
  );
}
