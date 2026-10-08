import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Compass,
  Heart,
  LayoutDashboard,
  LifeBuoy,
  LucideIcon,
  Megaphone,
  Menu as MenuIcon,
  MessagesSquare,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  ReceiptText,
  ScrollText,
  Settings,
  ShieldCheck,
  ShoppingBag,
  UserCheck,
  Store,
  UserPlus,
  UserRound,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { LaunchBanner, Logo, PageTrailContext, PaneContext, SearchField, ThemeToggle } from '@/shared/ui';
import { useDb } from '@/shared/db';
import { shortcutLabel, useFocusShortcut, useTrackHistory, useVisualViewportHeight } from '@/shared/hooks';
import { ROUTES } from '@/shared/config/routes';
import { useCurrentUser } from '@/features/session';
import { needsAction, useUnreadCount } from '@/features/orders';
import { NotificationBell } from '@/features/notifications';
import { useAnsweredTicketCount } from '@/features/support';
import { useFollowUpdates } from '@/features/library';
import { UserMenu } from './UserMenu';

const PIN_KEY = 'salacope.sidebar.pinned';

const readPinned = () => {
  try {
    return localStorage.getItem(PIN_KEY) !== 'false';
  } catch {
    return true;
  }
};

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
  end?: boolean;
}

const NavEntry: React.FC<NavItem & { collapsed: boolean; onNavigate: () => void; pill?: boolean }> = ({
  to,
  label,
  icon: Icon,
  badge,
  end,
  collapsed,
  onNavigate,
  pill,
}) => (
  <NavLink
    to={to}
    end={end}
    onClick={onNavigate}
    title={collapsed ? label : undefined}
    className={({ isActive }) =>
      clsx(
        'relative flex items-center gap-2.5 h-8 rounded-md text-sm transition-colors',
        collapsed ? 'justify-center w-8 mx-auto' : 'px-2.5',
        // With `pill` the sliding highlight (see SidebarNav) is the background of the current entry.
        isActive ? clsx('text-on-accent font-medium', !pill && 'bg-accent') : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      )
    }
  >
    {({ isActive }) => (
      <>
        <Icon className="w-4 h-4 shrink-0" />
        {!collapsed && <span className="flex-1 truncate">{label}</span>}
        {!!badge &&
          (collapsed ? (
            <span className={clsx('absolute top-1 right-1 w-1.5 h-1.5 rounded-full', isActive ? 'bg-on-accent' : 'bg-accent')} />
          ) : (
            <span
              className={clsx(
                'min-w-5 h-5 px-1.5 rounded-full text-[11px] font-semibold flex items-center justify-center tabular-nums',
                isActive ? 'bg-on-accent/15 text-on-accent' : 'bg-accent text-on-accent'
              )}
            >
              {badge}
            </span>
          ))}
      </>
    )}
  </NavLink>
);

const NavGroup: React.FC<{ title: string; collapsed: boolean; children: React.ReactNode }> = ({ title, collapsed, children }) => (
  <div>
    {collapsed ? (
      <div className="mx-3 mb-2 border-t border-gray-200" />
    ) : (
      <div className="px-2.5 mb-1 text-xs font-medium text-gray-400 truncate">{title}</div>
    )}
    <div className="space-y-0.5">{children}</div>
  </div>
);

