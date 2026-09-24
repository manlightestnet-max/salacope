import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Menu,
  ShoppingBag,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Check,
  ChevronDown,
  Layers,
  Briefcase,
  User as UserIcon,
  Search,
  X,
  SlidersHorizontal,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AccountSidebar } from './AccountSidebar';
import { UpgradeModal } from './UpgradeModal';
import { UserRole } from '../../types';
import { ProductModalProvider, useProductModal } from '../../context/ProductModalContext';
import { ProductDialog } from '../modals/ProductDialog';

const AccountShellInner: React.FC = () => {
  const { user, switchRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { activeProduct, closeProduct, openProduct } = useProductModal();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);

  const currentQ = searchParams.get('q') || '';
  const [searchInputValue, setSearchInputValue] = useState(currentQ);

  // Filter Popover States
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState(
    searchParams.get('cat') || searchParams.get('type') || 'all'
  );
  const [filterSort, setFilterSort] = useState(searchParams.get('sort') || 'popular');
  const [filterMin, setFilterMin] = useState(searchParams.get('min') || '');
  const [filterMax, setFilterMax] = useState(searchParams.get('max') || '');

  useEffect(() => {
    setSearchInputValue(searchParams.get('q') || '');
    setFilterCategory(searchParams.get('cat') || searchParams.get('type') || 'all');
    setFilterSort(searchParams.get('sort') || 'popular');
    setFilterMin(searchParams.get('min') || '');
    setFilterMax(searchParams.get('max') || '');
  }, [searchParams]);

  const activeFiltersCount =
    (filterCategory !== 'all' ? 1 : 0) +
    (filterSort !== 'popular' ? 1 : 0) +
    (filterMin ? 1 : 0) +
    (filterMax ? 1 : 0);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    const q = searchInputValue.trim();
    if (q) {
      params.set('q', q);
    } else {
      params.delete('q');
    }
    navigate(`/compte/explorer?${params.toString()}`);
  };

  const handleClearSearch = () => {
    setSearchInputValue('');
    const params = new URLSearchParams(searchParams);
    params.delete('q');
    const remaining = params.toString();
    navigate(remaining ? `/compte/explorer?${remaining}` : '/compte/explorer');
  };

  const handleApplyFilters = () => {
    const params = new URLSearchParams(searchParams);
    if (searchInputValue.trim()) {
      params.set('q', searchInputValue.trim());
    } else {
      params.delete('q');
    }

    if (filterCategory && filterCategory !== 'all') {
      params.set('cat', filterCategory);
    } else {
      params.delete('cat');
      params.delete('type');
    }

    if (filterSort && filterSort !== 'popular') {
      params.set('sort', filterSort);
    } else {
      params.delete('sort');
    }

    if (filterMin && parseInt(filterMin, 10) > 0) {
      params.set('min', filterMin.trim());
    } else {
      params.delete('min');
    }

    if (filterMax && parseInt(filterMax, 10) > 0) {
      params.set('max', filterMax.trim());
    } else {
      params.delete('max');
    }

    setIsFilterMenuOpen(false);
    navigate(`/compte/explorer?${params.toString()}`);
  };

  const handleResetFilters = () => {
    setFilterCategory('all');
    setFilterSort('popular');
    setFilterMin('');
    setFilterMax('');

    const params = new URLSearchParams();
    if (searchInputValue.trim()) {
      params.set('q', searchInputValue.trim());
    }
    setIsFilterMenuOpen(false);
    const remaining = params.toString();
    navigate(remaining ? `/compte/explorer?${remaining}` : '/compte/explorer');
  };

  // Generate breadcrumb text from pathname
  const getBreadcrumbs = () => {
    const path = location.pathname;
    if (path === '/compte' || path === '/compte/explorer') return ['Maison', 'Explorer'];
    if (path === '/compte/favoris') return ['Maison', 'Favoris'];
    if (path === '/compte/achats') return ['Maison', 'Mes achats'];
    if (path === '/compte/following') return ['Maison', 'Créateurs suivis'];
    if (path.startsWith('/compte/checkout')) return ['Maison', 'Commande sécurisée'];
    if (path === '/compte/profil') return ['Maison', 'Paramètres & Profil'];

    if (path === '/dashboard') return ['Professionnel', 'Tableau de bord'];
    if (path === '/dashboard/services') return ['Professionnel', 'Mes Services'];
    if (path === '/dashboard/services/nouveau') return ['Professionnel', 'Nouveau Service'];
    if (path === '/dashboard/produits') return ['Professionnel', 'Mes Produits'];
    if (path === '/dashboard/produits/nouveau') return ['Professionnel', 'Nouveau Produit'];
    if (path.startsWith('/dashboard/commandes/')) {
      const orderId = path.split('/')[3] || '';
      return ['Professionnel', 'Commandes', `#${orderId.slice(0, 8)}`];
    }
    if (path === '/dashboard/commandes') return ['Professionnel', 'Commandes & Ventes'];
    if (path === '/dashboard/clients') return ['Professionnel', 'Clients'];
    if (path === '/dashboard/telechargements') return ['Professionnel', 'Téléchargements'];
    if (path === '/dashboard/revenus') return ['Professionnel', 'Revenus'];
    if (path === '/dashboard/retraits') return ['Professionnel', 'Retraits'];

    return ['Maison'];
  };

  const breadcrumbs = getBreadcrumbs();
  const isExplorer = location.pathname === '/compte/explorer' || location.pathname === '/compte';
  const isOrderWorkspace = location.pathname.startsWith('/dashboard/commandes/') && location.pathname !== '/dashboard/commandes';

  const mainContentRef = React.useRef<HTMLElement | null>(null);

  // Reset main content scroll when route changes
  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTop = 0;
    }
  }, [location.pathname]);

  return (
    <div className="h-[100dvh] max-h-[100dvh] bg-gray-50 flex flex-col font-body text-gray-900 antialiased overflow-hidden selection:bg-primary-600 selection:text-white">
      {/* Top Application Header / Context Bar — FIXE (flex-shrink: 0) */}
      <header className="shrink-0 h-14 bg-white border-b border-gray-200 px-3 sm:px-6 flex items-center justify-between gap-3 z-30">
        {/* Left Side: Mobile toggle + Logo + Breadcrumb */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="md:hidden p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xs transition-colors"
            aria-label="Ouvrir le menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link to="/compte/explorer" className="flex items-center gap-2 select-none">
            <div className="w-6 h-6 rounded-xs bg-primary-600 flex items-center justify-center text-white">
              <ShoppingBag className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs sm:text-sm font-bold tracking-tight text-gray-950 font-heading hidden sm:inline">
              Salacope<span className="text-primary-600">.online</span>
            </span>
          </Link>

          {/* Breadcrumb path */}
          <div className="hidden md:flex items-center gap-1.5 text-xs text-gray-400 pl-2 border-l border-gray-100">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={crumb}>
                {idx > 0 && <span>/</span>}
                <span
                  className={
                    idx === breadcrumbs.length - 1
                      ? 'text-gray-900 font-semibold truncate max-w-[160px]'
                      : 'text-gray-500 hover:text-gray-700'
                  }
                >
                  {crumb}
                </span>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Center: Search Bar with Filters inside App Shell */}
        <div className="flex-1 max-w-xs sm:max-w-md mx-2 sm:mx-4 relative">
          <form onSubmit={handleSearchSubmit} className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Explorer le catalogue..."
              value={searchInputValue}
              onChange={(e) => setSearchInputValue(e.target.value)}
              className="w-full pl-9 pr-16 py-1.5 text-xs bg-gray-100 hover:bg-gray-100/80 focus:bg-white border border-transparent focus:border-primary-500 rounded-sm outline-none transition-all placeholder:text-gray-400"
            />

            <div className="absolute right-1.5 flex items-center gap-1">
              {searchInputValue.trim().length > 0 && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer p-1"
                  title="Effacer la recherche"
                >
                  <X className="w-3 h-3" />
                </button>
              )}

              {/* Filter Button */}
              <button
                type="button"
                onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                className={`flex items-center gap-1 px-1.5 py-1 rounded-xs text-[11px] font-semibold transition-colors cursor-pointer ${
                  activeFiltersCount > 0 || isFilterMenuOpen
                    ? 'bg-primary-50 text-primary-700 border border-primary-200'
                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-200/60'
                }`}
                title="Filtres du catalogue"
              >
                <SlidersHorizontal className="w-3 h-3" />
                {activeFiltersCount > 0 && (
                  <span className="w-3.5 h-3.5 rounded-full bg-primary-600 text-white text-[9px] font-bold flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
            </div>
          </form>

          {/* Filter Popover Dropdown */}
          {isFilterMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsFilterMenuOpen(false)}
              />
              <div className="absolute left-0 right-0 sm:right-auto sm:w-84 top-full mt-2 bg-white border border-gray-200 rounded-sm shadow-xl p-4 z-50 text-xs space-y-3.5 animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                  <div className="flex items-center gap-1.5 font-bold text-gray-900 font-heading">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-primary-600" />
                    <span>Filtres du catalogue</span>
                  </div>
                  {activeFiltersCount > 0 && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="text-[11px] text-primary-700 hover:underline font-medium cursor-pointer"
                    >
                      Réinitialiser
                    </button>
                  )}
                </div>

                {/* Category selector */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Catégorie
                  </label>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xs py-1.5 px-2.5 text-xs text-gray-800 focus:bg-white focus:border-primary-500 outline-none"
                  >
                    <option value="all">Tout le catalogue</option>
                    <option value="ebook">E-books & Guides</option>
                    <option value="formation">Formations & Cours</option>
                    <option value="service">Services Freelance</option>
                    <option value="template">Templates & Fichiers</option>
                    <option value="mentorat">Coaching & Mentorat</option>
                  </select>
                </div>

                {/* Sort selector */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Trier par
                  </label>
                  <select
                    value={filterSort}
                    onChange={(e) => setFilterSort(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xs py-1.5 px-2.5 text-xs text-gray-800 focus:bg-white focus:border-primary-500 outline-none"
                  >
                    <option value="popular">Plus demandés</option>
                    <option value="rating">Mieux notés</option>
                    <option value="price_asc">Prix croissant (FCFA)</option>
                    <option value="price_desc">Prix décroissant (FCFA)</option>
                  </select>
                </div>

                {/* Price range */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Prix (FCFA)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="Min FCFA"
                      value={filterMin}
                      onChange={(e) => setFilterMin(e.target.value)}
                      className="bg-gray-50 border border-gray-200 rounded-xs py-1.5 px-2 text-xs text-gray-800 focus:bg-white focus:border-primary-500 outline-none placeholder:text-gray-400"
                    />
                    <input
                      type="number"
                      placeholder="Max FCFA"
                      value={filterMax}
                      onChange={(e) => setFilterMax(e.target.value)}
                      className="bg-gray-50 border border-gray-200 rounded-xs py-1.5 px-2 text-xs text-gray-800 focus:bg-white focus:border-primary-500 outline-none placeholder:text-gray-400"
                    />
                  </div>
                </div>

                {/* Submit button */}
                <div className="pt-2 border-t border-gray-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsFilterMenuOpen(false)}
                    className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900 rounded-xs border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    Fermer
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyFilters}
                    className="px-4 py-1.5 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xs transition-colors cursor-pointer shadow-2xs"
                  >
                    Appliquer
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right Side: Role Badge & Switcher + Profile dropdown */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Quick Role Switcher Dropdown (Allows seamless switching or testing between roles) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
              className="flex items-center gap-1.5 py-1 px-2.5 rounded-sm border border-gray-200 hover:border-gray-300 bg-white text-xs font-medium text-gray-700 hover:text-gray-900 transition-colors cursor-pointer"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  user.role === 'freelancer'
                    ? 'bg-blue-500'
                    : user.role === 'seller'
                    ? 'bg-purple-500'
                    : 'bg-primary-500'
                }`}
              />
              <span className="capitalize font-semibold text-[11px] sm:text-xs">
                {user.role === 'freelancer'
                  ? 'Mode Freelancer'
                  : user.role === 'seller'
                  ? 'Mode Seller'
                  : 'Mode Client'}
              </span>
              <ChevronDown className="w-3 h-3 text-gray-400 ml-0.5" />
            </button>

            {isRoleDropdownOpen && (
              <div
                className="absolute right-0 mt-1 w-56 bg-white border border-gray-200 rounded-sm shadow-lg py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100"
                onClick={() => setIsRoleDropdownOpen(false)}
              >
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Changer de rôle actif
                </div>

                <button
                  type="button"
                  onClick={() => switchRole('user')}
                  className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-gray-50 transition-colors cursor-pointer ${
                    user.role === 'user' ? 'text-primary-700 font-bold bg-primary-50/50' : 'text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <UserIcon className="w-3.5 h-3.5 text-gray-500" />
                    <span>Client (Acheteur)</span>
                  </div>
                  {user.role === 'user' && <Check className="w-3.5 h-3.5 text-primary-600" />}
                </button>

                <button
                  type="button"
                  onClick={() => switchRole('freelancer')}
                  className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-gray-50 transition-colors cursor-pointer ${
                    user.role === 'freelancer'
                      ? 'text-primary-700 font-bold bg-primary-50/50'
                      : 'text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                    <span>Freelancer (Services)</span>
                  </div>
                  {user.role === 'freelancer' && (
                    <Check className="w-3.5 h-3.5 text-primary-600" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => switchRole('seller')}
                  className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-gray-50 transition-colors cursor-pointer ${
                    user.role === 'seller' ? 'text-primary-700 font-bold bg-primary-50/50' : 'text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-purple-600" />
                    <span>Seller (Produits Digitaux)</span>
                  </div>
                  {user.role === 'seller' && <Check className="w-3.5 h-3.5 text-primary-600" />}
                </button>
              </div>
            )}
          </div>

          {/* Upgrade CTA button if in normal user mode */}
          {user.role === 'user' && (
            <button
              type="button"
              onClick={() => setIsUpgradeModalOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 py-1 px-3 bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold rounded-xs transition-colors cursor-pointer"
            >
              <Sparkles className="w-3 h-3" />
              <span>Passer en Pro</span>
            </button>
          )}

          {/* User Avatar & name badge */}
          <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
            <div className="w-7 h-7 rounded-xs bg-gray-900 text-white flex items-center justify-center text-xs font-bold font-heading">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs font-semibold text-gray-900 hidden lg:inline max-w-[120px] truncate">
              {user.name}
            </span>
          </div>
        </div>
      </header>

      {/* Main App Layout (App Body): Sidebar + Main content container */}
      <div className="flex-1 min-h-0 min-w-0 flex overflow-hidden">
        {/* Foldable Sidebar (Fixed zone with its own isolated scroll if needed) */}
        <AccountSidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />

        {/* Content Viewport Container (The ONLY scrollable zone of the CRM application) */}
        <div className="flex-1 min-h-0 min-w-0 flex flex-col relative overflow-hidden">
          {isExplorer ? (
            <main
              ref={mainContentRef}
              className="flex-1 min-h-0 min-w-0 overflow-y-auto bg-white custom-scrollbar focus:outline-none"
              tabIndex={-1}
            >
              <Outlet />
            </main>
          ) : isOrderWorkspace ? (
            <main
              ref={mainContentRef}
              className="flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden bg-gray-50 focus:outline-none"
              tabIndex={-1}
            >
              <Outlet />
            </main>
          ) : (
            <main
              ref={mainContentRef}
              className="flex-1 min-h-0 min-w-0 overflow-y-auto bg-gray-50/70 p-4 sm:p-6 lg:p-8 custom-scrollbar focus:outline-none"
              tabIndex={-1}
            >
              <div className="max-w-[1440px] mx-auto">
                <Outlet />
              </div>
            </main>
          )}

          {/* Product Dialog Scoped Strictly to Content Area (Left sidebar stays 100% visible & active) */}
          {activeProduct && (
            <ProductDialog
              product={activeProduct}
              onClose={closeProduct}
              onSelectProduct={openProduct}
              isScopedToMain={true}
            />
          )}
        </div>
      </div>

      {/* Upgrade Pro Modal */}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
      />
    </div>
  );
};

export const AccountShell: React.FC = () => {
  return (
    <ProductModalProvider>
      <AccountShellInner />
    </ProductModalProvider>
  );
};
