import React, { createContext, useContext } from 'react';
import clsx from 'clsx';
import { HelpTip } from './HelpTip';

/** Lists and tables inside a panel drop their own frame: the panel is the frame. */
const InPanel = createContext(false);
export const useInPanel = () => useContext(InPanel);

export interface PanelProps {
  title?: React.ReactNode;
  /** Number of items, next to the title. */
  count?: number;
  /** ⓘ explanation next to the title. */
  help?: string;
  description?: React.ReactNode;
  /** Right of the title: filters (Segmented), links, buttons. */
  actions?: React.ReactNode;
  /** Small note under the content, right-aligned (e.g. "Données à jour à 16:51"). */
  footer?: React.ReactNode;
  /** The body touches the edges (lists, tables); otherwise it is padded. */
  flush?: boolean;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}

/**
 * A framed block of the back-office: header (title, count, help, actions), content, optional
 * footer note. Every screen is built from panels, so pages read as one consistent structure.
 */
export const Panel: React.FC<PanelProps> = ({ title, count, help, description, actions, footer, flush, className, bodyClassName, children }) => {
  const hasHeader = Boolean(title || actions);
  return (
    <section className={clsx('rounded-2xl border border-gray-200/70 bg-surface', className)}>
      {hasHeader && (
        <header className={clsx('flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 sm:px-5 pt-4', flush ? 'pb-3' : 'pb-4')}>
          <div className="min-w-0">
            {title && (
              <h2 className="flex items-center gap-1.5 text-[15px] font-semibold text-gray-900">
                <span className="truncate">{title}</span>
                {count !== undefined && <span className="font-normal text-gray-400 tabular-nums">{count}</span>}
                {help && <HelpTip text={help} />}
              </h2>
            )}
            {description && <p className="mt-0.5 text-sm text-gray-500">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <InPanel.Provider value>
        <div className={clsx(flush ? 'border-t border-gray-200/70' : clsx('px-4 sm:px-5', hasHeader ? 'pb-5' : 'py-5'), bodyClassName)}>
          {children}
        </div>
      </InPanel.Provider>
      {footer && (
        <footer
          className={clsx(
            'px-4 sm:px-5 text-right text-xs text-gray-500',
            flush ? 'py-3 border-t border-gray-200/70' : '-mt-1 pb-4'
          )}
        >
          {footer}
        </footer>
      )}
    </section>
  );
};
