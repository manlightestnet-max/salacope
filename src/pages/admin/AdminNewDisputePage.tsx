import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Users } from 'lucide-react';
import { Avatar, Badge, Button, EmptyState, Field, Input, List, ListRow, MoreRows, Page, Panel, SearchField, Select, SkeletonRows, Textarea } from '@/shared/ui';
import { usePagedList } from '@/shared/hooks';
import { ROUTES } from '@/shared/config/routes';
import { adminApi, useAdminResource } from '@/features/admin';
import { disputesApi } from '@/features/disputes';

const DEFAULT_TITLE = 'Contenu copié d’un autre compte';

/** Step 1: the account concerned, picked from the list. */
const Pick: React.FC = () => {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const list = usePagedList((offset) => adminApi.users('all', search, offset), [search]);
  return (
    <Page
      title="Ouvrir un litige"
      width="narrow"
      back={{ to: ROUTES.admin.disputes, label: 'Litiges' }}
      help="Pour un compte qui copie le contenu d’un autre, ou qui publie ce qui n’est pas autorisé. Choisissez d’abord le compte concerné."
      actions={
        <SearchField
          value={q}
          onChange={(v) => {
            setQ(v);
            if (!v) setSearch('');
          }}
          onSubmit={() => setSearch(q.trim())}
          placeholder="Nom, e-mail, téléphone"
          className="w-40 sm:w-64"
        />
      }
    >
      <Panel title="Compte concerné" flush>
        {list.error && !list.items ? (
          <EmptyState title="Liste indisponible" description={list.error} />
        ) : !list.items ? (
          <div className="py-12 flex justify-center">
            <SkeletonRows rows={4} className="w-full" />
          </div>
        ) : list.items.length ? (
          <>
            <List>
              {list.items.map((u) => (
                <ListRow
                  key={u.id}
                  onClick={() => navigate(`${ROUTES.admin.newDispute}?compte=${u.id}`)}
                  leading={<Avatar name={u.name} />}
                  title={u.name}
                  subtitle={u.email}
                  meta={
                    <span className="flex flex-wrap gap-1">
                      {u.store_name && <Badge>Vendeur · {u.store_name}</Badge>}
                      {u.blocked_at && <Badge tone="danger">Bloqué</Badge>}
                    </span>
                  }
                />
              ))}
            </List>
            <MoreRows hasMore={list.hasMore} loading={list.loadingMore} sentinelRef={list.sentinelRef} onMore={list.next} />
          </>
        ) : (
          <EmptyState icon={Users} title="Aucun compte" />
        )}
      </Panel>
    </Page>
  );
};

/** Step 2: what is reproached, about which offer. */
const Form: React.FC<{ id: string }> = ({ id }) => {
  const navigate = useNavigate();
  const { data: account, error } = useAdminResource(() => adminApi.user(id), [id]);
  const store = account?.user.store_name;
  const { data: seller } = useAdminResource(() => (store ? adminApi.seller(id) : Promise.resolve(undefined)), [id, store]);
  const [listingId, setListingId] = useState('');
  const [title, setTitle] = useState(DEFAULT_TITLE);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string>();
  useEffect(() => setListingId(''), [id]);
  const back = { to: ROUTES.admin.newDispute, label: 'Compte' };

  if (error) {
    return (
      <Page title="Ouvrir un litige" back={back} width="narrow">
        <EmptyState title="Compte introuvable" description={error} />
      </Page>
    );
  }
  if (!account) {
    return (
      <Page title="Ouvrir un litige" back={back} width="narrow">
        <SkeletonRows rows={4} />
      </Page>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setFailure(undefined);
    try {
      const room = await disputesApi.open({ subjectId: id, listingId: listingId || undefined, title, message });
      navigate(ROUTES.admin.dispute(room.dispute.id), { replace: true });
    } catch (err) {
      setFailure((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <Page title={`Litige · ${account.user.name}`} back={back} width="narrow">
      <form onSubmit={submit}>
        <Panel
          title="Ce qui est reproché"
          description={`${account.user.name} · ${account.user.email}${store ? ` · ${store}` : ''}. La personne est notifiée et répond dans la salle du litige.`}
          bar={
            <div className="flex flex-wrap items-center justify-end gap-3">
              {failure && <p className="text-sm text-red-600 mr-auto">{failure}</p>}
              <Button type="submit" variant="primary" loading={busy}>
                Ouvrir le litige
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            {seller && seller.listings.length > 0 && (
              <Field label="Offre concernée" optional>
                {(fid) => (
                  <Select
                    id={fid}
                    value={listingId}
                    onChange={setListingId}
                    className="w-full"
                    options={[{ value: '', label: 'Aucune offre précise' }, ...seller.listings.map((o) => ({ value: o.id, label: o.title }))]}
                  />
                )}
              </Field>
            )}
            <Field label="Objet">{(fid) => <Input id={fid} value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />}</Field>
            <Field label="Message" hint="Soyez précis : la personne lit ce message et peut y répondre avec ses preuves.">
              {(fid) => <Textarea id={fid} rows={6} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Ex. : cette offre reprend mot pour mot le contenu de la boutique X." />}
            </Field>
          </div>
        </Panel>
      </form>
    </Page>
  );
};

/** `/admin/litiges/nouveau`: pick the account from a list, then say what is reproached. */
export const AdminNewDisputePage: React.FC = () => {
  const [params] = useSearchParams();
  const id = params.get('compte');
  return id ? <Form key={id} id={id} /> : <Pick />;
};
