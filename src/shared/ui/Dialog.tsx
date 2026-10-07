import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { X } from 'lucide-react';
import { useBodyScrollLock, useKeyPress } from '../hooks';
import { Button, buttonClass } from './Button';
import { usePane } from './Pane';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Cover the whole window even inside the back-office pane. */
  global?: boolean;
  /** `false`: no close button, backdrop or Escape (an operation is running). */
  dismissible?: boolean;
  children?: React.ReactNode;
}

const SIZES = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl', xl: 'max-w-5xl' };

/**
 * Modal dialog: overlay, Escape to close, focus moved inside.
 * Inside the back-office it covers the content pane only; elsewhere the whole window.
 */
export const Dialog: React.FC<DialogProps> = ({ open, onClose, title, description, footer, size = 'md', global, dismissible = true, children }) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const pane = usePane();
  const scoped = Boolean(pane) && !global;
  useBodyScrollLock(open && !scoped);
  useKeyPress('Escape', onClose, open && dismissible);

  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className={clsx(
        scoped ? 'absolute z-40 p-3 sm:p-4' : 'fixed z-50 sm:p-4',
        'inset-0 flex items-end sm:items-center justify-center'
      )}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px]" onClick={dismissible ? onClose : undefined} />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        className={clsx(
          'relative w-full bg-surface shadow-lg flex flex-col outline-none',
          scoped ? 'rounded-2xl max-h-full' : 'rounded-t-2xl sm:rounded-2xl max-h-[92dvh]',
          SIZES[size]
        )}
      >
        <div className={clsx('flex items-start justify-between gap-4 px-5 pt-4', title || description ? 'pb-3' : 'pb-1')}>
          <div className="min-w-0">
            {title && <h2 className="text-base font-semibold text-gray-900">{title}</h2>}
            {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
          </div>
          {dismissible && (
            <button
              type="button"
              onClick={onClose}
              className="-mr-1 p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 shrink-0"
              aria-label="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {children && <div className="px-5 pb-5 overflow-y-auto">{children}</div>}
        {footer && <div className="px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-3 border-t border-gray-100 flex items-center justify-end gap-2">{footer}</div>}
      </div>
    </div>,
    scoped ? pane! : document.body
  );
};

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  danger?: boolean;
  /** Return (or resolve to) `false` to keep the dialog open (e.g. the action failed). */
  onConfirm: () => boolean | void | Promise<boolean | void>;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ open, onClose, title, description, confirmLabel, danger, onConfirm }) => (
  <Dialog
    open={open}
    onClose={onClose}
    title={title}
    description={description}
    size="sm"
    footer={
      <>
        <button type="button" onClick={onClose} className={buttonClass('secondary')}>
          Retour
        </button>
        <Button
          variant={danger ? 'danger' : 'primary'}
          onClick={async () => {
            if ((await onConfirm()) !== false) onClose();
          }}
        >
          {confirmLabel}
        </Button>
      </>
    }
  />
);
