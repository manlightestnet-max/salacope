export type ProductCategory = 'all' | 'ebook' | 'formation' | 'service' | 'template' | 'mentorat';

export interface Author {
  name: string;
  avatar: string;
  role: string;
  location: string;
  verified?: boolean;
}

export interface Product {
  id: string;
  title: string;
  shortDesc: string;
  description: string;
  category: ProductCategory;
  categoryLabel: string;
  priceXaf: number; // Prix en FCFA (XAF) pour la République du Congo
  priceAoa?: number; // Equivalent indicatif en Kwanza
  author: Author;
  rating: number;
  reviewsCount: number;
  salesCount: number;
  coverImage: string;
  badge?: string;
  deliveryType: 'instant_download' | 'service_delivery' | 'online_access';
  deliveryTime: string;
  features: string[];
}

export interface OrderPayload {
  productId: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  paymentChannel: 'MTN_MOMO_COG' | 'AIRTEL_COG';
}

export interface CreatorApplicationPayload {
  name: string;
  email: string;
  phone: string;
  city: string;
  category: string;
  portfolioOrDescription: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export type UserRole = 'user' | 'freelancer' | 'seller';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  role: UserRole;
  createdAt: string;
}

export interface CreatorFollow {
  creatorId: string;
  creatorName: string;
  creatorRole: string;
  creatorAvatar?: string;
  creatorLocation?: string;
  followedAt: string;
}

export interface PurchaseItem {
  id: string;
  type: 'product' | 'service';
  title: string;
  creatorName: string;
  priceXaf: number;
  paymentChannel: 'MTN_MOMO_COG' | 'AIRTEL_COG';
  phone: string;
  purchasedAt: string;
  status: 'COMPLETED' | 'PENDING' | 'IN_PROGRESS';
  downloadUrl?: string;
  deliveryTime?: string;
  fileType?: string;
  coverImage?: string;
}

export interface ServiceItem {
  id: string;
  creatorId: string;
  serviceName: string;
  description: string;
  category: string;
  images: string[];
  priceXaf: number;
  deliveryDays: string | number;
  status: 'ACTIVE' | 'DRAFT' | 'PAUSED';
  createdAt: string;
}

export interface DigitalProductItem {
  id: string;
  sellerId: string;
  title: string;
  fileType: 'PDF' | 'DOC' | 'DOCX' | 'ZIP' | 'TEMPLATE' | 'AUTRE';
  fileName: string;
  fileSize?: string;
  coverImage: string;
  description: string;
  priceXaf: number;
  category: string;
  downloadsCount: number;
  status: 'ACTIVE' | 'DRAFT';
  createdAt: string;
}

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'ACCEPTED'
  | 'PROCESSING'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'DISPUTED';

export interface OrderAttachment {
  id: string;
  name: string;
  size: string;
  type: string;
  url?: string;
  dataUrl?: string;
}

export interface OrderMessageReaction {
  emoji: string;
  count: number;
  users: string[];
}

export interface OrderMessage {
  id: string;
  senderRole: 'client' | 'seller' | 'freelancer' | 'system';
  senderName: string;
  content: string;
  attachments?: OrderAttachment[];
  reactions?: OrderMessageReaction[];
  createdAt: string;
}

export interface OrderTimelineEvent {
  id: string;
  type: 'CREATED' | 'PAID' | 'ACCEPTED' | 'PROCESSING' | 'MESSAGE' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED' | 'DISPUTED';
  title: string;
  description?: string;
  timestamp: string;
  actor: 'client' | 'seller' | 'freelancer' | 'system';
}

export interface OrderDelivery {
  note: string;
  deliveredAt: string;
  files: OrderAttachment[];
  revisionNumber?: number;
}

export interface OrderItem {
  id: string;
  itemType: 'product' | 'service';
  itemId: string;
  itemTitle: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  priceXaf: number;
  paymentChannel: 'MTN_MOMO_COG' | 'AIRTEL_COG';
  status: OrderStatus;
  createdAt: string;
  deliveryTime?: string;
  lastActivityAt?: string;
  timeline?: OrderTimelineEvent[];
  messages?: OrderMessage[];
  delivery?: OrderDelivery;
  brief?: {
    description?: string;
    instructions?: string;
    attachments?: OrderAttachment[];
  };
  digitalDelivery?: {
    fileName?: string;
    fileType?: string;
    fileSize?: string;
    deliveredAt?: string;
    downloadCount?: number;
    downloadUrl?: string;
  };
}

export interface WithdrawalRequest {
  id: string;
  amountXaf: number;
  channel: 'MTN_MOMO_COG' | 'AIRTEL_COG';
  phoneNumber: string;
  status: 'PENDING' | 'PROCESSED' | 'REJECTED';
  createdAt: string;
}
