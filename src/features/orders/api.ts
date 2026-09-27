import { createId, formatDate, formatXaf, nowIso } from '@/shared/lib';
import { PLATFORM } from '@/shared/config/platform';
import { PaymentChannel } from '@/shared/config/payment';
import { Attachment, DomainError, Order, OrderEvent, OrderEventType, OrderStatus, Ticket, db, replaceById } from '@/shared/db';
import { NotifyInput, withNotifications } from '@/features/notifications';
import { CONTACT_BLOCKED, containsContact, orderHref, perspectiveOf, permissionsFor, OrderPermissions } from './model';
import { findCouponRate, priceOrder } from './pricing';

const DAY = 86_400_000;
const addDays = (iso: string, days: number) => new Date(new Date(iso).getTime() + days * DAY).toISOString();

const event = (type: OrderEventType, actorId: string | null, note?: string): OrderEvent => ({
  id: createId('evt', 4),
  type,
  at: nowIso(),
  actorId,
  note: note?.trim() || undefined,
});

const getOrder = (orderId: string): Order => {
  const order = db.get().orders.find((o) => o.id === orderId);
  if (!order) throw new DomainError('Commande introuvable.');
  return order;
};

/** Loads the order and checks that `userId` may perform `action` on it. */
const authorize = (orderId: string, userId: string, action: keyof OrderPermissions): Order => {
  const order = getOrder(orderId);
  if (!permissionsFor(order, perspectiveOf(order, userId))[action]) {
    throw new DomainError("Cette action n'est plus possible sur cette commande.");
  }
  return order;
};

/** Notification for the buyer / the seller of an order. */
const toBuyer = (order: Order, title: string, body = order.item.title): NotifyInput => ({
  userId: order.buyerId,
  title,
  body,
  href: orderHref(order, 'buyer'),
});
const toSeller = (order: Order, title: string, body = order.item.title): NotifyInput => ({
  userId: order.sellerId,
  title,
  body,
  href: orderHref(order, 'seller'),
});

/** Changes status, records the event and notifies, in one write. */
const transition = (order: Order, status: OrderStatus, ev: OrderEvent, patch: Partial<Order> = {}, notices: NotifyInput[] = []) =>
  db.update((s) =>
    withNotifications(
      {
        ...s,
        orders: replaceById(s.orders, order.id, (o) => ({
          ...o,
          ...patch,
          status,
          updatedAt: ev.at,
          events: [...o.events, ev],
        })),
      },
      notices
    )
  );

const nextOrderNumber = () => {
  const max = db.get().orders.reduce((m, o) => Math.max(m, Number(o.number.replace(/\D/g, '')) || 0), 10_000);
  return `SC-${max + 1}`;
};

export interface PlaceOrderInput {
  listingId: string;
  buyerId: string;
  buyer: { name: string; email: string; phone: string };
  channel: PaymentChannel;
  paymentPhone: string;
  /** Code of the payment attempt that paid the order. */
  paymentCode?: string;
  couponCode?: string;
  invoice?: { companyName: string; taxId: string };
  /** Answers to the listing's brief questions, by question id. */
  brief?: Record<string, string>;
}

/** Checks the brief before any money moves: every required question needs an answer. */
export function validateBrief(listingId: string, answers: Record<string, string> = {}): void {
  const listing = db.get().listings.find((l) => l.id === listingId);
  const missing = (listing?.briefQuestions ?? []).find((q) => q.required && !answers[q.id]?.trim());
  if (missing) throw new DomainError(`Répondez à « ${missing.label} » pour que le vendeur puisse démarrer.`);
  if (Object.values(answers).some(containsContact)) throw new DomainError(CONTACT_BLOCKED);
}

/**
 * Records a paid order. Digital products are delivered immediately;
 * in every case funds stay in escrow until the buyer confirms or `releaseAt`.
 */
