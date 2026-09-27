import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * State of a horizontal scroll track: whether it can scroll either way, and a
 * `scrollPage` that moves it by most of its width. Re-measures when resized.
 */
export function useHorizontalScroll<T extends HTMLElement = HTMLDivElement>(itemCount: number) {
  const ref = useRef<T>(null);
  const [edges, setEdges] = useState({ atStart: true, atEnd: true });

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setEdges({ atStart: el.scrollLeft <= 4, atEnd: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  }, []);

  useEffect(() => {
    measure();
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [measure, itemCount]);

  const scrollPage = (direction: 1 | -1) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: 'smooth' });
  };

  return { ref, onScroll: measure, ...edges, overflows: !(edges.atStart && edges.atEnd), scrollPage };
}

type HorizontalScroll = Pick<ReturnType<typeof useHorizontalScroll>, 'atStart' | 'atEnd' | 'overflows' | 'scrollPage'>;

const ArrowButton: React.FC<{ direction: 'prev' | 'next'; disabled: boolean; onClick: () => void }> = ({ direction, disabled, onClick }) => {
  const Icon = direction === 'prev' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === 'prev' ? 'Précédent' : 'Suivant'}
      className="hidden sm:flex w-8 h-8 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-default"
    >
      <Icon className="w-4 h-4" />
    </button>
  );
};

/** Previous / next buttons for a `useHorizontalScroll` track; hidden when everything fits. */
export const ScrollArrows: React.FC<{ scroll: HorizontalScroll }> = ({ scroll }) =>
  scroll.overflows ? (
    <>
      <ArrowButton direction="prev" disabled={scroll.atStart} onClick={() => scroll.scrollPage(-1)} />
      <ArrowButton direction="next" disabled={scroll.atEnd} onClick={() => scroll.scrollPage(1)} />
    </>
  ) : null;
