import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react';
import { adminApi, useAdminResource } from '@/features/admin';
import { ListingThumb, queryListings, usePublishedListings } from '@/features/catalog';
import { Button, EmptyState, Field, Input, List, ListRow, Page, Panel, SearchField, SkeletonRows, Tabs, useToast } from '@/shared/ui';
import { useRememberedParam } from '@/shared/hooks';
import { formatXaf } from '@/shared/lib';
import { EXPLORE_WEIGHTS, ExploreSettings, applyExplore } from '@/shared/config/explore';
import { ROUTES } from '@/shared/config/routes';

type View = 'algorithme' | 'une';

const useSaveExplore = () => {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const save = async (next: ExploreSettings, onSaved: (s: ExploreSettings) => void) => {
    setBusy(true);
    setError(undefined);
    try {
      const saved = await adminApi.saveExplore(next);
      applyExplore(saved);
      onSaved(saved);
      toast.success('Explorer enregistré');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, save };
};

const SaveBar: React.FC<{ error?: string; busy: boolean; dirty: boolean }> = ({ error, busy, dirty }) => (
  <div className="flex flex-wrap items-center justify-end gap-3 w-full">
    {error && (
      <p className="mr-auto text-sm text-red-600" role="alert">
        {error}
      </p>
    )}
    <Button type="submit" variant="primary" loading={busy} disabled={!dirty}>
      Enregistrer
    </Button>
  </div>
);

/** How much each signal counts, from 0 (not used) to 10. */
const AlgorithmForm: React.FC<{ s: ExploreSettings; onSaved: (s: ExploreSettings) => void }> = ({ s, onSaved }) => {
  const { busy, error, save } = useSaveExplore();
  const [form, setForm] = useState(s);
  useEffect(() => setForm(s), [s]);
  const dirty = JSON.stringify(form) !== JSON.stringify(s);
  const total = Object.values(form.weights).reduce((a, b) => a + b, 0) || 1;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void save(form, onSaved);
      }}
    >
      <Panel
        title="Algorithme de classement"
        help="Le score d’une offre est la somme de ses signaux, chacun ramené entre 0 et 1 puis multiplié par son poids. Aucun chiffre n’est inventé : tout vient de la base ou de ce que le visiteur a fait sur son appareil."
        bar={<SaveBar error={error} busy={busy} dirty={dirty} />}
      >
        <div className="divide-y divide-gray-100">
          {EXPLORE_WEIGHTS.map(({ key, label, help }) => (
            <div key={key} className="py-3.5 first:pt-0 grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-2 items-center">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">{label}</p>
                <p className="text-xs text-gray-500">{help}</p>
              </div>
              <span className="text-sm tabular-nums text-gray-500 w-20 text-right">
                <span className="font-semibold text-gray-900">{form.weights[key]}</span> · {Math.round((form.weights[key] / total) * 100)} %
              </span>
              <input
                type="range"
                min={0}
                max={10}
                step={1}
                aria-label={label}
                value={form.weights[key]}
                onChange={(e) => setForm((f) => ({ ...f, weights: { ...f.weights, [key]: Number(e.target.value) } }))}
                className="col-span-2 w-full accent-accent"
              />
            </div>
          ))}
        </div>
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Durée de la nouveauté (jours)" hint="Une offre est « nouvelle » pendant ce temps, de moins en moins chaque jour.">
            {(id) => <Input id={id} inputMode="numeric" value={String(form.freshDays)} onChange={(e) => setForm((f) => ({ ...f, freshDays: Number(e.target.value) || 0 }))} />}
          </Field>
          <Field label="Offres d’une même boutique à la suite" hint="Au-delà, l’offre suivante d’une autre boutique passe devant.">
            {(id) => <Input id={id} inputMode="numeric" value={String(form.sellerRun)} onChange={(e) => setForm((f) => ({ ...f, sellerRun: Number(e.target.value) || 0 }))} />}
          </Field>
        </div>
      </Panel>
    </form>
  );
};

