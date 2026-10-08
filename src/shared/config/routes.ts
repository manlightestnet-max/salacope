export const ROUTES = {
  home: '/',
  search: '/recherche',
  listing: (id: string) => `/p/${id}`,
  store: (sellerId: string) => `/s/${sellerId}`,
  /** Verified stores: salacope.online/@handle. */
  storeHandle: (handle: string) => `/@${handle}`,
  checkout: (id: string) => `/checkout/${id}`,
  sell: '/vendre',
  signIn: '/connexion',
  /** Where LightPay sends the buyer back after paying (set by the server). */
  paymentReturn: '/paiement/retour',
  /** Where LightPay sends the seller back after connecting their wallet (registered on LightPay). */
  lightpayCallback: '/lightpay/callback',

  account: {
    root: '/ac',
    explorer: '/ac/explorer',
    search: '/ac/recherche',
    store: (sellerId: string) => `/ac/s/${sellerId}`,
    offer: (listingId: string) => `/ac/p/${listingId}`,
    checkout: (id: string) => `/ac/checkout/${id}`,
    messages: '/ac/messages',
    chat: (orderId: string) => `/ac/messages/${orderId}`,
    orders: '/ac/achats',
    order: (id: string) => `/ac/achats/${id}`,
    favorites: '/ac/favoris',
    following: '/ac/abonnements',
    settings: '/ac/parametres',
    openStore: '/ac/boutique',
    support: '/ac/support',
    newTicket: '/ac/support/nouveau',
    ticket: (id: string) => `/ac/support/${id}`,
  },

  seller: {
    root: '/dashboard',
    listings: '/dashboard/offres',
    newListing: '/dashboard/offres/nouvelle',
    listing: (id: string) => `/dashboard/offres/${id}`,
    sales: '/dashboard/ventes',
    sale: (id: string) => `/dashboard/ventes/${id}`,
    customers: '/dashboard/clients',
    payouts: '/dashboard/paiements',
    verification: '/dashboard/verification',
  },

  /** Salacope administration (accounts listed in SALACOPE_ADMIN_UIDS). */
  admin: {
    root: '/admin',
    sellers: '/admin/vendeurs',
    seller: (id: string) => `/admin/vendeurs/${id}`,
    users: '/admin/acs',
    audit: '/admin/journal',
    banners: '/admin/publicite',
  },

  legal: {
    root: '/legal',
    terms: '/legal/cgu',
    refund: '/legal/remboursement',
    privacy: '/legal/confidentialite',
    cookies: '/legal/cookies',
    aml: '/legal/lutte-anti-blanchiment',
    amlPolicyPdf: '/legal/salacope-aml-cft-policy.pdf',
  },
} as const;
