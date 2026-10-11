import React, { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Badge, Button, Dialog, EmptyState, Field, Page, Panel, Select, SkeletonRows, Tabs, Textarea, useToast } from '@/shared/ui';
import { formatDateTime, formatRelative, formatXaf } from '@/shared/lib';
import { useInfiniteList } from '@/shared/hooks';
import { ROUTES } from '@/shared/config/routes';
import { EVENT_LABEL } from '@/features/orders';
import { AdminFundDetail, AdminTrackRecord, ReasonDialog, adminApi, useAdminResource } from '@/features/admin';
import { FUND_STATE } from './AdminFundsPage';

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex justify-between gap-4 py-2 text-sm">
    <dt className="text-gray-500 shrink-0">{label}</dt>
    <dd className="text-gray-900 text-right min-w-0 break-words">{children}</dd>
  </div>
);

const TICKET_TONE = { open: 'warning', answered: 'brand', resolved: 'neutral' } as const;
type View = 'resume' | 'preuves' | 'conversation' | 'historique';
const VIEWS: View[] = ['resume', 'preuves', 'conversation', 'historique'];

const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`;

/** How a party behaved so far: orders, disputes opened, and how they ended. */
const Record_: React.FC<{ r: AdminTrackRecord; side: 'seller' | 'buyer' }> = ({ r, side }) => (
  <>
    <Row label={side === 'seller' ? 'Ventes' : 'Achats'}>{`${r.orders} (${r.completed} terminées)`}</Row>
    <Row label="Litiges ouverts">{r.disputes}</Row>
    <Row label="Décidés pour l’acheteur">{r.refunded}</Row>
    <Row label="Décidés pour le vendeur">{r.paid_by_decision}</Row>
    {side === 'seller' && <Row label="Avis">{r.reviews ? `${r.rating} / 5 (${r.reviews})` : 'Aucun'}</Row>}
  </>
);

const Summary: React.FC<{ d: AdminFundDetail }> = ({ d: { order, seller, buyer, tickets, delivery } }) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
    <Panel title="Montants">
      <dl className="divide-y divide-gray-100">
        <Row label="Payé par l’acheteur">{formatXaf(order.amounts.total)}</Row>
        <Row label="Commission Salacope">{formatXaf(order.amounts.fee)}</Row>
        <Row label="Pour le vendeur">{formatXaf(order.amounts.net)}</Row>
        {order.via && <Row label="Payé par">{order.via === 'wallet' ? 'Wallet LightPay' : 'Mobile Money'}</Row>}
        {order.due_at && <Row label="Livraison attendue">{formatDateTime(order.due_at)}</Row>}
        {delivery && <Row label="Livré le">{formatDateTime(delivery.at)}</Row>}
        {order.release_at && order.status !== 'disputed' && <Row label="Libération auto">{formatDateTime(order.release_at)}</Row>}
      </dl>
    </Panel>
    <Panel title="Vendeur" description={order.store_name ?? order.seller_name}>
      <dl className="divide-y divide-gray-100">
        <Record_ r={seller} side="seller" />
        <Row label="Fiche">
          <Link to={ROUTES.admin.seller(order.seller_id)} className="hover:underline">
            Ouvrir →
          </Link>
        </Row>
      </dl>
    </Panel>
    <Panel title="Acheteur" description={order.buyer_name}>
      <dl className="divide-y divide-gray-100">
        <Row label="E-mail">{order.buyer_email}</Row>
        <Record_ r={buyer} side="buyer" />
      </dl>
    </Panel>
    {tickets.length > 0 && (
      <Panel title="Tickets liés" flush>
        <ul className="divide-y divide-gray-100">
          {tickets.map((t) => (
            <li key={t.id}>
              <Link to={ROUTES.admin.ticket(t.id)} className="flex items-center justify-between gap-3 px-5 py-3 text-sm hover:bg-gray-50">
                <span className="min-w-0 truncate text-gray-900">
                  {t.number} · {t.subject}
                </span>
                <Badge tone={TICKET_TONE[t.status]} dot>
                  {t.status === 'open' ? 'À traiter' : t.status === 'answered' ? 'Répondu' : 'Résolu'}
                </Badge>
              </Link>
            </li>
          ))}
        </ul>
      </Panel>
    )}
  </div>
);

/** What was promised, what was asked, what was delivered, and whether the product file was opened. */
const Evidence: React.FC<{ d: AdminFundDetail }> = ({ d: { order, offer, delivery, downloads, events } }) => {
  const reason = [...events].reverse().find((e) => e.type === 'disputed')?.note;
  const digital = order.item.kind === 'digital';
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
      {reason && (
        <Panel title="Motif du litige" description="Écrit par l’acheteur à l’ouverture.">
          <p className="text-sm text-gray-800 whitespace-pre-line break-words">{reason}</p>
        </Panel>
      )}
      <Panel title="Ce qui était promis" description={order.item.title}>
        <dl className="divide-y divide-gray-100">
          {offer.deliveryDays !== null && <Row label="Délai annoncé">{plural(offer.deliveryDays, 'jour')}</Row>}
          {offer.revisions !== null && <Row label="Retouches incluses">{offer.revisions}</Row>}
          {digital && order.item.file?.name && <Row label="Fichier annoncé">{order.item.file.name}</Row>}
        </dl>
        {offer.description ? (
          <p className="mt-3 text-sm text-gray-700 whitespace-pre-line break-words">{offer.description}</p>
        ) : (
          <p className="mt-3 text-sm text-gray-500">Pas de description.</p>
        )}
        <p className="mt-3 text-xs text-gray-500">Description actuelle de l’offre : elle a pu changer depuis l’achat.</p>
      </Panel>
      {order.brief && order.brief.length > 0 && (
        <Panel title="Ce que l’acheteur a demandé">
          <dl className="space-y-3">
            {order.brief.map((b, i) => (
              <div key={i} className="text-sm">
                <dt className="text-gray-500">{b.question}</dt>
                <dd className="text-gray-900 whitespace-pre-line break-words">{b.answer}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      )}
      <Panel title="Ce qui a été livré">
        {delivery ? (
          <div className="space-y-3">
            <p className="text-xs text-gray-500">Livré {formatRelative(delivery.at)}</p>
            {delivery.note && <p className="text-sm text-gray-800 whitespace-pre-line break-words">{delivery.note}</p>}
            {delivery.files.length > 0 ? (
              <ul className="divide-y divide-gray-100 text-sm">
                {delivery.files.map((f, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 py-2">
                    <span className="min-w-0 truncate text-gray-900">{f.name}</span>
                    {f.url ? (
                      <a href={f.url} target="_blank" rel="noreferrer" className="shrink-0 text-gray-600 hover:text-gray-900 hover:underline">
                        Ouvrir
                      </a>
                    ) : (
                      <span className="shrink-0 text-xs text-gray-500">{f.size}</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">Aucun fichier joint.</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500">{digital ? 'Produit numérique : le fichier de l’offre est remis à l’achat.' : 'Rien n’a encore été livré.'}</p>
        )}
      </Panel>
      {digital && (
        <Panel title="Fichier ouvert par l’acheteur" description="Chaque ouverture du fichier est enregistrée.">
          {downloads && downloads.n > 0 ? (
            <dl className="divide-y divide-gray-100">
              <Row label="Ouvertures">{downloads.n}</Row>
              <Row label="Première">{downloads.first ? formatDateTime(downloads.first) : '—'}</Row>
              <Row label="Dernière">{downloads.last ? formatDateTime(downloads.last) : '—'}</Row>
            </dl>
          ) : (
            <p className="text-sm text-gray-500">Aucune ouverture enregistrée. Les ouvertures d’avant la mise en service de ce suivi ne sont pas connues.</p>
          )}
        </Panel>
      )}
    </div>
  );
};

const Conversation: React.FC<{ d: AdminFundDetail; onAsk: () => void; canAsk: boolean }> = ({ d: { order, messages: all }, onAsk, canAsk }) => {
  const { visible: messages, hasMore, sentinelRef } = useInfiniteList(all, 15, `messages:${order.id}`);
  return (
  <Panel
    title="Conversation"
    description="Les derniers messages entre l’acheteur et le vendeur."
    actions={
      canAsk ? (
        <Button size="sm" variant="secondary" onClick={onAsk}>
          Demander une précision
        </Button>
      ) : undefined
    }
    flush
  >
    {messages.length ? (
      <ul className="divide-y divide-gray-100">
        {messages.map((m) => (
          <li key={m.id} className="px-5 py-3 text-sm">
            <div className="flex justify-between gap-3">
              <span className="font-medium text-gray-900">
                {m.name} <span className="font-normal text-gray-500">· {m.author_id === order.seller_id ? 'vendeur' : 'acheteur'}</span>
              </span>
              <span className="text-xs text-gray-500 shrink-0" title={formatDateTime(m.at)}>
                {formatRelative(m.at)}
              </span>
            </div>
            {m.body && <p className="mt-0.5 text-gray-700 whitespace-pre-line break-words">{m.body}</p>}
            {m.files > 0 && <p className="mt-0.5 text-xs text-gray-500">{plural(m.files, 'fichier')} joint{m.files > 1 ? 's' : ''}</p>}
          </li>
        ))}
      </ul>
    ) : (
      <p className="px-5 py-8 text-sm text-gray-500">Aucun message.</p>
    )}
    {hasMore && <div ref={sentinelRef} className="h-10" />}
  </Panel>
  );
};

const History: React.FC<{ d: AdminFundDetail }> = ({ d: { events: all, order } }) => {
  const { visible: events, hasMore, sentinelRef } = useInfiniteList(all, 15, `events:${order.id}`);
  return (
  <Panel title="Historique">
    <ol className="space-y-3">
      {events.map((e) => (
        <li key={e.id} className="text-sm">
          <div className="flex justify-between gap-3">
            <span className="font-medium text-gray-900">{EVENT_LABEL[e.type as keyof typeof EVENT_LABEL] ?? e.type}</span>
            <span className="text-xs text-gray-500 shrink-0">{formatDateTime(e.at)}</span>
          </div>
          {e.note && <p className="mt-0.5 text-gray-600 whitespace-pre-line break-words">{e.note}</p>}
        </li>
      ))}
    </ol>
    {hasMore && <div ref={sentinelRef} className="h-10" />}
  </Panel>
  );
};

/** Asks the seller, the buyer or both for a proof or an explanation before deciding. */
const AskDialog: React.FC<{ open: boolean; onClose: () => void; orderId: string }> = ({ open, onClose, orderId }) => {
  const toast = useToast();
  const [to, setTo] = useState<'seller' | 'buyer' | 'both'>('both');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const send = async () => {
    setBusy(true);
    setError(undefined);
    try {
      await adminApi.askFunds(orderId, to, message);
      toast.success('Question envoyée');
      setMessage('');
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Demander une précision"
      description="Ils sont notifiés et répondent dans la conversation de la commande, que vous retrouvez dans l’onglet Conversation."
      size="sm"
      dismissible={!busy}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Retour
          </Button>
          <Button variant="primary" loading={busy} onClick={send}>
            Envoyer
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="À">
          {(id) => (
            <Select
              id={id}
              value={to}
              onChange={setTo}
              className="w-full"
              options={[
                { value: 'both', label: 'Le vendeur et l’acheteur' },
                { value: 'seller', label: 'Le vendeur' },
                { value: 'buyer', label: 'L’acheteur' },
              ]}
            />
          )}
        </Field>
        <Field label="Question">{(id) => <Textarea id={id} rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Ex. : Merci d’envoyer une capture montrant le problème." />}</Field>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </Dialog>
  );
};

/** `/admin/fonds/:id` — one order's blocked money: summary, proofs, conversation and history, and the two ways to end it. */
export const AdminFundPage: React.FC = () => {
  const { id = '' } = useParams<{ id: string }>();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const view = VIEWS.find((v) => v === params.get('vue')) ?? 'resume';
  const { data, error, set } = useAdminResource(() => adminApi.fund(id), [id]);
  const [deciding, setDeciding] = useState<'release' | 'refund' | null>(null);
  const [asking, setAsking] = useState(false);
  const back = { to: ROUTES.admin.funds, label: 'Fonds bloqués' };

  if (error) {
    return (
      <Page title="Commande introuvable" back={back}>
        <EmptyState title="Cette commande n’existe pas." description={error} />
      </Page>
    );
  }
  if (!data) {
    return (
      <Page title="Fonds bloqués" back={back}>
        <SkeletonRows rows={4} className="w-full" />
      </Page>
    );
  }

  const { order } = data;
  const state = FUND_STATE[order.status];
  const disputed = order.status === 'disputed';

  return (
    <Page
      title={order.item.title}
      back={back}
      meta={
        <span className="ml-2 hidden sm:flex">
          <Badge tone={state.tone} dot>
            {state.label}
          </Badge>
        </span>
      }
      actions={
        order.held ? (
          <>
            <Button variant="secondary" onClick={() => setDeciding('refund')}>
              Rembourser l’acheteur
            </Button>
            <Button variant="primary" onClick={() => setDeciding('release')}>
              Payer le vendeur
            </Button>
          </>
        ) : undefined
      }
      toolbar={
        <Tabs
          bare
          value={view}
          onChange={(v) => {
            const next = new URLSearchParams(params);
            next.set('vue', v);
            setParams(next, { replace: true });
          }}
          items={[
            { value: 'resume', label: 'Résumé' },
            { value: 'preuves', label: 'Preuves' },
            { value: 'conversation', label: 'Conversation', count: data.messages.length },
            { value: 'historique', label: 'Historique' },
          ]}
        />
      }
    >
      {!order.held && (
        <p className="mb-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
          {order.status === 'completed' ? 'Les fonds ont été versés au vendeur.' : order.status === 'cancelled' ? 'L’acheteur a été remboursé.' : 'Ces fonds ne sont plus bloqués.'}
        </p>
      )}
      {view === 'resume' && <Summary d={data} />}
      {view === 'preuves' && <Evidence d={data} />}
      {view === 'conversation' && <Conversation d={data} canAsk={order.held} onAsk={() => setAsking(true)} />}
      {view === 'historique' && <History d={data} />}

      <AskDialog open={asking} onClose={() => setAsking(false)} orderId={order.id} />
      <ReasonDialog
        open={deciding !== null}
        onClose={() => setDeciding(null)}
        title={deciding === 'release' ? 'Payer le vendeur' : 'Rembourser l’acheteur'}
        description={
          deciding === 'release'
            ? `${order.store_name ?? order.seller_name} reçoit ${formatXaf(order.amounts.net)} (commission de ${formatXaf(order.amounts.fee)} retenue). La commande est terminée${disputed ? ' et le litige est clos' : ''}.`
            : `${order.buyer_name} est remboursé de ${formatXaf(order.amounts.total)}. La commande est annulée${disputed ? ' et le litige est clos' : ''}.`
        }
        label="Raison (visible par les deux parties)"
        danger={deciding === 'refund'}
        confirmLabel={deciding === 'release' ? 'Payer le vendeur' : 'Rembourser'}
        onConfirm={async (reason) => {
          set(deciding === 'release' ? await adminApi.releaseFunds(order.id, reason) : await adminApi.refundFunds(order.id, reason));
          toast.success(deciding === 'release' ? 'Fonds versés au vendeur.' : 'Acheteur remboursé.');
        }}
      />
    </Page>
  );
};