export function placeOrder(input: PlaceOrderInput): Order {
  const listing = db.get().listings.find((l) => l.id === input.listingId);
  if (!listing || listing.status !== 'published') throw new DomainError("Cette offre n'est plus disponible.");
  if (listing.sellerId === input.buyerId) throw new DomainError('Vous ne pouvez pas acheter votre propre offre.');
  if (input.couponCode && findCouponRate(input.couponCode) === undefined) throw new DomainError('Code promo invalide.');
  validateBrief(listing.id, input.brief);

  const now = nowIso();
  const isDigital = listing.kind === 'digital';
  const events: OrderEvent[] = [{ ...event('paid', input.buyerId), at: now }];
  if (isDigital) events.push({ ...event('delivered', null), at: now });

  const order: Order = {
    id: createId('ord'),
    number: nextOrderNumber(),
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
    buyerId: input.buyerId,
    buyer: input.buyer,
    invoice: input.invoice?.companyName.trim() ? input.invoice : undefined,
    payment: {
      channel: input.channel,
      phone: input.paymentPhone,
      reference: `MP${Date.now().toString().slice(-8)}`,
      code: input.paymentCode,
    },
    brief: (listing.briefQuestions ?? [])
      .map((q) => ({ question: q.label, answer: input.brief?.[q.id]?.trim() ?? '' }))
      .filter((a) => a.answer),
    amounts: priceOrder(listing.priceXaf, input.couponCode),
    couponCode: input.couponCode?.trim().toUpperCase() || undefined,
    status: isDigital ? 'delivered' : 'paid',
    createdAt: now,
    updatedAt: now,
    releaseAt: isDigital ? addDays(now, PLATFORM.escrowDays) : undefined,
    events,
    messages: [],
  };

  db.update((s) =>
    withNotifications({ ...s, orders: [order, ...s.orders] }, [
      toSeller(order, `Nouvelle commande ${order.number}`, `${order.item.title} · ${formatXaf(order.amounts.net)}`),
    ])
  );
  return order;
}

export function acceptOrder(orderId: string, userId: string): void {
  const order = authorize(orderId, userId, 'accept');
  const ev = event('accepted', userId);
  const dueAt = addDays(ev.at, order.item.deliveryDays ?? 3);
  transition(order, 'in_progress', ev, { dueAt }, [toBuyer(order, 'Commande acceptée', `Livraison prévue le ${formatDate(dueAt)}`)]);
}

export function deliverOrder(orderId: string, userId: string, note: string, files: Attachment[]): void {
  const order = authorize(orderId, userId, 'deliver');
  if (!note.trim() && files.length === 0) throw new DomainError('Ajoutez un message ou un fichier à la livraison.');
  if (containsContact(note)) throw new DomainError(CONTACT_BLOCKED);
  const ev = event('delivered', userId);
  transition(
    order,
    'delivered',
    ev,
    {
      delivery: { note: note.trim(), files, at: ev.at },
      releaseAt: addDays(ev.at, PLATFORM.escrowDays),
      // A pending request for more time is moot once delivered.
      extension: order.extension?.status === 'pending' ? undefined : order.extension,
    },
    [toBuyer(order, `Commande ${order.number} livrée`, 'Vérifiez la livraison puis validez-la.')]
  );
}

export function confirmOrder(orderId: string, userId: string): void {
  const order = authorize(orderId, userId, 'confirm');
  transition(order, 'completed', event('completed', userId), { releaseAt: undefined }, [
    toSeller(order, `Paiement libéré · ${order.number}`, `+${formatXaf(order.amounts.net)} sur votre solde`),
  ]);
}

export function cancelOrder(orderId: string, userId: string, reason: string): void {
  const order = authorize(orderId, userId, 'cancel');
  if (!reason.trim()) throw new DomainError("Indiquez la raison de l'annulation.");
  const bySeller = perspectiveOf(order, userId) === 'seller';
  transition(order, 'cancelled', event('cancelled', userId, reason), { releaseAt: undefined }, [
    bySeller
      ? toBuyer(order, `Commande ${order.number} annulée`, `Vous êtes remboursé de ${formatXaf(order.amounts.total)}.`)
      : toSeller(order, `Commande ${order.number} annulée par le client`),
  ]);
}

export function disputeOrder(orderId: string, userId: string, reason: string): void {
  const order = authorize(orderId, userId, 'dispute');
  if (!reason.trim()) throw new DomainError('Décrivez le problème rencontré.');
  transition(order, 'disputed', event('disputed', userId, reason), { releaseAt: undefined }, [
    toSeller(order, `Litige ouvert · ${order.number}`, reason.trim()),
  ]);
}

/** The buyer sends the work back with what to change; the seller gets `revisionDays` to redeliver. */
export function requestRevision(orderId: string, userId: string, note: string): void {
  const order = authorize(orderId, userId, 'revise');
  if (!note.trim()) throw new DomainError('Décrivez ce qui doit être modifié.');
  if (containsContact(note)) throw new DomainError(CONTACT_BLOCKED);
  const ev = event('revision_requested', userId, note);
  transition(
    order,
    'in_progress',
    ev,
    { dueAt: addDays(ev.at, PLATFORM.revisionDays), releaseAt: undefined, revisionsUsed: (order.revisionsUsed ?? 0) + 1 },
    [toSeller(order, `Retouche demandée · ${order.number}`, note.trim())]
  );
}


