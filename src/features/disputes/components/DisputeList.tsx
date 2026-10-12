import React from 'react';
import { Badge } from '@/shared/ui';
import { ConversationRow } from '@/features/orders';

export interface DisputeListItem {
  id: string;
  label: string;
  name: string;
  /** Whose picture/initial: the person concerned (not the composite title). Defaults to `name`. */
  avatarName?: string;
  subtitle: string;
  at: string;
  open: boolean;
  unread?: number;
  /** A badge for the thing waiting for you. */
  flag?: string;
}

/** The inbox of dispute rooms: the same rows as the Messages list, one line each, latest first. */
export const DisputeList: React.FC<{ items: DisputeListItem[]; hrefFor: (id: string) => string; selectedId?: string }> = ({ items, hrefFor, selectedId }) => (
  <ul className="divide-y divide-gray-100">
    {items.map((d) => (
      <ConversationRow
        key={d.id}
        href={hrefFor(d.id)}
        selected={d.id === selectedId}
        name={`${d.label} · ${d.name}`}
        avatar={{ name: d.avatarName ?? d.name }}
        at={d.at}
        unread={d.unread ?? 0}
        preview={d.subtitle}
        extras={
          <>
            {d.flag && <Badge tone="warning">{d.flag}</Badge>}
            {!d.open && <Badge>Clos</Badge>}
          </>
        }
      />
    ))}
  </ul>
);
