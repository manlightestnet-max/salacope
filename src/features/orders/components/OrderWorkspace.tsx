import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Receipt } from 'lucide-react';
import { Button, Card, CardBody, CardHeader, DescriptionList, Page, Tabs } from '@/shared/ui';
import { useUrlParam } from '@/shared/hooks';
import { formatDateTime, formatXaf } from '@/shared/lib';
import { ROUTES } from '@/shared/config/routes';
import { ListingThumb, SellerCard } from '@/features/catalog';
import { OrderReviewCard } from '@/features/reviews';
import { RefundPreview, RefundReceipt } from '@/features/checkout';
import { OrderView, useSellerTagList } from '../hooks';
import { SellerOrderTools } from './SellerOrderTools';
import { Perspective, fundsState, paymentMethodLabel } from '../model';
import { OrderStatusBadge } from './OrderStatusBadge';
import { NextStepCard } from './NextStepCard';
import { DeliveryCard } from './DeliveryCard';
import { BriefCard } from './BriefCard';
import { DigitalPurchaseView } from './DigitalPurchaseView';
import { ServiceDesk } from './ServiceDesk';
import { ChatPreviewCard } from './chat/ChatPreviewCard';
import { OrderTimeline } from './OrderTimeline';
import { OrderReceipt } from './OrderReceipt';

const FUNDS_LABEL = {
  escrow: 'Retenus par Salacope',
  released: 'Versés au vendeur',
  refunded: 'Remboursés au client',
  frozen: 'Bloqués (litige)',
};

/** Order screen shared by buyer and seller; content adapts to the perspective. */
export const OrderWorkspace: React.FC<{ view: OrderView; perspective: Perspective; userId: string }> = ({
  view,
  perspective,
  userId,
}) => {
  const { order, seller, users } = view;
  const [receiptOpen, setReceiptOpen] = useState(false);
  const isSeller = perspective === 'seller';
  const knownTags = useSellerTagList(order.sellerId);
  const [tab, setTab] = useUrlParam<'suivi' | 'activite' | 'paiement'>('vue', ['suivi', 'activite', 'paiement'], 'suivi');

  // A bought file: show the product, not the order machinery.
  if (!isSeller && order.item.kind === 'digital') return <DigitalPurchaseView view={view} userId={userId} />;
  if (order.item.kind === 'service') return <ServiceDesk view={view} perspective={perspective} userId={userId} />;

  return (
    <Page
      back={isSeller ? { to: ROUTES.seller.sales, label: 'Ventes' } : { to: ROUTES.account.orders, label: 'Mes achats' }}
      title={order.number}
      meta={<span className="ml-2"><OrderStatusBadge order={order} perspective={perspective} /></span>}
      actions={
        <>
          {isSeller && <SellerOrderTools order={order} knownTags={knownTags} />}
          <Button size="sm" icon={<Receipt className="w-3.5 h-3.5" />} onClick={() => setReceiptOpen(true)}>
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
            { value: 'activite', label: 'Activité' },
            { value: 'paiement', label: 'Paiement' },
          ]}
        />
      }
    >
      <div className="flex items-center gap-3 mb-4">
        <ListingThumb src={order.item.coverImage} category={order.item.category} size="md" />
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-gray-900 truncate">{order.item.title}</h2>
          <p className="text-sm text-gray-500">{formatDateTime(order.createdAt)}</p>
        </div>
      </div>

      {tab === 'suivi' && (
        <div className="space-y-4">
          <NextStepCard order={order} perspective={perspective} userId={userId} />
          <OrderReviewCard order={order} isBuyer={!isSeller} userId={userId} />
          <BriefCard order={order} perspective={perspective} />
          <DeliveryCard order={order} perspective={perspective} />
        </div>
      )}

      {tab === 'activite' && (
        <div className="space-y-4">
          <ChatPreviewCard order={order} perspective={perspective} userId={userId} users={users} />
          <OrderTimeline order={order} users={users} />
        </div>
      )}

      {tab === 'paiement' && (
        <div className="space-y-4">
          <Card>
            <CardHeader title="Paiement" />
            <CardBody className="pt-0">
              <DescriptionList
                items={[
                  { label: 'Payé', value: formatXaf(order.amounts.total) },
                  ...(order.amounts.discount
                    ? [{ label: `Remise ${order.couponCode}`, value: `−${formatXaf(order.amounts.discount)}` }]
                    : []),
                  ...(isSeller && order.amounts.fee > 0
                    ? [
                        { label: 'Commission', value: `−${formatXaf(order.amounts.fee)}` },
                        { label: 'Net', value: formatXaf(order.amounts.net) },
                      ]
                    : []),
                  { label: 'Fonds', value: FUNDS_LABEL[fundsState(order.status)] },
                  { label: 'Via', value: `${paymentMethodLabel(order)} · ${order.payment.reference}` },
                  ...(order.payment.code ? [{ label: 'Code', value: <span className="font-mono">{order.payment.code}</span> }] : []),
                ]}
              />
            </CardBody>
          </Card>

          {!isSeller && order.refund && <RefundReceipt refund={order.refund} />}
          {!isSeller && !order.refund && fundsState(order.status) === 'escrow' && <RefundPreview total={order.amounts.total} />}

          <Card>
            <CardHeader title={isSeller ? 'Client' : 'Vendeur'} />
            <CardBody className="pt-0">
              {isSeller ? (
                <DescriptionList
                  items={[
                    { label: 'Nom', value: order.buyer.name },
                    ...(order.invoice ? [{ label: 'Facturation', value: `${order.invoice.companyName} (NIU ${order.invoice.taxId})` }] : []),
                  ]}
                />
              ) : (
                <SellerCard seller={seller} />
              )}
            </CardBody>
          </Card>

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
