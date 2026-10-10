import { useId } from 'react';

interface Props { points: number[]; max?: number; healthy: boolean; height?: number; threshold?: number }

/** Lightweight SVG area chart. The line cross-fades red → emerald when the state flips; an optional dashed threshold line is drawn. */
export default function TelemetryChart({ points, max = 100, healthy, height = 96, threshold }: Props) {
  const id = useId().replace(/:/g, ''); const W = 600, H = height, pad = 6;
  const xs = (i: number) => pad + (i / (points.length - 1)) * (W - pad * 2), ys = (v: number) => H - pad - (Math.min(v, max) / max) * (H - pad * 2);
  let d = `M${xs(0)},${ys(points[0])}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)], p1 = points[i], p2 = points[i + 1], p3 = points[Math.min(points.length - 1, i + 2)];
    const x0 = xs(Math.max(0, i - 1)), x1 = xs(i), x2 = xs(i + 1), x3 = xs(Math.min(points.length - 1, i + 2));
    d += ` C${x1 + (x2 - x0) / 6},${ys(p1) + (ys(p2) - ys(p0)) / 6} ${x2 - (x3 - x1) / 6},${ys(p2) - (ys(p3) - ys(p1)) / 6} ${x2},${ys(p2)}`;
  }
  const lx = xs(points.length - 1), ly = ys(points[points.length - 1]), color = healthy ? '#10B981' : '#F2555C';
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible" style={{ height }} role="img" aria-label={healthy ? 'Metric levelled out' : 'Metric elevated'} preserveAspectRatio="none">
      <defs><linearGradient id={`g${id}`} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity=".16" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      {[0.33, 0.66].map((t) => <line key={t} x1={pad} x2={W - pad} y1={pad + t * (H - pad * 2)} y2={pad + t * (H - pad * 2)} stroke="#FFFFFF" strokeOpacity=".08" strokeDasharray="3 5" vectorEffect="non-scaling-stroke" />)}
      {threshold != null && <line x1={pad} x2={W - pad} y1={ys(threshold)} y2={ys(threshold)} stroke="#FFFFFF" strokeOpacity=".4" strokeDasharray="5 4" vectorEffect="non-scaling-stroke" />}
      <path d={`${d} L${lx},${H} L${xs(0)},${H} Z`} fill={`url(#g${id})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" style={{ transition: 'stroke .5s ease' }} />
      <circle cx={lx} cy={ly} r="3.5" fill={color} stroke="#0D1017" strokeWidth="1.5" style={{ transition: 'fill .5s' }} />
    </svg>
  );
}
