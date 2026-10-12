import React, { useState } from 'react';
import { Ban, EyeOff, Landmark, LogOut, MoreVertical, Store, User } from 'lucide-react';
import { Menu, MenuItem, useToast } from '@/shared/ui';
import { ROUTES } from '@/shared/config/routes';
import type { DisputeDetail } from '@/features/disputes';
import { adminApi } from '../api';
import { ReasonDialog } from './ReasonDialog';

type Action = null | { kind: 'signout' | 'block'; who: 'seller' | 'buyer' } | { kind: 'hide' };

/**
 * The shortcuts of the administration in a dispute room: the money, the two accounts, and the measures that can be taken
 * on them (sign out, block) or on the offer (hide), without leaving the conversation.
 */
export const DisputeActions: React.FC<{ detail: DisputeDetail }> = ({ detail: { order } }) => {
  const toast = useToast();
  const [action, setAction] = useState<Action>(null);
  const who = (w: 'seller' | 'buyer') => ({ id: w === 'seller' ? order.sellerId : order.buyerId, name: w === 'seller' ? order.sellerName : order.buyerName, label: w === 'seller' ? 'le vendeur' : 'l’acheteur' });

  const items: (MenuItem | 'divider')[] = [
    { label: 'Fonds : payer ou rembourser', icon: <Landmark className="w-4 h-4" />, to: ROUTES.admin.fund(order.id) },
    { label: 'Compte du vendeur', icon: <Store className="w-4 h-4" />, to: ROUTES.admin.seller(order.sellerId) },
    { label: 'Compte de l’acheteur', icon: <User className="w-4 h-4" />, to: ROUTES.admin.user(order.buyerId) },
    'divider',
    { label: 'Déconnecter le vendeur', icon: <LogOut className="w-4 h-4" />, onSelect: () => setAction({ kind: 'signout', who: 'seller' }) },
    { label: 'Déconnecter l’acheteur', icon: <LogOut className="w-4 h-4" />, onSelect: () => setAction({ kind: 'signout', who: 'buyer' }) },
    { label: 'Bloquer le vendeur', icon: <Ban className="w-4 h-4" />, danger: true, onSelect: () => setAction({ kind: 'block', who: 'seller' }) },
    { label: 'Bloquer l’acheteur', icon: <Ban className="w-4 h-4" />, danger: true, onSelect: () => setAction({ kind: 'block', who: 'buyer' }) },
    'divider',
    { label: 'Masquer l’offre', icon: <EyeOff className="w-4 h-4" />, danger: true, onSelect: () => setAction({ kind: 'hide' }) },
  ];
  const target = action && action.kind !== 'hide' ? who(action.who) : null;

  return (
    <>
      <Menu
        items={items}
        trigger={({ toggle }) => (
          <button type="button" onClick={toggle} aria-label="Actions de l’administration" className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100">
            <MoreVertical className="w-4 h-4" />
          </button>
        )}
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
        description="La personne ne peut plus rien faire avec son compte, ni acheter ni vendre. Les fonds de cette commande restent bloqués jusqu’à votre décision."
        danger
        confirmLabel="Bloquer"
        onConfirm={async (reason) => {
          await adminApi.block(target!.id, reason);
          toast.success('Compte bloqué.');
        }}
      />
      <ReasonDialog
        open={action?.kind === 'hide'}
        onClose={() => setAction(null)}
        title="Masquer l’offre"
        description={`${order.title} — elle disparaît du catalogue et le vendeur ne peut pas la republier tant que vous ne l’avez pas rétablie.`}
        label="Raison (visible par le vendeur)"
        danger
        confirmLabel="Masquer"
        onConfirm={async (reason) => {
          await adminApi.hideListing(order.listingId, reason);
          toast.success('Offre masquée.');
        }}
      />
    </>
  );
};
