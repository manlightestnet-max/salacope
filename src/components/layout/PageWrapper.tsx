import React from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { ProductModalProvider, useProductModal } from '../../context/ProductModalContext';
import { ProductDialog } from '../modals/ProductDialog';

export interface PageWrapperProps {
  children: React.ReactNode;
}

const PageWrapperInner: React.FC<PageWrapperProps> = ({ children }) => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { activeProduct, closeProduct, openProduct } = useProductModal();

  // Footer is always displayed for comprehensive site navigation
  const showFooter = true;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900 selection:bg-primary-600 selection:text-white">
      <Header />
      <main className="flex-1">
        {children}
      </main>
      {showFooter && <Footer />}

      {/* Global Product Dialog - Instant overlay without page reload */}
      {activeProduct && (
        <ProductDialog
          product={activeProduct}
          onClose={closeProduct}
          onSelectProduct={openProduct}
        />
      )}
    </div>
  );
};

export const PageWrapper: React.FC<PageWrapperProps> = ({ children }) => {
  return (
    <ProductModalProvider>
      <PageWrapperInner>{children}</PageWrapperInner>
    </ProductModalProvider>
  );
};
