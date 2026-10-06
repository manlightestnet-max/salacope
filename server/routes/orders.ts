import { PLATFORM } from '../../src/shared/config/platform.js';
import { ROUTES } from '../../src/shared/config/routes.js';
import type { Attachment } from '../../src/shared/db/schema.js';
import { CONTACT_BLOCKED, containsContact } from '../../src/shared/domain/contact.js';
import { DomainError } from '../../src/shared/domain/errors.js';
import { MAX_MESSAGE_IMAGES, isImageType, permissionsFor } from '../../src/shared/domain/orders.js';
import { priceOrder } from '../../src/shared/domain/pricing.js';
import { Query, json, query, tx } from '../db.js';
import { Context, route } from '../http.js';
import { createGuest } from '../guests.js';
import { newId, paymentCode } from '../ids.js';
import { connectionGone, lightpay } from '../lightpay.js';
import { loadAttempts, loadOrder, loadTickets } from '../load.js';
import { notify } from '../notify.js';
import {
  OrderRow,
  addDays,
  authorize,
  captureFunds,
  formatDay,
  formatXaf,
  freezeFunds,
  refundFunds,
  settleAttempt,
  shapeOf,
  toBuyer,
  toSeller,
  transition,
} from '../orders.js';
import { attemptView } from '../views.js';
import { requireNotBlocked } from './chat.js';
import { SELLABLE_SELLERS } from '../compliance.js';

const text = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);

/** Where LightPay sends the buyer back (must be this site). */
const returnUrl = (ctx: Context, attemptId: string, cancelled = false) =>
  `${ctx.origin}/paiement/retour?tentative=${encodeURIComponent(attemptId)}${cancelled ? '&annule=1' : ''}`;

/**
 * Checkout: checks the offer and the brief, records the attempt (with its code), and opens a
 * LightPay payment page. The money is held by LightPay until the order is validated.
 */
