import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PRODUCTS, CATEGORIES } from '../data/mockData';
import { ProductCategory, Product } from '../types';
import { Container } from '../components/layout/Container';
import { CategoryTabBar } from '../components/layout/CategoryTabBar';
import { ProductGrid } from '../components/sections/ProductGrid';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { SlidersHorizontal, SearchX, RotateCcw, Search, X } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../context/AuthContext';

const PAGE_BATCH = 6;

export const SearchResults: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL Params
  const query = searchParams.get('q') || '';
  const typeParam = (searchParams.get('type') || searchParams.get('cat') || 'all') as ProductCategory;
  const minParam = searchParams.get('min') || '';
  const maxParam = searchParams.get('max') || '';

  // Local state for in-page search input
  const [inPageQuery, setInPageQuery] = useState<string>(query);

  // Local filter form state
  const [selectedType, setSelectedType] = useState<ProductCategory>(typeParam);
  const [selectedCategory, setSelectedCategory] = useState<string>(typeParam);
  const [minPrice, setMinPrice] = useState<string>(minParam);
  const [maxPrice, setMaxPrice] = useState<string>(maxParam);
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_BATCH);
  const [showMobileFilters, setShowMobileFilters] = useState<boolean>(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Sync state when URL searchParams change
  useEffect(() => {
    setInPageQuery(query);
    setSelectedType(typeParam);
    setSelectedCategory(typeParam);
    setMinPrice(minParam);
    setMaxPrice(maxParam);
    setVisibleCount(PAGE_BATCH);
  }, [typeParam, minParam, maxParam, query]);

  // Base list filtered by search query
  const queryFilteredProducts = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return PRODUCTS;

    return PRODUCTS.filter((product) => {
      return (
        product.title.toLowerCase().includes(q) ||
        product.shortDesc.toLowerCase().includes(q) ||
        product.description.toLowerCase().includes(q) ||
        product.author.name.toLowerCase().includes(q) ||
        product.features.some((f) => f.toLowerCase().includes(q))
      );
    });
  }, [query]);

  // Dynamic type counts based on current search query
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: queryFilteredProducts.length,
      ebook: 0,
      formation: 0,
      service: 0,
      template: 0,
      mentorat: 0,
    };

    queryFilteredProducts.forEach((p) => {
      if (counts[p.category] !== undefined) {
        counts[p.category] += 1;
      }
    });

    return counts;
  }, [queryFilteredProducts]);

  // Final filtered list applying type, category, and price range
  const filteredProducts = useMemo(() => {
    return queryFilteredProducts.filter((product) => {
      // Type/Category filter
      const activeType = typeParam;
      const matchesType = activeType === 'all' || product.category === activeType;

      // Price filter in FCFA
      const min = minParam ? parseInt(minParam, 10) : 0;
      const max = maxParam ? parseInt(maxParam, 10) : Infinity;
      const matchesPrice = product.priceXaf >= min && product.priceXaf <= max;

      return matchesType && matchesPrice;
    });
  }, [queryFilteredProducts, typeParam, minParam, maxParam]);

  // Visible products for infinite scroll
  const visibleProducts = useMemo(() => {
    return filteredProducts.slice(0, visibleCount);
  }, [filteredProducts, visibleCount]);

  // Infinite scroll auto-loader on global window scroll
  useEffect(() => {
    if (visibleCount >= filteredProducts.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + PAGE_BATCH, filteredProducts.length));
        }
      },
      { threshold: 0.1, rootMargin: '400px' }
    );

    const el = sentinelRef.current;
    if (el) observer.observe(el);

    return () => {
      if (el) observer.unobserve(el);
    };
  }, [visibleCount, filteredProducts.length]);

  // Handle in-page search bar submission
  const handleInPageSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newParams = new URLSearchParams(searchParams);
    if (inPageQuery.trim()) {
      newParams.set('q', inPageQuery.trim());
    } else {
      newParams.delete('q');
    }
    setSearchParams(newParams);
  };

  // Apply sidebar filters into URL search params
  const handleApplyFilters = () => {
    const newParams = new URLSearchParams(searchParams);

    if (selectedType && selectedType !== 'all') {
      newParams.set('type', selectedType);
      newParams.delete('cat');
    } else {
      newParams.delete('type');
      newParams.delete('cat');
    }

    if (minPrice && parseInt(minPrice, 10) > 0) {
      newParams.set('min', minPrice.trim());
    } else {
      newParams.delete('min');
    }

    if (maxPrice && parseInt(maxPrice, 10) > 0) {
      newParams.set('max', maxPrice.trim());
    } else {
      newParams.delete('max');
    }

    setSearchParams(newParams);
    setShowMobileFilters(false);
  };

  // Change type filter directly
  const handleSelectType = (catId: ProductCategory) => {
    setSelectedType(catId);
    setSelectedCategory(catId);
    const newParams = new URLSearchParams(searchParams);

    if (catId === 'all') {
      newParams.delete('type');
      newParams.delete('cat');
    } else {
      newParams.set('type', catId);
      newParams.delete('cat');
    }

    setSearchParams(newParams);
  };

  // Change category from dropdown
  const handleCategorySelectChange = (catId: string) => {
    setSelectedCategory(catId);
    setSelectedType(catId as ProductCategory);
    const newParams = new URLSearchParams(searchParams);

    if (catId === 'all') {
      newParams.delete('type');
      newParams.delete('cat');
    } else {
      newParams.set('type', catId);
      newParams.delete('cat');
    }

    setSearchParams(newParams);
  };

  // Reset all filters
  const handleClearFilters = () => {
    setSelectedType('all');
    setSelectedCategory('all');
    setMinPrice('');
    setMaxPrice('');

    const newParams = new URLSearchParams();
    if (query) {
      newParams.set('q', query);
    }
    setSearchParams(newParams);
    setShowMobileFilters(false);
  };

  const typeOptions: { id: ProductCategory; label: string }[] = [
    { id: 'all', label: 'Tous les types' },
    { id: 'ebook', label: 'E-books & Guides' },
    { id: 'formation', label: 'Formations & Cours' },
    { id: 'service', label: 'Services Freelance' },
    { id: 'template', label: 'Templates & Fichiers' },
    { id: 'mentorat', label: 'Coaching & Mentorat' },
  ];

  return (
    <div className="bg-white min-h-screen">
      {/* Category Tab Bar sticky under Header */}
      <CategoryTabBar />

      {/* In-page Search Banner (Kubeta style, clean minimal Salacope tokens) */}
      <div className="py-6 border-b border-gray-100 bg-white">
        <Container size="default">
          <div className="max-w-3xl space-y-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-950 font-heading tracking-tight">
                Recherche
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                Trouvez des e-books, formations, templates et prestations en Francs CFA (FCFA).
              </p>
            </div>

            {/* Big In-Page Search Bar */}
            <form onSubmit={handleInPageSearchSubmit} className="flex items-center gap-2 max-w-xl">
              <div className="relative flex-1 flex items-center">
                <div className="absolute left-3.5 flex items-center pointer-events-none text-gray-400">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={inPageQuery}
                  onChange={(e) => setInPageQuery(e.target.value)}
                  placeholder="Rechercher (ex: tiktok, canva, excel, logo...)"
                  className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-sm focus:bg-white text-gray-900 transition-colors focus:outline-none focus:border-primary-600 focus:ring-1 focus:ring-primary-600/20"
                />
                {inPageQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setInPageQuery('');
                      const newParams = new URLSearchParams(searchParams);
                      newParams.delete('q');
                      setSearchParams(newParams);
                    }}
                    className="absolute right-3 p-0.5 text-gray-400 hover:text-gray-700"
                    aria-label="Effacer la recherche"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <Button type="submit" variant="primary" size="md" className="rounded-sm shrink-0 px-5 text-xs font-semibold py-2.5">
                Rechercher
              </Button>
            </form>

            {/* Results count indicator */}
            <div className="flex items-center justify-between text-xs text-gray-500 font-medium pt-1">
              <div>
                <span className="font-bold text-gray-900">{filteredProducts.length}</span> {filteredProducts.length > 1 ? 'résultats trouvés' : 'résultat trouvé'} {query ? <>pour <span className="text-gray-900 font-semibold">« {query} »</span></> : ''}
              </div>

              {/* Mobile Filter Toggle Button */}
              <div className="lg:hidden">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowMobileFilters(!showMobileFilters)}
                  icon={<SlidersHorizontal className="w-3.5 h-3.5" />}
                  className="text-xs"
                >
                  {showMobileFilters ? 'Masquer les filtres' : 'Filtres'}
                </Button>
              </div>
            </div>
          </div>
        </Container>
      </div>

      {/* Main Content Area */}
      <div className="py-6 sm:py-8 bg-gray-50/50">
        <Container size="default">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Column: Filters Sidebar (Sticky under CategoryTabBar) */}
            <aside
              className={clsx(
                'lg:col-span-3 lg:sticky lg:top-28 lg:self-start space-y-6',
                !showMobileFilters && 'hidden lg:block'
              )}
            >
              <Card className="p-4 border border-gray-200 bg-white space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-900 font-heading flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-primary-600" />
                    Filtres
                  </span>
                  {(typeParam !== 'all' || minParam || maxParam) && (
                    <button
                      type="button"
                      onClick={handleClearFilters}
                      className="text-[11px] font-semibold text-primary-700 hover:underline flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Réinitialiser</span>
                    </button>
                  )}
                </div>

                {/* Block 1: Type with live counts */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Type de contenu
                  </label>
                  <div className="space-y-1">
                    {typeOptions.map((opt) => {
                      const isActive = selectedType === opt.id;
                      const count = typeCounts[opt.id] || 0;

                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleSelectType(opt.id)}
                          className={clsx(
                            'w-full flex items-center justify-between px-2.5 py-1.5 rounded-sm text-xs transition-colors text-left',
                            isActive
                              ? 'bg-primary-50 text-primary-800 font-bold'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium'
                          )}
                        >
                          <span className="truncate">{opt.label}</span>
                          <span className="text-[10px] text-gray-400 font-mono ml-2 shrink-0">
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Block 2: Category Dropdown */}
                <div className="space-y-1.5 pt-3 border-t border-gray-100">
                  <label htmlFor="category-select" className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Catégorie
                  </label>
                  <select
                    id="category-select"
                    value={selectedCategory}
                    onChange={(e) => handleCategorySelectChange(e.target.value)}
                    className="w-full bg-white text-gray-900 text-xs border border-gray-300 rounded-sm px-2.5 py-2 focus:outline-none focus:border-primary-600 font-medium"
                  >
                    <option value="all">Toutes les catégories</option>
                    {CATEGORIES.filter((c) => c.id !== 'all').map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Block 3: Price in FCFA */}
                <div className="space-y-1.5 pt-3 border-t border-gray-100">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Prix (FCFA)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <input
                        type="number"
                        placeholder="Min"
                        value={minPrice}
                        onChange={(e) => setMinPrice(e.target.value)}
                        className="w-full bg-white text-gray-900 text-xs border border-gray-300 rounded-sm px-2.5 py-1.5 focus:outline-none focus:border-primary-600 font-mono"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        placeholder="Max"
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value)}
                        className="w-full bg-white text-gray-900 text-xs border border-gray-300 rounded-sm px-2.5 py-1.5 focus:outline-none focus:border-primary-600 font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Apply Button */}
                <div className="pt-2">
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full rounded-sm text-xs font-semibold py-2"
                    onClick={handleApplyFilters}
                  >
                    Appliquer les filtres
                  </Button>
                </div>
              </Card>
            </aside>

            {/* Right Column: Natural Flow Results Grid (Zero Internal Scroll) */}
            <main className="lg:col-span-9">
              {visibleProducts.length > 0 ? (
                <div className="space-y-6 pb-12">
                  {/* Products Staggered Masonry Grid */}
                  <ProductGrid products={visibleProducts} />

                  {/* Infinite Scroll Sentinel & Status Indicator */}
                  <div ref={sentinelRef} className="pt-6 pb-4 flex flex-col items-center justify-center text-xs text-gray-500">
                    {visibleCount < filteredProducts.length ? (
                      <div className="flex items-center gap-2 py-3 px-4 rounded-sm bg-gray-50 border border-gray-200 text-gray-600 font-medium">
                        <div className="w-3.5 h-3.5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                        <span>Chargement des produits suivants...</span>
                      </div>
                    ) : (
                      <div className="text-gray-400 text-xs py-2">
                        Fin des résultats &middot; {filteredProducts.length} {filteredProducts.length > 1 ? 'produits affichés' : 'produit affiché'}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Clean Empty State */
                <Card className="p-12 text-center border border-gray-200 max-w-md mx-auto bg-white">
                  <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 mx-auto mb-3">
                    <SearchX className="w-6 h-6" />
                  </div>
                  <h2 className="text-base font-bold text-gray-950 font-heading">
                    Aucun résultat trouvé
                  </h2>
                  <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                    Aucun produit ne correspond à votre recherche {query && <strong>« {query} »</strong>} avec ces filtres.
                  </p>
                  <div className="mt-5 flex items-center justify-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearFilters}
                      className="text-xs"
                    >
                      Effacer les filtres
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      to="/"
                      className="text-xs"
                    >
                      Retour au catalogue
                    </Button>
                  </div>
                </Card>
              )}
            </main>

          </div>
        </Container>
      </div>
    </div>
  );
};
