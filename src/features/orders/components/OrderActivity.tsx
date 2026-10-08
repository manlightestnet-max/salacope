import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveSync } from '@/shared/api';
import clsx from 'clsx';
import {
  AlertTriangle,
  ArrowUp,
  Ban,
  Banknote,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  LucideIcon,
  MessagesSquare,
  PackageCheck,
  Paperclip,
  RotateCcw,
  Timer,
  XCircle,
} from 'lucide-react';
import { Order, OrderEvent, OrderEventType, OrderMessage, User } from '@/shared/db';
import { Avatar, Card, ImageViewer, TONES, Tone } from '@/shared/ui';
import { useServiceAction } from '@/shared/hooks';
import { formatDateTime, formatRelative, formatXaf } from '@/shared/lib';
import { displayName } from '@/features/session';
import { CONTACT_BLOCKED, EVENT_LABEL, MAX_MESSAGE_IMAGES, containsContact, isImageType, paymentMethodLabel, permissionsFor, perspectiveOf } from '../model';
import { markRead, sendMessage } from '../api';
import { messageStatus, unreadCount } from '../chat';
import { MessageTicks } from './chat/MessageTicks';
import { PaymentRequestCard } from './chat/PaymentRequestCard';
import { PaymentRequestDialog } from './chat/PaymentRequestDialog';
import { ValidationCard } from './chat/ValidationCard';
import { useAttachments } from '../useAttachments';
import { AttachmentList } from './OrderDialogs';

type Entry = { kind: 'event'; at: string; event: OrderEvent } | { kind: 'message'; at: string; message: OrderMessage };

/** How each step of an order looks: its own icon and colour. */
const EVENT_STYLE: Record<OrderEventType, { icon: LucideIcon; tone: Tone }> = {
  paid: { icon: Banknote, tone: 'brand' },
  accepted: { icon: ClipboardCheck, tone: 'info' },
  delivered: { icon: PackageCheck, tone: 'brand' },
  completed: { icon: CheckCircle2, tone: 'success' },
  auto_completed: { icon: CheckCircle2, tone: 'success' },
  cancelled: { icon: XCircle, tone: 'neutral' },
  disputed: { icon: AlertTriangle, tone: 'danger' },
  revision_requested: { icon: RotateCcw, tone: 'warning' },
  extension_requested: { icon: CalendarClock, tone: 'warning' },
  extension_accepted: { icon: CalendarClock, tone: 'success' },
  extension_declined: { icon: CalendarClock, tone: 'danger' },
};

