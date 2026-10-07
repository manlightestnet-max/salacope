import React, { useEffect, useState } from 'react';
import { ExternalLink, ImageIcon } from 'lucide-react';
import {
  Badge,
  Button,
  DescriptionList,
  Dialog,
  EmptyState,
  Field,
  Input,
  List,
  ListRow,
  Panel,
  Select,
  SkeletonRows,
  Stat,
  StatGrid,
  useToast,
} from '@/shared/ui';
import { formatDate, formatDateTime, formatXaf, plural } from '@/shared/lib';
import { ROUTES } from '@/shared/config/routes';
import { KYC_DOCUMENTS, KYC_ID_TYPES, KYC_STATUS_LABEL, KycDocumentKind, KycStatus, RISK_LABEL, RiskLevel } from '@/shared/domain';
import { AUDIT_LABEL, AdminKycSubmission, AdminSellerDetail, adminApi } from '../api';
import { useAdminResource } from '../hooks';
import { ReasonDialog } from './ReasonDialog';

const KYC_TONE: Record<KycStatus, 'neutral' | 'warning' | 'success' | 'danger'> = {
  none: 'neutral',
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
};

export const KycBadge: React.FC<{ status: KycStatus }> = ({ status }) => <Badge tone={KYC_TONE[status]}>{KYC_STATUS_LABEL[status]}</Badge>;

const RISKS = (Object.keys(RISK_LABEL) as RiskLevel[]).map((value) => ({ value, label: `Risque ${RISK_LABEL[value].toLowerCase()}` }));

/** One identity photo: fetched only when asked (each view is logged), enlarged on click. */
const DocumentTile: React.FC<{ submissionId: string; kind: KycDocumentKind; label: string }> = ({ submissionId, kind, label }) => {
  const [url, setUrl] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [open, setOpen] = useState(false);
  useEffect(() => setUrl(undefined), [submissionId]);

  const load = async () => {
    setBusy(true);
    setError(undefined);
    try {
      setUrl(await adminApi.document(submissionId, kind));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => (url ? setOpen(true) : load())}
        className="relative aspect-[4/3] rounded-lg border border-gray-200 bg-gray-50 overflow-hidden flex flex-col items-center justify-center gap-1 text-xs text-gray-600 hover:bg-gray-100"
      >
        {url ? (
          <img src={url} alt={label} className="absolute inset-0 w-full h-full object-cover" />
        ) : busy ? (
          <SkeletonRows rows={4} className="w-full" />
        ) : (
          <>
            <ImageIcon className="w-4 h-4" />
            <span className="px-2 text-center">{error ?? label}</span>
            <span className="text-gray-400">Afficher</span>
          </>
        )}
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title={label} size="xl">
        {url && <img src={url} alt={label} className="w-full h-auto rounded-lg" />}
      </Dialog>
    </>
  );
};

const Submission: React.FC<{ s: AdminKycSubmission }> = ({ s }) => (
  <div className="space-y-4">
    <DescriptionList
      items={[
        { label: 'Nom complet', value: s.full_name },
        { label: 'Date de naissance', value: formatDate(s.birth_date) },
        { label: 'Nationalité', value: s.nationality },
        { label: 'Adresse', value: s.address },
        { label: 'Pièce', value: KYC_ID_TYPES.find((t) => t.value === s.id_type)?.label ?? s.id_type },
        { label: 'Numéro', value: s.id_number },
        { label: 'Expiration', value: s.id_expires ? formatDate(s.id_expires) : '—' },
        { label: 'Fonction publique (PEP)', value: s.pep ? <Badge tone="warning">Oui : risque élevé</Badge> : 'Non' },
        { label: 'Envoyé le', value: formatDateTime(s.created_at) },
        ...(s.reviewed_at ? [{ label: 'Examiné', value: `${formatDateTime(s.reviewed_at)} · ${s.reviewed_by}` }] : []),
        ...(s.note ? [{ label: 'Note', value: s.note }] : []),
      ]}
    />
    <div className="grid grid-cols-3 gap-2">
      {KYC_DOCUMENTS.filter((d) => s.documents.includes(d.kind)).map((d) => (
        <DocumentTile key={d.kind} submissionId={s.id} kind={d.kind} label={d.label} />
      ))}
    </div>
  </div>
);

type Action = 'approve' | 'reject' | 'suspend' | 'unsuspend' | 'block' | 'unblock' | { unpublish: { id: string; title: string } };

