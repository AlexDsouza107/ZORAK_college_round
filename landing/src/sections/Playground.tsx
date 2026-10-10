import { AnimatePresence, motion } from 'framer-motion';
import { Check, Loader2, RotateCcw, Wrench } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useInView } from '../hooks/useInView';
import { cn } from '../lib/cn';
import { Dot, Pill } from '../ui/Badge';
import { PrimaryButton } from '../ui/Button';
import { SectionHeading } from '../ui/SectionHeading';
import TelemetryChart from './TelemetryChart';

type Phase = 'broken' | 'running' | 'fixed';
type Level = 'ERROR' | 'WARN' | 'INFO' | 'STEP' | 'OK';
interface Line { id: number; t: string; level: Level; text: string }

const N = 56;
const STAGES = [
  { id: 'locate', label: 'Locate element', detail: '#checkout-btn · 84% match', ms: '38ms' },
  { id: 'inject', label: 'Inject patch', detail: 'p_8f21 · setAttr + setStyle · reversible', ms: '12ms' },
  { id: 'verify', label: 'Verify', detail: '17/17 checks · desktop + mobile', ms: '4.1s' }
] as const;
// targets per phase / stage: [p95 latency ms, error rate %, failed checkouts per min]
const BROKEN: [number, number, number] = [1840, 38.4, 412], FIXED: [number, number, number] = [212, 0, 0];
const MID: [number, number, number][] = [BROKEN, [1100, 22, 230], [480, 6, 60]];
const spring = { type: 'spring', stiffness: 260, damping: 24 } as const;
const clock = () => new Date().toLocaleTimeString('en-GB');
const ramp = (a: number, b: number) => Array.from({ length: N }, (_, i) => a + (b - a) * (i / N) ** 1.4 + Math.sin(i * 0.9) * (b - a) * 0.03);
const rid = () => Math.random().toString(36).slice(2, 8);

