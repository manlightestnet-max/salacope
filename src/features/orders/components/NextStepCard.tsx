import React, { useState } from 'react';
import clsx from 'clsx';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Clock, LucideIcon, Zap } from 'lucide-react';
import { Order } from '@/shared/db';
import { Button, Card, ConfirmDialog } from '@/shared/ui';
import { useServiceAction } from '@/shared/hooks';
import { formatDate, formatRelative, formatXaf } from '@/shared/lib';
import { PLATFORM } from '@/shared/config/platform';
import { ROUTES } from '@/shared/config/routes';
import { Perspective, hasPendingExtension, isLate, isRevising, permissionsFor, revisionsLeft } from '../model';
import {
  acceptOrder,
  answerExtension,
  cancelOrder,
  confirmOrder,
  deliverOrder,
  reportProblem,
  ReportResult,
  requestExtension,
  requestRevision,
} from '../api';
import { DeliverDialog, ExtensionDialog, ReasonDialog, ReportDialog, RevisionDialog } from './OrderDialogs';

type Dialog = 'deliver' | 'cancel' | 'dispute' | 'confirm' | 'revise' | 'extend' | null;
type Tone = 'action' | 'waiting' | 'done' | 'alert';

const TONE: Record<Tone, { icon: LucideIcon; className: string }> = {
  action: { icon: Zap, className: 'bg-primary-50 text-primary-700' },
  waiting: { icon: Clock, className: 'bg-gray-100 text-gray-500' },
  done: { icon: CheckCircle2, className: 'bg-emerald-50 text-emerald-700' },
  alert: { icon: AlertTriangle, className: 'bg-red-50 text-red-600' },
};

const lastNote = (order: Order, type: 'cancelled' | 'disputed' | 'revision_requested') =>
  [...order.events].reverse().find((e) => e.type === type)?.note;

const plusDays = (iso: string | undefined, days: number) =>
  iso ? new Date(new Date(iso).getTime() + days * 86_400_000).toISOString() : undefined;

