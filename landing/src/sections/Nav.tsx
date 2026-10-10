import { motion, useMotionValueEvent, useScroll } from 'framer-motion';
import { Github } from 'lucide-react';
import { useState } from 'react';
import { GITHUB_URL, STUDIO_URL } from '../lib/env';
import { cn } from '../lib/cn';

const LINKS = [['How it works', '#how'], ['Playground', '#playground'], ['Features', '#features']] as const;

export function Logo({ dark }: { dark?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="grid h-7 w-7 place-items-center rounded-lg bg-ink shadow-subtle">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 5h6.5a4.5 4.5 0 010 9H11v5" /></svg>
      </span>
      <span className={cn('text-[17px] font-semibold tracking-[-0.025em]', dark ? 'text-white' : 'text-neutral-900')}>Patchwork</span>
    </span>
  );
}

export default function Nav() {
  const { scrollY } = useScroll(); const [stuck, setStuck] = useState(false);
  useMotionValueEvent(scrollY, 'change', (y) => setStuck(y > 8));
  return (
    <motion.header initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}
      className={cn('fixed inset-x-0 top-0 z-50 border-b transition-colors duration-300', stuck ? 'border-neutral-200/80 bg-canvas/85 backdrop-blur-md' : 'border-transparent bg-transparent')}>
      <nav className="mx-auto flex h-14 w-full max-w-[1264px] items-center justify-between px-5 sm:px-8" aria-label="Primary">
        <a href="#top" aria-label="Patchwork home"><Logo /></a>
        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map(([l, h]) => <a key={h} href={h} className="rounded-lg px-3.5 py-1.5 text-[14px] font-medium text-neutral-700 transition-colors hover:bg-neutral-900/5 hover:text-neutral-900">{l}</a>)}
        </div>
        <div className="flex items-center gap-1.5">
          <a href={GITHUB_URL} target="_blank" rel="noreferrer" aria-label="GitHub repository" className="grid h-8 w-8 place-items-center rounded-lg text-neutral-700 transition-colors hover:bg-neutral-900/5 hover:text-neutral-900"><Github size={17} /></a>
          <a href={STUDIO_URL} className="rounded-lg bg-ink px-3.5 py-1.5 text-[13.5px] font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] transition-colors hover:bg-neutral-800">Open Studio</a>
        </div>
      </nav>
    </motion.header>
  );
}
