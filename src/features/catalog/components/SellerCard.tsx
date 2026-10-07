import React from 'react';
import { BadgeCheck } from 'lucide-react';
import { User } from '@/shared/db';
import { Link } from 'react-router-dom';
import { Avatar, usePane } from '@/shared/ui';
import { ROUTES } from '@/shared/config/routes';
import { formatMonthYear } from '@/shared/lib';
import { FollowButton } from '@/features/library';
import { RatingSummary, useSellerStat } from '@/features/reviews';
import { displayName } from '@/features/session';
import { storeHref } from '../model';

/** Who sells this: identity, trust signal, follow. */
export const SellerCard: React.FC<{ seller: User | undefined; salesCount?: number }> = ({ seller, salesCount }) => {
  const stats = useSellerStat(seller?.id);
  const inApp = Boolean(usePane());
  if (!seller) return null;
  const m = seller.merchant;
  return (
    <div className="flex items-start gap-3">
      <Avatar name={displayName(seller)} src={m?.logo} size="lg" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <Link
            to={inApp ? ROUTES.account.store(seller.id) : storeHref(seller)}
            className="text-sm font-medium text-gray-900 truncate hover:underline underline-offset-2"
          >
            {displayName(seller)}
          </Link>
          {m?.verified && <BadgeCheck className="w-4 h-4 text-primary-600 shrink-0" aria-label="Identité vérifiée" />}
        </div>
        <p className="text-sm text-gray-500 truncate">{[m?.headline, m?.city].filter(Boolean).join(' · ')}</p>
        {stats && stats.reviews > 0 && <RatingSummary stats={stats} className="mt-1 text-xs" />}
        <p className="text-xs text-gray-400 mt-0.5">
          Vendeur depuis {formatMonthYear(m?.activatedAt ?? seller.createdAt)}
          {salesCount !== undefined && ` · ${salesCount} vente${salesCount > 1 ? 's' : ''}`}
        </p>
      </div>
      <FollowButton sellerId={seller.id} />
    </div>
  );
};
