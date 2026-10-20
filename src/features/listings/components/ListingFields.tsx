import React, { useRef, useState } from 'react';
import clsx from 'clsx';
import { ImagePlus, Link2, Plus, Trash2 } from 'lucide-react';
import { BriefQuestion, Category } from '@/shared/db';
import { Button, Field, Input, Select, Textarea } from '@/shared/ui';
import { createId, cropImageFile } from '@/shared/lib';
import { PLATFORM, minPriceFor } from '@/shared/config/platform';
import { CATEGORIES, COVER_ASPECT, COVER_FORMAT, COVER_HINT, COVER_SIZE } from '@/features/catalog';
import { LISTING_LIMITS, featureLines, featuresError } from '@/shared/domain';
import { ListingInput, MAX_BRIEF_QUESTIONS } from '../api';
import { ProductFilesField } from './ProductFilesField';
import { PromotionFields } from './PromotionFields';

const REVISION_OPTIONS = Array.from({ length: PLATFORM.maxRevisions + 1 }, (_, n) => ({
  value: String(n),
  label: n === 0 ? 'Aucune retouche' : `${n} retouche${n > 1 ? 's' : ''}`,
}));

/** "12 / 120" next to a label; turns red past the limit. */
const Count: React.FC<{ value: number; max: number }> = ({ value, max }) => (
  <span className={clsx('ml-auto text-xs tabular-nums', value > max ? 'text-red-600' : 'text-gray-400')}>
    {value} / {max}
  </span>
);

/** Cover from the device (cropped to the category's shape) or from a link. */
const CoverInput: React.FC<{ value: string; category: Category; onChange: (value: string) => void }> = ({ value, category, onChange }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [showUrl, setShowUrl] = useState(value.startsWith('http'));
  const format = COVER_FORMAT[category];

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setError(undefined);
    setBusy(true);
    try {
      const [w, h] = COVER_SIZE[format];
      onChange(await cropImageFile(file, w, h));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Field label="Couverture" optional hint={`${COVER_HINT[format]} L'image est recadrée automatiquement.`} error={error}>
      {(id) => (
        <div className="space-y-3">
          <input
            ref={inputRef}
            id={id}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              onFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          <div className="flex flex-wrap gap-2">
            <Button icon={<ImagePlus className="w-4 h-4" />} loading={busy} onClick={() => inputRef.current?.click()}>
              {value ? 'Changer d’image' : 'Importer une image'}
            </Button>
            <Button variant="ghost" icon={<Link2 className="w-4 h-4" />} onClick={() => setShowUrl((v) => !v)}>
              Lien
            </Button>
            {value && (
              <Button variant="ghost" onClick={() => onChange('')}>
                Retirer
              </Button>
            )}
          </div>
          {showUrl && (
            <Input type="url" placeholder="https://…" value={value.startsWith('data:') ? '' : value} onChange={(e) => onChange(e.target.value)} aria-label="Lien de l'image" />
          )}
        </div>
      )}
    </Field>
  );
};

