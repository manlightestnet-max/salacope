import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  User,
  Heart,
  ShoppingBag,
  Users,
  Settings,
  ChevronDown,
  ChevronRight,
  Briefcase,
  Store,
  Layers,
  Inbox,
  FileCheck2,
  DollarSign,
  ArrowDownToLine,
  TrendingUp,
  Sparkles,
  ChevronLeft,
  Menu,
  X,
  ExternalLink,
  Compass,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UpgradeModal } from './UpgradeModal';

interface AccountSidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const AccountSidebar: React.FC<AccountSidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
}) => {
  const { user, favorites, purchases, following, services, digitalProducts, orders, logout } = useAuth();
  const location = useLocation();

  const [isClientSectionOpen, setIsClientSectionOpen] = useState(true);
  const [isProSectionOpen, setIsProSectionOpen] = useState(true);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  // Real counters (no fake data)
  const favoritesCount = favorites.length;
  const purchasesCount = purchases.length;
  const followingCount = following.length;
  const servicesCount = services.length;
  const productsCount = digitalProducts.length;
  const ordersCount = orders.length;

  const isPro = user.role === 'freelancer' || user.role === 'seller';

  // Navigation Item helper
  const renderNavItem = (
    to: string,
    label: string,
    icon: React.ReactNode,
    badgeCount?: number
  ) => {
    const isExplorer = to === '/compte/explorer';
    const isActive = isExplorer
      ? location.pathname === '/compte/explorer' || location.pathname === '/compte'
      : location.pathname === to;

    return (
      <NavLink
        to={to}
        onClick={onCloseMobile}
        title={isCollapsed ? label : undefined}
        className={`group relative flex items-center gap-3 px-3 py-2 rounded-sm text-xs font-medium transition-all ${
          isActive
            ? 'bg-primary-50 text-primary-950 font-bold border-l-2 border-primary-600 pl-[10px]'
            : 'text-gray-600 hover:text-gray-950 hover:bg-gray-100/70'
        }`}
      >
        <span
          className={`shrink-0 ${
            isActive ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-700'
          }`}
        >
          {icon}
        </span>

        {!isCollapsed && (
          <span className="truncate flex-1 tracking-tight">{label}</span>
        )}

        {!isCollapsed && typeof badgeCount === 'number' && badgeCount > 0 && (
          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-xs bg-gray-100 text-gray-700 shrink-0">
            {badgeCount}
          </span>
        )}

        {/* Collapsed Tooltip */}
        {isCollapsed && (
          <div className="absolute left-full ml-2 px-2 py-1 bg-gray-950 text-white text-[11px] rounded-xs whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50 shadow-md">
            {label}
            {typeof badgeCount === 'number' && badgeCount > 0 && ` (${badgeCount})`}
          </div>
        )}
      </NavLink>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full min-h-0 bg-white select-none overflow-hidden">
      {/* Top Branding / Mode */}
      <div className="h-14 border-b border-gray-100 px-3.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-7 h-7 rounded-xs bg-primary-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
            {user.role === 'freelancer' ? 'F' : user.role === 'seller' ? 'S' : 'U'}
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <div className="text-xs font-bold text-gray-900 truncate font-heading leading-tight">
                {user.name}
              </div>
              <div className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">
                {user.role === 'freelancer'
                  ? 'Freelancer'
                  : user.role === 'seller'
                  ? 'Seller'
                  : 'Compte Client'}
              </div>
            </div>
          )}
        </div>

        {/* Collapse toggle button on desktop */}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="hidden md:flex p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xs transition-colors cursor-pointer"
          title={isCollapsed ? 'Agrandir la barre latérale' : 'Réduire la barre latérale'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>

        {/* Close button on mobile */}
        <button
          type="button"
          onClick={onCloseMobile}
          className="md:hidden p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xs transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Nav List with Scrollbar */}
      <div className="flex-1 min-h-0 overflow-y-auto py-3 px-2 space-y-4 custom-scrollbar">
        {/* CATEGORY 1: MON ESPACE CLIENT (Always present for User, Freelancer, Seller) */}
        <div>
          {!isCollapsed ? (
            <button
              type="button"
              onClick={() => setIsClientSectionOpen(!isClientSectionOpen)}
              className="w-full flex items-center justify-between px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 hover:text-gray-700 transition-colors cursor-pointer mb-1"
            >
              <span>Espace Client</span>
              {isClientSectionOpen ? (
                <ChevronDown className="w-3 h-3 text-gray-400" />
              ) : (
                <ChevronRight className="w-3 h-3 text-gray-400" />
              )}
            </button>
          ) : (
            <div className="h-2" />
          )}

          {(isClientSectionOpen || isCollapsed) && (
            <div className="space-y-0.5">
              {renderNavItem('/compte/explorer', 'Explorer', <Compass className="w-4 h-4" />)}
              {renderNavItem(
                '/compte/favoris',
                'Favoris',
                <Heart className="w-4 h-4" />,
                favoritesCount
              )}
              {renderNavItem(
                '/compte/achats',
                'Mes achats',
                <ShoppingBag className="w-4 h-4" />,
                purchasesCount
              )}
              {renderNavItem(
                '/compte/following',
                'Suivis',
                <Users className="w-4 h-4" />,
                followingCount
              )}
              {renderNavItem(
                '/compte/profil',
                'Paramètres',
                <Settings className="w-4 h-4" />
              )}
            </div>
          )}
        </div>

        {/* CATEGORY 2: ESPACE PROFESSIONNEL (Rendered if role is Freelancer or Seller) */}
        {isPro && (
          <div className="pt-2 border-t border-gray-100">
            {!isCollapsed ? (
              <button
                type="button"
                onClick={() => setIsProSectionOpen(!isProSectionOpen)}
                className="w-full flex items-center justify-between px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 hover:text-gray-700 transition-colors cursor-pointer mb-1"
              >
                <span>
                  {user.role === 'freelancer' ? 'Professionnel (Freelance)' : 'Professionnel (Seller)'}
                </span>
                {isProSectionOpen ? (
                  <ChevronDown className="w-3 h-3 text-gray-400" />
                ) : (
                  <ChevronRight className="w-3 h-3 text-gray-400" />
                )}
              </button>
            ) : (
              <div className="h-2" />
            )}

            {(isProSectionOpen || isCollapsed) && (
              <div className="space-y-0.5">
                {renderNavItem('/dashboard', 'Dashboard', <TrendingUp className="w-4 h-4" />)}

                {/* Freelancer specific modules */}
                {user.role === 'freelancer' && (
                  <>
                    {renderNavItem(
                      '/dashboard/services',
                      'Services',
                      <Briefcase className="w-4 h-4" />,
                      servicesCount
                    )}
                    {renderNavItem(
                      '/dashboard/commandes',
                      'Commandes',
                      <Inbox className="w-4 h-4" />,
                      ordersCount
                    )}
                    {renderNavItem(
                      '/dashboard/clients',
                      'Clients',
                      <Users className="w-4 h-4" />
                    )}
                  </>
                )}

                {/* Seller specific modules */}
                {user.role === 'seller' && (
                  <>
                    {renderNavItem(
                      '/dashboard/produits',
                      'Produits',
                      <Layers className="w-4 h-4" />,
                      productsCount
                    )}
                    {renderNavItem(
                      '/dashboard/commandes',
                      'Ventes',
                      <Inbox className="w-4 h-4" />,
                      ordersCount
                    )}
                    {renderNavItem(
                      '/dashboard/telechargements',
                      'Téléchargements',
                      <ArrowDownToLine className="w-4 h-4" />
                    )}
                    {renderNavItem(
                      '/dashboard/clients',
                      'Clients',
                      <Users className="w-4 h-4" />
                    )}
                  </>
                )}

                {/* Common Pro Financials */}
                {renderNavItem('/dashboard/revenus', 'Revenus', <DollarSign className="w-4 h-4" />)}
                {renderNavItem('/dashboard/retraits', 'Retraits', <FileCheck2 className="w-4 h-4" />)}
              </div>
            )}
          </div>
        )}

        {/* User Role Upgrade CTA if normal User */}
        {user.role === 'user' && !isCollapsed && (
          <div className="pt-2 border-t border-gray-100">
            <div className="p-3 rounded-sm bg-gray-50 border border-gray-200 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900 font-heading">
                <Sparkles className="w-3.5 h-3.5 text-primary-600" />
                <span>Passer en Pro</span>
              </div>
              <p className="text-[11px] text-gray-500 leading-snug">
                Proposez vos services ou vendez vos produits digitaux en FCFA.
              </p>
              <button
                type="button"
                onClick={() => setIsUpgradeModalOpen(true)}
                className="w-full text-center py-1.5 px-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xs text-xs font-semibold transition-colors cursor-pointer"
              >
                Activer le mode Pro
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Mode Visiteur / Déconnexion */}
      <div className="p-3 border-t border-gray-100 shrink-0">
        <button
          type="button"
          onClick={() => {
            logout();
            onCloseMobile();
          }}
          className={`w-full flex items-center gap-2.5 text-xs text-gray-500 hover:text-gray-900 py-1.5 px-2 rounded-xs hover:bg-gray-100 transition-colors cursor-pointer ${
            isCollapsed ? 'justify-center' : ''
          }`}
          title="Basculer en vue visiteur public"
        >
          <LogOut className="w-3.5 h-3.5 text-gray-400" />
          {!isCollapsed && <span className="font-medium">Mode Visiteur (Sortir)</span>}
        </button>
      </div>

      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
      />
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Persistent, foldable, fixed viewport zone) */}
      <aside
        className={`hidden md:flex flex-col h-full shrink-0 border-r border-gray-200 transition-all duration-200 z-20 overflow-hidden bg-white ${
          isCollapsed ? 'w-18' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer (Overlay backdrop) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex overflow-hidden">
          <div
            className="fixed inset-0 bg-gray-950/50 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200 overflow-hidden">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
