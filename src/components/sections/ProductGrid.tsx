import React from 'react';
import { Product } from '../../types';
import { ProductCard } from './ProductCard';
import { Button } from '../ui/Button';
import { SearchX } from 'lucide-react';

export interface ProductGridProps {
  products: Product[];
  totalCount?: number;
  onResetFilters?: () => void;
  showHeader?: boolean;
  className?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  totalCount,
  onResetFilters,
  showHeader = false,
  className = '',
  emptyTitle,
  emptyDescription,
}) => {
  return (
    <div className={`w-full ${className}`}>
      {/* Optional Section Header */}
      {showHeader && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 font-heading">
              Produits & Services à la Une
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              Sélectionnés pour leur qualité et garantis par notre mécanisme de séquestre sécurisé.
            </p>
          </div>

          {totalCount !== undefined && (
            <div className="text-xs text-gray-500 font-medium">
              Affichage de <span className="font-semibold text-gray-900">{products.length}</span> sur{' '}
              <span className="font-semibold text-gray-900">{totalCount}</span> résultats
            </div>
          )}
        </div>
      )}

      {/* Native CSS Multi-Columns Staggered / Masonry Grid */}
      {products.length > 0 ? (
        <div className="product-masonry-grid">
          {products.map((product) => (
            <div
              key={product.id}
              className="product-masonry-item"
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-lg border border-gray-200 p-8 max-w-md mx-auto">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mx-auto mb-3">
            <SearchX className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-gray-900 font-heading">
            {emptyTitle || 'Aucun produit ne correspond à votre recherche'}
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            {emptyDescription || 'Essayez de modifier votre mot-clé ou réinitialisez les filtres de catégorie.'}
          </p>
          {onResetFilters && (
            <div className="mt-5">
              <Button variant="outline" size="sm" onClick={onResetFilters}>
                Réinitialiser la recherche
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

