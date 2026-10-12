import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, EmptyState, Field, Input, Page, Panel, SkeletonRows, Tabs, Textarea, useToast } from '@/shared/ui';
import { useUrlParam } from '@/shared/hooks';
import { SOCIALS, SiteIdentity, applyIdentity } from '@/shared/config/identity';
import { ROUTES } from '@/shared/config/routes';
import { adminApi, useAdminResource } from '@/features/admin';

type View = 'general' | 'reseaux';

/**
 * `/admin/parametres/identite`: what the site says about itself. The footer, the previews of shared links, the home page's
 * structured data and the file for assistants (llms.txt) are all written from these values: nothing is fixed in the code.
 */
export const AdminIdentityPage: React.FC = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const { data, error } = useAdminResource(() => adminApi.identity(), []);
  const [form, setForm] = useState<SiteIdentity>();
  const [view, setView] = useUrlParam<View>('vue', ['general', 'reseaux'], 'general');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string>();
  useEffect(() => {
    if (data && !form) setForm(data);
  }, [data, form]);
  const back = { to: ROUTES.admin.settings, label: 'Paramètres' };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setBusy(true);
    setFailure(undefined);
    try {
      const saved = await adminApi.saveIdentity(form);
      applyIdentity(saved);
      toast.success('Identité enregistrée');
      navigate(ROUTES.admin.settings, { replace: true });
    } catch (err) {
      setFailure((err as Error).message);
      setBusy(false);
    }
  };
  const set = <K extends keyof SiteIdentity>(key: K, value: SiteIdentity[K]) => setForm((f) => f && { ...f, [key]: value });

  return (
    <Page
      title="Identité du site"
      width="narrow"
      back={back}
      help="Ce que le site dit de lui-même : le pied de page, l’aperçu des liens partagés, les données lues par Google et par les assistants IA. Rien n’est écrit en dur dans le code."
      toolbar={
        <Tabs
          bare
          value={view}
          onChange={setView}
          items={[
            { value: 'general', label: 'Général' },
            { value: 'reseaux', label: 'Réseaux sociaux' },
          ]}
        />
      }
    >
      {error ? (
        <EmptyState title="Identité indisponible" description={error} />
      ) : !form ? (
        <SkeletonRows rows={4} />
      ) : (
        <form onSubmit={save}>
          <Panel
            title={view === 'general' ? 'Général' : 'Réseaux sociaux'}
            description={
              view === 'general'
                ? 'Le contact affiché partout, la description lue par les moteurs de recherche et l’image des aperçus.'
                : 'Les profils officiels de Salacope. Ils apparaissent dans le pied de page et sont déclarés à Google comme appartenant au site.'
            }
            bar={
              <div className="flex flex-wrap items-center justify-end gap-3">
                {failure && <p className="text-sm text-red-600 mr-auto">{failure}</p>}
                <Button type="submit" variant="primary" loading={busy}>
                  Enregistrer
                </Button>
              </div>
            }
          >
            {view === 'general' ? (
              <div className="space-y-4">
                <Field label="E-mail de contact" hint="Affiché dans le pied de page, donné aux comptes bloqués et déclaré à Google.">
                  {(id) => <Input id={id} type="email" value={form.contactEmail} onChange={(e) => set('contactEmail', e.target.value)} />}
                </Field>
                <Field label="Où est basée l’équipe" optional hint="Ligne sous le contact, dans le pied de page.">
                  {(id) => <Input id={id} value={form.headquarters} maxLength={120} onChange={(e) => set('headquarters', e.target.value)} />}
                </Field>
                <Field label="Description du site" hint="Une ou deux phrases (320 caractères au plus) : c’est le texte que Google et les assistants IA retiennent.">
                  {(id) => <Textarea id={id} rows={4} value={form.description} maxLength={320} onChange={(e) => set('description', e.target.value)} />}
                </Field>
                <Field label="Image des liens partagés" optional hint="Adresse https:// d’une image de 1200 × 630 px. Vide : l’icône du site.">
                  {(id) => <Input id={id} value={form.shareImage} placeholder="https://img.salacope.online/partage.png" onChange={(e) => set('shareImage', e.target.value)} />}
                </Field>
              </div>
            ) : (
              <div className="space-y-4">
                {SOCIALS.map((s) => (
                  <Field key={s.key} label={s.label} optional>
                    {(id) => <Input id={id} value={form.socials[s.key]} placeholder={s.example} onChange={(e) => set('socials', { ...form.socials, [s.key]: e.target.value })} />}
                  </Field>
                ))}
              </div>
            )}
          </Panel>
        </form>
      )}
    </Page>
  );
};
