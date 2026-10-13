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
  /** Separate pills instead of the app's tab look (one recessed track, the current one filled, as `Segmented`). */
  pills?: boolean;
  /** @deprecated the framed bar is the default. */
  segmented?: boolean;
  className?: string;
}

/**
 * The look shared by `Tabs` and `Segmented`: a recessed track, the chosen item filled with the accent. One glance says
 * which one is on and which ones are off, in both themes.
 */
export const switcherTrack = 'inline-flex items-center gap-1 rounded-lg bg-gray-100 p-1';
export const switcherItem = (active: boolean) =>
  clsx(
    'h-7 inline-flex items-center gap-1.5 rounded-md text-[13px] whitespace-nowrap transition-colors duration-150 motion-reduce:transition-none',
    active ? 'bg-accent text-on-accent font-semibold shadow-xs' : 'font-medium text-gray-600 hover:bg-gray-200/70 hover:text-gray-900'
  );
export const switcherCount = (active: boolean) => clsx('text-[11px] tabular-nums', active ? 'text-on-accent/75' : 'text-gray-400');

/** View switcher (filters a list, not a route): the active one is filled. */
export function Tabs<V extends string>({ value, items, onChange, bare, pills, className }: TabsProps<V>) {
  if (!pills) {
    return (
      <div className={clsx(bare && 'py-2', 'max-w-full overflow-x-auto scrollbar-none', className)}>
        <div role="tablist" className={switcherTrack}>
          {items.map((item) => {
            const active = item.value === value;
            return (
              <button key={item.value} type="button" role="tab" aria-selected={active} onClick={() => onChange(item.value)} className={clsx(switcherItem(active), 'px-3')}>
                {item.label}
                {item.count !== undefined && <span className={switcherCount(active)}>{item.count}</span>}
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
              'h-8 shrink-0 flex items-center gap-1.5 rounded-full border px-3 text-[13px] whitespace-nowrap transition-colors',
              active
                ? 'bg-accent border-accent text-on-accent font-semibold'
                : 'bg-surface border-gray-200 font-medium text-gray-600 hover:text-gray-900 hover:border-gray-300'
            )}
          >
            {item.label}
            {item.count !== undefined && <span className={switcherCount(active)}>{item.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