/** Left menu content, shared by the pinned column, the icon rail and the mobile drawer. */
const SidebarNav: React.FC<{ collapsed: boolean; onNavigate: () => void }> = ({ collapsed, onNavigate }) => {
  const user = useCurrentUser();
  const counts = useDb(
    (s) => ({
      toValidate: s.orders.filter((o) => o.buyerId === user.id && needsAction(o, 'buyer')).length,
      toProcess: s.orders.filter((o) => o.sellerId === user.id && needsAction(o, 'seller')).length,
    }),
    [user.id]
  );
  const answered = useAnsweredTicketCount(user.id);
  const unread = useUnreadCount(user.id);
  const followUpdates = useFollowUpdates(user.id);
  const item = (props: NavItem, pill = true) => <NavEntry key={props.to} {...props} collapsed={collapsed} onNavigate={onNavigate} pill={pill} />;

  // The highlight of the current entry slides to the next one instead of jumping (not on the first placement).
  const navRef = useRef<HTMLElement>(null);
  const placed = useRef(false);
  const [highlight, setHighlight] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const measure = () => {
    const el = navRef.current?.querySelector<HTMLElement>('a[aria-current="page"]');
    const next = el ? { top: el.offsetTop, left: el.offsetLeft, width: el.offsetWidth, height: el.offsetHeight } : null;
    setHighlight((cur) => (cur && next && cur.top === next.top && cur.left === next.left && cur.width === next.width && cur.height === next.height ? cur : next));
  };
  useLayoutEffect(measure);
  useEffect(() => {
    if (highlight) placed.current = true;
  }, [highlight]);
  useEffect(() => {
    const nav = navRef.current;
    if (!nav || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(nav);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex flex-col h-full">
      <nav ref={navRef} className="relative flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 space-y-5 scrollbar-none">
        {highlight && (
          <span
            aria-hidden
            className={clsx('absolute top-0 left-0 rounded-md bg-accent', placed.current && 'transition-[transform,width,height] duration-300 ease-out motion-reduce:transition-none')}
            style={{ transform: `translate(${highlight.left}px, ${highlight.top}px)`, width: highlight.width, height: highlight.height }}
          />
        )}
        <div className="space-y-0.5">
          {item({ to: ROUTES.account.explorer, label: 'Explorer', icon: Compass })}
          {item({ to: ROUTES.account.messages, label: 'Messages', icon: MessagesSquare, badge: unread })}
        </div>

        <NavGroup title="Achats" collapsed={collapsed}>
          {item({ to: ROUTES.account.orders, label: 'Mes achats', icon: ShoppingBag, badge: counts.toValidate })}
          {item({ to: ROUTES.account.favorites, label: 'Favoris', icon: Heart })}
          {item({ to: ROUTES.account.following, label: 'Abonnements', icon: UserRound, badge: followUpdates.total })}
        </NavGroup>

        {user.merchant ? (
          <NavGroup title={user.merchant.storeName} collapsed={collapsed}>
            {item({ to: ROUTES.seller.root, label: "Vue d'ensemble", icon: LayoutDashboard, end: true })}
            {item({ to: ROUTES.seller.sales, label: 'Ventes', icon: ReceiptText, badge: counts.toProcess })}
            {item({ to: ROUTES.seller.listings, label: 'Offres', icon: Package })}
            {item({ to: ROUTES.seller.customers, label: 'Clients', icon: Users })}
            {item({ to: ROUTES.seller.payouts, label: 'Paiements', icon: Wallet })}
            {user.merchant.kycStatus !== 'approved' &&
              item({ to: ROUTES.seller.verification, label: 'Vérification', icon: UserCheck, badge: user.merchant.kycStatus === 'pending' ? undefined : 1 })}
          </NavGroup>
        ) : user.guest ? null : (
          <NavGroup title="Vendre" collapsed={collapsed}>
            {item({ to: ROUTES.account.openStore, label: 'Ouvrir ma boutique', icon: Store })}
          </NavGroup>
        )}

        {user.admin && (
          <NavGroup title="Administration" collapsed={collapsed}>
            {item({ to: ROUTES.admin.root, label: 'Aperçu', icon: ShieldCheck, end: true })}
            {item({ to: ROUTES.admin.sellers, label: 'Vendeurs', icon: Store })}
            {item({ to: ROUTES.admin.users, label: 'Comptes', icon: Users })}
            {item({ to: ROUTES.admin.banners, label: 'Publicité', icon: Megaphone })}
            {item({ to: ROUTES.admin.audit, label: 'Journal', icon: ScrollText })}
          </NavGroup>
        )}
      </nav>
      <div className="px-2 py-2 border-t border-gray-200 space-y-0.5">
        {item({ to: ROUTES.account.support, label: 'Support', icon: LifeBuoy, badge: answered }, false)}
        {user.guest
          ? item({ to: `${ROUTES.signIn}?creer=1`, label: 'Créer un compte', icon: UserPlus }, false)
          : item({ to: ROUTES.account.settings, label: 'Paramètres', icon: Settings }, false)}
      </div>
    </div>
  );
};

/** Menu section of a path, shown as the first step of the page breadcrumb. */
const trailOf = (pathname: string, storeName?: string): string | null => {
  if (pathname.startsWith(ROUTES.admin.root)) return 'Administration';
  if (pathname.startsWith('/dashboard') || pathname.startsWith(ROUTES.lightpayCallback)) return storeName ?? 'Boutique';
  if (pathname.startsWith(ROUTES.account.explorer) || pathname.startsWith(ROUTES.account.search)) return 'Catalogue';
  if (pathname.startsWith(ROUTES.account.messages)) return 'Messages';
  if ([ROUTES.account.orders, ROUTES.account.favorites, ROUTES.account.following, ROUTES.paymentReturn, '/ac/checkout'].some((p) => pathname.startsWith(p))) {
    return 'Achats';
  }
  if ([ROUTES.account.support, ROUTES.account.settings, ROUTES.account.openStore].some((p) => pathname.startsWith(p))) return 'Compte';
  return null;
};

/** Catalogue search, always reachable: submitting loads the search screen with the query. */
const TopBarSearch: React.FC = () => {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  useFocusShortcut(inputRef);

  const submit = () => {
    const text = q.trim();
    navigate(`${ROUTES.account.search}${text ? `?q=${encodeURIComponent(text)}` : ''}`);
    setQ('');
    inputRef.current?.blur();
  };

  return (
    <SearchField
      ref={inputRef}
      hint={shortcutLabel('k')}
      value={q}
      onChange={setQ}
      onSubmit={submit}
      placeholder="Rechercher dans le catalogue"
      className="w-full max-w-md"
    />
  );
};

/**
 * Back-office shell: fixed top bar and left menu, and a single scrolling pane on the right.
 * The menu can be pinned (labels) or reduced to an icon rail; the choice is remembered.
 */
export const AppLayout: React.FC = () => {
  useTrackHistory();
  useVisualViewportHeight();
  const user = useCurrentUser();
  const [pinned, setPinned] = useState(readPinned);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pane, setPane] = useState<HTMLElement | null>(null);
  const { pathname } = useLocation();

  useEffect(() => {
    try {
      localStorage.setItem(PIN_KEY, String(pinned));
    } catch {
      // preference only
    }
  }, [pinned]);

  useEffect(() => setDrawerOpen(false), [pathname]);

  const PinIcon = pinned ? PanelLeftClose : PanelLeftOpen;
  return (
    <div className="flex flex-col overflow-hidden bg-surface" style={{ height: 'var(--vvh, 100dvh)' }}>
      <LaunchBanner />
      <header className="shrink-0 h-12 border-b border-gray-200 bg-surface flex items-center gap-3 px-3 z-30">
        <button
          type="button"
          onClick={() => setPinned((v) => !v)}
          className="hidden lg:flex w-8 h-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900"
          aria-label={pinned ? 'Réduire le menu' : 'Épingler le menu'}
          title={pinned ? 'Réduire le menu' : 'Épingler le menu'}
        >
          <PinIcon className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="lg:hidden w-8 h-8 flex items-center justify-center rounded-md text-gray-600 hover:bg-gray-100"
          aria-label="Ouvrir le menu"
        >
          <MenuIcon className="w-5 h-5" />
        </button>
        <Logo to={ROUTES.account.explorer} className="shrink-0 hidden sm:flex" />
        <div className="flex-1 flex justify-center min-w-0">
          {/* On the search screen the field lives in the page itself. */}
          {pathname !== ROUTES.account.search && <TopBarSearch />}
        </div>
        <div className="shrink-0 flex items-center gap-1">
          <NotificationBell userId={user.id} />
          <ThemeToggle />
          <UserMenu compact inApp />
        </div>
      </header>

      <div className="flex-1 min-h-0 flex">
        <aside
          className={clsx(
            'hidden lg:block shrink-0 border-r border-gray-200 bg-gray-50 transition-[width] duration-150',
            pinned ? 'w-56' : 'w-14'
          )}
        >
          <SidebarNav collapsed={!pinned} onNavigate={() => {}} />
        </aside>

        {/* Always mounted so it can slide out as well as in; hidden from keyboard and screen readers while closed. */}
        <div
          aria-hidden={!drawerOpen}
          className="lg:hidden fixed inset-0 z-40"
          style={{ visibility: drawerOpen ? 'visible' : 'hidden', transition: drawerOpen ? 'none' : 'visibility 0s linear 300ms' }}
        >
          <div
            className={clsx('absolute inset-0 bg-black/50 transition-opacity duration-300 motion-reduce:transition-none', drawerOpen ? 'opacity-100' : 'opacity-0')}
            onClick={() => setDrawerOpen(false)}
          />
          <aside
            className={clsx(
              'relative w-64 h-full bg-gray-50 shadow-lg flex flex-col transition-transform duration-300 ease-out motion-reduce:transition-none',
              drawerOpen ? 'translate-x-0' : '-translate-x-full'
            )}
          >
            <div className="h-12 shrink-0 px-3 flex items-center justify-between border-b border-gray-200">
              <Logo to={ROUTES.account.explorer} />
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="p-1 rounded-md text-gray-500 hover:bg-gray-100"
                aria-label="Fermer le menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <SidebarNav collapsed={false} onNavigate={() => setDrawerOpen(false)} />
            </div>
          </aside>
        </div>

        <PaneContext.Provider value={pane}>
          <PageTrailContext.Provider value={trailOf(pathname, user.merchant?.storeName)}>
            <section ref={setPane} className="relative flex-1 min-w-0 flex flex-col overflow-hidden bg-canvas">
              <Outlet />
            </section>
          </PageTrailContext.Provider>
        </PaneContext.Provider>
      </div>
    </div>
  );
};