/** Up to LISTING_LIMITS.gallery more images, after the cover, cropped to the same shape. */
const GalleryInput: React.FC<{ value: string[] | undefined; category: Category; onChange: (value: string[]) => void }> = ({ value, category, onChange }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const format = COVER_FORMAT[category];
  const images = value ?? [];
  const room = LISTING_LIMITS.gallery - images.length;

  const onFiles = async (files: File[]) => {
    setError(undefined);
    setBusy(true);
    try {
      const [w, h] = COVER_SIZE[format];
      const added = await Promise.all(files.slice(0, room).map((f) => cropImageFile(f, w, h)));
      onChange([...images, ...added]);
      if (files.length > room) setError(`${LISTING_LIMITS.gallery} images au maximum en plus de la couverture.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Field
      label="Autres images"
      optional
      action={<span className="ml-auto text-xs text-gray-400 tabular-nums">{images.length} / {LISTING_LIMITS.gallery}</span>}
      hint="Montrez l’intérieur, un aperçu, un résultat : les clients les font défiler sur la fiche."
      error={error}
    >
      {(id) =>
        value === undefined ? (
          <div className="flex gap-2">
            {[0, 1].map((i) => (
              <span key={i} className={clsx('w-20 shimmer rounded-lg', COVER_ASPECT[format])} />
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {images.map((src, i) => (
              <div key={i} className={clsx('relative w-20 overflow-hidden rounded-lg border border-gray-200', COVER_ASPECT[format])}>
                <img src={src} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => onChange(images.filter((_, j) => j !== i))}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-canvas/85 flex items-center justify-center text-gray-700 hover:text-gray-900"
                  aria-label={`Retirer l’image ${i + 2}`}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
            {room > 0 && (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={busy}
                className={clsx(
                  'w-20 rounded-lg border border-dashed border-gray-300 flex flex-col items-center justify-center gap-1 text-xs text-gray-500 hover:border-gray-400 hover:text-gray-700',
                  COVER_ASPECT[format],
                  busy && 'shimmer'
                )}
              >
                <ImagePlus className="w-4 h-4" />
                Ajouter
              </button>
            )}
            <input
              ref={inputRef}
              id={id}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={(e) => {
                void onFiles(Array.from(e.target.files ?? []));
                e.target.value = '';
              }}
            />
          </div>
        )
      }
    </Field>
  );
};

const BriefQuestionsEditor: React.FC<{ value: BriefQuestion[]; onChange: (value: BriefQuestion[]) => void }> = ({ value, onChange }) => {
  const update = (id: string, patch: Partial<BriefQuestion>) => onChange(value.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  return (
    <div className="space-y-2">
      {value.map((q, i) => (
        <div key={q.id} className="flex items-center gap-2">
          <Input
            value={q.label}
            onChange={(e) => update(q.id, { label: e.target.value })}
            placeholder={i === 0 ? 'Ex. : nom de votre marque' : 'Question'}
            aria-label={`Question ${i + 1}`}
            maxLength={120}
            className="flex-1 min-w-0"
          />
          <label className="shrink-0 flex items-center gap-1.5 text-xs text-gray-600 select-none">
            <input type="checkbox" checked={q.required} onChange={(e) => update(q.id, { required: e.target.checked })} className="accent-[rgb(var(--accent))]" />
            Obligatoire
          </label>
          <button
            type="button"
            onClick={() => onChange(value.filter((x) => x.id !== q.id))}
            className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            aria-label={`Supprimer la question ${i + 1}`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
      {value.length < MAX_BRIEF_QUESTIONS && (
        <Button size="sm" variant="ghost" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => onChange([...value, { id: createId('q', 4), label: '', required: true }])}>
          Ajouter une question
        </Button>
      )}
    </div>
  );
};


type SetField = <K extends keyof ListingInput>(key: K, value: ListingInput[K]) => void;
interface FieldsProps {
  form: ListingInput;
  set: SetField;
}

/** The groups of fields of an offer. The step-by-step editor (new offer) and the section screens (existing offer) both use them. */

export const CategoryField: React.FC<FieldsProps> = ({ form, set }) => (
  <Field label="Catégorie">
    {() => (
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.filter((c) => c.kind === form.kind).map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => set('category', c.id)}
            aria-pressed={form.category === c.id}
            className={clsx(
              'h-8 rounded-full border px-3 text-[13px] font-medium transition-colors',
              form.category === c.id ? 'bg-accent border-accent text-on-accent' : 'border-gray-200 text-gray-600 hover:text-gray-900'
            )}
          >
            {c.label}
          </button>
        ))}
      </div>
    )}
  </Field>
);

export const InfoFields: React.FC<FieldsProps & { autoFocus?: boolean }> = ({ form, set, autoFocus }) => (
  <>
    <Field label="Titre" action={<Count value={form.title.trim().length} max={LISTING_LIMITS.title} />}>
      {(id) => <Input id={id} maxLength={LISTING_LIMITS.title} value={form.title} onChange={(e) => set('title', e.target.value)} autoFocus={autoFocus} />}
    </Field>
    <Field label="Résumé" hint="Une phrase affichée sous le titre." action={<Count value={form.summary.trim().length} max={LISTING_LIMITS.summary} />}>
      {(id) => <Input id={id} maxLength={LISTING_LIMITS.summary} value={form.summary} onChange={(e) => set('summary', e.target.value)} />}
    </Field>
  </>
);

export const DescriptionFields: React.FC<FieldsProps & { featuresText: string; setFeaturesText: (v: string) => void }> = ({ form, set, featuresText, setFeaturesText }) => {
  const lines = featuresText.split('\n');
  return (
    <>
      <Field label="Description">{(id) => <Textarea id={id} rows={6} value={form.description} onChange={(e) => set('description', e.target.value)} />}</Field>
      <Field
        label="Ce qui est inclus"
        action={<Count value={featureLines(lines).length} max={LISTING_LIMITS.features} />}
        hint={`Un élément par ligne, ${LISTING_LIMITS.feature} caractères au maximum chacun. Facultatif.`}
        error={featuresError(lines)}
      >
        {(id) => <Textarea id={id} rows={4} value={featuresText} onChange={(e) => setFeaturesText(e.target.value)} />}
      </Field>
    </>
  );
};

export const MediaFields: React.FC<FieldsProps> = ({ form, set }) => (
  <>
    <CoverInput value={form.coverImage} category={form.category} onChange={(v) => set('coverImage', v)} />
    <GalleryInput value={form.gallery} category={form.category} onChange={(v) => set('gallery', v)} />
  </>
);

export const PriceFields: React.FC<FieldsProps & { free: boolean; setFree: (v: boolean) => void }> = ({ form, set, free, setFree }) => (
  <>
    <Field
      label="Prix de vente"
      hint={free ? 'Gratuit : aucun paiement. Avec une promotion, l’offre est gratuite jusqu’à la fin du compte à rebours puis repasse à l’ancien prix.' : `Minimum ${minPriceFor(form.kind)} FCFA.`}
    >
      {(id) => (
        <Input
          id={id}
          type="number"
          inputMode="numeric"
          min={free ? 0 : minPriceFor(form.kind)}
          step={1}
          trailing="FCFA"
          value={free ? 0 : form.priceXaf || ''}
          disabled={free}
          onChange={(e) => set('priceXaf', Number(e.target.value))}
          className="max-w-xs"
        />
      )}
    </Field>
    {(PLATFORM.freeOffers || free) && (
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={free}
          onChange={(e) => {
            setFree(e.target.checked);
            set('priceXaf', 0);
          }}
          className="mt-1 w-4 h-4 accent-[rgb(var(--accent))]"
        />
        <span>
          <span className="block text-sm font-medium text-gray-900">Offre gratuite</span>
          <span className="block text-xs text-gray-500">Le client l’obtient sans payer. Idéal pour un cadeau ou pour attirer des clients ; combinez-la avec une promotion pour la rendre gratuite un temps seulement.</span>
        </span>
      </label>
    )}
    <PromotionFields form={form} set={set} />
  </>
);

export const DeliveryFields: React.FC<FieldsProps & { setForm: React.Dispatch<React.SetStateAction<ListingInput>>; listingId?: string }> = ({ form, set, setForm, listingId }) =>
  form.kind === 'service' ? (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Délai de livraison" hint="À compter de l'acceptation.">
          {(id) => <Input id={id} type="number" min={1} max={90} trailing="jours" value={form.deliveryDays ?? ''} onChange={(e) => set('deliveryDays', Number(e.target.value))} />}
        </Field>
        <Field label="Retouches incluses">
          {(id) => <Select id={id} value={String(form.revisions ?? 0)} options={REVISION_OPTIONS} onChange={(v) => set('revisions', Number(v))} className="w-full" />}
        </Field>
      </div>
      <Field label="Brief demandé au client" optional hint="Il y répond en payant : vous avez tout pour démarrer, sans aller-retour.">
        {() => <BriefQuestionsEditor value={form.briefQuestions ?? []} onChange={(v) => set('briefQuestions', v)} />}
      </Field>
    </>
  ) : (
    <ProductFilesField form={form} setForm={setForm} listingId={listingId} />
  );
