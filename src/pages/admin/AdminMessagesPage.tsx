import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { BellOff, BellRing, Smartphone } from 'lucide-react';
import { adminApi, useAdminResource } from '@/features/admin';
import { Badge, Button, EmptyState, Field, Input, List, ListRow, Page, Panel, Segmented, SkeletonRows, Tabs, Textarea, useToast } from '@/shared/ui';
import { useRememberedParam } from '@/shared/hooks';
import { MESSAGE_DEFS, MessageTemplate, fillTemplate, unknownVars } from '@/shared/config/messages';
import { ROUTES } from '@/shared/config/routes';

const GROUPS = [...new Set(MESSAGE_DEFS.map((d) => d.group))];
const slug = (g: string) =>
  g
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
const messagePath = (event: string) => `${ROUTES.admin.settingsSection('messages')}/${encodeURIComponent(event)}`;

/**
 * `/admin/parametres/messages`: every automatic message Salacope sends (in the app, as a push on the phones, by e-mail to
 * guests), by group. Each one opens its own screen.
 */
export const AdminMessagesPage: React.FC = () => {
  const { data, error } = useAdminResource(() => adminApi.messages(), []);
  const [group, setGroup] = useRememberedParam('admin.messages', 'groupe', GROUPS.map(slug), slug(GROUPS[0]));
  const current = GROUPS.find((g) => slug(g) === group) ?? GROUPS[0];
  const defs = MESSAGE_DEFS.filter((d) => d.group === current);

  return (
    <Page
      title="Messages"
      back={{ to: ROUTES.admin.settings, label: 'Paramètres' }}
      help="Les messages automatiques : la notification dans l’app, la notification push sur le téléphone et, pour un client sans compte, l’e-mail. Un changement s’applique tout de suite."
      toolbar={<Tabs bare value={group} onChange={setGroup} items={GROUPS.map((g) => ({ value: slug(g), label: g, count: MESSAGE_DEFS.filter((d) => d.group === g).length }))} />}
    >
      {error && !data ? (
        <EmptyState title="Messages indisponibles" description={error} />
      ) : !data ? (
        <SkeletonRows rows={6} />
      ) : (
        <Panel
          title={current}
          count={defs.length}
          flush
          footer={data.pushReady ? 'Notifications push actives.' : 'Notifications push non configurées (SALACOPE_FCM_SERVICE_ACCOUNT) : seuls les messages dans l’app partent.'}
        >
          <List columns={{ main: 'Message', meta: 'Envoi' }}>
            {defs.map((d) => {
              const t = { ...d, ...(data.overrides[d.event] ?? {}) };
              const changed = Boolean(data.overrides[d.event]);
              return (
                <ListRow
                  key={d.event}
                  to={messagePath(d.event)}
                  title={d.label}
                  subtitle={fillTemplate(t.title, data.sample)}
                  meta={
                    <span className="flex items-center gap-1.5">
                      {!t.enabled ? <Badge tone="neutral">Coupé</Badge> : t.push ? <Badge tone="brand">Push</Badge> : <Badge tone="neutral">App seule</Badge>}
                      {changed && <Badge tone="warning">Modifié</Badge>}
                    </span>
                  }
                />
              );
            })}
          </List>
        </Panel>
      )}
    </Page>
  );
};

