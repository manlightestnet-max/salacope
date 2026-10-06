import React, { useRef, useState } from 'react';
import { Avatar, Button, useToast } from '@/shared/ui';
import { IMAGE_TYPES, cropImageFile, sniffImageType } from '@/shared/lib';
import { setStoreLogo } from '../api';
import { useCurrentUser } from '../hooks';

/** Largest photo accepted before reduction (the stored version is a small square JPEG). */
const MAX_SOURCE_MB = 8;
const LOGO_SIZE = 320;

/** Store photo: chosen, checked (real type, weight), cropped square and saved at once. */
export const StoreLogoField: React.FC = () => {
  const user = useCurrentUser();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const m = user.merchant;
  if (!m) return null;

  const save = async (logo: string | null) => {
    setBusy(true);
    try {
      await setStoreLogo(logo);
      setError(undefined);
      toast.success(logo ? 'Photo de la boutique enregistrée' : 'Photo retirée');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const choose = async (file: File | undefined) => {
    if (!file) return;
    const type = await sniffImageType(file);
    if (!type) return setError(`Ce fichier n’est pas une image ${Object.values(IMAGE_TYPES).join(', ')}.`);
    if (file.size > MAX_SOURCE_MB * 1024 * 1024) {
      return setError(`Image trop lourde (${(file.size / 1024 / 1024).toFixed(1)} Mo) : ${MAX_SOURCE_MB} Mo au maximum.`);
    }
    try {
      await save(await cropImageFile(file, LOGO_SIZE, LOGO_SIZE, 0.85));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <Avatar name={m.storeName} src={m.logo} className="!w-16 !h-16 !text-lg" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-800">Photo de la boutique</p>
        <p className="mt-0.5 text-xs text-gray-500">
          {Object.values(IMAGE_TYPES).join(', ')} · {MAX_SOURCE_MB} Mo maximum · recadrée en carré
        </p>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        <div className="mt-2 flex flex-wrap gap-2">
          <Button size="sm" disabled={busy} onClick={() => input.current?.click()}>
            {m.logo ? 'Changer' : 'Ajouter une photo'}
          </Button>
          {m.logo && (
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => save(null)}>
              Retirer
            </Button>
          )}
        </div>
        <input
          ref={input}
          type="file"
          accept={Object.keys(IMAGE_TYPES).join(',')}
          className="hidden"
          onChange={(e) => {
            void choose(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>
    </div>
  );
};
