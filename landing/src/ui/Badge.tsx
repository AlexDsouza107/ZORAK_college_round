import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

export function Badge({ children, className, icon }: { children: ReactNode; className?: string; icon?: ReactNode }) {
  return (
    <span className={cn('glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 font-mono text-[11.5px] font-medium tracking-wide text-ink-soft', className)}>
      {icon}<span>{children}</span>
    </span>
  );
}

export function Pill({ tone, children, className }: { tone: 'sage' | 'coral' | 'steel'; children: ReactNode; className?: string }) {
  const t = { sage: 'bg-sage-soft text-sage-deep border-sage-line', coral: 'bg-coral-soft text-coral-deep border-coral-line', steel: 'bg-steel-100 text-steel-600 border-steel-200' }[tone];
  return <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10.5px] font-medium uppercase tracking-[0.1em] transition-colors duration-500', t, className)}>{children}</span>;
}

export function Dot({ tone, pulse }: { tone: 'sage' | 'coral' | 'steel'; pulse?: boolean }) {
  const c = { sage: 'bg-sage', coral: 'bg-coral', steel: 'bg-steel-400' }[tone];
  return <span className={cn('inline-block h-1.5 w-1.5 rounded-full transition-colors duration-500', c, pulse && 'animate-softPulse')} />;
}
