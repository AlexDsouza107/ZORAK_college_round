import { motion, useScroll, useSpring } from 'framer-motion';

/** A hairline emerald progress bar across the top of the viewport. */
export default function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 26, mass: 0.4 });
  return <motion.div aria-hidden style={{ scaleX }} className="fixed inset-x-0 top-0 z-[60] h-[2px] origin-left bg-gradient-to-r from-accent/40 via-accent-bright to-accent shadow-[0_0_12px_rgba(52,211,153,0.7)]" />;
}