/** What the phone shows: the notification as it will look, with example values. */
const PhonePreview: React.FC<{ title: string; body: string; push: boolean; enabled: boolean }> = ({ title, body, push, enabled }) => (
  <div className="rounded-2xl border border-gray-200/70 bg-gray-50 p-4">
    <p className="mb-3 flex items-center gap-1.5 text-xs text-gray-500">
      {enabled && push ? <BellRing className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
      {!enabled ? 'Ce message n’est plus envoyé.' : push ? 'Sur le téléphone, même app fermée' : 'Dans les notifications de l’app seulement'}
    </p>
    <div className="rounded-xl bg-surface border border-gray-200/70 px-3.5 py-3 shadow-xs">
      <div className="flex items-center gap-2 text-[11px] text-gray-500">
        <span className="w-4 h-4 rounded bg-gray-900" aria-hidden />
        Salacope · maintenant
      </div>
      <p className="mt-1.5 text-sm font-semibold text-gray-900 break-words">{title || ' '}</p>
      {body && <p className="mt-0.5 text-sm text-gray-600 whitespace-pre-line break-words">{body}</p>}
    </div>
  </div>
);

/** `/admin/parametres/messages/:event`: one message, rewritten with a live preview. */
export const AdminMessagePage: React.FC = () => {
  const { event = '' } = useParams<{ event: string }>();
  const toast = useToast();
  const { data, error, set } = useAdminResource(() => adminApi.messages(), []);
  const def = MESSAGE_DEFS.find((d) => d.event === event);
  const saved: MessageTemplate | null = useMemo(() => (def && data ? { title: def.title, body: def.body, push: def.push, enabled: def.enabled, ...(data.overrides[def.event] ?? {}) } : null), [def, data]);
  const [form, setForm] = useState<MessageTemplate | null>(saved);
  const [busy, setBusy] = useState<'save' | 'test' | 'reset' | null>(null);
  const [problem, setProblem] = useState<string>();
  useEffect(() => setForm(saved), [saved]);

  if (!def) return <Navigate to={ROUTES.admin.settingsSection('messages')} replace />;
  const back = { to: ROUTES.admin.settingsSection('messages'), label: 'Messages' };
  if (error && !data) return <Page title={def.label} back={back}><EmptyState title="Message indisponible" description={error} /></Page>;
  if (!data || !form || !saved) return <Page title={def.label} back={back}><SkeletonRows rows={4} /></Page>;

  const unknown = [...unknownVars(form.title, def.vars), ...unknownVars(form.body, def.vars)];
  const dirty = JSON.stringify(form) !== JSON.stringify(saved);
  const changed = Boolean(data.overrides[def.event]);
  const run = async (kind: 'save' | 'test' | 'reset') => {
    setBusy(kind);
    setProblem(undefined);
    try {
      if (kind === 'save') {
        const overrides = await adminApi.saveMessage(def.event, form);
        set((d) => (d ? { ...d, overrides } : d));
        toast.success('Message enregistré');
      } else if (kind === 'reset') {
        const overrides = await adminApi.resetMessage(def.event);
        set((d) => (d ? { ...d, overrides } : d));
        toast.success('Texte d’origine rétabli');
      } else {
        const r = await adminApi.testMessage(def.event, form);
        toast.success(`Test envoyé sur ${r.sent} téléphone${r.sent > 1 ? 's' : ''}`);
      }
    } catch (e) {
      setProblem((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Page title={def.label} width="narrow" back={back}>
      <Panel
        title="Texte"
        description={def.vars.length ? `Variables : ${def.vars.map((v) => `{${v}}`).join(' ')}` : 'Ce message n’a pas de variable.'}
        bar={
          <div className="flex flex-wrap items-center gap-2 w-full">
            {changed && (
              <Button variant="ghost" loading={busy === 'reset'} onClick={() => run('reset')}>
                Rétablir le texte d’origine
              </Button>
            )}
            <Button className="ml-auto" icon={<Smartphone className="w-4 h-4" />} loading={busy === 'test'} disabled={!data.pushReady || unknown.length > 0} onClick={() => run('test')}>
              Envoyer un test sur mon téléphone
            </Button>
            <Button variant="primary" loading={busy === 'save'} disabled={!dirty || unknown.length > 0 || !form.title.trim()} onClick={() => run('save')}>
              Enregistrer
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Field label="Titre" error={unknownVars(form.title, def.vars).length ? `Variable inconnue : {${unknownVars(form.title, def.vars)[0]}}` : undefined}>
            {(id) => <Input id={id} value={form.title} maxLength={120} onChange={(e) => setForm({ ...form, title: e.target.value })} />}
          </Field>
          <Field label="Texte" optional error={unknownVars(form.body, def.vars).length ? `Variable inconnue : {${unknownVars(form.body, def.vars)[0]}}` : undefined}>
            {(id) => <Textarea id={id} rows={3} value={form.body} maxLength={300} onChange={(e) => setForm({ ...form, body: e.target.value })} />}
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Notification push">
              {() => (
                <Segmented
                  label="Notification push"
                  value={form.push ? 'on' : 'off'}
                  onChange={(v) => setForm({ ...form, push: v === 'on' })}
                  options={[
                    { value: 'on', label: 'Envoyée' },
                    { value: 'off', label: 'App seule' },
                  ]}
                />
              )}
            </Field>
            <Field label="Message">
              {() => (
                <Segmented
                  label="Message actif"
                  value={form.enabled ? 'on' : 'off'}
                  onChange={(v) => setForm({ ...form, enabled: v === 'on' })}
                  options={[
                    { value: 'on', label: 'Actif' },
                    { value: 'off', label: 'Coupé' },
                  ]}
                />
              )}
            </Field>
          </div>
          <PhonePreview title={fillTemplate(form.title, data.sample)} body={fillTemplate(form.body, data.sample)} push={form.push} enabled={form.enabled} />
          {problem && (
            <p className="text-sm text-red-600" role="alert">
              {problem}
            </p>
          )}
        </div>
      </Panel>
    </Page>
  );
};
