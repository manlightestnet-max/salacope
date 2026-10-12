import React, { useEffect, useState } from 'react';
import { EmptyState, Button, Field, Input, Page, Panel, Segmented, SkeletonRows, Tabs, useToast } from '@/shared/ui';
import { useRememberedParam } from '@/shared/hooks';
import { LaunchBannerView } from '@/shared/ui/LaunchBanner';
import { LaunchBannerSettings, applyLaunchBanner } from '@/shared/config/launchBanner';
import { adminApi, useAdminResource } from '@/features/admin';

type View = 'contenu' | 'apercu';

/** The notice above the site's header: off, a line of text, or a line of text with a button. */
export const AdminLaunchBannerPage: React.FC = () => {
  const toast = useToast();
  const [view, setView] = useRememberedParam<View>('admin.launch', 'vue', ['contenu', 'apercu'], 'contenu');
  const { data, error } = useAdminResource(() => adminApi.launchBanner(), []);
  const [form, setForm] = useState<LaunchBannerSettings>();
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string>();
  useEffect(() => data && setForm(data), [data]);

  const save = async () => {
    if (!form) return;
    setBusy(true);
    setFailure(undefined);
    try {
      const saved = await adminApi.saveLaunchBanner(form);
      applyLaunchBanner(saved);
      setForm(saved);
      toast.success('Bannière enregistrée');
    } catch (e) {
      setFailure((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const set = <K extends keyof LaunchBannerSettings>(key: K, value: LaunchBannerSettings[K]) => setForm((f) => f && { ...f, [key]: value });

  return (
    <Page
      title="Bannière"
      width="narrow"
      help="Le message tout en haut du site, au-dessus du menu. Un simple texte, ou un texte avec un bouton. Il s’affiche pour tout le monde ; le choix des comptes qui le voient viendra plus tard."
      toolbar={
        <Tabs
          bare
          segmented
          value={view}
          onChange={setView}
          items={[
            { value: 'contenu', label: 'Contenu' },
            { value: 'apercu', label: 'Aperçu' },
          ]}
        />
      }
    >
      {error ? (
        <EmptyState title="Bannière indisponible" description={error} />
      ) : !form ? (
        <SkeletonRows rows={4} />
      ) : view === 'apercu' ? (
        <Panel title="Aperçu" description={form.enabled ? 'Tel que les visiteurs le voient, avant enregistrement.' : 'La bannière est masquée : rien ne s’affiche.'} flush>
          {form.enabled && form.text ? (
            <LaunchBannerView settings={form} />
          ) : (
            <p className="px-5 py-8 text-sm text-gray-500">Rien à afficher.</p>
          )}
        </Panel>
      ) : (
        <Panel
          title="Contenu"
          bar={
            <div className="flex flex-wrap items-center justify-end gap-3">
              {failure && <p className="text-sm text-red-600 mr-auto">{failure}</p>}
              <Button variant="primary" loading={busy} onClick={save}>
                Enregistrer
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm text-gray-800">
              <input type="checkbox" checked={form.enabled} onChange={(e) => set('enabled', e.target.checked)} />
              Afficher la bannière
            </label>
            <Field label="Style">
              {() => (
                <Segmented
                  label="Style"
                  value={form.style}
                  onChange={(v) => set('style', v)}
                  options={[
                    { value: 'text', label: 'Texte' },
                    { value: 'button', label: 'Texte et bouton' },
                  ]}
                />
              )}
            </Field>
            <Field label="Message" hint="Une phrase courte (160 caractères au plus).">
              {(id) => <Input id={id} value={form.text} maxLength={160} onChange={(e) => set('text', e.target.value)} />}
            </Field>
            <Field label="Seconde ligne" optional hint="En gris à côté du message, sur les écrans larges (ex. la version anglaise).">
              {(id) => <Input id={id} value={form.secondary} maxLength={160} onChange={(e) => set('secondary', e.target.value)} />}
            </Field>
            {form.style === 'button' && (
              <>
                <Field label="Texte du bouton" hint="30 caractères au plus.">
                  {(id) => <Input id={id} value={form.buttonLabel} maxLength={30} onChange={(e) => set('buttonLabel', e.target.value)} placeholder="Ex. Voir les offres" />}
                </Field>
                <Field label="Lien du bouton" hint="Une page du site (/recherche, /p/…) ou une adresse https://…">
                  {(id) => <Input id={id} value={form.buttonLink} onChange={(e) => set('buttonLink', e.target.value)} placeholder="/recherche ou https://…" />}
                </Field>
              </>
            )}
          </div>
        </Panel>
      )}
    </Page>
  );
};
