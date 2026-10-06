import React, { useState } from 'react';
import { CheckCircle2, PackageCheck } from 'lucide-react';
import { Order } from '@/shared/db';
import { Button, ConfirmDialog } from '@/shared/ui';
import { useServiceAction } from '@/shared/hooks';
import { formatDate, formatXaf } from '@/shared/lib';
import { Perspective, permissionsFor, revisionsLeft } from '../../model';
import { ReportResult, confirmOrder, reportProblem, requestRevision } from '../../api';
import { ReportDialog, RevisionDialog } from '../OrderDialogs';

/** What became of the latest delivery once it is no longer waiting for the client. */
const AFTER: Partial<Record<Order['status'], string>> = {
  completed: 'Livraison validée.',
  disputed: 'Problème signalé : examen en cours par Salacope.',
  cancelled: 'Commande annulée.',
};

/**
 * Card in the chat where a service was delivered: the client validates here (or asks for a
 * revision, or reports a problem). Once the order is closed it stays as a record and can't be
 * sent again — a new delivery only comes with a new order of the same service.
 */
export const ValidationCard: React.FC<{ order: Order; perspective: Perspective; current: boolean }> = ({ order, perspective, current }) => {
  const [dialog, setDialog] = useState<'confirm' | 'revise' | 'report' | null>(null);
  const run = useServiceAction();
  const can = permissionsFor(order, perspective);
  const live = current && order.status === 'delivered';

  let text: string;
  if (!current) text = 'Retouche demandée : une nouvelle livraison a suivi.';
  else if (!live) text = AFTER[order.status] ?? 'Retouche demandée.';
  else if (perspective === 'buyer') text = `Vérifiez la livraison puis validez-la. Sans réponse, elle sera validée le ${formatDate(order.releaseAt)}.`;
  else text = `En attente de la validation du client (automatique le ${formatDate(order.releaseAt)}).`;

  return (
    <div className="w-72 max-w-full rounded-2xl border border-gray-200 bg-surface p-3 space-y-3">
      <div className="flex items-start gap-2.5">
        {live ? <PackageCheck className="w-4 h-4 mt-0.5 text-gray-500 shrink-0" /> : <CheckCircle2 className="w-4 h-4 mt-0.5 text-gray-400 shrink-0" />}
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900">Validation de la livraison</p>
          <p className="mt-0.5 text-xs text-gray-500">{text}</p>
        </div>
      </div>
      {live && can.confirm && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="primary" onClick={() => setDialog('confirm')}>
            Valider
          </Button>
          {can.revise && (
            <Button size="sm" onClick={() => setDialog('revise')}>
              Retouche
            </Button>
          )}
          {can.dispute && (
            <Button size="sm" variant="ghost" onClick={() => setDialog('report')}>
              Signaler
            </Button>
          )}
        </div>
      )}

      <ConfirmDialog
        open={dialog === 'confirm'}
        onClose={() => setDialog(null)}
        title="Valider la livraison ?"
        description={`Le vendeur recevra ${formatXaf(order.amounts.total)}. Vous ne pourrez plus ouvrir de litige sur cette commande.`}
        confirmLabel="Valider"
        onConfirm={() => run(() => confirmOrder(order.id), 'Livraison validée')}
      />
      <RevisionDialog
        open={dialog === 'revise'}
        onClose={() => setDialog(null)}
        left={revisionsLeft(order)}
        onSubmit={(note) => run(() => requestRevision(order.id, note), 'Retouche demandée')}
      />
      <ReportDialog
        open={dialog === 'report'}
        onClose={() => setDialog(null)}
        kind={order.item.kind}
        onSubmit={async (reason, detail) => {
          let result: ReportResult | null = null;
          await run(async () => {
            result = await reportProblem(order.id, reason, detail);
          });
          return result;
        }}
      />
    </div>
  );
};
