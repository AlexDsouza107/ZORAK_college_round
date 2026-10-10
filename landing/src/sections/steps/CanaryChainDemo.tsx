import { motion } from 'framer-motion';
import { Bird, Link2, ShieldAlert, ShieldCheck, Undo2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { sha256 } from '../../lib/sha256';
import { cn } from '../../lib/cn';
import { Pill } from '../../ui/Badge';

interface Block { seq: number; type: string; payload: string; stored: string }
const SEED: Omit<Block, 'stored' | 'seq'>[] = [
  { type: 'verify.passed', payload: '17 checks · desktop+mobile' }, { type: 'release.canary', payload: 'v4 → 20% of visitors' },
  { type: 'patch.reanchored', payload: '#checkout-btn → #pay-cta · 84%' }, { type: 'release.promoted', payload: 'v4 → 100%' }
];
const GENESIS = '0'.repeat(64);
async function chain(rows: { type: string; payload: string }[]): Promise<string[]> {
  const out: string[] = []; let prev = GENESIS;
  for (const r of rows) { prev = await sha256(`${prev}|${r.type}|${r.payload}`); out.push(prev); }
  return out;
}

/** Step 03 — a canary share slider, and a real SHA-256 hash chain computed in your browser that you can try to tamper with. */
export default function CanaryChainDemo() {
  const [pct, setPct] = useState(20), [rolled, setRolled] = useState(false);
  const [blocks, setBlocks] = useState<Block[]>([]), [recomputed, setRecomputed] = useState<string[]>([]);

  useEffect(() => { (async () => { const h = await chain(SEED); setBlocks(SEED.map((b, i) => ({ ...b, seq: i + 1, stored: h[i] }))); })(); }, []);
  useEffect(() => { if (blocks.length) chain(blocks).then(setRecomputed); }, [blocks]);
  const firstBad = useMemo(() => (recomputed.length ? blocks.findIndex((b, i) => recomputed[i] !== b.stored) : -1), [blocks, recomputed]);

  const tamper = () => setBlocks((bs) => bs.map((b, i) => (i === 1 ? { ...b, payload: 'v4 → 0% (quietly edited)' } : b)));
  const restore = () => setBlocks((bs) => bs.map((b, i) => (i === 1 ? { ...b, payload: SEED[1].payload } : b)));
  const share = rolled ? 0 : pct;

  return (
    <div className="grid gap-4">
      <div className="surface rounded-xl p-4">
        <div className="flex items-center justify-between"><span className="mono-label flex items-center gap-2"><Bird size={13} />Canary rollout</span>
          <span className="font-mono text-[12px] tabular-nums text-ink">{rolled ? 'rolled back · v3 live' : `v4 ${share}% · v3 ${100 - share}%`}</span></div>
        <div className="mt-3 grid grid-cols-[repeat(25,minmax(0,1fr))] gap-1" aria-hidden>
          {Array.from({ length: 50 }).map((_, i) => <motion.span key={i} animate={{ backgroundColor: i < Math.round((share / 100) * 50) ? '#10B981' : '#2A3242', scale: i < Math.round((share / 100) * 50) ? 1 : 0.86 }} transition={{ type: 'spring', stiffness: 400, damping: 24, delay: (i % 25) * 0.004 }} className="aspect-square rounded-[3px]" />)}
        </div>
        <div className="mt-3 flex items-center gap-3">
          <input type="range" min={5} max={100} step={5} value={pct} disabled={rolled} onChange={(e) => setPct(+e.target.value)} style={{ ["--fill" as string]: `${((pct - 5) / 95) * 100}%` }} className="flex-1" aria-label="Canary share" />
          <button type="button" onClick={() => setRolled((r) => !r)} className={cn('flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[12.5px] font-medium transition-all active:scale-95', rolled ? 'bg-accent text-white' : 'border border-danger-line bg-danger-soft text-danger-deep hover:bg-danger/15')}>
            {rolled ? <><ShieldCheck size={13} />Redeploy canary</> : <><Undo2 size={13} />1-click rollback</>}
          </button>
        </div>
      </div>

      <div className="surface rounded-xl p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="mono-label flex items-center gap-2"><Link2 size={13} />Audit chain · SHA-256</span>
          {firstBad < 0 ? <Pill tone="accent"><ShieldCheck size={11} />chain intact</Pill> : <Pill tone="danger"><ShieldAlert size={11} />broken at #{blocks[firstBad].seq}</Pill>}
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {blocks.map((b, i) => {
            const bad = firstBad >= 0 && i >= firstBad, origin = firstBad === i;
            return (
              <motion.div key={b.seq} layout animate={{ y: origin ? -3 : 0 }} transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                className={cn('rounded-xl border p-3 transition-colors duration-500', bad ? 'border-danger-line bg-danger-soft/70' : 'border-neutral-200 bg-panel')}>
                <div className="flex items-center justify-between"><span className="font-mono text-[10.5px] text-neutral-600">#{b.seq}</span><span className={cn('h-1.5 w-1.5 rounded-full', bad ? 'bg-danger' : 'bg-accent')} /></div>
                <div className="mt-1.5 truncate font-mono text-[11.5px] font-medium text-ink">{b.type}</div>
                <div className={cn('mt-0.5 truncate text-[11px]', origin ? 'text-danger-deep' : 'text-neutral-600')} title={b.payload}>{b.payload}</div>
                <div className="mt-2 font-mono text-[10px] leading-tight text-neutral-600"><span className="text-neutral-500">seal </span><span className={cn(bad && 'text-danger-deep line-through')}>{b.stored.slice(0, 10)}</span>
                  {bad && recomputed[i] && <div className="text-danger-deep">now {recomputed[i].slice(0, 10)}</div>}</div>
              </motion.div>
            );
          })}
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-[12px] text-neutral-600">{firstBad < 0 ? 'Each seal hashes the one before it. Try rewriting history:' : 'Editing one record broke its seal and every seal after it.'}</span>
          <button type="button" onClick={firstBad < 0 ? tamper : restore} disabled={!blocks.length} className={cn('shrink-0 rounded-lg px-3.5 py-1.5 text-[12.5px] font-medium transition-all active:scale-95', firstBad < 0 ? 'border border-danger-line bg-danger-soft text-danger-deep hover:bg-danger/15' : 'border border-neutral-300 text-neutral-700 hover:text-ink')}>
            {firstBad < 0 ? 'Tamper with block #2' : 'Restore'}
          </button>
        </div>
      </div>
    </div>
  );
}
