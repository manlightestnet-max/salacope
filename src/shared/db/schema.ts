import { PaymentChannel } from '../config/payment.js';
import type { KycStatus } from '../domain/kyc.js';

/** Row types of the marketplace database. Features add behaviour on top of these. */

export type Category = 'ebook' | 'formation' | 'template' | 'service' | 'mentorat';

/** `digital`: file / online access delivered on payment. `service`: work delivered by the seller. */
export type ListingKind = 'digital' | 'service';

export interface Merchant {
  storeName: string;
  headline: string;
  city: string;
  verified: boolean;
  activatedAt: string;
  /** Own store only: the LightPay wallet that receives the sales is connected. */
  lightpayConnected?: boolean;
  /** Own store only: identity check (AML/CFT). Offers go online once it is approved. */
  kycStatus?: KycStatus;
  /** Own store only: why the check was refused. */
  kycNote?: string;
  /** Own store only: suspended by Salacope (offers hidden, nothing can be published). */
  suspended?: { at: string; reason: string };
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
  /** Bought without an account (guest profile kept by this browser). */
  guest?: boolean;
  /** Own account only: blocked by Salacope. */
  blocked?: { at: string; reason: string };
  /** Own account only: a Salacope administrator. */
  admin?: boolean;
  merchant?: Merchant;
}

export interface ListingFile {
  name: string;
  format: string;
}

/** A question the seller needs answered before starting a service. */
export interface BriefQuestion {
  id: string;
  label: string;
  required: boolean;
}

