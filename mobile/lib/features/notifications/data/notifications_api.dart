import '../../../core/api/api_client.dart';
import '../../../core/db/store.dart';

final notificationsApi = NotificationsApi.instance;

class NotificationsApi {
  static final NotificationsApi instance = NotificationsApi._();
  NotificationsApi._();

  void _markLocally(List<String>? ids) {
    db.update((s) => s.copyWith(
          notifications: s.notifications.map((n) {
            if (!n.read && (ids == null || ids.contains(n.id))) {
              return n.copyWith(read: true);
            }
            return n;
          }).toList(),
        ));
  }

  void markNotificationRead(String notificationId) {
    _markLocally([notificationId]);
    api.request('POST', '/notifications/read', body: {
      'ids': [notificationId],
    }).catchError((_) => <String, dynamic>{});
  }

  void markAllNotificationsRead() {
    _markLocally(null);
    api.request('POST', '/notifications/read', body: {})
        .catchError((_) => <String, dynamic>{});
  }
}
