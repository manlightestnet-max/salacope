import 'dart:async';
import 'package:flutter/widgets.dart';
import 'api_client.dart';
import 'auth.dart';
import 'guest.dart';
import 'domain_error.dart';
import '../config/explore.dart';
import '../config/platform.dart';
import '../db/store.dart';
import '../db/models/database.dart';
import '../db/models/interaction.dart';
import '../db/models/listing.dart';
import '../db/models/user.dart';
import '../db/local_database.dart';
import '../push/push_service.dart';

enum BootStatus {
  loading,
  ready,
  offline,
}

final syncService = SyncService.instance;
final sync = SyncService.instance;

/// Keeps the app's data current, like `src/shared/api/sync.ts`:
/// - at launch the last known data shows at once (SQLite), then the server is asked in the background;
/// - the catalogue (offers, stores, sales, reviews) is checked with its fingerprint: when nothing changed the answer is a
///   few bytes and nothing is redrawn;
/// - what is personal (orders, messages, notifications) comes with a light sync every 30 s, every 4 s in a conversation,
///   and when the app comes back to the screen.
class SyncService extends ChangeNotifier with WidgetsBindingObserver {
  static final SyncService instance = SyncService._();

  SyncService._() {
    WidgetsBinding.instance.addObserver(this);
  }

  BootStatus _status = BootStatus.loading;
  String? _lastSync;
  Timer? _timer;
  bool _fastMode = false;
  bool _isSyncing = false;
  bool _isProcessingQueue = false;
  Future<void>? _booting;

  // The catalogue as the server last described it (a fingerprint), and when this device last asked.
  String? _catalogVersion;
  DateTime _catalogAt = DateTime.fromMillisecondsSinceEpoch(0);
  Future<void>? _catalogRequest;

  /// Private stores opened by their own link (store id, `@handle` or one of its offers): asked for by name.
  final List<String> _openedStores = [];

