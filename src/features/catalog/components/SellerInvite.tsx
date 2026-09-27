import React from 'react';
import clsx from 'clsx';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/shared/ui';
import { formatXaf } from '@/shared/lib';
import { ROUTES } from '@/shared/config/routes';
import { PLATFORM } from '@/shared/config/platform';
import { PAYMENT_CHANNELS, PaymentChannel } from '@/shared/config/payment';
import { ListingView } from '../model';

/** What a seller sees when money comes in; drawn from real offers of the catalogue. */
const PaymentNotice: React.FC<{
  channel: PaymentChannel;
  title: string;
  subject: string;
  amount: string;
  meta: string;
  credited?: boolean;
  className?: string;
}> = ({ channel, title, subject, amount, meta, credited = false, className }) => {
  const config = PAYMENT_CHANNELS[channel];
  return (
    <div className={clsx('rounded-[18px] border border-gray-200/70 bg-gray-50 px-4 py-3.5 flex items-center gap-3.5', className)}>
      <span className={clsx('w-10 h-10 shrink-0 rounded-xl flex items-center justify-center text-sm font-bold', config.logoClass)}>
        {config.initial}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        <p className="text-[12.5px] text-gray-500 truncate">{subject}</p>
      </div>
      <div className="text-right shrink-0">
        <p className={clsx('text-sm font-semibold tabular-nums whitespace-nowrap', credited ? 'text-primary-700' : 'text-gray-900')}>{amount}</p>
        <p className="text-[11.5px] text-gray-500 whitespace-nowrap">{meta}</p>
      </div>
    </div>
  );
};

/** Invitation to open a store, for visitors who don't sell yet. */
export const SellerInvite: React.FC<{ views: ListingView[]; className?: string }> = ({ views, className }) => {
  const sale = views.find((v) => v.listing.kind === 'digital');
  const order = views.find((v) => v.listing.kind === 'service');

  return (
    <section
      className={clsx(
        'rounded-[28px] border border-gray-200/60 bg-surface p-6 sm:p-10 lg:p-14 grid items-center gap-10 lg:gap-14 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]',
        className
      )}
    >
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-primary-700">Pour les créateurs</p>
        <h2 className="mt-3 text-[27px] sm:text-4xl font-semibold leading-[1.08] tracking-[-0.03em] text-gray-900">
          Vendez vos formations et services, encaissez en{' '}
          <span className="font-serif italic font-normal tracking-[-0.01em]">Mobile Money</span>.
        </h2>
        <p className="mt-4 max-w-md text-[15px] sm:text-base leading-relaxed text-gray-500">
          Ouvrez votre boutique en 2 minutes. Sans abonnement,{' '}
          {PLATFORM.feeRate > 0 ? `commission de ${PLATFORM.feeRate * 100} % par vente.` : 'aucune commission pendant le lancement.'}
        </p>
        <Button to={ROUTES.sell} variant="primary" size="xl" pill className="mt-7 w-full sm:w-auto" iconRight={<ArrowRight className="w-4 h-4" />}>
          Ouvrir ma boutique
        </Button>
      </div>
      {(sale || order) && (
        <div aria-hidden className="flex flex-col gap-3">
          {sale && (
            <PaymentNotice
              channel="MTN_MOMO_COG"
              title="Nouvelle vente"
              subject={sale.listing.title}
              amount={`+${formatXaf(sale.listing.priceXaf)}`}
              meta="à l’instant"
              credited
            />
          )}
          {order && (
            <PaymentNotice
              channel="AIRTEL_COG"
              title="Commande de service"
              subject={order.listing.title}
              amount={formatXaf(order.listing.priceXaf)}
              meta="protégé jusqu’à livraison"
              className="sm:ml-7"
            />
          )}
        </div>
      )}
    </section>
  );
};
