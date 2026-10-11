import React, { useState } from 'react';
import { Badge, Button, Dialog } from '@/shared/ui';
import { formatDateTime } from '@/shared/lib';
import { ROUTES } from '@/shared/config/routes';
import { Listing } from '@/shared/db';

/** "Masquée par Salacope": a tap opens what Salacope wrote when it hid the offer, and what to do next. */
export const HiddenBadge: React.FC<{ listing: Pick<Listing, 'title' | 'hiddenReason' | 'hiddenAt'> }> = ({ listing }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          // inside a list row that is itself a link
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        aria-label="Voir pourquoi cette offre est masquée"
      >
        <Badge tone="danger" dot>
          Masquée par Salacope
        </Badge>
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Offre masquée par Salacope"
        description={listing.title}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Fermer
            </Button>
            <Button variant="primary" to={`${ROUTES.account.newTicket}?sujet=other`}>
              Contacter le support
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-sm">
          <div>
            <p className="text-xs text-gray-500">Raison donnée par Salacope</p>
            <p className="mt-1 text-gray-900 whitespace-pre-line break-words">{listing.hiddenReason}</p>
          </div>
          {listing.hiddenAt && (
            <div>
              <p className="text-xs text-gray-500">Masquée le</p>
              <p className="mt-1 text-gray-900">{formatDateTime(listing.hiddenAt)}</p>
            </div>
          )}
          <p className="text-gray-600">
            L’offre n’apparaît plus dans le catalogue et vous ne pouvez pas la publier de nouveau. Corrigez ce qui est signalé, puis demandez son rétablissement au support.
          </p>
        </div>
      </Dialog>
    </>
  );
};
