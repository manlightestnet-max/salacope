import type { Order } from '../db/schema.js';

/** The seller's dashboard figures, computed from their orders and the visits counted by the server (pure: no browser, no database). */

/** Days are local dates written `YYYY-MM-DD`. */
export interface DateRange {
  from: string;
  to: string;
}

/** Views and clicks of one offer on one day, as counted by the server (the seller's own visits never count). */
export interface DayStat {
  listingId: string;
  day: string;
  views: number;
  clicks: number;
}

/** Visits of the store's own page on one day. */
export interface StoreDayStat {
  day: string;
  views: number;
}

/** What the server counted over a period. */
export interface Analytics {
  stats: DayStat[];
  store: StoreDayStat[];
}

const pad = (n: number) => String(n).padStart(2, '0');
export const dayOf = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const at = (day: string) => new Date(`${day}T12:00:00`);
export const addDays = (day: string, n: number): string => {
  const d = at(day);
  d.setDate(d.getDate() + n);
  return dayOf(d);
};
export const daysBetween = (from: string, to: string): number => Math.round((at(to).getTime() - at(from).getTime()) / 86_400_000);

export interface SeriesPoint {
  key: string;
  label: string;
  revenue: number;
  sales: number;
  views: number;
  clicks: number;
}

export interface OfferFigures {
  listingId: string;
  views: number;
  clicks: number;
  sales: number;
  revenue: number;
  /** Sales divided by visits (at most 1), `null` without visits. */
  conversion: number | null;
}

export interface DashboardFigures {
  /** Net revenue: what the sales bring in, commission deducted, cancelled orders left out. */
  revenue: number;
  sales: number;
  averageBasket: number;
  /** Sales of digital products and of services. */
  productsSold: number;
  servicesSold: number;
  customers: number;
  /** Customers whose first purchase from this store falls in the period. */
  newCustomers: number;
  /** Customers who bought from this store at least twice (ever). */
  repeatCustomers: number;
  views: number;
  /** Visits of the store's own page. */
  storeViews: number;
  clicks: number;
  conversion: number | null;
  clickRate: number | null;
  series: SeriesPoint[];
  unit: 'day' | 'month';
  byOffer: OfferFigures[];
  topCustomers: { id: string; name: string; orders: number; spent: number }[];
}

const ratio = (n: number, d: number) => (d > 0 ? Math.min(1, n / d) : null);
const MONTHS_FROM = 92;

/**
 * Everything the dashboard shows for a period. `listingId` narrows sales and visits to one offer; new customers are always
 * judged against the whole store (someone who bought another offer before is not new).
 */
export function dashboardFigures(orders: Order[], stats: DayStat[], range: DateRange, listingId?: string, store: StoreDayStat[] = []): DashboardFigures {
  const live = orders.filter((o) => o.status !== 'cancelled');
  const firstDay = new Map<string, string>();
  const boughtTimes = new Map<string, number>();
  live.forEach((o) => {
    const day = dayOf(new Date(o.createdAt));
    if (!firstDay.has(o.buyerId) || day < firstDay.get(o.buyerId)!) firstDay.set(o.buyerId, day);
    boughtTimes.set(o.buyerId, (boughtTimes.get(o.buyerId) ?? 0) + 1);
  });

  const inRange = (day: string) => day >= range.from && day <= range.to;
  const sold = live.filter((o) => inRange(dayOf(new Date(o.createdAt))) && (!listingId || o.listingId === listingId));
  const seen = stats.filter((s) => inRange(s.day) && (!listingId || s.listingId === listingId));

  const revenue = sold.reduce((sum, o) => sum + o.amounts.net, 0);
  const views = seen.reduce((sum, s) => sum + s.views, 0);
  const clicks = seen.reduce((sum, s) => sum + s.clicks, 0);

  const buyers = new Map<string, { id: string; name: string; orders: number; spent: number }>();
  sold.forEach((o) => {
    const c = buyers.get(o.buyerId) ?? { id: o.buyerId, name: o.buyer.name, orders: 0, spent: 0 };
    c.orders += 1;
    c.spent += o.amounts.total;
    buyers.set(o.buyerId, c);
  });

  // Series: one bar a day, one a month beyond ~3 months.
  const span = daysBetween(range.from, range.to) + 1;
  const unit: 'day' | 'month' = span > MONTHS_FROM ? 'month' : 'day';
  const bucketOf = (day: string) => (unit === 'day' ? day : day.slice(0, 7));
  const labelOf = (key: string) =>
    unit === 'day'
      ? at(key).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
      : new Date(`${key}-15T12:00:00`).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
  const points = new Map<string, SeriesPoint>();
  for (let i = 0; i < span; i += 1) {
    const key = bucketOf(addDays(range.from, i));
    if (!points.has(key)) points.set(key, { key, label: labelOf(key), revenue: 0, sales: 0, views: 0, clicks: 0 });
  }
  sold.forEach((o) => {
    const p = points.get(bucketOf(dayOf(new Date(o.createdAt))));
    if (p) {
      p.revenue += o.amounts.net;
      p.sales += 1;
    }
  });
  seen.forEach((s) => {
    const p = points.get(bucketOf(s.day));
    if (p) {
      p.views += s.views;
      p.clicks += s.clicks;
    }
  });

  const offers = new Map<string, OfferFigures>();
  const offer = (id: string) => {
    let f = offers.get(id);
    if (!f) offers.set(id, (f = { listingId: id, views: 0, clicks: 0, sales: 0, revenue: 0, conversion: null }));
    return f;
  };
  sold.forEach((o) => {
    const f = offer(o.listingId);
    f.sales += 1;
    f.revenue += o.amounts.net;
  });
  seen.forEach((s) => {
    const f = offer(s.listingId);
    f.views += s.views;
    f.clicks += s.clicks;
  });
  offers.forEach((f) => (f.conversion = ratio(f.sales, f.views)));

  return {
    revenue,
    sales: sold.length,
    averageBasket: sold.length ? Math.round(revenue / sold.length) : 0,
    productsSold: sold.filter((o) => o.item.kind === 'digital').length,
    servicesSold: sold.filter((o) => o.item.kind === 'service').length,
    customers: buyers.size,
    newCustomers: [...buyers.keys()].filter((id) => inRange(firstDay.get(id) ?? '')).length,
    repeatCustomers: [...buyers.keys()].filter((id) => (boughtTimes.get(id) ?? 0) >= 2).length,
    views,
    storeViews: store.filter((s) => inRange(s.day)).reduce((sum, s) => sum + s.views, 0),
    clicks,
    conversion: ratio(sold.length, views),
    clickRate: ratio(clicks, views),
    series: [...points.values()],
    unit,
    byOffer: [...offers.values()].sort((a, b) => b.revenue - a.revenue || b.views - a.views),
    topCustomers: [...buyers.values()].sort((a, b) => b.spent - a.spent),
  };
}
