import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:sqlite3/sqlite3.dart' as sql;

import 'models/database.dart';
import 'models/user.dart';
import 'models/listing.dart';
import 'models/order.dart';
import 'models/interaction.dart';
import 'models/ticket.dart';
import 'models/notification.dart';
import 'models/payment_attempt.dart';

class SyncQueueItem {
  final int id;
  final String action;
  final String method;
  final String endpoint;
  final Map<String, dynamic>? payload;
  final DateTime createdAt;
  final int retryCount;
  final String status;

  const SyncQueueItem({
    required this.id,
    required this.action,
    required this.method,
    required this.endpoint,
    this.payload,
    required this.createdAt,
    this.retryCount = 0,
    this.status = 'PENDING',
  });
}

class LocalDatabase {
  static final LocalDatabase instance = LocalDatabase._();
  LocalDatabase._();

  sql.Database? _rawDb;
  bool _initialized = false;

  bool get isInitialized => _initialized;

  Future<void> init() async {
    if (_initialized && _rawDb != null) return;
    try {
      final docDir = await getApplicationDocumentsDirectory();
      final dbPath = p.join(docDir.path, 'salacope_v2.sqlite');

      _rawDb = sql.sqlite3.open(dbPath);
      _rawDb!.execute('PRAGMA journal_mode = WAL;');
      _rawDb!.execute('PRAGMA synchronous = NORMAL;');

      _createTables();
      _initialized = true;
    } catch (e) {
      debugPrint('[LocalDatabase] Init error: $e');
    }
  }

  void _createTables() {
    final db = _rawDb;
    if (db == null) return;

    db.execute('''
      CREATE TABLE IF NOT EXISTS local_meta (
        key TEXT PRIMARY KEY,
        value TEXT
      );

      CREATE TABLE IF NOT EXISTS local_users (
        id TEXT PRIMARY KEY,
        data_json TEXT NOT NULL,
        created_at TEXT
      );

      CREATE TABLE IF NOT EXISTS local_listings (
        id TEXT PRIMARY KEY,
        category TEXT,
        price INTEGER,
        data_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS local_orders (
        id TEXT PRIMARY KEY,
        buyer_id TEXT,
        seller_id TEXT,
        created_at TEXT,
        data_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS local_favorites (
        listing_id TEXT PRIMARY KEY,
        data_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS local_follows (
        seller_id TEXT PRIMARY KEY,
        data_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS local_reviews (
        id TEXT PRIMARY KEY,
        data_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS local_tickets (
        id TEXT PRIMARY KEY,
        updated_at TEXT,
        data_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS local_notifications (
        id TEXT PRIMARY KEY,
        read INTEGER,
        created_at TEXT,
        data_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS local_payment_attempts (
        id TEXT PRIMARY KEY,
        created_at TEXT,
        data_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        method TEXT NOT NULL,
        endpoint TEXT NOT NULL,
        payload_json TEXT,
        created_at TEXT NOT NULL,
        retry_count INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'PENDING'
      );
    ''');
  }

  String? getMeta(String key) {
    final db = _rawDb;
    if (db == null) return null;
    try {
      final res = db.select('SELECT value FROM local_meta WHERE key = ?', [key]);
      if (res.isNotEmpty) {
        return res.first['value'] as String?;
      }
    } catch (e) {
      debugPrint('[LocalDatabase] getMeta error: $e');
    }
    return null;
  }

  void setMeta(String key, String? value) {
    final db = _rawDb;
    if (db == null) return;
    try {
      if (value == null) {
        db.execute('DELETE FROM local_meta WHERE key = ?', [key]);
      } else {
        db.execute(
          'INSERT OR REPLACE INTO local_meta (key, value) VALUES (?, ?)',
          [key, value],
        );
      }
    } catch (e) {
      debugPrint('[LocalDatabase] setMeta error: $e');
    }
  }

