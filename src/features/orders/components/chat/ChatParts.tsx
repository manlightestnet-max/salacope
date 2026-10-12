import React, { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { Link } from 'react-router-dom';
import { ArrowUp, Paperclip } from 'lucide-react';
import { Attachment } from '@/shared/db';
import { Avatar, ImageViewer } from '@/shared/ui';
import { formatDateTime, formatRelative } from '@/shared/lib';
import { CONTACT_BLOCKED, MAX_MESSAGE_IMAGES, containsContact, isImageType } from '../../model';
import { useAttachments } from '../../useAttachments';
import { AttachmentList } from '../OrderDialogs';

/**
 * The pieces of the messaging screens, shared by the order chat (Messages) and the dispute rooms (Litiges): the same
 * bubbles, the same composer, the same feed and the same inbox rows, so a conversation looks and behaves the same everywhere.
 */

/** One message: bubble, photos (opened in the viewer), files, then who wrote it and when. */
export const ChatMessage: React.FC<{
  message: { body: string; attachments?: Attachment[]; at: string };
  /** Shown under the bubble, and next to the avatar of the other party. */
  name: string;
  avatar: React.ReactNode;
  mine: boolean;
  /** Delivery ticks after the date (own messages). */
  ticks?: React.ReactNode;
  /** A card shown before the text (payment request). */
  card?: React.ReactNode;
}> = ({ message, name, avatar, mine, ticks, card }) => {
  const [viewing, setViewing] = useState<number | null>(null);
  // Images open in the viewer; other files stay downloadable chips.
  const photos = (message.attachments ?? []).filter((a) => isImageType(a.type) && a.dataUrl);
  const files = (message.attachments ?? []).filter((a) => !photos.includes(a));
  return (
    <li className={clsx('flex items-end gap-2', mine && 'flex-row-reverse')}>
      {!mine && avatar}
      <div className={clsx('min-w-0 max-w-[80%] flex flex-col', mine ? 'items-end' : 'items-start')}>
        {card}
        {message.body && (
          <p className={clsx('px-3.5 py-2 text-sm whitespace-pre-line break-words rounded-2xl', mine ? 'bg-accent text-on-accent rounded-br-md' : 'bg-gray-100 text-gray-900 rounded-bl-md')}>
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
          {mine ? 'Vous' : name} · {formatRelative(message.at)}
          {mine && ticks}
        </span>
      </div>
    </li>
  );
};

/**
 * The scrolling list of a conversation. It stays on its last message when a new one arrives (`watch` changes) and when the
 * keyboard opens or closes (the screen is resized), without scrolling the page. `fill`: takes its parent's height.
 */
export const ChatFeed: React.FC<{ fill?: boolean; watch: number; children: React.ReactNode }> = ({ fill, watch, children }) => {
  const feedRef = useRef<HTMLUListElement>(null);
  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [watch]);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv || !fill) return;
    const stick = () => {
      if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
    };
    vv.addEventListener('resize', stick);
    return () => vv.removeEventListener('resize', stick);
  }, [fill]);
  return (
    <ul ref={feedRef} className={clsx('px-3 sm:px-5 py-4 space-y-4 overflow-y-auto overscroll-contain scrollbar-none', fill ? 'flex-1 min-h-0' : 'max-h-[560px]')}>
      {children}
    </ul>
  );
};

/**
 * The composer: attach, write (Enter sends), send. Contact details are refused as everywhere in Salacope. `onSend` returns
 * whether it worked (the text and files are then cleared); `tools` adds buttons next to the paperclip (the seller's payment request).
 */
export const ChatComposer: React.FC<{
  placeholder: string;
  onSend: (body: string, files: Attachment[]) => Promise<boolean>;
  tools?: React.ReactNode;
}> = ({ placeholder, onSend, tools }) => {
  const [body, setBody] = useState('');
  const attachments = useAttachments({ maxImages: MAX_MESSAGE_IMAGES });
  const blocked = containsContact(body);
  const canSend = !blocked && (Boolean(body.trim()) || attachments.files.length > 0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSend) return;
    if (await onSend(body, attachments.files)) {
      setBody('');
      attachments.clear();
    }
  };

  return (
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
          {tools}
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) void submit(e);
            }}
            rows={1}
            placeholder={placeholder}
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
  );
};

/** The top bar of a room: the other party (avatar, name, a line under it) and what can be done (menu, status). */
export const ChatHeaderBar: React.FC<{ avatar: React.ReactNode; title: React.ReactNode; subtitle?: React.ReactNode; trailing?: React.ReactNode }> = ({
  avatar,
  title,
  subtitle,
  trailing,
}) => (
  <div className="shrink-0 h-14 px-4 sm:px-5 flex items-center gap-3 border-b border-gray-100">
    <span className="shrink-0 flex">{avatar}</span>
    <div className="min-w-0 flex-1">
      <p className="text-sm font-medium text-gray-900 truncate">{title}</p>
      {subtitle && <p className="text-xs text-gray-500 truncate">{subtitle}</p>}
    </div>
    {trailing}
  </div>
);

/** One line of an inbox: avatar, name, time, a preview, and the little indicators; unread in bold with a counter. */
export const ConversationRow: React.FC<{
  href: string;
  selected: boolean;
  name: React.ReactNode;
  avatar: { name: string; src?: string };
  at: string;
  unread: number;
  preview: string;
  /** Small icons or tags after the preview. */
  extras?: React.ReactNode;
  /** A faint line under the row. */
  note?: string;
}> = ({ href, selected, name, avatar, at, unread, preview, extras, note }) => (
  <li>
    <Link to={href} className={clsx('flex items-center gap-3 px-4 py-3 transition-colors', selected ? 'bg-gray-100' : 'hover:bg-gray-50')} aria-current={selected || undefined}>
      <Avatar name={avatar.name} src={avatar.src} size="lg" />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className={clsx('flex-1 min-w-0 truncate text-sm text-gray-900', unread ? 'font-semibold' : 'font-medium')}>{name}</span>
          <span className={clsx('shrink-0 text-[11px]', unread ? 'text-primary-600 font-medium' : 'text-gray-400')}>{formatRelative(at)}</span>
        </span>
        <span className="flex items-center gap-2 mt-0.5">
          <span className={clsx('flex-1 min-w-0 truncate text-xs', unread ? 'text-gray-800' : 'text-gray-500')}>{preview}</span>
          {extras}
          {unread > 0 && (
            <span className="shrink-0 min-w-5 h-5 px-1.5 rounded-full bg-accent text-on-accent text-[11px] font-semibold flex items-center justify-center tabular-nums">{unread}</span>
          )}
        </span>
        {note && <span className="block mt-0.5 text-[11px] text-gray-400">{note}</span>}
      </span>
    </Link>
  </li>
);
