import React, { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { Paperclip, Send } from 'lucide-react';
import { Attachment } from '@/shared/db';
import { Avatar, Badge, Button, Card, EmptyState, SkeletonRows, Textarea } from '@/shared/ui';
import { formatDateTime, formatRelative, formatXaf } from '@/shared/lib';
import { isImageType } from '@/shared/domain';
import { AttachmentList, useAttachments } from '@/features/orders';
import salacopeMark from '@/shared/assets/salacope-mark.png';
import { DisputeDetail, DisputeMessage } from '../api';

const FILE = 'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs';

const Files: React.FC<{ files: Attachment[]; mine: boolean }> = ({ files, mine }) =>
  files.length === 0 ? null : (
    <ul className="mt-2 space-y-1.5">
      {files.map((f) => (
        <li key={f.id}>
          {f.dataUrl && isImageType(f.type) ? (
            <a href={f.dataUrl} target="_blank" rel="noreferrer">
              <img src={f.dataUrl} alt={f.name} className="max-h-48 rounded-lg border border-black/10" />
            </a>
          ) : f.dataUrl ? (
            <a href={f.dataUrl} target="_blank" rel="noreferrer" download={f.name} className={clsx(FILE, mine ? 'border-white/30' : 'border-gray-200 bg-surface')}>
              <Paperclip className="w-3.5 h-3.5" />
              <span className="truncate max-w-[14rem]">{f.name}</span>
              <span className="opacity-70">{f.size}</span>
            </a>
          ) : (
            <span className={clsx(FILE, mine ? 'border-white/30' : 'border-gray-200 bg-surface')}>
              <Paperclip className="w-3.5 h-3.5" />
              {f.name}
            </span>
          )}
        </li>
      ))}
    </ul>
  );

const ROLE = { buyer: 'acheteur', seller: 'vendeur', salacope: '', accused: 'mis en cause' } as const;

const CLOSED: Record<string, string> = { seller: 'Clos : vendeur payé', buyer: 'Clos : acheteur remboursé', warning: 'Clos : avertissement', cleared: 'Clos : sans suite' };

const Bubble: React.FC<{ m: DisputeMessage; mine: boolean }> = ({ m, mine }) => {
  const salacope = m.role === 'salacope';
  return (
    <li className={clsx('flex gap-2.5', mine && 'flex-row-reverse')}>
      {salacope ? (
        <span className="w-8 h-8 shrink-0 rounded-full bg-[#0b0d0c] flex items-center justify-center">
          <img src={salacopeMark} alt="" width={128} height={110} className="w-4 h-auto" />
        </span>
      ) : (
        <Avatar name={m.name} />
      )}
      <div className={clsx('min-w-0 max-w-[85%] sm:max-w-[70%]', mine && 'flex flex-col items-end')}>
        <p className="text-xs text-gray-500">
          <span className="font-medium text-gray-700">{m.name}</span>
          {ROLE[m.role] ? ` · ${ROLE[m.role]}` : ''} · <span title={formatDateTime(m.at)}>{formatRelative(m.at)}</span>
        </p>
        <div
          className={clsx(
            'mt-1 rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-line break-words',
            mine ? 'bg-accent text-on-accent' : salacope ? 'border border-gray-300 bg-surface text-gray-900' : 'bg-gray-100 text-gray-900'
          )}
        >
          {m.body}
          <Files files={m.attachments} mine={mine} />
        </div>
      </div>
    </li>
  );
};

/**
 * One dispute room, full height: the header (with `actions`), the messages, and the composer. The same room serves the
 * seller, the buyer and Salacope; `viewerId` is the person's account (null for the administration, which writes as Salacope).
 */
export const DisputeRoom: React.FC<{
  detail: DisputeDetail | undefined;
  error?: string;
  viewerId: string | null;
  onSend: (body: string, files: Attachment[]) => Promise<void>;
  actions?: React.ReactNode;
}> = ({ detail, error, viewerId, onSend, actions }) => {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string>();
  const attachments = useAttachments({ maxImages: 3 });
  const endRef = useRef<HTMLLIElement>(null);
  const count = detail?.messages.length ?? 0;
  // Braces matter: scrollIntoView() returns a Promise in recent Chrome, and an effect must not return anything but a cleanup.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [count, detail?.dispute.id]);

  if (error && !detail) return <EmptyState title="Litige introuvable" description={error} className="rounded-2xl border border-gray-200/70 bg-surface" />;
  if (!detail) {
    return (
      <Card className="h-full p-5">
        <SkeletonRows rows={4} />
      </Card>
    );
  }
  const { dispute, order, subject, messages } = detail;
  const open = dispute.status === 'open';

  const send = async () => {
    if (busy || (!text.trim() && attachments.files.length === 0)) return;
    setBusy(true);
    setFailure(undefined);
    try {
      await onSend(text, attachments.files);
      setText('');
      attachments.clear();
    } catch (e) {
      setFailure((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="h-full min-h-0 flex flex-col overflow-hidden">
      <div className="shrink-0 min-h-14 px-4 sm:px-5 py-2 flex items-center gap-3 border-b border-gray-100">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900 truncate">
            {dispute.label} · {order ? order.title : dispute.title}
          </p>
          <p className="text-xs text-gray-500 truncate">
            {order
              ? `${order.number} · ${formatXaf(order.total)} · ${order.sellerName} ↔ ${order.buyerName}`
              : `Mis en cause : ${subject?.name}${subject?.listing ? ` · ${subject.listing.title}` : ''}${subject?.warnings ? ` · ${subject.warnings} avertissement${subject.warnings > 1 ? 's' : ''}` : ''}`}
          </p>
        </div>
        <Badge tone={open ? 'danger' : 'neutral'} dot>
          {open ? 'Ouvert' : CLOSED[dispute.outcome ?? ''] ?? 'Clos'}
        </Badge>
        {actions}
      </div>

      <ul className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-5 py-4 space-y-4">
        {messages.map((m) => (
          <Bubble key={m.id} m={m} mine={viewerId === null ? m.role === 'salacope' : m.authorId === viewerId} />
        ))}
        <li ref={endRef} aria-hidden />
      </ul>

      {open ? (
        <div className="shrink-0 border-t border-gray-100 p-3 space-y-2">
          <AttachmentList files={attachments.files} onRemove={attachments.remove} />
          {failure && <p className="text-xs text-red-600">{failure}</p>}
          <div className="flex items-end gap-2">
            <button type="button" onClick={attachments.open} className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100" aria-label="Joindre un fichier">
              <Paperclip className="w-4 h-4" />
            </button>
            <input ref={attachments.inputRef} type="file" multiple className="hidden" onChange={attachments.onChange} />
            <Textarea
              rows={1}
              aria-label="Votre message"
              placeholder={viewerId === null ? 'Écrire au nom de Salacope (le vendeur et l’acheteur le reçoivent)…' : 'Votre message…'}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="min-h-9 max-h-32"
            />
            <Button variant="primary" icon={<Send className="w-3.5 h-3.5" />} loading={busy} disabled={!text.trim() && attachments.files.length === 0} onClick={send} aria-label="Envoyer">
              <span className="hidden sm:inline">Envoyer</span>
            </Button>
          </div>
        </div>
      ) : (
        <p className="shrink-0 border-t border-gray-100 px-5 py-3 text-sm text-gray-500">Ce litige est clos : la décision est prise.</p>
      )}
    </Card>
  );
};
