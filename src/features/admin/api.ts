import { request } from '@/shared/api';
import type { KycDocumentKind, KycIdType, KycStatus, RiskLevel } from '@/shared/domain';

/** Salacope administration: raw rows from /api/admin/* (reserved to administrators). */

export interface AdminOverview {
  accounts: number;
  guests: number;
  sellers: number;
  kyc_pending: number;
  kyc_approved: number;
  suspended: number;
  blocked: number;
  listings: number;
  orders: number;
  disputed: number;
  tickets_open: number;
  volume: number;
  commission: number;
}

export interface AdminSellerRow {
  id: string;
  name: string;
  email: string;
  created_at: string;
  blocked_at: string | null;
  store_name: string;
  city: string;
  kyc_status: KycStatus;
  risk: RiskLevel;
  suspended_at: string | null;
  wallet: boolean;
  activated_at: string;
  kyc_submitted_at: string | null;
  orders: number;
  volume: number;
}

export interface AdminKycSubmission {
  id: string;
  full_name: string;
  birth_date: string;
  nationality: string;
  id_type: KycIdType;
  id_number: string;
  id_expires: string | null;
  address: string;
  pep: boolean;
  status: 'pending' | 'approved' | 'rejected';
  note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  documents: KycDocumentKind[];
}

export interface AdminAuditRow {
  id: string;
  admin_email: string;
  action: string;
  detail: Record<string, any>;
  created_at: string;
  target_user_id?: string | null;
  target_name?: string | null;
  target_store?: string | null;
}

export interface AdminSellerDetail {
  seller: AdminSellerRow & {
    phone: string;
    headline: string;
    kyc_note: string | null;
    suspended_reason: string | null;
    blocked_reason: string | null;
  };
  submissions: AdminKycSubmission[];
  listings: { id: string; title: string; category: string; price_xaf: number; status: 'published' | 'draft'; published_at: string | null; sales: number }[];
  stats: { orders: number; disputed: number; cancelled: number; volume: number; commission: number };
  log: AdminAuditRow[];
}

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  created_at: string;
  blocked_at: string | null;
  blocked_reason: string | null;
  store_name: string | null;
  purchases: number;
  spent: number;
}

export interface AdminBanner {
  position: number;
  image: string;
  title: string;
  link: string;
  active: boolean;
  updated_at: string;
}

export type StoragePurpose = 'image' | 'product' | 'chat' | 'kyc';

/** What the admin may see of the storage settings: the keys only as their last four characters. */
export interface AdminStorage {
  keyReady: boolean;
  configured: boolean;
  accountId: string;
  accessKey: string | null;
  secretKey: string | null;
  buckets: Partial<Record<StoragePurpose, { name: string; publicUrl?: string }>>;
  usage: { purpose: StoragePurpose; files: number; bytes: number }[];
}

export type TicketFilter = 'open' | 'answered' | 'resolved' | 'all';

export interface AdminTicketRow {
  id: string;
  number: string;
  topic: 'payment' | 'order' | 'account' | 'other';
  subject: string;
  reference: string | null;
  status: 'open' | 'answered' | 'resolved';
  created_at: string;
  updated_at: string;
  name: string;
  email: string;
  last_message: string | null;
  from_user: number;
}

export interface AdminTicketDetail {
  ticket: Omit<AdminTicketRow, 'last_message' | 'from_user'> & { user_id: string; phone: string; blocked_at: string | null; store_name: string | null };
  messages: { id: string; author_id: string | null; body: string; at: string }[];
  context: {
    attempt: { code: string; status: string; amount: number; channel: string; created_at: string } | null;
    order: { number: string; status: string; total: number; title: string; created_at: string } | null;
  } | null;
}

export type SellerFilter = 'all' | 'pending' | 'approved' | 'unverified' | 'suspended';

const qs = (params: Record<string, string>) => new URLSearchParams(params).toString();

