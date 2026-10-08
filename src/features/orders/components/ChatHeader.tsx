import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Ban, MoreVertical, ReceiptText, Timer } from 'lucide-react';
import { Order, User, useDb } from '@/shared/db';
import { Avatar, ConfirmDialog, Menu, MenuItem } from '@/shared/ui';
import { useServiceAction } from '@/shared/hooks';
import { plural } from '@/shared/lib';
import { ROUTES } from '@/shared/config/routes';
import { displayName, useCurrentUser } from '@/features/session';
import { Perspective, orderHref } from '../model';
import { blockSeller, setEphemeral } from '../api';
import { CounterpartSheet } from './chat/CounterpartSheet';

/**
 * Who is on the other side of the conversation (tap: your orders, payments and receipts with
 * them). The seller sees the client and their history with the store, never their contact
 * details; the buyer sees the store and controls the chat (ephemeral messages, block).
 * `withOrder`: the room is shown on its own (Messages), so it links back to the order.
 */
export const ChatHeader: React.FC<{ order: Order; perspective: Perspective; seller: User | undefined; withOrder?: boolean; backTo?: string }> = ({
  order,
  perspective,
  seller,
  withOrder,
  backTo,
}) => {
  const me = useCurrentUser();
  const run = useServiceAction();
  const [sheet, setSheet] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const history = useDb(
    (s) => s.orders.filter((o) => o.sellerId === order.sellerId && o.buyerId === order.buyerId).length,
    [order.sellerId, order.buyerId]
  );
  const isBuyer = perspective === 'buyer';
  const blocked = Boolean(me.blocks?.includes(order.sellerId));
  const name = isBuyer ? displayName(seller) : order.buyer.name;
  const subtitle = withOrder
    ? `${order.number} · ${order.item.title}`
    : isBuyer
      ? seller?.merchant?.headline ?? 'Vendeur'
      : `${history > 1 ? `${plural(history, 'commande')} chez vous` : 'Première commande chez vous'}${order.invoice ? ` · ${order.invoice.companyName}` : ''}`;

  const items: (MenuItem | 'divider')[] = [
    ...(withOrder ? [{ label: 'Voir la commande', icon: <ReceiptText className="w-4 h-4" />, to: orderHref(order, perspective) }] : []),
    ...(isBuyer
      ? [
          {
            label: order.chat?.ephemeral ? 'Désactiver les messages éphémères' : 'Activer les messages éphémères',
            icon: <Timer className="w-4 h-4" />,
            onSelect: () => run(() => setEphemeral(order.id, !order.chat?.ephemeral), order.chat?.ephemeral ? 'Messages conservés' : 'Messages éphémères activés'),
          },
          {
            label: blocked ? 'Débloquer ce vendeur' : 'Bloquer ce vendeur',
            icon: <Ban className="w-4 h-4" />,
            danger: !blocked,
            onSelect: () => (blocked ? run(() => blockSeller(order.sellerId, false), 'Vendeur débloqué') : setConfirmBlock(true)),
          },
        ]
      : []),
  ];

  return (
    <div className="shrink-0 h-14 px-2 lg:px-5 flex items-center gap-2 lg:gap-3 border-b border-gray-100">
      {backTo && (
        <Link to={backTo} aria-label="Retour aux messages" className="lg:hidden w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-gray-700 active:bg-gray-100">
          <ArrowLeft className="w-5 h-5" />
        </Link>
      )}
      <button type="button" onClick={() => setSheet(true)} className="shrink-0 rounded-full" aria-label={`Vos commandes avec ${name}`}>
        <Avatar name={name} src={isBuyer ? seller?.merchant?.logo : undefined} />
      </button>
      <div className="min-w-0 flex-1">
        {isBuyer && !withOrder ? (
          <Link to={ROUTES.account.store(order.sellerId)} className="block text-sm font-medium text-gray-900 truncate hover:underline underline-offset-2">
            {name}
          </Link>
        ) : (
          <button type="button" onClick={() => setSheet(true)} className="block max-w-full text-left text-sm font-medium text-gray-900 truncate hover:underline underline-offset-2">
            {name}
          </button>
        )}
        <p className="text-xs text-gray-500 truncate">{subtitle}</p>
      </div>
      {items.length > 0 && (
        <Menu
          items={items}
          trigger={({ toggle }) => (
            <button type="button" onClick={toggle} aria-label="Options de la discussion" className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100">
              <MoreVertical className="w-4 h-4" />
            </button>
          )}
        />
      )}

      <CounterpartSheet order={order} perspective={perspective} open={sheet} onClose={() => setSheet(false)} />
      <ConfirmDialog
        open={confirmBlock}
        onClose={() => setConfirmBlock(false)}
        title={`Bloquer ${name} ?`}
        description="Ce vendeur ne pourra plus vous écrire, sur aucune de vos commandes chez lui. Vos commandes et votre argent ne changent pas ; vous pourrez le débloquer à tout moment."
        confirmLabel="Bloquer"
        danger
        onConfirm={() => run(() => blockSeller(order.sellerId, true), 'Vendeur bloqué')}
      />
    </div>
  );
};
