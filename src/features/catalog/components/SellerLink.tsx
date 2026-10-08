import React from 'react';
import clsx from 'clsx';
import { BadgeCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { User } from '@/shared/db';
import { Avatar, usePane } from '@/shared/ui';
import { ROUTES } from '@/shared/config/routes';
import { displayName } from '@/features/session';
import { storeHref } from '../model';

/**
 * The seller's name (and verified check) as a shortcut to their store: underlined on hover, one tap on mobile.
 * A span, not an anchor: it lives inside cards that are already links.
 */
export const SellerLink: React.FC<{ seller: User | undefined; className?: string; badgeClassName?: string }> = ({ seller, className, badgeClassName }) => {
  const navigate = useNavigate();
  const inApp = Boolean(usePane());
  if (!seller) return <span className={className}>{displayName(seller)}</span>;
  const go = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(inApp ? ROUTES.account.store(seller.id) : storeHref(seller));
  };
  return (
    <span
      role="link"
      tabIndex={0}
      onClick={go}
      onKeyDown={(e) => e.key === 'Enter' && go(e)}
      title={`Voir la boutique ${displayName(seller)}`}
      className={clsx('inline-flex items-center gap-1 min-w-0 cursor-pointer hover:text-gray-900 hover:underline underline-offset-2', className)}
    >
      <span className="truncate">{displayName(seller)}</span>
      {seller.merchant?.verified && <BadgeCheck className={clsx('w-3.5 h-3.5 shrink-0 text-primary-600', badgeClassName)} aria-label="Boutique vérifiée" />}
    </span>
  );
};

/** The store's photo as a shortcut to its official page (same rules as `SellerLink`). */
export const SellerAvatar: React.FC<{ seller: User | undefined; size?: 'sm' | 'md' | 'lg' }> = ({ seller, size }) => {
  const navigate = useNavigate();
  const inApp = Boolean(usePane());
  if (!seller) return <Avatar name={displayName(seller)} size={size} />;
  const go = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(inApp ? ROUTES.account.store(seller.id) : storeHref(seller));
  };
  return (
    <span
      role="link"
      tabIndex={0}
      onClick={go}
      onKeyDown={(e) => e.key === 'Enter' && go(e)}
      title={`Voir la boutique ${displayName(seller)}`}
      className="flex shrink-0 cursor-pointer rounded-full transition hover:opacity-90 hover:ring-2 hover:ring-primary-600/40"
    >
      <Avatar name={displayName(seller)} src={seller.merchant?.logo} size={size} />
    </span>
  );
};
