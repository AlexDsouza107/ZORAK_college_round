import { useEffect, useState } from 'react';

export function useReducedMotion() {
  const [reduced, setReduced] = useState(() => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const mq = matchMedia('(prefers-reduced-motion: reduce)'); const h = () => setReduced(mq.matches);
    mq.addEventListener('change', h); return () => mq.removeEventListener('change', h);
  }, []);
  return reduced;
}
