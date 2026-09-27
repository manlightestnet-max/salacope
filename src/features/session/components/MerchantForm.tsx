import React, { useState } from 'react';
import { Button, Field, Input, Select } from '@/shared/ui';
import { DEFAULT_PAYMENT_CHANNEL, PAYMENT_CHANNEL_LIST, PaymentChannel } from '@/shared/config/payment';
import { MerchantInput } from '../api';

const CITIES = ['Brazzaville', 'Pointe-Noire', 'Dolisie', 'Nkayi', 'Ouesso', 'Autre'].map((c) => ({ value: c, label: c }));

export interface MerchantFormProps {
  initial?: Partial<MerchantInput>;
  submitLabel: string;
  onSubmit: (input: MerchantInput) => void;
  error?: string;
}

/** Store identity + payout account. Used for onboarding and in settings. */
export const MerchantForm: React.FC<MerchantFormProps> = ({ initial, submitLabel, onSubmit, error }) => {
  const [storeName, setStoreName] = useState(initial?.storeName ?? '');
  const [headline, setHeadline] = useState(initial?.headline ?? '');
  const [city, setCity] = useState(initial?.city ?? 'Brazzaville');
  const [payoutChannel, setPayoutChannel] = useState<PaymentChannel>(initial?.payoutChannel ?? DEFAULT_PAYMENT_CHANNEL);
  const [payoutPhone, setPayoutPhone] = useState(initial?.payoutPhone ?? '');

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ storeName, headline, city, payoutChannel, payoutPhone });
      }}
      className="space-y-4"
    >
      <Field label="Nom de la boutique" hint="Affiché sur vos offres et vos reçus.">
        {(id) => <Input id={id} required value={storeName} onChange={(e) => setStoreName(e.target.value)} />}
      </Field>
      <Field label="Activité" optional hint="Ex. : Designer graphique, Formateur Excel">
        {(id) => <Input id={id} value={headline} onChange={(e) => setHeadline(e.target.value)} />}
      </Field>
      <Field label="Ville">
        {(id) => <Select id={id} value={city} options={CITIES} onChange={setCity} className="w-full" />}
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
        <Field label="Versements sur" className="sm:col-span-2">
          {(id) => (
            <Select
              id={id}
              value={payoutChannel}
              options={PAYMENT_CHANNEL_LIST.map((c) => ({ value: c.id, label: c.label }))}
              onChange={setPayoutChannel}
              className="w-full"
            />
          )}
        </Field>
        <Field label="Numéro Mobile Money" className="sm:col-span-3">
          {(id) => (
            <Input
              id={id}
              type="tel"
              required
              placeholder="+242 06 000 00 00"
              value={payoutPhone}
              onChange={(e) => setPayoutPhone(e.target.value)}
            />
          )}
        </Field>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button type="submit" variant="primary">
        {submitLabel}
      </Button>
    </form>
  );
};