  BootStatus get status => _status;
  String? get lastSync => _lastSync;
  bool get isSyncing => _isSyncing;

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      syncNow().ignore();
      refreshCatalog().ignore();
      processQueue().ignore();
    }
  }

  void _setStatus(BootStatus next) {
    if (_status != next) {
      _status = next;
      notifyListeners();
    }
  }

  String _withStores() => _openedStores.isEmpty ? '' : 'with=${Uri.encodeComponent(_openedStores.join(','))}';

  /// Called once at launch (and again after a sign-in or a sign-out): every screen finds its data without asking.
  Future<void> boot() => _booting ??= _boot().whenComplete(() => _booting = null);

  Future<void> _boot() async {
    try {
      await localDb.init();
      await auth.init();
      await guest.init();

      final cached = localDb.loadDatabase();
      if (cached != null) {
        db.load(cached, persist: false);
        _lastSync = localDb.getMeta('lastSync');
        _catalogVersion = localDb.getMeta('catalogVersion');
        _setStatus(BootStatus.ready);
      }

      _restartPeriodicSync();

      if (cached != null && _lastSync != null && localDb.getMeta('identity') == _identity()) {
        // Known data on screen at once; the server answer replaces it in the background.
        _refreshAll().ignore();
        push.sync(hasAccount: cached.sessionUserId != null).ignore();
      } else {
        await _fetchBootstrap();
      }
    } on DomainError catch (err) {
      if (err.status == 401 && auth.signedIn()) {
        await auth.signOut();
        localDb.clearSession();
        _booting = null;
        return _boot();
      }
      if (_status == BootStatus.loading) _setStatus(BootStatus.offline);
    } catch (_) {
      if (_status == BootStatus.loading) _setStatus(BootStatus.offline);
    }
  }

  /// Who the saved data belongs to: the data of another account (or of a guest) is never shown.
  String _identity() => auth.uid() ?? (guest.key() != null ? 'guest:${guest.key()!.substring(0, 8)}' : 'visitor');

  /// Reloads everything for the identity now in place (after signing in, out, or a first purchase as a guest).
  Future<void> reload() async {
    _lastSync = null;
    _catalogVersion = null;
    await _booting;
    _booting = _fetchBootstrap().whenComplete(() => _booting = null);
    return _booting;
  }

  Future<void> _refreshAll() async {
    await Future.wait([syncNow(), refreshCatalog(force: true)]);
    await processQueue();
  }

  Future<void> _fetchBootstrap() async {
    _isSyncing = true;
    notifyListeners();
    try {
      final visitor = !auth.signedIn() && guest.key() == null;
      final query = [if (visitor) 'anon=1', _withStores()].where((q) => q.isNotEmpty).join('&');
      var res = await api.request('GET', '/bootstrap${query.isEmpty ? '' : '?$query'}') as Map<String, dynamic>;
      if (res['needsAccount'] == true) {
        // Signed in to LightPay/Firebase but never used Salacope: the account is created now.
        await api.request('POST', '/session', body: {});
        await guest.clear();
        res = await api.request('GET', '/bootstrap${_withStores().isEmpty ? '' : '?${_withStores()}'}') as Map<String, dynamic>;
      }
      final userId = res['userId'] as String?;
      if (userId == null && !auth.signedIn() && guest.key() != null) await guest.clear();

      applyPlatform(res['platform']);
      applyExplore(res['explore']);
      final data = Database.fromJson(res['data'] as Map<String, dynamic>? ?? {}, sessionUserId: userId);
      db.load(data, persist: true);
      _lastSync = res['serverTime'] as String?;
      _catalogVersion = res['catalogVersion'] as String?;
      _catalogAt = DateTime.now();
      localDb.setMeta('lastSync', _lastSync);
      localDb.setMeta('catalogVersion', _catalogVersion);
      localDb.setMeta('identity', _identity());
      _setStatus(BootStatus.ready);
      // This phone receives the person's notifications (an account, or a guest who bought here).
      push.sync(hasAccount: userId != null).ignore();
      processQueue().ignore();
    } finally {
      _isSyncing = false;
      notifyListeners();
    }
  }

  /// Brings the catalogue up to date with the database (at most every 12 s unless [force]). What is on screen stays
  /// until the fresh data replaces it: never an empty screen while it loads.
  Future<void> refreshCatalog({bool force = false}) {
    if (_status != BootStatus.ready) return Future.value();
    if (!force && DateTime.now().difference(_catalogAt) < const Duration(seconds: 12)) return Future.value();
    return _catalogRequest ??= _fetchCatalog().whenComplete(() => _catalogRequest = null);
  }

  Future<void> _fetchCatalog() async {
    try {
      final visitor = !auth.signedIn() && guest.key() == null;
      final query = [
        if (_catalogVersion != null) 'v=${Uri.encodeComponent(_catalogVersion!)}',
        if (visitor) 'anon=1',
        _withStores(),
      ].where((q) => q.isNotEmpty).join('&');
      final res = await api.request('GET', '/catalog${query.isEmpty ? '' : '?$query'}') as Map<String, dynamic>;
      _catalogAt = DateTime.now();
      applyPlatform(res['platform']);
      applyExplore(res['explore']);
      final data = res['data'] as Map<String, dynamic>?;
      if (res['unchanged'] == true || data == null) return;
      _catalogVersion = res['version'] as String?;
      localDb.setMeta('catalogVersion', _catalogVersion);
      final users = (data['users'] as List? ?? []).map((u) => User.fromJson(u as Map<String, dynamic>)).toList();
      final listings = (data['listings'] as List? ?? []).map((l) => Listing.fromJson(l as Map<String, dynamic>)).toList();
      final reviews = (data['reviews'] as List? ?? []).map((r) => Review.fromJson(r as Map<String, dynamic>)).toList();
      final next = db.state.copyWith(users: users, listings: listings, reviews: reviews, stats: Stats.fromJson(data['stats'] as Map<String, dynamic>?));
      db.load(next, persist: true);
    } catch (_) {
      // next time: what is on screen stays
    }
  }

  /// A page opened from a shared link whose store is not in the catalogue may be a private store: the catalogue is asked
  /// again with it. → whether something was asked.
  Future<bool> openStoreLink(String ref) async {
    if (_openedStores.contains(ref)) return false;
    _openedStores.add(ref);
    if (_openedStores.length > 8) _openedStores.removeAt(0);
    await _booting;
    await _catalogRequest;
    await refreshCatalog(force: true);
    return true;
  }

  /// Fetches what changed since the last sync (orders, messages, notifications…) and keeps it on the device.
  Future<void> syncNow() async {
    if (_lastSync == null || _isSyncing || db.state.sessionUserId == null) return;
    _isSyncing = true;
    try {
      final res = await api.request('GET', '/sync?since=${Uri.encodeComponent(_lastSync!)}') as Map<String, dynamic>;
      final patch = res['patch'] as Map<String, dynamic>?;
      if (patch != null) db.apply(patch: patch, persist: true);
      final serverTime = res['serverTime'] as String?;
      if (serverTime != null) {
        _lastSync = serverTime;
        localDb.setMeta('lastSync', _lastSync);
      }
      if (_status != BootStatus.ready) _setStatus(BootStatus.ready);
      notifyListeners();
    } on DomainError catch (e) {
      if (e.status == 401 && auth.signedIn()) {
        await auth.signOut();
        localDb.clearSession();
        _isSyncing = false;
        await reload();
      }
    } catch (_) {
      // next tick
    } finally {
      _isSyncing = false;
    }
  }

  /// Actions recorded while offline (never a payment), sent again once the network is back.
  Future<void> processQueue() async {
    if (_isProcessingQueue) return;
    _isProcessingQueue = true;
    try {
      for (final item in localDb.getPendingMutations()) {
        try {
          final res = await api.request(item.method, item.endpoint, body: item.payload);
          if (res is Map<String, dynamic>) {
            final patch = res['patch'] as Map<String, dynamic>?;
            final rawRemoved = res['removed'] as Map<String, dynamic>?;
            final removed = rawRemoved?.map((k, v) => MapEntry(k, (v as List).cast<String>()));
            if (patch != null || removed != null) db.apply(patch: patch, removed: removed, persist: true);
          }
          localDb.markMutationCompleted(item.id);
        } on DomainError catch (e) {
          if (e.status != null && e.status! >= 400 && e.status! < 500) {
            localDb.markMutationFailed(item.id, fatal: true);
          } else {
            localDb.markMutationFailed(item.id, fatal: false);
            break;
          }
        } catch (_) {
          localDb.markMutationFailed(item.id, fatal: false);
          break;
        }
      }
    } finally {
      _isProcessingQueue = false;
    }
  }

  void setFastSync(bool fast) {
    if (_fastMode == fast) return;
    _fastMode = fast;
    _restartPeriodicSync();
  }

  void _restartPeriodicSync() {
    _timer?.cancel();
    final interval = _fastMode ? const Duration(seconds: 4) : const Duration(seconds: 30);
    _timer = Timer.periodic(interval, (_) {
      syncNow().ignore();
      processQueue().ignore();
    });
  }

  void disposeSync() {
    _timer?.cancel();
    WidgetsBinding.instance.removeObserver(this);
  }

  @override
  void dispose() {
    disposeSync();
    super.dispose();
  }
}
