import type { MouseEvent } from 'react';

/** Sets --mx / --my on the hovered element so the `.spot` utility can paint a cursor-following glow. */
export function useSpotlight() {
  return (e: MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
  };
}
