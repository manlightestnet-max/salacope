import 'package:flutter/foundation.dart';
import 'models/database.dart';
import 'models/user.dart';
import 'models/listing.dart';
import 'models/order.dart';
import 'models/payment_attempt.dart';
import 'models/ticket.dart';
import 'models/notification.dart';
import 'models/interaction.dart';
import 'local_database.dart';

/// In-memory reactive store matching `src/shared/db/store.ts`.
/// Filled by bootstrap, kept current by mutations and sync.
class DbStore extends ChangeNotifier {
  static final DbStore instance = DbStore._();
  DbStore._();

  Database _state = Database.empty();

  Database get state => _state;
  Database get current => _state;

  User? get user =>
      _state.users.where((u) => u.id == _state.sessionUserId).firstOrNull;
  List<Listing> get listings => _state.listings;
  List<Order> get orders => _state.orders;
  List<User> get users => _state.users;
  List<Ticket> get tickets => _state.tickets;
  List<PaymentAttempt> get paymentAttempts => _state.paymentAttempts;

  /// Replaces everything (bootstrap, sign-in, sign-out).
  void load(Database next, {bool persist = true}) {
    _state = next;
    if (persist) {
      localDb.saveFullDatabase(next);
    }
    notifyListeners();
  }

  /// Local-only optimistic update.
  void update(Database Function(Database current) recipe) {
    _state = recipe(_state);
    notifyListeners();
  }

  /// Merges rows sent by the server.
  void apply({
    Map<String, dynamic>? patch,
    Map<String, List<String>>? removed,
    bool persist = true,
  }) {
    if (patch == null && removed == null) return;

    var nextUsers = _mergeCollection<User>(
      current: _state.users,
      incoming: (patch?['users'] as List<dynamic>?)
          ?.map((u) => u is User ? u : User.fromJson(u as Map<String, dynamic>))
          .toList(),
      removedKeys: removed?['users'],
      keyOf: (u) => u.id,
    );

    var nextListings = _mergeCollection<Listing>(
      current: _state.listings,
      incoming: (patch?['listings'] as List<dynamic>?)
          ?.map((l) => l is Listing ? l : Listing.fromJson(l as Map<String, dynamic>))
          .toList(),
      removedKeys: removed?['listings'],
      keyOf: (l) => l.id,
    );

    var nextOrders = _mergeCollection<Order>(
      current: _state.orders,
      incoming: (patch?['orders'] as List<dynamic>?)
          ?.map((o) => o is Order ? o : Order.fromJson(o as Map<String, dynamic>))
          .toList(),
      removedKeys: removed?['orders'],
      keyOf: (o) => o.id,
      compare: (a, b) => b.createdAt.compareTo(a.createdAt),
    );

    var nextFavorites = _mergeCollection<Favorite>(
      current: _state.favorites,
      incoming: (patch?['favorites'] as List<dynamic>?)
          ?.map((f) => f is Favorite ? f : Favorite.fromJson(f as Map<String, dynamic>))
          .toList(),
      removedKeys: removed?['favorites'],
      keyOf: (f) => f.listingId,
    );

    var nextFollows = _mergeCollection<Follow>(
      current: _state.follows,
      incoming: (patch?['follows'] as List<dynamic>?)
          ?.map((f) => f is Follow ? f : Follow.fromJson(f as Map<String, dynamic>))
          .toList(),
      removedKeys: removed?['follows'],
      keyOf: (f) => f.sellerId,
    );

    var nextReviews = _mergeCollection<Review>(
      current: _state.reviews,
      incoming: (patch?['reviews'] as List<dynamic>?)
          ?.map((r) => r is Review ? r : Review.fromJson(r as Map<String, dynamic>))
          .toList(),
      removedKeys: removed?['reviews'],
      keyOf: (r) => r.id,
      compare: (a, b) => b.createdAt.compareTo(a.createdAt),
    );

    var nextPaymentAttempts = _mergeCollection<PaymentAttempt>(
      current: _state.paymentAttempts,
      incoming: (patch?['paymentAttempts'] as List<dynamic>?)
          ?.map((p) => p is PaymentAttempt ? p : PaymentAttempt.fromJson(p as Map<String, dynamic>))
          .toList(),
      removedKeys: removed?['paymentAttempts'],
      keyOf: (p) => p.id,
      compare: (a, b) => b.createdAt.compareTo(a.createdAt),
    );

    var nextTickets = _mergeCollection<Ticket>(
      current: _state.tickets,
      incoming: (patch?['tickets'] as List<dynamic>?)
          ?.map((t) => t is Ticket ? t : Ticket.fromJson(t as Map<String, dynamic>))
          .toList(),
      removedKeys: removed?['tickets'],
      keyOf: (t) => t.id,
      compare: (a, b) => b.updatedAt.compareTo(a.updatedAt),
    );

    var nextNotifications = _mergeCollection<Notification>(
      current: _state.notifications,
      incoming: (patch?['notifications'] as List<dynamic>?)
          ?.map((n) => n is Notification ? n : Notification.fromJson(n as Map<String, dynamic>))
          .toList(),
      removedKeys: removed?['notifications'],
      keyOf: (n) => n.id,
      compare: (a, b) => b.createdAt.compareTo(a.createdAt),
    );

    Stats nextStats = _state.stats;
    if (patch != null && patch.containsKey('stats')) {
      final rawStats = patch['stats'];
      if (rawStats is Stats) {
        nextStats = rawStats;
      } else if (rawStats is Map<String, dynamic>) {
        nextStats = Stats.fromJson(rawStats);
      }
    }

    _state = _state.copyWith(
      users: nextUsers,
      listings: nextListings,
      orders: nextOrders,
      favorites: nextFavorites,
      follows: nextFollows,
      reviews: nextReviews,
      paymentAttempts: nextPaymentAttempts,
      tickets: nextTickets,
      notifications: nextNotifications,
      stats: nextStats,
    );

    if (persist) {
      localDb.applyPatch(patch: patch, removed: removed);
    }

    notifyListeners();
  }

  List<T> _mergeCollection<T>({
    required List<T> current,
    required List<T>? incoming,
    required List<String>? removedKeys,
    required String Function(T item) keyOf,
    int Function(T a, T b)? compare,
  }) {
    if ((incoming == null || incoming.isEmpty) &&
        (removedKeys == null || removedKeys.isEmpty)) {
      return current;
    }

    final drop = Set<String>.from(removedKeys ?? const []);
    final incomingMap = <String, T>{};
    if (incoming != null) {
      for (final item in incoming) {
        incomingMap[keyOf(item)] = item;
      }
    }

    final kept = <T>[];
    for (final item in current) {
      final k = keyOf(item);
      if (drop.contains(k)) continue;
      if (incomingMap.containsKey(k)) {
        kept.add(incomingMap[k] as T);
      } else {
        kept.add(item);
      }
    }

    final known = kept.map(keyOf).toSet();
    for (final entry in incomingMap.entries) {
      if (!known.contains(entry.key)) {
        kept.add(entry.value);
      }
    }

    if (compare != null) {
      kept.sort(compare);
    }

    return kept;
  }
}

final db = DbStore.instance;
