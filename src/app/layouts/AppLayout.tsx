import React, { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Compass,
  Heart,
  LayoutDashboard,
  LifeBuoy,
  LucideIcon,
  Menu as MenuIcon,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  ReceiptText,
  Settings,
  ShoppingBag,
  Store,
  UserRound,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { Logo, PaneContext, SearchField, ThemeToggle } from '@/shared/ui';
import { useDb } from '@/shared/db';
import { shortcutLabel, useFocusShortcut, useTrackHistory } from '@/shared/hooks';
import { ROUTES } from '@/shared/config/routes';
import { useCurrentUser } from '@/features/session';
import { needsAction } from '@/features/orders';
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

const NavEntry: React.FC<NavItem & { collapsed: boolean; onNavigate: () => void }> = ({
  to,
  label,
  icon: Icon,
  badge,
  end,
  collapsed,
  onNavigate,
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
        isActive ? 'bg-gray-200/70 text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      )
    }
  >
    <Icon className="w-4 h-4 shrink-0" />
    {!collapsed && <span className="flex-1 truncate">{label}</span>}
    {!!badge &&
      (collapsed ? (
        <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-primary-600" />
      ) : (
        <span className="min-w-5 h-5 px-1.5 rounded-full bg-primary-600 text-white text-[11px] font-medium flex items-center justify-center tabular-nums">
          {badge}
        </span>
      ))}
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
  const followUpdates = useFollowUpdates(user.id);
  const item = (props: NavItem) => <NavEntry key={props.to} {...props} collapsed={collapsed} onNavigate={onNavigate} />;

  return (
    <div className="flex flex-col h-full">
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 space-y-5 scrollbar-none">
        <div className="space-y-0.5">{item({ to: ROUTES.account.explorer, label: 'Explorer', icon: Compass })}</div>

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
          </NavGroup>
        ) : (
          <NavGroup title="Vendre" collapsed={collapsed}>
            {item({ to: ROUTES.account.openStore, label: 'Ouvrir ma boutique', icon: Store })}
          </NavGroup>
        )}
      </nav>
      <div className="px-2 py-2 border-t border-gray-200 space-y-0.5">
        {item({ to: ROUTES.account.support, label: 'Support', icon: LifeBuoy, badge: answered })}
        {item({ to: ROUTES.account.settings, label: 'Paramètres', icon: Settings })}
      </div>
    </div>
  );
};

/** Catalogue search, always reachable: results open in Explorer inside the shell. */
const TopBarSearch: React.FC = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const onExplorer = pathname === ROUTES.account.explorer;
  const [q, setQ] = useState(onExplorer ? params.get('q') ?? '' : '');
  const inputRef = useRef<HTMLInputElement>(null);
  useFocusShortcut(inputRef);

  useEffect(() => {
    setQ(onExplorer ? params.get('q') ?? '' : '');
  }, [onExplorer, params]);

  const submit = () => {
    const next = new URLSearchParams(onExplorer ? params : undefined);
    next.delete('produit');
    if (q.trim()) next.set('q', q.trim());
    else next.delete('q');
    const qs = next.toString();
    navigate(`${ROUTES.account.explorer}${qs ? `?${qs}` : ''}`);
  };

  return (
    <SearchField
      ref={inputRef}
      hint={shortcutLabel('k')}
      value={q}
      onChange={(v) => {
        setQ(v);
        if (!v && onExplorer && params.get('q')) {
          const next = new URLSearchParams(params);
          next.delete('q');
          navigate(`${ROUTES.account.explorer}?${next}`, { replace: true });
        }
      }}
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
    <div className="h-dvh flex flex-col overflow-hidden bg-surface">
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
          <TopBarSearch />
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

        {drawerOpen && (
          <div className="lg:hidden fixed inset-0 z-40">
            <div className="absolute inset-0 bg-black/50" onClick={() => setDrawerOpen(false)} />
            <aside className="relative w-64 h-full bg-gray-50 shadow-lg flex flex-col">
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
        )}

        <PaneContext.Provider value={pane}>
          <section ref={setPane} className="relative flex-1 min-w-0 flex flex-col overflow-hidden bg-canvas">
            <Outlet />
          </section>
        </PaneContext.Provider>
      </div>
    </div>
  );
};
