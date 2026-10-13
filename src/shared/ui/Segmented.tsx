import clsx from 'clsx';
import { LucideIcon } from 'lucide-react';
import { switcherItem, switcherTrack } from './Tabs';

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
    <div role="radiogroup" aria-label={label} className={clsx(switcherTrack, className)}>
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
            className={clsx(switcherItem(active), iconOnly ? 'w-7 justify-center' : 'px-2.5')}
          >
            {Icon && <Icon className="w-3.5 h-3.5" />}
            {!iconOnly && text}
          </button>
        );
      })}
    </div>
  );
}
