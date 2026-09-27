import React, { useRef, useState } from 'react';
import clsx from 'clsx';
import { Check, Download, ImagePlus, Link2, Plus, Trash2, Wrench } from 'lucide-react';
import { BriefQuestion, Category, Listing, ListingKind } from '@/shared/db';
import { Button, Field, Input, Panel, Select, Textarea } from '@/shared/ui';
import { createId, cropImageFile, formatXaf } from '@/shared/lib';
import { PLATFORM } from '@/shared/config/platform';
import { CATEGORIES, COVER_FORMAT, COVER_HINT, COVER_SIZE, ListingCover, cardBreadcrumb } from '@/features/catalog';
import { ListingInput, MAX_BRIEF_QUESTIONS } from '../api';

const FORMATS = ['PDF', 'ZIP', 'DOCX', 'XLSX', 'Vidéo', 'Accès en ligne'].map((f) => ({ value: f, label: f }));
const FORMAT_BY_EXTENSION: Record<string, string> = { pdf: 'PDF', zip: 'ZIP', docx: 'DOCX', xlsx: 'XLSX', mp4: 'Vidéo' };
const formatFromFileName = (name: string) => FORMAT_BY_EXTENSION[name.split('.').pop()?.toLowerCase() ?? ''];

const REVISION_OPTIONS = Array.from({ length: PLATFORM.maxRevisions + 1 }, (_, n) => ({
  value: String(n),
  label: n === 0 ? 'Aucune retouche' : `${n} retouche${n > 1 ? 's' : ''}`,
}));

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

const fromListing = (l?: Listing): ListingInput => ({
  kind: l?.kind ?? 'digital',
  category: l?.category ?? 'ebook',
  title: l?.title ?? '',
  summary: l?.summary ?? '',
  description: l?.description ?? '',
  features: l?.features ?? [],
  priceXaf: l?.priceXaf ?? 0,
  coverImage: l?.coverImage ?? '',
  deliveryDays: l?.deliveryDays ?? 3,
  revisions: l?.revisions ?? 1,
  briefQuestions: l?.briefQuestions ?? [],
  fileName: l?.file?.name ?? '',
  fileFormat: l?.file?.format ?? 'PDF',
});

