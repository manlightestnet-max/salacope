import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { OrdersListView } from '../../components/orders/OrdersListView';
import { OrderDetailView } from '../../components/orders/OrderDetailView';
import { PackageX, ArrowLeft } from 'lucide-react';

export const ProOrders: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { orders } = useAuth();

  // If a specific order ID is selected in the URL
  if (id) {
    const selectedOrder = orders.find((o) => o.id === id);

    if (!selectedOrder) {
      return (
        <div className="bg-white border border-gray-200 rounded-sm p-8 text-center space-y-4 shadow-2xs max-w-lg mx-auto my-8">
          <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center mx-auto">
            <PackageX className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-950 font-heading">
              Commande introuvable
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              La commande #{id} n'existe pas ou ne figure pas dans votre registre de ventes.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/dashboard/commandes')}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xs transition-colors shadow-2xs cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Retourner aux commandes</span>
          </button>
        </div>
      );
    }

    return <OrderDetailView order={selectedOrder} />;
  }

  // Otherwise, render full orders list console
  return <OrdersListView />;
};
