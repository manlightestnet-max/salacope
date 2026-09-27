import { PLATFORM, computeFee } from '../config/platform';
import { PaymentChannel } from '../config/payment';
import { ROUTES } from '../config/routes';
import {
  BriefQuestion,
  Category,
  Database,
  Listing,
  ListingKind,
  Notification,
  Order,
  OrderEvent,
  OrderStatus,
  PaymentAttempt,
  Review,
  Ticket,
  User,
} from './schema';
import { RAW_CATALOG, RawCatalogItem } from './seed/catalog';

/**
 * Demo dataset: the launch catalogue, its sellers, a few buyers and orders in
 * every lifecycle state so each screen has realistic content.
 * Demo sign-in: jeanpaul@demo.cg (buyer) · grace@demo.cg (seller).
 */

const DAY = 86_400_000;
const ago = (days: number, hours = 0) => new Date(Date.now() - days * DAY - hours * 3_600_000).toISOString();
const plus = (iso: string, days: number) => new Date(new Date(iso).getTime() + days * DAY).toISOString();

const slug = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const KIND_BY_CATEGORY: Record<Category, ListingKind> = {
  ebook: 'digital',
  formation: 'digital',
  template: 'digital',
  service: 'service',
  mentorat: 'service',
};

const FILE_FORMAT: Partial<Record<Category, string>> = { ebook: 'PDF', template: 'ZIP', formation: 'Accès en ligne' };

const parseDeliveryDays = (text: string): number => {
  const days = text.match(/(\d+)\s*jour/);
  if (days) return Number(days[1]);
  const hours = text.match(/(\d+)\s*h/);
  if (hours) return Math.max(1, Math.round(Number(hours[1]) / 24));
  return 3;
};

const sellerIdOf = (name: string) => `usr_${slug(name)}`;

const q = (id: string, label: string, required = true): BriefQuestion => ({ id, label, required });

/** What each demo service needs from the buyer, and the revisions it includes. */
const SERVICE_SETUP: Record<string, { revisions: number; briefQuestions: BriefQuestion[] }> = {
  'prod-02': {
    revisions: 2,
    briefQuestions: [
      q('brand', 'Nom de la marque'),
      q('activity', 'Activité'),
      q('style', 'Couleurs ou style souhaités', false),
      q('examples', 'Exemples que vous aimez (liens)', false),
    ],
  },
  'prod-05': {
    revisions: 1,
    briefQuestions: [
      q('activity', 'Activité et clientèle visée'),
      q('pages', 'Pages souhaitées'),
      q('domain', 'Nom de domaine, si vous en avez un', false),
    ],
  },
  'prod-06': {
    revisions: 0,
    briefQuestions: [q('goal', 'Votre objectif pour la séance'), q('slots', 'Vos disponibilités')],
  },
  'prod-10': {
    revisions: 0,
    briefQuestions: [q('account', 'Lien de votre compte TikTok'), q('budget', 'Budget publicitaire mensuel', false)],
  },
};

/** Stable demo payment codes ("TX-XXXX-XXXX"), same alphabet as real ones. */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const seedCode = (n: number) => {
  let x = n * 2654435761;
  let out = '';
  for (let i = 0; i < 8; i += 1) {
    x = (x * 1103515245 + 12345) % 2147483648;
    out += CODE_ALPHABET[x % CODE_ALPHABET.length];
  }
  return `TX-${out.slice(0, 4)}-${out.slice(4)}`;
};

