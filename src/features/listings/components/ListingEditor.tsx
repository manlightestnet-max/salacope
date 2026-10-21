import React, { useRef, useState } from 'react';
import clsx from 'clsx';
import { Check, Download, Wrench } from 'lucide-react';
import { ListingKind } from '@/shared/db';
import { Button, Panel } from '@/shared/ui';
import { minPriceFor } from '@/shared/config/platform';
import { inputFiles } from '@/shared/domain';
import { CATEGORIES, COVER_FORMAT, ListingCover, ListingPrice, cardBreadcrumb } from '@/features/catalog';
import { ListingInput, createDraft } from '../api';
import { stepError, useListingForm } from '../listingForm';
import { CategoryField, DeliveryFields, DescriptionFields, InfoFields, MediaFields, PriceFields } from './ListingFields';

const KIND_OPTIONS: { kind: ListingKind; title: string; text: string; icon: typeof Download }[] = [
  { kind: 'digital', title: 'Produit numérique', text: 'Fichier ou accès livré automatiquement au paiement.', icon: Download },
  { kind: 'service', title: 'Service', text: 'Vous réalisez le travail et le livrez dans un délai fixé.', icon: Wrench },
];

const STEPS = ['Type', 'Présentation', 'Livraison', 'Couverture et prix', 'Vérification'] as const;

const STEP_HELP: Record<(typeof STEPS)[number], string> = {
  Type: 'Ce que vous vendez : un fichier livré au paiement, ou un service livré dans un délai.',
  Présentation: 'Ce que le client voit en premier : titre, résumé, description et points forts.',
  Livraison: 'Comment le client reçoit ce qu’il achète.',
  'Couverture et prix': 'L’image du catalogue et le prix payé par le client.',
  Vérification: 'Relisez avant de publier : l’offre apparaît aussitôt dans le catalogue.',
};

/** Numbered steps; completed ones can be reopened. */
const Stepper: React.FC<{ current: number; reachable: (i: number) => boolean; onSelect: (i: number) => void }> = ({ current, reachable, onSelect }) => (
  <div className="mb-5">
    <ol className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              disabled={!reachable(i)}
              onClick={() => onSelect(i)}
              aria-current={active ? 'step' : undefined}
              className={clsx(
                'h-8 flex items-center gap-2 rounded-full border pl-1 pr-3 text-[13px] font-medium transition-colors disabled:cursor-default',
                active ? 'bg-accent border-accent text-on-accent' : 'bg-surface border-gray-200 text-gray-600 enabled:hover:text-gray-900'
              )}
            >
              <span
                className={clsx(
                  'w-6 h-6 rounded-full flex items-center justify-center text-[11px] tabular-nums',
                  active ? 'bg-canvas/15' : done ? 'bg-accent text-on-accent' : 'bg-gray-100 text-gray-500'
                )}
              >
                {done ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </span>
              <span className={clsx(!active && 'hidden sm:inline')}>{label}</span>
            </button>
            {i < STEPS.length - 1 && <span className="w-3 h-px bg-gray-200" />}
          </li>
        );
      })}
    </ol>
  </div>
);

/** How the offer will look in the catalogue, updated as the seller types. */
const Preview: React.FC<{ form: ListingInput; sellerName: string; size?: 'md' | 'lg' }> = ({ form, sellerName, size = 'md' }) => {
  const main = inputFiles(form).find((f) => !f.preview) ?? inputFiles(form)[0];
  const [type, detail] = cardBreadcrumb({
    category: form.category,
    kind: form.kind,
    deliveryDays: form.deliveryDays,
    file: form.kind === 'digital' ? { name: main?.name ?? '', format: main?.format ?? 'PDF' } : undefined,
  });
  const format = COVER_FORMAT[form.category];
  const narrow = format === 'portrait' || format === 'square';
  return (
    <div className={clsx(narrow ? (size === 'lg' ? 'max-w-[220px]' : 'max-w-[190px]') : 'max-w-[300px]')}>
      {form.coverImage.trim() ? (
        <ListingCover bare src={form.coverImage.trim()} category={form.category} />
      ) : (
        <div className={clsx('rounded-xl border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-xs text-gray-400', {
          'aspect-[3/4]': format === 'portrait',
          'aspect-[4/3]': format === 'landscape',
          'aspect-video': format === 'video',
          'aspect-square': format === 'square',
        })}>
          Couverture
        </div>
      )}
      <div className="pt-3">
        <p className="text-xs text-gray-500">
          {type} › {detail}
        </p>
        <p className="mt-1 text-sm font-semibold text-gray-900 leading-snug line-clamp-2">{form.title.trim() || 'Titre de votre offre'}</p>
        <p className="mt-1 text-[12.5px] text-gray-500 truncate">{sellerName}</p>
        <p className="mt-2 text-sm font-semibold text-primary-700 tabular-nums">{form.priceXaf ? <ListingPrice listing={form} /> : '— FCFA'}</p>
      </div>
    </div>
  );
};

export interface ListingEditorProps {
  sellerName: string;
  /** Called with the finished form, whether to publish it right away, and the draft the first file sent opened (if any). */
  onSubmit: (input: ListingInput, publish: boolean, draftId?: string) => void;
}

export const LISTING_FORM_ID = 'listing-form';

/**
 * The creation of an offer, step by step: type → presentation → delivery → cover and price → review, with a live preview of the
 * catalogue card. Once the offer exists it is never edited here again: it has its own screens (one section at a time).
 */
