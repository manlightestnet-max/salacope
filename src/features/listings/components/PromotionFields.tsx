import React, { useState } from 'react';
import clsx from 'clsx';
import { Timer } from 'lucide-react';
import { Field, Input } from '@/shared/ui';
import { formatXaf } from '@/shared/lib';
import { PLATFORM } from '@/shared/config/platform';
import { promoError } from '@/shared/domain';
import { ListingInput } from '../api';

const pad = (n: number) => String(n).padStart(2, '0');
/** An ISO date as the value of a `datetime-local` field (the seller's own time). */
const toLocalInput = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();

const CHOICES = [
  { label: '24 h', days: 1 },
  { label: '3 jours', days: 3 },
  { label: '7 jours', days: 7 },
];

const Check: React.FC<{ checked: boolean; onChange: (v: boolean) => void; title: string; hint: string }> = ({ checked, onChange, title, hint }) => (
  <label className="flex items-start gap-3 cursor-pointer">
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1 w-4 h-4 accent-[rgb(var(--accent))]" />
    <span>
      <span className="block text-sm font-medium text-gray-900">{title}</span>
      <span className="block text-xs text-gray-500">{hint}</span>
    </span>
  </label>
);

/**
 * "Promotion" of an offer: the former price struck through next to the price of sale (the price field above is then the
 * promotional price), and, if the seller wants, a countdown shown at the top of the offer. When the countdown ends the price
 * goes back to the former one: the pressure is real, never a trick.
 */
export const PromotionFields: React.FC<{ form: ListingInput; set: <K extends keyof ListingInput>(key: K, value: ListingInput[K]) => void }> = ({ form, set }) => {
  const [on, setOn] = useState(Boolean(form.compareAtXaf));
  const timed = Boolean(form.promoEndsAt);
  const off = form.compareAtXaf && form.priceXaf && form.compareAtXaf > form.priceXaf ? Math.round((1 - form.priceXaf / form.compareAtXaf) * 100) : 0;
  const priceError = form.compareAtXaf && form.priceXaf && form.compareAtXaf <= form.priceXaf ? 'Doit être plus élevé que le prix de vente.' : undefined;
  const dateError = promoError(form.promoEndsAt, form.compareAtXaf);

  return (
    <div className="rounded-xl border border-gray-200/70 p-4 space-y-4">
      <Check
        checked={on}
        onChange={(v) => {
          setOn(v);
          if (!v) {
            set('compareAtXaf', undefined);
            set('promoEndsAt', undefined);
          }
        }}
        title="Activer une promotion"
        hint="Affichez une réduction : l’ancien prix barré, avec le pourcentage. Le prix ci-dessus devient le prix promotionnel."
      />

      {on && (
        <>
          <Field label="Prix barré (ancien prix)" error={priceError} hint={off > 0 ? `Réduction affichée : −${off} %.` : 'Le prix normal, plus élevé que le prix de vente.'}>
            {(id) => (
              <Input
                id={id}
                type="number"
                inputMode="numeric"
                step={1}
                trailing="FCFA"
                value={form.compareAtXaf || ''}
                onChange={(e) => set('compareAtXaf', e.target.value ? Number(e.target.value) : undefined)}
                className="max-w-xs"
              />
            )}
          </Field>

          <Check
            checked={timed}
            onChange={(v) => set('promoEndsAt', v ? inDays(3) : undefined)}
            title="Compte à rebours"
            hint={`Une horloge s’affiche en haut de l’offre jusqu’à la fin de la promotion (${PLATFORM.promoMaxDays} jours au plus). Mettez la pression : après la fin, le prix repasse à l’ancien prix.`}
          />

          {timed && (
            <div className="space-y-3 pl-7">
              <div className="flex flex-wrap items-center gap-2">
                {CHOICES.filter((c) => c.days <= PLATFORM.promoMaxDays).map((c) => (
                  <button
                    key={c.days}
                    type="button"
                    onClick={() => set('promoEndsAt', inDays(c.days))}
                    className="h-8 px-3 rounded-full border border-gray-200 bg-surface text-[13px] font-medium text-gray-600 hover:text-gray-900 hover:border-gray-300"
                  >
                    {c.label}
                  </button>
                ))}
              </div>
              <Field label="Fin de la promotion" error={dateError}>
                {(id) => (
                  <Input
                    id={id}
                    type="datetime-local"
                    value={toLocalInput(form.promoEndsAt)}
                    onChange={(e) => set('promoEndsAt', e.target.value ? new Date(e.target.value).toISOString() : undefined)}
                    className="max-w-xs"
                  />
                )}
              </Field>
              {!dateError && form.compareAtXaf ? (
                <p className={clsx('flex items-center gap-1.5 text-xs text-gray-500')}>
                  <Timer className="w-3.5 h-3.5" />À la fin, l’offre repasse à {formatXaf(form.compareAtXaf)}.
                </p>
              ) : null}
            </div>
          )}
        </>
      )}
    </div>
  );
};
