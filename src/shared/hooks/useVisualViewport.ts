import { useEffect } from 'react';

/**
 * Keeps `--vvh` equal to the height really visible on a phone: the on-screen keyboard shrinks it, so a shell sized with
 * `var(--vvh, 100dvh)` keeps its header and composer on screen instead of sliding under the keyboard. iOS also scrolls
 * the page up when the keyboard opens: it is put back, the shell itself never scrolls. Skipped while pinch-zoomed.
 */
export function useVisualViewportHeight() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const root = document.documentElement;
    const apply = () => {
      if (vv.scale > 1.01) return root.style.removeProperty('--vvh');
      root.style.setProperty('--vvh', `${Math.round(vv.height)}px`);
      if (window.scrollY !== 0 || vv.offsetTop !== 0) window.scrollTo(0, 0);
    };
    apply();
    vv.addEventListener('resize', apply);
    vv.addEventListener('scroll', apply);
    return () => {
      vv.removeEventListener('resize', apply);
      vv.removeEventListener('scroll', apply);
      root.style.removeProperty('--vvh');
    };
  }, []);
}
