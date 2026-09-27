import clsx from 'clsx';
import { LucideIcon } from 'lucide-react';

export interface SegmentedOption<V extends string> {
  value: V;
  label: string;
  icon?: LucideIcon;
  /** Icon only (label kept for screen readers). */
  iconOnly?: boolean;
}

/** Compact exclusive toggle: view mode (grille / tableau) or a type filter. */
export function Segmented<V extends string>({
  value,
  options,
  onChange,
  label,
  className,
}: {
  value: V;
  options: readonly SegmentedOption<V>[];
  onChange: (value: V) => void;
  label: string;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={clsx('inline-flex items-center gap-0.5 rounded-full border border-gray-200 bg-surface p-0.5', className)}>
      {options.map(({ value: v, label: text, icon: Icon, iconOnly }) => {
        const active = v === value;
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={iconOnly ? text : undefined}
            title={iconOnly ? text : undefined}
            onClick={() => onChange(v)}
            className={clsx(
              'h-7 inline-flex items-center gap-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors',
              iconOnly ? 'w-7 justify-center' : 'px-3',
              active ? 'bg-gray-900 text-canvas' : 'text-gray-500 hover:text-gray-900'
            )}
          >
            {Icon && <Icon className="w-3.5 h-3.5" />}
            {!iconOnly && text}
          </button>
        );
      })}
    </div>
  );
}
