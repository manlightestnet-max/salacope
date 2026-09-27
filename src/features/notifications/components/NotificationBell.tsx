import React, { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useKeyPress } from '@/shared/hooks';
import { formatRelative } from '@/shared/lib';
import { markAllNotificationsRead, markNotificationRead } from '../api';
import { useNotifications } from '../hooks';

/** Bell with the unread count; the panel lists recent events and opens the related page. */
export const NotificationBell: React.FC<{ userId: string; className?: string }> = ({ userId, className }) => {
  const { items, unread } = useNotifications(userId);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  useKeyPress('Escape', () => setOpen(false), open);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [open]);

  return (
    <div ref={rootRef} className={clsx('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={unread ? `Notifications, ${unread} non lues` : 'Notifications'}
        className="relative w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-accent text-on-accent text-[10px] font-semibold flex items-center justify-center tabular-nums">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-[min(22rem,calc(100vw-1.5rem))] rounded-2xl border border-gray-200 bg-surface shadow-lg overflow-hidden animate-fade-up">
          <div className="flex items-center justify-between px-4 h-11 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-900">Notifications</span>
            {unread > 0 && (
              <button type="button" onClick={() => markAllNotificationsRead()} className="text-xs text-gray-500 hover:text-gray-900">
                Tout marquer comme lu
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-gray-500">Rien de nouveau pour le moment.</p>
          ) : (
            <ul className="max-h-[60vh] overflow-y-auto divide-y divide-gray-100">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => {
                      markNotificationRead(n.id);
                      setOpen(false);
                      navigate(n.href);
                    }}
                    className="w-full text-left px-4 py-3 flex gap-3 hover:bg-gray-50"
                  >
                    <span className={clsx('mt-1.5 w-1.5 h-1.5 shrink-0 rounded-full', n.read ? 'bg-transparent' : 'bg-accent')} />
                    <span className="min-w-0 flex-1">
                      <span className={clsx('block text-sm', n.read ? 'text-gray-600' : 'text-gray-900 font-medium')}>{n.title}</span>
                      {n.body && <span className="block text-xs text-gray-500 truncate mt-0.5">{n.body}</span>}
                      <span className="block text-[11px] text-gray-400 mt-1">{formatRelative(n.createdAt)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
