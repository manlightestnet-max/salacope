import React from 'react';
import { Printer } from 'lucide-react';
import { Order, User } from '@/shared/db';
import { Button, DescriptionList, Dialog } from '@/shared/ui';
import { formatDateTime, formatXaf } from '@/shared/lib';
import { paymentMethodLabel } from '../model';
import { COMPANY } from '@/shared/config/company';
import { displayName } from '@/features/session';

/** Printable payment receipt. */
export const OrderReceipt: React.FC<{ order: Order; seller?: User; open: boolean; onClose: () => void }> = ({
  order,
  seller,
  open,
  onClose,
}) => (
  <Dialog
    open={open}
    onClose={onClose}
    title={`Reçu ${order.number}`}
    footer={
      <Button icon={<Printer className="w-4 h-4" />} onClick={() => window.print()}>
        Imprimer
      </Button>
    }
  >
    <div className="print-area space-y-4">
      <div className="text-sm text-gray-500">
        Salacope · {COMPANY.email}
        <br />
        Émis le {formatDateTime(order.createdAt)}
      </div>
      <DescriptionList
        items={[
          { label: 'Article', value: order.item.title },
          { label: 'Vendeur', value: displayName(seller) },
          { label: 'Client', value: order.buyer.name },
          ...(order.invoice ? [{ label: 'Société', value: `${order.invoice.companyName} · NIU ${order.invoice.taxId}` }] : []),
          { label: 'Moyen de paiement', value: paymentMethodLabel(order) },
          { label: 'Référence LightPay', value: order.payment.reference },
          { label: 'Sous-total', value: formatXaf(order.amounts.subtotal) },
          ...(order.amounts.discount ? [{ label: `Remise (${order.couponCode})`, value: `−${formatXaf(order.amounts.discount)}` }] : []),
          { label: 'Total payé', value: <strong>{formatXaf(order.amounts.total)}</strong> },
        ]}
      />
      <p className="text-xs text-gray-500">Produits numériques et services : TVA non applicable.</p>
    </div>
  </Dialog>
);
