import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ShoppingBag, Search, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { useAuth } from '../../context/AuthContext';

export const Header: React.FC = () => {
  const { user, isAuthenticated, login } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const currentQuery = searchParams.get('q') || '';
  const [searchInput, setSearchInput] = useState(currentQuery);

  React.useEffect(() => {
    setSearchInput(searchParams.get('q') || '');
  }, [searchParams]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      navigate(`/pesquisa?q=${encodeURIComponent(searchInput.trim())}`);
    } else {
      navigate('/pesquisa');
    }
  };

  const handleClearSearch = () => {
    setSearchInput('');
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('q');
    if (window.location.pathname === '/pesquisa') {
      const remaining = newParams.toString();
      navigate(remaining ? `/pesquisa?${remaining}` : '/pesquisa');
    } else {
      navigate(`/?${newParams.toString()}`);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100">
      {/* Main Bar: Logo, Search, Actions */}
      <div className="max-w-[1360px] mx-auto px-3 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-6 sm:gap-10">
          
          {/* Minimalist Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0 select-none">
            <div className="w-7 h-7 rounded-sm bg-primary-600 flex items-center justify-center text-white">
              <ShoppingBag className="w-3.5 h-3.5" />
            </div>
            <span className="text-base font-bold tracking-tight text-gray-950 font-heading">
              Salacope<span className="text-primary-600">.online</span>
            </span>
          </Link>

          {/* Minimalist Search Input */}
          <form onSubmit={handleSearchSubmit} className="flex-1 max-w-xl relative">
            <div className="relative flex items-center">
              <div className="absolute left-3 flex items-center pointer-events-none text-gray-400">
                <Search className="w-3.5 h-3.5" />
              </div>

              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Rechercher un e-book, une formation, un service..."
                className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-gray-100/70 hover:bg-gray-100 focus:bg-white text-gray-900 rounded-sm transition-all focus:outline-none focus:ring-1 focus:ring-primary-600/30"
              />

              {searchInput && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-2.5 p-0.5 text-gray-400 hover:text-gray-700"
                  aria-label="Effacer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </form>

          {/* Clean minimal actions */}
          <div className="flex items-center gap-3.5 shrink-0 text-xs">
            {isAuthenticated ? (
              <>
                {user.role === 'user' ? (
                  <Link
                    to="/vendre"
                    className="text-gray-600 hover:text-gray-950 font-medium transition-colors hidden sm:inline"
                  >
                    Vendre
                  </Link>
                ) : (
                  <Link
                    to="/dashboard"
                    className="text-primary-700 hover:text-primary-800 font-bold transition-colors hidden sm:inline"
                  >
                    Workspace Pro
                  </Link>
                )}

                <Link to="/compte/explorer">
                  <Button
                    variant="primary"
                    size="sm"
                    className="rounded-sm font-semibold px-3 py-1.5 flex items-center gap-1.5"
                  >
                    <div className="w-4 h-4 rounded-xs bg-white/20 flex items-center justify-center text-[10px] font-bold">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <span>Mon Compte</span>
                  </Button>
                </Link>
              </>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  login();
                  navigate('/compte/explorer');
                }}
                className="rounded-sm font-semibold px-3.5 py-1.5 cursor-pointer"
              >
                Connexion
              </Button>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
