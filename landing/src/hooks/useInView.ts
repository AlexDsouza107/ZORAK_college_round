import { useEffect, useRef, useState } from 'react';

/** True while the element intersects the viewport. Used to pause the 3D loop and demo timers off-screen. */
export function useInView<T extends Element>(options: IntersectionObserverInit = { threshold: 0.05 }) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(true);
  useEffect(() => {
    const el = ref.current; if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), options);
    io.observe(el); return () => io.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return [ref, inView] as const;
}