  /// Loads full Database object from local SQLite cache.
  Database? loadDatabase() {
    final db = _rawDb;
    if (db == null) return null;

    try {
      final sessionUserId = getMeta('sessionUserId');
      final lastSync = getMeta('lastSync');
      final rawStats = getMeta('stats');

      Stats stats = const Stats();
      if (rawStats != null) {
        try {
          stats = Stats.fromJson(jsonDecode(rawStats) as Map<String, dynamic>);
        } catch (_) {}
      }

      final users = <User>[];
      for (final row in db.select('SELECT data_json FROM local_users')) {
        try {
          final json = jsonDecode(row['data_json'] as String) as Map<String, dynamic>;
          users.add(User.fromJson(json));
        } catch (_) {}
      }

      final listings = <Listing>[];
      for (final row in db.select('SELECT data_json FROM local_listings')) {
        try {
          final json = jsonDecode(row['data_json'] as String) as Map<String, dynamic>;
          listings.add(Listing.fromJson(json));
        } catch (_) {}
      }

      final orders = <Order>[];
      for (final row in db.select('SELECT data_json FROM local_orders')) {
        try {
          final json = jsonDecode(row['data_json'] as String) as Map<String, dynamic>;
          orders.add(Order.fromJson(json));
        } catch (_) {}
      }

      final favorites = <Favorite>[];
      for (final row in db.select('SELECT data_json FROM local_favorites')) {
        try {
          final json = jsonDecode(row['data_json'] as String) as Map<String, dynamic>;
          favorites.add(Favorite.fromJson(json));
        } catch (_) {}
      }

      final follows = <Follow>[];
      for (final row in db.select('SELECT data_json FROM local_follows')) {
        try {
          final json = jsonDecode(row['data_json'] as String) as Map<String, dynamic>;
          follows.add(Follow.fromJson(json));
        } catch (_) {}
      }

      final reviews = <Review>[];
      for (final row in db.select('SELECT data_json FROM local_reviews')) {
        try {
          final json = jsonDecode(row['data_json'] as String) as Map<String, dynamic>;
          reviews.add(Review.fromJson(json));
        } catch (_) {}
      }

      final tickets = <Ticket>[];
      for (final row in db.select('SELECT data_json FROM local_tickets')) {
        try {
          final json = jsonDecode(row['data_json'] as String) as Map<String, dynamic>;
          tickets.add(Ticket.fromJson(json));
        } catch (_) {}
      }

      final notifications = <Notification>[];
      for (final row in db.select('SELECT data_json FROM local_notifications')) {
        try {
          final json = jsonDecode(row['data_json'] as String) as Map<String, dynamic>;
          notifications.add(Notification.fromJson(json));
        } catch (_) {}
      }

      final paymentAttempts = <PaymentAttempt>[];
      for (final row in db.select('SELECT data_json FROM local_payment_attempts')) {
        try {
          final json = jsonDecode(row['data_json'] as String) as Map<String, dynamic>;
          paymentAttempts.add(PaymentAttempt.fromJson(json));
        } catch (_) {}
      }

      // Check if we have any cached data at all
      if (users.isEmpty && listings.isEmpty && sessionUserId == null && lastSync == null) {
        return null;
      }

      return Database(
        sessionUserId: sessionUserId,
        stats: stats,
        users: users,
        listings: listings,
        orders: orders,
        favorites: favorites,
        follows: follows,
        reviews: reviews,
        tickets: tickets,
        notifications: notifications,
        paymentAttempts: paymentAttempts,
      );
    } catch (e) {
      debugPrint('[LocalDatabase] loadDatabase error: $e');
      return null;
    }
  }

