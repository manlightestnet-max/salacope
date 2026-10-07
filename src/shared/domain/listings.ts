import { PLATFORM } from '../config/platform.js';
import type { BriefQuestion, Category, Listing, ListingKind } from '../db/schema.js';
import { DomainError } from './errors.js';

export interface ListingInput {
  kind: ListingKind;
  category: Category;
  title: string;
  summary: string;
  description: string;
  features: string[];
  priceXaf: number;
  /** Promotion: former price, higher than `priceXaf`; empty = no promotion. */
  compareAtXaf?: number;
  coverImage: string;
  /** Extra images after the cover. `undefined`: unchanged (not loaded yet in the editor). */
  gallery?: string[];
  deliveryDays?: number;
  /** Services: revisions included. */
  revisions?: number;
  /** Services: questions answered by the buyer at checkout. */
  briefQuestions?: BriefQuestion[];
  fileName?: string;
  fileFormat?: string;
}

export const MAX_BRIEF_QUESTIONS = 6;
export const CATEGORY_IDS: Category[] = ['ebook', 'formation', 'service', 'template', 'mentorat'];

/** Shown in the editor (counters, max lengths) and enforced here, on both sides. */
export const LISTING_LIMITS = { title: 120, summary: 200, description: 5000, feature: 120, features: 12, price: 5_000_000, gallery: 5 };
const LIMITS = LISTING_LIMITS;

/** "What's included": one item per non-empty line, as stored. */
export const featureLines = (features: string[] | undefined) => (features ?? []).map((f) => String(f).trim()).filter(Boolean);

/** First problem with the "what's included" items, in words the seller can act on. */
export function featuresError(features: string[] | undefined): string | undefined {
  const lines = featureLines(features);
  if (lines.length > LIMITS.features) return `${LIMITS.features} éléments au maximum dans « Ce qui est inclus » (vous en avez ${lines.length}).`;
  const i = lines.findIndex((f) => f.length > LIMITS.feature);
  if (i >= 0) return `L’élément ${i + 1} de « Ce qui est inclus » fait ${lines[i].length} caractères : ${LIMITS.feature} au maximum.`;
  return undefined;
}

export function validateListing(input: ListingInput): void {
  if (input.kind !== 'digital' && input.kind !== 'service') throw new DomainError('Type d’offre invalide.');
  if (!CATEGORY_IDS.includes(input.category)) throw new DomainError('Catégorie invalide.');
  const title = String(input.title ?? '').trim();
  if (title.length < 8) throw new DomainError('Le titre doit faire au moins 8 caractères.');
  if (title.length > LIMITS.title) throw new DomainError(`Le titre dépasse ${LIMITS.title} caractères.`);
  const summary = String(input.summary ?? '').trim();
  if (!summary) throw new DomainError('Ajoutez un résumé en une phrase.');
  if (summary.length > LIMITS.summary) throw new DomainError(`Le résumé dépasse ${LIMITS.summary} caractères.`);
  if (String(input.description ?? '').length > LIMITS.description) throw new DomainError('La description est trop longue.');
  // Blank lines are not items (they are dropped when saved), so they never count.
  const features = featuresError(Array.isArray(input.features) ? input.features : []);
  if (features) throw new DomainError(features);
  if (!Number.isFinite(input.priceXaf) || input.priceXaf < PLATFORM.minPriceXaf) {
    throw new DomainError(`Le prix minimum est de ${PLATFORM.minPriceXaf} FCFA.`);
  }
  if (input.priceXaf > LIMITS.price) throw new DomainError('Prix trop élevé.');
  if (input.gallery !== undefined) {
    if (!Array.isArray(input.gallery) || input.gallery.length > LIMITS.gallery) throw new DomainError(`${LIMITS.gallery} images en plus de la couverture, au maximum.`);
    if (input.gallery.some((g) => typeof g !== 'string' || !/^(data:image\/(jpeg|png|webp);base64,|https:\/\/)/.test(g))) throw new DomainError('Image de la galerie invalide.');
    if (input.gallery.some((g) => g.length > 400_000)) throw new DomainError('Une image de la galerie est trop lourde.');
  }
  if (input.compareAtXaf) {
    if (!Number.isInteger(input.compareAtXaf) || input.compareAtXaf > LIMITS.price) throw new DomainError('Prix barré invalide.');
    if (input.compareAtXaf <= input.priceXaf) throw new DomainError('Le prix barré doit être plus élevé que le prix de vente.');
  }
  // FCFA have no centimes: 100.50 is refused, never rounded behind the seller's back.
  if (!Number.isInteger(input.priceXaf)) throw new DomainError('Prix en FCFA entiers, sans virgule ni point.');
  if (input.kind === 'service' && (!input.deliveryDays || input.deliveryDays < 1 || input.deliveryDays > 90)) {
    throw new DomainError('Indiquez un délai de livraison en jours (1 à 90).');
  }
  if (input.kind === 'digital' && !input.fileName?.trim()) throw new DomainError('Indiquez le fichier livré au client.');
  if (input.kind === 'service') {
    const revisions = input.revisions ?? 0;
    if (!Number.isInteger(revisions) || revisions < 0 || revisions > PLATFORM.maxRevisions) {
      throw new DomainError(`Les retouches incluses vont de 0 à ${PLATFORM.maxRevisions}.`);
    }
    const questions = (input.briefQuestions ?? []).filter((q) => q.label?.trim());
    if (questions.length > MAX_BRIEF_QUESTIONS) throw new DomainError(`${MAX_BRIEF_QUESTIONS} questions au maximum.`);
    if (questions.some((q) => q.label.trim().length > 120)) throw new DomainError('Une question dépasse 120 caractères.');
  }
}

