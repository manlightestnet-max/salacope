import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Trash2, ArrowUpRight, Star } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PRODUCTS } from '../../data/mockData';
import { EmptyState } from '../../components/account/EmptyState';
import { Button } from '../../components/ui/Button';
import { useProductModal } from '../../context/ProductModalContext';
import { ProductGrid } from '../../components/sections/ProductGrid';

export const UserFavorites: React.FC = () => {
  const { favorites, toggleFavorite, digitalProducts } = useAuth();
  const navigate = useNavigate();
  const { openProduct } = useProductModal();

  // Combine static catalog + user digital products
  const allAvailableItems = [
    ...PRODUCTS,
    ...digitalProducts.map((dp) => ({
      id: dp.id,
      title: dp.title,
      shortDesc: dp.description,
      description: dp.description,
      category: 'ebook' as const,
      categoryLabel: dp.category || 'Digital',
      priceXaf: dp.priceXaf,
      author: {
        name: 'Vendeur Indépendant',
        avatar: '',
        role: 'Créateur Numérique',
        location: 'Brazzaville, Congo',
      },
      rating: 5.0,
      reviewsCount: 1,
      salesCount: dp.downloadsCount,
      coverImage: dp.coverImage,
      deliveryType: 'instant_download' as const,
      deliveryTime: 'Immédiat',
      features: ['Téléchargement direct', 'Fichier ' + dp.fileType],
    })),
  ];

  const favoritedProducts = allAvailableItems.filter((item) =>
    favorites.includes(item.id)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-gray-200 rounded-sm p-5 shadow-2xs">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-gray-950 font-heading">
            Mes Favoris
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Retrouvez rapidement vos e-books, formations et prestations sauvegardés.
          </p>
        </div>
        <div className="text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-xs self-start sm:self-auto">
          {favoritedProducts.length} {favoritedProducts.length === 1 ? 'élément' : 'éléments'}
        </div>
      </div>

      {/* Content */}
      {favoritedProducts.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="Aucun favori"
          description="Les contenus et services que vous sauvegardez apparaîtront ici. Cliquez sur le cœur d'une fiche pour la conserver."
          actionLabel="Explorer le catalogue"
          onAction={() => navigate('/')}
        />
      ) : (
        <ProductGrid
          products={favoritedProducts}
          onResetFilters={() => navigate('/')}
        />
      )}
    </div>
  );
};
