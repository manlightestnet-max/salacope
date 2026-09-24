import React from 'react';
import { Users, Phone, Mail, ShoppingBag } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { EmptyState } from '../../components/account/EmptyState';

export const ProClients: React.FC = () => {
  const { orders } = useAuth();

  // Aggregate clients by phone or email
  const clientMap = new Map<
    string,
    { name: string; phone: string; email: string; totalSpent: number; ordersCount: number }
  >();

  orders.forEach((o) => {
    const key = o.buyerPhone || o.buyerEmail;
    if (!key) return;
    const existing = clientMap.get(key);
    if (existing) {
      existing.totalSpent += o.priceXaf;
      existing.ordersCount += 1;
    } else {
      clientMap.set(key, {
        name: o.buyerName || 'Client anonyme',
        phone: o.buyerPhone,
        email: o.buyerEmail,
        totalSpent: o.priceXaf,
        ordersCount: 1,
      });
    }
  });

  const clients = Array.from(clientMap.values());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-gray-200 rounded-sm p-5 shadow-2xs">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-gray-950 font-heading">
            Répertoire Clients
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Historique de vos acheteurs et contact pour le service après-vente.
          </p>
        </div>
        <div className="text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-xs self-start sm:self-auto">
          {clients.length} {clients.length === 1 ? 'client' : 'clients'}
        </div>
      </div>

      {/* Clients List */}
      {clients.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Aucun client pour le moment"
          description="La liste de vos clients s'enrichira automatiquement au fur et à mesure de vos ventes de prestations ou de produits digitaux."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((client, idx) => (
            <div
              key={idx}
              className="bg-white border border-gray-200 rounded-sm p-4.5 shadow-2xs flex flex-col justify-between space-y-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xs bg-gray-100 text-gray-700 font-bold flex items-center justify-center text-xs shrink-0">
                  {client.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-bold text-gray-950 truncate">
                    {client.name}
                  </h3>
                  <div className="text-[11px] text-gray-500 truncate mt-0.5">
                    {client.phone}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                <span>{client.ordersCount} commande(s)</span>
                <span className="font-extrabold text-primary-700 font-heading">
                  {client.totalSpent.toLocaleString('fr-FR')} FCFA
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