/** What is still missing on a step (checked before moving on). */
const stepError = (step: number, f: ListingInput): string | undefined => {
  if (step === 1) {
    if (f.title.trim().length < 8) return 'Le titre doit faire au moins 8 caractères.';
    if (!f.summary.trim()) return 'Ajoutez un résumé en une phrase.';
  }
  if (step === 2) {
    if (f.kind === 'service' && (!f.deliveryDays || f.deliveryDays < 1)) return 'Indiquez un délai de livraison.';
    if (f.kind === 'digital' && !f.fileName?.trim()) return 'Indiquez le fichier livré au client.';
  }
  if (step === 3 && (!f.priceXaf || f.priceXaf < PLATFORM.minPriceXaf)) return `Le prix minimum est de ${PLATFORM.minPriceXaf} FCFA.`;
  return undefined;
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
  const [type, detail] = cardBreadcrumb({
    category: form.category,
    kind: form.kind,
    deliveryDays: form.deliveryDays,
    file: form.kind === 'digital' ? { name: form.fileName ?? '', format: form.fileFormat ?? 'PDF' } : undefined,
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
        <p className="mt-2 text-sm font-semibold text-primary-700 tabular-nums">{form.priceXaf ? formatXaf(form.priceXaf) : '— FCFA'}</p>
      </div>
    </div>
  );
};

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

export interface ListingEditorProps {
  listing?: Listing;
  sellerName: string;
  /** New offer: step by step. Existing offer: every step reachable, saved from the page bar. */
  onSubmit: (input: ListingInput, publish: boolean) => void;
}

export const LISTING_FORM_ID = 'listing-form';

/**
 * Guided offer editor: type → presentation → delivery → cover and price → review,
 * with a live preview of the catalogue card.
 */
export const ListingEditor: React.FC<ListingEditorProps> = ({ listing, sellerName, onSubmit }) => {
  const isNew = !listing;
  const [form, setForm] = useState<ListingInput>(() => fromListing(listing));
  const [featuresText, setFeaturesText] = useState(form.features.join('\n'));
  const [step, setStep] = useState(isNew ? 0 : 1);
  const [reached, setReached] = useState(isNew ? 0 : STEPS.length - 1);
  const [error, setError] = useState<string>();
  const set = <K extends keyof ListingInput>(key: K, value: ListingInput[K]) => setForm((f) => ({ ...f, [key]: value }));
  const input = (): ListingInput => ({ ...form, features: featuresText.split('\n') });

  const categories = CATEGORIES.filter((c) => c.kind === form.kind);
  const chooseKind = (kind: ListingKind) => setForm((f) => ({ ...f, kind, category: CATEGORIES.find((c) => c.kind === kind)!.id }));

  const goTo = (target: number) => {
    // Moving forward checks every step in between.
    for (let s = step; s < target; s += 1) {
      const problem = stepError(s, form);
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
    { ok: form.kind === 'service' ? Boolean(form.deliveryDays) : Boolean(form.fileName?.trim()), label: form.kind === 'service' ? 'Délai de livraison' : 'Fichier livré' },
    { ok: Boolean(form.coverImage.trim()), label: 'Couverture' },
    { ok: form.priceXaf >= PLATFORM.minPriceXaf, label: 'Prix' },
  ];

  return (
    <form
      id={LISTING_FORM_ID}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(input(), true);
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
                {last && isNew && <Button onClick={() => onSubmit(input(), false)}>Enregistrer en brouillon</Button>}
                {last ? (
                  isNew && (
                    <Button type="submit" variant="primary">
                      Publier l’offre
                    </Button>
                  )
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
                    disabled={!isNew}
                    onClick={() => chooseKind(kind)}
                    className={clsx(
                      'text-left rounded-2xl border p-4 transition-colors disabled:cursor-not-allowed',
                      form.kind === kind ? 'border-primary-600 ring-1 ring-primary-600 bg-primary-50/40' : 'border-gray-200 hover:border-gray-300',
                      !isNew && form.kind !== kind && 'opacity-50'
                    )}
                  >
                    <Icon className="w-4 h-4 text-gray-500 mb-2" />
                    <div className="text-sm font-medium text-gray-900">{title}</div>
                    <div className="text-sm text-gray-500 mt-0.5">{text}</div>
                  </button>
                ))}
              </div>
              <Field label="Catégorie">
                {() => (
                  <div className="flex flex-wrap gap-2">
                    {categories.map((c) => (
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
            </>
          )}

          {step === 1 && (
            <>
              <Field label="Titre">{(id) => <Input id={id} value={form.title} onChange={(e) => set('title', e.target.value)} autoFocus />}</Field>
              <Field label="Résumé" hint="Une phrase affichée sous le titre.">
                {(id) => <Input id={id} maxLength={160} value={form.summary} onChange={(e) => set('summary', e.target.value)} />}
              </Field>
              <Field label="Description">
                {(id) => <Textarea id={id} rows={6} value={form.description} onChange={(e) => set('description', e.target.value)} />}
              </Field>
              <Field label="Ce qui est inclus" optional hint="Un élément par ligne.">
                {(id) => <Textarea id={id} rows={4} value={featuresText} onChange={(e) => setFeaturesText(e.target.value)} />}
              </Field>
            </>
          )}

          {step === 2 &&
            (form.kind === 'service' ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Délai de livraison" hint="À compter de l'acceptation.">
                    {(id) => (
                      <Input
                        id={id}
                        type="number"
                        min={1}
                        max={90}
                        trailing="jours"
                        value={form.deliveryDays ?? ''}
                        onChange={(e) => set('deliveryDays', Number(e.target.value))}
                      />
                    )}
                  </Field>
                  <Field label="Retouches incluses">
                    {(id) => (
                      <Select
                        id={id}
                        value={String(form.revisions ?? 0)}
                        options={REVISION_OPTIONS}
                        onChange={(v) => set('revisions', Number(v))}
                        className="w-full"
                      />
                    )}
                  </Field>
                </div>
                <Field label="Brief demandé au client" optional hint="Il y répond en payant : vous avez tout pour démarrer, sans aller-retour.">
                  {() => <BriefQuestionsEditor value={form.briefQuestions ?? []} onChange={(v) => set('briefQuestions', v)} />}
                </Field>
              </>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                <Field label="Fichier livré" className="col-span-2">
                  {(id) => (
                    <Input
                      id={id}
                      placeholder="guide.pdf"
                      value={form.fileName}
                      onChange={(e) => {
                        const name = e.target.value;
                        setForm((f) => ({ ...f, fileName: name, fileFormat: formatFromFileName(name) ?? f.fileFormat }));
                      }}
                    />
                  )}
                </Field>
                <Field label="Format">
                  {(id) => <Select id={id} value={form.fileFormat ?? 'PDF'} options={FORMATS} onChange={(v) => set('fileFormat', v)} className="w-full" />}
                </Field>
              </div>
            ))}

          {step === 3 && (
            <>
              <CoverInput value={form.coverImage} category={form.category} onChange={(v) => set('coverImage', v)} />
              <Field label="Prix" hint={`Minimum ${PLATFORM.minPriceXaf} FCFA.`}>
                {(id) => (
                  <Input
                    id={id}
                    type="number"
                    inputMode="numeric"
                    min={PLATFORM.minPriceXaf}
                    step={100}
                    trailing="FCFA"
                    value={form.priceXaf || ''}
                    onChange={(e) => set('priceXaf', Number(e.target.value))}
                    className="max-w-xs"
                  />
                )}
              </Field>
            </>
          )}

          {step === 4 && (
            <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-6 items-start">
              <Preview form={form} sellerName={sellerName} size="lg" />
              <ul className="space-y-2">
                {checklist.map((c) => (
                  <li key={c.label} className="flex items-center gap-2 text-sm">
                    <span
                      className={clsx(
                        'w-5 h-5 rounded-full flex items-center justify-center',
                        c.ok ? 'bg-accent text-on-accent' : 'bg-gray-100 text-gray-400'
                      )}
                    >
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
