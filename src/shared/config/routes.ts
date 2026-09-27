export const ROUTES = {
  home: '/',
  search: '/recherche',
  listing: (id: string) => `/produit/${id}`,
  store: (sellerId: string) => `/boutique/${sellerId}`,
  checkout: (id: string) => `/checkout/${id}`,
  sell: '/vendre',
  signIn: '/connexion',
  /** Where LightPay sends the buyer back after paying (set by the server). */
  paymentReturn: '/paiement/retour',
  /** Where LightPay sends the seller back after connecting their wallet (registered on LightPay). */
  lightpayCallback: '/lightpay/callback',

  account: {
    root: '/compte',
    explorer: '/compte/explorer',
    store: (sellerId: string) => `/compte/explorer/boutique/${sellerId}`,
    offer: (listingId: string) => `/compte/explorer/offre/${listingId}`,
    checkout: (id: string) => `/compte/checkout/${id}`,
    orders: '/compte/achats',
    order: (id: string) => `/compte/achats/${id}`,
    favorites: '/compte/favoris',
    following: '/compte/abonnements',
    settings: '/compte/parametres',
    openStore: '/compte/boutique',
    support: '/compte/support',
    newTicket: '/compte/support/nouveau',
    ticket: (id: string) => `/compte/support/${id}`,
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
  },

  legal: {
    root: '/legal',
    terms: '/legal/cgu',
    refund: '/legal/remboursement',
    privacy: '/legal/confidentialite',
    cookies: '/legal/cookies',
  },
} as const;
