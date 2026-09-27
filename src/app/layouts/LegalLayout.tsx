import React from 'react';
import clsx from 'clsx';
import { NavLink, Outlet } from 'react-router-dom';
import { Container } from '@/shared/ui';
import { ROUTES } from '@/shared/config/routes';

const LINKS = [
  { to: ROUTES.legal.root, label: 'Mentions légales', end: true },
  { to: ROUTES.legal.terms, label: 'Conditions générales' },
  { to: ROUTES.legal.refund, label: 'Remboursements' },
  { to: ROUTES.legal.privacy, label: 'Confidentialité' },
  { to: ROUTES.legal.cookies, label: 'Cookies' },
];

export const LegalLayout: React.FC = () => (
  <Container className="py-10 grid grid-cols-1 md:grid-cols-[200px_1fr] gap-10">
    <nav className="flex md:flex-col gap-1 overflow-x-auto md:sticky md:top-[calc(var(--sticky-offset,0px)+1.5rem)] self-start">
      {LINKS.map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          end={l.end}
          className={({ isActive }) =>
            clsx(
              'h-8 px-2.5 flex items-center rounded-md text-sm whitespace-nowrap',
              isActive ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-600 hover:text-gray-900'
            )
          }
        >
          {l.label}
        </NavLink>
      ))}
    </nav>
    <article className="max-w-2xl">
      <Outlet />
    </article>
  </Container>
);
