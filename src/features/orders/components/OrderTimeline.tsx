import React from 'react';
import { Order, User } from '@/shared/db';
import { Card } from '@/shared/ui';
import { formatDateTime } from '@/shared/lib';
import { displayName } from '@/features/session';
import { EVENT_LABEL } from '../model';

/** What happened to the order, step by step (the conversation lives in Messages). */
export const OrderTimeline: React.FC<{ order: Order; users: Map<string, User> }> = ({ order, users }) => (
  <Card className="p-4">
    <p className="mb-3 text-sm font-semibold text-gray-900">Suivi de la commande</p>
    <ol className="relative space-y-3 before:absolute before:left-[3px] before:top-1.5 before:bottom-1.5 before:w-px before:bg-gray-200">
      {[...order.events].reverse().map((e, i) => {
        const actor = e.actorId ? users.get(e.actorId) : undefined;
        return (
          <li key={e.id} className="relative pl-4">
            <span className={`absolute left-0 top-1.5 w-[7px] h-[7px] rounded-full ${i === 0 ? 'bg-accent' : 'bg-gray-300'}`} />
            <p className="text-xs text-gray-900">
              {EVENT_LABEL[e.type]}
              {actor && <span className="text-gray-500"> · {displayName(actor)}</span>}
            </p>
            <p className="text-[11px] text-gray-400">{formatDateTime(e.at)}</p>
            {e.note && e.type !== 'delivered' && <p className="mt-0.5 text-xs text-gray-500">« {e.note} »</p>}
          </li>
        );
      })}
    </ol>
  </Card>
);
