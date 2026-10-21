import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

/// The bridge with Android (MainActivity.kt) for addresses of the site and the LightPay app.
///
/// An address (App Link from WhatsApp, a notification, the return from LightPay) opens its screen **on top** of the one
/// on screen: back returns there, it never closes the app. The return from a payment goes to the payment sheet when one
/// is open (it re-checks the payment itself), otherwise to the payment screen.
class Links {
  Links._();
  static final Links instance = Links._();

  static const MethodChannel _channel = MethodChannel('salacope/links');

  GoRouter? _router;

  /// Set while a payment sheet is open: it takes the return from LightPay instead of a new screen.
  bool Function(Uri link)? paymentReturn;

  Future<void> attach(GoRouter router) async {
    _router = router;
    _channel.setMethodCallHandler((call) async {
      if (call.method == 'link' && call.arguments is String) open(call.arguments as String);
    });
    try {
      final first = await _channel.invokeMethod<String>('initialLink');
      if (first != null) open(first);
    } catch (e) {
      debugPrint('[links] $e');
    }
  }

  /// `https://salacope.online/p/abc?x=1` → `/p/abc?x=1`, pushed on top of the current screen.
  void open(String link) {
    final uri = Uri.tryParse(link);
    final router = _router;
    if (uri == null || router == null) return;
    final path = uri.path.isEmpty ? '/' : uri.path;
    if (path.startsWith('/paiement/retour') && (paymentReturn?.call(uri) ?? false)) return;
    // A tab of the bottom bar (or a section of the Boutique): that tab is shown, nothing is stacked.
    final tab = tabOf(path);
    if (tab != null) {
      router.go(tab);
      return;
    }
    router.push(Uri(path: path, query: uri.hasQuery ? uri.query : null).toString());
  }

  /// The tab an address stands for (the app's own or the web's), or null for a screen opened on top.
  static String? tabOf(String path) {
    final p = path.length > 1 && path.endsWith('/') ? path.substring(0, path.length - 1) : path;
    switch (p) {
      case '/':
      case '/ac':
      case '/ac/explorer':
        return '/';
      case '/orders':
      case '/ac/achats':
      case '/compte/achats':
        return '/orders';
      case '/messages':
      case '/ac/messages':
      case '/compte/messages':
      case '/ac/litiges':
      case '/dashboard/litiges':
        return '/messages';
      case '/profile':
        return '/profile';
      case '/boutique':
      case '/dashboard':
        return '/boutique?vue=apercu';
    }
    const sections = {'ventes': 'ventes', 'offres': 'offres', 'clients': 'clients', 'paiements': 'paiements'};
    for (final prefix in const ['/dashboard/', '/compte/']) {
      if (p.startsWith(prefix)) {
        final rest = p.substring(prefix.length);
        if (sections.containsKey(rest)) return '/boutique?vue=${sections[rest]}';
      }
    }
    return null;
  }

  /// A LightPay payment page in the LightPay app, in its own task. → false when the app is not on the phone.
  Future<bool> openInLightPay(String url) async {
    try {
      return await _channel.invokeMethod<bool>('openInLightPay', {'url': url}) ?? false;
    } catch (_) {
      return false;
    }
  }

  /// The LightPay app on its home screen. → false when it is not on the phone.
  Future<bool> launchLightPay() async {
    try {
      return await _channel.invokeMethod<bool>('launchLightPay') ?? false;
    } catch (_) {
      return false;
    }
  }
}

final links = Links.instance;
