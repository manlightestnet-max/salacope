import React from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';

export const CategoryTabBar: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isSearchPage = location.pathname === '/pesquisa';
  const isInsideAccount = location.pathname.startsWith('/compte');
  const currentCat = isSearchPage ? null : (searchParams.get('cat') || 'all');

  const categories = [
    { id: 'all', label: 'Tout le catalogue' },
    { id: 'ebook', label: 'E-books & Guides' },
    { id: 'formation', label: 'Formations & Cours' },
    { id: 'service', label: 'Services Freelance' },
    { id: 'template', label: 'Templates & Fichiers' },
    { id: 'mentorat', label: 'Coaching & Mentorat' },
  ];

  const handleCategoryClick = (catId: string) => {
    const basePath = isInsideAccount ? '/compte/explorer' : '/';
    if (catId === 'all') {
      navigate(basePath);
    } else {
      navigate(`${basePath}?cat=${catId}`);
    }
  };

  return (
    <div
      className={`sticky z-20 bg-white/95 backdrop-blur-md border-b border-gray-100 ${
        isInsideAccount ? 'top-0' : 'top-16'
      }`}
    >
      <div className="max-w-[1360px] mx-auto px-3 sm:px-6">
        <nav className="flex items-center gap-6 overflow-x-auto custom-scrollbar text-xs py-2.5">
          {categories.map((cat) => {
            const isActive = currentCat === cat.id;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategoryClick(cat.id)}
                className={`pb-1 whitespace-nowrap transition-colors select-none font-medium ${
                  isActive
                    ? 'text-primary-700 font-bold border-b-2 border-primary-600'
                    : 'text-gray-500 hover:text-gray-900 border-b-2 border-transparent'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
