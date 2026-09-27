import React, { useMemo } from 'react';
import clsx from 'clsx';
import { BookOpen, Briefcase, LayoutGrid, LayoutTemplate, LucideIcon, MonitorPlay, Users } from 'lucide-react';
import { Category } from '@/shared/db';
import { Select } from '@/shared/ui';
import { CATEGORIES, CatalogSort, SORT_OPTIONS } from '../model';
import { usePublishedListings } from '../hooks';

const CATEGORY_ICON: Record<Category, LucideIcon> = {
  ebook: BookOpen,
  formation: MonitorPlay,
  service: Briefcase,
  template: LayoutTemplate,
  mentorat: Users,
};

/**
 * Category chips with the number of offers in each; the active one is filled.
 * `value === undefined` means "Tout"; `null` means no chip is active (outside the catalogue).
 */
export const CategoryTabs: React.FC<{
  value: Category | undefined | null;
  onChange: (value: Category | undefined) => void;
  className?: string;
}> = ({ value, onChange, className }) => {
  const views = usePublishedListings();
  const counts = useMemo(() => {
    const byCategory = new Map<Category, number>();
    views.forEach((v) => byCategory.set(v.listing.category, (byCategory.get(v.listing.category) ?? 0) + 1));
    return byCategory;
  }, [views]);

  const items: { id: Category | undefined; label: string; icon: LucideIcon; count: number }[] = [
    { id: undefined, label: 'Tout', icon: LayoutGrid, count: views.length },
    ...CATEGORIES.map((c) => ({ id: c.id, label: c.label, icon: CATEGORY_ICON[c.id], count: counts.get(c.id) ?? 0 })),
  ];

  return (
    <nav className={clsx('flex items-center gap-2 overflow-x-auto scrollbar-none', className)} aria-label="Catégories">
      {items.map(({ id, label, icon: Icon, count }) => {
        const active = value !== null && id === value;
        return (
          <button
            key={label}
            type="button"
            onClick={() => onChange(id)}
            aria-pressed={active}
            className={clsx(
              'h-9 shrink-0 inline-flex items-center gap-2 rounded-full border px-3.5 text-[13.5px] font-medium whitespace-nowrap transition-colors',
              active
                ? 'bg-gray-900 border-gray-900 text-canvas'
                : 'bg-surface border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300'
            )}
          >
            <Icon className="w-[15px] h-[15px]" />
            {label}
            <span className={clsx('text-[11.5px] tabular-nums', active ? 'text-canvas/60' : 'text-gray-500')}>{count}</span>
          </button>
        );
      })}
    </nav>
  );
};

export const SortSelect: React.FC<{ value: CatalogSort; onChange: (value: CatalogSort) => void }> = ({ value, onChange }) => (
  <Select value={value} options={SORT_OPTIONS} onChange={onChange} aria-label="Trier" className="shrink-0" />
);
