import React from 'react';
import { Heart, BookOpen, LayoutGrid, PlayCircle, Briefcase } from 'lucide-react';
import { Product } from '../../types';
import { useProductModal } from '../../context/ProductModalContext';
import { useAuth } from '../../context/AuthContext';

export interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { openProduct } = useProductModal();
  const { isFavorite, toggleFavorite } = useAuth();
  const formattedPrice = `${product.priceXaf.toLocaleString('fr-FR')} FCFA`;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    openProduct(product);
  };

  const isFav = isFavorite(product.id);

  // Themed fallback gradient and icon (visible only if cover image fails to load)
  const getCategoryFallback = () => {
    const isBook =
      product.category === 'ebook' ||
      product.categoryLabel.toLowerCase().includes('book') ||
      product.categoryLabel.toLowerCase().includes('guide');

    if (isBook) {
      return {
        gradient: 'bg-gradient-to-br from-emerald-800 via-teal-900 to-slate-950',
        icon: BookOpen,
      };
    }
    if (product.category === 'template') {
      return {
        gradient: 'bg-gradient-to-br from-purple-800 via-violet-900 to-slate-950',
        icon: LayoutGrid,
      };
    }
    if (product.category === 'formation') {
      return {
        gradient: 'bg-gradient-to-br from-rose-800 via-red-950 to-zinc-950',
        icon: PlayCircle,
      };
    }
    return {
      gradient: 'bg-gradient-to-br from-blue-800 via-indigo-950 to-slate-950',
      icon: Briefcase,
    };
  };

  const fallback = getCategoryFallback();

  // Smart category breadcrumb matching reference: "E-book > Business" / "Service > Freelance"
  const getBreadcrumb = () => {
    const rawLabel = product.categoryLabel || '';
    if (product.category === 'ebook') {
      const sub = rawLabel.replace(/e-?books?\s*(&\s*guides?)?/i, '').replace(/digital/i, '').trim();
      return sub ? `E-book > ${sub}` : 'E-book > Digital';
    }
    if (product.category === 'formation') {
      const sub = rawLabel.replace(/formations?\s*(&\s*cours?)?/i, '').trim();
      return sub ? `Formation > ${sub}` : 'Formation > En ligne';
    }
    if (product.category === 'service') {
      const sub = rawLabel.replace(/services?\s*/i, '').trim();
      return sub ? `Service > ${sub}` : 'Service > Freelance';
    }
    if (product.category === 'template') {
      const sub = rawLabel.replace(/templates?\s*(&\s*fichiers?)?/i, '').trim();
      return sub ? `Template > ${sub}` : 'Template > Fichiers';
    }
    if (product.category === 'mentorat') {
      return 'Mentorat > 1:1';
    }
    return rawLabel || 'Digital';
  };

  return (
    <article className="group flex flex-col h-full bg-transparent transition-all duration-200">
      <div onClick={handleClick} className="flex flex-col h-full cursor-pointer">
        {/* 1. Pure Portrait Cover - 100% CLEAN: ZERO OVERLAYS, ZERO BADGES */}
        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-gray-900 shadow-2xs group-hover:shadow-md transition-shadow duration-200 select-none">
          {/* Themed Fallback Graphic (Behind image, shows instantly while image loads or on failure) */}
          <div className={`absolute inset-0 z-0 flex flex-col items-center justify-center p-3 text-center ${fallback.gradient}`}>
            <fallback.icon className="w-8 h-8 text-white/40 mb-1.5 transform -rotate-6" />
            <span className="text-[11px] font-bold text-white/90 line-clamp-1">{product.categoryLabel}</span>
            <span className="text-[9px] text-white/60 line-clamp-2 mt-0.5 leading-tight">{product.title}</span>
          </div>

          {/* Real Cover Image: Clean, crisp, unobscured */}
          <img
            src={product.coverImage}
            alt={product.title}
            loading="eager"
            referrerPolicy="no-referrer"
            className="relative z-10 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300 ease-out"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </div>

        {/* 2. Metadata Below the Cover (Category, Title, Author, Price) */}
        <div className="pt-2 pb-1 flex-1 flex flex-col justify-between">
          <div>
            {/* Category Breadcrumb */}
            <div className="text-[10px] sm:text-[10.5px] text-gray-400 font-medium truncate mb-0.5">
              {getBreadcrumb()}
            </div>

            {/* Title */}
            <h3 className="text-xs sm:text-[13px] font-bold text-gray-900 group-hover:text-primary-700 transition-colors line-clamp-2 leading-[1.25] font-heading mb-0.5">
              {product.title}
            </h3>

            {/* Author */}
            <div className="text-[10px] sm:text-[11px] text-gray-400 truncate mb-1">
              {product.author.name}
            </div>
          </div>

          {/* Price & Favorite Heart */}
          <div className="flex items-center justify-between pt-1 border-t border-gray-100/80">
            <span className="text-xs sm:text-[13px] font-extrabold text-primary-700 font-heading">
              {formattedPrice}
            </span>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite(product.id);
              }}
              className={`p-1 rounded-full transition-colors cursor-pointer ${
                isFav ? 'text-red-500' : 'text-gray-300 hover:text-red-400'
              }`}
              title={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            >
              <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};
