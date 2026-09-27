import { request } from '@/shared/api';
import { db } from '@/shared/db';

/** Shown as read at once; the server records it in the background. */
const markLocally = (ids: string[] | null) =>
  db.update((s) => ({
    ...s,
    notifications: s.notifications.map((n) => (!n.read && (!ids || ids.includes(n.id)) ? { ...n, read: true } : n)),
  }));

export function markNotificationRead(notificationId: string): void {
  markLocally([notificationId]);
  void request('POST', '/notifications/read', { ids: [notificationId] }).catch(() => undefined);
}

export function markAllNotificationsRead(): void {
  markLocally(null);
  void request('POST', '/notifications/read', {}).catch(() => undefined);
}
