import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  UserAccount,
  UserRole,
  CreatorFollow,
  PurchaseItem,
  ServiceItem,
  DigitalProductItem,
  OrderItem,
  OrderStatus,
  OrderAttachment,
  OrderMessage,
  OrderTimelineEvent,
  OrderDelivery,
  WithdrawalRequest,
} from '../types';

interface AuthContextType {
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;

  user: UserAccount;
  updateUser: (data: Partial<UserAccount>) => void;
  upgradeRole: (newRole: 'freelancer' | 'seller') => void;
  switchRole: (newRole: UserRole) => void;

  // Favorites
  favorites: string[];
  toggleFavorite: (productId: string) => void;
  isFavorite: (productId: string) => boolean;

  // Following
  following: CreatorFollow[];
  followCreator: (creator: Omit<CreatorFollow, 'followedAt'>) => void;
  unfollowCreator: (creatorId: string) => void;
  isFollowing: (creatorId: string) => boolean;

  // Client Purchases
  purchases: PurchaseItem[];
  addPurchase: (purchase: Omit<PurchaseItem, 'id' | 'purchasedAt'>) => PurchaseItem;

  // Freelancer Services
  services: ServiceItem[];
  createService: (service: Omit<ServiceItem, 'id' | 'creatorId' | 'createdAt' | 'status'>) => ServiceItem;
  deleteService: (id: string) => void;
  toggleServiceStatus: (id: string) => void;

  // Seller Products
  digitalProducts: DigitalProductItem[];
  createDigitalProduct: (product: Omit<DigitalProductItem, 'id' | 'sellerId' | 'createdAt' | 'downloadsCount' | 'status'>) => DigitalProductItem;
  deleteDigitalProduct: (id: string) => void;
  toggleDigitalProductStatus: (id: string) => void;

  // Pro Orders & Sales
  orders: OrderItem[];
  addOrder: (order: Omit<OrderItem, 'id' | 'createdAt'>) => OrderItem;
  updateOrderStatus: (id: string, status: OrderStatus, eventNote?: string) => void;
  sendOrderMessage: (orderId: string, message: { content: string; attachments?: OrderAttachment[] }) => void;
  addOrderReaction: (orderId: string, messageId: string, emoji: string) => void;
  deliverOrder: (orderId: string, deliveryData: { note: string; files: OrderAttachment[] }) => void;
  completeOrder: (orderId: string) => void;
  cancelOrder: (orderId: string, reason: string) => void;
  disputeOrder: (orderId: string, reason: string) => void;

  // Pro Withdrawals
  withdrawals: WithdrawalRequest[];
  requestWithdrawal: (amountXaf: number, channel: 'MTN_MOMO_COG' | 'AIRTEL_COG', phoneNumber: string) => WithdrawalRequest;

  // Computed Real Revenue & Metrics
  totalRevenue: number;
  availableBalance: number;
}

