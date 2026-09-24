import React from 'react';
import { OrderStatus } from '../../types';
import {
  Clock,
  CheckCircle2,
  PackageCheck,
  Truck,
  CheckCheck,
  XCircle,
  AlertTriangle,
  PlayCircle,
} from 'lucide-react';

interface OrderStatusBadgeProps {
  status: OrderStatus;
  size?: 'sm' | 'md' | 'lg';
}

export const OrderStatusBadge: React.FC<OrderStatusBadgeProps> = ({ status, size = 'md' }) => {
  let config = {
    label: 'Statut inconnu',
    bg: 'bg-gray-100 text-gray-700 border-gray-200',
    icon: Clock,
  };

  switch (status) {
    case 'PENDING':
      config = {
        label: 'En attente de paiement',
        bg: 'bg-amber-50 text-amber-700 border-amber-200',
        icon: Clock,
      };
      break;
    case 'CONFIRMED':
      config = {
        label: 'Paiement confirmé',
        bg: 'bg-blue-50 text-blue-700 border-blue-200',
        icon: CheckCircle2,
      };
      break;
    case 'ACCEPTED':
      config = {
        label: 'Prise en charge',
        bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        icon: PackageCheck,
      };
      break;
    case 'PROCESSING':
      config = {
        label: 'En traitement',
        bg: 'bg-purple-50 text-purple-700 border-purple-200',
        icon: PlayCircle,
      };
      break;
    case 'DELIVERED':
      config = {
        label: 'Livrée',
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        icon: Truck,
      };
      break;
    case 'COMPLETED':
      config = {
        label: 'Terminée & Validée',
        bg: 'bg-teal-50 text-teal-800 border-teal-200',
        icon: CheckCheck,
      };
      break;
    case 'CANCELLED':
      config = {
        label: 'Annulée',
        bg: 'bg-gray-100 text-gray-600 border-gray-300',
        icon: XCircle,
      };
      break;
    case 'DISPUTED':
      config = {
        label: 'Litige ouvert',
        bg: 'bg-rose-50 text-rose-700 border-rose-200',
        icon: AlertTriangle,
      };
      break;
  }

  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  }[size];

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  }[size];

  return (
    <span
      className={`inline-flex items-center font-medium rounded-xs border font-heading ${config.bg} ${sizeClasses}`}
    >
      <Icon className={iconSizes} />
      <span>{config.label}</span>
    </span>
  );
};
