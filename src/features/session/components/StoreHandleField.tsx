import React, { useState } from 'react';
import { BadgeCheck, Copy } from 'lucide-react';
import { Button, Field, Input, useToast } from '@/shared/ui';
import { useServiceAction } from '@/shared/hooks';
import { HANDLE_PATTERN } from '@/shared/domain';
import { setStoreHandle } from '../api';
import { useCurrentUser } from '../hooks';

const HOST = 'salacope.online';

/** Verified stores choose their own address: salacope.online/@name, to share anywhere. */
export const StoreHandleField: React.FC = () => {
  const user = useCurrentUser();
  const toast = useToast();
  const run = useServiceAction();
  const m = user.merchant;
  const [value, setValue] = useState(m?.handle ?? '');
  if (!m) return null;

  const clean = value.trim().replace(/^@/, '').toLowerCase();
  const valid = !clean || HANDLE_PATTERN.test(clean);
  const changed = clean !== (m.handle ?? '');
  const link = m.handle ? `https://${HOST}/@${m.handle}` : '';

  return (
    <Field
      label="Adresse de la boutique"
      optional
      action={m.verified ? <BadgeCheck className="ml-auto w-4 h-4 text-primary-600" aria-label="Boutique vérifiée" /> : undefined}
      hint={
        m.verified
          ? '3 à 30 caractères : lettres, chiffres, point, tiret ou tiret bas.'
          : 'Disponible une fois votre identité vérifiée.'
      }
      error={valid ? undefined : 'Lettres, chiffres, point, tiret ou tiret bas, de 3 à 30 caractères.'}
    >
      {(id) => (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              id={id}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              disabled={!m.verified}
              maxLength={31}
              autoCapitalize="none"
              spellCheck={false}
              leading={<span className="whitespace-nowrap">@</span>}
              placeholder="maboutique"
              className="flex-1 min-w-0"
            />
            <Button disabled={!m.verified || !changed || !valid} onClick={() => run(() => setStoreHandle(clean || null), clean ? 'Adresse enregistrée' : 'Adresse retirée')}>
              Enregistrer
            </Button>
          </div>
          {link && (
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
              className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900"
            >
              <Copy className="w-3.5 h-3.5" />
              {HOST}/@{m.handle}
            </button>
          )}
        </div>
      )}
    </Field>
  );
};
