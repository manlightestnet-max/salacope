import React, { useState } from 'react';
import clsx from 'clsx';
import { CalendarDays, Check } from 'lucide-react';
import { formatDate } from '../lib/format';
import { Button } from './Button';
import { Input } from './Field';
import { Popover } from './Popover';

export interface DateRangeValue {
  from: string;
  to: string;
}

export interface DateRangePreset {
  id: string;
  label: string;
  range: DateRangeValue;
}

const show = (day: string) => formatDate(`${day}T12:00:00`);

const Custom: React.FC<{ range: DateRangeValue; max?: string; onApply: (r: DateRangeValue) => void }> = ({ range, max, onApply }) => {
  const [from, setFrom] = useState(range.from);
  const [to, setTo] = useState(range.to);
  const valid = Boolean(from && to && from <= to);
  return (
    <div className="border-t border-gray-100 p-3 space-y-2.5">
      <p className="text-xs font-medium text-gray-500">Dates précises</p>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-gray-500">
          Du
          <Input type="date" value={from} max={to || max} onChange={(e) => setFrom(e.target.value)} className="mt-1" />
        </label>
        <label className="text-xs text-gray-500">
          Au
          <Input type="date" value={to} min={from} max={max} onChange={(e) => setTo(e.target.value)} className="mt-1" />
        </label>
      </div>
      <Button size="sm" variant="primary" block disabled={!valid} onClick={() => onApply({ from, to })}>
        Appliquer
      </Button>
    </div>
  );
};

/**
 * The period of a dashboard: one bar with the dates, a list of usual periods and exact dates, and a slot on the right for a
 * filter button. `activeId` is the preset in force (`custom` for exact dates).
 */
export const DateRangeBar: React.FC<{
  range: DateRangeValue;
  activeId: string;
  presets: DateRangePreset[];
  onPick: (id: string, range: DateRangeValue) => void;
  /** Latest day that can be chosen (today). */
  max?: string;
  /** Right of the bar, inside it (a filter button). */
  filter?: React.ReactNode;
  className?: string;
}> = ({ range, activeId, presets, onPick, max, filter, className }) => (
  <div className={clsx('flex items-center gap-2 rounded-xl border border-gray-200 bg-surface pl-1 pr-1.5 h-11', className)}>
    <Popover
      align="left"
      className="w-[min(92vw,20rem)] overflow-hidden"
      trigger={({ open, toggle }) => (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-label="Choisir la période"
          className="h-9 px-2.5 inline-flex items-center gap-2.5 rounded-lg text-sm text-gray-900 hover:bg-gray-50 transition-colors"
        >
          <CalendarDays className="w-[18px] h-[18px] text-gray-500 shrink-0" />
          <span className="tabular-nums whitespace-nowrap">
            {show(range.from)} – {show(range.to)}
          </span>
        </button>
      )}
    >
      {(close) => (
        <>
          <ul className="p-1">
            {presets.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => {
                    onPick(p.id, p.range);
                    close();
                  }}
                  className={clsx('w-full flex items-center justify-between gap-2 px-2.5 h-9 rounded-md text-sm text-left hover:bg-gray-100', activeId === p.id ? 'font-semibold text-gray-900' : 'text-gray-700')}
                >
                  {p.label}
                  {activeId === p.id && <Check className="w-4 h-4 text-primary-700" />}
                </button>
              </li>
            ))}
          </ul>
          <Custom
            range={range}
            max={max}
            onApply={(r) => {
              onPick('custom', r);
              close();
            }}
          />
        </>
      )}
    </Popover>
    <div className="ml-auto shrink-0">{filter}</div>
  </div>
);
