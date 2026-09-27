import React, { useId } from 'react';
import clsx from 'clsx';
import { Info } from 'lucide-react';

/** ⓘ next to a label: a short explanation on hover or keyboard focus. */
export const HelpTip: React.FC<{ text: string; className?: string }> = ({ text, className }) => {
  const id = useId();
  return (
    <span className={clsx('relative inline-flex group/tip align-middle', className)}>
      <button
        type="button"
        aria-describedby={id}
        aria-label="Aide"
        className="w-4 h-4 inline-flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 focus-visible:text-gray-700"
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      <span
        id={id}
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-40 mt-2 w-60 -translate-x-1/2 rounded-lg bg-gray-900 px-3 py-2 text-left text-xs font-normal leading-relaxed text-canvas opacity-0 shadow-lg transition-opacity duration-150 group-hover/tip:opacity-100 group-focus-within/tip:opacity-100"
      >
        {text}
      </span>
    </span>
  );
};
