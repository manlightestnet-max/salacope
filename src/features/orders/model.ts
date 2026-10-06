import { Order, OrderEventType, OrderStatus } from '@/shared/db';
import { Perspective, hasPendingExtension } from '@/shared/domain';
import { Tone } from '@/shared/ui';
import { ROUTES } from '@/shared/config/routes';
import { formatDate } from '@/shared/lib';
import { PAYMENT_CHANNELS } from '@/shared/config/payment';

export { CONTACT_BLOCKED, MAX_MESSAGE_IMAGES, containsContact, hasPendingExtension, isImageType, perspectiveOf, permissionsFor, revisionsLeft } from '@/shared/domain';
export type { OrderPermissions, Perspective } from '@/shared/domain';

/** How the order was paid (the buyer picks on LightPay). */
export const paymentMethodLabel = (order: Pick<Order, 'payment'>) =>
  order.payment.channel
    ? PAYMENT_CHANNELS[order.payment.channel].label
    : order.payment.via === 'wallet'
      ? 'Wallet LightPay'
      : 'Mobile Money via LightPay';

/** Order page for each party. */
export const orderHref = (order: Pick<Order, 'id'>, perspective: Perspective) =>
  perspective === 'buyer' ? ROUTES.account.order(order.id) : ROUTES.seller.sale(order.id);

export const isLate = (order: Order, now = Date.now()) =>
  order.status === 'in_progress' && Boolean(order.dueAt) && new Date(order.dueAt!).getTime() < now;

/** The seller is working on changes the buyer asked for. */
export const isRevising = (order: Order) =>
  order.status === 'in_progress' && [...order.events].reverse().find((e) => e.type === 'revision_requested' || e.type === 'accepted')?.type === 'revision_requested';

/** Status wording depends on who is looking: the same state means a different next step. */
export const statusDisplay = (order: Order, perspective: Perspective): { label: string; tone: Tone } => {
  switch (order.status) {
    case 'paid':
      return perspective === 'seller' ? { label: 'À accepter', tone: 'warning' } : { label: 'En attente du vendeur', tone: 'info' };
    case 'in_progress':
      if (hasPendingExtension(order)) {
        return perspective === 'buyer' ? { label: 'Délai demandé', tone: 'warning' } : { label: 'Délai en attente', tone: 'info' };
      }
      if (isLate(order)) return { label: 'En retard', tone: 'danger' };
      return isRevising(order) ? { label: 'Retouche en cours', tone: 'info' } : { label: 'En cours', tone: 'info' };
    case 'delivered':
      return perspective === 'buyer' ? { label: 'À valider', tone: 'warning' } : { label: 'Livrée', tone: 'brand' };
    case 'completed':
      return { label: 'Terminée', tone: 'success' };
    case 'cancelled':
      return { label: 'Annulée', tone: 'neutral' };
    case 'disputed':
      return { label: 'Litige', tone: 'danger' };
  }
};

export const EVENT_LABEL: Record<OrderEventType, string> = {
  paid: 'Paiement reçu',
  accepted: 'Commande acceptée',
  delivered: 'Livraison effectuée',
  completed: 'Réception confirmée',
  auto_completed: 'Clôturée automatiquement',
  cancelled: 'Commande annulée, client remboursé',
  disputed: 'Litige ouvert',
  revision_requested: 'Retouche demandée',
  extension_requested: 'Délai supplémentaire demandé',
  extension_accepted: 'Délai supplémentaire accepté',
  extension_declined: 'Délai supplémentaire refusé',
};

/** Orders that wait on this party. */
export const needsAction = (order: Order, perspective: Perspective) =>
  perspective === 'seller'
    ? order.status === 'paid' || order.status === 'in_progress' || order.status === 'disputed'
    : order.status === 'delivered' || (order.status === 'in_progress' && hasPendingExtension(order));

