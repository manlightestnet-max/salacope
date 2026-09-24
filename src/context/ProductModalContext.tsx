import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Product } from '../types';
import { PRODUCTS } from '../data/mockData';
import { fetchProductById } from '../lib/api';

interface ProductModalContextType {
  activeProduct: Product | null;
  openProduct: (product: Product) => void;
  closeProduct: () => void;
}

const ProductModalContext = createContext<ProductModalContextType>({
  activeProduct: null,
  openProduct: () => {},
  closeProduct: () => {},
});

export const useProductModal = () => useContext(ProductModalContext);

export const ProductModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const location = useLocation();
  const previousUrlRef = useRef<string | null>(null);

  // Helper to load product by ID
  const loadProductById = (id: string) => {
    const found = PRODUCTS.find((p) => p.id === id);
    if (found) {
      setActiveProduct(found);
    } else {
      fetchProductById(id).then((p) => {
        if (p) {
          setActiveProduct(p);
        } else {
          setActiveProduct(null);
        }
      });
    }
  };

  // 1. Synchronize modal state with URL path & search param changes
  useEffect(() => {
    const pathname = window.location.pathname;
    const urlParams = new URLSearchParams(window.location.search);
    const productParam = urlParams.get('produit');

    if (pathname.startsWith('/produit/')) {
      const id = pathname.replace('/produit/', '').split('/')[0]?.trim();
      if (id && (!activeProduct || activeProduct.id !== id)) {
        loadProductById(id);
      }
    } else if (productParam) {
      if (!activeProduct || activeProduct.id !== productParam) {
        loadProductById(productParam);
      }
    } else if (!pathname.startsWith('/produit/') && !productParam && activeProduct) {
      // If no product is indicated in route/query, close modal
      setActiveProduct(null);
    }
  }, [location.pathname, location.search]);

  // 2. Listen to browser Back / Forward (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const pathname = window.location.pathname;
      const urlParams = new URLSearchParams(window.location.search);
      const productParam = urlParams.get('produit');

      if (pathname.startsWith('/produit/')) {
        const id = pathname.replace('/produit/', '').split('/')[0]?.trim();
        if (id) {
          loadProductById(id);
        }
      } else if (productParam) {
        loadProductById(productParam);
      } else {
        setActiveProduct(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // 3. Open Product modal & update browser URL without page reload
  const openProduct = (product: Product) => {
    const isInsideAccount = window.location.pathname.startsWith('/compte');

    // If opening from a regular page, remember where we came from
    if (!window.location.pathname.startsWith('/produit/')) {
      const originUrl = window.location.pathname + window.location.search;
      previousUrlRef.current = originUrl;
      try {
        sessionStorage.setItem('salacope_origin_url', originUrl);
      } catch (e) {
        // Ignore storage errors
      }
    }

    setActiveProduct(product);

    if (isInsideAccount) {
      const searchParams = new URLSearchParams(window.location.search);
      searchParams.set('produit', product.id);
      const targetUrl = `${window.location.pathname}?${searchParams.toString()}`;
      if (window.location.pathname + window.location.search !== targetUrl) {
        window.history.pushState({ modalProduct: product.id }, '', targetUrl);
      }
    } else {
      const targetUrl = `/produit/${product.id}`;
      if (window.location.pathname !== targetUrl) {
        window.history.pushState({ modalProduct: product.id }, '', targetUrl);
      }
    }
  };

  // 4. Close Product modal & restore URL without page reload
  const closeProduct = () => {
    setActiveProduct(null);
    const isInsideAccount = window.location.pathname.startsWith('/compte');

    if (isInsideAccount) {
      const searchParams = new URLSearchParams(window.location.search);
      searchParams.delete('produit');
      const remaining = searchParams.toString();
      const targetUrl = remaining ? `${window.location.pathname}?${remaining}` : window.location.pathname;
      window.history.pushState(null, '', targetUrl);
      return;
    }

    if (window.location.pathname.startsWith('/produit/')) {
      let targetOrigin = previousUrlRef.current;
      if (!targetOrigin) {
        try {
          targetOrigin = sessionStorage.getItem('salacope_origin_url');
        } catch (e) {
          targetOrigin = null;
        }
      }

      if (targetOrigin && targetOrigin !== window.location.pathname) {
        window.history.pushState(null, '', targetOrigin);
        previousUrlRef.current = null;
        try {
          sessionStorage.removeItem('salacope_origin_url');
        } catch (e) {
          // Ignore
        }
      } else if (window.history.length > 2) {
        window.history.back();
      } else {
        window.history.replaceState(null, '', '/');
      }
    }
  };

  return (
    <ProductModalContext.Provider value={{ activeProduct, openProduct, closeProduct }}>
      {children}
    </ProductModalContext.Provider>
  );
};
