import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Receipt } from 'lucide-react';
import { Button, Page, Tabs } from '@/shared/ui';
import { useUrlParam } from '@/shared/hooks';
import { formatRelative } from '@/shared/lib';
import { ROUTES } from '@/shared/config/routes';
import { ListingThumb } from '@/features/catalog';
import { OrderReviewCard } from '@/features/reviews';
import { displayName } from '@/features/session';
import { OrderView, useSellerTagList } from '../hooks';
import { SellerOrderTools } from './SellerOrderTools';
import { Perspective } from '../model';
import { OrderStatusBadge } from './OrderStatusBadge';
import { OrderProgress } from './OrderProgress';
import { PaymentLine } from './PaymentLine';
import { DeadlineCard } from './DeadlineCard';
import { BriefCard } from './BriefCard';
import { DeliveryCard } from './DeliveryCard';
import { ChatPreviewCard } from './chat/ChatPreviewCard';
import { OrderTimeline } from './OrderTimeline';
import { OrderReceipt } from './OrderReceipt';

/**
 * Details of a service order: what it is, what it cost, the clock, brief and delivery, and its steps. It only shows: every action
 * (accept, refuse, deliver, ask for time, validate, revise, report) is taken in the order's discussion, which opens from here.
 */
export const ServiceDesk: React.FC<{ view: OrderView; perspective: Perspective; userId: string }> = ({ view, perspective, userId }) => {
  const { order, seller, users } = view;
  const isSeller = perspective === 'seller';
  const [receiptOpen, setReceiptOpen] = useState(false);
  const knownTags = useSellerTagList(order.sellerId);

  const [tab, setTab] = useUrlParam<'suivi' | 'brief' | 'historique'>('vue', ['suivi', 'brief', 'historique'], 'suivi');

  return (
    <Page
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
      width="narrow"
      toolbar={
        <Tabs
          bare
          value={tab}
          onChange={setTab}
          items={[
            { value: 'suivi', label: 'Suivi' },
            { value: 'brief', label: 'Brief et livraison' },
            { value: 'historique', label: 'Historique' },
          ]}
        />
      }
    >
      {tab === 'suivi' && (
        <div className="space-y-4">
          {/* Everything that is done on an order (accept, deliver, validate, revise…) is done in its discussion. */}
          <ChatPreviewCard order={order} perspective={perspective} userId={userId} users={users} />
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
          <DeadlineCard order={order} perspective={perspective} />
          <OrderReviewCard order={order} isBuyer={!isSeller} userId={userId} />
        </div>
      )}
      {tab === 'brief' && (
        <div className="space-y-4">
          <BriefCard order={order} perspective={perspective} />
          <DeliveryCard order={order} perspective={perspective} />
        </div>
      )}
      {tab === 'historique' && (
        <div className="space-y-4">
          <OrderTimeline order={order} users={users} />
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
        </div>
      )}
      <OrderReceipt order={order} seller={seller} open={receiptOpen} onClose={() => setReceiptOpen(false)} />
    </Page>
  );
};