/** What the buyer should expect next, in a few words (purchases table). */
export const buyerFollowUp = (order: Order): { text: string; urgent: boolean } => {
  const digital = order.item.kind === 'digital';
  switch (order.status) {
    case 'paid':
      return { text: 'En attente d’acceptation', urgent: false };
    case 'in_progress':
      if (hasPendingExtension(order)) return { text: 'Répondre à la demande de délai', urgent: true };
      if (isLate(order)) return { text: `En retard (prévue le ${formatDate(order.dueAt)})`, urgent: true };
      return { text: `${isRevising(order) ? 'Retouche' : 'Livraison'} prévue le ${formatDate(order.dueAt)}`, urgent: false };
    case 'delivered':
      return digital
        ? { text: `Fichier disponible · à valider avant le ${formatDate(order.releaseAt)}`, urgent: false }
        : { text: `À valider avant le ${formatDate(order.releaseAt)}`, urgent: true };
    case 'completed':
      return { text: digital ? 'Fichier disponible' : 'Terminée', urgent: false };
    case 'cancelled':
      return { text: 'Remboursée', urgent: false };
    case 'disputed':
      return { text: 'Litige en cours', urgent: true };
  }
};

/** Where the money is, from the seller's point of view. */
export type FundsState = 'escrow' | 'released' | 'refunded' | 'frozen';

export const fundsState = (status: OrderStatus): FundsState =>
  status === 'completed' ? 'released' : status === 'cancelled' ? 'refunded' : status === 'disputed' ? 'frozen' : 'escrow';

/**
 * Seller's work queue, most urgent first. Each order sits in exactly one lane.
 */
export type SellerLane = 'disputed' | 'late' | 'to_accept' | 'revision' | 'to_deliver' | 'waiting_buyer' | 'completed' | 'cancelled';

export const SELLER_LANES: { lane: SellerLane; label: string; todo: boolean }[] = [
  { lane: 'disputed', label: 'Litiges', todo: true },
  { lane: 'late', label: 'En retard', todo: true },
  { lane: 'to_accept', label: 'À accepter', todo: true },
  { lane: 'revision', label: 'Retouches demandées', todo: true },
  { lane: 'to_deliver', label: 'À livrer', todo: true },
  { lane: 'waiting_buyer', label: 'En attente du client', todo: false },
  { lane: 'completed', label: 'Terminées', todo: false },
  { lane: 'cancelled', label: 'Annulées', todo: false },
];

export const sellerLane = (order: Order): SellerLane => {
  switch (order.status) {
    case 'disputed':
      return 'disputed';
    case 'paid':
      return 'to_accept';
    case 'in_progress':
      return isLate(order) ? 'late' : isRevising(order) ? 'revision' : 'to_deliver';
    case 'delivered':
      return 'waiting_buyer';
    case 'completed':
      return 'completed';
    case 'cancelled':
      return 'cancelled';
  }
};

export const ORDER_STATUS_FILTERS: { value: 'all' | 'todo' | 'active' | 'completed' | 'closed'; label: string }[] = [
  { value: 'all', label: 'Toutes' },
  { value: 'todo', label: 'À traiter' },
  { value: 'active', label: 'En cours' },
  { value: 'completed', label: 'Terminées' },
  { value: 'closed', label: 'Annulées' },
];

export type OrderFilter = (typeof ORDER_STATUS_FILTERS)[number]['value'];

/** Date filter of an order history: recent windows, then each year that has orders. */
export type OrderPeriod = 'all' | '30d' | '90d' | `y${number}`;

export const periodOptions = (orders: Pick<Order, 'createdAt'>[]): { value: OrderPeriod; label: string }[] => {
  const years = [...new Set(orders.map((o) => new Date(o.createdAt).getFullYear()))].sort((a, b) => b - a);
  return [
    { value: 'all', label: 'Toutes les dates' },
    { value: '30d', label: '30 derniers jours' },
    { value: '90d', label: '3 derniers mois' },
    ...years.map((y) => ({ value: `y${y}` as OrderPeriod, label: `Année ${y}` })),
  ];
};

export const inPeriod = (order: Pick<Order, 'createdAt'>, period: OrderPeriod, now = Date.now()) => {
  if (period === 'all') return true;
  const at = new Date(order.createdAt);
  if (period === '30d' || period === '90d') return now - at.getTime() <= (period === '30d' ? 30 : 90) * 86_400_000;
  return at.getFullYear() === Number(period.slice(1));
};

export const matchesFilter = (order: Order, filter: OrderFilter, perspective: Perspective) => {
  switch (filter) {
    case 'todo':
      return needsAction(order, perspective);
    case 'active':
      return ['paid', 'in_progress', 'delivered', 'disputed'].includes(order.status);
    case 'completed':
      return order.status === 'completed';
    case 'closed':
      return order.status === 'cancelled';
    default:
      return true;
  }
};
