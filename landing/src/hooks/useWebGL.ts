import { useMemo } from 'react';

export function useWebGL(): boolean {
  return useMemo(() => {
    try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
  }, []);
}