export interface Listing {
  id: string;
  sellerId: string;
  kind: ListingKind;
  category: Category;
  title: string;
  summary: string;
  description: string;
  features: string[];
  priceXaf: number;
  coverImage: string;
  /** Services only: committed delivery time, in days. */
  deliveryDays?: number;
  /** Services only: revisions included in the price. */
  revisions?: number;
  /** Services only: answered by the buyer at checkout. */
  briefQuestions?: BriefQuestion[];
  /** Digital only. */
  file?: ListingFile;
  status: 'published' | 'draft';
  /** Last time it went online (followers are told about it). Older rows: `createdAt`. */
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * paid         → buyer paid, service waiting for the seller
 * in_progress  → seller accepted the service
 * delivered    → work/file delivered, funds held until the buyer confirms (or escrow expires)
 * completed    → funds released to the seller
 * cancelled    → cancelled before delivery, buyer refunded
 * disputed     → buyer reported a problem, funds frozen
 */
export type OrderStatus = 'paid' | 'in_progress' | 'delivered' | 'completed' | 'cancelled' | 'disputed';

export type OrderEventType =
  | 'paid'
  | 'accepted'
  | 'delivered'
  | 'completed'
  | 'auto_completed'
  | 'cancelled'
  | 'disputed'
  | 'revision_requested'
  | 'extension_requested'
  | 'extension_accepted'
  | 'extension_declined';

export interface OrderEvent {
  id: string;
  type: OrderEventType;
  at: string;
  /** `null` = done by the platform. */
  actorId: string | null;
  note?: string;
}

export interface Attachment {
  id: string;
  name: string;
  size: string;
  type: string;
  dataUrl?: string;
}

export interface OrderMessage {
  id: string;
  authorId: string;
  body: string;
  attachments?: Attachment[];
  at: string;
}

export interface Order {
  id: string;
  /** Human reference shown to users, e.g. "SC-10482". */
  number: string;
  listingId: string;
  /** Listing as it was when bought — the listing may change later. */
  item: {
    title: string;
    kind: ListingKind;
    category: Category;
    coverImage: string;
    deliveryDays?: number;
    revisions?: number;
    file?: ListingFile;
  };
  sellerId: string;
  buyerId: string;
  buyer: { name: string; email: string; phone: string };
  invoice?: { companyName: string; taxId: string };
  /**
   * `code` is the payment attempt that paid the order (quoted in support tickets), `reference` the
   * LightPay payment. `via`: LightPay wallet or Mobile Money (the payer picks on LightPay).
   */
  payment: { channel?: PaymentChannel; phone?: string; reference: string; code?: string; via?: 'wallet' | 'mobile_money' };
  /** Buyer's answers to the listing's brief questions. */
  brief?: { question: string; answer: string }[];
  amounts: { subtotal: number; discount: number; total: number; fee: number; net: number };
  couponCode?: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  /** Services: expected delivery date, set when the seller accepts. */
  dueAt?: string;
  /** When funds are released automatically if the buyer does nothing. */
  releaseAt?: string;
  delivery?: { note: string; files: Attachment[]; at: string };
  /** Revisions already requested by the buyer. */
  revisionsUsed?: number;
  /** Seller's request for more time; one at a time. */
  extension?: DeadlineExtension;
  events: OrderEvent[];
  messages: OrderMessage[];
}

export interface DeadlineExtension {
  days: number;
  reason: string;
  status: 'pending' | 'accepted' | 'declined';
  requestedAt: string;
  answeredAt?: string;
}

/**
 * One try at paying with Mobile Money. Every attempt gets a unique `code`, shown to the
 * buyer whatever the outcome, so a failed or expired payment can be traced by support.
 */
export type PaymentAttemptStatus = 'pending' | 'succeeded' | 'failed' | 'expired' | 'cancelled';

export type PaymentFailure = 'declined' | 'insufficient_funds' | 'network';

export interface PaymentAttempt {
  id: string;
  /** e.g. "TX-7K4P-92QD". */
  code: string;
  buyerId: string;
  listingId: string;
  sellerId: string;
  channel: PaymentChannel;
  phone: string;
  amount: number;
  status: PaymentAttemptStatus;
  failure?: PaymentFailure;
  /** Set when the payment went through. */
  orderId?: string;
  /** LightPay payment page while the attempt is pending. */
  checkoutUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export type TicketTopic = 'payment' | 'order' | 'account' | 'other';

/** open: waiting for support · answered: support replied · resolved: closed. */
export type TicketStatus = 'open' | 'answered' | 'resolved';

export interface TicketMessage {
  id: string;
  /** `null` = Salacope support. */
  authorId: string | null;
  body: string;
  at: string;
}

export interface Ticket {
  id: string;
  /** e.g. "SUP-1042". */
  number: string;
  userId: string;
  topic: TicketTopic;
  subject: string;
  /** Payment code or order number the ticket is about. */
  reference?: string;
  status: TicketStatus;
  messages: TicketMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body?: string;
  /** Where the notification leads. */
  href: string;
  read: boolean;
  createdAt: string;
}

export interface Favorite {
  userId: string;
  listingId: string;
  createdAt: string;
}

export interface Follow {
  userId: string;
  sellerId: string;
  createdAt: string;
  /** Offers published after this are "new" for the follower. Defaults to `createdAt`. */
  lastSeenAt?: string;
}

/** A buyer's rating of a completed order (one per order). */
export interface Review {
  id: string;
  orderId: string;
  listingId: string;
  sellerId: string;
  buyerId: string;
  /** 1 to 5 stars. */
  rating: number;
  comment?: string;
  createdAt: string;
  /** "Aline M." — buyers are shown by first name and initial. */
  authorName?: string;
  itemTitle?: string;
}

/** Public figures computed by the server (the app only holds its own orders). */
export interface Stats {
  /** Sales per listing (cancelled orders excluded). */
  listings: Record<string, number>;
  sellers: Record<string, { completedSales: number; followers: number; reviews: number; rating: number }>;
}

export interface Database {
  sessionUserId: string | null;
  stats: Stats;
  users: User[];
  listings: Listing[];
  orders: Order[];
  favorites: Favorite[];
  follows: Follow[];
  reviews: Review[];
  paymentAttempts: PaymentAttempt[];
  tickets: Ticket[];
  notifications: Notification[];
}
