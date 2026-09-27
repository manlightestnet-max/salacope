import React, { useState } from 'react';
import { Button, Field, Input, Select } from '@/shared/ui';
import { MerchantInput } from '../api';

const CITIES = ['Brazzaville', 'Pointe-Noire', 'Dolisie', 'Nkayi', 'Ouesso', 'Autre'].map((c) => ({ value: c, label: c }));

export interface MerchantFormProps {
  initial?: Partial<MerchantInput>;
  submitLabel: string;
  onSubmit: (input: MerchantInput) => void;
  error?: string;
  busy?: boolean;
}

/** Store identity. Used for onboarding and in settings (payouts: the LightPay wallet). */
export const MerchantForm: React.FC<MerchantFormProps> = ({ initial, submitLabel, onSubmit, error, busy }) => {
  const [storeName, setStoreName] = useState(initial?.storeName ?? '');
  const [headline, setHeadline] = useState(initial?.headline ?? '');
  const [city, setCity] = useState(initial?.city ?? 'Brazzaville');

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ storeName, headline, city });
      }}
      className="space-y-4"
    >
      <Field label="Nom de la boutique" hint="Affiché sur vos offres et vos reçus.">
        {(id) => <Input id={id} required maxLength={60} value={storeName} onChange={(e) => setStoreName(e.target.value)} />}
      </Field>
      <Field label="Activité" optional hint="Ex. : Designer graphique, Formateur Excel">
        {(id) => <Input id={id} maxLength={140} value={headline} onChange={(e) => setHeadline(e.target.value)} />}
      </Field>
      <Field label="Ville">
        {(id) => <Select id={id} value={city} options={CITIES} onChange={setCity} className="w-full" />}
      </Field>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button type="submit" variant="primary" disabled={busy}>
        {submitLabel}
      </Button>
    </form>
  );
};
