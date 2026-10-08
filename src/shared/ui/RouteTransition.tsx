import React, { useEffect, useRef } from 'react';
import clsx from 'clsx';
import { useLocation, useNavigationType } from 'react-router-dom';

// The first screen of a visit shows as it is; only moving from one screen to another has a direction.
let moved = false;

/** True once this visit has opened a screen from another one (so a back navigation is a real return, not the first load). */
export const hasNavigated = () => moved;

/**
 * Wraps a screen so opening one from another has a direction: it slides in from the right. Nothing else moves: the
 * first load, going back (the screen is shown as it was left, scroll included) and replacements appear as they are.
 * Keyed by path (a new page, not a new query), and switched off by `prefers-reduced-motion`.
 */
export const RouteTransition: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => {
  const { pathname } = useLocation();
  const type = useNavigationType();
  // Decided once per page, when the path changes: an unrelated re-render never restarts the animation.
  const chosen = useRef({ path: '', animation: '' });
  if (chosen.current.path !== pathname) {
    // Only opening a screen from another one moves; the first load, going back and replacements show it as it is.
    chosen.current = { path: pathname, animation: moved && type === 'PUSH' ? 'animate-route-push' : '' };
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
