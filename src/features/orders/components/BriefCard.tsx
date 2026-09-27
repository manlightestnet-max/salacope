import React from 'react';
import { Order } from '@/shared/db';
import { Card, CardBody, CardHeader } from '@/shared/ui';
import { Perspective } from '../model';

/** Answers the buyer gave at checkout; what the seller needs to start. `bare` drops the card frame. */
export const BriefCard: React.FC<{ order: Order; perspective: Perspective; bare?: boolean }> = ({ order, perspective, bare }) => {
  if (!order.brief?.length) return null;
  if (bare)
    return (
      <dl className="px-5 py-5 space-y-5">
        {order.brief.map((a) => (
          <div key={a.question}>
            <dt className="text-xs text-gray-500">{a.question}</dt>
            <dd className="mt-1 text-sm text-gray-900 whitespace-pre-line break-words">{a.answer}</dd>
          </div>
        ))}
      </dl>
    );
  return (
    <Card>
      <CardHeader title={perspective === 'seller' ? 'Brief du client' : 'Votre brief'} />
      <CardBody className="pt-0">
        <dl className="space-y-3">
          {order.brief.map((a) => (
            <div key={a.question}>
              <dt className="text-xs text-gray-500">{a.question}</dt>
              <dd className="mt-0.5 text-sm text-gray-900 whitespace-pre-line break-words">{a.answer}</dd>
            </div>
          ))}
        </dl>
      </CardBody>
    </Card>
  );
};
