import { Listing, ListingKind } from '@/shared/db';
import { filesOf } from '@/shared/domain';
import { formatDate, formatPrice, plural } from '@/shared/lib';

/**
 * An offer that exists is edited one section at a time, each on its own screen (the step-by-step editor is only for creating it).
 * `step` is the editor step whose checks apply to the section.
 */
export const LISTING_SECTIONS = ['informations', 'description', 'images', 'prix', 'livraison'] as const;
export type ListingSection = (typeof LISTING_SECTIONS)[number];

export const isListingSection = (v: string | undefined): v is ListingSection => LISTING_SECTIONS.includes(v as ListingSection);

export const SECTION_STEP: Record<ListingSection, number | null> = { informations: 1, description: 1, images: null, prix: 3, livraison: 2 };

export const sectionTitle = (section: ListingSection, kind: ListingKind) =>
  ({
    informations: 'Informations',
    description: 'Description',
    images: 'Images',
    prix: 'Prix et promotion',
    livraison: kind === 'service' ? 'Livraison' : 'Fichiers livrés',
  })[section];

export const sectionHelp = (section: ListingSection, kind: ListingKind) =>
  ({
    informations: 'Le titre, le résumé et la catégorie : ce que le client voit en premier dans le catalogue.',
    description: 'Ce que le client lit sur la fiche : la description et les points forts de l’offre.',
    images: 'La couverture du catalogue et les images supplémentaires de la fiche.',
    prix: 'Le prix payé par le client, une offre gratuite, ou une promotion avec compte à rebours.',
    livraison: kind === 'service' ? 'Le délai, les retouches incluses et les questions posées au client.' : 'Les fichiers que le client reçoit au paiement, et ceux que vous offrez en aperçu gratuit.',
  })[section];

/** What each section holds right now, in a line, and whether it is complete (the list shows "Configuré" or "À compléter"). */
export const sectionSummary = (section: ListingSection, l: Listing): { text: string; done: boolean } => {
  switch (section) {
    case 'informations':
      return { text: l.summary || 'Pas de résumé', done: Boolean(l.title.trim() && l.summary.trim()) };
    case 'description':
      return {
        text: [l.description.trim() ? `${l.description.trim().slice(0, 60)}${l.description.trim().length > 60 ? '…' : ''}` : 'Pas de description', l.features.length ? plural(l.features.length, 'point fort') : ''].filter(Boolean).join(' · '),
        done: Boolean(l.description.trim()),
      };
    case 'images':
      return { text: l.coverImage ? `Couverture${l.galleryCount ? ` · ${plural(l.galleryCount, 'image')} en plus` : ''}` : 'Pas de couverture', done: Boolean(l.coverImage) };
    case 'prix': {
      const promo = l.promo ? ` · promotion jusqu’au ${formatDate(l.promo.endsAt)}` : l.compareAtXaf ? ` · ancien prix ${formatPrice(l.compareAtXaf)}` : '';
      return { text: `${formatPrice(l.priceXaf)}${promo}`, done: true };
    }
    case 'livraison':
      return l.kind === 'service'
        ? {
            text: [l.deliveryDays ? plural(l.deliveryDays, 'jour') : '', plural(l.revisions ?? 0, 'retouche'), l.briefQuestions?.length ? plural(l.briefQuestions.length, 'question') : ''].filter(Boolean).join(' · '),
            done: Boolean(l.deliveryDays),
          }
        : (() => {
            const files = filesOf(l.file);
            const samples = files.filter((f) => f.preview).length;
            return {
              text: files.length ? [plural(files.length, 'fichier'), samples ? plural(samples, 'aperçu gratuit', 'aperçus gratuits') : ''].filter(Boolean).join(' · ') : 'Aucun fichier',
              done: files.length > 0 && files.every((f) => f.fileId),
            };
          })();
  }
};
