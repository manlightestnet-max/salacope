import React, { useMemo, useState, useEffect } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { ProductCategory } from '../types';
import { PRODUCTS, CATEGORIES } from '../data/mockData';
import { Container } from '../components/layout/Container';
import { ProductGrid } from '../components/sections/ProductGrid';
import { HowItWorks } from '../components/sections/HowItWorks';
import { PaymentPartners } from '../components/sections/PaymentPartners';
import { CreatorCTA } from '../components/sections/CreatorCTA';
import { SlidersHorizontal, SearchX } from 'lucide-react';
import { CategoryTabBar } from '../components/layout/CategoryTabBar';

export const Home: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const isInsideAccount = location.pathname.startsWith('/compte');
  const currentCategory = (searchParams.get('cat') || searchParams.get('type') || 'all') as ProductCategory;
  const currentSearch = searchParams.get('q') || '';
  const currentSort = searchParams.get('sort') || 'popular';
  const minParam = searchParams.get('min') || '';
  const maxParam = searchParams.get('max') || '';

  const [sortBy, setSortBy] = useState<'popular' | 'price_asc' | 'price_desc' | 'rating'>(
    (currentSort as any) || 'popular'
  );

  useEffect(() => {
    if (currentSort && currentSort !== sortBy) {
      setSortBy(currentSort as any);
    }
  }, [currentSort]);

  // Filter products
  const filteredProducts = useMemo(() => {
    return PRODUCTS.filter((product) => {
      const matchesCategory =
        currentCategory === 'all' || product.category === currentCategory;

      const q = currentSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        product.title.toLowerCase().includes(q) ||
        product.shortDesc.toLowerCase().includes(q) ||
        product.author.name.toLowerCase().includes(q) ||
        product.features.some((f) => f.toLowerCase().includes(q));

      const min = minParam ? parseInt(minParam, 10) : 0;
      const max = maxParam ? parseInt(maxParam, 10) : Infinity;
      const matchesPrice = product.priceXaf >= min && product.priceXaf <= max;

      return matchesCategory && matchesSearch && matchesPrice;
    }).sort((a, b) => {
      if (sortBy === 'price_asc') return a.priceXaf - b.priceXaf;
      if (sortBy === 'price_desc') return b.priceXaf - a.priceXaf;
      if (sortBy === 'rating') return b.rating - a.rating;
      return b.salesCount - a.salesCount;
    });
  }, [currentCategory, currentSearch, minParam, maxParam, sortBy]);

  const activeCategoryLabel = useMemo(() => {
    const found = CATEGORIES.find((c) => c.id === currentCategory);
    return found ? found.label : 'Tout le catalogue';
  }, [currentCategory]);

  const handleReset = () => {
    setSearchParams({});
  };

  const handleSortChange = (newSort: 'popular' | 'price_asc' | 'price_desc' | 'rating') => {
    setSortBy(newSort);
    const newParams = new URLSearchParams(searchParams);
    if (newSort === 'popular') {
      newParams.delete('sort');
    } else {
      newParams.set('sort', newSort);
    }
    setSearchParams(newParams);
  };

  return (
    <div className="bg-white min-h-screen">
      {/* Category Tab Bar dedicated to Catalogue */}
      <CategoryTabBar />
      
      {/* Storefront Header Bar: Clean, airy, minimal */}
      <div className="py-6 border-b border-gray-100">
        <Container size="default">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            
            {/* Title & Count */}
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-bold font-heading text-gray-950">
                  {activeCategoryLabel}
                </h1>
                <span className="text-xs text-gray-400 font-medium">
                  ({filteredProducts.length})
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Paiement Mobile Money direct au Congo (MTN MoMo & Airtel Money).
              </p>
            </div>

            {/* Sort & Reset */}
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5 text-gray-500">
                <SlidersHorizontal className="w-3.5 h-3.5 text-gray-400" />
                <span className="font-medium">Trier par :</span>
                <select
                  value={sortBy}
                  onChange={(e) => handleSortChange(e.target.value as any)}
                  className="bg-transparent text-gray-900 font-semibold focus:outline-none cursor-pointer py-1"
                >
                  <option value="popular">Plus demandés</option>
                  <option value="rating">Mieux notés</option>
                  <option value="price_asc">Prix croissant</option>
                  <option value="price_desc">Prix décroissant</option>
                </select>
              </div>

              {(currentCategory !== 'all' || currentSearch) && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-primary-700 font-medium hover:underline"
                >
                  Effacer les filtres
                </button>
              )}
            </div>

          </div>
        </Container>
      </div>

      {/* Main Direct Storefront Grid (Native CSS Multi-Columns Staggered Masonry) */}
      <section className="py-5 sm:py-7">
        <Container size="wide">
          <ProductGrid
            products={filteredProducts}
            onResetFilters={handleReset}
            emptyTitle="Aucun produit dans cette sélection"
            emptyDescription="Modifiez vos critères pour afficher d'autres articles."
          />
        </Container>
      </section>

      {/* Marketing Landing Sections are for public unauthenticated visitors ONLY */}
      {!isInsideAccount && (
        <>
          {/* How it Works: Clean, breathable */}
          <HowItWorks />

          {/* Seller CTA: Light and airy (No heavy neo-dark box) */}
          <CreatorCTA />

          {/* Payment Rails */}
          <PaymentPartners />
        </>
      )}
    </div>
  );
};