route('POST', '/checkout', async (ctx) => {
  // No account needed: a visitor buys as a guest (the key goes back to their browser only).
  let buyerId = await ctx.viewerId();
  let guest: { id: string; key: string } | null = null;
  if (!buyerId) {
    if (await ctx.identity()) throw new DomainError('Compte introuvable : reconnectez-vous.', 401);
    guest = await createGuest();
    buyerId = guest.id;
  }
  const [listing] = await query(
    `SELECT l.*, m.lightpay_connection_id, l.seller_id IN (${SELLABLE_SELLERS}) AS sellable
     FROM listings l JOIN merchants m ON m.user_id = l.seller_id WHERE l.id = $1`,
    [String(ctx.body.listingId ?? '')]
  );
  // Unverified, suspended or blocked sellers are paid nothing (AML/CFT policy §6).
  if (!listing || listing.status !== 'published' || !listing.sellable) throw new DomainError("Cette offre n'est plus disponible.", 404);
  if (listing.seller_id === buyerId) throw new DomainError('Vous ne pouvez pas acheter votre propre offre.');
  if (!listing.lightpay_connection_id) throw new DomainError('Ce vendeur n’a pas encore activé ses paiements. Réessayez plus tard.', 409);

  const answers: Record<string, string> = ctx.body.brief && typeof ctx.body.brief === 'object' ? ctx.body.brief : {};
  const questions: { id: string; label: string; required: boolean }[] = listing.brief_questions ?? [];
  const missing = questions.find((q) => q.required && !text(answers[q.id], 2000));
  if (missing) throw new DomainError(`Répondez à « ${missing.label} » pour que le vendeur puisse démarrer.`);
  const brief = questions.map((q) => ({ question: q.label, answer: text(answers[q.id], 2000) })).filter((a) => a.answer);
  if (brief.some((a) => containsContact(a.answer))) throw new DomainError(CONTACT_BLOCKED);

  const companyName = text(ctx.body.invoice?.companyName, 120);
  const invoice = companyName ? { companyName, taxId: text(ctx.body.invoice?.taxId, 40) } : null;
  const [buyer] = await query("SELECT name, COALESCE(email, '') AS email, phone FROM users WHERE id = $1", [buyerId]);
  const amounts = priceOrder(listing.price_xaf);
  const item = {
    title: listing.title,
    kind: listing.kind,
    category: listing.category,
    coverImage: listing.cover_image,
    deliveryDays: listing.delivery_days ?? undefined,
    revisions: listing.revisions ?? undefined,
    file: listing.file ?? undefined,
  };

  const attemptId = newId('pay');
  const code = paymentCode();
  // A new request replaces this buyer's attempts still waiting.
  const stale = await query<{ id: string; lightpay_session_id: string | null }>(
    "UPDATE payment_attempts SET status = 'cancelled', updated_at = NOW() WHERE buyer_id = $1 AND status = 'pending' RETURNING id, lightpay_session_id",
    [buyerId]
  );
  stale.forEach((s) => s.lightpay_session_id && lightpay.cancelSession(s.lightpay_session_id).catch(() => undefined));

  await query(
    `INSERT INTO payment_attempts (id, code, buyer_id, listing_id, seller_id, amount, status, details)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7::jsonb)`,
    [attemptId, code, buyerId, listing.id, listing.seller_id, amounts.total, json({ item, buyer, invoice, brief, amounts })]
  );

  try {
    const { session } = await lightpay.createSession({
      idempotencyKey: `salacope:checkout:${attemptId}`,
      amount: amounts.total,
      feeAmount: amounts.fee,
      payee: listing.lightpay_connection_id,
      reference: code,
      description: listing.title,
      returnUrl: returnUrl(ctx, attemptId),
      cancelUrl: returnUrl(ctx, attemptId, true),
      metadata: { attempt_id: attemptId, listing_id: listing.id },
    });
    const [row] = await query(
      'UPDATE payment_attempts SET lightpay_session_id = $2, checkout_url = $3, updated_at = NOW() WHERE id = $1 RETURNING *',
      [attemptId, session.id, session.checkout_url]
    );
    return { attempt: attemptView(row), checkoutUrl: session.checkout_url, guestKey: guest?.key, patch: { paymentAttempts: [attemptView(row), ...(await loadAttempts(buyerId, 'id = ANY($2)', [stale.map((s) => s.id)]))] } };
  } catch (err) {
    await query("UPDATE payment_attempts SET status = 'failed', failure = 'declined', updated_at = NOW() WHERE id = $1", [attemptId]);
    if (connectionGone(err)) {
      // The seller withdrew Salacope's access on LightPay: they must reconnect to sell again.
      await query('UPDATE merchants SET lightpay_connection_id = NULL WHERE user_id = $1 AND lightpay_connection_id = $2', [
        listing.seller_id,
        listing.lightpay_connection_id,
      ]);
      throw new DomainError('Ce vendeur ne peut pas recevoir de paiement pour le moment. Réessayez plus tard.', 409);
    }
    throw err;
  }
});

/** Back from LightPay (or polling): settles the attempt from its session. */
route('POST', '/checkout/:attemptId/refresh', async (ctx) => {
  const buyerId = await ctx.userId();
  const [a] = await query('SELECT id FROM payment_attempts WHERE id = $1 AND buyer_id = $2', [ctx.params.attemptId, buyerId]);
  if (!a) throw new DomainError('Paiement introuvable.', 404);
  await settleAttempt(a.id);
  const [attempt] = await loadAttempts(buyerId, 'id = $2', [a.id]);
  const order = attempt.orderId ? await loadOrder(buyerId, attempt.orderId) : undefined;
  return { attempt, patch: { paymentAttempts: [attempt], orders: order ? [order] : [] } };
});