export default function Playground() {
  const [ref, inView] = useInView<HTMLDivElement>({ threshold: 0.15 });
  const [phase, setPhase] = useState<Phase>('broken'); const [stage, setStage] = useState(-1);
  const [m, setM] = useState({ lat: BROKEN[0], err: BROKEN[1], fail: BROKEN[2] });
  const [latPts, setLatPts] = useState(() => ramp(300, 1800)), [failPts, setFailPts] = useState(() => ramp(20, 400));
  const [logs, setLogs] = useState<Line[]>([]);
  const cur = useRef({ ...m }), phaseRef = useRef<Phase>('broken'), stageRef = useRef(-1), lineId = useRef(0), timers = useRef<number[]>([]);
  phaseRef.current = phase; stageRef.current = stage;
  const fixed = phase === 'fixed', broken = phase === 'broken';

  const push = (level: Level, text: string) => setLogs((l) => [...l.slice(-8), { id: lineId.current++, t: clock(), level, text }]);

  // telemetry + log stream tick (paused while off-screen)
  useEffect(() => {
    if (!inView) return;
    let n = 0;
    const id = setInterval(() => {
      n++;
      const p = phaseRef.current, tgt = p === 'fixed' ? FIXED : p === 'running' ? MID[Math.max(0, stageRef.current)] : BROKEN, k = p === 'fixed' ? 0.2 : 0.16;
      const c = cur.current; c.lat += (tgt[0] - c.lat) * k; c.err += (tgt[1] - c.err) * k; c.fail += (tgt[2] - c.fail) * k;
      const jit = p === 'fixed' ? 0.03 : 0.1;
      const lat = Math.max(120, c.lat * (1 + (Math.random() - 0.5) * jit)), fail = Math.max(0, c.fail * (1 + (Math.random() - 0.5) * jit * 1.5));
      setM({ lat, err: Math.max(0, c.err + (Math.random() - 0.5) * (p === 'fixed' ? 0.02 : 1.2)), fail });
      setLatPts((a) => [...a.slice(1), lat]); setFailPts((a) => [...a.slice(1), fail]);
      if (p === 'broken' && n % 5 === 0) {
        const r = Math.random();
        push(r < 0.55 ? 'ERROR' : r < 0.8 ? 'WARN' : 'ERROR', r < 0.55 ? `POST /api/checkout 500 ${1600 + Math.round(Math.random() * 500)}ms  TypeError: submitOrder is not a function` : r < 0.8 ? 'layout overflow +14px  .cart-summary > button.checkout' : 'unhandled click  button.checkout  (handler undefined)');
      } else if (p === 'fixed' && n % 7 === 0) push(Math.random() < 0.7 ? 'OK' : 'INFO', Math.random() < 0.7 ? `POST /api/checkout 200 ${200 + Math.round(Math.random() * 28)}ms` : `order.created  ord_${rid()}`);
    }, 120);
    return () => clearInterval(id);
  }, [inView]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));

  const simulate = () => {
    if (phase !== 'broken') return;
    setPhase('running'); setStage(0); push('STEP', '→ locate   #checkout-btn   84% match   38ms');
    later(() => { setStage(1); push('STEP', '→ inject   patch p_8f21   reversible · 0 redeploys   12ms'); }, 800);
    later(() => { setStage(2); push('STEP', '→ verify   17/17 checks passed   desktop + mobile'); }, 1600);
    later(() => { setPhase('fixed'); setStage(3); push('OK', 'PATCH LIVE  checkout recovered  200 OK'); }, 2500);
  };
  const reset = () => { timers.current.forEach(clearTimeout); timers.current = []; setPhase('broken'); setStage(-1); cur.current = { lat: BROKEN[0], err: BROKEN[1], fail: BROKEN[2] }; setM({ lat: BROKEN[0], err: BROKEN[1], fail: BROKEN[2] }); setLatPts(ramp(300, 1800)); setFailPts(ramp(20, 400)); setLogs([]); };

  const tiles = useMemo(() => [
    { k: 'p95 latency', v: Math.round(m.lat).toLocaleString(), u: 'ms', slo: m.lat < 500, note: 'SLO 500ms' },
    { k: 'error rate', v: m.err.toFixed(1), u: '%', slo: m.err < 1, note: 'SLO 1.0%' },
    { k: 'failed checkouts', v: Math.round(m.fail).toLocaleString(), u: '/min', slo: m.fail < 5, note: 'SLO 5/min' },
    { k: 'patch', v: fixed ? 'p_8f21' : '—', u: fixed ? 'live' : 'none', slo: fixed, note: fixed ? 'v1.4.2 + patch' : 'v1.4.2' }
  ], [m, fixed]);

  return (
    <section id="playground" className="section-pad relative">
      <div className="container-x" ref={ref}>
        <SectionHeading eyebrow="Live playground" title="Simulate the fix. Watch production recover.">
          Checkout is failing in production. Run the patch: PATCHWORK locates the element, injects a reversible fix and verifies it — and the telemetry follows. No redeploy.
        </SectionHeading>

        <div className="surface-raised mt-12 overflow-hidden">
          {/* header: incident + stage tracker */}
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-neutral-200/80 bg-neutral-50 px-5 py-3">
            <div className="flex items-center gap-3 font-mono text-[12px] text-neutral-800"><Dot tone={fixed ? 'accent' : 'danger'} pulse={!fixed} /><span className="font-medium">INC-2041</span><span className="text-neutral-500">/</span><span className="text-neutral-700">checkout-api · prod · eu-west-1</span></div>
            <ol className="flex items-center gap-1.5" aria-label="Patch pipeline">
              {STAGES.map((s, i) => {
                const done = stage > i, active = stage === i && phase === 'running';
                return (
                  <li key={s.id} className="flex items-center gap-1.5">
                    <span className={cn('flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[11px] font-medium transition-colors duration-300', done ? 'border-accent-line bg-accent-soft text-accent-deep' : active ? 'border-neutral-900 bg-panel text-neutral-900' : 'border-neutral-200 bg-panel text-neutral-500')}>
                      {done ? <Check size={11} strokeWidth={3} /> : active ? <Loader2 size={11} className="animate-spin" /> : <span className="text-[10px]">0{i + 1}</span>}{s.id}
                      <span className={cn('hidden tabular-nums sm:inline', done ? 'text-accent-deep/70' : 'text-neutral-400')}>{done ? s.ms : ''}</span>
                    </span>
                    {i < STAGES.length - 1 && <span className={cn('h-px w-4 transition-colors duration-300', done ? 'bg-accent' : 'bg-neutral-300')} />}
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="grid gap-px bg-neutral-200/80 lg:grid-cols-12">
            {/* storefront + response status */}
            <div className="space-y-5 bg-panel p-6 lg:col-span-5 lg:p-8">
              <div className="mono-label flex items-center justify-between"><span>shop.example.com/checkout</span><span className="normal-case tracking-normal text-neutral-600">&lt;button.checkout&gt;</span></div>
              <div className="inset p-5">
                <div className="space-y-2.5 text-[14px] text-neutral-700">
                  <div className="flex justify-between"><span>Aurora Headphones × 1</span><span className="font-mono text-neutral-900">$129.00</span></div>
                  <div className="flex justify-between"><span>Shipping</span><span className="font-mono">$0.00</span></div>
                  <div className="h-px bg-neutral-200" />
                  <div className="flex items-start justify-between text-[15px] font-semibold text-neutral-900"><span>Total</span>
                    <span className={cn('origin-right text-right font-mono transition-all duration-700', !fixed && 'w-14 break-all leading-tight text-danger-deep')}>$129.00</span></div>
                </div>
                <div className="relative mt-5">
                  <motion.button type="button" tabIndex={-1} aria-disabled={!fixed} animate={fixed ? { rotate: 0, x: 0 } : { rotate: -1, x: 12 }} transition={spring}
                    className={cn('block w-full select-none px-5 py-3.5 text-[15px] font-medium transition-[background-color,color,opacity] duration-500', fixed ? 'bg-ink text-canvas shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]' : 'cursor-not-allowed bg-neutral-300 text-white opacity-70')} style={{ borderRadius: fixed ? 10 : 4 }}>
                    <span className={cn('inline-flex items-center justify-center gap-2', !fixed && 'max-w-[7rem] whitespace-normal text-center leading-tight')}>{fixed && <Check size={15} className="text-accent-bright" />}Place order</span>
                  </motion.button>
                </div>
                <div className="mt-3 h-4 font-mono text-[11px]">{fixed ? <span className="text-accent-deep">onClick = submitOrder · layout stable</span> : <span className="text-danger-deep">onClick = undefined · overflow +14px</span>}</div>
              </div>

              {/* HTTP status — flips like a mechanical counter */}
              <div className={cn('flex items-center gap-4 rounded-lg border p-4 transition-colors duration-500', fixed ? 'border-accent-line bg-accent-soft' : 'border-danger-line bg-danger-soft')} role="status" aria-live="polite">
                <div className="relative h-[52px] w-[88px] overflow-hidden [perspective:400px]">
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span key={fixed ? '200' : '500'} initial={{ y: 26, opacity: 0, rotateX: -70 }} animate={{ y: 0, opacity: 1, rotateX: 0 }} exit={{ y: -26, opacity: 0, rotateX: 70 }} transition={{ type: 'spring', stiffness: 300, damping: 26 }}
                      className={cn('absolute inset-0 grid place-items-center font-mono text-[44px] font-semibold leading-none tracking-[-0.04em] tabular-nums', fixed ? 'text-accent' : 'text-danger')}>{fixed ? '200' : '500'}</motion.span>
                  </AnimatePresence>
                </div>
                <div className="min-w-0 font-mono">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div key={fixed ? 'ok' : phase === 'running' ? 'run' : 'bad'} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.18 }}
                      className={cn('text-[14px] font-semibold', fixed ? 'text-accent-deep' : 'text-danger-deep')}>{fixed ? 'OK • Patch Injected' : phase === 'running' ? 'Injecting patch…' : 'Checkout Failure'}</motion.div>
                  </AnimatePresence>
                  <div className="mt-0.5 text-[11.5px] text-neutral-700">POST /api/checkout · {fixed ? 'steady' : 'failing'}</div>
                </div>
              </div>
            </div>

            {/* telemetry */}
            <div className="space-y-4 bg-panel p-6 lg:col-span-7 lg:p-8">
              <div className="mono-label flex items-center justify-between"><span>Real-time telemetry</span><span className="flex items-center gap-1.5 normal-case tracking-normal"><Dot tone="accent" pulse />live · 8 Hz</span></div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {tiles.map((t) => (
                  <div key={t.k} className="inset p-3.5">
                    <div className="mono-label text-[10px]">{t.k}</div>
                    <div className="mt-2 flex items-baseline gap-1"><span className={cn('font-mono text-[24px] font-medium leading-none tracking-[-0.03em] tabular-nums transition-colors duration-500', t.slo ? 'text-accent-deep' : 'text-danger-deep')}>{t.v}</span><span className="font-mono text-[11px] text-neutral-600">{t.u}</span></div>
                    <div className="mt-2.5"><Pill tone={t.slo ? 'accent' : 'danger'} className="text-[10px]">{t.k === 'patch' ? t.note : t.slo ? 'within SLO' : t.note}</Pill></div>
                  </div>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="inset p-3.5"><div className="mono-label mb-2 flex justify-between text-[10px]"><span>p95 latency · ms</span><span className="normal-case tracking-normal text-neutral-600">−60s → now</span></div><TelemetryChart points={latPts} max={2200} healthy={fixed} threshold={500} height={132} /></div>
                <div className="inset p-3.5"><div className="mono-label mb-2 flex justify-between text-[10px]"><span>failed checkouts / min</span><span className="normal-case tracking-normal text-neutral-600">−60s → now</span></div><TelemetryChart points={failPts} max={480} healthy={fixed} threshold={5} height={132} /></div>
              </div>
            </div>
          </div>

          {/* terminal */}
          <div className="border-t border-[#D1D5DB]/80 bg-[#05060A] px-5 py-4 font-mono text-[12px] leading-[1.7] text-[#C5CAD3]">
            <div className="mb-2 flex items-center justify-between text-[10.5px] uppercase tracking-[0.12em] text-[#6B7280]"><span>stdout · checkout-api</span><span>{logs.length ? `${logs.length} lines` : 'waiting for traffic…'}</span></div>
            <div className="h-[158px] overflow-hidden" aria-live="off">
              <AnimatePresence initial={false}>
                {logs.slice(-8).map((l) => (
                  <motion.div key={l.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="flex gap-3 whitespace-nowrap">
                    <span className="text-[#4B5563]">{l.t}</span>
                    <span className={cn('w-12 font-medium', l.level === 'ERROR' ? 'text-red-400' : l.level === 'WARN' ? 'text-amber-400' : l.level === 'OK' ? 'text-emerald-400' : l.level === 'STEP' ? 'text-[#E5E7EB]' : 'text-[#9AA1AE]')}>{l.level}</span>
                    <span className={cn('truncate', l.level === 'OK' ? 'text-emerald-300' : l.level === 'ERROR' ? 'text-red-200' : 'text-[#C5CAD3]')}>{l.text}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
              <span className="animate-blink text-[#9AA1AE]">▍</span>
            </div>
          </div>

          {/* controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200/80 bg-neutral-50 px-5 py-3.5">
            <p className="font-mono text-[11.5px] text-neutral-700">{fixed ? 'Recovered with 0 redeploys. The patch is reversible and audited.' : phase === 'running' ? `Running stage 0${stage + 1} / 03 …` : 'Simulated telemetry — the real Studio streams this from visitors’ browsers.'}</p>
            <div className="flex items-center gap-2">
              <PrimaryButton onClick={simulate} disabled={phase !== 'broken'} icon={phase === 'running' ? <Loader2 size={13} className="animate-spin" /> : fixed ? <Check size={13} /> : <Wrench size={13} />}>
                {phase === 'running' ? 'Injecting…' : fixed ? 'Patch live · 0 redeploys' : 'Simulate Fix'}
              </PrimaryButton>
              <button type="button" onClick={reset} aria-label="Replay the demo" className="grid h-11 w-11 place-items-center rounded-xl border border-neutral-300 bg-panel text-neutral-700 shadow-subtle transition-colors hover:border-neutral-400 hover:text-neutral-900"><RotateCcw size={16} /></button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
