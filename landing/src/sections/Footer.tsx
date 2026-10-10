import { AnimatePresence, motion } from 'framer-motion';
import { Check, Copy, Github, Terminal } from 'lucide-react';
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
    <button type="button" onClick={copy} aria-label={`Copy ${command}`} className="group flex w-full max-w-md items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3.5 text-left font-mono text-[13.5px] text-alabaster-100 transition-colors hover:border-sage/50 hover:bg-white/10">
      <Terminal size={16} className="shrink-0 text-steel-400" />
      <span className="flex-1 truncate"><span className="text-sage">$</span> {command}</span>
      <span className="relative grid h-7 w-7 place-items-center rounded-lg bg-white/10 text-steel-300 transition-colors group-hover:text-white">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span key={copied ? 'c' : 'k'} initial={{ scale: 0.4, opacity: 0, rotate: -30 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} exit={{ scale: 0.4, opacity: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 24 }}>
            {copied ? <Check size={15} className="text-sage" /> : <Copy size={15} />}
          </motion.span>
        </AnimatePresence>
      </span>
    </button>
  );
}

export default function Footer() {
  const status = useStudioStatus();
  const label = status === 'up' ? 'All Systems Operational' : status === 'checking' ? 'Checking status…' : 'Demo mode · Studio not running';
  return (
    <footer className="relative mt-10 bg-ink text-alabaster-100">
      <div className="mx-auto w-full max-w-[1264px] px-5 py-20 sm:px-8 md:py-24">
        <div className="grid gap-14 md:grid-cols-[1.3fr_1fr]">
          <div>
            <Logo light />
            <h2 className="mt-8 max-w-lg font-display text-[38px] font-semibold leading-[1.02] tracking-[-0.04em] sm:text-5xl">Hotfix the <span className="font-serif font-normal italic text-[#9FD3B8]">Internet.</span></h2>
            <p className="mt-4 max-w-md text-[15.5px] leading-relaxed text-steel-300">Patch live sites visually, keep patches attached through redesigns, and roll back before anyone notices.</p>
            <div className="mt-8"><CopyCommand command="npm i @patchwork/runtime" /></div>
          </div>
          <div className="flex flex-col gap-3 md:items-end">
            <a href={STUDIO_URL} className="group flex w-full max-w-xs items-center justify-between rounded-2xl border border-white/10 px-5 py-4 text-[15px] font-medium transition-colors hover:border-sage/50 hover:bg-white/5">Open Visual Studio<span className="transition-transform duration-300 group-hover:translate-x-1">→</span></a>
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="group flex w-full max-w-xs items-center justify-between rounded-2xl border border-white/10 px-5 py-4 text-[15px] font-medium transition-colors hover:border-sage/50 hover:bg-white/5"><span className="flex items-center gap-2.5"><Github size={17} />GitHub repository</span><span className="transition-transform duration-300 group-hover:translate-x-1">↗</span></a>
          </div>
        </div>
        <div className="mt-16 flex flex-col items-start justify-between gap-5 border-t border-white/10 pt-7 sm:flex-row sm:items-center">
          <span className={cn('inline-flex items-center gap-2.5 rounded-full border px-3.5 py-1.5 font-mono text-[11.5px] font-medium', status === 'up' ? 'border-sage/40 bg-sage/10 text-[#9FD3B8]' : status === 'down' ? 'border-white/15 bg-white/5 text-steel-300' : 'border-white/10 text-steel-400')} role="status">
            <span className="relative flex h-2 w-2"><span className={cn('absolute inline-flex h-full w-full rounded-full opacity-60', status === 'up' ? 'animate-ping bg-sage' : 'hidden')} /><span className={cn('relative inline-flex h-2 w-2 rounded-full', status === 'up' ? 'bg-sage' : status === 'down' ? 'bg-steel-400' : 'animate-pulse bg-steel-400')} /></span>{label}
          </span>
          <span className="font-mono text-[11.5px] text-steel-400">© 2026 PATCHWORK · Built for the CRCE hackathon round</span>
        </div>
      </div>
    </footer>
  );
}
