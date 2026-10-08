import { ROUTES } from '@/shared/config/routes';
import { Category, Listing, ListingKind, User } from '@/shared/db';

export interface CategoryConfig {
  id: Category;
  /** Tab / filter label. */
  label: string;
  /** Singular type shown in card breadcrumbs ("E-book › PDF"). */
  type: string;
  /** Title of the storefront row. */
  section: string;
  kind: ListingKind;
}

/** Order here is the order of tabs and storefront rows. */
export const CATEGORIES: CategoryConfig[] = [
  { id: 'ebook', label: 'E-books & guides', type: 'E-book', section: 'Livres recommandés', kind: 'digital' },
  { id: 'formation', label: 'Formations', type: 'Formation', section: 'Formations', kind: 'digital' },
  { id: 'service', label: 'Services', type: 'Service', section: 'Services freelance', kind: 'service' },
  { id: 'template', label: 'Templates', type: 'Template', section: 'Templates', kind: 'digital' },
  { id: 'mentorat', label: 'Coaching', type: 'Coaching', section: 'Coaching 1:1', kind: 'service' },
];

const categoryConfig = (id: Category) => CATEGORIES.find((c) => c.id === id)!;

export const categoryLabel = (id: Category) => categoryConfig(id)?.label ?? id;

/** "E-book › PDF", "Service › 4 jours", "Formation › En ligne". */
export const cardBreadcrumb = (listing: Pick<Listing, 'category' | 'kind' | 'deliveryDays' | 'file'>): [string, string] => {
  const type = categoryConfig(listing.category)?.type ?? listing.category;
  if (listing.kind === 'service') {
    const days = listing.deliveryDays ?? 3;
    return [type, `${days} jour${days > 1 ? 's' : ''}`];
  }
  const format = listing.file?.format ?? 'Fichier';
  return [type, format.toLowerCase().startsWith('accès') ? 'En ligne' : format];
};

/**
 * Cover shape follows what is sold: books are portrait like a real cover,
 * videos are 16:9, services are landscape and coaching / templates are square.
 */
export type CoverFormat = 'portrait' | 'landscape' | 'video' | 'square';

export const COVER_FORMAT: Record<Category, CoverFormat> = {
  ebook: 'portrait',
  formation: 'video',
  template: 'square',
  service: 'landscape',
  mentorat: 'square',
};

/** Aspect-ratio class per format (literal strings so Tailwind keeps them). */
export const COVER_ASPECT: Record<CoverFormat, string> = {
  portrait: 'aspect-[3/4]',
  landscape: 'aspect-[4/3]',
  video: 'aspect-video',
  square: 'aspect-square',
};

/** Pixel size covers are cropped to on upload. */
export const COVER_SIZE: Record<CoverFormat, [width: number, height: number]> = {
  portrait: [900, 1200],
  landscape: [1200, 900],
  video: [1280, 720],
  square: [1080, 1080],
};

export const COVER_HINT: Record<CoverFormat, string> = {
  portrait: 'Format portrait 3:4, comme une couverture de livre (ex. 900 × 1200 px).',
  landscape: 'Format paysage 4:3 (ex. 1200 × 900 px).',
  video: 'Format vidéo 16:9 (ex. 1280 × 720 px).',
  square: 'Format carré 1:1 (ex. 1080 × 1080 px).',
};

export const KIND_LABEL: Record<ListingKind, string> = {
  digital: 'Produit numérique',
  service: 'Service',
};

/** One-line promise shown next to the price. */
export const deliveryLabel = (listing: Pick<Listing, 'kind' | 'deliveryDays' | 'file'>) => {
  if (listing.kind === 'service') {
    const days = listing.deliveryDays ?? 3;
    return `Livré en ${days} jour${days > 1 ? 's' : ''}`;
  }
  const format = listing.file?.format;
  if (!format) return 'Accès immédiat';
  return format.toLowerCase().startsWith('accès') ? 'Accès en ligne immédiat' : `${format} · accès immédiat`;
};

/** Listing joined with what the storefront needs to display it. */
export interface ListingView {
  listing: Listing;
  seller: User | undefined;
  salesCount: number;
}

export type CatalogSort = 'popular' | 'newest' | 'price_asc' | 'price_desc';

export const SORT_OPTIONS: { value: CatalogSort; label: string }[] = [
  { value: 'popular', label: 'Les plus vendus' },
  { value: 'newest', label: 'Les plus récents' },
  { value: 'price_asc', label: 'Prix croissant' },
  { value: 'price_desc', label: 'Prix décroissant' },
];

export interface CatalogQuery {
  category?: Category;
  text?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: CatalogSort;
}

const matchesText = ({ listing, seller }: ListingView, text: string) => {
  const q = text.toLowerCase().trim();
  if (!q) return true;
  return [listing.title, listing.summary, listing.description, seller?.merchant?.storeName ?? '', ...listing.features].some(
    (v) => v.toLowerCase().includes(q)
  );
};

export const queryListings = (views: ListingView[], query: CatalogQuery): ListingView[] => {
  const filtered = views.filter(
    (v) =>
      (!query.category || v.listing.category === query.category) &&
      matchesText(v, query.text ?? '') &&
      v.listing.priceXaf >= (query.minPrice ?? 0) &&
      v.listing.priceXaf <= (query.maxPrice ?? Infinity)
  );
  const sort = query.sort ?? 'popular';
  return filtered.sort((a, b) => {
    if (sort === 'price_asc') return a.listing.priceXaf - b.listing.priceXaf;
    if (sort === 'price_desc') return b.listing.priceXaf - a.listing.priceXaf;
    if (sort === 'newest') return b.listing.createdAt.localeCompare(a.listing.createdAt);
    return b.salesCount - a.salesCount || b.listing.createdAt.localeCompare(a.listing.createdAt);
  });
};

/** Public address of a store: its own @handle once verified, else its id. */
export const storeHref = (seller: Pick<User, 'id' | 'merchant'>) =>
  seller.merchant?.verified && seller.merchant.handle ? ROUTES.storeHandle(seller.merchant.handle) : ROUTES.store(seller.id);

/**
 * Stand-ins for offers that have not arrived yet: the catalogue draws its real blocks (category titles, card shapes)
 * and these cards, whose values are painted as shimmer. Never sent anywhere, never clickable.
 */
const PENDING = 'pending-';
export const isPlaceholder = (listing: Pick<Listing, 'id'>) => listing.id.startsWith(PENDING);
export const placeholderViews = (categories: Category[] = CATEGORIES.map((c) => c.id), perCategory = 4): ListingView[] =>
  categories.flatMap((category) =>
    Array.from({ length: perCategory }, (_, i) => ({
      listing: {
        id: `${PENDING}${category}-${i}`,
        sellerId: '',
        kind: categoryConfig(category).kind,
        category,
        title: 'Titre de l’offre sur deux lignes',
        summary: '',
        description: '',
        features: [],
        priceXaf: 15000,
        coverImage: '',
        status: 'published' as const,
        createdAt: '',
        updatedAt: '',
      },
      seller: undefined,
      salesCount: 0,
    }))
  );
