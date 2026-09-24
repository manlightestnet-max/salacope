import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { OrderItem, OrderStatus } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { OrderStatusBadge } from './OrderStatusBadge';
import { EmptyState } from '../account/EmptyState';
import {
  Inbox,
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  ShoppingBag,
  Briefcase,
  ArrowRight,
  Clock,
  Phone,
  Calendar,
  X,
} from 'lucide-react';

export const OrdersListView: React.FC = () => {
  const navigate = useNavigate();
  const { user, orders } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [sortOrder, setSortOrder] = useState<'DATE_DESC' | 'DATE_ASC' | 'PRICE_DESC' | 'PRICE_ASC'>('DATE_DESC');

  // Filter and sort 100% REAL orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesId = order.id.toLowerCase().includes(q);
        const matchesTitle = order.itemTitle.toLowerCase().includes(q);
        const matchesBuyer = order.buyerName.toLowerCase().includes(q);
        const matchesPhone = order.buyerPhone.toLowerCase().includes(q);
        const matchesEmail = order.buyerEmail.toLowerCase().includes(q);

        if (!matchesId && !matchesTitle && !matchesBuyer && !matchesPhone && !matchesEmail) {
          return false;
        }
      }

      // 2. Status Filter
      if (selectedStatus !== 'ALL') {
        if (order.status !== selectedStatus) return false;
      }

      // 3. Item Type Filter
      if (selectedType !== 'ALL') {
        if (order.itemType !== selectedType) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortOrder === 'DATE_DESC') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortOrder === 'DATE_ASC') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortOrder === 'PRICE_DESC') {
        return b.priceXaf - a.priceXaf;
      }
      if (sortOrder === 'PRICE_ASC') {
        return a.priceXaf - b.priceXaf;
      }
      return 0;
    });
  }, [orders, searchQuery, selectedStatus, selectedType, sortOrder]);

  const formatDate = (dateString: string) => {
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

  return (
    <div className="space-y-5">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-gray-200 rounded-sm p-4 sm:p-5 shadow-2xs">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-gray-950 font-heading">
            Gestion des Commandes
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Console de traitement, communication client et suivi des livrables en temps réel.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-3 py-1 rounded-xs">
            {orders.length} {orders.length === 1 ? 'commande réelle' : 'commandes réelles'}
          </span>
        </div>
      </div>

      {/* 2. Global Empty State (When zero real orders exist) */}
      {orders.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Aucune commande reçue"
          description="Les commandes de vos clients apparaîtront ici."
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
                  placeholder="Rechercher par n° de commande, client, article, téléphone..."
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
                    <option value="CONFIRMED">Paiement confirmé</option>
                    <option value="ACCEPTED">Prise en charge</option>
                    <option value="PROCESSING">En traitement</option>
                    <option value="DELIVERED">Livrée</option>
                    <option value="COMPLETED">Terminée</option>
                    <option value="CANCELLED">Annulée</option>
                    <option value="DISPUTED">Litige ouvert</option>
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
                    <option value="service">Services Freelance</option>
                    <option value="product">Produits Numériques</option>
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
                { key: 'ALL', label: 'Toutes' },
                { key: 'CONFIRMED', label: 'À traiter' },
                { key: 'ACCEPTED', label: 'Prises en charge' },
                { key: 'DELIVERED', label: 'Livrées' },
                { key: 'COMPLETED', label: 'Clôturées' },
              ].map((tab) => {
                const count = tab.key === 'ALL'
                  ? orders.length
                  : orders.filter((o) => o.status === tab.key).length;

                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setSelectedStatus(tab.key)}
                    className={`px-2 py-0.5 rounded-xs transition-colors cursor-pointer ${
                      selectedStatus === tab.key
                        ? 'bg-primary-600 text-white font-bold'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {tab.label} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Results List */}
          {filteredOrders.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-sm p-8 text-center space-y-2 shadow-2xs">
              <p className="text-xs font-semibold text-gray-700">
                Aucune commande ne correspond aux filtres appliqués.
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
          ) : (
            <div className="bg-white border border-gray-200 rounded-sm overflow-hidden shadow-2xs">
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-500 text-[10px] font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Commande</th>
                      <th className="py-3 px-4">Client</th>
                      <th className="py-3 px-4">Article / Prestation</th>
                      <th className="py-3 px-4">Date & Activité</th>
                      <th className="py-3 px-4 text-right">Montant</th>
                      <th className="py-3 px-4 text-center">Statut</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredOrders.map((order) => {
                      const isService = order.itemType === 'service';

                      return (
                        <tr
                          key={order.id}
                          onClick={() => navigate(`/dashboard/commandes/${order.id}`)}
                          className="hover:bg-primary-50/30 transition-colors cursor-pointer group"
                        >
                          <td className="py-3 px-4 font-mono font-medium text-gray-500">
                            #{order.id.slice(0, 8)}
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-semibold text-gray-900">{order.buyerName}</div>
                            <div className="text-[10px] text-gray-400 font-mono">{order.buyerPhone}</div>
                          </td>

                          <td className="py-3 px-4 max-w-[220px]">
                            <div className="flex items-center gap-1.5">
                              {isService ? (
                                <Briefcase className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              ) : (
                                <ShoppingBag className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                              )}
                              <span className="font-medium text-gray-950 truncate" title={order.itemTitle}>
                                {order.itemTitle}
                              </span>
                            </div>
                            <div className="text-[10px] text-gray-400 mt-0.5">
                              {isService ? 'Prestation personnalisée' : 'Téléchargement direct'}
                            </div>
                          </td>

                          <td className="py-3 px-4 text-gray-600">
                            <div>{formatDate(order.createdAt)}</div>
                            {order.lastActivityAt && order.lastActivityAt !== order.createdAt && (
                              <div className="text-[10px] text-gray-400 mt-0.5">
                                Mis à jour {formatDate(order.lastActivityAt)}
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right font-bold text-gray-950 font-heading">
                            {order.priceXaf.toLocaleString('fr-FR')} FCFA
                          </td>

                          <td className="py-3 px-4 text-center">
                            <OrderStatusBadge status={order.status} size="sm" />
                          </td>

                          <td className="py-3 px-4 text-right">
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary-700 group-hover:text-primary-800 group-hover:translate-x-0.5 transition-all">
                              <span>Traiter</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List View */}
              <div className="md:hidden divide-y divide-gray-100">
                {filteredOrders.map((order) => {
                  const isService = order.itemType === 'service';

                  return (
                    <div
                      key={order.id}
                      onClick={() => navigate(`/dashboard/commandes/${order.id}`)}
                      className="p-4 space-y-2.5 active:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-semibold text-gray-500">
                          #{order.id.slice(0, 8)}
                        </span>
                        <OrderStatusBadge status={order.status} size="sm" />
                      </div>

                      <div>
                        <div className="font-bold text-xs text-gray-950 flex items-center gap-1.5">
                          {isService ? (
                            <Briefcase className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          ) : (
                            <ShoppingBag className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                          )}
                          <span className="truncate">{order.itemTitle}</span>
                        </div>
                        <div className="text-[11px] text-gray-500 mt-0.5">
                          Client : <span className="text-gray-900 font-medium">{order.buyerName}</span> ({order.buyerPhone})
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
                        <span className="text-[11px] text-gray-400">{formatDate(order.createdAt)}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-950 font-heading">
                            {order.priceXaf.toLocaleString('fr-FR')} FCFA
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-primary-600" />
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
    </div>
  );
};