export const adminApi = {
  overview: () => request<{ overview: AdminOverview }>('GET', '/admin/overview').then((r) => r.overview),
  sellers: (filter: SellerFilter, q: string) => request<{ sellers: AdminSellerRow[] }>('GET', `/admin/sellers?${qs({ filter, q })}`).then((r) => r.sellers),
  seller: (id: string) => request<AdminSellerDetail>('GET', `/admin/sellers/${encodeURIComponent(id)}`),
  document: (submissionId: string, kind: KycDocumentKind) =>
    request<{ dataUrl: string }>('GET', `/admin/kyc/${encodeURIComponent(submissionId)}/${kind}`).then((r) => r.dataUrl),
  decideKyc: (id: string, decision: 'approved' | 'rejected', note: string) =>
    request<AdminSellerDetail>('POST', `/admin/sellers/${encodeURIComponent(id)}/kyc`, { decision, note }),
  editSeller: (id: string, input: { name: string; storeName: string; headline: string; city: string; risk: RiskLevel }) =>
    request<AdminSellerDetail>('PATCH', `/admin/sellers/${encodeURIComponent(id)}`, input),
  suspend: (id: string, reason: string) => request<AdminSellerDetail>('POST', `/admin/sellers/${encodeURIComponent(id)}/suspend`, { reason }),
  unsuspend: (id: string, note: string) => request<AdminSellerDetail>('POST', `/admin/sellers/${encodeURIComponent(id)}/unsuspend`, { note }),
  unpublish: (listingId: string, reason: string) =>
    request<AdminSellerDetail>('POST', `/admin/listings/${encodeURIComponent(listingId)}/unpublish`, { reason }),
  users: (filter: 'all' | 'blocked', q: string) => request<{ users: AdminUserRow[] }>('GET', `/admin/users?${qs({ filter, q })}`).then((r) => r.users),
  block: (id: string, reason: string) => request('POST', `/admin/users/${encodeURIComponent(id)}/block`, { reason }),
  unblock: (id: string, note: string) => request('POST', `/admin/users/${encodeURIComponent(id)}/unblock`, { note }),
  banners: () => request<{ banners: AdminBanner[] }>('GET', '/admin/banners').then((r) => r.banners),
  saveBanner: (position: number, input: { image?: string; title: string; link: string; active: boolean }) =>
    request<{ banners: AdminBanner[] }>('PUT', `/admin/banners/${position}`, input).then((r) => r.banners),
  removeBanner: (position: number) => request<{ banners: AdminBanner[] }>('DELETE', `/admin/banners/${position}`).then((r) => r.banners),
  storage: () => request<{ storage: AdminStorage }>('GET', '/admin/storage').then((r) => r.storage),
  saveStorage: (input: {
    accountId: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    buckets: Record<string, { name: string; publicUrl?: string }>;
  }) => request('PUT', '/admin/storage', input),
  storageMigration: () => request<{ remaining: Record<string, number> }>('GET', '/admin/storage/migration').then((r) => r.remaining),
  migrateStorage: () => request<{ migrated: number; failed: number; remaining: Record<string, number> }>('POST', '/admin/storage/migrate'),
  testStorage: () =>
    request<{ results: { purpose: StoragePurpose; ok: boolean; message: string }[] }>('POST', '/admin/storage/test').then((r) => r.results),
  tickets: (filter: TicketFilter, q: string) =>
    request<{ tickets: AdminTicketRow[]; counts: { open: number; answered: number } }>('GET', `/admin/tickets?${qs({ filter, q })}`),
  ticket: (id: string) => request<AdminTicketDetail>('GET', `/admin/tickets/${encodeURIComponent(id)}`),
  replyTicket: (id: string, body: string, resolve: boolean) =>
    request<AdminTicketDetail>('POST', `/admin/tickets/${encodeURIComponent(id)}/reply`, { body, resolve }),
  resolveTicket: (id: string) => request<AdminTicketDetail>('POST', `/admin/tickets/${encodeURIComponent(id)}/resolve`),
  audit: () => request<{ log: AdminAuditRow[] }>('GET', '/admin/audit').then((r) => r.log),
};

/** Log entries in words. */
export const AUDIT_LABEL: Record<string, string> = {
  'kyc.view': 'Document d’identité consulté',
  'kyc.approve': 'Identité validée',
  'kyc.reject': 'Identité refusée',
  'seller.edit': 'Boutique modifiée',
  'seller.suspend': 'Boutique suspendue',
  'seller.unsuspend': 'Boutique réactivée',
  'listing.unpublish': 'Offre retirée',
  'user.block': 'Compte bloqué',
  'user.unblock': 'Compte débloqué',
  'banner.save': 'Emplacement publicitaire enregistré',
  'storage.save': 'Stockage de fichiers configuré',
  'storage.migrate': 'Fichiers existants déplacés vers le stockage',
  'ticket.reply': 'Réponse du support envoyée',
  'ticket.resolve': 'Ticket résolu',
  'banner.remove': 'Emplacement publicitaire retiré',
};
