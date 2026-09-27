import React, { createContext, useContext } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { ArrowLeft } from 'lucide-react';

/**
 * The scrollable right-hand pane of the back-office shell.
 * Dialogs opened inside it are rendered over the pane only, so the menu stays usable.
 */
export const PaneContext = createContext<HTMLElement | null>(null);

/** DOM node of the current pane, or `null` outside the back-office shell. */
export const usePane = () => useContext(PaneContext);

const WIDTHS = {
  narrow: 'max-w-3xl',
  default: 'max-w-6xl',
  full: 'max-w-none',
};

export interface PageProps {
  title: React.ReactNode;
  /** Parent screen: shown as a back arrow + breadcrumb in the pinned bar. `onClick` replaces the link (history back). */
  back?: { to: string; label: string; onClick?: () => void };
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  /** Pinned second row (tabs, filters). */
  toolbar?: React.ReactNode;
  width?: keyof typeof WIDTHS;
  /** The body takes the pane's height and never scrolls; its children scroll inside. */
  fill?: boolean;
  children: React.ReactNode;
}

/**
 * Back-office page: a pinned bar that never scrolls (back, title, actions, toolbar)
 * above the only scrolling area of the app.
 */
export const Page: React.FC<PageProps> = ({ title, back, meta, actions, toolbar, width = 'default', fill, children }) => (
  <div className="flex-1 min-h-0 flex flex-col">
    <header className="shrink-0 bg-surface/80 backdrop-blur border-b border-gray-200">
      <div className="h-12 px-4 sm:px-6 flex items-center gap-2 min-w-0">
        {back && (
          <>
            <Link
              to={back.to}
              onClick={back.onClick && ((e) => (e.preventDefault(), back.onClick!()))}
              title={back.label}
              aria-label={`Retour : ${back.label}`}
              className="-ml-1.5 w-7 h-7 shrink-0 flex items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <Link to={back.to}
              onClick={back.onClick && ((e) => (e.preventDefault(), back.onClick!()))} className="hidden sm:block shrink-0 text-sm text-gray-500 hover:text-gray-900">
              {back.label}
            </Link>
            <span className="hidden sm:block text-gray-300">/</span>
          </>
        )}
        <h1 className="text-sm font-semibold text-gray-900 truncate">{title}</h1>
        {meta && <div className="shrink-0 flex items-center">{meta}</div>}
        {actions && <div className="ml-auto flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
      {toolbar && <div className="px-4 sm:px-6">{toolbar}</div>}
    </header>
    <div className={clsx('flex-1 min-h-0', fill ? 'overflow-hidden' : 'overflow-y-auto')}>
      <div className={clsx('mx-auto w-full px-4 sm:px-6', fill ? 'h-full py-3 sm:py-4' : 'py-6', WIDTHS[width])}>{children}</div>
    </div>
  </div>
);