/** The seller asks for more time on a service in progress; the buyer accepts or declines. */
export function requestExtension(orderId: string, userId: string, days: number, reason: string): void {
  const order = authorize(orderId, userId, 'extend');
  if (!Number.isInteger(days) || days < 1 || days > PLATFORM.maxExtensionDays) {
    throw new DomainError(`Choisissez entre 1 et ${PLATFORM.maxExtensionDays} jours.`);
  }
  if (!reason.trim()) throw new DomainError('Expliquez pourquoi il vous faut plus de temps.');
  const ev = event('extension_requested', userId, `+${days} j · ${reason.trim()}`);
  transition(
    order,
    'in_progress',
    ev,
    { extension: { days, reason: reason.trim(), status: 'pending', requestedAt: ev.at } },
    [toBuyer(order, `Le vendeur demande ${days} jour${days > 1 ? 's' : ''} de plus`, reason.trim())]
  );
}

export function answerExtension(orderId: string, userId: string, accept: boolean): void {
  const order = authorize(orderId, userId, 'answerExtension');
  const extension = order.extension!;
  const ev = event(accept ? 'extension_accepted' : 'extension_declined', userId);
  const dueAt = accept && order.dueAt ? addDays(order.dueAt, extension.days) : order.dueAt;
  transition(order, 'in_progress', ev, { dueAt, extension: { ...extension, status: accept ? 'accepted' : 'declined', answeredAt: ev.at } }, [
    toSeller(
      order,
      accept ? `Délai accepté · ${order.number}` : `Délai refusé · ${order.number}`,
      accept ? `Nouvelle date de livraison : ${formatDate(dueAt)}` : `Livraison attendue le ${formatDate(order.dueAt)}`
    ),
  ]);
}

export function sendMessage(orderId: string, userId: string, body: string, attachments: Attachment[] = []): void {
  const order = authorize(orderId, userId, 'message');
  if (!body.trim() && attachments.length === 0) return;
  if (containsContact(body)) throw new DomainError(CONTACT_BLOCKED);
  const message = { id: createId('msg'), authorId: userId, body: body.trim(), attachments, at: nowIso() };
  const excerpt = body.trim().slice(0, 90) || `${attachments.length} fichier${attachments.length > 1 ? 's' : ''}`;
  const notice =
    perspectiveOf(order, userId) === 'buyer'
      ? toSeller(order, `Message de ${order.buyer.name} · ${order.number}`, excerpt)
      : toBuyer(order, `Message du vendeur · ${order.number}`, excerpt);
  db.update((s) =>
    withNotifications(
      {
        ...s,
        orders: replaceById(s.orders, orderId, (o) => ({ ...o, messages: [...o.messages, message], updatedAt: message.at })),
      },
      [notice]
    )
  );
}

/** Releases escrow on delivered orders whose confirmation window has passed. Idempotent. */
export function settleDueOrders(now = Date.now()): void {
  const due = db.get().orders.filter((o) => o.status === 'delivered' && o.releaseAt && new Date(o.releaseAt).getTime() <= now);
  due.forEach((o) => {
    const ev = { ...event('auto_completed', null), at: o.releaseAt! };
    transition(o, 'completed', ev, { releaseAt: undefined }, [
      toSeller(o, `Paiement libéré · ${o.number}`, `+${formatXaf(o.amounts.net)} sur votre solde (validation automatique)`),
    ]);
  });
}

export interface ReportResult {
  /** `dispute`: funds frozen on the order. `ticket`: order already closed, support takes over. */
  kind: 'dispute' | 'ticket';
  /** Reference shown to the buyer (order number or ticket number). */
  reference: string;
  ticketId?: string;
}

/**
 * The buyer reports a problem in one step. While funds are still held it opens a dispute;
 * once the order is closed it files a support ticket. Nothing else to fill in afterwards.
 */
export function reportProblem(orderId: string, userId: string, reason: string, detail = ''): ReportResult {
  const order = getOrder(orderId);
  if (order.buyerId !== userId) throw new DomainError('Commande introuvable.');
  if (!reason.trim()) throw new DomainError('Choisissez ce qui ne va pas.');
  const text = [reason.trim(), detail.trim()].filter(Boolean).join(' — ');

  if (permissionsFor(order, 'buyer').dispute) {
    disputeOrder(orderId, userId, text);
    return { kind: 'dispute', reference: order.number };
  }

  const state = db.get();
  const max = state.tickets.reduce((m, t) => Math.max(m, Number(t.number.replace(/\D/g, '')) || 0), 1000);
  const at = nowIso();
  const ticket: Ticket = {
    id: createId('tkt'),
    number: `SUP-${max + 1}`,
    userId,
    topic: 'order',
    subject: reason.trim(),
    reference: order.number,
    status: 'open',
    createdAt: at,
    updatedAt: at,
    messages: [
      { id: createId('tkm'), authorId: userId, body: text, at },
      { id: createId('tkm'), authorId: null, body: `Signalement reçu pour la commande ${order.number}. Notre équipe l’examine et vous contacte sous 24 h.`, at },
    ],
  };
  db.update((s) => ({ ...s, tickets: [ticket, ...s.tickets] }));
  return { kind: 'ticket', reference: ticket.number, ticketId: ticket.id };
}
