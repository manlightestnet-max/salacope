import { createId, nowIso } from '@/shared/lib';
import { Database, Notification } from '@/shared/db';

export interface NotifyInput {
  userId: string;
  title: string;
  body?: string;
  href: string;
}

/**
 * Adds notifications inside a database update, so they are written together with the
 * change they describe: `db.update((s) => withNotifications({ ...s, orders }, [...]))`.
 */
export const withNotifications = (state: Database, inputs: NotifyInput[]): Database => {
  if (inputs.length === 0) return state;
  const at = nowIso();
  const added: Notification[] = inputs.map((n) => ({ ...n, id: createId('ntf'), read: false, createdAt: at }));
  return { ...state, notifications: [...added, ...state.notifications] };
};
