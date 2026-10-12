import React from 'react';
import clsx from 'clsx';
import { Link } from 'react-router-dom';
import { Avatar, Badge } from '@/shared/ui';
import { formatRelative } from '@/shared/lib';

export interface DisputeListItem {
  id: string;
  label: string;
  name: string;
  subtitle: string;
  at: string;
  open: boolean;
  unread?: number;
  /** A badge for the thing waiting for you. */
  flag?: string;
}

/** The inbox of dispute rooms, in the style of the Messages list: one line each, latest first. */
export const DisputeList: React.FC<{ items: DisputeListItem[]; hrefFor: (id: string) => string; selectedId?: string }> = ({ items, hrefFor, selectedId }) => (
  <ul className="divide-y divide-gray-100">
    {items.map((d) => (
      <li key={d.id}>
        <Link to={hrefFor(d.id)} aria-current={d.id === selectedId || undefined} className={clsx('flex items-center gap-3 px-4 py-3 transition-colors', d.id === selectedId ? 'bg-gray-100' : 'hover:bg-gray-50')}>
          <Avatar name={d.name} size="lg" />
          <span className="min-w-0 flex-1">
            <span className="flex items-baseline gap-2">
              <span className={clsx('flex-1 min-w-0 truncate text-sm text-gray-900', d.unread || d.flag ? 'font-semibold' : 'font-medium')}>
                {d.label} · {d.name}
              </span>
              <span className="shrink-0 text-[11px] text-gray-400">{formatRelative(d.at)}</span>
            </span>
            <span className="flex items-center gap-2 mt-0.5">
              <span className="flex-1 min-w-0 truncate text-xs text-gray-500">{d.subtitle}</span>
              {d.flag && <Badge tone="warning">{d.flag}</Badge>}
              {!d.open && <Badge>Clos</Badge>}
              {!!d.unread && (
                <span className="shrink-0 min-w-5 h-5 px-1.5 rounded-full bg-accent text-on-accent text-[11px] font-semibold flex items-center justify-center tabular-nums">{d.unread}</span>
              )}
            </span>
          </span>
        </Link>
      </li>
    ))}
  </ul>
);
