import React, { useEffect, useRef } from 'react';
import clsx from 'clsx';

/** A single observer for every revealed element. */
let observer: IntersectionObserver | null = null;
const getObserver = () =>
  (observer ??= new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        (entry.target as HTMLElement).dataset.shown = '';
        observer?.unobserve(entry.target);
      }),
    { rootMargin: '0px 0px -6% 0px', threshold: 0.05 }
  ));

/** Fades and lifts its content in the first time it scrolls into view (instant with reduced motion). */
export const Reveal: React.FC<{ children: React.ReactNode; delay?: number; className?: string }> = ({ children, delay = 0, className }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      el.dataset.shown = '';
      return;
    }
    const obs = getObserver();
    obs.observe(el);
    return () => obs.unobserve(el);
  }, []);

  return (
    <div
      ref={ref}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={clsx(
        'opacity-0 translate-y-4 transition duration-700 ease-[cubic-bezier(.2,.7,.2,1)]',
        'data-[shown]:opacity-100 data-[shown]:translate-y-0',
        'motion-reduce:opacity-100 motion-reduce:translate-y-0 motion-reduce:transition-none',
        className
      )}
    >
      {children}
    </div>
  );
};
