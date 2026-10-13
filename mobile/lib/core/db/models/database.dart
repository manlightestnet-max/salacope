import 'user.dart';
import 'listing.dart';
import 'order.dart';
import 'payment_attempt.dart';
import 'ticket.dart';
import 'notification.dart';
import 'interaction.dart';

class Database {
  final String? sessionUserId;
  final Stats stats;
  final List<User> users;
  final List<Listing> listings;
  final List<Order> orders;
  final List<Favorite> favorites;
  final List<Follow> follows;
  final List<Review> reviews;
  final List<PaymentAttempt> paymentAttempts;
  final List<Ticket> tickets;
  final List<Notification> notifications;

  const Database({
    this.sessionUserId,
    this.stats = const Stats(),
    this.users = const [],
    this.listings = const [],
    this.orders = const [],
    this.favorites = const [],
    this.follows = const [],
    this.reviews = const [],
    this.paymentAttempts = const [],
    this.tickets = const [],
    this.notifications = const [],
  });

  factory Database.empty() => const Database();

  factory Database.fromJson(Map<String, dynamic> json, {String? sessionUserId}) {
    return Database(
      sessionUserId: sessionUserId ?? json['sessionUserId'] as String?,
      stats: Stats.fromJson(json['stats'] as Map<String, dynamic>?),
      users: (json['users'] as List<dynamic>? ?? [])
          .map((u) => User.fromJson(u as Map<String, dynamic>))
          .toList(),
      listings: (json['listings'] as List<dynamic>? ?? [])
          .map((l) => Listing.fromJson(l as Map<String, dynamic>))
          .toList(),
      orders: (json['orders'] as List<dynamic>? ?? [])
          .map((o) => Order.fromJson(o as Map<String, dynamic>))
          .toList(),
      favorites: (json['favorites'] as List<dynamic>? ?? [])
          .map((f) => Favorite.fromJson(f as Map<String, dynamic>))
          .toList(),
      follows: (json['follows'] as List<dynamic>? ?? [])
          .map((f) => Follow.fromJson(f as Map<String, dynamic>))
          .toList(),
      reviews: (json['reviews'] as List<dynamic>? ?? [])
          .map((r) => Review.fromJson(r as Map<String, dynamic>))
          .toList(),
      paymentAttempts: (json['paymentAttempts'] as List<dynamic>? ?? [])
          .map((p) => PaymentAttempt.fromJson(p as Map<String, dynamic>))
          .toList(),
      tickets: (json['tickets'] as List<dynamic>? ?? [])
          .map((t) => Ticket.fromJson(t as Map<String, dynamic>))
          .toList(),
      notifications: (json['notifications'] as List<dynamic>? ?? [])
          .map((n) => Notification.fromJson(n as Map<String, dynamic>))
          .toList(),
    );
  }

  Map<String, dynamic> toJson() => {
    if (sessionUserId != null) 'sessionUserId': sessionUserId,
    'stats': stats.toJson(),
    'users': users.map((u) => u.toJson()).toList(),
    'listings': listings.map((l) => l.toJson()).toList(),
    'orders': orders.map((o) => o.toJson()).toList(),
    'favorites': favorites.map((f) => f.toJson()).toList(),
    'follows': follows.map((f) => f.toJson()).toList(),
    'reviews': reviews.map((r) => r.toJson()).toList(),
    'paymentAttempts': paymentAttempts.map((p) => p.toJson()).toList(),
    'tickets': tickets.map((t) => t.toJson()).toList(),
    'notifications': notifications.map((n) => n.toJson()).toList(),
  };

  Database copyWith({
    String? sessionUserId,
    bool clearSessionUserId = false,
    Stats? stats,
    List<User>? users,
    List<Listing>? listings,
    List<Order>? orders,
    List<Favorite>? favorites,
    List<Follow>? follows,
    List<Review>? reviews,
    List<PaymentAttempt>? paymentAttempts,
    List<Ticket>? tickets,
    List<Notification>? notifications,
  }) {
    return Database(
      sessionUserId: clearSessionUserId ? null : (sessionUserId ?? this.sessionUserId),
      stats: stats ?? this.stats,
      users: users ?? this.users,
      listings: listings ?? this.listings,
      orders: orders ?? this.orders,
      favorites: favorites ?? this.favorites,
      follows: follows ?? this.follows,
      reviews: reviews ?? this.reviews,
      paymentAttempts: paymentAttempts ?? this.paymentAttempts,
      tickets: tickets ?? this.tickets,
      notifications: notifications ?? this.notifications,
    );
  }
}