/** What happens now and who has to act, with the matching actions. */
export const NextStepCard: React.FC<{ order: Order; perspective: Perspective; userId: string; stacked?: boolean }> = ({
  order,
  perspective,
  userId,
  stacked,
}) => {
  const [dialog, setDialog] = useState<Dialog>(null);
  const run = useServiceAction();
  const can = permissionsFor(order, perspective);
  const seller = perspective === 'seller';
  const money = formatXaf(seller ? order.amounts.net : order.amounts.total);
  const left = revisionsLeft(order);

  let title = '';
  let body: React.ReactNode = null;
  let tone: Tone = 'waiting';

  switch (order.status) {
    case 'paid':
      tone = seller ? 'action' : 'waiting';
      title = seller ? 'Nouvelle commande à accepter' : "En attente d'acceptation";
      body = seller
        ? `Acceptez pour démarrer : vous aurez ${order.item.deliveryDays ?? 3} jours pour livrer.`
        : "Le vendeur doit accepter votre commande. Vous pouvez l'annuler d'ici là, vous serez remboursé.";
      break;
    case 'in_progress':
      if (hasPendingExtension(order)) {
        const ext = order.extension!;
        tone = seller ? 'waiting' : 'action';
        title = seller
          ? `Délai de ${ext.days} jour${ext.days > 1 ? 's' : ''} demandé au client`
          : `Le vendeur demande ${ext.days} jour${ext.days > 1 ? 's' : ''} de plus`;
        body = seller
          ? `En attente de sa réponse. D'ici là, la livraison reste attendue ${formatRelative(order.dueAt)}.`
          : `« ${ext.reason} » — Si vous acceptez, livraison au plus tard le ${formatDate(plusDays(order.dueAt, ext.days))}.`;
      } else if (isRevising(order)) {
        tone = seller ? (isLate(order) ? 'alert' : 'action') : 'waiting';
        title = seller ? (isLate(order) ? 'Retouche en retard' : `Retouche à livrer ${formatRelative(order.dueAt)}`) : 'Retouche en cours';
        body = seller
          ? `« ${lastNote(order, 'revision_requested') ?? ''} »`
          : `Le vendeur vous renvoie le travail d'ici le ${formatDate(order.dueAt)}.`;
      } else {
        tone = seller ? (isLate(order) ? 'alert' : 'action') : 'waiting';
        title = seller
          ? isLate(order)
            ? `Livraison en retard (prévue ${formatRelative(order.dueAt)})`
            : `Livraison attendue ${formatRelative(order.dueAt)}`
          : 'Le vendeur travaille sur votre commande';
        body = seller
          ? `Livrez depuis cette page. Le client aura ensuite ${PLATFORM.serviceValidationDays} jours pour valider.`
          : `Livraison prévue le ${formatDate(order.dueAt)}.`;
      }
      break;
    case 'delivered':
      tone = seller ? 'waiting' : 'action';
      title = seller ? 'En attente de validation du client' : 'Votre commande est livrée';
      body = seller
        ? `${money} vous seront versés à la validation, au plus tard le ${formatDate(order.releaseAt)}.`
        : `Vérifiez la livraison puis confirmez${order.item.kind === 'service' && left > 0 ? `, ou demandez une retouche (${left} restante${left > 1 ? 's' : ''})` : ''}. Sans réponse, le vendeur sera payé le ${formatDate(order.releaseAt)}.`;
      break;
    case 'completed':
      tone = 'done';
      title = seller ? 'Paiement libéré' : 'Commande terminée';
      body = seller ? (
        <>
          {money} ont été ajoutés à votre solde.{' '}
          <Link to={ROUTES.seller.payouts} className="underline underline-offset-2">
            Voir les paiements
          </Link>
        </>
      ) : (
        'Merci pour votre achat.'
      );
      break;
    case 'disputed':
      tone = 'alert';
      title = seller ? 'Le client a signalé un problème' : 'Litige en cours';
      body = `« ${lastNote(order, 'disputed') ?? ''} » — Les fonds sont bloqués. L'équipe Salacope contacte les deux parties sous 48 h.`;
      break;
    case 'cancelled':
      tone = 'done';
      title = 'Commande annulée';
      body = `${lastNote(order, 'cancelled') ? `« ${lastNote(order, 'cancelled')} » — ` : ''}${formatXaf(order.amounts.total)} remboursés au client par LightPay.`;
      break;
  }

  const hasActions = can.accept || can.deliver || can.cancel || can.confirm || can.dispute || can.revise || can.extend || can.answerExtension;
  const Icon = TONE[tone].icon;

  return (
    <Card className="px-5 py-4">
      <div className={clsx('flex flex-col justify-between gap-4', !stacked && 'sm:flex-row sm:items-center')}>
        <div className="flex gap-3 min-w-0">
          <span className={clsx('w-9 h-9 shrink-0 rounded-full flex items-center justify-center', TONE[tone].className)}>
            <Icon className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">{title}</p>
            {body && <p className="text-sm text-gray-600 mt-0.5">{body}</p>}
          </div>
        </div>
        {hasActions && (
          <div className="flex flex-wrap gap-2 shrink-0">
            {can.cancel && (
              <Button variant="ghost" onClick={() => setDialog('cancel')}>
                {seller && order.status === 'paid' ? 'Refuser' : 'Annuler'}
              </Button>
            )}
            {can.extend && (
              <Button variant="ghost" onClick={() => setDialog('extend')}>
                Demander un délai
              </Button>
            )}
            {can.dispute && (
              <Button variant="danger" onClick={() => setDialog('dispute')}>
                Signaler un problème
              </Button>
            )}
            {can.revise && <Button onClick={() => setDialog('revise')}>Demander une retouche</Button>}
            {can.answerExtension && (
              <>
                <Button onClick={() => run(() => answerExtension(order.id, false), 'Délai refusé')}>Refuser</Button>
                <Button variant="primary" onClick={() => run(() => answerExtension(order.id, true), 'Délai accepté')}>
                  Accepter
                </Button>
              </>
            )}
            {can.accept && (
              <Button variant="primary" onClick={() => run(() => acceptOrder(order.id), 'Commande acceptée')}>
                Accepter la commande
              </Button>
            )}
            {can.deliver && (
              <Button variant={order.status === 'in_progress' ? 'primary' : 'ghost'} onClick={() => setDialog('deliver')}>
                Livrer
              </Button>
            )}
            {can.confirm && (
              <Button variant="primary" onClick={() => setDialog('confirm')}>
                Confirmer la réception
              </Button>
            )}
          </div>
        )}
      </div>

      <DeliverDialog
        open={dialog === 'deliver'}
        onClose={() => setDialog(null)}
        onSubmit={(note, files) => run(() => deliverOrder(order.id, note, files), 'Livraison envoyée au client')}
      />
      <RevisionDialog
        open={dialog === 'revise'}
        onClose={() => setDialog(null)}
        left={left}
        onSubmit={(note) => run(() => requestRevision(order.id, note), 'Retouche demandée')}
      />
      <ExtensionDialog
        open={dialog === 'extend'}
        onClose={() => setDialog(null)}
        onSubmit={(days, reason) => run(() => requestExtension(order.id, days, reason), 'Demande envoyée au client')}
      />
      <ReasonDialog
        open={dialog === 'cancel'}
        onClose={() => setDialog(null)}
        title={seller && order.status === 'paid' ? 'Refuser la commande' : 'Annuler la commande'}
        description={`Le client sera remboursé de ${formatXaf(order.amounts.total)}. Cette action est définitive.`}
        label="Raison (visible par l'autre partie)"
        confirmLabel="Annuler et rembourser"
        onSubmit={(reason) => run(() => cancelOrder(order.id, reason), 'Commande annulée')}
      />
      <ReportDialog
        open={dialog === 'dispute'}
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
      <ConfirmDialog
        open={dialog === 'confirm'}
        onClose={() => setDialog(null)}
        title="Confirmer la réception ?"
        description={`Le vendeur recevra ${formatXaf(order.amounts.total)}. Vous ne pourrez plus ouvrir de litige sur cette commande.`}
        confirmLabel="Confirmer"
        onConfirm={() => run(() => confirmOrder(order.id), 'Réception confirmée')}
      />
    </Card>
  );
};
