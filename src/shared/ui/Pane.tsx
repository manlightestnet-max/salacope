import React, { createContext, useContext } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { HelpTip } from './HelpTip';
import { RouteTransition } from './RouteTransition';

/**
 * The scrollable right-hand pane of the back-office shell.
 * Dialogs opened inside it are rendered over the pane only, so the menu stays usable.
 */
export const PaneContext = createContext<HTMLElement | null>(null);

/** DOM node of the current pane, or `null` outside the back-office shell. */
export const usePane = () => useContext(PaneContext);

/** Section of the menu the current page belongs to ("Achats", the store's name…), set by the shell. */
export const PageTrailContext = createContext<string | null>(null);

const WIDTHS = {
  narrow: 'max-w-3xl',
  default: 'max-w-6xl',
  full: 'max-w-none',
};

export interface PageProps {
  title: React.ReactNode;
  /** ⓘ explanation next to the title. */
  help?: string;
  /** Parent screen: shown as a back arrow + breadcrumb in the pinned bar. `onClick` replaces the link (history back). */
  back?: { to: string; label: string; onClick?: () => void };
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  /** Pinned second row (tabs, filters). */
  toolbar?: React.ReactNode;
  width?: keyof typeof WIDTHS;
  /** The body takes the pane's height and never scrolls; its children scroll inside (compact bar). */
  fill?: boolean;
  children: React.ReactNode;
}

/**
 * Back-office page: a pinned header that never scrolls (breadcrumb, title, actions, toolbar),
 * aligned on the content column, above the only scrolling area of the app.
 */
export const Page: React.FC<PageProps> = ({ title, help, back, meta, actions, toolbar, width = 'default', fill, children }) => {
  const trail = useContext(PageTrailContext);
  const column = clsx('mx-auto w-full px-4 sm:px-6', WIDTHS[width]);
  const backClick = back?.onClick && ((e: React.MouseEvent) => (e.preventDefault(), back.onClick!()));

  const crumb = back ? (
    <Link to={back.to} onClick={backClick} className="inline-flex items-center gap-1 min-w-0 hover:text-gray-900" aria-label={`Retour : ${back.label}`}>
      <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
      <span className="truncate">{back.label}</span>
    </Link>
  ) : trail ? (
    <span className="truncate">{trail}</span>
  ) : null;

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <header className={"relative z-10 shrink-0 bg-canvas/85 backdrop-blur border-b border-gray-200/70"}>
        {fill ? (
          <div className={clsx(column, 'h-12 flex items-center gap-2 min-w-0')}>
            {crumb && (
              <>
                <span className="shrink-0 max-w-[40%] flex text-sm text-gray-500">{crumb}</span>
                <ChevronRight className="w-3.5 h-3.5 shrink-0 text-gray-300" />
              </>
            )}
            <h1 className="text-sm font-semibold text-gray-900 truncate">{title}</h1>
            {meta && <div className="shrink-0 flex items-center">{meta}</div>}
            {actions && <div className="ml-auto flex items-center gap-2 shrink-0">{actions}</div>}
          </div>
        ) : (
          <div className={clsx(column, 'pt-4', toolbar ? 'pb-0' : 'pb-4')}>
            {crumb && (
              <nav aria-label="Fil d’Ariane" className="flex items-center gap-1.5 h-5 text-xs text-gray-500 min-w-0">
                {crumb}
                <ChevronRight className="w-3 h-3 shrink-0 text-gray-300" />
                <span className="truncate text-gray-700">{title}</span>
              </nav>
            )}
            <div className={clsx('flex items-center gap-2 min-w-0 min-h-9', crumb && 'mt-1')}>
              <h1 className="text-xl font-semibold tracking-tight text-gray-900 truncate">{title}</h1>
              {help && <HelpTip text={help} />}
              {meta && <div className="shrink-0 flex items-center">{meta}</div>}
              {actions && <div className="ml-auto flex items-center gap-2 shrink-0">{actions}</div>}
            </div>
            {toolbar && <div className="mt-2">{toolbar}</div>}
          </div>
        )}
      </header>
      <div className={clsx('flex-1 min-h-0', fill ? 'overflow-hidden' : 'overflow-y-auto')}>
        <RouteTransition className={clsx(column, fill ? 'h-full py-3 sm:py-4' : 'py-6')}>{children}</RouteTransition>
      </div>
    </div>
  );
};