type ListingFields = Pick<
  Listing,
  'kind' | 'category' | 'title' | 'summary' | 'description' | 'features' | 'priceXaf' | 'compareAtXaf' | 'coverImage' | 'deliveryDays' | 'revisions' | 'briefQuestions' | 'file'
> & { gallery?: string[] };

/** The stored fields of a listing, cleaned. Past orders keep their own snapshot. */
export const listingFields = (input: ListingInput): ListingFields => ({
  kind: input.kind,
  category: input.category,
  title: input.title.trim(),
  summary: input.summary.trim(),
  description: String(input.description ?? '').trim(),
  features: featureLines(input.features),
  priceXaf: Math.round(input.priceXaf),
  compareAtXaf: input.compareAtXaf ? Math.round(input.compareAtXaf) : undefined,
  coverImage: String(input.coverImage ?? '').trim(),
  gallery: input.gallery,
  deliveryDays: input.kind === 'service' ? Math.round(input.deliveryDays!) : undefined,
  revisions: input.kind === 'service' ? input.revisions ?? 0 : undefined,
  briefQuestions:
    input.kind === 'service'
      ? (input.briefQuestions ?? [])
          .filter((q) => q.label?.trim())
          .map((q) => ({ id: String(q.id), label: q.label.trim(), required: Boolean(q.required) }))
      : undefined,
  file: input.kind === 'digital' ? { name: input.fileName!.trim(), format: input.fileFormat?.trim() || 'PDF' } : undefined,
});

/** Address of a verified store: salacope.online/@handle (lower case, 3 to 30 characters). */
export const HANDLE_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{1,28})[a-z0-9]$/;
const RESERVED_HANDLES = ['salacope', 'admin', 'support', 'aide', 'help', 'api', 'compte', 'dashboard', 'lightpay', 'boutique', 'vendre', 'legal'];

export function validateHandle(value: unknown): string {
  const handle = String(value ?? '').trim().replace(/^@/, '').toLowerCase();
  if (!HANDLE_PATTERN.test(handle)) throw new DomainError('3 à 30 caractères : lettres, chiffres, point, tiret ou tiret bas, sans espace.');
  if (RESERVED_HANDLES.includes(handle)) throw new DomainError('Cette adresse est réservée.');
  return handle;
}
