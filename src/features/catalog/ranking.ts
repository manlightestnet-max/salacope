import { Category, Database } from '@/shared/db';
import { ExploreSettings } from '@/shared/config/explore';
import { Taste, fold, nearlySame, stem, words } from '@/shared/lib';
import { ListingView } from './model';

/**
 * The Explorer's ranking. Every signal comes from the database (sales, visits, favourites, store rating, age) or from what
 * this visitor did (kept on their device), never invented; the administration sets how much each one counts. A small
 * daily rotation and a limit per store keep the feed moving and fair: new creators are seen, no store fills the screen.
 */
export interface RankContext {
  settings: ExploreSettings;
  taste: Taste;
  stats: Database['stats'];
  /** The viewer's own choices, stronger than what the device remembers. */
  favorites: Set<string>;
  follows: Set<string>;
  bought: Set<string>;
  /** Changes once a day, and per visitor. */
  seed: string;
  now: number;
}

/** A number between 0 and 1 that is the same for one offer, one visitor and one day. */
const jitter = (seed: string, id: string) => {
  let h = 2166136261;
  for (const c of seed + id) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return ((h >>> 0) % 10_000) / 10_000;
};

const maxOf = (values: number[]) => Math.max(1e-9, ...values);

const offerWords = (v: ListingView) => words(`${v.listing.title} ${v.listing.features.slice(0, 4).join(' ')}`).map(stem);

/** Affinity of the visitor with an offer, 0..1: its category, its store, its words. */
function affinity(v: ListingView, ctx: RankContext, scale: { cat: number; seller: number; word: number }) {
  const { listing } = v;
  const t = ctx.taste;
  const cat = (t.categories[listing.category] ?? 0) / scale.cat;
  const seller = Math.min(1, ((t.sellers[listing.sellerId] ?? 0) + (ctx.follows.has(listing.sellerId) ? scale.seller * 0.6 : 0)) / scale.seller);
  const ws = offerWords(v);
  const word = ws.length ? Math.min(1, ws.reduce((s, w) => s + (t.words[w] ?? 0), 0) / scale.word) : 0;
  return Math.min(1, 0.4 * cat + 0.3 * seller + 0.3 * word);
}

/** Score of each offer, between 0 and 1. */
export function scoreListings(views: ListingView[], ctx: RankContext): Map<string, number> {
  const { weights: w, freshDays } = ctx.settings;
  const signals = ctx.stats.signals ?? {};
  const sales = views.map((v) => Math.log1p(v.salesCount));
  const visits = views.map((v) => Math.log1p(signals[v.listing.id]?.views ?? 0));
  const favs = views.map((v) => Math.log1p(signals[v.listing.id]?.favorites ?? 0));
  const [maxSales, maxVisits, maxFavs] = [maxOf(sales), maxOf(visits), maxOf(favs)];
  const t = ctx.taste;
  const scale = {
    cat: maxOf(Object.values(t.categories).map(Number)),
    seller: maxOf(Object.values(t.sellers)),
    word: maxOf(Object.values(t.words)) * 2,
  };
  const hasTaste = Object.keys(t.categories).length > 0 || ctx.follows.size > 0;
  const total = Object.values(w).reduce((a, b) => a + b, 0) || 1;
  const out = new Map<string, number>();
  views.forEach((v, i) => {
    const { listing } = v;
    const seller = ctx.stats.sellers[listing.sellerId];
    // A store's rating counts with its number of reviews: one 5-star review is no proof (average pulled towards 3.5).
    const rating = seller?.reviews ? ((seller.rating * seller.reviews + 3.5 * 5) / (seller.reviews + 5) - 1) / 4 : 0;
    const ageDays = (ctx.now - new Date(listing.publishedAt ?? listing.createdAt).getTime()) / 86_400_000;
    const fresh = Math.max(0, 1 - ageDays / freshDays);
    let score =
      w.sales * (sales[i] / maxSales) +
      w.views * (visits[i] / maxVisits) +
      w.favorites * (favs[i] / maxFavs) +
      w.rating * rating +
      w.freshness * fresh +
      (hasTaste ? w.taste * affinity(v, ctx, scale) : 0) +
      w.rotation * jitter(ctx.seed, listing.id);
    score /= total;
    // Already theirs (a digital product is bought once), seen lately or already saved: it makes room for the rest.
    if (ctx.bought.has(listing.id) && listing.kind === 'digital') score *= 0.2;
    const seenAt = t.seen[listing.id];
    if (seenAt && ctx.now - seenAt < 2 * 86_400_000) score *= 0.85;
    if (ctx.favorites.has(listing.id)) score *= 0.9;
    out.set(listing.id, score);
  });
  return out;
}

