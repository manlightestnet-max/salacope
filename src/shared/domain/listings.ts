import { PLATFORM, minPriceFor } from '../config/platform.js';
import type { BriefQuestion, Category, Listing, ListingFile, ListingFileItem, ListingKind } from '../db/schema.js';
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
  /**
   * End of a promotion shown with a countdown (ISO date). Needs `compareAtXaf`; at that moment the price goes back to
   * `compareAtXaf`. Empty = a lasting reduction (no countdown).
   */
  promoEndsAt?: string;
  coverImage: string;
  /** Extra images after the cover. `undefined`: unchanged (not loaded yet in the editor). */
  gallery?: string[];
  deliveryDays?: number;
  /** Services: revisions included. */
  revisions?: number;
  /** Services: questions answered by the buyer at checkout. */
  briefQuestions?: BriefQuestion[];
  /** The single file of the first versions of the app (a digital product): used when `files` is absent. */
  fileName?: string;
  fileFormat?: string;
  /** The uploaded file (stored), and its size. */
  fileId?: string;
  fileSize?: number;
  /** Digital: every file delivered to the buyer, in order; the seller marks the free samples with `preview`. */
  files?: ListingFileItem[];
}

/** Every file a digital product delivers, whichever shape was stored (the first versions kept a single one). */
export const filesOf = (file?: ListingFile | null): ListingFileItem[] =>
  file?.files?.length ? file.files : file?.name ? [{ name: file.name, format: file.format, fileId: file.fileId, size: file.size }] : [];

/** The files of an offer being saved: those listed, else the single file of the first versions. */
export const inputFiles = (input: Pick<ListingInput, 'files' | 'fileId' | 'fileName' | 'fileFormat' | 'fileSize'>): ListingFileItem[] =>
  input.files ?? (input.fileId ? [{ name: input.fileName ?? '', format: input.fileFormat || 'PDF', fileId: input.fileId, size: input.fileSize }] : []);

/** First problem with the files of a digital product, in words the seller can act on. */
export function filesError(files: ListingFileItem[]): string | undefined {
  if (!files.length) return 'Envoyez le fichier livré au client.';
  if (files.length > PLATFORM.maxProductFiles) return `${PLATFORM.maxProductFiles} fichiers au maximum par produit (vous en avez ${files.length}).`;
  if (files.some((f) => !f.fileId || !f.name?.trim())) return 'Un des fichiers n’est pas encore envoyé : attendez la fin de l’envoi.';
  if (new Set(files.map((f) => f.fileId)).size !== files.length) return 'Le même fichier est ajouté deux fois.';
  if (files.every((f) => f.preview)) return 'Gardez au moins un fichier réservé aux acheteurs : tout ne peut pas être en aperçu gratuit.';
  return undefined;
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

/** What is wrong with a promotion's end date, in words the seller can act on (the same check runs in the editor and on the server). */
export function promoError(endsAt: string | undefined, compareAtXaf: number | undefined, now = Date.now()): string | undefined {
  if (!endsAt) return undefined;
  const end = Date.parse(endsAt);
  if (!Number.isFinite(end)) return 'Date de fin de la promotion invalide.';
  if (!compareAtXaf) return 'Une promotion avec compte à rebours demande l’ancien prix (prix barré).';
  if (end <= now + 60_000) return 'La fin de la promotion doit être dans le futur.';
  if (end > now + PLATFORM.promoMaxDays * 86_400_000) return `Une promotion dure ${PLATFORM.promoMaxDays} jours au plus.`;
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
  const minimum = minPriceFor(input.kind);
  // 0 is a free offer (or free during a promotion): allowed only when the administration lets sellers do it.
  if (input.priceXaf === 0) {
    if (!PLATFORM.freeOffers) throw new DomainError(`Les offres gratuites ne sont pas autorisées : le prix minimum est de ${minimum} FCFA.`);
  } else if (!Number.isFinite(input.priceXaf) || input.priceXaf < minimum) {
    throw new DomainError(`Le prix minimum est de ${minimum} FCFA.`);
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
    // Free during a promotion: the price it goes back to is a real price, so it respects the minimum.
    if (input.priceXaf === 0 && input.compareAtXaf < minimum) throw new DomainError(`Une offre gratuite pendant une promotion repasse à un prix d’au moins ${minimum} FCFA.`);
  }
  if (input.promoEndsAt) {
    const error = promoError(input.promoEndsAt, input.compareAtXaf);
    if (error) throw new DomainError(error);
  }
  // FCFA have no centimes: 100.50 is refused, never rounded behind the seller's back.
  if (!Number.isInteger(input.priceXaf)) throw new DomainError('Prix en FCFA entiers, sans virgule ni point.');
  if (input.kind === 'service' && (!input.deliveryDays || input.deliveryDays < 1 || input.deliveryDays > 90)) {
    throw new DomainError('Indiquez un délai de livraison en jours (1 à 90).');
  }
  // The files a buyer receives are always stored (Cloudflare R2): naming a file is not enough.
  if (input.kind === 'digital') {
    const problem = filesError(inputFiles(input));
    if (problem) throw new DomainError(problem);
  }
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
> & { gallery?: string[]; promoEndsAt?: string };

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
  promoEndsAt: input.compareAtXaf && input.promoEndsAt ? new Date(input.promoEndsAt).toISOString() : undefined,
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
  file: input.kind === 'digital' ? storedFile(inputFiles(input)) : undefined,
});

/**
 * The stored shape of a product's files: the whole list, and, for the first versions of the app, the main file (the first one
 * that is not a free sample) in the fields they read.
 */
function storedFile(files: ListingFileItem[]): ListingFile {
  const items = files.map((f): ListingFileItem => ({
    name: String(f.name ?? '').trim(),
    format: f.format?.trim() || 'PDF',
    ...(f.fileId ? { fileId: String(f.fileId), size: Number(f.size) || undefined } : {}),
    ...(f.preview ? { preview: true } : {}),
  }));
  const main = items.find((f) => !f.preview) ?? items[0];
  return { name: main.name, format: main.format, ...(main.fileId ? { fileId: main.fileId, size: main.size } : {}), files: items };
}

/** Address of a verified store: salacope.online/@handle (lower case, 3 to 30 characters). */
export const HANDLE_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{1,28})[a-z0-9]$/;
const RESERVED_HANDLES = ['salacope', 'admin', 'support', 'aide', 'help', 'api', 'compte', 'dashboard', 'lightpay', 'boutique', 'vendre', 'legal'];

export function validateHandle(value: unknown): string {
  const handle = String(value ?? '').trim().replace(/^@/, '').toLowerCase();
  if (!HANDLE_PATTERN.test(handle)) throw new DomainError('3 à 30 caractères : lettres, chiffres, point, tiret ou tiret bas, sans espace.');
  if (RESERVED_HANDLES.includes(handle)) throw new DomainError('Cette adresse est réservée.');
  return handle;
}
