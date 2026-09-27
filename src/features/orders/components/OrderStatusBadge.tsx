import React from 'react';
import { Order } from '@/shared/db';
import { Badge } from '@/shared/ui';
import { Perspective, statusDisplay } from '../model';

export const OrderStatusBadge: React.FC<{ order: Order; perspective: Perspective }> = ({ order, perspective }) => {
  const { label, tone } = statusDisplay(order, perspective);
  return (
    <Badge tone={tone} dot>
      {label}
    </Badge>
  );
};
