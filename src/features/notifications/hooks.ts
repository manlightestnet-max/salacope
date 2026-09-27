import { useDb } from '@/shared/db';

/** Latest notifications of a user and how many are unread. */
export const useNotifications = (userId: string, limit = 30) =>
  useDb(
    (s) => {
      const mine = s.notifications.filter((n) => n.userId === userId);
      return { items: mine.slice(0, limit), unread: mine.filter((n) => !n.read).length };
    },
    [userId, limit]
  );
