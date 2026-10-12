import clsx from 'clsx';

export interface TabItem<V extends string> {
  value: V;
  label: string;
  count?: number;
}

export interface TabsProps<V extends string> {
  value: V;
  items: readonly TabItem<V>[];
  onChange: (value: V) => void;
  /** Inside a pinned page bar: adds the bar's vertical padding. */
  bare?: boolean;
  /** Separate pills instead of the app's tab look (one framed bar, the current one shaded, as `Segmented`). */
  pills?: boolean;
  /** @deprecated the framed bar is the default. */
  segmented?: boolean;
  className?: string;
}

/** View switcher as pills (filters a list, not a route); the active one is filled. */
export function Tabs<V extends string>({ value, items, onChange, bare, pills, className }: TabsProps<V>) {
  if (!pills) {
    return (
      <div className={clsx(bare && 'py-2', 'max-w-full overflow-x-auto scrollbar-none', className)}>
        <div role="tablist" className="inline-flex items-center gap-0.5 rounded-lg border border-gray-200 bg-surface p-0.5">
          {items.map((item) => {
            const active = item.value === value;
            return (
              <button
                key={item.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onChange(item.value)}
                className={clsx(
                  'h-7 inline-flex items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium whitespace-nowrap transition-colors',
                  active ? 'bg-gray-100 text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
                )}
              >
                {item.label}
                {item.count !== undefined && <span className="text-[11px] tabular-nums text-gray-400">{item.count}</span>}
              </button>
            );
          })}
        </div>
      </div>
    );
  }
  return (
    <div className={clsx('flex items-center gap-1.5 overflow-x-auto scrollbar-none', bare && 'py-2', className)} role="tablist">
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={clsx(
              'h-8 shrink-0 flex items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium whitespace-nowrap transition-colors',
              active
                ? 'bg-accent border-accent text-on-accent'
                : 'bg-surface border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300'
            )}
          >
            {item.label}
            {item.count !== undefined && (
              <span className={clsx('text-[11px] tabular-nums', active ? 'text-on-accent/70' : 'text-gray-500')}>{item.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