/** The buyer gave up before paying. */
route('POST', '/checkout/:attemptId/cancel', async (ctx) => {
  const buyerId = await ctx.userId();
  const [a] = await query("SELECT * FROM payment_attempts WHERE id = $1 AND buyer_id = $2", [ctx.params.attemptId, buyerId]);
  if (!a) throw new DomainError('Paiement introuvable.', 404);
  if (a.status === 'pending' && a.lightpay_session_id) {
    // Paid meanwhile? Then it settles into an order instead of being cancelled.
    await settleAttempt(a.id);
    const [again] = await query('SELECT status FROM payment_attempts WHERE id = $1', [a.id]);
    if (again.status === 'pending') {
      await lightpay.cancelSession(a.lightpay_session_id).catch(() => undefined);
      await query("UPDATE payment_attempts SET status = 'cancelled', updated_at = NOW() WHERE id = $1 AND status = 'pending'", [a.id]);
    }
  }
  return { patch: { paymentAttempts: await loadAttempts(buyerId, 'id = $2', [a.id]) } };
});

// ------------------------------------------------------------------ order actions

/** Runs an order action in one transaction and returns the updated order. */
const act = (path: string, action: Parameters<typeof authorize>[3], run: (row: OrderRow, userId: string, ctx: Context, q: Query) => Promise<void>) =>
  route('POST', `/orders/:id/${path}`, async (ctx) => {
    const userId = await ctx.userId();
    await tx(async (q) => {
      const { row } = await authorize(q, ctx.params.id, userId, action);
      await run(row, userId, ctx, q);
    });
    return { patch: { orders: [await loadOrder(userId, ctx.params.id)] } };
  });

act('accept', 'accept', async (row, userId, _ctx, q) => {
  const at = new Date().toISOString();
  const dueAt = addDays(at, row.item.deliveryDays ?? 3);
  await transition(q, row, {
    status: 'in_progress',
    event: 'accepted',
    actorId: userId,
    at,
    set: { due_at: dueAt },
    notices: [toBuyer(row, 'Commande acceptée', `Livraison prévue le ${formatDay(dueAt)}`)],
  });
});

const MAX_ATTACHMENTS_BYTES = 3_000_000;
const cleanAttachments = (list: unknown): Attachment[] => {
  const files = (Array.isArray(list) ? list : []).slice(0, 10).map((f: any) => ({
    id: text(f.id, 60) || newId('att'),
    name: text(f.name, 160) || 'fichier',
    size: text(f.size, 20),
    type: text(f.type, 80),
    dataUrl: typeof f.dataUrl === 'string' ? f.dataUrl : undefined,
  }));
  if (JSON.stringify(files).length > MAX_ATTACHMENTS_BYTES) throw new DomainError('Fichiers trop lourds (3 Mo au total).');
  return files;
};

act('deliver', 'deliver', async (row, userId, ctx, q) => {
  const note = text(ctx.body.note, 4000);
  const files = cleanAttachments(ctx.body.files);
  if (!note && files.length === 0) throw new DomainError('Ajoutez un message ou un fichier à la livraison.');
  if (containsContact(note)) throw new DomainError(CONTACT_BLOCKED);
  const at = new Date().toISOString();
  await transition(q, row, {
    status: 'delivered',
    event: 'delivered',
    actorId: userId,
    at,
    set: {
      delivery: { note, files, at },
      release_at: addDays(at, PLATFORM.serviceValidationDays),
      // A pending request for more time is moot once delivered.
      extension: row.extension?.status === 'pending' ? null : row.extension,
    },
    notices: [toBuyer(row, `Commande ${row.number} livrée`, 'Vérifiez la livraison puis validez-la.')],
  });
});

act('confirm', 'confirm', async (row, userId, _ctx, q) => {
  await captureFunds(row);
  await transition(q, row, {
    status: 'completed',
    event: 'completed',
    actorId: userId,
    set: { release_at: null },
    notices: [toSeller(row, `Paiement libéré · ${row.number}`, `+${formatXaf(row.amounts.net)} sur votre wallet LightPay`)],
  });
});