  /// Persists the full bootstrap state atomically in SQLite.
  void saveFullDatabase(Database data, {String? lastSync}) {
    final db = _rawDb;
    if (db == null) return;

    try {
      db.execute('BEGIN TRANSACTION');

      if (data.sessionUserId != null) {
        setMeta('sessionUserId', data.sessionUserId);
      }
      if (lastSync != null) {
        setMeta('lastSync', lastSync);
      }
      setMeta('stats', jsonEncode(data.stats.toJson()));

      // Save Users
      db.execute('DELETE FROM local_users');
      final insertUser = db.prepare(
        'INSERT OR REPLACE INTO local_users (id, data_json, created_at) VALUES (?, ?, ?)',
      );
      for (final u in data.users) {
        insertUser.execute([u.id, jsonEncode(u.toJson()), u.createdAt]);
      }
      insertUser.dispose();

      // Save Listings
      db.execute('DELETE FROM local_listings');
      final insertListing = db.prepare(
        'INSERT OR REPLACE INTO local_listings (id, category, price, data_json) VALUES (?, ?, ?, ?)',
      );
      for (final l in data.listings) {
        insertListing.execute([l.id, l.category, l.priceXaf, jsonEncode(l.toJson())]);
      }
      insertListing.dispose();

      // Save Orders
      db.execute('DELETE FROM local_orders');
      final insertOrder = db.prepare(
        'INSERT OR REPLACE INTO local_orders (id, buyer_id, seller_id, created_at, data_json) VALUES (?, ?, ?, ?, ?)',
      );
      for (final o in data.orders) {
        insertOrder.execute([
          o.id,
          o.buyerId,
          o.sellerId,
          o.createdAt,
          jsonEncode(o.toJson()),
        ]);
      }
      insertOrder.dispose();

      // Save Favorites
      db.execute('DELETE FROM local_favorites');
      final insertFav = db.prepare(
        'INSERT OR REPLACE INTO local_favorites (listing_id, data_json) VALUES (?, ?)',
      );
      for (final f in data.favorites) {
        insertFav.execute([f.listingId, jsonEncode(f.toJson())]);
      }
      insertFav.dispose();

      // Save Follows
      db.execute('DELETE FROM local_follows');
      final insertFollow = db.prepare(
        'INSERT OR REPLACE INTO local_follows (seller_id, data_json) VALUES (?, ?)',
      );
      for (final f in data.follows) {
        insertFollow.execute([f.sellerId, jsonEncode(f.toJson())]);
      }
      insertFollow.dispose();

      // Save Reviews
      db.execute('DELETE FROM local_reviews');
      final insertReview = db.prepare(
        'INSERT OR REPLACE INTO local_reviews (id, data_json) VALUES (?, ?)',
      );
      for (final r in data.reviews) {
        insertReview.execute([r.id, jsonEncode(r.toJson())]);
      }
      insertReview.dispose();

      // Save Tickets
      db.execute('DELETE FROM local_tickets');
      final insertTicket = db.prepare(
        'INSERT OR REPLACE INTO local_tickets (id, updated_at, data_json) VALUES (?, ?, ?)',
      );
      for (final t in data.tickets) {
        insertTicket.execute([t.id, t.updatedAt, jsonEncode(t.toJson())]);
      }
      insertTicket.dispose();

      // Save Notifications
      db.execute('DELETE FROM local_notifications');
      final insertNotif = db.prepare(
        'INSERT OR REPLACE INTO local_notifications (id, read, created_at, data_json) VALUES (?, ?, ?, ?)',
      );
      for (final n in data.notifications) {
        insertNotif.execute([
          n.id,
          n.read ? 1 : 0,
          n.createdAt,
          jsonEncode(n.toJson()),
        ]);
      }
      insertNotif.dispose();

      // Save Payment Attempts
      db.execute('DELETE FROM local_payment_attempts');
      final insertPay = db.prepare(
        'INSERT OR REPLACE INTO local_payment_attempts (id, created_at, data_json) VALUES (?, ?, ?)',
      );
      for (final p in data.paymentAttempts) {
        insertPay.execute([p.id, p.createdAt, jsonEncode(p.toJson())]);
      }
      insertPay.dispose();

      db.execute('COMMIT');
    } catch (e) {
      try {
        db.execute('ROLLBACK');
      } catch (_) {}
      debugPrint('[LocalDatabase] saveFullDatabase error: $e');
    }
  }

