import { useId } from 'react';

interface Props { points: number[]; max?: number; healthy: boolean; height?: number }

/** A lightweight SVG line chart. Stroke / fill colours cross-fade via CSS when the state flips from coral to sage. */
export default function TelemetryChart({ points, max = 100, healthy, height = 120 }: Props) {
  const id = useId().replace(/:/g, ''); const W = 600, H = height, pad = 8;
  const xs = (i: number) => pad + (i / (points.length - 1)) * (W - pad * 2), ys = (v: number) => H - pad - (Math.min(v, max) / max) * (H - pad * 2);
  // Catmull-Rom → cubic Bézier for a smooth line
  let d = `M${xs(0)},${ys(points[0])}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)], p1 = points[i], p2 = points[i + 1], p3 = points[Math.min(points.length - 1, i + 2)];
    const x0 = xs(Math.max(0, i - 1)), x1 = xs(i), x2 = xs(i + 1), x3 = xs(Math.min(points.length - 1, i + 2));
    d += ` C${x1 + (x2 - x0) / 6},${ys(p1) + (ys(p2) - ys(p0)) / 6} ${x2 - (x3 - x1) / 6},${ys(p2) - (ys(p3) - ys(p1)) / 6} ${x2},${ys(p2)}`;
  }
  const last = points[points.length - 1], lx = xs(points.length - 1), ly = ys(last);
  const color = healthy ? '#5F9C80' : '#DE6A5F';
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-[120px] w-full overflow-visible" role="img" aria-label={healthy ? 'Error rate levelled out near zero' : 'Error rate rising'} preserveAspectRatio="none">
      <defs><linearGradient id={`g${id}`} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity=".22" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      {[0.25, 0.5, 0.75].map((t) => <line key={t} x1={pad} x2={W - pad} y1={pad + t * (H - pad * 2)} y2={pad + t * (H - pad * 2)} stroke="#14151A" strokeOpacity=".06" strokeDasharray="3 5" />)}
      <path d={`${d} L${lx},${H} L${xs(0)},${H} Z`} fill={`url(#g${id})`} style={{ transition: 'fill .6s' }} />
      <path d={d} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" style={{ transition: 'stroke .6s ease' }} />
      <circle cx={lx} cy={ly} r="9" fill={color} opacity=".18" className={healthy ? '' : 'animate-softPulse'} style={{ transformOrigin: `${lx}px ${ly}px`, transition: 'fill .6s' }} />
      <circle cx={lx} cy={ly} r="4" fill={color} stroke="#fff" strokeWidth="1.5" style={{ transition: 'fill .6s' }} />
    </svg>
  );
}