const DEFAULT_USER: UserAccount = {
  id: 'usr_default_01',
  name: 'Utilisateur Salacope',
  email: 'compte@salacope.online',
  phone: '+242 06 500 00 00',
  avatar: '',
  role: 'user',
  createdAt: '2026-01-15T10:00:00.000Z',
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('salacope_is_authenticated');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  // Load state from localStorage or defaults
  const [user, setUser] = useState<UserAccount>(() => {
    try {
      const saved = localStorage.getItem('salacope_user');
      return saved ? JSON.parse(saved) : DEFAULT_USER;
    } catch {
      return DEFAULT_USER;
    }
  });

  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('salacope_favorites');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [following, setFollowing] = useState<CreatorFollow[]>(() => {
    try {
      const saved = localStorage.getItem('salacope_following');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [purchases, setPurchases] = useState<PurchaseItem[]>(() => {
    try {
      const saved = localStorage.getItem('salacope_purchases');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [services, setServices] = useState<ServiceItem[]>(() => {
    try {
      const saved = localStorage.getItem('salacope_services');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [digitalProducts, setDigitalProducts] = useState<DigitalProductItem[]>(() => {
    try {
      const saved = localStorage.getItem('salacope_digital_products');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const normalizeSavedOrders = (rawList: any[]): OrderItem[] => {
    if (!Array.isArray(rawList)) return [];
    return rawList.map((raw) => {
      const rawCreatedAt = raw.createdAt || new Date().toISOString();
      const timeline: OrderTimelineEvent[] = Array.isArray(raw.timeline) && raw.timeline.length > 0
        ? raw.timeline
        : [
            {
              id: `evt_c_${raw.id}`,
              type: 'CREATED',
              title: 'Commande reçue',
              description: `Commande passée par ${raw.buyerName || 'le client'}`,
              timestamp: rawCreatedAt,
              actor: 'client',
            },
            {
              id: `evt_p_${raw.id}`,
              type: 'PAID',
              title: 'Paiement confirmé',
              description: `Paiement Mobile Money validé via ${raw.paymentChannel === 'MTN_MOMO_COG' ? 'MTN MoMo' : 'Airtel Money'}`,
              timestamp: rawCreatedAt,
              actor: 'system',
            },
          ];

      if (raw.status === 'DELIVERED' && !timeline.some((e) => e.type === 'DELIVERED')) {
        timeline.push({
          id: `evt_d_${raw.id}`,
          type: 'DELIVERED',
          title: 'Commande livrée',
          description: 'Livraison enregistrée',
          timestamp: raw.lastActivityAt || rawCreatedAt,
          actor: raw.itemType === 'service' ? 'freelancer' : 'seller',
        });
      }

      return {
        ...raw,
        status: raw.status || 'CONFIRMED',
        timeline,
        messages: Array.isArray(raw.messages) ? raw.messages : [],
        lastActivityAt: raw.lastActivityAt || rawCreatedAt,
      };
    });
  };

  const [orders, setOrders] = useState<OrderItem[]>(() => {
    try {
      const saved = localStorage.getItem('salacope_orders');
      return saved ? normalizeSavedOrders(JSON.parse(saved)) : [];
    } catch {
      return [];
    }
  });

  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>(() => {
    try {
      const saved = localStorage.getItem('salacope_withdrawals');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('salacope_is_authenticated', String(isAuthenticated));
  }, [isAuthenticated]);

  const login = () => setIsAuthenticated(true);
  const logout = () => setIsAuthenticated(false);

  useEffect(() => {
    localStorage.setItem('salacope_user', JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    localStorage.setItem('salacope_favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('salacope_following', JSON.stringify(following));
  }, [following]);

  useEffect(() => {
    localStorage.setItem('salacope_purchases', JSON.stringify(purchases));
  }, [purchases]);

  useEffect(() => {
    localStorage.setItem('salacope_services', JSON.stringify(services));
  }, [services]);

  useEffect(() => {
    localStorage.setItem('salacope_digital_products', JSON.stringify(digitalProducts));
  }, [digitalProducts]);

  useEffect(() => {
    localStorage.setItem('salacope_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('salacope_withdrawals', JSON.stringify(withdrawals));
  }, [withdrawals]);

  // Account actions
  const updateUser = (data: Partial<UserAccount>) => {
    setUser((prev) => ({ ...prev, ...data }));
  };

  const upgradeRole = (newRole: 'freelancer' | 'seller') => {
    setUser((prev) => ({ ...prev, role: newRole }));
  };

  const switchRole = (newRole: UserRole) => {
    setUser((prev) => ({ ...prev, role: newRole }));
  };

  // Favorites
  const toggleFavorite = (productId: string) => {
    setFavorites((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const isFavorite = (productId: string) => favorites.includes(productId);

  // Following
  const followCreator = (creator: Omit<CreatorFollow, 'followedAt'>) => {
    setFollowing((prev) => {
      if (prev.some((f) => f.creatorId === creator.creatorId)) return prev;
      return [...prev, { ...creator, followedAt: new Date().toISOString() }];
    });
  };

  const unfollowCreator = (creatorId: string) => {
    setFollowing((prev) => prev.filter((f) => f.creatorId !== creatorId));
  };

  const isFollowing = (creatorId: string) => following.some((f) => f.creatorId === creatorId);

  // Client Purchases
  const addPurchase = (purchase: Omit<PurchaseItem, 'id' | 'purchasedAt'>): PurchaseItem => {
    const newPurchase: PurchaseItem = {
      ...purchase,
      id: `pch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      purchasedAt: new Date().toISOString(),
    };
    setPurchases((prev) => [newPurchase, ...prev]);
    return newPurchase;
  };

  // Freelancer Services
  const createService = (service: Omit<ServiceItem, 'id' | 'creatorId' | 'createdAt' | 'status'>): ServiceItem => {
    const newService: ServiceItem = {
      ...service,
      id: `srv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      creatorId: user.id,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    };
    setServices((prev) => [newService, ...prev]);
    return newService;
  };

  const deleteService = (id: string) => {
    setServices((prev) => prev.filter((s) => s.id !== id));
  };

  const toggleServiceStatus = (id: string) => {
    setServices((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const newStatus = s.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
        return { ...s, status: newStatus };
      })
    );
  };

  // Seller Products
  const createDigitalProduct = (
    product: Omit<DigitalProductItem, 'id' | 'sellerId' | 'createdAt' | 'downloadsCount' | 'status'>
  ): DigitalProductItem => {
    const newProduct: DigitalProductItem = {
      ...product,
      id: `dprod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      sellerId: user.id,
      downloadsCount: 0,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    };
    setDigitalProducts((prev) => [newProduct, ...prev]);
    return newProduct;
  };

  const deleteDigitalProduct = (id: string) => {
    setDigitalProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const toggleDigitalProductStatus = (id: string) => {
    setDigitalProducts((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const newStatus = p.status === 'ACTIVE' ? 'DRAFT' : 'ACTIVE';
        return { ...p, status: newStatus };
      })
    );
  };

  // Orders
  const addOrder = (order: Omit<OrderItem, 'id' | 'createdAt'>): OrderItem => {
    const now = new Date().toISOString();
    const id = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const initialTimeline: OrderTimelineEvent[] = [
      {
        id: `evt_c_${id}`,
        type: 'CREATED',
        title: 'Commande reçue',
        description: `Commande passée par ${order.buyerName}`,
        timestamp: now,
        actor: 'client',
      },
      {
        id: `evt_p_${id}`,
        type: 'PAID',
        title: 'Paiement confirmé',
        description: `Paiement Mobile Money validé via ${order.paymentChannel === 'MTN_MOMO_COG' ? 'MTN MoMo' : 'Airtel Money'}`,
        timestamp: now,
        actor: 'system',
      },
    ];

    let digitalDelivery = order.digitalDelivery;
    if (order.itemType === 'product' && !digitalDelivery) {
      digitalDelivery = {
        fileName: `${order.itemTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`,
        fileType: 'PDF',
        fileSize: '12.4 Mo',
        deliveredAt: now,
        downloadCount: 0,
        downloadUrl: '#',
      };
      initialTimeline.push({
        id: `evt_d_${id}`,
        type: 'DELIVERED',
        title: 'Livraison numérique immédiate',
        description: 'Fichier numérique mis à disposition de l\'acheteur.',
        timestamp: now,
        actor: 'system',
      });
    }

    const newOrder: OrderItem = {
      ...order,
      id,
      status: order.itemType === 'product' ? 'DELIVERED' : (order.status || 'CONFIRMED'),
      createdAt: now,
      lastActivityAt: now,
      timeline: order.timeline && order.timeline.length > 0 ? order.timeline : initialTimeline,
      messages: order.messages || [],
      digitalDelivery,
    };

    setOrders((prev) => [newOrder, ...prev]);
    return newOrder;
  };

  const updateOrderStatus = (id: string, status: OrderStatus, eventNote?: string) => {
    const now = new Date().toISOString();
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== id) return o;
        const timeline = [...(o.timeline || [])];
        let eventTitle = '';
        let eventType: OrderTimelineEvent['type'] = 'PROCESSING';
        const actor: OrderTimelineEvent['actor'] = o.itemType === 'service' ? 'freelancer' : 'seller';

        switch (status) {
          case 'ACCEPTED':
            eventType = 'ACCEPTED';
            eventTitle = 'Commande prise en charge';
            break;
          case 'PROCESSING':
            eventType = 'PROCESSING';
            eventTitle = 'Traitement en cours';
            break;
          case 'DELIVERED':
            eventType = 'DELIVERED';
            eventTitle = 'Livraison effectuée';
            break;
          case 'COMPLETED':
            eventType = 'COMPLETED';
            eventTitle = 'Commande terminée et clôturée';
            break;
          case 'CANCELLED':
            eventType = 'CANCELLED';
            eventTitle = 'Commande annulée';
            break;
          case 'DISPUTED':
            eventType = 'DISPUTED';
            eventTitle = 'Litige ouvert';
            break;
          default:
            eventTitle = `Statut mis à jour : ${status}`;
        }

        timeline.push({
          id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          type: eventType,
          title: eventTitle,
          description: eventNote,
          timestamp: now,
          actor,
        });

        return {
          ...o,
          status,
          timeline,
          lastActivityAt: now,
        };
      })
    );
  };

  const sendOrderMessage = (
    orderId: string,
    message: { content: string; attachments?: OrderAttachment[] }
  ) => {
    const now = new Date().toISOString();
    const senderRole = user.role === 'freelancer' ? 'freelancer' : user.role === 'seller' ? 'seller' : 'client';
    const newMessage: OrderMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      senderRole,
      senderName: user.name || 'Prestataire',
      content: message.content,
      attachments: message.attachments,
      reactions: [],
      createdAt: now,
    };

    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        const messages = [...(o.messages || []), newMessage];
        return {
          ...o,
          messages,
          lastActivityAt: now,
        };
      })
    );
  };

  const addOrderReaction = (orderId: string, messageId: string, emoji: string) => {
    const currentUserName = user.name || 'Moi';
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        const messages = (o.messages || []).map((m) => {
          if (m.id !== messageId) return m;
          const reactions = [...(m.reactions || [])];
          const existing = reactions.find((r) => r.emoji === emoji);
          if (existing) {
            if (existing.users.includes(currentUserName)) {
              existing.users = existing.users.filter((u) => u !== currentUserName);
              existing.count = existing.users.length;
            } else {
              existing.users.push(currentUserName);
              existing.count = existing.users.length;
            }
          } else {
            reactions.push({
              emoji,
              count: 1,
              users: [currentUserName],
            });
          }
          return {
            ...m,
            reactions: reactions.filter((r) => r.count > 0),
          };
        });
        return { ...o, messages };
      })
    );
  };

  const deliverOrder = (
    orderId: string,
    deliveryData: { note: string; files: OrderAttachment[] }
  ) => {
    const now = new Date().toISOString();
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        const revisionNumber = (o.delivery?.revisionNumber || 0) + 1;
        const delivery: OrderDelivery = {
          note: deliveryData.note,
          deliveredAt: now,
          files: deliveryData.files,
          revisionNumber,
        };
        const timeline = [...(o.timeline || [])];
        timeline.push({
          id: `evt_del_${Date.now()}`,
          type: 'DELIVERED',
          title: `Livraison #${revisionNumber} effectuée`,
          description: deliveryData.note,
          timestamp: now,
          actor: o.itemType === 'service' ? 'freelancer' : 'seller',
        });
        return {
          ...o,
          status: 'DELIVERED',
          delivery,
          timeline,
          lastActivityAt: now,
        };
      })
    );
  };

  const completeOrder = (orderId: string) => {
    const now = new Date().toISOString();
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        const timeline = [...(o.timeline || [])];
        timeline.push({
          id: `evt_comp_${Date.now()}`,
          type: 'COMPLETED',
          title: 'Commande validée et terminée',
          description: 'La commande a été finalisée avec succès.',
          timestamp: now,
          actor: 'client',
        });
        return {
          ...o,
          status: 'COMPLETED',
          timeline,
          lastActivityAt: now,
        };
      })
    );
  };

  const cancelOrder = (orderId: string, reason: string) => {
    const now = new Date().toISOString();
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        const timeline = [...(o.timeline || [])];
        timeline.push({
          id: `evt_cnc_${Date.now()}`,
          type: 'CANCELLED',
          title: 'Commande annulée',
          description: reason,
          timestamp: now,
          actor: o.itemType === 'service' ? 'freelancer' : 'seller',
        });
        return {
          ...o,
          status: 'CANCELLED',
          timeline,
          lastActivityAt: now,
        };
      })
    );
  };

  const disputeOrder = (orderId: string, reason: string) => {
    const now = new Date().toISOString();
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        const timeline = [...(o.timeline || [])];
        timeline.push({
          id: `evt_dsp_${Date.now()}`,
          type: 'DISPUTED',
          title: 'Litige ouvert',
          description: reason,
          timestamp: now,
          actor: 'freelancer',
        });
        return {
          ...o,
          status: 'DISPUTED',
          timeline,
          lastActivityAt: now,
        };
      })
    );
  };

  // Withdrawals
  const requestWithdrawal = (
    amountXaf: number,
    channel: 'MTN_MOMO_COG' | 'AIRTEL_COG',
    phoneNumber: string
  ): WithdrawalRequest => {
    const newWithdrawal: WithdrawalRequest = {
      id: `wth_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      amountXaf,
      channel,
      phoneNumber,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };
    setWithdrawals((prev) => [newWithdrawal, ...prev]);
    return newWithdrawal;
  };

  // Calculated Metrics (100% REAL data, 0 fake data)
  const totalRevenue = orders.reduce((sum, order) => {
    if (
      order.status === 'CONFIRMED' ||
      order.status === 'ACCEPTED' ||
      order.status === 'PROCESSING' ||
      order.status === 'DELIVERED' ||
      order.status === 'COMPLETED'
    ) {
      return sum + order.priceXaf;
    }
    return sum;
  }, 0);

  const totalWithdrawn = withdrawals.reduce((sum, w) => {
    if (w.status === 'PROCESSED' || w.status === 'PENDING') {
      return sum + w.amountXaf;
    }
    return sum;
  }, 0);

  const availableBalance = Math.max(0, totalRevenue - totalWithdrawn);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        login,
        logout,
        user,
        updateUser,
        upgradeRole,
        switchRole,
        favorites,
        toggleFavorite,
        isFavorite,
        following,
        followCreator,
        unfollowCreator,
        isFollowing,
        purchases,
        addPurchase,
        services,
        createService,
        deleteService,
        toggleServiceStatus,
        digitalProducts,
        createDigitalProduct,
        deleteDigitalProduct,
        toggleDigitalProductStatus,
        orders,
        addOrder,
        updateOrderStatus,
        sendOrderMessage,
        addOrderReaction,
        deliverOrder,
        completeOrder,
        cancelOrder,
        disputeOrder,
        withdrawals,
        requestWithdrawal,
        totalRevenue,
        availableBalance,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
