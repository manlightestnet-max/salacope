import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  User,
  Heart,
  ShoppingBag,
  Users,
  Briefcase,
  Store,
  Layers,
  ArrowRight,
  TrendingUp,
  DollarSign,
  Plus,
  Sparkles,
  ShieldCheck,
  PackageCheck,
  Clock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { UpgradeModal } from '../../components/account/UpgradeModal';

export const AccountOverview: React.FC = () => {
  const {
    user,
    favorites,
    purchases,
    following,
    services,
    digitalProducts,
    orders,
    totalRevenue,
    availableBalance,
  } = useAuth();

  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  const isPro = user.role === 'freelancer' || user.role === 'seller';

  return (
    <div className="space-y-6">
      {/* Top Welcome Card */}
      <div className="bg-white border border-gray-200 rounded-sm p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-xs bg-gray-100 text-gray-700">
                {user.role === 'freelancer'
                  ? 'Freelancer Vérifié'
                  : user.role === 'seller'
                  ? 'Seller Vérifié'
                  : 'Compte Acheteur'}
              </span>
              <span className="text-xs text-gray-400">·</span>
              <span className="text-xs text-gray-400">
                Membre depuis {new Date(user.createdAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-950 font-heading">
              Bonjour, {user.name}
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Bienvenue dans votre espace de travail Salacope.online.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {user.role === 'user' ? (
              <Button
                variant="primary"
                size="sm"
                icon={<Sparkles className="w-3.5 h-3.5" />}
                onClick={() => setIsUpgradeModalOpen(true)}
                className="text-xs rounded-sm font-semibold"
              >
                Passer en compte Pro
              </Button>
            ) : user.role === 'freelancer' ? (
              <Link to="/dashboard/services/nouveau">
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Plus className="w-3.5 h-3.5" />}
                  className="text-xs rounded-sm font-semibold"
                >
                  Publier un service
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
                  Ajouter un produit
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Primary Metrics Grid (Strictly real data - 0 fake numbers) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
        {/* Favoris */}
        <Link
          to="/compte/favoris"
          className="bg-white border border-gray-200 rounded-sm p-4 hover:border-gray-300 transition-colors shadow-2xs group"
        >
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              Mes Favoris
            </span>
            <Heart className="w-4 h-4 text-gray-400 group-hover:text-primary-600 transition-colors" />
          </div>
          <div className="text-xl font-extrabold text-gray-950 font-heading">
            {favorites.length}
          </div>
          <div className="text-[10px] text-gray-400 mt-1">
            {favorites.length === 1 ? 'élément sauvegardé' : 'éléments sauvegardés'}
          </div>
        </Link>

        {/* Achats */}
        <Link
          to="/compte/achats"
          className="bg-white border border-gray-200 rounded-sm p-4 hover:border-gray-300 transition-colors shadow-2xs group"
        >
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              Mes Achats
            </span>
            <ShoppingBag className="w-4 h-4 text-gray-400 group-hover:text-primary-600 transition-colors" />
          </div>
          <div className="text-xl font-extrabold text-gray-950 font-heading">
            {purchases.length}
          </div>
          <div className="text-[10px] text-gray-400 mt-1">
            {purchases.length === 1 ? 'commande effectuée' : 'commandes effectuées'}
          </div>
        </Link>

        {/* Créateurs suivis */}
        <Link
          to="/compte/following"
          className="bg-white border border-gray-200 rounded-sm p-4 hover:border-gray-300 transition-colors shadow-2xs group"
        >
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              Abonnements
            </span>
            <Users className="w-4 h-4 text-gray-400 group-hover:text-primary-600 transition-colors" />
          </div>
          <div className="text-xl font-extrabold text-gray-950 font-heading">
            {following.length}
          </div>
          <div className="text-[10px] text-gray-400 mt-1">
            {following.length === 1 ? 'créateur suivi' : 'créateurs suivis'}
          </div>
        </Link>

        {/* Pro Workspace Metrics */}
        {isPro ? (
          <Link
            to="/dashboard/revenus"
            className="bg-white border border-gray-200 rounded-sm p-4 hover:border-gray-300 transition-colors shadow-2xs group"
          >
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Solde disponible
              </span>
              <DollarSign className="w-4 h-4 text-primary-600" />
            </div>
            <div className="text-xl font-extrabold text-primary-700 font-heading">
              {availableBalance.toLocaleString('fr-FR')} FCFA
            </div>
            <div className="text-[10px] text-gray-400 mt-1">
              Retirable via Mobile Money
            </div>
          </Link>
        ) : (
          <div
            onClick={() => setIsUpgradeModalOpen(true)}
            className="bg-primary-50/40 border border-dashed border-primary-200 rounded-sm p-4 hover:bg-primary-50/70 transition-colors cursor-pointer group"
          >
            <div className="flex items-center justify-between text-primary-700 mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider">
                Espace Pro
              </span>
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-gray-900 font-heading">
              Débloquer la vente
            </div>
            <div className="text-[10px] text-gray-500 mt-1">
              Devenez Freelancer ou Seller
            </div>
          </div>
        )}
      </div>

      {/* Pro Stats Panel (Rendered only for Freelancer or Seller) */}
      {isPro && (
        <div className="bg-white border border-gray-200 rounded-sm p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-950 font-heading">
                Activité professionnelle en direct
              </h2>
              <p className="text-xs text-gray-500">
                {user.role === 'freelancer' ? 'Vos services et commandes' : 'Vos produits digitaux et ventes'}
              </p>
            </div>
            <Link
              to="/dashboard"
              className="text-xs font-semibold text-primary-700 hover:text-primary-800 flex items-center gap-1"
            >
              <span>Accéder au dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-gray-100">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                {user.role === 'freelancer' ? 'Services actifs' : 'Produits en vente'}
              </div>
              <div className="text-base font-bold text-gray-900 mt-0.5">
                {user.role === 'freelancer' ? services.length : digitalProducts.length}
              </div>
            </div>

            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                Commandes reçues
              </div>
              <div className="text-base font-bold text-gray-900 mt-0.5">
                {orders.length}
              </div>
            </div>

            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                Chiffre d'affaires
              </div>
              <div className="text-base font-bold text-gray-900 mt-0.5">
                {totalRevenue.toLocaleString('fr-FR')} FCFA
              </div>
            </div>

            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                Statut des paiements
              </div>
              <div className="text-xs font-semibold text-primary-700 mt-1 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>MTN / Airtel Congo</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Two Column Layout: Recent Purchases & Help / Security */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Purchases (2 cols) */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-sm p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-950 font-heading">
              Derniers achats & téléchargements
            </h2>
            <Link
              to="/compte/achats"
              className="text-xs font-semibold text-primary-700 hover:text-primary-800"
            >
              Tout voir
            </Link>
          </div>

          {purchases.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-gray-200 rounded-sm bg-gray-50/50">
              <ShoppingBag className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <div className="text-xs font-bold text-gray-800">Aucun achat pour le moment</div>
              <p className="text-[11px] text-gray-500 max-w-xs mx-auto mt-1 mb-3">
                Votre historique d'achats apparaîtra ici dès que vous aurez commandé un e-book, document ou service.
              </p>
              <Link to="/compte/explorer">
                <Button variant="outline" size="sm" className="text-xs rounded-sm">
                  Explorer le catalogue
                </Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {purchases.slice(0, 3).map((purchase) => (
                <div key={purchase.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-gray-900 truncate">
                      {purchase.title}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      {new Date(purchase.purchasedAt).toLocaleDateString('fr-FR')} · {purchase.creatorName}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold text-primary-700 font-heading">
                      {purchase.priceXaf.toLocaleString('fr-FR')} FCFA
                    </div>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-primary-50 text-primary-700 rounded-xs uppercase">
                      {purchase.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Security & Inheritance notice */}
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-sm p-4.5 shadow-2xs space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-950 font-heading">
              <ShieldCheck className="w-4 h-4 text-primary-600" />
              <span>Garantie Salacope</span>
            </div>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Toutes vos transactions sont vérifiées et certifiées via les passerelles Mobile Money de la République du Congo (MTN MoMo & Airtel Money).
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-sm p-4.5 shadow-2xs space-y-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Architecture de compte
            </div>
            <p className="text-[11px] text-gray-600 leading-relaxed">
              Votre compte client est universel. Si vous vendez des produits ou proposez des services, vous continuez d'accéder à l'ensemble de vos avantages acheteur depuis cette même interface.
            </p>
          </div>
        </div>
      </div>

      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
      />
    </div>
  );
};
