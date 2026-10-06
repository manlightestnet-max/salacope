import React, { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { Link, useSearchParams } from 'react-router-dom';
import { BadgeCheck, ChevronDown, UserRound } from 'lucide-react';
import { EmptyState, Page, Panel, ProtectedImage, SearchField } from '@/shared/ui';
import { Listing, User, useDb } from '@/shared/db';
import { formatRelative, formatXaf, getInitials } from '@/shared/lib';
import { ROUTES } from '@/shared/config/routes';
import { displayName, useCurrentUser } from '@/features/session';
import { FollowButton, markFollowSeen, publishedAt, useFollowUpdates, useFollowedSellers } from '@/features/library';
import { RatingSummary, useSellerStats } from '@/features/reviews';
import { ListingCover, creatorTint } from '@/features/catalog';

/** Offers shown when a row opens: what is new first, then the latest ones. */
const PREVIEW_COUNT = 6;

const GRID = 'md:grid md:grid-cols-[minmax(0,1fr)_72px_72px_120px_110px_auto] md:items-center md:gap-4';

const OfferTile: React.FC<{ listing: Listing; isNew: boolean }> = ({ listing, isNew }) => (
  <Link
    to={ROUTES.account.offer(listing.id)}
    className="group w-32 shrink-0 snap-start"
  >
    <div className="relative">
      <ListingCover bare src={listing.coverImage} category={listing.category} />
      {isNew && (
        <span className="absolute left-1.5 top-1.5 h-5 px-2 rounded-full bg-accent text-on-accent text-[10px] font-semibold flex items-center">Nouveau</span>
      )}
    </div>
    <p className="mt-2 text-xs font-medium text-gray-900 line-clamp-2 group-hover:underline underline-offset-2">{listing.title}</p>
    <p className="mt-0.5 text-xs text-primary-700 font-semibold tabular-nums">{formatXaf(listing.priceXaf)}</p>
    <p className="text-[11px] text-gray-400">{formatRelative(publishedAt(listing))}</p>
  </Link>
);

const FollowRow: React.FC<{
  seller: User;
  offers: Listing[];
  newIds: Set<string>;
  open: boolean;
  onToggle: () => void;
}> = ({ seller, offers, newIds, open, onToggle }) => {
  const stats = useSellerStats().get(seller.id);
  const name = displayName(seller);
  // Captured when the row opens, so "Nouveau" stays visible while the follower looks.
  const [shownNew, setShownNew] = useState<Set<string>>(newIds);
  useEffect(() => {
    if (open) setShownNew(newIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const preview = [...offers].sort((a, b) => Number(shownNew.has(b.id)) - Number(shownNew.has(a.id)) || publishedAt(b).localeCompare(publishedAt(a))).slice(0, PREVIEW_COUNT);

  return (
    <li id={seller.id} className="scroll-mt-4">
      <div className={clsx('flex items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50', GRID)}>
        <Link to={ROUTES.account.store(seller.id)} className="group flex-1 min-w-0 flex items-center gap-3">
          <span className={clsx('w-10 h-10 shrink-0 rounded-full overflow-hidden flex items-center justify-center text-sm font-semibold', creatorTint(seller.id))}>
            {seller.merchant?.logo ? <ProtectedImage src={seller.merchant.logo} /> : getInitials(name)}
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-1.5">
              <span className="text-sm font-medium text-gray-900 truncate group-hover:underline underline-offset-2">{name}</span>
              {seller.merchant?.verified && <BadgeCheck className="w-3.5 h-3.5 shrink-0 text-primary-600" aria-label="Identité vérifiée" />}
              {newIds.size > 0 && (
                <span className="md:hidden min-w-5 h-5 px-1.5 rounded-full bg-accent text-on-accent text-[11px] font-semibold flex items-center justify-center">
                  {newIds.size}
                </span>
              )}
            </span>
            <span className="block text-xs text-gray-500 truncate">{[seller.merchant?.headline, seller.merchant?.city].filter(Boolean).join(' · ')}</span>
          </span>
        </Link>
        <span className="hidden md:block text-sm text-gray-700 tabular-nums">{offers.length}</span>
        <span className="hidden md:block text-sm text-gray-700 tabular-nums">{stats?.completedSales ?? 0}</span>
        <span className="hidden md:block text-xs">{stats && stats.reviews > 0 ? <RatingSummary stats={stats} /> : <span className="text-gray-400">—</span>}</span>
        <span className="hidden md:block">
          {newIds.size > 0 ? (
            <button
              type="button"
              onClick={onToggle}
              className="inline-flex h-6 items-center gap-1.5 rounded-full bg-primary-50 px-2.5 text-xs font-medium text-primary-700 hover:brightness-110"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              {newIds.size} nouveau{newIds.size > 1 ? 'x' : ''}
            </button>
          ) : (
            <span className="text-xs text-gray-400">À jour</span>
          )}
        </span>
        <span className="flex items-center gap-1 shrink-0">
          <FollowButton sellerId={seller.id} />
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            aria-label={open ? 'Replier' : 'Voir les publications'}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <ChevronDown className={clsx('w-4 h-4 transition-transform duration-300', open && 'rotate-180')} />
          </button>
        </span>
      </div>

      <div className={clsx('grid transition-[grid-template-rows] duration-300 ease-out', open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
        <div className="overflow-hidden">
          <div className="px-4 pb-4 pt-1">
            <p className="mb-3 text-xs text-gray-500">{shownNew.size ? `${shownNew.size} nouvelle${shownNew.size > 1 ? 's' : ''} publication${shownNew.size > 1 ? 's' : ''}` : 'Dernières publications'}</p>
            {preview.length ? (
              <div className="flex gap-3 overflow-x-auto scrollbar-none snap-x">
                {preview.map((l) => (
                  <OfferTile key={l.id} listing={l} isNew={shownNew.has(l.id)} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Aucune offre en ligne pour le moment.</p>
            )}
          </div>
        </div>
      </div>
    </li>
  );
};

/**
 * `/compte/abonnements`: followed stores in rows (offers, sales, rating, what's new).
 * A row opens on its new publications and marks them as seen. `?boutique=` opens one
 * directly (link of the "new offer" notification).
 */
export const FollowingPage: React.FC = () => {
  const user = useCurrentUser();
  const followed = useFollowedSellers(user.id);
  const updates = useFollowUpdates(user.id);
  const listings = useDb((s) => s.listings.filter((l) => l.status === 'published'), []);
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<string | null>(params.get('boutique'));

  // Opening a store marks its offers as seen (badges clear once the row is open).
  useEffect(() => {
    if (!openId) return;
    if ((updates.bySeller.get(openId)?.length ?? 0) > 0) void markFollowSeen(openId).catch(() => undefined);
    document.getElementById(openId)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId]);

  useEffect(() => {
    const target = params.get('boutique');
    if (target) {
      setOpenId(target);
      const next = new URLSearchParams(params);
      next.delete('boutique');
      setParams(next, { replace: true });
    }
  }, [params, setParams]);

  const rows = useMemo(() => {
    const q = search.toLowerCase().trim();
    return followed
      .map(({ seller }) => ({
        seller: seller!,
        offers: listings.filter((l) => l.sellerId === seller!.id),
        newIds: new Set((updates.bySeller.get(seller!.id) ?? []).map((l) => l.id)),
      }))
      .filter(({ seller }) => !q || [displayName(seller), seller.merchant?.headline ?? '', seller.merchant?.city ?? ''].some((v) => v.toLowerCase().includes(q)))
      .sort((a, b) => b.newIds.size - a.newIds.size || displayName(a.seller).localeCompare(displayName(b.seller), 'fr'));
  }, [followed, listings, updates, search]);

  return (
    <Page
      title="Abonnements"
      help="Les boutiques que vous suivez. Leurs nouvelles offres sont signalées ici et dans vos notifications."
      actions={followed.length > 0 && <SearchField value={search} onChange={setSearch} placeholder="Rechercher" className="w-36 sm:w-56" />}
    >
      {followed.length === 0 ? (
        <EmptyState
          icon={UserRound}
          title="Aucun abonnement"
          description="Suivez une boutique depuis la fiche d'une de ses offres : vous serez prévenu de ses nouvelles publications."
          className="rounded-2xl border border-gray-200/70 bg-surface"
        />
      ) : rows.length === 0 ? (
        <EmptyState title="Aucune boutique ne correspond" className="rounded-2xl border border-gray-200/70 bg-surface" />
      ) : (
        <Panel title="Boutiques suivies" count={rows.length} flush>
          <div
            className={clsx('hidden px-4 h-9 border-b border-gray-100 text-[11px] font-semibold uppercase tracking-wider text-gray-500', GRID)}
            aria-hidden
          >
            <span>Boutique</span>
            <span>Offres</span>
            <span>Ventes</span>
            <span>Note</span>
            <span>Nouveautés</span>
            <span className="w-[108px]" />
          </div>
          <ul className="divide-y divide-gray-100">
            {rows.map((r) => (
              <FollowRow
                key={r.seller.id}
                {...r}
                open={openId === r.seller.id}
                onToggle={() => setOpenId((id) => (id === r.seller.id ? null : r.seller.id))}
              />
            ))}
          </ul>
        </Panel>
      )}
    </Page>
  );
};
