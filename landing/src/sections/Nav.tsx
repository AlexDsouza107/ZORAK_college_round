import { motion, useMotionValueEvent, useScroll } from 'framer-motion';
import { Github } from 'lucide-react';
import { useState } from 'react';
import { GITHUB_URL, STUDIO_URL } from '../lib/env';
import { cn } from '../lib/cn';

const LINKS = [['How it works', '#how'], ['Playground', '#playground'], ['Features', '#features']] as const;

export function Logo({ dark, large }: { dark?: boolean; large?: boolean }) {
  return (
    <span className={cn('flex items-center', large ? 'gap-3.5' : 'gap-2.5')}>
      <span className={cn('grid place-items-center border border-white/10 bg-white/[0.06] shadow-subtle', large ? 'h-12 w-12 rounded-xl' : 'h-7 w-7 rounded-lg')}>
        <svg width={large ? 26 : 15} height={large ? 26 : 15} viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 5h6.5a4.5 4.5 0 010 9H11v5" /></svg>
      </span>
      <span className={cn('font-semibold tracking-[-0.025em]', large ? 'text-[26px]' : 'text-[17px]', dark ? 'text-white' : 'text-neutral-900')}>Patchwork</span>
    </span>
  );
}

export default function Nav() {
  const { scrollY } = useScroll(); const [stuck, setStuck] = useState(false);
  useMotionValueEvent(scrollY, 'change', (y) => setStuck(y > 8));
  return (
    <motion.header initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}
      className={cn('fixed inset-x-0 top-0 z-50 border-b transition-colors duration-300', stuck ? 'border-white/[0.07] bg-canvas/90' : 'border-transparent bg-transparent')}>
      <nav className="mx-auto flex h-[84px] w-full max-w-[1264px] items-center justify-between px-5 sm:px-8" aria-label="Primary">
        <a href="#top" aria-label="Patchwork home"><Logo large /></a>
        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map(([l, h]) => <a key={h} href={h} className="rounded-lg px-4 py-2 text-[16px] font-medium text-neutral-700 transition-colors hover:bg-white/[0.06] hover:text-neutral-900">{l}</a>)}
        </div>
        <div className="flex items-center gap-2.5">
          <a href={GITHUB_URL} target="_blank" rel="noreferrer" aria-label="GitHub repository" className="grid h-10 w-10 place-items-center rounded-lg text-neutral-700 transition-colors hover:bg-white/[0.06] hover:text-neutral-900"><Github size={21} /></a>
          <a href={STUDIO_URL} className="rounded-lg bg-ink px-5 py-2.5 text-[15.5px] font-semibold text-canvas shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition-colors hover:bg-white">Open Studio</a>
        </div>
      </nav>
    </motion.header>
  );
}
