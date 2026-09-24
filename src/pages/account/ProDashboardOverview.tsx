import React from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  Store,
  Layers,
  Inbox,
  DollarSign,
  TrendingUp,
  Plus,
  ArrowRight,
  ShieldCheck,
  ArrowDownToLine,
  Users,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';

export const ProDashboardOverview: React.FC = () => {
  const {
    user,
    services,
    digitalProducts,
    orders,
    totalRevenue,
    availableBalance,
  } = useAuth();

  const isFreelancer = user.role === 'freelancer';
  const isSeller = user.role === 'seller';

  // Compute unique clients
  const uniqueClients = Array.from(new Set(orders.map((o) => o.buyerPhone || o.buyerEmail)));

  return (
    <div className="space-y-6">
      {/* Workspace Header */}
      <div className="bg-white border border-gray-200 rounded-sm p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-xs bg-primary-50 text-primary-700">
                {isFreelancer ? 'Workspace Freelancer' : 'Workspace Seller'}
              </span>
              <span className="text-xs text-gray-400">·</span>
              <span className="text-xs text-gray-500 font-medium">Brazzaville, Congo (XAF)</span>
            </div>
            <h1 className="text-base sm:text-lg font-bold text-gray-950 font-heading">
              Tableau de bord professionnel
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Suivi en temps réel de votre activité commerciale et de vos encaissements.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isFreelancer ? (
              <Link to="/dashboard/services/nouveau">
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Plus className="w-3.5 h-3.5" />}
                  className="text-xs rounded-sm font-semibold"
                >
                  Nouveau service
                </Button>
              </Link>
            ) : (
              <Link to="/dashboard/produits/nouveau">
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Plus className="w-3.5 h-3.5" />}
                  className="text-xs rounded-sm font-semibold"
                >
                  Nouveau produit digital
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Real Metrics Grid - Strict ZERO mock numbers */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {/* Total Revenue */}
        <div className="bg-white border border-gray-200 rounded-sm p-4 shadow-2xs">
          <div className="flex items-center justify-between text-gray-400 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
              Chiffre d'affaires
            </span>
            <DollarSign className="w-4 h-4 text-primary-600" />
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-gray-950 font-heading">
            {totalRevenue.toLocaleString('fr-FR')} FCFA
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">
            {orders.length === 0 ? 'Aucune vente enregistrée' : `${orders.length} transaction(s)`}
          </div>
        </div>

        {/* Available Balance */}
        <div className="bg-white border border-gray-200 rounded-sm p-4 shadow-2xs">
          <div className="flex items-center justify-between text-gray-400 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
              Solde disponible
            </span>
            <TrendingUp className="w-4 h-4 text-primary-600" />
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-primary-700 font-heading">
            {availableBalance.toLocaleString('fr-FR')} FCFA
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">
            {availableBalance > 0 ? (
              <Link to="/dashboard/retraits" className="text-primary-600 font-semibold hover:underline">
                Demander un retrait &rarr;
              </Link>
            ) : (
              'Retraits dès 1 000 FCFA'
            )}
          </div>
        </div>

        {/* Catalog Items (Services or Products) */}
        <div className="bg-white border border-gray-200 rounded-sm p-4 shadow-2xs">
          <div className="flex items-center justify-between text-gray-400 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
              {isFreelancer ? 'Mes Services' : 'Produits Digitaux'}
            </span>
            {isFreelancer ? (
              <Briefcase className="w-4 h-4 text-blue-500" />
            ) : (
              <Layers className="w-4 h-4 text-purple-500" />
            )}
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-gray-950 font-heading">
            {isFreelancer ? services.length : digitalProducts.length}
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">
            {isFreelancer
              ? `${services.filter((s) => s.status === 'ACTIVE').length} prestation(s) active(s)`
              : `${digitalProducts.filter((p) => p.status === 'ACTIVE').length} fichier(s) en vente`}
          </div>
        </div>

        {/* Clients */}
        <div className="bg-white border border-gray-200 rounded-sm p-4 shadow-2xs">
          <div className="flex items-center justify-between text-gray-400 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
              Clients
            </span>
            <Users className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-gray-950 font-heading">
            {uniqueClients.length}
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">
            {uniqueClients.length === 1 ? 'client unique' : 'clients uniques'}
          </div>
        </div>
      </div>

      {/* Main Sections: Catalog summary & Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Active Offers Summary */}
        <div className="bg-white border border-gray-200 rounded-sm p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-950 font-heading">
              {isFreelancer ? 'Vos prestations publiées' : 'Vos produits en ligne'}
            </h2>
            <Link
              to={isFreelancer ? '/dashboard/services' : '/dashboard/produits'}
              className="text-xs font-semibold text-primary-700 hover:text-primary-800"
            >
              Gérer
            </Link>
          </div>

          {isFreelancer ? (
            services.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-gray-200 rounded-sm bg-gray-50/50">
                <Briefcase className="w-7 h-7 text-gray-400 mx-auto mb-2" />
                <div className="text-xs font-bold text-gray-800">Aucun service publié</div>
                <p className="text-[11px] text-gray-500 max-w-xs mx-auto mt-1 mb-3">
                  Définissez vos prestations de freelance avec vos délais et tarifs en FCFA.
                </p>
                <Link to="/dashboard/services/nouveau">
                  <Button variant="primary" size="sm" className="text-xs rounded-sm">
                    Publier mon premier service
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {services.slice(0, 3).map((srv) => (
                  <div key={srv.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-gray-900 truncate">
                        {srv.serviceName}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        {srv.category} · Délai: {srv.deliveryDays}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold text-primary-700 font-heading">
                        {srv.priceXaf.toLocaleString('fr-FR')} FCFA
                      </div>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-xs bg-emerald-50 text-emerald-700 uppercase">
                        {srv.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : digitalProducts.length === 0 ? (
            <div className="p-6 text-center border border-dashed border-gray-200 rounded-sm bg-gray-50/50">
              <Layers className="w-7 h-7 text-gray-400 mx-auto mb-2" />
              <div className="text-xs font-bold text-gray-800">Aucun produit digital</div>
              <p className="text-[11px] text-gray-500 max-w-xs mx-auto mt-1 mb-3">
                Mettez en vente vos fichiers PDF, DOCX, ZIP ou formations téléchargeables.
              </p>
              <Link to="/dashboard/produits/nouveau">
                <Button variant="primary" size="sm" className="text-xs rounded-sm">
                  Ajouter un produit digital
                </Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {digitalProducts.slice(0, 3).map((prod) => (
                <div key={prod.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-gray-900 truncate">
                      {prod.title}
                    </div>
                    <div className="text-[10px] text-gray-400">
                      Format: {prod.fileType} · {prod.downloadsCount} téléchargement(s)
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold text-primary-700 font-heading">
                      {prod.priceXaf.toLocaleString('fr-FR')} FCFA
                    </div>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-xs bg-emerald-50 text-emerald-700 uppercase">
                      {prod.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Recent Orders */}
        <div className="bg-white border border-gray-200 rounded-sm p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-950 font-heading">
              Dernières commandes reçues
            </h2>
            <Link
              to="/dashboard/commandes"
              className="text-xs font-semibold text-primary-700 hover:text-primary-800"
            >
              Historique complet
            </Link>
          </div>

          {orders.length === 0 ? (
            <div className="p-6 text-center border border-dashed border-gray-200 rounded-sm bg-gray-50/50">
              <Inbox className="w-7 h-7 text-gray-400 mx-auto mb-2" />
              <div className="text-xs font-bold text-gray-800">Aucune commande pour le moment</div>
              <p className="text-[11px] text-gray-500 max-w-xs mx-auto mt-1">
                Vos ventes et commandes apparaîtront ici dès qu'un client effectuera un achat via MTN MoMo ou Airtel Money.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {orders.slice(0, 3).map((order) => (
                <div key={order.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-gray-900 truncate">
                      {order.itemTitle}
                    </div>
                    <div className="text-[10px] text-gray-400">
                      Client: {order.buyerName} · {order.paymentChannel === 'MTN_MOMO_COG' ? 'MTN MoMo' : 'Airtel'}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold text-primary-700 font-heading">
                      {order.priceXaf.toLocaleString('fr-FR')} FCFA
                    </div>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-xs bg-primary-50 text-primary-700 uppercase">
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
