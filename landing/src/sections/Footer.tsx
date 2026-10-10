import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight, Check, Copy, Github, Terminal } from 'lucide-react';
import { useEffect, useState } from 'react';
import { GITHUB_URL, STUDIO_URL } from '../lib/env';
import { cn } from '../lib/cn';
import { Logo } from './Nav';

type Status = 'checking' | 'up' | 'down';
function useStudioStatus(): Status {
  const [s, setS] = useState<Status>('checking');
  useEffect(() => {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 3500);
    fetch(`${STUDIO_URL}/api/health`, { signal: ctl.signal }).then((r) => setS(r.ok ? 'up' : 'down')).catch(() => setS('down')).finally(() => clearTimeout(t));
    return () => { ctl.abort(); clearTimeout(t); };
  }, []);
  return s;
}

function CopyCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(command); } catch { const ta = document.createElement('textarea'); ta.value = command; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); }
    setCopied(true); setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button type="button" onClick={copy} aria-label={`Copy ${command}`} className="group flex w-full max-w-md items-center gap-3 rounded-lg border border-white/10 bg-[#05060A] px-4 py-3 text-left font-mono text-[13.5px] text-[#E5E7EB] shadow-subtle transition-colors hover:border-accent/50">
      <Terminal size={15} className="shrink-0 text-[#6B7280]" />
      <span className="flex-1 truncate"><span className="text-emerald-400">$</span> {command}</span>
      <span className="grid h-7 w-7 place-items-center rounded-md bg-white/10 text-[#9AA1AE] transition-colors group-hover:text-white">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span key={copied ? 'c' : 'k'} initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.4, opacity: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 24 }}>
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
          </motion.span>
        </AnimatePresence>
      </span>
    </button>
  );
}

const LinkCard = ({ href, children, external }: { href: string; children: React.ReactNode; external?: boolean }) => (
  <a href={href} {...(external ? { target: '_blank', rel: 'noreferrer' } : {})} className="surface group flex w-full max-w-xs items-center justify-between px-4 py-3.5 text-[14.5px] font-medium text-neutral-900 transition-colors hover:border-neutral-300">
    <span className="flex items-center gap-2.5">{children}</span><ArrowUpRight size={15} className="text-neutral-500 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-neutral-900" />
  </a>
);

export default function Footer() {
  const status = useStudioStatus();
  const label = status === 'up' ? 'All Systems Operational' : status === 'checking' ? 'Checking status…' : 'Demo mode · Studio not running';
  return (
    <footer className="relative mt-8 border-t border-white/[0.07] bg-canvas-sunken/95">
      <div className="mx-auto w-full max-w-[1264px] px-5 py-16 sm:px-8 md:py-20">
        <div className="grid gap-12 md:grid-cols-[1.3fr_1fr]">
          <div>
            <Logo />
            <h2 className="mt-7 max-w-lg text-[34px] font-semibold leading-[1.05] tracking-[-0.035em] text-neutral-900 sm:text-[42px]">Hotfix the Internet.</h2>
            <p className="mt-3 max-w-md text-[15.5px] leading-relaxed text-neutral-700">Patch live sites visually, keep patches attached through redesigns, and roll back before anyone notices.</p>
            <div className="mt-7"><CopyCommand command="npm i @patchwork/runtime" /></div>
          </div>
          <div className="flex flex-col gap-3 md:items-end">
            <LinkCard href={STUDIO_URL}>Open Visual Studio</LinkCard>
            <LinkCard href={GITHUB_URL} external><Github size={16} />GitHub repository</LinkCard>
          </div>
        </div>
        <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-neutral-200 pt-6 sm:flex-row sm:items-center">
          <span role="status" className={cn('inline-flex items-center gap-2.5 rounded-md border px-3 py-1.5 font-mono text-[11.5px] font-medium', status === 'up' ? 'border-accent-line bg-accent-soft text-accent-deep' : 'border-neutral-300 bg-panel text-neutral-700')}>
            <span className="relative flex h-2 w-2"><span className={cn('absolute inline-flex h-full w-full rounded-full opacity-60', status === 'up' ? 'animate-ping bg-accent' : 'hidden')} /><span className={cn('relative inline-flex h-2 w-2 rounded-full', status === 'up' ? 'bg-accent' : status === 'down' ? 'bg-neutral-400' : 'animate-pulse bg-neutral-400')} /></span>{label}
          </span>
          <span className="font-mono text-[11.5px] text-neutral-600">v1.0.3 · © 2026 PATCHWORK · Built for the CRCE hackathon round</span>
        </div>
      </div>
    </footer>
  );
}
