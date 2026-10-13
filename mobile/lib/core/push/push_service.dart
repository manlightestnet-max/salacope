import 'dart:async';
import 'dart:ui' show Color;
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../api/api_client.dart';

/// Android channel of Salacope's notifications (the server names it in every message).
const AndroidNotificationChannel salacopeChannel = AndroidNotificationChannel(
  'salacope_events',
  'Commandes et messages',
  description: 'Nouvelle vente, fichier prêt, message, litige, paiement versé…',
  importance: Importance.high,
);

/// Push notifications (Firebase Cloud Messaging): the Salacope server sends one for each event of the person (new sale,
/// file ready, message, dispute, decision…), even when the app is closed. Their texts are the administration's message
/// templates. A tap opens the app on the screen of the message (`data.route`, an address of the site that the router
/// knows). App open: the message is shown too (local notification). Without the Firebase configuration
/// (android/app/google-services.json) nothing happens and the app works as before.
class PushService {
  PushService._();
  static final PushService instance = PushService._();

  final FlutterLocalNotificationsPlugin _local = FlutterLocalNotificationsPlugin();
  bool available = false;
  StreamSubscription<String>? _refresh;
  String? _registered;

  /// The screen to open after a tap on a notification (set by main.dart).
  void Function(String route)? onOpen;

  static String _routeOf(Map<String, dynamic> data) {
    final r = data['route']?.toString() ?? '';
    return r.startsWith('/') ? r : '/';
  }

  /// At launch. → the screen to open if the app was started by a notification.
  Future<String?> init() async {
    String? initial;
    try {
      await _local.initialize(
        settings: const InitializationSettings(android: AndroidInitializationSettings('ic_stat_salacope')),
        onDidReceiveNotificationResponse: (r) {
          final route = r.payload;
          if (route != null && route.startsWith('/')) onOpen?.call(route);
        },
      );
      await _local.resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()?.createNotificationChannel(salacopeChannel);
      final launch = await _local.getNotificationAppLaunchDetails();
      if (launch?.didNotificationLaunchApp ?? false) initial = launch!.notificationResponse?.payload;
    } catch (e) {
      debugPrint('[push] local notifications: $e');
    }

    try {
      await Firebase.initializeApp();
      available = true;
    } catch (_) {
      available = false; // no google-services.json: no push
      return initial;
    }

    // App open: Android shows nothing by itself, the message is shown here.
    FirebaseMessaging.onMessage.listen((m) {
      final n = m.notification;
      if (n == null) return;
      _local.show(
        id: (m.messageId ?? '${DateTime.now().millisecondsSinceEpoch}').hashCode & 0x7fffffff,
        title: n.title,
        body: n.body,
        notificationDetails: NotificationDetails(
          android: AndroidNotificationDetails(
            salacopeChannel.id,
            salacopeChannel.name,
            channelDescription: salacopeChannel.description,
            importance: Importance.high,
            priority: Priority.high,
            icon: 'ic_stat_salacope',
            color: const Color(0xFF059669), // tint of the icon, the logo green (res/values/notification.xml)
            styleInformation: BigTextStyleInformation(n.body ?? ''),
          ),
        ),
        payload: _routeOf(m.data),
      );
    });
    // App in the background: a tap on the system notification brings the person here.
    FirebaseMessaging.onMessageOpenedApp.listen((m) => onOpen?.call(_routeOf(m.data)));
    // App closed: started by the notification.
    final first = await FirebaseMessaging.instance.getInitialMessage().catchError((_) => null);
    if (first != null) initial = _routeOf(first.data);
    return initial;
  }

  /// Registers this phone with Salacope (asks the permission the first time). → false when refused or unavailable.
  Future<bool> enable() async {
    if (!available) return false;
    final s = await FirebaseMessaging.instance.requestPermission();
    if (s.authorizationStatus == AuthorizationStatus.denied) return false;
    final token = await FirebaseMessaging.instance.getToken();
    if (token == null) return false;
    await _register(token);
    _refresh ??= FirebaseMessaging.instance.onTokenRefresh.listen((t) => _register(t).catchError((_) {}));
    return true;
  }

  Future<void> _register(String token) async {
    await api.request('POST', '/me/devices', body: {'token': token, 'platform': 'android', 'label': 'Salacope Android'});
    _registered = token;
  }

  /// Unregisters this phone (signing out, or notifications turned off in Paramètres).
  Future<void> disable() async {
    await _refresh?.cancel();
    _refresh = null;
    if (!available) return;
    final token = _registered ?? await FirebaseMessaging.instance.getToken().catchError((_) => null);
    _registered = null;
    if (token == null) return;
    await api.request('DELETE', '/me/devices', body: {'token': token}).catchError((_) => null);
  }

  // ------------------------------------------------------------ the person's choice (on by default, kept on the phone)

  static const _key = 'salacope.push';
  final ValueNotifier<bool> enabled = ValueNotifier(true);

  /// At launch and after each sign-in: this phone (re)registers (its token may have changed), unless the person turned
  /// notifications off. A visitor with nothing on Salacope has nothing to receive.
  Future<void> sync({required bool hasAccount}) async {
    var on = true;
    try {
      on = (await SharedPreferences.getInstance()).getBool(_key) ?? true;
    } catch (_) {}
    enabled.value = on;
    if (on && hasAccount) {
      final ok = await enable().catchError((_) => false);
      if (!ok && available) enabled.value = false;
    }
  }

  Future<void> setEnabled(bool on) async {
    enabled.value = on;
    try {
      await (await SharedPreferences.getInstance()).setBool(_key, on);
    } catch (_) {}
    if (on) {
      final ok = await enable().catchError((_) => false);
      if (!ok) enabled.value = false;
    } else {
      await disable();
    }
  }
}

final push = PushService.instance;
