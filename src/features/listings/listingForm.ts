import { useState } from 'react';
import { Listing } from '@/shared/db';
import { PLATFORM, minPriceFor } from '@/shared/config/platform';
import { featuresError, filesError, filesOf, inputFiles, promoError } from '@/shared/domain';
import { ListingInput } from './api';

/** The form of an offer, as the editor (new offer) and each section screen (existing offer) start from it. */
export const fromListing = (l?: Listing): ListingInput => ({
  kind: l?.kind ?? 'digital',
  category: l?.category ?? 'ebook',
  title: l?.title ?? '',
  summary: l?.summary ?? '',
  description: l?.description ?? '',
  features: l?.features ?? [],
  priceXaf: l?.priceXaf ?? 0,
  compareAtXaf: l?.compareAtXaf,
  promoEndsAt: l?.promo?.endsAt,
  coverImage: l?.coverImage ?? '',
  // Existing offer: loaded from the server below; new offer: none yet.
  gallery: l?.galleryCount ? undefined : [],
  deliveryDays: l?.deliveryDays ?? 3,
  revisions: l?.revisions ?? 1,
  briefQuestions: l?.briefQuestions ?? [],
  // Digital: every file delivered, with the free samples marked (the single-file fields are for older apps only).
  files: l?.kind === 'service' ? [] : filesOf(l?.file).filter((f) => f.fileId),
});

/** What is still missing on a step (checked before moving on, and before saving a section). */
export const stepError = (step: number, f: ListingInput, free = false): string | undefined => {
  if (step === 1) {
    if (f.title.trim().length < 8) return 'Le titre doit faire au moins 8 caractères.';
    if (!f.summary.trim()) return 'Ajoutez un résumé en une phrase.';
    const features = featuresError(f.features);
    if (features) return features;
  }
  if (step === 2) {
    if (f.kind === 'service' && (!f.deliveryDays || f.deliveryDays < 1)) return 'Indiquez un délai de livraison.';
    if (f.kind === 'digital') return filesError(inputFiles(f));
  }
  if (step === 3 && free && f.priceXaf !== 0) return 'Une offre gratuite a un prix de 0.';
  if (step === 3 && free && !PLATFORM.freeOffers) return 'Les offres gratuites ne sont pas autorisées pour le moment.';
  if (step === 3 && free && f.compareAtXaf && f.compareAtXaf < minPriceFor(f.kind)) return `Une offre gratuite pendant une promotion repasse à un prix d’au moins ${minPriceFor(f.kind)} FCFA.`;
  if (step === 3 && !free && (!f.priceXaf || f.priceXaf < minPriceFor(f.kind))) return `Le prix minimum est de ${minPriceFor(f.kind)} FCFA.`;
  if (step === 3 && !Number.isInteger(f.priceXaf)) return 'Prix en FCFA entiers, sans virgule ni point.';
  if (step === 3 && f.compareAtXaf && f.compareAtXaf <= f.priceXaf) return 'Le prix barré doit être plus élevé que le prix de vente.';
  if (step === 3) return promoError(f.promoEndsAt, f.compareAtXaf);
  return undefined;
};

/**
 * The state shared by every screen that edits an offer: the form, the "free offer" choice (a price of 0 on a new offer may just be
 * empty) and the "what is included" lines, kept as typed.
 */
export function useListingForm(listing?: Listing) {
  const [form, setForm] = useState<ListingInput>(() => fromListing(listing));
  const [featuresText, setFeaturesText] = useState(form.features.join('\n'));
  const [free, setFree] = useState(Boolean(listing && listing.priceXaf === 0));
  const set = <K extends keyof ListingInput>(key: K, value: ListingInput[K]) => setForm((f) => ({ ...f, [key]: value }));
  const featureList = featuresText.split('\n');
  const input = (): ListingInput => ({ ...form, features: featureList });
  return { form, setForm, set, featuresText, setFeaturesText, featureList, free, setFree, input };
}
