import { request } from '@/shared/api';
import type { Attachment } from '@/shared/db';
import type { PagedRows } from '@/shared/hooks';

/** Dispute rooms: the conversation of a disputed order between the buyer, the seller and Salacope. */

export interface DisputeMessage {
  id: string;
  /** `null` = Salacope. */
  authorId: string | null;
  role: 'buyer' | 'seller' | 'salacope' | 'accused';
  name: string;
  body: string;
  attachments: Attachment[];
  at: string;
}

export type DisputeOutcome = 'seller' | 'buyer' | 'warning' | 'cleared';

/**
 * kind `order`: buyer, seller and Salacope about a disputed order (`order` is set).
 * kind `conduct`: opened by the administration about an account (`subject` is set), not tied to an order.
 */
export interface DisputeDetail {
  dispute: { id: string; number: number; label: string; kind: 'order' | 'conduct'; title: string | null; status: 'open' | 'resolved'; outcome: DisputeOutcome | null; createdAt: string; closedAt: string | null };
  order: {
    id: string;
    number: string;
    listingId: string;
    title: string;
    kind: string;
    total: number;
    status: string;
    sellerId: string;
    buyerId: string;
    sellerName: string;
    buyerName: string;
    held: boolean;
  } | null;
  subject: { id: string; name: string; isSeller: boolean; warnings: number; warningsHere: number; listing: { id: string; title: string } | null } | null;
  messages: DisputeMessage[];
  me: 'buyer' | 'seller' | 'accused' | 'admin';
}

export interface DisputeRow {
  id: string;
  number: number;
  label: string;
  kind: 'order' | 'conduct';
  status: 'open' | 'resolved';
  outcome: DisputeOutcome | null;
  updated_at: string;
  order_number: string | null;
  title: string;
  counterpart: string;
  side: 'seller' | 'buyer' | 'accused';
  last_body: string | null;
  last_author: string | null;
  unread: number;
}

export interface AdminDisputeRow {
  id: string;
  number: number;
  label: string;
  kind: 'order' | 'conduct';
  status: 'open' | 'resolved';
  outcome: DisputeOutcome | null;
  updated_at: string;
  order_number: string | null;
  title: string;
  total: number | null;
  seller_name: string | null;
  buyer_name: string | null;
  subject_name: string | null;
  last_body: string | null;
  last_from_salacope: boolean;
}

export type AdminDisputeFilter = 'waiting' | 'open' | 'resolved' | 'all';

const qs = (params: Record<string, string>) => new URLSearchParams(params).toString();

export const disputesApi = {
  list: (offset = 0): Promise<PagedRows<DisputeRow>> =>
    request<{ disputes: DisputeRow[]; hasMore: boolean }>('GET', `/disputes?${qs({ offset: String(offset) })}`).then((r) => ({ items: r.disputes, hasMore: r.hasMore, extra: undefined })),
  summary: () => request<{ open: number; total: number; unread: number }>('GET', '/disputes/summary'),
  detail: (id: string) => request<DisputeDetail>('GET', `/disputes/${encodeURIComponent(id)}`),
  send: (id: string, body: string, attachments: Attachment[]) => request<DisputeDetail>('POST', `/disputes/${encodeURIComponent(id)}/messages`, { body, attachments }),

  adminList: (filter: AdminDisputeFilter, q: string, offset = 0): Promise<PagedRows<AdminDisputeRow, { waiting: number; open: number }>> =>
    request<{ disputes: AdminDisputeRow[]; hasMore: boolean; counts: { waiting: number; open: number } }>('GET', `/admin/disputes?${qs({ filter, q, offset: String(offset) })}`).then((r) => ({
      items: r.disputes,
      hasMore: r.hasMore,
      extra: r.counts,
    })),
  adminDetail: (id: string) => request<DisputeDetail>('GET', `/admin/disputes/${encodeURIComponent(id)}`),
  adminSend: (id: string, body: string, attachments: Attachment[]) => request<DisputeDetail>('POST', `/admin/disputes/${encodeURIComponent(id)}/messages`, { body, attachments }),
  /** A dispute about an account's conduct (copied content...), opened by the administration. */
  open: (input: { subjectId: string; listingId?: string; title: string; message: string }) => request<DisputeDetail>('POST', '/admin/disputes', input),
  warn: (id: string, reason: string) => request<DisputeDetail>('POST', `/admin/disputes/${encodeURIComponent(id)}/warn`, { reason }),
  close: (id: string, note: string) => request<DisputeDetail>('POST', `/admin/disputes/${encodeURIComponent(id)}/close`, { note }),
};