act('cancel', 'cancel', async (row, userId, ctx, q) => {
  const reason = text(ctx.body.reason, 500);
  if (!reason) throw new DomainError("Indiquez la raison de l'annulation.");
  await refundFunds(row);
  const bySeller = row.seller_id === userId;
  await transition(q, row, {
    status: 'cancelled',
    event: 'cancelled',
    actorId: userId,
    note: reason,
    set: { release_at: null },
    notices: [
      bySeller
        ? toBuyer(row, `Commande ${row.number} annulée`, `Vous êtes remboursé de ${formatXaf(row.amounts.total)}.`)
        : toSeller(row, `Commande ${row.number} annulée par le client`),
    ],
  });
});

const openDispute = async (row: OrderRow, userId: string, reason: string, q: Query) => {
  await freezeFunds(row, reason);
  await transition(q, row, {
    status: 'disputed',
    event: 'disputed',
    actorId: userId,
    note: reason,
    set: { release_at: null },
    notices: [toSeller(row, `Litige ouvert · ${row.number}`, reason)],
  });
};

act('dispute', 'dispute', async (row, userId, ctx, q) => {
  const reason = text(ctx.body.reason, 1000);
  if (!reason) throw new DomainError('Décrivez le problème rencontré.');
  await openDispute(row, userId, reason, q);
});

/** The buyer sends the work back with what to change; the seller gets `revisionDays` to redeliver. */
act('revise', 'revise', async (row, userId, ctx, q) => {
  const note = text(ctx.body.note, 2000);
  if (!note) throw new DomainError('Décrivez ce qui doit être modifié.');
  if (containsContact(note)) throw new DomainError(CONTACT_BLOCKED);
  const at = new Date().toISOString();
  await transition(q, row, {
    status: 'in_progress',
    event: 'revision_requested',
    actorId: userId,
    note,
    at,
    set: { due_at: addDays(at, PLATFORM.revisionDays), release_at: null, revisions_used: row.revisions_used + 1 },
    notices: [toSeller(row, `Retouche demandée · ${row.number}`, note)],
  });
});

act('extend', 'extend', async (row, userId, ctx, q) => {
  const days = Number(ctx.body.days);
  const reason = text(ctx.body.reason, 500);
  if (!Number.isInteger(days) || days < 1 || days > PLATFORM.maxExtensionDays) {
    throw new DomainError(`Choisissez entre 1 et ${PLATFORM.maxExtensionDays} jours.`);
  }
  if (!reason) throw new DomainError('Expliquez pourquoi il vous faut plus de temps.');
  if (containsContact(reason)) throw new DomainError(CONTACT_BLOCKED);
  const at = new Date().toISOString();
  await transition(q, row, {
    status: 'in_progress',
    event: 'extension_requested',
    actorId: userId,
    note: `+${days} j · ${reason}`,
    at,
    set: { extension: { days, reason, status: 'pending', requestedAt: at } },
    notices: [toBuyer(row, `Le vendeur demande ${days} jour${days > 1 ? 's' : ''} de plus`, reason)],
  });
});

act('extension', 'answerExtension', async (row, userId, ctx, q) => {
  const accept = ctx.body.accept === true;
  const extension = row.extension!;
  const at = new Date().toISOString();
  const dueAt = accept && row.due_at ? addDays(row.due_at, extension.days) : row.due_at;
  await transition(q, row, {
    status: 'in_progress',
    event: accept ? 'extension_accepted' : 'extension_declined',
    actorId: userId,
    at,
    set: { due_at: dueAt, extension: { ...extension, status: accept ? 'accepted' : 'declined', answeredAt: at } },
    notices: [
      toSeller(
        row,
        accept ? `Délai accepté · ${row.number}` : `Délai refusé · ${row.number}`,
        accept ? `Nouvelle date de livraison : ${formatDay(dueAt)}` : `Livraison attendue le ${formatDay(row.due_at)}`
      ),
    ],
  });
});

