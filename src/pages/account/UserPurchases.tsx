import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  Briefcase,
  Download,
  Clock,
  Search,
  X,
  FileText,
  LayoutGrid,
  List,
  CheckCircle2,
  BookOpen,
  PlayCircle,
  Receipt,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { EmptyState } from '../../components/account/EmptyState';
import { OrderStatusBadge } from '../../components/orders/OrderStatusBadge';
import { OrderTransactionModal } from '../../components/orders/OrderTransactionModal';
import { OrderItem, OrderStatus, PurchaseItem } from '../../types';
import { PRODUCTS } from '../../data/mockData';

export const UserPurchases: React.FC = () => {
  const { purchases } = useAuth();
  const navigate = useNavigate();

  // View mode: 'grid' by default for visual reassurance with covers, or 'table'
  const [viewMode, setViewMode] = useState<'grid' | 'table'>(() => {
    try {
      const saved = localStorage.getItem('salacope_purchases_view_mode');
      return saved === 'table' ? 'table' : 'grid';
    } catch {
      return 'grid';
    }
  });

  const [downloadSuccessId, setDownloadSuccessId] = useState<string | null>(null);
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState<OrderItem | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [sortOrder, setSortOrder] = useState<'DATE_DESC' | 'DATE_ASC' | 'PRICE_DESC' | 'PRICE_ASC'>('DATE_DESC');

  // Persist view mode preference
  const handleToggleViewMode = (mode: 'grid' | 'table') => {
    setViewMode(mode);
    try {
      localStorage.setItem('salacope_purchases_view_mode', mode);
    } catch {
      // ignore
    }
  };

  const handleDownloadFile = (purchaseId: string, title: string) => {
    setDownloadSuccessId(purchaseId);
    const blob = new Blob(
      [
        `SALACOPE.ONLINE - ACCÈS AU FICHIER NUMÉRIQUE OFFICIEL\n` +
        `-----------------------------------------------------\n` +
        `Document: ${title}\n` +
        `Date d'acquisition: ${new Date().toISOString()}\n` +
        `Statut: Licence d'utilisation individuelle validée.\n` +
        `Paiement séquestré & garanti par Salacope Rép. du Congo.\n`,
      ],
      { type: 'text/plain;charset=utf-8' }
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_salacope.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setTimeout(() => {
      setDownloadSuccessId(null);
    }, 3000);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
      return new Intl.DateTimeFormat('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(dateString));
    } catch {
      return dateString;
    }
  };

  // Status mapping to OrderStatus for badge
  const mapPurchaseStatus = (status: string): OrderStatus => {
    if (status === 'COMPLETED') return 'COMPLETED';
    if (status === 'IN_PROGRESS') return 'PROCESSING';
    if (status === 'PENDING') return 'PENDING';
    return 'COMPLETED';
  };

  // Resolve cover image with robust fallbacks
  const getPurchaseCover = (purchase: PurchaseItem): string => {
    if (purchase.coverImage) return purchase.coverImage;
    const match = PRODUCTS.find(
      (p) =>
        p.id === purchase.id ||
        p.title.toLowerCase().trim() === purchase.title.toLowerCase().trim() ||
        purchase.title.toLowerCase().includes(p.title.toLowerCase().slice(0, 15))
    );
    if (match?.coverImage) return match.coverImage;
    if (purchase.type === 'service') {
      return 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=600&auto=format&fit=crop&q=80';
    }
    return 'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=600&auto=format&fit=crop&q=80';
  };

  // Resolve format information (Icon, badge class, label, rich visual theme)
  const getFormatInfo = (purchase: PurchaseItem) => {
    if (purchase.type === 'service') {
      return {
        label: 'Service Freelance',
        icon: Briefcase,
        badgeClass: 'bg-blue-600/90 text-white border border-blue-400/40',
        bgGradient: 'bg-gradient-to-br from-blue-700 via-indigo-900 to-slate-950',
        badgeSubtext: 'Prestation sur mesure',
      };
    }
    const titleLower = purchase.title.toLowerCase();
    if (titleLower.includes('canva') || titleLower.includes('modèle') || titleLower.includes('template')) {
      return {
        label: 'Modèles Canva',
        icon: LayoutGrid,
        badgeClass: 'bg-purple-600/90 text-white border border-purple-400/40',
        bgGradient: 'bg-gradient-to-br from-purple-700 via-violet-900 to-slate-950',
        badgeSubtext: 'Fichiers & Liens Canva',
      };
    }
    if (
      titleLower.includes('formation') ||
      titleLower.includes('vidéo') ||
      titleLower.includes('cours') ||
      titleLower.includes('tiktok')
    ) {
      return {
        label: 'Formation Vidéo',
        icon: PlayCircle,
        badgeClass: 'bg-rose-600/90 text-white border border-rose-400/40',
        bgGradient: 'bg-gradient-to-br from-rose-700 via-red-950 to-zinc-950',
        badgeSubtext: 'Accès streaming & ressources',
      };
    }
    if (
      titleLower.includes('guide') ||
      titleLower.includes('livre') ||
      titleLower.includes('ebook') ||
      purchase.fileType === 'PDF'
    ) {
      return {
        label: 'E-book • Document PDF',
        icon: BookOpen,
        badgeClass: 'bg-emerald-600/90 text-white border border-emerald-400/40',
        bgGradient: 'bg-gradient-to-br from-emerald-700 via-teal-950 to-slate-950',
        badgeSubtext: 'Lecture & téléchargement direct',
      };
    }
    return {
      label: 'Document Numérique',
      icon: FileText,
      badgeClass: 'bg-slate-700/90 text-white border border-slate-500/40',
      bgGradient: 'bg-gradient-to-br from-slate-700 via-gray-900 to-gray-950',
      badgeSubtext: 'Téléchargement direct',
    };
  };

  // Convert purchase to OrderItem for the transaction receipt modal
  const purchaseToOrder = (p: PurchaseItem): OrderItem => ({
    id: p.id.startsWith('ord_') ? p.id : `ord_${p.id.replace('pch_', '')}`,
    itemId: p.id,
    itemTitle: p.title,
    itemType: p.type,
    buyerName: 'Client Acheteur',
    buyerEmail: (p as any).buyerEmail || 'client@salacope.cg',
    buyerPhone: p.phone,
    priceXaf: p.priceXaf,
    paymentChannel: p.paymentChannel,
    status: mapPurchaseStatus(p.status),
    createdAt: p.purchasedAt,
    deliveryTime: p.deliveryTime,
    timeline: [
      {
        id: `evt_c_${p.id}`,
        type: 'CREATED',
        title: 'Commande validée',
        description: `Règlement confirmé via ${p.paymentChannel === 'MTN_MOMO_COG' ? 'MTN MoMo' : 'Airtel Money'}`,
        timestamp: p.purchasedAt,
        actor: 'client',
      },
      {
        id: `evt_d_${p.id}`,
        type: 'DELIVERED',
        title: p.type === 'product' ? 'Fichier disponible' : 'Prestation enregistrée',
        description:
          p.type === 'product'
            ? 'Lien de téléchargement sécurisé disponible immédiatement'
            : `Délai convenu : ${p.deliveryTime || 'En cours de réalisation'}`,
        timestamp: p.purchasedAt,
        actor: 'system',
      },
    ],
  });

  // Filter and sort purchases
  const filteredPurchases = useMemo(() => {
    return purchases
      .filter((p) => {
        // 1. Search Query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchesId = p.id.toLowerCase().includes(q);
          const matchesTitle = p.title.toLowerCase().includes(q);
          const matchesCreator = p.creatorName.toLowerCase().includes(q);
          const matchesPhone = p.phone?.toLowerCase().includes(q);

          if (!matchesId && !matchesTitle && !matchesCreator && !matchesPhone) {
            return false;
          }
        }

        // 2. Status Filter
        if (selectedStatus !== 'ALL') {
          if (p.status !== selectedStatus) return false;
        }

        // 3. Item Type Filter
        if (selectedType !== 'ALL') {
          if (p.type !== selectedType) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortOrder === 'DATE_DESC') {
          return new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime();
        }
        if (sortOrder === 'DATE_ASC') {
          return new Date(a.purchasedAt).getTime() - new Date(b.purchasedAt).getTime();
        }
        if (sortOrder === 'PRICE_DESC') {
          return b.priceXaf - a.priceXaf;
        }
        if (sortOrder === 'PRICE_ASC') {
          return a.priceXaf - b.priceXaf;
        }
        return 0;
      });
  }, [purchases, searchQuery, selectedStatus, selectedType, sortOrder]);

  return (
    <div className="space-y-5 relative">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-gray-200 rounded-sm p-4 sm:p-5 shadow-2xs">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-gray-950 font-heading">
            Mes Achats & Téléchargements
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Historique de vos commandes, accès direct aux fichiers et suivi de vos prestations.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {/* View Mode Toggle: Grille vs Tableau */}
          <div className="flex items-center bg-gray-100 p-0.5 rounded-sm border border-gray-200 text-xs">
            <button
              type="button"
              onClick={() => handleToggleViewMode('grid')}
              className={`flex items-center gap-1.5 px-2.5 py-1 font-semibold rounded-xs transition-colors cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white text-gray-900 shadow-2xs font-bold'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
              title="Vue Grille avec couvertures des documents"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Grille</span>
            </button>
            <button
              type="button"
              onClick={() => handleToggleViewMode('table')}
              className={`flex items-center gap-1.5 px-2.5 py-1 font-semibold rounded-xs transition-colors cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-gray-900 shadow-2xs font-bold'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
              title="Vue Tableau format CRM"
            >
              <List className="w-3.5 h-3.5" />
              <span>Tableau</span>
            </button>
          </div>

          <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-3 py-1.5 rounded-xs border border-gray-200">
            {purchases.length} {purchases.length === 1 ? 'commande réelle' : 'commandes réelles'}
          </span>
        </div>
      </div>

      {/* 2. Global Empty State (When zero purchases exist) */}
      {purchases.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="Aucun achat effectué"
          description="Vos commandes et téléchargements apparaîtront ici dès votre premier règlement."
          actionLabel="Découvrir le catalogue"
          onAction={() => navigate('/')}
        />
      ) : (
        <div className="space-y-4">
          {/* Filters & Search Bar */}
          <div className="bg-white border border-gray-200 rounded-sm p-3.5 shadow-2xs space-y-3">
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
              {/* Search Input */}
              <div className="flex-1 relative">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Rechercher par n° de commande, créateur, article, téléphone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-sm focus:outline-none focus:border-primary-600 focus:bg-white text-gray-900 transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Status Select */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="relative">
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="py-1.5 px-3 text-xs bg-gray-50 border border-gray-200 rounded-sm text-gray-700 focus:outline-none focus:border-primary-600 font-medium cursor-pointer"
                  >
                    <option value="ALL">Tous les statuts</option>
                    <option value="COMPLETED">Terminée & Validée</option>
                    <option value="IN_PROGRESS">En traitement</option>
                    <option value="PENDING">En attente</option>
                  </select>
                </div>

                {/* Item Type Select */}
                <div className="relative">
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="py-1.5 px-3 text-xs bg-gray-50 border border-gray-200 rounded-sm text-gray-700 focus:outline-none focus:border-primary-600 font-medium cursor-pointer"
                  >
                    <option value="ALL">Tous types</option>
                    <option value="product">Produits Numériques</option>
                    <option value="service">Services Freelance</option>
                  </select>
                </div>

                {/* Sort Order Select */}
                <div className="relative">
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as any)}
                    className="py-1.5 px-3 text-xs bg-gray-50 border border-gray-200 rounded-sm text-gray-700 focus:outline-none focus:border-primary-600 font-medium cursor-pointer"
                  >
                    <option value="DATE_DESC">Plus récentes</option>
                    <option value="DATE_ASC">Plus anciennes</option>
                    <option value="PRICE_DESC">Montant décroissant</option>
                    <option value="PRICE_ASC">Montant croissant</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Quick status tabs count pill */}
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-gray-100 text-[11px]">
              <span className="text-gray-400 mr-1">Raccourcis :</span>
              {[
                { key: 'ALL', label: 'Toutes', count: purchases.length },
                {
                  key: 'product',
                  label: 'Produits',
                  count: purchases.filter((p) => p.type === 'product').length,
                  filterType: 'type',
                },
                {
                  key: 'service',
                  label: 'Services',
                  count: purchases.filter((p) => p.type === 'service').length,
                  filterType: 'type',
                },
                {
                  key: 'COMPLETED',
                  label: 'Clôturées',
                  count: purchases.filter((p) => p.status === 'COMPLETED').length,
                  filterType: 'status',
                },
              ].map((tab) => {
                const isActive =
                  tab.key === 'ALL'
                    ? selectedStatus === 'ALL' && selectedType === 'ALL'
                    : tab.filterType === 'type'
                    ? selectedType === tab.key
                    : selectedStatus === tab.key;

                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => {
                      if (tab.key === 'ALL') {
                        setSelectedStatus('ALL');
                        setSelectedType('ALL');
                      } else if (tab.filterType === 'type') {
                        setSelectedType(tab.key);
                        setSelectedStatus('ALL');
                      } else {
                        setSelectedStatus(tab.key);
                        setSelectedType('ALL');
                      }
                    }}
                    className={`px-2 py-0.5 rounded-xs transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-primary-600 text-white font-bold'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Results Area */}
          {filteredPurchases.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-sm p-8 text-center space-y-2 shadow-2xs">
              <p className="text-xs font-semibold text-gray-700">
                Aucun achat ne correspond aux filtres appliqués.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedStatus('ALL');
                  setSelectedType('ALL');
                }}
                className="text-xs text-primary-700 hover:underline cursor-pointer"
              >
                Réinitialiser les filtres
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            /* ========================================================================= */
            /* 3. GRID MODE - BIBLIOTHÈQUE NUMÉRIQUE / COFFRE-FORT DE DOCUMENTS          */
            /* ========================================================================= */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-4.5">
              {filteredPurchases.map((purchase) => {
                const cover = getPurchaseCover(purchase);
                const format = getFormatInfo(purchase);
                const isService = purchase.type === 'service';
                const statusMapped = mapPurchaseStatus(purchase.status);

                return (
                  <div
                    key={purchase.id}
                    className="bg-white border border-gray-200/90 hover:border-gray-300 rounded-lg overflow-hidden shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col group"
                  >
                    {/* Document Cover Exhibition (Framed asset presentation) */}
                    <div className="relative p-2.5 bg-gray-50/70 border-b border-gray-100">
                      <div className="relative h-40 w-full rounded-md overflow-hidden bg-gray-950 shadow-2xs select-none group-hover:shadow-xs transition-shadow">
                        {/* Fallback Graphic Pattern (Visible if image loading or fails) */}
                        <div className={`absolute inset-0 flex items-center justify-center ${format.bgGradient}`}>
                          <format.icon className="w-14 h-14 text-white/25 transform -rotate-6" />
                        </div>

                        {/* Real Cover Image (With no-referrer for unblocked CDN loading) */}
                        <img
                          src={cover}
                          alt={purchase.title}
                          referrerPolicy="no-referrer"
                          crossOrigin="anonymous"
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />

                        {/* Subtle Vignette Gradient for badge contrast */}
                        <div className="absolute inset-0 bg-gradient-to-t from-gray-950/85 via-transparent to-black/40 pointer-events-none" />

                        {/* Top Badges: Format & Order Tag */}
                        <div className="absolute top-2 inset-x-2 flex items-center justify-between gap-1.5 z-10">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-xs text-[10px] font-bold shadow-xs backdrop-blur-md ${format.badgeClass}`}
                          >
                            <format.icon className="w-2.5 h-2.5" />
                            <span>{format.label}</span>
                          </span>

                          <span className="bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded-xs text-[9px] font-mono text-gray-300 border border-white/10">
                            #{purchase.id.slice(0, 6)}
                          </span>
                        </div>

                        {/* Bottom Reassurance Banner */}
                        <div className="absolute bottom-2 inset-x-2 flex items-center justify-between text-[10px] font-medium z-10 drop-shadow-sm">
                          {!isService ? (
                            <span className="inline-flex items-center gap-1 text-emerald-300 font-semibold">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                              <span>Prêt au téléchargement</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-amber-300 font-semibold">
                              <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                              <span>{purchase.deliveryTime || 'En cours'}</span>
                            </span>
                          )}

                          <span className="text-[9px] text-gray-300 font-mono">
                            {purchase.paymentChannel === 'MTN_MOMO_COG' ? 'MTN MoMo' : 'Airtel Money'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card Body - Factual Library Information */}
                    <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3">
                      <div className="space-y-2">
                        {/* Title - Clean dark neutral, not a storefront link */}
                        <h3
                          className="font-bold text-xs sm:text-sm text-gray-900 group-hover:text-primary-700 transition-colors line-clamp-2 leading-snug font-heading"
                          title={purchase.title}
                        >
                          {purchase.title}
                        </h3>

                        {/* Creator & Details */}
                        <div className="space-y-1 text-[11px] text-gray-500 pt-0.5">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400">Créateur</span>
                            <span className="font-medium text-gray-800 truncate max-w-[130px]">
                              {purchase.creatorName}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400">Acquis le</span>
                            <span className="text-gray-600">{formatDate(purchase.purchasedAt)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Card Footer - Prominent Full-Width Action Button */}
                      <div className="pt-2.5 border-t border-gray-100 space-y-2">
                        {!isService ? (
                          <button
                            type="button"
                            onClick={() => handleDownloadFile(purchase.id, purchase.title)}
                            className={`w-full py-2 px-3 rounded-md text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center justify-center gap-1.5 ${
                              downloadSuccessId === purchase.id
                                ? 'bg-emerald-600 text-white'
                                : 'bg-primary-600 hover:bg-primary-700 active:scale-[0.98] text-white'
                            }`}
                            title="Télécharger le document"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>{downloadSuccessId === purchase.id ? 'Téléchargé ! ✓' : 'Télécharger'}</span>
                          </button>
                        ) : (
                          <div className="w-full py-2 px-3 rounded-md text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 flex items-center justify-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            <span>Prestation en cours</span>
                          </div>
                        )}

                        {/* Discrete Meta: Price & Receipt */}
                        <div className="flex items-center justify-between text-[10px] text-gray-400 px-0.5">
                          <span>Payé {purchase.priceXaf.toLocaleString('fr-FR')} FCFA</span>
                          <button
                            type="button"
                            onClick={() => setSelectedReceiptOrder(purchaseToOrder(purchase))}
                            className="hover:text-primary-700 hover:underline cursor-pointer flex items-center gap-0.5 text-gray-500 font-medium"
                          >
                            <Receipt className="w-3 h-3" />
                            <span>Reçu</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ========================================================================= */
            /* 4. TABLE MODE - EXACT CRM SCAFFOLD (ORDERS LIST STYLE)                    */
            /* ========================================================================= */
            <div className="bg-white border border-gray-200 rounded-sm overflow-hidden shadow-2xs">
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-500 text-[10px] font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Commande</th>
                      <th className="py-3 px-4">Créateur</th>
                      <th className="py-3 px-4">Article / Prestation</th>
                      <th className="py-3 px-4">Date & Activité</th>
                      <th className="py-3 px-4 text-right">Montant</th>
                      <th className="py-3 px-4 text-center">Statut</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredPurchases.map((purchase) => {
                      const isService = purchase.type === 'service';
                      const statusMapped = mapPurchaseStatus(purchase.status);
                      const cover = getPurchaseCover(purchase);
                      const format = getFormatInfo(purchase);

                      return (
                        <tr
                          key={purchase.id}
                          className="hover:bg-primary-50/30 transition-colors group"
                        >
                          <td className="py-3 px-4 font-mono font-medium text-gray-500">
                            #{purchase.id.slice(0, 8)}
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-semibold text-gray-900">{purchase.creatorName}</div>
                            <div className="text-[10px] text-gray-400 font-mono">
                              {purchase.phone ||
                                (purchase.paymentChannel === 'MTN_MOMO_COG' ? 'MTN MoMo' : 'Airtel Money')}
                            </div>
                          </td>

                          {/* ARTICLE / PRESTATION with Leading Cover Thumbnail */}
                          <td className="py-3 px-4 max-w-[280px]">
                            <div className="flex items-center gap-3">
                              {/* Leading Cover Thumbnail */}
                              <div className="relative w-10 h-10 rounded-sm overflow-hidden bg-gray-950 border border-gray-200 shrink-0 shadow-2xs">
                                <div
                                  className={`absolute inset-0 flex items-center justify-center ${format.bgGradient}`}
                                >
                                  <format.icon className="w-5 h-5 text-white/40" />
                                </div>
                                <img
                                  src={cover}
                                  alt={purchase.title}
                                  referrerPolicy="no-referrer"
                                  crossOrigin="anonymous"
                                  className="absolute inset-0 w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              </div>

                              {/* Title & Format Meta */}
                              <div className="min-w-0 flex-1">
                                <div
                                  className="font-semibold text-gray-950 truncate"
                                  title={purchase.title}
                                >
                                  {purchase.title}
                                </div>
                                <div className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1.5">
                                  <span className="font-medium text-gray-700">{format.label}</span>
                                  <span>·</span>
                                  <span>{isService ? 'Prestation' : 'Fichier immédiat'}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4 text-gray-600">
                            <div>{formatDate(purchase.purchasedAt)}</div>
                            <div className="text-[10px] text-gray-400 mt-0.5">
                              {purchase.paymentChannel === 'MTN_MOMO_COG' ? 'MTN MoMo' : 'Airtel Money'}
                            </div>
                          </td>

                          <td className="py-3 px-4 text-right font-bold text-gray-950 font-heading">
                            {purchase.priceXaf.toLocaleString('fr-FR')} FCFA
                          </td>

                          <td className="py-3 px-4 text-center">
                            <OrderStatusBadge status={statusMapped} size="sm" />
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5 justify-end">
                              <button
                                type="button"
                                onClick={() => setSelectedReceiptOrder(purchaseToOrder(purchase))}
                                className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xs transition-colors cursor-pointer"
                                title="Voir le reçu"
                              >
                                <Receipt className="w-3.5 h-3.5" />
                              </button>

                              {isService ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-xs border border-amber-200">
                                  <Clock className="w-3 h-3 text-amber-600" />
                                  <span>{purchase.deliveryTime || 'En cours'}</span>
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleDownloadFile(purchase.id, purchase.title)}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xs text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 transition-colors shadow-2xs cursor-pointer"
                                  title="Télécharger le fichier numérique"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  <span>{downloadSuccessId === purchase.id ? 'Téléchargé' : 'Télécharger'}</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card / Tile View with Leading Cover Thumbnail */}
              <div className="md:hidden divide-y divide-gray-100">
                {filteredPurchases.map((purchase) => {
                  const isService = purchase.type === 'service';
                  const statusMapped = mapPurchaseStatus(purchase.status);
                  const cover = getPurchaseCover(purchase);
                  const format = getFormatInfo(purchase);

                  return (
                    <div
                      key={purchase.id}
                      className="p-4 space-y-3 active:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-semibold text-gray-500">
                          #{purchase.id.slice(0, 8)}
                        </span>
                        <OrderStatusBadge status={statusMapped} size="sm" />
                      </div>

                      {/* Leading Thumbnail Tile Header */}
                      <div className="flex items-start gap-3">
                        <div className="relative w-11 h-11 rounded-sm overflow-hidden bg-gray-950 border border-gray-200 shrink-0 shadow-2xs">
                          <div
                            className={`absolute inset-0 flex items-center justify-center ${format.bgGradient}`}
                          >
                            <format.icon className="w-5 h-5 text-white/40" />
                          </div>
                          <img
                            src={cover}
                            alt={purchase.title}
                            referrerPolicy="no-referrer"
                            crossOrigin="anonymous"
                            className="absolute inset-0 w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-xs text-gray-950 truncate leading-snug">
                            {purchase.title}
                          </div>
                          <div className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1.5">
                            <span className="font-medium text-gray-700">{format.label}</span>
                            <span>·</span>
                            <span>{purchase.creatorName}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
                        <span className="text-[11px] text-gray-400">{formatDate(purchase.purchasedAt)}</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedReceiptOrder(purchaseToOrder(purchase))}
                            className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xs transition-colors"
                            title="Voir le reçu"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                          </button>

                          <span className="font-bold text-gray-950 font-heading">
                            {purchase.priceXaf.toLocaleString('fr-FR')} FCFA
                          </span>
                          {!isService && (
                            <button
                              type="button"
                              onClick={() => handleDownloadFile(purchase.id, purchase.title)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-xs text-[11px] font-semibold text-white bg-primary-600 hover:bg-primary-700 transition-colors shadow-2xs"
                            >
                              <Download className="w-3 h-3" />
                              <span>{downloadSuccessId === purchase.id ? 'Prêt' : 'Fichier'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. Scoped Order Transaction Modal (Receipt) */}
      {selectedReceiptOrder && (
        <OrderTransactionModal
          order={selectedReceiptOrder}
          isOpen={true}
          onClose={() => setSelectedReceiptOrder(null)}
          isScopedToMain={true}
        />
      )}
    </div>
  );
};

