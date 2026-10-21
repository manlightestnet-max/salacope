import React, { useEffect, useMemo, useState } from 'react';
import { useLiveSync } from '@/shared/api';
import clsx from 'clsx';
import {
  AlertTriangle,
  Ban,
  Banknote,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  LucideIcon,
  MessagesSquare,
  PackageCheck,
  RotateCcw,
  Timer,
  XCircle,
} from 'lucide-react';
import { Order, OrderEvent, OrderEventType, OrderMessage, User } from '@/shared/db';
import { Avatar, Card, TONES, Tone } from '@/shared/ui';
import { useServiceAction } from '@/shared/hooks';
import { formatDateTime, formatRelative, formatXaf } from '@/shared/lib';
import { displayName } from '@/features/session';
import { EVENT_LABEL, paymentMethodLabel, permissionsFor, perspectiveOf } from '../model';
import { markRead, sendMessage } from '../api';
import { messageStatus, unreadCount } from '../chat';
import { MessageTicks } from './chat/MessageTicks';
import { PaymentRequestCard } from './chat/PaymentRequestCard';
import { PaymentRequestDialog } from './chat/PaymentRequestDialog';
import { BriefCard } from './BriefCard';
import { DeliveryCard } from './DeliveryCard';
import { NextStepCard } from './NextStepCard';
import { ChatComposer, ChatFeed, ChatMessage } from './chat/ChatParts';

type Entry = { kind: 'event'; at: string; event: OrderEvent } | { kind: 'message'; at: string; message: OrderMessage };

/** How each step of an order looks: its own icon and colour. */
const EVENT_STYLE: Record<OrderEventType, { icon: LucideIcon; tone: Tone }> = {
  paid: { icon: Banknote, tone: 'brand' },
  accepted: { icon: ClipboardCheck, tone: 'info' },
  delivered: { icon: PackageCheck, tone: 'brand' },
  completed: { icon: CheckCircle2, tone: 'success' },
  auto_completed: { icon: CheckCircle2, tone: 'success' },
  cancelled: { icon: XCircle, tone: 'neutral' },
  funds_released: { icon: CheckCircle2, tone: 'success' },
  funds_refunded: { icon: XCircle, tone: 'neutral' },
  disputed: { icon: AlertTriangle, tone: 'danger' },
  revision_requested: { icon: RotateCcw, tone: 'warning' },
  extension_requested: { icon: CalendarClock, tone: 'warning' },
  extension_accepted: { icon: CalendarClock, tone: 'success' },
  extension_declined: { icon: CalendarClock, tone: 'danger' },
};

/** The steps that carry a few words from the person who took them. */
const SAID = new Set<OrderEventType>(['cancelled', 'disputed', 'revision_requested', 'extension_requested', 'extension_declined']);

/** A lifecycle step as an indicator between the messages: icon, name and how long ago; a tap opens the exact time and details. */
const EventRow: React.FC<{ order: Order; event: OrderEvent; actor?: User }> = ({ order, event, actor }) => {
  const [open, setOpen] = useState(false);
  const { icon: Icon, tone } = EVENT_STYLE[event.type];
  const note = event.type !== 'delivered' ? event.note : undefined;
  // What was said with the step (a refusal, a revision asked, a delay) is read in the conversation, not hidden behind a tap.
  const said = note && SAID.has(event.type) ? note : undefined;
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
      {said && <p className="mt-1.5 max-w-sm text-center text-xs text-gray-600 whitespace-pre-line break-words">« {said} »</p>}
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

const MessageRow: React.FC<{ order: Order; message: OrderMessage; author?: User; mine: boolean; userId: string }> = ({ order, message, author, mine, userId }) => (
  <ChatMessage
    message={message}
    name={displayName(author)}
    avatar={<Avatar name={displayName(author)} src={author?.merchant?.logo} size="sm" />}
    mine={mine}
    card={message.request ? <PaymentRequestCard order={order} message={message} mine={mine} /> : undefined}
    ticks={<MessageTicks status={messageStatus(order, message, userId)} />}
  />
);

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
  const run = useServiceAction();
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
    if (unread === 0) return;
    const read = () => document.visibilityState === 'visible' && void markRead(order.id).catch(() => undefined);
    read();
    // Arrived while the tab was in the background: read when the person comes back to it.
    document.addEventListener('visibilitychange', read);
    return () => document.removeEventListener('visibilitychange', read);
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

  const content = (
    <>
      {!bare && <h2 className="px-5 pt-4 pb-2 text-sm font-semibold text-gray-900">Activité</h2>}
      <ChatFeed fill={fill} watch={order.messages.length + order.events.length}>
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
            <span className="text-xs text-gray-500">
              {order.item.kind === 'service' && order.status === 'paid'
                ? perspective === 'seller'
                  ? 'La discussion s’ouvre quand vous acceptez la commande.'
                  : 'La discussion s’ouvrira dès que le vendeur aura accepté votre commande.'
                : `Aucun message. Posez vos questions à ${displayName(counterpart)} ici.`}
            </span>
          </li>
        )}
        {entries.map((entry) =>
          entry.kind === 'event' ? (
            <React.Fragment key={entry.event.id}>
              <EventRow order={order} event={entry.event} actor={entry.event.actorId ? users.get(entry.event.actorId) : undefined} />
              {entry.event.type === 'paid' && perspective && order.brief?.length ? (
                <li className="flex justify-center">
                  <div className="w-full max-w-lg">
                    <BriefCard order={order} perspective={perspective} />
                  </div>
                </li>
              ) : null}
              {entry.event.type === 'delivered' && order.item.kind === 'service' && perspective && entry.event.id === lastDelivery && order.delivery ? (
                <li className="flex justify-center">
                  <div className="w-full max-w-lg">
                    <DeliveryCard order={order} perspective={perspective} />
                  </div>
                </li>
              ) : null}
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
        {/* In the discussion (the full-height room) the action of the moment closes the feed. */}
        {fill && perspective && (
          <li className="flex justify-center">
            <div className="w-full max-w-lg">
              <NextStepCard order={order} perspective={perspective} userId={userId} stacked />
            </div>
          </li>
        )}
      </ChatFeed>

      {canMessage && (
        <ChatComposer
          placeholder={`Écrire à ${displayName(counterpart)}…`}
          onSend={(body, files) => run(() => sendMessage(order.id, body, files))}
          tools={
            perspective === 'seller' ? (
              <button
                type="button"
                onClick={() => setRequesting(true)}
                aria-label="Demande de paiement"
                title="Demande de paiement"
                className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-900"
              >
                <Banknote className="w-4 h-4" />
              </button>
            ) : undefined
          }
        />
      )}
      {perspective === 'seller' && (
        <PaymentRequestDialog orderId={order.id} sellerId={order.sellerId} open={requesting} onClose={() => setRequesting(false)} />
      )}
    </>
  );

  const frame = clsx(fill && 'flex flex-col min-h-0 h-full');
  return bare ? <div className={frame}>{content}</div> : <Card className={frame}>{content}</Card>;
};
