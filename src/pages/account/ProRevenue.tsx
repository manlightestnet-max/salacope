import React from 'react';
import { Link } from 'react-router-dom';
import { DollarSign, TrendingUp, ShieldCheck, ArrowRight, FileCheck2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { EmptyState } from '../../components/account/EmptyState';
import { Button } from '../../components/ui/Button';

export const ProRevenue: React.FC = () => {
  const { totalRevenue, availableBalance, orders, withdrawals } = useAuth();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-gray-200 rounded-sm p-5 shadow-2xs">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-gray-950 font-heading">
            Revenus & Chiffre d'affaires
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Suivi financier de vos ventes et solde disponible pour virement Mobile Money.
          </p>
        </div>

        <Link to="/dashboard/retraits">
          <Button
            variant="primary"
            size="sm"
            icon={<FileCheck2 className="w-3.5 h-3.5" />}
            className="text-xs rounded-sm font-semibold self-start sm:self-auto"
          >
            Demander un retrait
          </Button>
        </Link>
      </div>

      {/* Financial Summary Cards (100% REAL data) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Gross Revenue */}
        <div className="bg-white border border-gray-200 rounded-sm p-5 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
            Chiffre d'affaires brut
          </div>
          <div className="text-2xl font-black text-gray-950 font-heading">
            {totalRevenue.toLocaleString('fr-FR')} FCFA
          </div>
          <p className="text-[11px] text-gray-400 mt-1">
            Cumul des paiements reçus depuis le lancement
          </p>
        </div>

        {/* Fees & Commissions */}
        <div className="bg-white border border-gray-200 rounded-sm p-5 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
            Frais de plateforme
          </div>
          <div className="text-2xl font-black text-gray-950 font-heading">
            0 FCFA
          </div>
          <p className="text-[11px] text-gray-400 mt-1">
            0% de commission de lancement sur vos premières ventes
          </p>
        </div>

        {/* Available for Withdrawal */}
        <div className="bg-white border border-gray-200 rounded-sm p-5 shadow-2xs border-l-4 border-l-primary-600">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
            Solde disponible au retrait
          </div>
          <div className="text-2xl font-black text-primary-700 font-heading">
            {availableBalance.toLocaleString('fr-FR')} FCFA
          </div>
          <p className="text-[11px] text-primary-600 mt-1 font-medium">
            Transférable immédiatement sur MTN ou Airtel MoMo
          </p>
        </div>
      </div>

      {/* Detailed Transactions */}
      <div className="bg-white border border-gray-200 rounded-sm p-5 shadow-2xs space-y-4">
        <h2 className="text-sm font-bold text-gray-950 font-heading">
          Journal des encaissements
        </h2>

        {orders.length === 0 ? (
          <EmptyState
            icon={DollarSign}
            title="Aucun revenu enregistré"
            description="Votre chiffre d'affaires et le détail de vos encaissements apparaîtront ici dès votre première vente de prestation ou produit digital."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-500 text-[10px] font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Produit / Service</th>
                  <th className="py-3 px-4">Canal</th>
                  <th className="py-3 px-4 text-right">Crédit brut</th>
                  <th className="py-3 px-4 text-right">Net vendeur</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-4 text-gray-400">
                      {new Date(order.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="py-3 px-4 font-semibold text-gray-950">
                      {order.itemTitle}
                    </td>
                    <td className="py-3 px-4">
                      {order.paymentChannel === 'MTN_MOMO_COG' ? 'MTN MoMo Congo' : 'Airtel Money Congo'}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-gray-950">
                      +{order.priceXaf.toLocaleString('fr-FR')} FCFA
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-primary-700 font-heading">
                      +{order.priceXaf.toLocaleString('fr-FR')} FCFA
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