/** A lifecycle step as an indicator between the messages: icon, name and how long ago; a tap opens the exact time and details. */
const EventRow: React.FC<{ order: Order; event: OrderEvent; actor?: User }> = ({ order, event, actor }) => {
  const [open, setOpen] = useState(false);
  const { icon: Icon, tone } = EVENT_STYLE[event.type];
  const note = event.type !== 'delivered' ? event.note : undefined;
  return (
    <li className="flex flex-col items-center px-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        title={formatDateTime(event.at)}
        className="inline-flex items-center gap-2 max-w-full h-8 pl-1.5 pr-2.5 rounded-full border border-gray-200 bg-surface text-xs transition hover:border-gray-300 active:scale-[0.98]"
      >
        <span className={clsx('w-5 h-5 shrink-0 rounded-full flex items-center justify-center', TONES[tone].badge)}>
          <Icon className="w-3 h-3" />
        </span>
        <span className="font-medium text-gray-800 truncate">{EVENT_LABEL[event.type]}</span>
        <time dateTime={event.at} className="shrink-0 text-gray-500 tabular-nums whitespace-nowrap">
          · {formatRelative(event.at)}
        </time>
        <ChevronDown className={clsx('w-3 h-3 shrink-0 text-gray-400 transition-transform duration-200', open && 'rotate-180')} />
      </button>
      {open && (
        <dl className="mt-2 w-full max-w-xs rounded-xl border border-gray-200/70 bg-gray-50 px-3.5 py-2.5 text-xs space-y-1.5 animate-fade-up motion-reduce:animate-none">
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Date</dt>
            <dd className="text-gray-900 tabular-nums text-right">{formatDateTime(event.at)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Par</dt>
            <dd className="text-gray-900 text-right">{event.actorId ? displayName(actor) : 'Salacope (automatique)'}</dd>
          </div>
          {event.type === 'paid' && (
            <>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Montant</dt>
                <dd className="text-gray-900 tabular-nums text-right">{formatXaf(order.amounts.total)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Moyen</dt>
                <dd className="text-gray-900 text-right">{paymentMethodLabel(order)}</dd>
              </div>
            </>
          )}
          {note && <p className="pt-1 text-gray-600">« {note} »</p>}
        </dl>
      )}
    </li>
  );
};

const MessageRow: React.FC<{ order: Order; message: OrderMessage; author?: User; mine: boolean; userId: string }> = ({ order, message, author, mine, userId }) => {
  const [viewing, setViewing] = useState<number | null>(null);
  // Images open in the viewer; other files stay downloadable chips.
  const photos = (message.attachments ?? []).filter((a) => isImageType(a.type) && a.dataUrl);
  const files = (message.attachments ?? []).filter((a) => !photos.includes(a));
  return (
    <li className={clsx('flex items-end gap-2', mine && 'flex-row-reverse')}>
      {!mine && <Avatar name={displayName(author)} src={author?.merchant?.logo} size="sm" />}
      <div className={clsx('min-w-0 max-w-[80%] flex flex-col', mine ? 'items-end' : 'items-start')}>
        {message.request && <PaymentRequestCard order={order} message={message} mine={mine} />}
        {message.body && (
          <p
            className={clsx(
              'px-3.5 py-2 text-sm whitespace-pre-line break-words rounded-2xl',
              mine ? 'bg-accent text-on-accent rounded-br-md' : 'bg-gray-100 text-gray-900 rounded-bl-md'
            )}
          >
            {message.body}
          </p>
        )}
        {photos.length > 0 && (
          <div className={clsx('mt-1.5 grid gap-1', photos.length > 1 ? 'grid-cols-2' : 'grid-cols-1', 'w-56 max-w-full')}>
            {photos.map((a, i) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setViewing(i)}
                className={clsx('block overflow-hidden rounded-xl bg-gray-100', photos.length === 3 && i === 0 && 'col-span-2')}
                aria-label={`Voir ${a.name}`}
              >
                <img src={a.dataUrl} alt="" className="w-full h-full max-h-56 object-cover" />
              </button>
            ))}
            <ImageViewer images={photos.map((a) => ({ src: a.dataUrl!, alt: a.name }))} index={viewing} onIndex={setViewing} />
          </div>
        )}
        {files.length > 0 && (
          <div className={clsx('mt-1.5 flex flex-wrap gap-1.5', mine && 'justify-end')}>
            {files.map((a) => (
              <a
                key={a.id}
                href={a.dataUrl}
                download={a.name}
                className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full border border-gray-200 text-xs text-gray-700 hover:border-gray-300"
              >
                <Paperclip className="w-3 h-3" />
                <span className="truncate max-w-[180px]">{a.name}</span>
              </a>
            ))}
          </div>
        )}
        <span className="mt-1 px-1 inline-flex items-center gap-1 text-[11px] text-gray-400" title={formatDateTime(message.at)}>
          {mine ? 'Vous' : displayName(author)} · {formatRelative(message.at)}
          {mine && <MessageTicks status={messageStatus(order, message, userId)} />}
        </span>
      </div>
    </li>
  );
};

/**
 * Single chronological feed: the conversation between buyer and seller, with lifecycle
 * steps in between. `bare` drops the card frame (when it already sits in a panel);
 * `fill` makes it take its parent's height, the feed scrolling inside.
 */
