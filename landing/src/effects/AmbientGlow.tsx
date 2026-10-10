import { motion, useScroll, useTransform } from 'framer-motion';

/** Soft, slowly parallaxing colour pools behind everything, plus a vignette. */
export default function AmbientGlow() {
  const { scrollYProgress } = useScroll();
  const a = useTransform(scrollYProgress, [0, 1], [0, -260]), b = useTransform(scrollYProgress, [0, 1], [0, 200]), c = useTransform(scrollYProgress, [0, 1], [0, -120]);
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-0 overflow-hidden">
      <motion.div style={{ y: a }} className="absolute -right-[10%] -top-[18%] h-[70vh] w-[70vw] rounded-full bg-[radial-gradient(closest-side,rgba(16,185,129,0.17),transparent)] blur-2xl" />
      <motion.div style={{ y: b }} className="absolute -left-[16%] top-[28%] h-[64vh] w-[60vw] rounded-full bg-[radial-gradient(closest-side,rgba(80,100,160,0.15),transparent)] blur-2xl" />
      <motion.div style={{ y: c }} className="absolute -right-[8%] bottom-[-12%] h-[60vh] w-[60vw] rounded-full bg-[radial-gradient(closest-side,rgba(16,185,129,0.10),transparent)] blur-2xl" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.55))]" />
    </div>
  );
}
