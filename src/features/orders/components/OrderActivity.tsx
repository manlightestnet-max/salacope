import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveSync } from '@/shared/api';
import clsx from 'clsx';
import { ArrowUp, MessagesSquare, Paperclip } from 'lucide-react';
import { Order, OrderEvent, OrderMessage, User } from '@/shared/db';
import { Avatar, Card } from '@/shared/ui';
import { useServiceAction } from '@/shared/hooks';
import { formatDateTime, formatRelative } from '@/shared/lib';
import { displayName } from '@/features/session';
import { CONTACT_BLOCKED, EVENT_LABEL, containsContact, permissionsFor, perspectiveOf } from '../model';
import { sendMessage } from '../api';
import { useAttachments } from '../useAttachments';
import { AttachmentList } from './OrderDialogs';

type Entry = { kind: 'event'; at: string; event: OrderEvent } | { kind: 'message'; at: string; message: OrderMessage };

/** A lifecycle step, quiet and centred between the messages. */
const EventRow: React.FC<{ event: OrderEvent; actor?: User }> = ({ event, actor }) => (
  <li className="flex flex-col items-center text-center px-6">
    <span className="text-[11px] text-gray-500" title={formatDateTime(event.at)}>
      <span className="text-gray-700 font-medium">{EVENT_LABEL[event.type]}</span>
      {actor && ` · ${displayName(actor)}`} · {formatRelative(event.at)}
    </span>
    {event.note && event.type !== 'delivered' && <span className="mt-0.5 text-xs text-gray-500 max-w-md">« {event.note} »</span>}
  </li>
);

const MessageRow: React.FC<{ message: OrderMessage; author?: User; mine: boolean }> = ({ message, author, mine }) => (
  <li className={clsx('flex items-end gap-2', mine && 'flex-row-reverse')}>
    {!mine && <Avatar name={displayName(author)} size="sm" />}
    <div className={clsx('min-w-0 max-w-[80%] flex flex-col', mine ? 'items-end' : 'items-start')}>
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
      {message.attachments && message.attachments.length > 0 && (
        <div className={clsx('mt-1.5 flex flex-wrap gap-1.5', mine && 'justify-end')}>
          {message.attachments.map((a) => (
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
      <span className="mt-1 px-1 text-[11px] text-gray-400" title={formatDateTime(message.at)}>
        {mine ? 'Vous' : displayName(author)} · {formatRelative(message.at)}
      </span>
    </div>
  </li>
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
  const [body, setBody] = useState('');
  const attachments = useAttachments();
  const run = useServiceAction();
  const feedRef = useRef<HTMLUListElement>(null);
  // The conversation is live: new messages arrive within a few seconds.
  useLiveSync(true);
  const perspective = perspectiveOf(order, userId);
  const canMessage = permissionsFor(order, perspective).message;
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
      <ul ref={feedRef} className={clsx('px-4 sm:px-5 py-4 space-y-4 overflow-y-auto scrollbar-none', fill ? 'flex-1 min-h-0' : 'max-h-[560px]')}>
        {order.messages.length === 0 && (
          <li className="flex flex-col items-center gap-2 py-4 text-center">
            <MessagesSquare className="w-5 h-5 text-gray-300" />
            <span className="text-xs text-gray-500">Aucun message. Posez vos questions à {displayName(counterpart)} ici.</span>
          </li>
        )}
        {entries.map((entry) =>
          entry.kind === 'event' ? (
            <EventRow key={entry.event.id} event={entry.event} actor={entry.event.actorId ? users.get(entry.event.actorId) : undefined} />
          ) : (
            <MessageRow
              key={entry.message.id}
              message={entry.message}
              author={users.get(entry.message.authorId)}
              mine={entry.message.authorId === userId}
            />
          )
        )}
      </ul>

      {canMessage && (
        <form onSubmit={submit} className="shrink-0 p-3 border-t border-gray-100">
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
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) submit(e);
                }}
                rows={1}
                placeholder={`Écrire à ${displayName(counterpart)}…`}
                className="flex-1 min-w-0 resize-none bg-transparent py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none max-h-40 [field-sizing:content]"
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
          <p className={clsx('mt-1.5 px-2 text-[11px]', blocked ? 'text-red-600' : 'text-gray-400')}>
            {blocked ? CONTACT_BLOCKED : 'Entrée pour envoyer · Maj + Entrée pour aller à la ligne'}
          </p>
        </form>
      )}
    </>
  );

  const frame = clsx(fill && 'flex flex-col min-h-0 h-full');
  return bare ? <div className={frame}>{content}</div> : <Card className={frame}>{content}</Card>;
};