export const ListingEditor: React.FC<ListingEditorProps> = ({ sellerName, onSubmit }) => {
  const { form, setForm, set, featuresText, setFeaturesText, free, setFree, input } = useListingForm();
  const [step, setStep] = useState(0);
  const [reached, setReached] = useState(0);
  const [error, setError] = useState<string>();
  // The first file sent opens a draft with what is typed so far: the file belongs to it from then on.
  const draftId = useRef<string>();
  const opening = useRef<Promise<string>>();
  const openDraft = () => {
    if (draftId.current) return Promise.resolve(draftId.current);
    opening.current ??= createDraft(input())
      .then((listing) => (draftId.current = listing.id))
      .finally(() => {
        opening.current = undefined;
      });
    return opening.current;
  };

  const chooseKind = (kind: ListingKind) => setForm((f) => ({ ...f, kind, category: CATEGORIES.find((c) => c.kind === kind)!.id }));

  const goTo = (target: number) => {
    // Moving forward checks every step in between.
    for (let s = step; s < target; s += 1) {
      const problem = stepError(s, input(), free);
      if (problem) {
        setStep(s);
        setError(problem);
        return;
      }
    }
    setError(undefined);
    setStep(target);
    setReached((r) => Math.max(r, target));
  };

  const last = step === STEPS.length - 1;
  const checklist = [
    { ok: form.title.trim().length >= 8 && Boolean(form.summary.trim()), label: 'Titre et résumé' },
    { ok: Boolean(form.description.trim()), label: 'Description' },
    { ok: form.kind === 'service' ? Boolean(form.deliveryDays) : inputFiles(form).length > 0, label: form.kind === 'service' ? 'Délai de livraison' : 'Fichiers livrés' },
    { ok: Boolean(form.coverImage.trim()), label: 'Couverture' },
    { ok: free ? form.priceXaf === 0 : form.priceXaf >= minPriceFor(form.kind), label: 'Prix' },
  ];

  return (
    <form
      id={LISTING_FORM_ID}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(input(), true, draftId.current);
      }}
      className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] gap-6 items-start"
    >
      <div className="min-w-0">
        <Stepper current={step} reachable={(i) => i <= reached} onSelect={goTo} />

        <Panel
          title={`${step + 1}. ${STEPS[step]}`}
          description={STEP_HELP[STEPS[step]]}
          bodyClassName="space-y-4"
          bar={
            <>
              <Button variant="ghost" onClick={() => goTo(step - 1)} disabled={step === 0} className={clsx(step === 0 && 'invisible')}>
                Précédent
              </Button>
              <div className="flex gap-2">
                {last && <Button onClick={() => onSubmit(input(), false, draftId.current)}>Enregistrer en brouillon</Button>}
                {last ? (
                  <Button type="submit" variant="primary">
                    Publier l’offre
                  </Button>
                ) : (
                  <Button variant="primary" onClick={() => goTo(step + 1)}>
                    Suivant
                  </Button>
                )}
              </div>
            </>
          }
        >
          {step === 0 && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {KIND_OPTIONS.map(({ kind, title, text, icon: Icon }) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => chooseKind(kind)}
                    className={clsx('text-left rounded-2xl border p-4 transition-colors', form.kind === kind ? 'border-primary-600 ring-1 ring-primary-600 bg-primary-50/40' : 'border-gray-200 hover:border-gray-300')}
                  >
                    <Icon className="w-4 h-4 text-gray-500 mb-2" />
                    <div className="text-sm font-medium text-gray-900">{title}</div>
                    <div className="text-sm text-gray-500 mt-0.5">{text}</div>
                  </button>
                ))}
              </div>
              <CategoryField form={form} set={set} />
            </>
          )}

          {step === 1 && (
            <>
              <InfoFields form={form} set={set} autoFocus />
              <DescriptionFields form={form} set={set} featuresText={featuresText} setFeaturesText={setFeaturesText} />
            </>
          )}

          {step === 2 && <DeliveryFields form={form} set={set} setForm={setForm} draft={{ open: openDraft }} />}

          {step === 3 && (
            <>
              <MediaFields form={form} set={set} />
              <PriceFields form={form} set={set} free={free} setFree={setFree} />
            </>
          )}

          {step === 4 && (
            <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-6 items-start">
              <Preview form={form} sellerName={sellerName} size="lg" />
              <ul className="space-y-2">
                {checklist.map((c) => (
                  <li key={c.label} className="flex items-center gap-2 text-sm">
                    <span className={clsx('w-5 h-5 rounded-full flex items-center justify-center', c.ok ? 'bg-accent text-on-accent' : 'bg-gray-100 text-gray-400')}>
                      <Check className="w-3 h-3" />
                    </span>
                    <span className={c.ok ? 'text-gray-900' : 'text-gray-500'}>{c.label}</span>
                    {!c.ok && <span className="text-xs text-gray-400">{c.label === 'Couverture' || c.label === 'Description' ? 'conseillé' : 'requis'}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
        </Panel>
      </div>

      <aside className="hidden lg:block lg:sticky lg:top-0">
        <Panel title="Aperçu" help="Votre offre telle qu’elle apparaîtra dans le catalogue, mise à jour pendant la saisie.">
          <Preview form={form} sellerName={sellerName} />
        </Panel>
      </aside>
    </form>
  );
};
