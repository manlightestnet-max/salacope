import React from 'react';
import { Home } from './Home';

/**
 * Direct route fallback for /produit/:id (e.g. shared links or bookmarks).
 * Renders the Home catalog in the background while ProductModalContext
 * automatically detects the product ID from the URL and opens the ProductDialog overlay.
 */
export const ProductDetail: React.FC = () => {
  return <Home />;
};

