import React, { useEffect, useState } from 'react';
import { Badge, Button, Dialog, Field, Input, Select, Textarea } from '@/shared/ui';
import { disputesApi } from '@/features/disputes';
import { AdminSellerDetail, AdminUserRow, adminApi } from '../api';

const DEFAULT_TITLE = 'Contenu copié d’un autre compte';

/**
 * Opens a dispute about an account's conduct (copied content, forbidden content…): the administration picks the account and,
 * if relevant, the offer, then writes what is reproached. The account is told and answers in the room.
 */
export const OpenDisputeDialog: React.FC<{ open: boolean; onClose: () => void; onOpened: (disputeId: string) => void }> = ({ open, onClose, onOpened }) => {
  const [q, setQ] = useState('');
  const [found, setFound] = useState<AdminUserRow[]>([]);
  const [subject, setSubject] = useState<AdminUserRow | null>(null);
  const [offers, setOffers] = useState<AdminSellerDetail['listings']>([]);
  const [listingId, setListingId] = useState('');
  const [title, setTitle] = useState(DEFAULT_TITLE);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (open) {
      setQ('');
      setFound([]);
      setSubject(null);
      setOffers([]);
      setListingId('');
      setTitle(DEFAULT_TITLE);
      setMessage('');
      setError(undefined);
    }
  }, [open]);

  // Accounts matching the words typed.
  useEffect(() => {
    if (subject || q.trim().length < 2) return setFound([]);
    let live = true;
    const timer = window.setTimeout(() => {
      adminApi.users('all', q.trim(), 0).then((page) => live && setFound(page.items.slice(0, 5)), () => undefined);
    }, 250);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [q, subject]);

  const choose = async (u: AdminUserRow) => {
    setSubject(u);
    setFound([]);
    setListingId('');
    setOffers([]);
    if (u.store_name) {
      try {
        setOffers((await adminApi.seller(u.id)).listings);
      } catch {
        // no offers to pick: the dispute is about the account
      }
    }
  };

  const submit = async () => {
    if (!subject) return setError('Choisissez le compte concerné.');
    setBusy(true);
    setError(undefined);
    try {
      const room = await disputesApi.open({ subjectId: subject.id, listingId: listingId || undefined, title, message });
      onOpened(room.dispute.id);
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
      title="Ouvrir un litige"
      description="Pour un compte qui copie le contenu d’un autre, ou qui publie ce qui n’est pas autorisé. La personne est notifiée et répond dans la salle."
      size="sm"
      dismissible={!busy}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Retour
          </Button>
          <Button variant="primary" loading={busy} onClick={submit}>
            Ouvrir le litige
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Compte concerné">
          {(id) =>
            subject ? (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm">
                <span className="min-w-0 truncate">
                  <span className="font-medium text-gray-900">{subject.name}</span>
                  <span className="text-gray-500"> · {subject.email}</span>
                </span>
                <button type="button" onClick={() => setSubject(null)} className="shrink-0 text-xs text-gray-500 hover:text-gray-900">
                  Changer
                </button>
              </div>
            ) : (
              <>
                <Input id={id} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom, e-mail, téléphone" autoComplete="off" />
                {found.length > 0 && (
                  <ul className="mt-1 rounded-lg border border-gray-200 divide-y divide-gray-100 overflow-hidden">
                    {found.map((u) => (
                      <li key={u.id}>
                        <button type="button" onClick={() => choose(u)} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between gap-2">
                          <span className="min-w-0 truncate">
                            <span className="font-medium text-gray-900">{u.name}</span>
                            <span className="text-gray-500"> · {u.email}</span>
                          </span>
                          {u.store_name && <Badge>Vendeur</Badge>}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )
          }
        </Field>
        {offers.length > 0 && (
          <Field label="Offre concernée" optional>
            {(id) => (
              <Select
                id={id}
                value={listingId}
                onChange={setListingId}
                className="w-full"
                options={[{ value: '', label: 'Aucune offre précise' }, ...offers.map((o) => ({ value: o.id, label: o.title }))]}
              />
            )}
          </Field>
        )}
        <Field label="Objet">{(id) => <Input id={id} value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />}</Field>
        <Field label="Ce qui est reproché" hint="Soyez précis : la personne lit ce message et peut y répondre avec ses preuves.">
          {(id) => <Textarea id={id} rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Ex. : cette offre reprend mot pour mot le contenu de la boutique X." />}
        </Field>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </Dialog>
  );
};