  /// Applies differential patch from `GET /sync` directly into SQLite.
  void applyPatch({
    Map<String, dynamic>? patch,
    Map<String, List<String>>? removed,
    String? lastSync,
  }) {
    final db = _rawDb;
    if (db == null) return;
    if (patch == null && removed == null && lastSync == null) return;

    try {
      db.execute('BEGIN TRANSACTION');

      if (lastSync != null) {
        setMeta('lastSync', lastSync);
      }

      if (patch != null && patch.containsKey('stats')) {
        final rawStats = patch['stats'];
        if (rawStats != null) {
          final statsJson = rawStats is Stats ? rawStats.toJson() : rawStats;
          setMeta('stats', jsonEncode(statsJson));
        }
      }

      // 1. Orders
      if (removed != null && removed.containsKey('orders')) {
        for (final id in removed['orders']!) {
          db.execute('DELETE FROM local_orders WHERE id = ?', [id]);
        }
      }
      if (patch != null && patch.containsKey('orders')) {
        final incoming = patch['orders'] as List<dynamic>? ?? [];
        final stmt = db.prepare(
          'INSERT OR REPLACE INTO local_orders (id, buyer_id, seller_id, created_at, data_json) VALUES (?, ?, ?, ?, ?)',
        );
        for (final raw in incoming) {
          final order = raw is Order ? raw : Order.fromJson(raw as Map<String, dynamic>);
          stmt.execute([
            order.id,
            order.buyerId,
            order.sellerId,
            order.createdAt,
            jsonEncode(order.toJson()),
          ]);
        }
        stmt.dispose();
      }

      // 2. Notifications
      if (removed != null && removed.containsKey('notifications')) {
        for (final id in removed['notifications']!) {
          db.execute('DELETE FROM local_notifications WHERE id = ?', [id]);
        }
      }
      if (patch != null && patch.containsKey('notifications')) {
        final incoming = patch['notifications'] as List<dynamic>? ?? [];
        final stmt = db.prepare(
          'INSERT OR REPLACE INTO local_notifications (id, read, created_at, data_json) VALUES (?, ?, ?, ?)',
        );
        for (final raw in incoming) {
          final notif =
              raw is Notification ? raw : Notification.fromJson(raw as Map<String, dynamic>);
          stmt.execute([
            notif.id,
            notif.read ? 1 : 0,
            notif.createdAt,
            jsonEncode(notif.toJson()),
          ]);
        }
        stmt.dispose();
      }

      // 3. Payment Attempts
      if (removed != null && removed.containsKey('paymentAttempts')) {
        for (final id in removed['paymentAttempts']!) {
          db.execute('DELETE FROM local_payment_attempts WHERE id = ?', [id]);
        }
      }
      if (patch != null && patch.containsKey('paymentAttempts')) {
        final incoming = patch['paymentAttempts'] as List<dynamic>? ?? [];
        final stmt = db.prepare(
          'INSERT OR REPLACE INTO local_payment_attempts (id, created_at, data_json) VALUES (?, ?, ?)',
        );
        for (final raw in incoming) {
          final p = raw is PaymentAttempt
              ? raw
              : PaymentAttempt.fromJson(raw as Map<String, dynamic>);
          stmt.execute([p.id, p.createdAt, jsonEncode(p.toJson())]);
        }
        stmt.dispose();
      }

      // 4. Tickets
      if (removed != null && removed.containsKey('tickets')) {
        for (final id in removed['tickets']!) {
          db.execute('DELETE FROM local_tickets WHERE id = ?', [id]);
        }
      }
      if (patch != null && patch.containsKey('tickets')) {
        final incoming = patch['tickets'] as List<dynamic>? ?? [];
        final stmt = db.prepare(
          'INSERT OR REPLACE INTO local_tickets (id, updated_at, data_json) VALUES (?, ?, ?)',
        );
        for (final raw in incoming) {
          final t = raw is Ticket ? raw : Ticket.fromJson(raw as Map<String, dynamic>);
          stmt.execute([t.id, t.updatedAt, jsonEncode(t.toJson())]);
        }
        stmt.dispose();
      }

      // 5. Listings
      if (removed != null && removed.containsKey('listings')) {
        for (final id in removed['listings']!) {
          db.execute('DELETE FROM local_listings WHERE id = ?', [id]);
        }
      }
      if (patch != null && patch.containsKey('listings')) {
        final incoming = patch['listings'] as List<dynamic>? ?? [];
        final stmt = db.prepare(
          'INSERT OR REPLACE INTO local_listings (id, category, price, data_json) VALUES (?, ?, ?, ?)',
        );
        for (final raw in incoming) {
          final l = raw is Listing ? raw : Listing.fromJson(raw as Map<String, dynamic>);
          stmt.execute([l.id, l.category, l.priceXaf, jsonEncode(l.toJson())]);
        }
        stmt.dispose();
      }

      // 6. Users
      if (removed != null && removed.containsKey('users')) {
        for (final id in removed['users']!) {
          db.execute('DELETE FROM local_users WHERE id = ?', [id]);
        }
      }
      if (patch != null && patch.containsKey('users')) {
        final incoming = patch['users'] as List<dynamic>? ?? [];
        final stmt = db.prepare(
          'INSERT OR REPLACE INTO local_users (id, data_json, created_at) VALUES (?, ?, ?)',
        );
        for (final raw in incoming) {
          final u = raw is User ? raw : User.fromJson(raw as Map<String, dynamic>);
          stmt.execute([u.id, jsonEncode(u.toJson()), u.createdAt]);
        }
        stmt.dispose();
      }

      db.execute('COMMIT');
    } catch (e) {
      try {
        db.execute('ROLLBACK');
      } catch (_) {}
      debugPrint('[LocalDatabase] applyPatch error: $e');
    }
  }

