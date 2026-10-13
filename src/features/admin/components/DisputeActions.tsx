import React, { useState } from 'react';
import { Ban, CheckCircle2, EyeOff, Landmark, LogOut, MoreVertical, Store, TriangleAlert, Undo2, User, Wallet } from 'lucide-react';
import { formatXaf } from '@/shared/lib';
import { Button, Menu, MenuItem, useToast } from '@/shared/ui';
import { ROUTES } from '@/shared/config/routes';
import { DisputeDetail, disputesApi } from '@/features/disputes';
import { adminApi } from '../api';
import { ReasonDialog } from './ReasonDialog';

type Action =
  | null
  | { kind: 'signout' | 'block'; who: 'seller' | 'buyer' | 'subject' }
  | { kind: 'hide' | 'suspend' | 'warn' | 'close' | 'release' | 'refund' };

/**
 * The shortcuts of the administration in a dispute room, without leaving the conversation.
 * Order dispute: the decision on the money (pay the seller or refund the buyer: until then it stays frozen), the two
 * accounts, sign out, block, hide the offer.
 * Conduct dispute (about one account): a warning, closing it, the account, sign out, block, suspend the store, hide the offer.
 */
export const DisputeActions: React.FC<{ detail: DisputeDetail; onChange: (detail: DisputeDetail) => void }> = ({ detail, onChange }) => {
  const toast = useToast();
  const { order, subject, dispute } = detail;
  const [action, setAction] = useState<Action>(null);
  const open = dispute.status === 'open';
  // The money of the order is still frozen: only the administration can end it, one way or the other.
  const decide = Boolean(order?.held && open);
  const settle = async (decision: 'release' | 'refund', reason: string) => {
    await (decision === 'release' ? adminApi.releaseFunds(order!.id, reason) : adminApi.refundFunds(order!.id, reason));
    onChange(await disputesApi.adminDetail(dispute.id));
    toast.success(decision === 'release' ? 'Fonds versés au vendeur.' : 'Acheteur remboursé.');
  };

  const person = (who: 'seller' | 'buyer' | 'subject') =>
    who === 'seller' ? { id: order!.sellerId, name: order!.sellerName } : who === 'buyer' ? { id: order!.buyerId, name: order!.buyerName } : { id: subject!.id, name: subject!.name };
  const listing = order ? { id: order.listingId, title: order.title } : subject?.listing ?? null;

  const items: (MenuItem | 'divider')[] = order
    ? [
        ...(decide
          ? [
              { label: 'Verser au vendeur', icon: <Wallet className="w-4 h-4" />, onSelect: () => setAction({ kind: 'release' }) } as MenuItem,
              { label: 'Rembourser l’acheteur', icon: <Undo2 className="w-4 h-4" />, onSelect: () => setAction({ kind: 'refund' }) } as MenuItem,
            ]
          : []),
        { label: 'Dossier des fonds', icon: <Landmark className="w-4 h-4" />, to: ROUTES.admin.fund(order.id) },
        { label: 'Compte du vendeur', icon: <Store className="w-4 h-4" />, to: ROUTES.admin.seller(order.sellerId) },
        { label: 'Compte de l’acheteur', icon: <User className="w-4 h-4" />, to: ROUTES.admin.user(order.buyerId) },
        'divider',
        { label: 'Déconnecter le vendeur', icon: <LogOut className="w-4 h-4" />, onSelect: () => setAction({ kind: 'signout', who: 'seller' }) },
        { label: 'Déconnecter l’acheteur', icon: <LogOut className="w-4 h-4" />, onSelect: () => setAction({ kind: 'signout', who: 'buyer' }) },
        { label: 'Bloquer le vendeur', icon: <Ban className="w-4 h-4" />, danger: true, onSelect: () => setAction({ kind: 'block', who: 'seller' }) },
        { label: 'Bloquer l’acheteur', icon: <Ban className="w-4 h-4" />, danger: true, onSelect: () => setAction({ kind: 'block', who: 'buyer' }) },
        'divider',
        { label: 'Masquer l’offre', icon: <EyeOff className="w-4 h-4" />, danger: true, onSelect: () => setAction({ kind: 'hide' }) },
      ]
    : [
        ...(open
          ? [
              { label: 'Envoyer un avertissement', icon: <TriangleAlert className="w-4 h-4" />, onSelect: () => setAction({ kind: 'warn' }) } as MenuItem,
              { label: 'Clore le litige', icon: <CheckCircle2 className="w-4 h-4" />, onSelect: () => setAction({ kind: 'close' }) } as MenuItem,
              'divider' as const,
            ]
          : []),
        { label: 'Voir le compte', icon: <User className="w-4 h-4" />, to: subject!.isSeller ? ROUTES.admin.seller(subject!.id) : ROUTES.admin.user(subject!.id) },
        { label: 'Déconnecter', icon: <LogOut className="w-4 h-4" />, onSelect: () => setAction({ kind: 'signout', who: 'subject' }) },
        ...(listing ? [{ label: 'Masquer l’offre', icon: <EyeOff className="w-4 h-4" />, danger: true, onSelect: () => setAction({ kind: 'hide' }) } as MenuItem] : []),
        ...(subject!.isSeller ? [{ label: 'Suspendre la boutique', icon: <Store className="w-4 h-4" />, danger: true, onSelect: () => setAction({ kind: 'suspend' }) } as MenuItem] : []),
        { label: 'Bloquer le compte', icon: <Ban className="w-4 h-4" />, danger: true, onSelect: () => setAction({ kind: 'block', who: 'subject' }) },
      ];

  const target = action && (action.kind === 'signout' || action.kind === 'block') ? person(action.who) : null;

  return (
    <>
      {decide && (
        <span className="hidden sm:flex items-center gap-1.5">
          <Button size="sm" variant="secondary" onClick={() => setAction({ kind: 'refund' })}>
            Rembourser
          </Button>
          <Button size="sm" variant="primary" onClick={() => setAction({ kind: 'release' })}>
            Verser au vendeur
          </Button>
        </span>
      )}
      <Menu
        items={items}
        trigger={({ toggle }) => (
          <button type="button" onClick={toggle} aria-label="Actions de l’administration" className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100">
            <MoreVertical className="w-4 h-4" />
          </button>
        )}
      />
      <ReasonDialog
        open={action?.kind === 'release'}
        onClose={() => setAction(null)}
        title="Verser au vendeur"
        description={order ? `${formatXaf(order.total)} payés par ${order.buyerName} : le vendeur reçoit sa part sur LightPay, le litige est clos et les deux parties sont prévenues.` : undefined}
        label="Motif de la décision (visible par les deux parties)"
        confirmLabel="Verser au vendeur"
        onConfirm={(reason) => settle('release', reason)}
      />
      <ReasonDialog
        open={action?.kind === 'refund'}
        onClose={() => setAction(null)}
        title="Rembourser l’acheteur"
        description={order ? `${formatXaf(order.total)} rendus à ${order.buyerName} par LightPay, la commande est annulée et le litige clos.` : undefined}
        label="Motif de la décision (visible par les deux parties)"
        danger
        confirmLabel="Rembourser"
        onConfirm={(reason) => settle('refund', reason)}
      />
      <ReasonDialog
        open={action?.kind === 'warn'}
        onClose={() => setAction(null)}
        title={`Avertir ${subject?.name ?? ''}`}
        description="L’avertissement est inscrit sur le compte, écrit dans la salle et notifié à la personne. Plusieurs avertissements justifient une suspension."
        label="Motif (visible par la personne)"
        confirmLabel="Envoyer l’avertissement"
        onConfirm={async (reason) => {
          onChange(await disputesApi.warn(dispute.id, reason));
          toast.success('Avertissement envoyé.');
        }}
      />
      <ReasonDialog
        open={action?.kind === 'close'}
        onClose={() => setAction(null)}
        title="Clore le litige"
        description={subject?.warningsHere ? 'Un avertissement a été donné dans ce litige : il est clos « avertissement ».' : 'Aucun avertissement n’a été donné : il est clos « sans suite ».'}
        label="Note"
        optional
        confirmLabel="Clore"
        onConfirm={async (note) => {
          onChange(await disputesApi.close(dispute.id, note));
          toast.success('Litige clos.');
        }}
      />
      <ReasonDialog
        open={action?.kind === 'signout'}
        onClose={() => setAction(null)}
        title={`Déconnecter ${target?.name ?? ''}`}
        description="Toutes ses sessions sont fermées tout de suite ; la personne peut se reconnecter, sauf si le compte est bloqué."
        label="Raison"
        optional
        confirmLabel="Déconnecter"
        onConfirm={async (reason) => {
          await adminApi.signOutUser(target!.id, reason);
          toast.success('Sessions fermées.');
        }}
      />
      <ReasonDialog
        open={action?.kind === 'block'}
        onClose={() => setAction(null)}
        title={`Bloquer ${target?.name ?? ''}`}
        description={order ? 'La personne ne peut plus rien faire avec son compte. Les fonds de cette commande restent bloqués jusqu’à votre décision.' : 'La personne ne peut plus rien faire avec son compte, ni acheter ni vendre.'}
        danger
        confirmLabel="Bloquer"
        onConfirm={async (reason) => {
          await adminApi.block(target!.id, reason);
          toast.success('Compte bloqué.');
        }}
      />
      <ReasonDialog
        open={action?.kind === 'suspend'}
        onClose={() => setAction(null)}
        title="Suspendre la boutique"
        description="Ses offres disparaissent du catalogue et plus aucune vente n’est possible ; le vendeur voit la raison."
        danger
        confirmLabel="Suspendre"
        onConfirm={async (reason) => {
          await adminApi.suspend(subject!.id, reason);
          toast.success('Boutique suspendue.');
        }}
      />
      <ReasonDialog
        open={action?.kind === 'hide'}
        onClose={() => setAction(null)}
        title="Masquer l’offre"
        description={`${listing?.title ?? ''} — elle disparaît du catalogue et le vendeur ne peut pas la republier tant que vous ne l’avez pas rétablie.`}
        label="Raison (visible par le vendeur)"
        danger
        confirmLabel="Masquer"
        onConfirm={async (reason) => {
          await adminApi.hideListing(listing!.id, reason);
          toast.success('Offre masquée.');
        }}
      />
    </>
  );
};