/** First occurrence of an author defines the seller profile (the raw data has duplicates). */
const buildSellers = (): User[] => {
  const byName = new Map<string, User>();
  const emails = new Set<string>();
  RAW_CATALOG.forEach((item, i) => {
    const { name, role, location, verified } = item.author;
    if (byName.has(name)) return;
    // Launch stores keep their dates; the demo extension spreads over the past months.
    const createdAt = ago(i < 10 ? 120 - i * 7 : 240 - i * 2);
    const first = slug(name).split('-')[0];
    const email = `${emails.has(first) ? slug(name).replace(/-/g, '.') : first}@demo.cg`;
    emails.add(first);
    const phone = `+242 06 ${String(400 + ((i * 13) % 590)).padStart(3, '0')} ${String(10 + ((i * 7) % 90)).padStart(2, '0')} ${String(20 + (i % 80)).padStart(2, '0')}`;
    byName.set(name, {
      id: sellerIdOf(name),
      name,
      email,
      phone,
      createdAt,
      merchant: {
        storeName: name,
        headline: role,
        city: location.split(',')[0],
        payoutChannel: i % 2 === 0 ? 'MTN_MOMO_COG' : 'AIRTEL_COG',
        payoutPhone: phone,
        verified: Boolean(verified),
        activatedAt: createdAt,
      },
    });
  });
  return [...byName.values()];
};

const toListing = (item: RawCatalogItem, i: number): Listing => {
  const kind = KIND_BY_CATEGORY[item.category];
  const createdAt = ago(i < 10 ? 90 - i * 6 : 100 - (i - 10) * 0.9);
  return {
    id: item.id,
    sellerId: sellerIdOf(item.author.name),
    kind,
    category: item.category,
    title: item.title,
    summary: item.shortDesc,
    description: item.description,
    features: item.features,
    priceXaf: item.priceXaf,
    coverImage: item.coverImage,
    deliveryDays: kind === 'service' ? parseDeliveryDays(item.deliveryTime) : undefined,
    ...(kind === 'service' ? SERVICE_SETUP[item.id] ?? { revisions: 1, briefQuestions: [] } : {}),
    file: kind === 'digital' ? { name: `${slug(item.title).slice(0, 40)}.${(FILE_FORMAT[item.category] ?? 'pdf').toLowerCase().includes('accès') ? 'html' : (FILE_FORMAT[item.category] ?? 'pdf').toLowerCase()}`, format: FILE_FORMAT[item.category] ?? 'PDF' } : undefined,
    status: 'published',
    createdAt,
    updatedAt: createdAt,
  };
};

const BUYERS: User[] = [
  { id: 'usr_jean-paul-ngoma', name: 'Jean-Paul Ngoma', email: 'jeanpaul@demo.cg', phone: '+242 06 512 44 81', createdAt: ago(60) },
  { id: 'usr_aline-mbemba', name: 'Aline Mbemba', email: 'aline@demo.cg', phone: '+242 05 733 10 02', createdAt: ago(45) },
  { id: 'usr_christian-okemba', name: 'Christian Okemba', email: 'christian@demo.cg', phone: '+242 06 890 21 57', createdAt: ago(30) },
  { id: 'usr_prisca-loubaki', name: 'Prisca Loubaki', email: 'prisca@demo.cg', phone: '+242 05 604 77 39', createdAt: ago(40) },
];

interface SeedOrderSpec {
  buyer: User;
  listing: Listing;
  channel: PaymentChannel;
  createdAt: string;
  /** Lifecycle steps after payment, with their dates. */
  steps: { type: OrderEvent['type']; at: string; note?: string }[];
  messages?: { fromBuyer: boolean; body: string; at: string }[];
  /** Answers to the listing's brief questions, in order. */
  brief?: string[];
}

let orderSeq = 10_000;