  /// Enqueue an offline mutation to be synchronized when back online.
  int enqueueMutation({
    required String action,
    required String method,
    required String endpoint,
    Map<String, dynamic>? payload,
  }) {
    final db = _rawDb;
    if (db == null) return -1;
    try {
      db.execute(
        '''
        INSERT INTO sync_queue (action, method, endpoint, payload_json, created_at, retry_count, status)
        VALUES (?, ?, ?, ?, ?, 0, 'PENDING')
        ''',
        [
          action,
          method,
          endpoint,
          payload != null ? jsonEncode(payload) : null,
          DateTime.now().toIso8601String(),
        ],
      );
      final res = db.select('SELECT last_insert_rowid() as id');
      return res.first['id'] as int;
    } catch (e) {
      debugPrint('[LocalDatabase] enqueueMutation error: $e');
      return -1;
    }
  }

  /// Fetches all pending mutations from the queue in FIFO order.
  List<SyncQueueItem> getPendingMutations() {
    final db = _rawDb;
    if (db == null) return [];
    try {
      final rows = db.select(
        "SELECT * FROM sync_queue WHERE status = 'PENDING' ORDER BY id ASC",
      );
      return rows.map((row) {
        Map<String, dynamic>? payload;
        final rawPayload = row['payload_json'] as String?;
        if (rawPayload != null) {
          try {
            payload = jsonDecode(rawPayload) as Map<String, dynamic>;
          } catch (_) {}
        }
        return SyncQueueItem(
          id: row['id'] as int,
          action: row['action'] as String,
          method: row['method'] as String,
          endpoint: row['endpoint'] as String,
          payload: payload,
          createdAt: DateTime.tryParse(row['created_at'] as String) ?? DateTime.now(),
          retryCount: row['retry_count'] as int,
          status: row['status'] as String,
        );
      }).toList();
    } catch (e) {
      debugPrint('[LocalDatabase] getPendingMutations error: $e');
      return [];
    }
  }

  /// Mark queue mutation completed and remove from table.
  void markMutationCompleted(int id) {
    final db = _rawDb;
    if (db == null) return;
    try {
      db.execute('DELETE FROM sync_queue WHERE id = ?', [id]);
    } catch (e) {
      debugPrint('[LocalDatabase] markMutationCompleted error: $e');
    }
  }

  /// Increment retry counter or mark failed.
  void markMutationFailed(int id, {bool fatal = false}) {
    final db = _rawDb;
    if (db == null) return;
    try {
      if (fatal) {
        db.execute("UPDATE sync_queue SET status = 'FAILED' WHERE id = ?", [id]);
      } else {
        db.execute(
          'UPDATE sync_queue SET retry_count = retry_count + 1 WHERE id = ?',
          [id],
        );
      }
    } catch (e) {
      debugPrint('[LocalDatabase] markMutationFailed error: $e');
    }
  }

  /// Clears session while preserving catalog and listings.
  void clearSession() {
    final db = _rawDb;
    if (db == null) return;
    try {
      setMeta('sessionUserId', null);
      setMeta('lastSync', null);
      db.execute('DELETE FROM local_orders');
      db.execute('DELETE FROM local_favorites');
      db.execute('DELETE FROM local_follows');
      db.execute('DELETE FROM local_tickets');
      db.execute('DELETE FROM local_notifications');
      db.execute('DELETE FROM local_payment_attempts');
      db.execute('DELETE FROM sync_queue');
    } catch (e) {
      debugPrint('[LocalDatabase] clearSession error: $e');
    }
  }
}

final localDb = LocalDatabase.instance;
