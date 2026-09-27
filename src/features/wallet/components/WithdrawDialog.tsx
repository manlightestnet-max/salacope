import React, { useEffect, useState } from 'react';
import { Merchant } from '@/shared/db';
import { Button, Dialog, Field, Input } from '@/shared/ui';
import { useServiceAction } from '@/shared/hooks';
import { formatXaf } from '@/shared/lib';
import { PLATFORM } from '@/shared/config/platform';
import { PAYMENT_CHANNELS } from '@/shared/config/payment';
import { requestWithdrawal } from '../api';

export const WithdrawDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  sellerId: string;
  merchant: Merchant;
  available: number;
}> = ({ open, onClose, sellerId, merchant, available }) => {
  const [amount, setAmount] = useState('');
  const run = useServiceAction();

  useEffect(() => {
    if (open) setAmount(String(available));
  }, [open, available]);

  const submit = () => {
    if (run(() => requestWithdrawal(sellerId, Number(amount)), 'Demande de retrait envoyée')) onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Retirer des fonds"
      description={`Disponible : ${formatXaf(available)}`}
      size="sm"
      footer={
        <>
          <Button onClick={onClose}>Annuler</Button>
          <Button variant="primary" onClick={submit}>
            Retirer
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Montant" hint={`Minimum ${formatXaf(PLATFORM.minWithdrawalXaf)}.`}>
          {(id) => (
            <Input
              id={id}
              type="number"
              inputMode="numeric"
              min={PLATFORM.minWithdrawalXaf}
              max={available}
              trailing="FCFA"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          )}
        </Field>
        <div className="text-sm text-gray-600">
          Versé sur <span className="font-medium text-gray-900">{PAYMENT_CHANNELS[merchant.payoutChannel].label} · {merchant.payoutPhone}</span>,
          sous 24 h ouvrées. Modifiable dans les paramètres de la boutique.
        </div>
      </div>
    </Dialog>
  );
};