export const OrderActivity: React.FC<{ order: Order; userId: string; users: Map<string, User>; bare?: boolean; fill?: boolean }> = ({
  order,
  userId,
  users,
  bare,
  fill,
}) => {
  const [body, setBody] = useState('');
  const attachments = useAttachments({ maxImages: MAX_MESSAGE_IMAGES });
  const run = useServiceAction();
  const feedRef = useRef<HTMLUListElement>(null);
  // The conversation is live: new messages arrive within a few seconds.
  useLiveSync(true);
  const perspective = perspectiveOf(order, userId);
  // The buyer blocked the seller: the seller can no longer write here.
  const silenced = perspective === 'seller' && Boolean(order.chat?.blocked);
  const canMessage = permissionsFor(order, perspective).message && !silenced;
  const [requesting, setRequesting] = useState(false);
  const lastDelivery = [...order.events].reverse().find((e) => e.type === 'delivered')?.id;

  // On screen = read: the other party's ticks turn coloured (once per new message).
  const unread = unreadCount(order, userId);
  useEffect(() => {
    if (unread > 0 && document.visibilityState === 'visible') void markRead(order.id).catch(() => undefined);
  }, [order.id, unread]);
  const counterpart = users.get(perspective === 'buyer' ? order.sellerId : order.buyerId);

  const entries = useMemo<Entry[]>(
    () =>
      [
        ...order.events.map((event) => ({ kind: 'event' as const, at: event.at, event })),
        ...order.messages.map((message) => ({ kind: 'message' as const, at: message.at, message })),
      ].sort((a, b) => a.at.localeCompare(b.at)),
    [order.events, order.messages]
  );

  // Keep the latest entry visible inside the feed without scrolling the page.
  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [order.messages.length]);
  // The keyboard opening or closing resizes the screen: the feed stays on its last message.
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv || !fill) return;
    const stick = () => {
      if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
    };
    vv.addEventListener('resize', stick);
    return () => vv.removeEventListener('resize', stick);
  }, [fill]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await run(() => sendMessage(order.id, body, attachments.files))) {
      setBody('');
      attachments.clear();
    }
  };

  const blocked = containsContact(body);
  const canSend = !blocked && (Boolean(body.trim()) || attachments.files.length > 0);

  const content = (
    <>
      {!bare && <h2 className="px-5 pt-4 pb-2 text-sm font-semibold text-gray-900">Activité</h2>}
      <ul ref={feedRef} className={clsx('px-3 sm:px-5 py-4 space-y-4 overflow-y-auto overscroll-contain scrollbar-none', fill ? 'flex-1 min-h-0' : 'max-h-[560px]')}>
        {order.chat?.ephemeral && (
          <li className="flex items-center justify-center gap-1.5 text-[11px] text-gray-500">
            <Timer className="w-3.5 h-3.5" /> Messages éphémères : effacés à la clôture de la commande.
          </li>
        )}
        {order.chat?.blocked && (
          <li className="flex items-center justify-center gap-1.5 text-[11px] text-gray-500">
            <Ban className="w-3.5 h-3.5" />
            {perspective === 'buyer' ? 'Vous avez bloqué ce vendeur : il ne peut plus vous écrire.' : 'Ce client a bloqué les messages de votre boutique.'}
          </li>
        )}
        {order.messages.length === 0 && (
          <li className="flex flex-col items-center gap-2 py-4 text-center">
            <MessagesSquare className="w-5 h-5 text-gray-300" />
            <span className="text-xs text-gray-500">Aucun message. Posez vos questions à {displayName(counterpart)} ici.</span>
          </li>
        )}
        {entries.map((entry) =>
          entry.kind === 'event' ? (
            <React.Fragment key={entry.event.id}>
              <EventRow order={order} event={entry.event} actor={entry.event.actorId ? users.get(entry.event.actorId) : undefined} />
              {entry.event.type === 'delivered' && order.item.kind === 'service' && perspective && (
                <li className="flex justify-center">
                  <ValidationCard order={order} perspective={perspective} current={entry.event.id === lastDelivery} />
                </li>
              )}
            </React.Fragment>
          ) : (
            <MessageRow
              key={entry.message.id}
              order={order}
              userId={userId}
              message={entry.message}
              author={users.get(entry.message.authorId)}
              mine={entry.message.authorId === userId}
            />
          )
        )}
      </ul>

      {canMessage && (
        <form onSubmit={submit} className="shrink-0 p-2 sm:p-3 border-t border-gray-100">
          <div className="rounded-2xl border border-gray-200 bg-canvas focus-within:border-gray-400 transition-colors">
            {attachments.files.length > 0 && (
              <div className="px-3 pt-3">
                <AttachmentList files={attachments.files} onRemove={attachments.remove} />
              </div>
            )}
            <div className="flex items-end gap-1 p-1.5">
              <input ref={attachments.inputRef} type="file" multiple className="hidden" onChange={attachments.onChange} />
              <button
                type="button"
                onClick={attachments.open}
                aria-label="Joindre un fichier"
                className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-900"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              {perspective === 'seller' && (
                <button
                  type="button"
                  onClick={() => setRequesting(true)}
                  aria-label="Demande de paiement"
                  title="Demande de paiement"
                  className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                >
                  <Banknote className="w-4 h-4" />
                </button>
              )}
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) submit(e);
                }}
                rows={1}
                placeholder={`Écrire à ${displayName(counterpart)}…`}
                className="flex-1 min-w-0 resize-none bg-transparent py-2 text-base sm:text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none max-h-40 [field-sizing:content]"
              />
              <button
                type="submit"
                disabled={!canSend}
                aria-label="Envoyer"
                className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center bg-accent text-on-accent transition-opacity disabled:opacity-30"
              >
                <ArrowUp className="w-4 h-4" strokeWidth={2.5} />
              </button>
            </div>
          </div>
          <p className={clsx('mt-1.5 px-2 text-[11px]', blocked ? 'text-red-600' : 'text-gray-400 max-sm:hidden')}>
            {blocked ? CONTACT_BLOCKED : 'Entrée pour envoyer · Maj + Entrée pour aller à la ligne'}
          </p>
        </form>
      )}
      {perspective === 'seller' && (
        <PaymentRequestDialog orderId={order.id} sellerId={order.sellerId} open={requesting} onClose={() => setRequesting(false)} />
      )}
    </>
  );

  const frame = clsx(fill && 'flex flex-col min-h-0 h-full');
  return bare ? <div className={frame}>{content}</div> : <Card className={frame}>{content}</Card>;
};