/** "À la une": offers chosen here, shown first in the Explorer and on the home page, in this order. */
const FeaturedForm: React.FC<{ s: ExploreSettings; onSaved: (s: ExploreSettings) => void }> = ({ s, onSaved }) => {
  const { busy, error, save } = useSaveExplore();
  const views = usePublishedListings();
  const [ids, setIds] = useState(s.featured);
  const [q, setQ] = useState('');
  useEffect(() => setIds(s.featured), [s]);
  const dirty = JSON.stringify(ids) !== JSON.stringify(s.featured);
  const byId = useMemo(() => new Map(views.map((v) => [v.listing.id, v])), [views]);
  const found = useMemo(() => (q.trim() ? queryListings(views, { text: q.trim(), sort: 'popular' }).filter((v) => !ids.includes(v.listing.id)).slice(0, 8) : []), [views, q, ids]);
  const move = (i: number, by: number) =>
    setIds((list) => {
      const next = [...list];
      const [item] = next.splice(i, 1);
      next.splice(Math.max(0, Math.min(next.length, i + by)), 0, item);
      return next;
    });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void save({ ...s, featured: ids }, onSaved);
      }}
      className="space-y-4"
    >
      <Panel title="À la une" count={ids.length} help="Montrées en premier dans l’Explorer et sur l’accueil, dans cet ordre (12 au plus). Une offre retirée du catalogue disparaît d’ici." flush bar={<SaveBar error={error} busy={busy} dirty={dirty} />}>
        {ids.length ? (
          <List>
            {ids.map((id, i) => {
              const v = byId.get(id);
              return (
                <ListRow
                  key={id}
                  leading={v ? <ListingThumb src={v.listing.coverImage} category={v.listing.category} size="md" /> : undefined}
                  title={v?.listing.title ?? 'Offre hors ligne'}
                  subtitle={v ? `${v.seller?.merchant?.storeName ?? ''} · ${formatXaf(v.listing.priceXaf)}` : id}
                  trailing={
                    <span className="flex items-center gap-1">
                      <button type="button" aria-label="Monter" disabled={i === 0} onClick={() => move(i, -1)} className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-30">
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button type="button" aria-label="Descendre" disabled={i === ids.length - 1} onClick={() => move(i, 1)} className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-30">
                        <ArrowDown className="w-4 h-4" />
                      </button>
                      <button type="button" aria-label="Retirer" onClick={() => setIds((list) => list.filter((x) => x !== id))} className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100">
                        <X className="w-4 h-4" />
                      </button>
                    </span>
                  }
                />
              );
            })}
          </List>
        ) : (
          <EmptyState title="Aucune offre à la une" description="L’Explorer commence alors directement par le classement." />
        )}
      </Panel>

      <Panel title="Ajouter une offre">
        <SearchField value={q} onChange={setQ} placeholder="Titre, boutique ou identifiant de l’offre" />
        {found.length > 0 && (
          <div className="mt-3 -mx-4 sm:-mx-5">
            <List>
              {found.map((v) => (
                <ListRow
                  key={v.listing.id}
                  leading={<ListingThumb src={v.listing.coverImage} category={v.listing.category} size="md" />}
                  title={v.listing.title}
                  subtitle={`${v.seller?.merchant?.storeName ?? ''} · ${formatXaf(v.listing.priceXaf)}`}
                  trailing={
                    <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} disabled={ids.length >= 12} onClick={() => setIds((list) => [...list, v.listing.id])}>
                      Ajouter
                    </Button>
                  }
                />
              ))}
            </List>
          </div>
        )}
      </Panel>
    </form>
  );
};

/** `/admin/parametres/explorer`: how the Explorer ranks offers, and what it shows first. */
export const AdminExplorePage: React.FC = () => {
  const { data, error, set } = useAdminResource(() => adminApi.explore(), []);
  const [view, setView] = useRememberedParam<View>('admin.explore', 'vue', ['algorithme', 'une'], 'algorithme');
  return (
    <Page
      title="Explorer"
      width="narrow"
      back={{ to: ROUTES.admin.settings, label: 'Paramètres' }}
      help="L’ordre des offres dans l’Explorer et sur l’accueil. Les services ne sont jamais mis à part : le visiteur filtre s’il le veut."
      toolbar={
        <Tabs
          bare
          value={view}
          onChange={setView}
          items={[
            { value: 'algorithme', label: 'Algorithme' },
            { value: 'une', label: 'À la une', count: data?.featured.length || undefined },
          ]}
        />
      }
    >
      {error && !data ? (
        <EmptyState title="Réglages indisponibles" description={error} />
      ) : !data ? (
        <SkeletonRows rows={4} />
      ) : view === 'algorithme' ? (
        <AlgorithmForm s={data} onSaved={set} />
      ) : (
        <FeaturedForm s={data} onSaved={set} />
      )}
    </Page>
  );
};
