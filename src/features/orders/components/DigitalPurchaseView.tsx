import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { ArrowUpRight, CheckCircle2, Download, FileText, Flag, History, LucideIcon, MessageCircle, Receipt } from 'lucide-react';
import { Button, ConfirmDialog, DescriptionList, Page, useToast } from '@/shared/ui';
import { useServiceAction } from '@/shared/hooks';
import { formatDate, formatXaf } from '@/shared/lib';
import { ROUTES } from '@/shared/config/routes';
import { COVER_FORMAT, KindBadge, ListingCover } from '@/features/catalog';
import { CompactReview } from '@/features/reviews';
import { displayName } from '@/features/session';
import { OrderView } from '../hooks';
import { EVENT_LABEL, paymentMethodLabel, permissionsFor } from '../model';
import { ReportResult, confirmOrder, reportProblem } from '../api';
import { OrderStatusBadge } from './OrderStatusBadge';
import { unreadCount } from '../chat';
import { OrderReceipt } from './OrderReceipt';
import { ReportDialog } from './OrderDialogs';

type Panel = 'details' | null;

/** A secondary option: discreet until pressed. */
const OptionChip: React.FC<{ icon: LucideIcon; label: string; active?: boolean; onClick: () => void; controls?: string }> = ({
  icon: Icon,
  label,
  active,
  onClick,
  controls,
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-expanded={controls ? active : undefined}
    aria-controls={controls}
    className={clsx(
      'h-9 shrink-0 inline-flex items-center gap-2 rounded-full border px-3.5 text-[13px] font-medium transition-colors',
      active ? 'bg-accent border-accent text-on-accent' : 'bg-surface border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300'
    )}
  >
    <Icon className="w-4 h-4" />
    {label}
  </button>
);

/**
 * Buyer's page for a digital product: the product and its download come first. Payment
 * details, activity, receipt and reporting stay one tap away; the rating sits quietly below.
 */
export const DigitalPurchaseView: React.FC<{ view: OrderView; userId: string }> = ({ view, userId }) => {
  const { order, seller } = view;
  const toast = useToast();
  const navigate = useNavigate();
  const unread = unreadCount(order, userId);
  const run = useServiceAction();
  const [panel, setPanel] = useState<Panel>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [dialog, setDialog] = useState<'report' | 'confirm' | null>(null);
  const can = permissionsFor(order, 'buyer');
  const available = ['delivered', 'completed', 'disputed'].includes(order.status);
  const narrowCover = ['portrait', 'square'].includes(COVER_FORMAT[order.item.category]);
  const toggle = (p: Exclude<Panel, null>) => setPanel((current) => (current === p ? null : p));

  const report = () => setDialog('report');

  return (
    <Page
      back={{ to: ROUTES.account.orders, label: 'Mes achats' }}
      title={order.number}
      meta={<span className="ml-2"><OrderStatusBadge order={order} perspective="buyer" /></span>}
      width="narrow"
    >
      <section className="rounded-3xl border border-gray-200/70 bg-surface p-4 sm:p-5">
        <div className="flex gap-4 sm:gap-5">
          <ListingCover
            bare
            src={order.item.coverImage}
            category={order.item.category}
            className={clsx('shrink-0 self-start', narrowCover ? 'w-20 sm:w-24' : 'w-28 sm:w-36')}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <KindBadge kind={order.item.kind} category={order.item.category} />
              <span className="text-xs text-gray-500 truncate">par {displayName(seller)}</span>
            </div>
            <h2 className="mt-1.5 text-base sm:text-lg font-semibold tracking-tight leading-snug text-gray-900 line-clamp-2">{order.item.title}</h2>
            <p className="mt-1 text-xs text-gray-500">
              {formatDate(order.createdAt)} · {formatXaf(order.amounts.total)} · {paymentMethodLabel(order)}
              {order.status === 'completed' && (
                <span className="inline-flex items-center gap-1 ml-1.5 text-emerald-700">
                  <CheckCircle2 className="w-3 h-3" /> Réception confirmée
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <div className="flex-1 min-w-0 flex items-center gap-2.5 rounded-full bg-gray-50 border border-gray-200/70 h-10 px-3.5">
            <FileText className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="text-sm text-gray-900 truncate">{order.item.file?.name ?? order.item.title}</span>
            <span className="ml-auto shrink-0 text-xs text-gray-500">{order.item.file?.format ?? 'Fichier'}</span>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              variant="primary"
              size="lg"
              pill
              className="flex-1 sm:flex-none"
              disabled={!available}
              icon={<Download className="w-4 h-4" />}
              onClick={() => toast.success('Démo : le fichier réel sera servi par le serveur de stockage.')}
            >
              Télécharger
            </Button>
            <Button
              size="lg"
              pill
              variant="ghost"
              to={ROUTES.account.offer(order.listingId)}
              aria-label="Voir l’offre"
              icon={<ArrowUpRight className="w-4 h-4" />}
            >
              <span className="hidden sm:inline">Voir l’offre</span>
            </Button>
          </div>
        </div>

        {can.confirm && (
          <p className="mt-3 text-xs text-gray-500">
            Tout est bon ?{' '}
            <button type="button" onClick={() => setDialog('confirm')} className="font-medium text-primary-700 hover:underline underline-offset-2">
              Confirmer la réception
            </button>{' '}
            — sinon le vendeur est payé le {formatDate(order.releaseAt)}.
          </p>
        )}
      </section>

      <div className="mt-4 flex gap-2 overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
        <OptionChip icon={Receipt} label="Reçu" onClick={() => setReceiptOpen(true)} />
        <OptionChip icon={History} label="Paiement et activité" active={panel === 'details'} onClick={() => toggle('details')} controls="purchase-panel" />
        <OptionChip icon={MessageCircle} label={unread ? `Messages du vendeur · ${unread}` : 'Écrire au vendeur'} onClick={() => navigate(ROUTES.account.chat(order.id))} />
        <OptionChip icon={Flag} label="Signaler un problème" onClick={report} />
      </div>

      <div id="purchase-panel" className={clsx('grid transition-[grid-template-rows,opacity] duration-300', panel ? 'grid-rows-[1fr] opacity-100 mt-4' : 'grid-rows-[0fr] opacity-0')}>
        <div className="overflow-hidden">
          {panel === 'details' && (
            <div className="rounded-2xl border border-gray-200/70 bg-surface px-5 py-4 animate-fade-up">
              <DescriptionList
                items={[
                  { label: 'Payé', value: formatXaf(order.amounts.total) },
                  { label: 'Via', value: `${paymentMethodLabel(order)} · ${order.payment.reference}` },
                  ...(order.payment.code ? [{ label: 'Code', value: <span className="font-mono">{order.payment.code}</span> }] : []),
                  ...order.events.map((e) => ({ label: formatDate(e.at), value: EVENT_LABEL[e.type] })),
                ]}
              />
            </div>
          )}
        </div>
      </div>

      <CompactReview order={order} userId={userId} className="mt-8" />

      <OrderReceipt order={order} seller={seller} open={receiptOpen} onClose={() => setReceiptOpen(false)} />
      <ReportDialog
        open={dialog === 'report'}
        onClose={() => setDialog(null)}
        kind="digital"
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
    </Page>
  );
};
