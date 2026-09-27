import React, { useEffect, useState } from 'react';
import clsx from 'clsx';
import { CheckCircle2, Paperclip, X } from 'lucide-react';
import { Button, Dialog, Field, Select, Textarea } from '@/shared/ui';
import { PLATFORM } from '@/shared/config/platform';
import { useAttachments } from '../useAttachments';
import { ReportResult } from '../api';

export const AttachmentList: React.FC<{ files: { id: string; name: string; size: string }[]; onRemove?: (id: string) => void }> = ({
  files,
  onRemove,
}) =>
  files.length === 0 ? null : (
    <ul className="space-y-1.5">
      {files.map((f) => (
        <li key={f.id} className="flex items-center gap-2 text-sm bg-gray-50 border border-gray-200 rounded-md px-2.5 py-1.5">
          <Paperclip className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <span className="flex-1 truncate">{f.name}</span>
          <span className="text-xs text-gray-500">{f.size}</span>
          {onRemove && (
            <button type="button" onClick={() => onRemove(f.id)} className="text-gray-400 hover:text-gray-700" aria-label="Retirer">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </li>
      ))}
    </ul>
  );

/** Seller delivers a service: message + files. */
export const DeliverDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  onSubmit: (note: string, files: ReturnType<typeof useAttachments>['files']) => Promise<boolean>;
}> = ({ open, onClose, onSubmit }) => {
  const [note, setNote] = useState('');
  const attachments = useAttachments();

  useEffect(() => {
    if (!open) {
      setNote('');
      attachments.clear();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Livrer la commande"
      description={`Le client est notifié et dispose de ${PLATFORM.escrowDays} jours pour valider, demander une retouche ou signaler un problème.`}
      footer={
        <>
          <Button onClick={onClose}>Annuler</Button>
          <Button variant="primary" onClick={async () => (await onSubmit(note, attachments.files)) && onClose()}>
            Envoyer la livraison
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Message au client">
          {(id) => (
            <Textarea
              id={id}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ce qui est livré, comment l'utiliser…"
            />
          )}
        </Field>
        <div className="space-y-2">
          <AttachmentList files={attachments.files} onRemove={attachments.remove} />
          <input ref={attachments.inputRef} type="file" multiple className="hidden" onChange={attachments.onChange} />
          <Button size="sm" icon={<Paperclip className="w-3.5 h-3.5" />} onClick={attachments.open}>
            Joindre des fichiers
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

/** Asks for a reason before an irreversible action (cancel, dispute). */
export const ReasonDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  label: string;
  confirmLabel: string;
  onSubmit: (reason: string) => Promise<boolean>;
}> = ({ open, onClose, title, description, label, confirmLabel, onSubmit }) => {
  const [reason, setReason] = useState('');
  useEffect(() => {
    if (!open) setReason('');
  }, [open]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button onClick={onClose}>Retour</Button>
          <Button variant="danger" onClick={async () => (await onSubmit(reason)) && onClose()}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <Field label={label}>{(id) => <Textarea id={id} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />}</Field>
    </Dialog>
  );
};

/** Buyer sends the work back with what to change. */
export const RevisionDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  left: number;
  onSubmit: (note: string) => Promise<boolean>;
}> = ({ open, onClose, left, onSubmit }) => {
  const [note, setNote] = useState('');
  useEffect(() => {
    if (!open) setNote('');
  }, [open]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Demander une retouche"
      description={`Il vous reste ${left} retouche${left > 1 ? 's' : ''}. Le vendeur a ${PLATFORM.revisionDays} jours pour vous renvoyer le travail.`}
      size="sm"
      footer={
        <>
          <Button onClick={onClose}>Retour</Button>
          <Button variant="primary" onClick={async () => (await onSubmit(note)) && onClose()}>
            Envoyer la demande
          </Button>
        </>
      }
    >
      <Field label="Ce qui doit être modifié">
        {(id) => <Textarea id={id} rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Soyez précis : couleurs, textes, formats…" />}
      </Field>
    </Dialog>
  );
};

const DAY_OPTIONS = Array.from({ length: PLATFORM.maxExtensionDays }, (_, i) => ({
  value: String(i + 1),
  label: `${i + 1} jour${i ? 's' : ''}`,
}));

/** Seller asks the buyer for more time. */
export const ExtensionDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  onSubmit: (days: number, reason: string) => Promise<boolean>;
}> = ({ open, onClose, onSubmit }) => {
  const [days, setDays] = useState('2');
  const [reason, setReason] = useState('');
  useEffect(() => {
    if (!open) {
      setDays('2');
      setReason('');
    }
  }, [open]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Demander un délai"
      description="Le client accepte ou refuse. Tant qu’il n’a pas répondu, la date actuelle reste valable."
      size="sm"
      footer={
        <>
          <Button onClick={onClose}>Retour</Button>
          <Button variant="primary" onClick={async () => (await onSubmit(Number(days), reason)) && onClose()}>
            Envoyer la demande
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Temps supplémentaire">
          {(id) => <Select id={id} value={days} options={DAY_OPTIONS} onChange={setDays} className="w-full" />}
        </Field>
        <Field label="Raison (visible par le client)">
          {(id) => <Textarea id={id} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />}
        </Field>
      </div>
    </Dialog>
  );
};

const REPORT_REASONS = {
  digital: ['Le fichier ne s’ouvre pas', 'Contenu différent de l’annonce', 'Fichier incomplet', 'Autre'],
  service: ['Livraison non conforme', 'Travail incomplet', 'Pas de nouvelles du vendeur', 'Autre'],
};

/**
 * One-step report: pick what's wrong (optional detail), it's recorded right away, then a
 * confirmation says Salacope handles it and will get back to the buyer.
 */
export const ReportDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  kind: 'digital' | 'service';
  onSubmit: (reason: string, detail: string) => Promise<ReportResult | null>;
}> = ({ open, onClose, kind, onSubmit }) => {
  const [reason, setReason] = useState('');
  const [detail, setDetail] = useState('');
  const [result, setResult] = useState<ReportResult | null>(null);

  useEffect(() => {
    if (!open) {
      setReason('');
      setDetail('');
      setResult(null);
    }
  }, [open]);

  if (result) {
    return (
      <Dialog open={open} onClose={onClose} size="sm">
        <div className="flex flex-col items-center text-center gap-3 pt-2 pb-1">
          <span className="w-12 h-12 rounded-full bg-primary-50 text-primary-700 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </span>
          <h2 className="text-base font-semibold text-gray-900">Signalement enregistré</h2>
          <p className="text-sm text-gray-600">
            On s’en occupe. Notre équipe examine la commande et vous contacte sous 24 h par e-mail
            {result.kind === 'dispute' ? ' ; en attendant, le vendeur n’est pas payé.' : '.'}
          </p>
          <p className="text-xs text-gray-500">
            Référence <span className="font-mono text-gray-700">{result.reference}</span>
          </p>
          <Button variant="primary" block onClick={onClose} className="mt-1">
            Compris
          </Button>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Signaler un problème"
      size="sm"
      footer={
        <>
          <Button onClick={onClose}>Retour</Button>
          <Button
            variant="primary"
            disabled={!reason}
            onClick={async () => {
              const r = await onSubmit(reason, detail);
              if (r) setResult(r);
            }}
          >
            Signaler
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Ce qui ne va pas">
          {REPORT_REASONS[kind].map((r) => (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={reason === r}
              onClick={() => setReason(r)}
              className={clsx(
                'h-8 rounded-full border px-3 text-[13px] font-medium transition-colors',
                reason === r ? 'bg-accent border-accent text-on-accent' : 'border-gray-200 text-gray-600 hover:text-gray-900'
              )}
            >
              {r}
            </button>
          ))}
        </div>
        <Textarea rows={3} aria-label="Précisions (facultatif)" placeholder="Précisions (facultatif)" value={detail} onChange={(e) => setDetail(e.target.value)} />
      </div>
    </Dialog>
  );
};