/** Order chat: the only channel between buyer and seller (contact details refused). */
route('POST', '/orders/:id/messages', async (ctx) => {
  const userId = await ctx.userId();
  const body = text(ctx.body.body, 4000);
  const attachments = cleanAttachments(ctx.body.attachments);
  if (!body && attachments.length === 0) throw new DomainError('Message vide.');
  if (attachments.filter((a) => isImageType(a.type)).length > MAX_MESSAGE_IMAGES) {
    throw new DomainError(`${MAX_MESSAGE_IMAGES} images au maximum par message : envoyez les autres dans un message suivant.`);
  }
  if (containsContact(body)) throw new DomainError(CONTACT_BLOCKED);
  await tx(async (q) => {
    const { row, perspective } = await authorize(q, ctx.params.id, userId, 'message');
    if (perspective === 'seller') await requireNotBlocked(q, row);
    const at = new Date().toISOString();
    await q('INSERT INTO order_messages (id, order_id, author_id, body, attachments, at) VALUES ($1, $2, $3, $4, $5::jsonb, $6)', [
      newId('msg'),
      row.id,
      userId,
      body,
      json(attachments),
      at,
    ]);
    await q('UPDATE orders SET updated_at = $2 WHERE id = $1', [row.id, at]);
    const excerpt = body.slice(0, 90) || `${attachments.length} fichier${attachments.length > 1 ? 's' : ''}`;
    await notify(q, [
      perspective === 'buyer'
        ? toSeller(row, `Message de ${row.buyer.name} · ${row.number}`, excerpt)
        : toBuyer(row, `Message du vendeur · ${row.number}`, excerpt),
    ]);
  });
  return { patch: { orders: [await loadOrder(userId, ctx.params.id)] } };
});

/**
 * The buyer reports a problem in one step: while the money is held it opens a dispute
 * (frozen on LightPay); once the order is closed it files a support ticket.
 */
route('POST', '/orders/:id/report', async (ctx) => {
  const userId = await ctx.userId();
  const reason = text(ctx.body.reason, 200);
  const detail = text(ctx.body.detail, 2000);
  if (!reason) throw new DomainError('Choisissez ce qui ne va pas.');
  const note = [reason, detail].filter(Boolean).join(' — ');

  const result = await tx(async (q) => {
    const [row] = await q<OrderRow>('SELECT * FROM orders WHERE id = $1 AND buyer_id = $2 FOR UPDATE', [ctx.params.id, userId]);
    if (!row) throw new DomainError('Commande introuvable.', 404);
    if (permissionsFor(shapeOf(row), 'buyer').dispute) {
      await openDispute(row, userId, note, q);
      return { kind: 'dispute' as const, reference: row.number };
    }
    const [{ n }] = await q<{ n: number }>("SELECT nextval('ticket_number_seq') AS n");
    const ticketId = newId('tkt');
    const at = new Date().toISOString();
    await q("INSERT INTO tickets (id, number, user_id, topic, subject, reference, status, created_at, updated_at) VALUES ($1, $2, $3, 'order', $4, $5, 'open', $6, $6)", [
      ticketId,
      `SUP-${n}`,
      userId,
      reason,
      row.number,
      at,
    ]);
    await q('INSERT INTO ticket_messages (id, ticket_id, author_id, body, at) VALUES ($1, $2, $3, $4, $5)', [newId('tkm'), ticketId, userId, note, at]);
    await q('INSERT INTO ticket_messages (id, ticket_id, author_id, body, at) VALUES ($1, $2, NULL, $3, $4)', [
      newId('tkm'),
      ticketId,
      `Signalement reçu pour la commande ${row.number}. Notre équipe l’examine et vous répond sous 24 h.`,
      at,
    ]);
    await notify(q, [{ userId, title: `Demande SUP-${n} enregistrée`, body: reason, href: ROUTES.account.ticket(ticketId) }]);
    return { kind: 'ticket' as const, reference: `SUP-${n}`, ticketId };
  });
  return {
    result,
    patch: {
      orders: [await loadOrder(userId, ctx.params.id)],
      tickets: result.kind === 'ticket' ? await loadTickets(userId, 'id = $2', [result.ticketId]) : [],
    },
  };
});
