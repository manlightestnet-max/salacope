import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Button, EmptyState, Field, Input, Page, Panel, SkeletonRows, Textarea, useToast } from '@/shared/ui';
import { SOCIALS, SiteIdentity, SocialKey, applyIdentity } from '@/shared/config/identity';
import { ROUTES } from '@/shared/config/routes';
import { adminApi, useAdminResource } from '@/features/admin';

const GENERAL = ['contact', 'description', 'image'];

/** `/admin/parametres/identite/:champ`: one item of the site's identity in its own screen; saving goes back to the list. */
export const AdminIdentityFieldPage: React.FC = () => {
  const { champ = '' } = useParams<{ champ: string }>();
  const toast = useToast();
  const navigate = useNavigate();
  const { data, error } = useAdminResource(() => adminApi.identity(), []);
  const [form, setForm] = useState<SiteIdentity>();
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string>();
  useEffect(() => {
    if (data && !form) setForm(data);
  }, [data, form]);

  const social = SOCIALS.find((s) => s.key === champ);
  if (!social && !GENERAL.includes(champ)) return <Navigate to={`${ROUTES.admin.settings}/identite`} replace />;
  const title = social ? social.label : champ === 'contact' ? 'Contact' : champ === 'description' ? 'Description du site' : 'Image des liens partagés';

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setBusy(true);
    setFailure(undefined);
    try {
      applyIdentity(await adminApi.saveIdentity(form));
      toast.success('Enregistré');
      navigate(`${ROUTES.admin.settings}/identite${social ? '?vue=reseaux' : ''}`, { replace: true });
    } catch (err) {
      setFailure((err as Error).message);
      setBusy(false);
    }
  };
  const set = <K extends keyof SiteIdentity>(key: K, value: SiteIdentity[K]) => setForm((f) => f && { ...f, [key]: value });

  return (
    <Page title={title} width="narrow" back={{ to: `${ROUTES.admin.settings}/identite`, label: 'Identité du site' }}>
      {error ? (
        <EmptyState title="Identité indisponible" description={error} />
      ) : !form ? (
        <SkeletonRows rows={3} />
      ) : (
        <form onSubmit={save}>
          <Panel
            bar={
              <div className="flex flex-wrap items-center justify-end gap-3">
                {failure && <p className="text-sm text-red-600 mr-auto">{failure}</p>}
                <Button type="submit" variant="primary" loading={busy}>
                  Enregistrer
                </Button>
              </div>
            }
          >
            <div className="space-y-4">
              {social && (
                <Field label={`Adresse du profil ${social.label}`} hint="L’adresse complète, qui commence par https://. Vide : le lien n’apparaît pas." >
                  {(id) => (
                    <Input id={id} value={form.socials[social.key as SocialKey]} placeholder={social.example} onChange={(e) => set('socials', { ...form.socials, [social.key]: e.target.value })} />
                  )}
                </Field>
              )}
              {champ === 'contact' && (
                <>
                  <Field label="E-mail de contact" hint="Affiché dans le pied de page, donné aux comptes bloqués et déclaré à Google.">
                    {(id) => <Input id={id} type="email" value={form.contactEmail} onChange={(e) => set('contactEmail', e.target.value)} />}
                  </Field>
                  <Field label="Où est basée l’équipe" optional hint="La ligne sous le contact, dans le pied de page.">
                    {(id) => <Input id={id} value={form.headquarters} maxLength={120} onChange={(e) => set('headquarters', e.target.value)} />}
                  </Field>
                </>
              )}
              {champ === 'description' && (
                <Field label="Description" hint="Une ou deux phrases (320 caractères au plus) : c’est le texte que Google et les assistants IA retiennent.">
                  {(id) => <Textarea id={id} rows={5} value={form.description} maxLength={320} onChange={(e) => set('description', e.target.value)} />}
                </Field>
              )}
              {champ === 'image' && (
                <Field label="Adresse de l’image" optional hint="Adresse https:// d’une image de 1200 × 630 px. Vide : l’icône du site.">
                  {(id) => <Input id={id} value={form.shareImage} placeholder="https://img.salacope.online/partage.png" onChange={(e) => set('shareImage', e.target.value)} />}
                </Field>
              )}
            </div>
          </Panel>
        </form>
      )}
    </Page>
  );
};