/** Everything about one seller, and every administrator action on them. */
export const SellerDetail: React.FC<{ id: string; onChanged?: () => void }> = ({ id, onChanged }) => {
  const { data, error, loading, reload, set } = useAdminResource(() => adminApi.seller(id), [id]);
  const toast = useToast();
  const [action, setAction] = useState<Action | null>(null);
  const [form, setForm] = useState({ name: '', storeName: '', headline: '', city: '', risk: 'low' as RiskLevel });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) {
      const s = data.seller;
      setForm({ name: s.name, storeName: s.store_name, headline: s.headline, city: s.city, risk: s.risk });
    }
  }, [data]);

  if (loading && !data) return <Panel><div className="py-10 flex justify-center"><SkeletonRows rows={4} className="w-full" /></div></Panel>;
  if (error || !data) return <Panel><EmptyState title="Vendeur indisponible" description={error} action={<Button onClick={reload}>Réessayer</Button>} /></Panel>;

  const { seller, submissions, listings, stats, log } = data;
  const latest = submissions[0];
  const done = (message: string) => (result?: AdminSellerDetail | unknown) => {
    if (result && typeof result === 'object' && 'seller' in result) set(result as AdminSellerDetail);
    else reload();
    toast.success(message);
    onChanged?.();
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      done('Boutique enregistrée.')(await adminApi.editSeller(id, form));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const unpublishing = action && typeof action === 'object' ? action.unpublish : null;

  return (
    <div className="space-y-6">
      <Panel
        title={seller.store_name}
        description={`${seller.name} · ${seller.email}${seller.phone ? ` · ${seller.phone}` : ''}`}
        actions={
          <Button size="sm" variant="ghost" href={ROUTES.store(seller.id)} icon={<ExternalLink className="w-4 h-4" />}>
            Vitrine
          </Button>
        }
      >
        <div className="flex flex-wrap gap-1.5 mb-4">
          <KycBadge status={seller.kyc_status} />
          <Badge tone={seller.risk === 'high' ? 'danger' : seller.risk === 'medium' ? 'warning' : 'neutral'}>Risque {RISK_LABEL[seller.risk].toLowerCase()}</Badge>
          {seller.suspended_at && <Badge tone="danger">Boutique suspendue</Badge>}
          {seller.blocked_at && <Badge tone="danger">Compte bloqué</Badge>}
          <Badge tone={seller.wallet ? 'success' : 'neutral'}>{seller.wallet ? 'Wallet LightPay connecté' : 'Wallet non connecté'}</Badge>
        </div>
        <StatGrid columns={4}>
          <Stat label="Commandes" value={stats.orders} hint={stats.disputed ? `${stats.disputed} en litige` : undefined} />
          <Stat label="Volume" value={formatXaf(stats.volume)} />
          <Stat label="Commission" value={formatXaf(stats.commission)} help="Commission Salacope sur les ventes validées." />
          <Stat label="Ouverte le" value={formatDate(seller.activated_at)} />
        </StatGrid>
        {(seller.suspended_reason || seller.blocked_reason) && (
          <p className="mt-4 text-sm text-gray-700">
            {seller.suspended_reason && <>Suspension : {seller.suspended_reason}. </>}
            {seller.blocked_reason && <>Blocage : {seller.blocked_reason}.</>}
          </p>
        )}
      </Panel>

      <Panel
        title="Identité (KYC)"
        count={submissions.length || undefined}
        help="Vérifiez que la pièce est valide, que la photo et le selfie correspondent, et que le nom est le même partout. Chaque document affiché est noté dans le journal."
        bar={
          latest?.status === 'pending' ? (
            <div className="flex flex-wrap gap-2 justify-end">
              <Button variant="secondary" onClick={() => setAction('reject')}>
                Refuser
              </Button>
              <Button variant="primary" onClick={() => setAction('approve')}>
                Valider l’identité
              </Button>
            </div>
          ) : undefined
        }
      >
        {latest ? <Submission s={latest} /> : <EmptyState title="Aucun document envoyé" description="Le vendeur doit vérifier son identité avant de publier." />}
      </Panel>

      <Panel
        title="Boutique"
        bar={
          <div className="flex justify-end">
            <Button type="submit" form={`seller-${id}`} variant="primary" loading={saving}>
              Enregistrer
            </Button>
          </div>
        }
      >
        <form id={`seller-${id}`} onSubmit={save} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nom du vendeur">{(fid) => <Input id={fid} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />}</Field>
          <Field label="Nom de la boutique">
            {(fid) => <Input id={fid} value={form.storeName} onChange={(e) => setForm({ ...form, storeName: e.target.value })} />}
          </Field>
          <Field label="Accroche" className="sm:col-span-2">
            {(fid) => <Input id={fid} value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} />}
          </Field>
          <Field label="Ville">{(fid) => <Input id={fid} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />}</Field>
          <Field label="Niveau de risque" hint="Faible : révision tous les 3 ans · Moyen : 2 ans · Élevé : chaque année.">
            {(fid) => <Select id={fid} value={form.risk} options={RISKS} onChange={(risk) => setForm({ ...form, risk })} className="w-full" />}
          </Field>
        </form>
      </Panel>

      <Panel title="Offres" count={listings.length} flush>
        {listings.length ? (
          <List columns={{ main: 'Offre', meta: 'Statut', trailing: 'Prix' }}>
            {listings.map((l) => (
              <ListRow
                key={l.id}
                title={l.title}
                subtitle={plural(l.sales, 'vente')}
                meta={<Badge tone={l.status === 'published' ? 'success' : 'neutral'}>{l.status === 'published' ? 'En ligne' : 'Brouillon'}</Badge>}
                trailing={<span className="text-sm font-medium text-gray-900">{formatXaf(l.price_xaf)}</span>}
                actions={
                  l.status === 'published' ? (
                    <Button size="sm" variant="ghost" onClick={() => setAction({ unpublish: { id: l.id, title: l.title } })}>
                      Retirer
                    </Button>
                  ) : undefined
                }
              />
            ))}
          </List>
        ) : (
          <EmptyState title="Aucune offre" />
        )}
      </Panel>

      <Panel title="Mesures">
        <div className="flex flex-wrap gap-2">
          {seller.suspended_at ? (
            <Button onClick={() => setAction('unsuspend')}>Réactiver la boutique</Button>
          ) : (
            <Button variant="danger" onClick={() => setAction('suspend')}>
              Suspendre la boutique
            </Button>
          )}
          {seller.blocked_at ? (
            <Button onClick={() => setAction('unblock')}>Débloquer le compte</Button>
          ) : (
            <Button variant="danger" onClick={() => setAction('block')}>
              Bloquer le compte
            </Button>
          )}
        </div>
        <p className="mt-3 text-xs text-gray-500">
          Suspendre masque les offres et empêche toute nouvelle vente. Bloquer interdit toute action avec le compte (achat
          compris). Les fonds déjà bloqués restent en séquestre chez LightPay.
        </p>
      </Panel>

      <Panel title="Journal" count={log.length} flush>
        {log.length ? (
          <List>
            {log.map((a) => (
              <ListRow
                key={a.id}
                title={AUDIT_LABEL[a.action] ?? a.action}
                subtitle={`${formatDateTime(a.created_at)} · ${a.admin_email}`}
                trailing={<span className="text-xs text-gray-500 max-w-[14rem] truncate">{a.detail?.reason ?? a.detail?.note ?? a.detail?.title ?? ''}</span>}
              />
            ))}
          </List>
        ) : (
          <EmptyState title="Aucune action" />
        )}
      </Panel>

      <ReasonDialog
        open={action === 'approve'}
        onClose={() => setAction(null)}
        title="Valider l’identité"
        description="Les offres du vendeur pourront être mises en ligne."
        label="Note"
        optional
        confirmLabel="Valider"
        onConfirm={async (note) => done('Identité validée.')(await adminApi.decideKyc(id, 'approved', note))}
      />
      <ReasonDialog
        open={action === 'reject'}
        onClose={() => setAction(null)}
        title="Refuser l’identité"
        description="Le vendeur voit ce message et peut envoyer de nouveaux documents."
        label="Message au vendeur"
        danger
        confirmLabel="Refuser"
        onConfirm={async (note) => done('Identité refusée.')(await adminApi.decideKyc(id, 'rejected', note))}
      />
      <ReasonDialog
        open={action === 'suspend'}
        onClose={() => setAction(null)}
        title="Suspendre la boutique"
        description="Ses offres disparaissent du catalogue ; le vendeur voit la raison."
        danger
        confirmLabel="Suspendre"
        onConfirm={async (reason) => done('Boutique suspendue.')(await adminApi.suspend(id, reason))}
      />
      <ReasonDialog
        open={action === 'unsuspend'}
        onClose={() => setAction(null)}
        title="Réactiver la boutique"
        label="Note"
        optional
        confirmLabel="Réactiver"
        onConfirm={async (note) => done('Boutique réactivée.')(await adminApi.unsuspend(id, note))}
      />
      <ReasonDialog
        open={action === 'block'}
        onClose={() => setAction(null)}
        title="Bloquer le compte"
        description="La personne ne peut plus rien faire avec son compte, ni acheter ni vendre."
        danger
        confirmLabel="Bloquer"
        onConfirm={async (reason) => done('Compte bloqué.')(await adminApi.block(id, reason))}
      />
      <ReasonDialog
        open={action === 'unblock'}
        onClose={() => setAction(null)}
        title="Débloquer le compte"
        label="Note"
        optional
        confirmLabel="Débloquer"
        onConfirm={async (note) => done('Compte débloqué.')(await adminApi.unblock(id, note))}
      />
      <ReasonDialog
        open={Boolean(unpublishing)}
        onClose={() => setAction(null)}
        title="Retirer l’offre"
        description={unpublishing?.title}
        label="Message au vendeur"
        danger
        confirmLabel="Retirer"
        onConfirm={async (reason) => done('Offre retirée.')(await adminApi.unpublish(unpublishing!.id, reason))}
      />
    </div>
  );
};
