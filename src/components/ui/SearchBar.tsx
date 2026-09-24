import React from 'react';
import { Search, X } from 'lucide-react';
import clsx from 'clsx';

export interface SearchBarProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  onSubmit,
  placeholder = 'Rechercher un produit, service ou compétence...',
  className,
  autoFocus,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && onSubmit) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div
      className={clsx(
        'relative flex items-center bg-white border border-gray-300 rounded-lg shadow-xs hover:border-gray-400 focus-within:border-primary-600 focus-within:ring-2 focus-within:ring-primary-600/10 transition-all',
        className
      )}
    >
      <div className="pl-3.5 text-gray-400 flex items-center pointer-events-none">
        <Search className="w-4 h-4" />
      </div>

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full pl-3 pr-8 py-2.5 text-sm text-gray-900 bg-transparent placeholder:text-gray-400 focus:outline-none"
      />

      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-3 p-0.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
          aria-label="Effacer la recherche"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
