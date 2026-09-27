import { db } from '@/shared/db';

export function markNotificationRead(userId: string, notificationId: string): void {
  db.update((s) => ({
    ...s,
    notifications: s.notifications.map((n) => (n.id === notificationId && n.userId === userId ? { ...n, read: true } : n)),
  }));
}

export function markAllNotificationsRead(userId: string): void {
  db.update((s) => ({
    ...s,
    notifications: s.notifications.map((n) => (n.userId === userId && !n.read ? { ...n, read: true } : n)),
  }));
}
