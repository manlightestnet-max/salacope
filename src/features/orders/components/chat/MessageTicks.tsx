import React from 'react';
import clsx from 'clsx';
import { Check, CheckCheck } from 'lucide-react';
import { MessageStatus } from '../../chat';

const LABEL: Record<MessageStatus, string> = { sent: 'Envoyé', received: 'Reçu', read: 'Lu' };

/** ✓ sent · ✓✓ received · ✓✓ coloured: read. */
export const MessageTicks: React.FC<{ status: MessageStatus }> = ({ status }) => {
  const Icon = status === 'sent' ? Check : CheckCheck;
  return (
    <span title={LABEL[status]} aria-label={LABEL[status]} className="inline-flex">
      <Icon className={clsx('w-3.5 h-3.5', status === 'read' ? 'text-primary-600' : 'text-gray-400')} strokeWidth={2.25} />
    </span>
  );
};
