import React from 'react';
import { Dialog, EmptyState } from '@/shared/ui';
import { useServiceAction } from '@/shared/hooks';
import { formatXaf } from '@/shared/lib';
import { PAYMENT_REQUEST_MINUTES } from '@/shared/domain';
import { ListingThumb, useSellerListings } from '@/features/catalog';
import { sendPaymentRequest } from '../../api';

/** Seller picks which of their offers the client should pay; it lands in the chat as a card. */
export const PaymentRequestDialog: React.FC<{ orderId: string; sellerId: string; open: boolean; onClose: () => void }> = ({
  orderId,
  sellerId,
  open,
  onClose,
}) => {
  const listings = useSellerListings(sellerId);
  const run = useServiceAction();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Demande de paiement"
      description={`Le client a ${PAYMENT_REQUEST_MINUTES} minutes pour payer, à partir du moment où il ouvre la demande.`}
    >
      {listings.length === 0 ? (
        <EmptyState title="Aucune offre en ligne" description="Publiez une offre pour pouvoir la proposer au client." />
      ) : (
        <ul className="-mx-2 divide-y divide-gray-100">
          {listings.map(({ listing }) => (
            <li key={listing.id}>
              <button
                type="button"
                onClick={async () => {
                  if (await run(() => sendPaymentRequest(orderId, listing.id), 'Demande envoyée')) onClose();
                }}
                className="w-full flex items-center gap-3 px-2 py-2.5 rounded-lg text-left hover:bg-gray-50"
              >
                <ListingThumb src={listing.coverImage} category={listing.category} />
                <span className="min-w-0 flex-1 text-sm text-gray-900 truncate">{listing.title}</span>
                <span className="text-sm font-medium text-gray-900 tabular-nums">{formatXaf(listing.priceXaf)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  );
};
