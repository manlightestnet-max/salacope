import type {
  Listing,
  Notification,
  Order,
  OrderEvent,
  OrderMessage,
  PaymentAttempt,
  Review,
  Ticket,
  User,
} from '../src/shared/db/schema.js';
import { isAdminUid } from './compliance.js';

/** Rows -> the app's types. What a viewer may not see is removed here, never in the app. */

export const USER_COLUMNS = `u.id, u.name, u.email, u.phone, u.created_at, u.firebase_uid IS NULL AS guest, u.firebase_uid,
  u.blocked_at, u.blocked_reason, m.store_name, m.headline, m.city, m.verified, m.activated_at, m.lightpay_connection_id,
  m.kyc_status, m.kyc_note, m.suspended_at, m.suspended_reason, m.logo, m.handle,
  (SELECT COALESCE(array_agg(b.blocked_id), '{}') FROM user_blocks b WHERE b.blocker_id = u.id) AS blocks`;
export const USER_FROM = 'users u LEFT JOIN merchants m ON m.user_id = u.id';

const opt = <T>(v: T | null | undefined) => (v === null ? undefined : v);

/** `self`: the signed-in person sees their own e-mail and phone; nobody else does. */
export const userView = (r: any, self: boolean): User => ({
  id: r.id,
  name: r.name,
  email: self ? (r.email ?? '') : '',
  phone: self ? r.phone : '',
  guest: self && r.guest ? true : undefined,
  blocked: self && r.blocked_at ? { at: r.blocked_at, reason: r.blocked_reason ?? '' } : undefined,
  admin: self && isAdminUid(r.firebase_uid) ? true : undefined,
  blocks: self && r.blocks?.length ? r.blocks : undefined,
  createdAt: r.created_at,
  merchant: r.store_name
    ? {
        storeName: r.store_name,
        headline: r.headline,
        city: r.city,
        logo: opt(r.logo),
        handle: opt(r.handle),
        verified: r.verified,
        activatedAt: r.activated_at,
        lightpayConnected: self ? Boolean(r.lightpay_connection_id) : undefined,
        kycStatus: self ? r.kyc_status : undefined,
        kycNote: self ? (r.kyc_note ?? undefined) : undefined,
        suspended: self && r.suspended_at ? { at: r.suspended_at, reason: r.suspended_reason ?? '' } : undefined,
      }
    : undefined,
});

export const listingView = (r: any): Listing => ({
  id: r.id,
  sellerId: r.seller_id,
  kind: r.kind,
  category: r.category,
  title: r.title,
  summary: r.summary,
  description: r.description,
  features: r.features ?? [],
  priceXaf: r.price_xaf,
  compareAtXaf: opt(r.compare_at_xaf),
  galleryCount: r.gallery_count ? Number(r.gallery_count) : undefined,
  coverImage: r.cover_image,
  deliveryDays: opt(r.delivery_days),
  revisions: opt(r.revisions),
  briefQuestions: opt(r.brief_questions),
  file: opt(r.file),
  status: r.status,
  publishedAt: opt(r.published_at),
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const maskPhone = (phone?: string) => (phone ? `${phone.replace(/\d(?=\d{2})/g, '•')}` : '');

/** The seller never sees the buyer's e-mail or phone: they talk through the order chat. */
export const orderView = (r: any, events: OrderEvent[], messages: OrderMessage[], viewerId: string, blocked = false): Order => {
  const seller = r.seller_id === viewerId && r.buyer_id !== viewerId;
  return {
    id: r.id,
    number: r.number,
    listingId: r.listing_id,
    item: r.item,
    sellerId: r.seller_id,
    buyerId: r.buyer_id,
    buyer: seller ? { name: r.buyer.name, email: '', phone: '' } : r.buyer,
    invoice: opt(r.invoice),
    payment: seller ? { ...r.payment, phone: maskPhone(r.payment.phone) } : r.payment,
    brief: r.brief ?? [],
    amounts: r.amounts,
    couponCode: opt(r.coupon_code),
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    dueAt: opt(r.due_at),
    releaseAt: opt(r.release_at),
    delivery: opt(r.delivery),
    revisionsUsed: r.revisions_used,
    extension: opt(r.extension),
    events,
    messages,
    chat: {
      ephemeral: Boolean(r.ephemeral),
      blocked,
      seen: { buyer: opt(r.buyer_seen_at), seller: opt(r.seller_seen_at) },
      read: { buyer: opt(r.buyer_read_at), seller: opt(r.seller_read_at) },
    },
    sellerMeta: seller ? { tags: r.seller_tags ?? [], pinnedAt: opt(r.seller_pinned_at) } : undefined,
  };
};

export const eventView = (r: any): OrderEvent => ({ id: r.id, type: r.type, at: r.at, actorId: r.actor_id, note: opt(r.note) });

export const messageView = (r: any): OrderMessage => ({
  id: r.id,
  authorId: r.author_id,
  body: r.body,
  attachments: r.attachments?.length ? r.attachments : undefined,
  request: r.kind === 'payment_request' ? r.data : undefined,
  at: r.at,
});

export const attemptView = (r: any): PaymentAttempt => ({
  id: r.id,
  code: r.code,
  buyerId: r.buyer_id,
  listingId: r.listing_id,
  sellerId: r.seller_id,
  channel: r.channel ?? 'MTN_MOMO_COG',
  phone: r.phone ?? '',
  amount: r.amount,
  status: r.status,
  failure: opt(r.failure),
  orderId: opt(r.order_id),
  checkoutUrl: opt(r.checkout_url),
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export const ticketView = (r: any, messages: any[]): Ticket => ({
  id: r.id,
  number: r.number,
  userId: r.user_id,
  topic: r.topic,
  subject: r.subject,
  reference: opt(r.reference),
  status: r.status,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  messages: messages.map((m) => ({ id: m.id, authorId: m.author_id, body: m.body, at: m.at })),
});

export const notificationView = (r: any): Notification => ({
  id: r.id,
  userId: r.user_id,
  title: r.title,
  body: opt(r.body),
  href: r.href,
  read: r.read,
  createdAt: r.created_at,
});

/** Buyers are shown by first name and initial ("Aline M."). */
const shortName = (name = '') => {
  const [first, ...rest] = name.trim().split(/\s+/);
  const last = rest.pop();
  return last ? `${first} ${last[0]}.` : first || 'Client';
};

export const reviewView = (r: any): Review => ({
  id: r.id,
  orderId: r.order_id,
  listingId: r.listing_id,
  sellerId: r.seller_id,
  buyerId: r.buyer_id,
  rating: r.rating,
  comment: opt(r.comment),
  createdAt: r.created_at,
  authorName: shortName(r.author_name),
  itemTitle: r.item_title ?? '',
});
