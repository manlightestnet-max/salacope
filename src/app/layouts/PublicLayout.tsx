import React, { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Compass, LayoutDashboard, LucideIcon, MapPin, Search, ShoppingBag, Store, UserPlus } from 'lucide-react';
import { Button, Container, LaunchBanner, Logo, OperatorLogo, SearchField, ThemeToggle } from '@/shared/ui';
import { FooterVisibilityContext, shortcutLabel, useFocusShortcut } from '@/shared/hooks';
import { ROUTES } from '@/shared/config/routes';
import { PLATFORM } from '@/shared/config/platform';
import { PAYMENT_CHANNEL_LIST } from '@/shared/config/payment';
import { CATEGORIES, ListingQuickView } from '@/features/catalog';
import { useSession } from '@/features/session';
import { NotificationBell } from '@/features/notifications';
import { UserMenu } from './UserMenu';

const HeaderSearch: React.FC<{ className?: string }> = ({ className }) => {
  const [params] = useSearchParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState(params.get('q') ?? '');
  useFocusShortcut(inputRef);

  useEffect(() => {
    if (pathname === ROUTES.search) setQ(params.get('q') ?? '');
  }, [params, pathname]);

  return (
    <SearchField
      ref={inputRef}
      value={q}
      onChange={setQ}
      onSubmit={() => navigate(q.trim() ? `${ROUTES.search}?q=${encodeURIComponent(q.trim())}` : ROUTES.search)}
      placeholder="Rechercher une formation, un e-book, un service…"
      hint={shortcutLabel('k')}
      pill
      className={className}
    />
  );
};

const HeaderLink: React.FC<{ to: string; label: string; icon: LucideIcon; end?: boolean }> = ({ to, label, icon: Icon, end }) => (
  <NavLink
    to={to}
    end={end}
    className={({ isActive }) =>
      clsx(
        'h-9 px-3 flex items-center gap-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
        isActive ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
      )
    }
  >
    <Icon className="w-4 h-4" />
    {label}
  </NavLink>
);

const Header: React.FC = () => {
  const { user, isAuthenticated, isMerchant } = useSession();
  const { pathname, search } = useLocation();
  const next = encodeURIComponent(pathname + search);

  return (
    <header className="sticky top-0 z-30 bg-canvas/75 backdrop-blur-xl border-b border-gray-200/60">
      <Container className="h-16 flex items-center gap-4 lg:gap-7">
        <Logo className="shrink-0" />
        <HeaderSearch className="hidden md:block flex-1 max-w-[460px]" />
        <nav className="hidden lg:flex items-center gap-1" aria-label="Navigation principale">
          <HeaderLink to={ROUTES.home} label="Explorer" icon={Compass} end />
          <HeaderLink to={ROUTES.account.orders} label="Mes achats" icon={ShoppingBag} />
          {isMerchant ? (
            <HeaderLink to={ROUTES.seller.root} label="Ma boutique" icon={LayoutDashboard} />
          ) : (
            <HeaderLink to={ROUTES.sell} label="Vendre" icon={Store} />
          )}
        </nav>
        <div className="ml-auto flex items-center gap-1.5">
          <Link
            to={ROUTES.search}
            aria-label="Rechercher"
            className="md:hidden w-10 h-10 flex items-center justify-center rounded-full text-gray-600 hover:bg-gray-100"
          >
            <Search className="w-[18px] h-[18px]" />
          </Link>
          <ThemeToggle className="w-10 h-10 rounded-full" />
          {isAuthenticated && user ? (
            <>
              <NotificationBell userId={user.id} className="mr-1" />
              <UserMenu compact />
            </>
          ) : (
            <>
              <Button to={`${ROUTES.signIn}?next=${next}`} variant="ghost" size="lg" pill className="hidden sm:inline-flex text-gray-900">
                Se connecter
              </Button>
              <Button to={`${ROUTES.signIn}?creer=1&next=${next}`} variant="primary" size="lg" pill icon={<UserPlus className="w-4 h-4" />}>
                <span className="hidden sm:inline">Créer un compte</span>
                <span className="sm:hidden">S'inscrire</span>
              </Button>
            </>
          )}
        </div>
      </Container>
    </header>
  );
};

const FOOTER_COLUMNS = [
  { title: 'Catalogue', links: CATEGORIES.map((c) => ({ to: `${ROUTES.home}?cat=${c.id}`, label: c.label })) },
  {
    title: 'Vendre',
    links: [
      { to: ROUTES.sell, label: 'Ouvrir une boutique' },
      { to: ROUTES.seller.root, label: 'Tableau de bord' },
      { to: ROUTES.seller.payouts, label: 'Paiements' },
    ],
  },
  {
    title: 'Aide & légal',
    links: [
      { to: ROUTES.legal.terms, label: 'Conditions générales' },
      { to: ROUTES.legal.refund, label: 'Remboursements' },
      { to: ROUTES.legal.privacy, label: 'Confidentialité' },
      { to: ROUTES.legal.aml, label: 'Lutte anti-blanchiment' },
      { to: ROUTES.legal.root, label: 'Mentions légales' },
    ],
  },
];

const Footer: React.FC = () => (
  <footer className="mt-24 border-t border-gray-200/60">
    <Container className="pt-14 pb-7">
      <div className="grid gap-10 grid-cols-2 lg:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))]">
        <div className="col-span-2 lg:col-span-1 space-y-3.5 text-sm">
          <Logo />
          <p className="text-gray-500 max-w-xs">Produits numériques et services · {PLATFORM.country}</p>
          <a href={`mailto:${PLATFORM.supportEmail}`} className="block w-fit text-primary-700 hover:underline underline-offset-2">
            {PLATFORM.supportEmail}
          </a>
          <p className="flex items-center gap-1.5 text-gray-500">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            {PLATFORM.headquarters}
          </p>
        </div>
        {FOOTER_COLUMNS.map((column) => (
          <nav key={column.title} aria-label={column.title} className="flex flex-col gap-2.5 text-sm">
            <span className="text-[13px] font-semibold text-gray-900 mb-1">{column.title}</span>
            {column.links.map((l) => (
              <Link key={l.label} to={l.to} className="w-fit text-gray-500 hover:text-gray-900 transition-colors">
                {l.label}
              </Link>
            ))}
          </nav>
        ))}
      </div>
      <div className="mt-12 pt-6 border-t border-gray-200/60 flex flex-wrap items-center justify-between gap-4 text-[12.5px] text-gray-500">
        <span>© {new Date().getFullYear()} Salacope</span>
        <div className="flex items-center gap-2">
          <span className="mr-1">Paiement</span>
          {PAYMENT_CHANNEL_LIST.map((c) => (
            <OperatorLogo key={c.id} channel={c.id} className="w-6 h-6" />
          ))}
        </div>
      </div>
    </Container>
  </footer>
);

/** Height of the sticky header (h-16 + border); sticky content sits below it. */
const HEADER_OFFSET = { '--sticky-offset': 'calc(4rem + 1px)' } as React.CSSProperties;

export const PublicLayout: React.FC = () => {
  const [footerHidden, setFooterHidden] = useState(false);

  return (
    <FooterVisibilityContext.Provider value={setFooterHidden}>
      <div className="flex-1 flex flex-col bg-canvas" style={HEADER_OFFSET}>
        <LaunchBanner />
        <Header />
        <main className="flex-1">
          <Outlet />
        </main>
        {!footerHidden && <Footer />}
        <ListingQuickView />
      </div>
    </FooterVisibilityContext.Provider>
  );
};
