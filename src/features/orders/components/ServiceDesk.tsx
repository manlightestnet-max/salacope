import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Receipt } from 'lucide-react';
import { Button, Card, Dialog, Page } from '@/shared/ui';
import { formatRelative, formatXaf } from '@/shared/lib';
import { ROUTES } from '@/shared/config/routes';
import { ListingThumb } from '@/features/catalog';
import { OrderReviewCard } from '@/features/reviews';
import { displayName } from '@/features/session';
import { OrderView, useSellerTagList } from '../hooks';
import { SellerOrderTools } from './SellerOrderTools';
import { Perspective, needsAction } from '../model';
import { OrderStatusBadge } from './OrderStatusBadge';
import { OrderProgress } from './OrderProgress';
import { PaymentLine } from './PaymentLine';
import { NextStepCard } from './NextStepCard';
import { DeadlineCard } from './DeadlineCard';
import { BriefCard } from './BriefCard';
import { DeliveryCard } from './DeliveryCard';
import { ChatHeader } from './ChatHeader';
import { OrderActivity } from './OrderActivity';
import { OrderReceipt } from './OrderReceipt';

/**
 * Desk of a service order. On desktop the page never scrolls: the conversation takes
 * the full height on the right (its feed scrolls inside), the order on the left
 * (what it is, what it cost, the action of the moment, the clock, brief, delivery).
 * On mobile the conversation is the whole screen; the order opens in a dialog.
 */
export const ServiceDesk: React.FC<{ view: OrderView; perspective: Perspective; userId: string }> = ({ view, perspective, userId }) => {
  const { order, seller, users } = view;
  const isSeller = perspective === 'seller';
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const todo = needsAction(order, perspective);
  const knownTags = useSellerTagList(order.sellerId);

  const details = (
    <>
      <section className="rounded-3xl border border-gray-200/70 bg-surface p-5">
        <div className="flex items-start gap-4">
          <ListingThumb src={order.item.coverImage} category={order.item.category} size="md" />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-gray-500 truncate">
              {isSeller ? `Pour ${order.buyer.name}` : `Par ${displayName(seller)}`} · commandé {formatRelative(order.createdAt)}
            </p>
            <h2 className="mt-1 text-base font-semibold tracking-tight leading-snug text-gray-900 line-clamp-2">{order.item.title}</h2>
          </div>
        </div>
        <PaymentLine order={order} perspective={perspective} className="mt-4 pt-4 border-t border-gray-100" />
        <OrderProgress order={order} className="md:hidden mt-4 flex-wrap" />
      </section>

      <NextStepCard order={order} perspective={perspective} userId={userId} stacked />
      <DeadlineCard order={order} perspective={perspective} />
      <OrderReviewCard order={order} isBuyer={!isSeller} userId={userId} />
      <BriefCard order={order} perspective={perspective} />
      <DeliveryCard order={order} perspective={perspective} />

      <div className="px-1 space-y-1.5 text-sm">
        {!isSeller && (
          <Link to={ROUTES.account.offer(order.listingId)} className="block text-gray-500 hover:text-gray-900">
            Voir l'offre →
          </Link>
        )}
        <Link to={`${ROUTES.account.newTicket}?ref=${order.number}&sujet=order`} className="block text-gray-500 hover:text-gray-900">
          Un problème ? Contacter le support →
        </Link>
      </div>
    </>
  );

  return (
    <Page
      fill
      back={isSeller ? { to: ROUTES.seller.sales, label: 'Ventes' } : { to: ROUTES.account.orders, label: 'Mes achats' }}
      title={order.number}
      meta={
        <span className="ml-2">
          <OrderStatusBadge order={order} perspective={perspective} />
        </span>
      }
      actions={
        <>
          <OrderProgress order={order} className="hidden md:flex mr-3" />
          {isSeller && <SellerOrderTools order={order} knownTags={knownTags} />}
          <Button size="sm" variant="ghost" icon={<Receipt className="w-3.5 h-3.5" />} onClick={() => setReceiptOpen(true)}>
            Reçu
          </Button>
        </>
      }
    >
      <div className="h-full flex flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-5">
        <div className="hidden lg:block min-w-0 space-y-4 h-full overflow-y-auto scrollbar-none pb-4">{details}</div>

        <button
          type="button"
          onClick={() => setDetailsOpen(true)}
          className="lg:hidden shrink-0 flex items-center gap-3 rounded-2xl border border-gray-200/70 bg-surface p-2.5 pr-3 text-left"
        >
          <ListingThumb src={order.item.coverImage} category={order.item.category} />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-gray-900 truncate">{order.item.title}</span>
            <span className="block text-xs text-gray-500 tabular-nums truncate">
              {formatXaf(isSeller ? order.amounts.net : order.amounts.total)} · {todo ? 'Action attendue de votre part' : 'Voir la commande'}
            </span>
          </span>
          {todo && <span className="w-2 h-2 rounded-full bg-accent shrink-0" aria-hidden />}
          <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
        </button>

        <Card className="min-w-0 flex-1 min-h-0 lg:h-full flex flex-col overflow-hidden">
          <ChatHeader order={order} perspective={perspective} seller={seller} />
          <div className="flex-1 min-h-0">
            <OrderActivity order={order} userId={userId} users={users} bare fill />
          </div>
        </Card>
      </div>

      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} title="Commande" description={order.number} size="lg">
        <div className="space-y-4">{details}</div>
      </Dialog>
      <OrderReceipt order={order} seller={seller} open={receiptOpen} onClose={() => setReceiptOpen(false)} />
    </Page>
  );
};