/** No more than `run` offers of one store in a row: the next best offer of another store is pulled up. */
export function spreadSellers(sorted: ListingView[], run: number): ListingView[] {
  const rest = [...sorted];
  const out: ListingView[] = [];
  while (rest.length) {
    const last = out.slice(-run);
    const tooMany = last.length === run && last.every((v) => v.listing.sellerId === last[0].listing.sellerId);
    const i = tooMany ? rest.findIndex((v) => v.listing.sellerId !== last[0].listing.sellerId) : 0;
    out.push(...rest.splice(Math.max(0, i), 1));
  }
  return out;
}

export function rankListings(views: ListingView[], ctx: RankContext, relevance?: Map<string, number>): ListingView[] {
  const scores = scoreListings(views, ctx);
  // A search keeps the best answers first; the ranking only orders answers that are about as good.
  const top = relevance ? maxOf([...relevance.values()]) : 1;
  const final = (v: ListingView) => (relevance ? (relevance.get(v.listing.id) ?? 0) / top + 0.35 * scores.get(v.listing.id)! : scores.get(v.listing.id)!);
  const sorted = [...views].sort((a, b) => final(b) - final(a) || b.listing.createdAt.localeCompare(a.listing.createdAt));
  return relevance ? sorted : spreadSellers(sorted, ctx.settings.sellerRun);
}

// ---------------------------------------------------------------- search

/**
 * How well an offer answers the words typed, 0 = not at all. The whole phrase in the title counts most, then each word in
 * the title, the store, the summary and what is included, then the description. Accents and capitals are ignored, plurals
 * and close forms match ("formations" finds "formation"), one wrong letter is forgiven on long words.
 */
export function textScore(v: ListingView, text: string): number {
  const q = fold(text).trim();
  if (!q) return 1;
  const { listing, seller } = v;
  if (fold(listing.id) === q) return 100;
  const title = fold(listing.title);
  const fields = {
    title: words(listing.title),
    store: words(seller?.merchant?.storeName ?? ''),
    summary: words(`${listing.summary} ${listing.features.join(' ')}`),
    description: words(listing.description),
  };
  const terms = words(q);
  if (!terms.length) return title.includes(q) ? 5 : 0;
  let score = title.includes(q) ? 10 : 0;
  let matched = 0;
  for (const term of terms) {
    const s = stem(term);
    const hit = (list: string[]) => list.some((w) => w.startsWith(s) || stem(w) === s || nearlySame(w, term));
    const best = hit(fields.title) ? 4 : hit(fields.store) ? 3 : hit(fields.summary) ? 2 : hit(fields.description) ? 1 : 0;
    if (best) matched++;
    score += best;
  }
  // Every word should be found somewhere; an offer that matches half of them comes after those that match all.
  if (!matched) return 0;
  return score * (matched / terms.length);
}

/** Offers close to this one (same subject in other words, same category), for "Dans le même esprit". */
export function similarListings(to: ListingView, all: ListingView[], count = 8): ListingView[] {
  const mine = new Set(words(`${to.listing.title} ${to.listing.summary} ${to.listing.features.join(' ')}`).map(stem));
  if (!mine.size) return [];
  return all
    .filter((v) => v.listing.id !== to.listing.id)
    .map((v) => {
      const theirs = words(`${v.listing.title} ${v.listing.summary} ${v.listing.features.join(' ')}`).map(stem);
      const common = theirs.filter((w) => mine.has(w)).length;
      const score = common / Math.sqrt(mine.size * Math.max(1, theirs.length)) + (v.listing.category === to.listing.category ? 0.15 : 0);
      return { v, score, common };
    })
    .filter((x) => x.common > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map((x) => x.v);
}

export interface SearchSuggestion {
  kind: 'offer' | 'store' | 'category';
  label: string;
  /** The words to search (offer, store) or the category id. */
  value: string;
}

/** What to propose while typing: real offer titles and stores that answer the words, then matching categories. */
export function searchSuggestions(all: ListingView[], text: string, categories: { id: Category; label: string }[], count = 7): SearchSuggestion[] {
  const q = fold(text).trim();
  if (q.length < 2) return [];
  const out: SearchSuggestion[] = [];
  const scored = all
    .map((v) => ({ v, s: textScore(v, q) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || b.v.salesCount - a.v.salesCount);
  const stores = new Map<string, string>();
  for (const { v } of scored) {
    if (out.length < count - 2) out.push({ kind: 'offer', label: v.listing.title, value: v.listing.title });
    const name = v.seller?.merchant?.storeName;
    if (name && fold(name).includes(q)) stores.set(v.listing.sellerId, name);
  }
  stores.forEach((name) => {
    if (out.length < count) out.push({ kind: 'store', label: name, value: name });
  });
  categories
    .filter((c) => fold(c.label).includes(q))
    .forEach((c) => {
      if (out.length < count) out.push({ kind: 'category', label: c.label, value: c.id });
    });
  return out;
}
