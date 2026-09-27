import React, { useState } from 'react';
import clsx from 'clsx';

export interface BarDatum {
  key: string;
  label: string;
  value: number;
}

export interface BarChartProps {
  data: BarDatum[];
  formatValue: (value: number) => string;
  /** Accessible name; also used as the table caption. */
  title: string;
  height?: number;
  /** Show an x label every N bars. */
  labelEvery?: number;
}

/**
 * Single-series column chart (one hue, no legend). Hover/focus a column for its value;
 * a visually hidden table carries the same data for assistive tech.
 */
export const BarChart: React.FC<BarChartProps> = ({ data, formatValue, title, height = 160, labelEvery = 5 }) => {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const current = active !== null ? data[active] : null;

  return (
    <figure className="relative">
      <div className="h-5 text-xs text-gray-500 tabular-nums" aria-live="polite">
        {current ? (
          <>
            <span className="text-gray-900 font-medium">{formatValue(current.value)}</span> · {current.label}
          </>
        ) : null}
      </div>

      <div className="flex items-end gap-[2px] border-b border-gray-200" style={{ height }} aria-hidden>
        {data.map((d, i) => (
          <div
            key={d.key}
            className="flex-1 h-full flex items-end cursor-default"
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
          >
            <div
              className={clsx(
                'w-full rounded-t-[4px] transition-colors',
                d.value === 0 ? 'bg-gray-100' : active === i ? 'bg-primary-700' : 'bg-primary-500'
              )}
              style={{ height: d.value === 0 ? 2 : `${Math.max(3, (d.value / max) * 100)}%` }}
            />
          </div>
        ))}
      </div>

      <div className="flex gap-[2px] mt-1.5" aria-hidden>
        {data.map((d, i) => (
          <div key={d.key} className="flex-1 text-[11px] text-gray-400 whitespace-nowrap overflow-visible">
            {(i % labelEvery === 0 || i === data.length - 1) && d.label}
          </div>
        ))}
      </div>

      <table className="sr-only">
        <caption>{title}</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.key}>
              <th scope="row">{d.label}</th>
              <td>{formatValue(d.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
};
