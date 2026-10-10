import { motion, useMotionValueEvent, useScroll } from 'framer-motion';
import { Github } from 'lucide-react';
import { useState } from 'react';
import { GITHUB_URL, STUDIO_URL } from '../lib/env';
import { cn } from '../lib/cn';

const LINKS = [['How it works', '#how'], ['Playground', '#playground'], ['Features', '#features']] as const;

export function Logo({ light }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-ink shadow-pill ring-1 ring-black/50">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7FBF9F" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 5h6.5a4.5 4.5 0 010 9H11v5" /></svg>
      </span>
      <span className={cn('font-display text-[19px] font-semibold tracking-[-0.03em]', light ? 'text-alabaster-50' : 'text-ink')}>Patchwork</span>
    </span>
  );
}

export default function Nav() {
  const { scrollY } = useScroll(); const [stuck, setStuck] = useState(false);
  useMotionValueEvent(scrollY, 'change', (y) => setStuck(y > 12));
  return (
    <motion.header initial={{ y: -24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 120, damping: 18, delay: 0.1 }}
      className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4">
      <nav className={cn('flex w-full max-w-[1200px] items-center justify-between rounded-full px-4 py-2.5 transition-all duration-500 sm:px-5', stuck ? 'glass-strong' : 'border border-transparent')} aria-label="Primary">
        <a href="#top" aria-label="Patchwork home"><Logo /></a>
        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map(([l, h]) => <a key={h} href={h} className="rounded-full px-4 py-2 text-[14px] font-medium text-steel-600 transition-colors hover:bg-ink/5 hover:text-ink">{l}</a>)}
        </div>
        <div className="flex items-center gap-2">
          <a href={GITHUB_URL} target="_blank" rel="noreferrer" aria-label="GitHub repository" className="grid h-9 w-9 place-items-center rounded-full text-steel-600 transition-colors hover:bg-ink/5 hover:text-ink"><Github size={18} /></a>
          <a href={STUDIO_URL} className="rounded-full bg-ink px-4 py-2 text-[13.5px] font-medium text-alabaster-50 shadow-pill transition-transform hover:-translate-y-0.5">Open Studio</a>
        </div>
      </nav>
    </motion.header>
  );
}