const buildOrder = ({ buyer, listing, channel, createdAt, steps, messages = [], brief = [] }: SeedOrderSpec): Order => {
  orderSeq += 1;
  const total = listing.priceXaf;
  const fee = computeFee(total);
  const events: OrderEvent[] = [{ id: `evt_${orderSeq}_0`, type: 'paid', at: createdAt, actorId: buyer.id }];
  let status = (listing.kind === 'digital' ? 'delivered' : 'paid') as OrderStatus;
  let dueAt: string | undefined;
  let releaseAt: string | undefined = listing.kind === 'digital' ? plus(createdAt, PLATFORM.escrowDays) : undefined;
  let delivery: Order['delivery'];

  if (listing.kind === 'digital') {
    events.push({ id: `evt_${orderSeq}_d`, type: 'delivered', at: createdAt, actorId: null });
  }

  steps.forEach((step, i) => {
    const actorId =
      step.type === 'accepted' || step.type === 'delivered'
        ? listing.sellerId
        : step.type === 'auto_completed'
        ? null
        : buyer.id;
    events.push({ id: `evt_${orderSeq}_${i + 1}`, type: step.type, at: step.at, actorId, note: step.note });
    if (step.type === 'accepted') {
      status = 'in_progress';
      dueAt = plus(step.at, listing.deliveryDays ?? 3);
    }
    if (step.type === 'delivered') {
      status = 'delivered';
      releaseAt = plus(step.at, PLATFORM.escrowDays);
      delivery = { note: step.note ?? '', files: [], at: step.at };
    }
    if (step.type === 'completed' || step.type === 'auto_completed') status = 'completed';
  });

  const last = events[events.length - 1].at;
  return {
    id: `ord_${orderSeq}`,
    number: `SC-${orderSeq}`,
    listingId: listing.id,
    item: {
      title: listing.title,
      kind: listing.kind,
      category: listing.category,
      coverImage: listing.coverImage,
      deliveryDays: listing.deliveryDays,
      revisions: listing.revisions,
      file: listing.file,
    },
    sellerId: listing.sellerId,
    buyerId: buyer.id,
    buyer: { name: buyer.name, email: buyer.email, phone: buyer.phone },
    payment: {
      channel,
      phone: buyer.phone,
      reference: `MP${String(700000 + orderSeq * 37).slice(0, 8)}`,
      code: seedCode(orderSeq),
    },
    brief: (listing.briefQuestions ?? [])
      .map((question, i) => ({ question: question.label, answer: brief[i] ?? '' }))
      .filter((a) => a.answer),
    amounts: { subtotal: total, discount: 0, total, fee, net: total - fee },
    status,
    createdAt,
    updatedAt: last,
    dueAt,
    releaseAt: status === 'completed' ? undefined : releaseAt,
    delivery,
    events,
    messages: messages.map((m, i) => ({
      id: `msg_${orderSeq}_${i}`,
      authorId: m.fromBuyer ? buyer.id : listing.sellerId,
      body: m.body,
      at: m.at,
    })),
  };
};

