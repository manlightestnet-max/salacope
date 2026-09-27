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
  coverImage: string;
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

const LIMITS = { title: 120, summary: 200, description: 5000, feature: 120, features: 12, price: 5_000_000 };

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
  const features = Array.isArray(input.features) ? input.features : [];
  if (features.length > LIMITS.features || features.some((f) => String(f).length > LIMITS.feature)) {
    throw new DomainError('Trop de points forts, ou un point trop long.');
  }
  if (!Number.isFinite(input.priceXaf) || input.priceXaf < PLATFORM.minPriceXaf) {
    throw new DomainError(`Le prix minimum est de ${PLATFORM.minPriceXaf} FCFA.`);
  }
  if (input.priceXaf > LIMITS.price) throw new DomainError('Prix trop élevé.');
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
  'kind' | 'category' | 'title' | 'summary' | 'description' | 'features' | 'priceXaf' | 'coverImage' | 'deliveryDays' | 'revisions' | 'briefQuestions' | 'file'
>;

/** The stored fields of a listing, cleaned. Past orders keep their own snapshot. */
export const listingFields = (input: ListingInput): ListingFields => ({
  kind: input.kind,
  category: input.category,
  title: input.title.trim(),
  summary: input.summary.trim(),
  description: String(input.description ?? '').trim(),
  features: (input.features ?? []).map((f) => String(f).trim()).filter(Boolean),
  priceXaf: Math.round(input.priceXaf),
  coverImage: String(input.coverImage ?? '').trim(),
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
