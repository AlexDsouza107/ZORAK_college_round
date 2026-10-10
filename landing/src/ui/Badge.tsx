import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

/** The hero eyebrow: a refined neutral pill. */
export function Badge({ children, className, icon }: { children: ReactNode; className?: string; icon?: ReactNode }) {
  return (
    <span className={cn('inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-neutral-100 px-3 py-1 font-mono text-xs font-medium text-neutral-800', className)}>
      {icon}<span>{children}</span>
    </span>
  );
}

type Tone = 'accent' | 'danger' | 'neutral';
const TONES: Record<Tone, string> = { accent: 'border-accent-line bg-accent-soft text-accent-deep', danger: 'border-danger-line bg-danger-soft text-danger-deep', neutral: 'border-neutral-200 bg-neutral-100 text-neutral-700' };
const DOTS: Record<Tone, string> = { accent: 'bg-accent', danger: 'bg-danger', neutral: 'bg-neutral-400' };

/** Status chip — crisp 6px radius, monospace. */
export function Pill({ tone, children, className }: { tone: Tone; children: ReactNode; className?: string }) {
  return <span className={cn('inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-[11px] font-medium transition-colors duration-500', TONES[tone], className)}>{children}</span>;
}

export function Dot({ tone, pulse, className }: { tone: Tone; pulse?: boolean; className?: string }) {
  return <span className={cn('inline-block h-1.5 w-1.5 rounded-full transition-colors duration-500', DOTS[tone], pulse && 'animate-softPulse', className)} />;
}
