import React from 'react';
import clsx from 'clsx';
import { Undo2 } from 'lucide-react';
import { OrderRefund } from '@/shared/db';
import { REFUND_FEES_WHY, refundDepartureTime } from '@/shared/domain';
import { formatXaf } from '@/shared/lib';
import { Skeleton } from '@/shared/ui';
import { useRefundPreview } from '../hooks';

const Row: React.FC<{ label: string; value: string; strong?: boolean }> = ({ label, value, strong }) => (
  <div className={clsx('flex justify-between gap-4', strong ? 'font-semibold text-gray-900' : 'text-gray-600')}>
    <dt>{label}</dt>
    <dd className="tabular-nums text-right">{value}</dd>
  </div>
);

const Box: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => (
  <div className={clsx('rounded-xl border border-gray-200/70 bg-gray-50 px-3.5 py-3 text-xs', className)}>
    <p className="flex items-center gap-1.5 font-semibold text-gray-900">
      <Undo2 className="w-3.5 h-3.5 text-gray-400" />
      {title}
    </p>
    {children}
  </div>
);

/**
 * What happens to the money if the sale is cancelled, before the buyer pays and in their order. A refund to a phone loses the
 * payout fees (operator + LightPay), a LightPay-wallet payment comes back whole; the figures come from LightPay's own settings.
 */
export const RefundPreview: React.FC<{ total: number; className?: string }> = ({ total, className }) => {
  const { data, error } = useRefundPreview(total);
  if (error) {
    return (
      <Box title="Si la vente est annulée" className={className}>
        <p className="mt-2 text-gray-500">Détail du remboursement indisponible : {error}</p>
      </Box>
    );
  }
  if (!data) {
    return (
      <Box title="Si la vente est annulée" className={className}>
        <Skeleton className="mt-3 h-3 w-3/5" />
        <Skeleton className="mt-2 h-3 w-2/5" />
      </Box>
    );
  }
  const fees = total - data.sent;
  return (
    <Box title="Si la vente est annulée" className={className}>
      <dl className="mt-2.5 space-y-1.5">
        {fees > 0 ? (
          <>
            <Row label="Payé par mobile money" value={formatXaf(total)} />
            <Row label="Frais de retrait (opérateur et LightPay)" value={`−${formatXaf(fees)}`} />
            <Row label={data.varies ? 'Remboursé sur votre numéro, au moins' : 'Remboursé sur votre numéro'} value={formatXaf(data.sent)} strong />
          </>
        ) : (
          <Row label="Remboursé sur votre numéro" value={formatXaf(total)} strong />
        )}
        <Row label="Payé par wallet LightPay : remboursé en totalité" value={formatXaf(total)} />
      </dl>
      {fees > 0 && <p className="mt-2.5 text-gray-500">{REFUND_FEES_WHY}</p>}
    </Box>
  );
};

/** A cancelled order: what the buyer really got back, and why it is not the whole amount. */
export const RefundReceipt: React.FC<{ refund: OrderRefund; className?: string }> = ({ refund, className }) => {
  const fees = refund.paid - refund.sent;
  return (
    <Box title="Remboursement" className={className}>
      <dl className="mt-2.5 space-y-1.5">
        <Row label="Payé" value={formatXaf(refund.paid)} />
        {fees > 0 && refund.sent > 0 && (
          <>
            <Row label="Frais de retrait de l’opérateur" value={`−${formatXaf(refund.operatorFee)}`} />
            <Row label="Frais de retrait de LightPay" value={`−${formatXaf(refund.lightpayFee)}`} />
          </>
        )}
        <Row label={refund.via === 'wallet' ? 'Remboursé sur votre wallet LightPay' : 'Remboursé sur votre numéro'} value={formatXaf(refund.sent)} strong />
      </dl>
      {refundDepartureTime(refund) && <p className="mt-2.5 text-gray-500">Le virement part à {refundDepartureTime(refund)}.</p>}
      {refund.sent <= 0 && <p className="mt-2.5 text-gray-500">Le montant est trop faible pour couvrir les frais de retrait : contactez le support.</p>}
      {fees > 0 && refund.sent > 0 && <p className="mt-2.5 text-gray-500">{REFUND_FEES_WHY}</p>}
    </Box>
  );
};
