import { request } from '@/shared/api';
import type { Attachment } from '@/shared/db';
import type { PagedRows } from '@/shared/hooks';

/** Dispute rooms: the conversation of a disputed order between the buyer, the seller and Salacope. */

export interface DisputeMessage {
  id: string;
  /** `null` = Salacope. */
  authorId: string | null;
  role: 'buyer' | 'seller' | 'salacope';
  name: string;
  body: string;
  attachments: Attachment[];
  at: string;
}

export interface DisputeDetail {
  dispute: { id: string; number: number; label: string; status: 'open' | 'resolved'; outcome: 'seller' | 'buyer' | null; createdAt: string; closedAt: string | null };
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
  };
  messages: DisputeMessage[];
  me: 'buyer' | 'seller' | 'admin';
}

export interface DisputeRow {
  id: string;
  number: number;
  label: string;
  status: 'open' | 'resolved';
  outcome: 'seller' | 'buyer' | null;
  updated_at: string;
  order_number: string;
  title: string;
  counterpart: string;
  side: 'seller' | 'buyer';
  last_body: string | null;
  last_author: string | null;
  unread: number;
}

export interface AdminDisputeRow {
  id: string;
  number: number;
  label: string;
  status: 'open' | 'resolved';
  outcome: 'seller' | 'buyer' | null;
  updated_at: string;
  order_number: string;
  title: string;
  total: number;
  seller_name: string;
  buyer_name: string;
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
};
