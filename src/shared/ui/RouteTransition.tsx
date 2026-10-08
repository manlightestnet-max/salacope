import React, { useEffect, useRef } from 'react';
import clsx from 'clsx';
import { useLocation, useNavigationType } from 'react-router-dom';

// The very first screen of a visit just rises in; direction only matters once the person moves around.
let moved = false;

/**
 * Wraps a screen so moving between screens has a direction: opened from another one it slides in from the right,
 * going back it comes from the left, a replacement or the first load only rises. Keyed by path (a new page, not a new
 * query), and switched off by `prefers-reduced-motion`.
 */
export const RouteTransition: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => {
  const { pathname } = useLocation();
  const type = useNavigationType();
  // Decided once per page, when the path changes: an unrelated re-render never restarts the animation.
  const chosen = useRef({ path: '', animation: '' });
  if (chosen.current.path !== pathname) {
    chosen.current = { path: pathname, animation: !moved ? 'animate-rise' : type === 'POP' ? 'animate-route-pop' : type === 'PUSH' ? 'animate-route-push' : 'animate-rise' };
  }
  useEffect(() => {
    moved = true;
  }, []);
  return (
    <div key={pathname} className={clsx(chosen.current.animation, 'motion-reduce:animate-none', className)}>
      {children}
    </div>
  );
};
