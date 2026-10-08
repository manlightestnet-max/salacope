import React, { useRef, useState } from 'react';
import { ImagePlus } from 'lucide-react';
import { AdminBanner, adminApi, useAdminResource } from '@/features/admin';
import { Button, EmptyState, Field, Input, Page, Panel, SkeletonRows, useToast } from '@/shared/ui';
import { IMAGE_TYPES, cropImageFile, sniffImageType } from '@/shared/lib';

const SLOTS = [1, 2, 3];
const WIDTH = 1200;
const HEIGHT = 450;
const MAX_SOURCE_MB = 8;

/** One slot: its image (cropped to the banner's shape), a short caption and the link opened on click. */
const Slot: React.FC<{ position: number; banner?: AdminBanner; onChange: (all: AdminBanner[]) => void }> = ({ position, banner, onChange }) => {
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<string>();
  const [title, setTitle] = useState(banner?.title ?? '');
  const [link, setLink] = useState(banner?.link ?? '');
  const [active, setActive] = useState(banner?.active ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const shown = image ?? banner?.image;

  const choose = async (file: File | undefined) => {
    if (!file) return;
    const type = await sniffImageType(file);
    if (!type) return setError(`Ce fichier n’est pas une image ${Object.values(IMAGE_TYPES).join(', ')}.`);
    if (file.size > MAX_SOURCE_MB * 1024 * 1024) return setError(`Image trop lourde : ${MAX_SOURCE_MB} Mo au maximum.`);
    try {
      setImage(await cropImageFile(file, WIDTH, HEIGHT, 0.8));
      setError(undefined);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const run = async (work: () => Promise<AdminBanner[]>, done: string) => {
    setBusy(true);
    try {
      onChange(await work());
      setImage(undefined);
      setError(undefined);
      toast.success(done);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel title={`Emplacement ${position}`} description={banner ? (banner.active ? 'Affiché sur l’accueil' : 'Masqué') : 'Vide : rien n’est affiché'}>
      <div className="grid gap-4 md:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="relative aspect-[16/6] overflow-hidden rounded-xl border border-dashed border-gray-300 bg-gray-50 text-gray-500 hover:border-gray-400"
          aria-label="Choisir l’image"
        >
          {shown ? (
            <img src={shown} alt="" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-xs">
              <ImagePlus className="w-5 h-5" />
              Ajouter l’image
            </span>
          )}
        </button>
        <div className="space-y-3 min-w-0">
          <Field label="Légende" optional hint="Courte, affichée sur l’image.">
            {(id) => <Input id={id} value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} placeholder="Ex. Les formations de la semaine" />}
          </Field>
          <Field label="Lien au clic" hint="Une page du site (/p/…, /s/…, /recherche) ou une adresse https://…" error={error}>
            {(id) => <Input id={id} value={link} onChange={(e) => setLink(e.target.value)} placeholder="/recherche ou https://…" />}
          </Field>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Afficher cet emplacement
          </label>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              disabled={busy || !shown || !link.trim()}
              onClick={() => run(() => adminApi.saveBanner(position, { image, title, link: link.trim(), active }), 'Emplacement enregistré')}
            >
              Enregistrer
            </Button>
            {banner && (
              <Button variant="ghost" disabled={busy} onClick={() => run(() => adminApi.removeBanner(position), 'Emplacement vidé')}>
                Vider
              </Button>
            )}
          </div>
        </div>
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
    </Panel>
  );
};

/** The three advertising slots of the storefront banner: the administrator picks the image and the link of each. */
export const AdminBannersPage: React.FC = () => {
  const { data, error, loading, set } = useAdminResource(() => adminApi.banners(), []);

  return (
    <Page title="Publicité" help="Les trois emplacements de la bannière en haut de l’accueil. Chacun a une image (recadrée automatiquement), une légende et un lien ouvert au clic.">
      {error ? (
        <EmptyState title="Publicité indisponible" description={error} />
      ) : !data || loading ? (
        <SkeletonRows rows={3} />
      ) : (
        <div className="space-y-4">
          {SLOTS.map((n) => {
            const banner = data.find((b) => b.position === n);
            return <Slot key={`${n}:${banner?.updated_at ?? ''}`} position={n} banner={banner} onChange={set} />;
          })}
        </div>
      )}
    </Page>
  );
};