export const createSeed = (): Database => {
  orderSeq = 10_000;
  const sellers = buildSellers();
  const listings = RAW_CATALOG.map(toListing);
  const byId = (id: string) => listings.find((l) => l.id === id)!;
  const [jeanPaul, aline, christian, prisca] = BUYERS;

  const logo = byId('prod-02'); // Grace — service
  const scripts = byId('prod-09'); // Grace — digital
  const guide = byId('prod-01'); // Dieudonné — digital
  const excel = byId('prod-03'); // Sylvain — digital
  const canva = byId('prod-04'); // Cynthia — digital
  const website = byId('prod-05'); // Arsène — service
  const mentoring = byId('prod-06'); // Mariana — service
  const tiktokCourse = byId('prod-08'); // Basile — digital
  const adsCoaching = byId('prod-10'); // Mariana — service

  const orders: Order[] = [
    buildOrder({
      buyer: prisca,
      listing: scripts,
      channel: 'AIRTEL_COG',
      createdAt: ago(21),
      steps: [{ type: 'auto_completed', at: ago(14) }],
    }),
    buildOrder({
      buyer: jeanPaul,
      listing: excel,
      channel: 'MTN_MOMO_COG',
      createdAt: ago(25),
      steps: [{ type: 'completed', at: ago(24) }],
    }),
    buildOrder({
      buyer: aline,
      listing: logo,
      channel: 'MTN_MOMO_COG',
      createdAt: ago(12),
      brief: ['Mbemba Couture', 'Couture sur mesure', 'Bordeaux et or'],
      steps: [
        { type: 'accepted', at: ago(12, -3) },
        { type: 'delivered', at: ago(8), note: 'Logo final en SVG, PNG et PDF + charte couleurs.' },
        { type: 'completed', at: ago(6) },
      ],
      messages: [
        { fromBuyer: true, body: 'Bonjour, voici le nom : « Mbemba Couture ». Couleurs préférées : bordeaux et or.', at: ago(12, -1) },
        { fromBuyer: false, body: 'Bien reçu, je vous envoie une première proposition sous 48 h.', at: ago(12, -4) },
      ],
    }),
    buildOrder({
      buyer: christian,
      listing: logo,
      channel: 'AIRTEL_COG',
      createdAt: ago(6),
      brief: ['Okemba Conseil', 'Cabinet comptable', 'Bleu marine, sobre'],
      steps: [{ type: 'accepted', at: ago(5) }],
      messages: [
        { fromBuyer: true, body: 'Logo pour mon cabinet comptable « Okemba Conseil ». Style sobre.', at: ago(6) },
        { fromBuyer: false, body: 'Parfait. Avez-vous déjà une couleur de marque ?', at: ago(5) },
        { fromBuyer: true, body: 'Bleu marine si possible.', at: ago(5, -2) },
      ],
    }),
    buildOrder({
      buyer: christian,
      listing: scripts,
      channel: 'MTN_MOMO_COG',
      createdAt: ago(3),
      steps: [],
    }),
    buildOrder({
      buyer: jeanPaul,
      listing: guide,
      channel: 'MTN_MOMO_COG',
      createdAt: ago(4),
      steps: [],
    }),
    buildOrder({
      buyer: jeanPaul,
      listing: logo,
      channel: 'MTN_MOMO_COG',
      createdAt: ago(0, 5),
      brief: ['Ngoma Shop', 'Boutique en ligne de vêtements'],
      steps: [],
      messages: [{ fromBuyer: true, body: 'Bonjour Grace, c’est pour ma boutique en ligne « Ngoma Shop ».', at: ago(0, 5) }],
    }),
    // Older completed orders: they give the catalogue its reviews.
    buildOrder({
      buyer: aline,
      listing: adsCoaching,
      channel: 'MTN_MOMO_COG',
      createdAt: ago(40),
      brief: ['tiktok.com/@alinembemba', '50 000 FCFA'],
      steps: [
        { type: 'accepted', at: ago(40, -2) },
        { type: 'delivered', at: ago(38), note: 'Séance faite en visio : replay et plan d’action envoyés.' },
        { type: 'completed', at: ago(37) },
      ],
    }),
    buildOrder({
      buyer: christian,
      listing: mentoring,
      channel: 'AIRTEL_COG',
      createdAt: ago(28),
      brief: ['Lancer une offre de conseil en ligne', 'En semaine après 18 h'],
      steps: [
        { type: 'accepted', at: ago(28, -3) },
        { type: 'delivered', at: ago(26), note: 'Compte rendu de la séance et feuille de route sur 90 jours.' },
        { type: 'completed', at: ago(25) },
      ],
    }),
    buildOrder({ buyer: christian, listing: excel, channel: 'AIRTEL_COG', createdAt: ago(29), steps: [{ type: 'completed', at: ago(28) }] }),
    buildOrder({ buyer: prisca, listing: excel, channel: 'MTN_MOMO_COG', createdAt: ago(36), steps: [{ type: 'completed', at: ago(35) }] }),
    buildOrder({ buyer: prisca, listing: guide, channel: 'AIRTEL_COG', createdAt: ago(33), steps: [{ type: 'completed', at: ago(32) }] }),
    buildOrder({ buyer: aline, listing: guide, channel: 'MTN_MOMO_COG', createdAt: ago(30), steps: [{ type: 'auto_completed', at: ago(23) }] }),
    buildOrder({ buyer: christian, listing: canva, channel: 'MTN_MOMO_COG', createdAt: ago(27), steps: [{ type: 'completed', at: ago(26) }] }),
    buildOrder({ buyer: prisca, listing: canva, channel: 'AIRTEL_COG', createdAt: ago(20), steps: [{ type: 'completed', at: ago(19) }] }),
    buildOrder({
      buyer: aline,
      listing: website,
      channel: 'MTN_MOMO_COG',
      createdAt: ago(34),
      brief: ['Couture sur mesure, clientes à Brazzaville', 'Accueil, galerie, contact'],
      steps: [
        { type: 'accepted', at: ago(34, -4) },
        { type: 'delivered', at: ago(26), note: 'Site en ligne, accès administrateur envoyés par e-mail.' },
        { type: 'completed', at: ago(25) },
      ],
    }),
    buildOrder({ buyer: prisca, listing: tiktokCourse, channel: 'MTN_MOMO_COG', createdAt: ago(18), steps: [{ type: 'completed', at: ago(17) }] }),
  ];

  /** Ratings left on completed orders. Jean-Paul's Excel order stays unrated so the demo buyer can try it. */
  const RATINGS: [orderId: string, rating: number, comment: string][] = [
    ['ord_10001', 5, 'Des hooks qui marchent vraiment, j’ai eu mes premières ventes en une semaine.'],
    ['ord_10003', 5, 'Très pro, logo livré avant la date prévue.'],
    ['ord_10008', 5, 'Conseils concrets, mes campagnes coûtent déjà moins cher.'],
    ['ord_10009', 5, 'Très à l’écoute, feuille de route claire.'],
    ['ord_10010', 5, 'Les modèles de tableaux de bord m’ont fait gagner des heures.'],
    ['ord_10011', 4, 'Bonne formation, quelques vidéos un peu longues.'],
    ['ord_10012', 4, 'Utile pour les démarches administratives au Congo.'],
    ['ord_10013', 5, 'Clair et adapté au contexte local.'],
    ['ord_10014', 5, 'Modèles modernes, faciles à personnaliser.'],
    ['ord_10015', 5, ''],
    ['ord_10016', 3, 'Site correct, mais livré avec plusieurs jours de retard.'],
    ['ord_10017', 4, ''],
  ];
  const reviews: Review[] = RATINGS.map(([orderId, rating, comment], i) => {
    const order = orders.find((o) => o.id === orderId)!;
    return {
      id: `rev_seed_${i + 1}`,
      orderId,
      listingId: order.listingId,
      sellerId: order.sellerId,
      buyerId: order.buyerId,
      rating,
      comment: comment || undefined,
      createdAt: plus(order.updatedAt, 0.25),
    };
  });

  const grace = sellers.find((s) => s.name === 'Grace Ntsiba')!;

  /** Every demo order was paid by one successful attempt. */
  const paidAttempts: PaymentAttempt[] = orders.map((o) => ({
    id: `pay_${o.id}`,
    code: o.payment.code!,
    buyerId: o.buyerId,
    listingId: o.listingId,
    sellerId: o.sellerId,
    channel: o.payment.channel,
    phone: o.payment.phone,
    amount: o.amounts.total,
    status: 'succeeded',
    orderId: o.id,
    createdAt: o.createdAt,
    updatedAt: o.createdAt,
  }));
  // Jean-Paul's Canva pack: first try timed out, second one refused by the operator.
  const timedOut: PaymentAttempt = {
    id: 'pay_seed_timeout',
    code: seedCode(90_001),
    buyerId: jeanPaul.id,
    listingId: canva.id,
    sellerId: canva.sellerId,
    channel: 'MTN_MOMO_COG',
    phone: jeanPaul.phone,
    amount: canva.priceXaf,
    status: 'expired',
    createdAt: ago(2, 3),
    updatedAt: ago(2, 3),
  };
  const refused: PaymentAttempt = {
    ...timedOut,
    id: 'pay_seed_refused',
    code: seedCode(90_002),
    status: 'failed',
    failure: 'insufficient_funds',
    createdAt: ago(2, 2),
    updatedAt: ago(2, 2),
  };

  const ticket: Ticket = {
    id: 'tkt_seed_1',
    number: 'SUP-1001',
    userId: jeanPaul.id,
    topic: 'payment',
    subject: 'Débité alors que le paiement a expiré',
    reference: timedOut.code,
    status: 'answered',
    createdAt: ago(2, 1),
    updatedAt: ago(1, 20),
    messages: [
      {
        id: 'tkm_seed_1',
        authorId: jeanPaul.id,
        body: 'J’ai validé sur mon téléphone mais la page a expiré. 4 000 FCFA ont quand même été débités de mon compte MTN MoMo.',
        at: ago(2, 1),
      },
      {
        id: 'tkm_seed_2',
        authorId: null,
        body: `Demande reçue. Tentative ${timedOut.code} : paiement expiré, aucune commande créée. Si votre compte a été débité, l’opérateur annule le débit sous 72 h ; nous vérifions de notre côté et vous répondons sous 24 h.`,
        at: ago(2, 1),
      },
      {
        id: 'tkm_seed_3',
        authorId: null,
        body: 'Bonjour Jean-Paul, MTN confirme l’annulation du débit : les 4 000 FCFA apparaîtront sur votre compte sous 72 h. Vous pouvez relancer l’achat quand vous voulez.',
        at: ago(1, 20),
      },
    ],
  };

  const pendingOrder = orders.find((o) => o.id === 'ord_10007')!;
  const notifications: Notification[] = [
    {
      id: 'ntf_seed_1',
      userId: jeanPaul.id,
      title: 'Le support vous a répondu',
      body: `${ticket.number} · ${ticket.subject}`,
      href: ROUTES.account.ticket(ticket.id),
      read: false,
      createdAt: ago(1, 20),
    },
    {
      id: 'ntf_seed_2',
      userId: jeanPaul.id,
      title: 'Votre fichier est disponible',
      body: guide.title,
      href: ROUTES.account.order('ord_10006'),
      read: true,
      createdAt: ago(4),
    },
    {
      id: 'ntf_seed_3',
      userId: grace.id,
      title: `Nouvelle commande ${pendingOrder.number}`,
      body: pendingOrder.item.title,
      href: ROUTES.seller.sale(pendingOrder.id),
      read: false,
      createdAt: pendingOrder.createdAt,
    },
    {
      id: 'ntf_seed_4',
      userId: grace.id,
      title: 'Nouvel avis 5 étoiles',
      body: logo.title,
      href: ROUTES.seller.sale('ord_10003'),
      read: true,
      createdAt: plus(ago(6), 0.25),
    },
  ];

  return {
    version: 4,
    sessionUserId: null,
    users: [...sellers, ...BUYERS],
    listings,
    orders: orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    withdrawals: [
      {
        id: 'wth_seed_1',
        sellerId: grace.id,
        amountXaf: 2000,
        channel: grace.merchant!.payoutChannel,
        phone: grace.merchant!.payoutPhone,
        status: 'paid',
        reference: 'RT-4471',
        createdAt: ago(10),
      },
    ],
    favorites: [{ userId: jeanPaul.id, listingId: 'prod-05', createdAt: ago(2) }],
    follows: [{ userId: jeanPaul.id, sellerId: grace.id, createdAt: ago(3) }],
    reviews,
    paymentAttempts: [refused, timedOut, ...paidAttempts].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    tickets: [ticket],
    notifications,
  };
};

/**
 * One-click demo sign-in. `client@demo.cg` has no history: it is created on first use
 * to walk through a purchase from scratch.
 */
export const DEMO_ACCOUNTS = [
  { email: 'client@demo.cg', label: 'Client test', role: 'Nouveau client', name: 'Client Test', phone: '+242 06 555 00 11' },
  { email: 'jeanpaul@demo.cg', label: 'Jean-Paul Ngoma', role: 'Acheteur', name: 'Jean-Paul Ngoma', phone: '+242 06 512 44 81' },
  { email: 'grace@demo.cg', label: 'Grace Ntsiba', role: 'Vendeuse', name: 'Grace Ntsiba', phone: '' },
];
