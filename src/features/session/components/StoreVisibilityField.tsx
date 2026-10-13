import React from 'react';
import { Copy } from 'lucide-react';
import { Field, Segmented, useToast } from '@/shared/ui';
import { useServiceAction } from '@/shared/hooks';
import { ROUTES } from '@/shared/config/routes';
import { setStorePrivate } from '../api';
import { useCurrentUser } from '../hooks';

/**
 * Public: the store and its offers are in the catalogue, the Explorer and the search. Private: they are nowhere on Salacope;
 * the seller shares the store's link and buyers see it as a shop of its own, without other sellers around.
 */
export const StoreVisibilityField: React.FC = () => {
  const user = useCurrentUser();
  const toast = useToast();
  const run = useServiceAction();
  const m = user.merchant;
  if (!m) return null;
  const link = `${window.location.origin}${m.verified && m.handle ? ROUTES.storeHandle(m.handle) : ROUTES.store(user.id)}`;

  return (
    <Field
      label="Visibilité"
      hint={
        m.private
          ? 'Votre boutique n’apparaît nulle part sur Salacope. Seules les personnes qui ont votre lien la voient, comme une boutique à part.'
          : 'Votre boutique et vos offres apparaissent dans le catalogue, l’Explorer et la recherche.'
      }
    >
      {() => (
        <div className="space-y-2.5">
          <Segmented
            label="Visibilité de la boutique"
            value={m.private ? 'private' : 'public'}
            onChange={(v) => void run(() => setStorePrivate(v === 'private'), v === 'private' ? 'Boutique privée' : 'Boutique publique')}
            options={[
              { value: 'public', label: 'Publique' },
              { value: 'private', label: 'Privée' },
            ]}
          />
          {m.private && (
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(link);
                  toast.success('Lien copié');
                } catch {
                  toast.error(link);
                }
              }}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 break-all text-left"
            >
              <Copy className="w-3.5 h-3.5 shrink-0" />
              {link.replace(/^https?:\/\//, '')}
            </button>
          )}
        </div>
      )}
    </Field>
  );
};
