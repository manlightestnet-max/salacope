class Favorite {
  final String userId;
  final String listingId;
  final String createdAt;

  const Favorite({
    required this.userId,
    required this.listingId,
    required this.createdAt,
  });

  factory Favorite.fromJson(Map<String, dynamic> json) {
    return Favorite(
      userId: json['userId'] as String? ?? '',
      listingId: json['listingId'] as String? ?? '',
      createdAt: json['createdAt'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
    'userId': userId,
    'listingId': listingId,
    'createdAt': createdAt,
  };
}

class Follow {
  final String userId;
  final String sellerId;
  final String createdAt;
  final String? lastSeenAt;

  const Follow({
    required this.userId,
    required this.sellerId,
    required this.createdAt,
    this.lastSeenAt,
  });

  factory Follow.fromJson(Map<String, dynamic> json) {
    return Follow(
      userId: json['userId'] as String? ?? '',
      sellerId: json['sellerId'] as String? ?? '',
      createdAt: json['createdAt'] as String? ?? '',
      lastSeenAt: json['lastSeenAt'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
    'userId': userId,
    'sellerId': sellerId,
    'createdAt': createdAt,
    if (lastSeenAt != null) 'lastSeenAt': lastSeenAt,
  };
}

class Review {
  final String id;
  final String orderId;
  final String listingId;
  final String sellerId;
  final String buyerId;
  final int rating;
  final String? comment;
  final String createdAt;
  final String? authorName;
  final String? itemTitle;

  const Review({
    required this.id,
    required this.orderId,
    required this.listingId,
    required this.sellerId,
    required this.buyerId,
    required this.rating,
    this.comment,
    required this.createdAt,
    this.authorName,
    this.itemTitle,
  });

  factory Review.fromJson(Map<String, dynamic> json) {
    return Review(
      id: json['id'] as String? ?? '',
      orderId: json['orderId'] as String? ?? '',
      listingId: json['listingId'] as String? ?? '',
      sellerId: json['sellerId'] as String? ?? '',
      buyerId: json['buyerId'] as String? ?? '',
      rating: (json['rating'] as num?)?.toInt() ?? 5,
      comment: json['comment'] as String?,
      createdAt: json['createdAt'] as String? ?? '',
      authorName: json['authorName'] as String?,
      itemTitle: json['itemTitle'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'orderId': orderId,
    'listingId': listingId,
    'sellerId': sellerId,
    'buyerId': buyerId,
    'rating': rating,
    if (comment != null) 'comment': comment,
    'createdAt': createdAt,
    if (authorName != null) 'authorName': authorName,
    if (itemTitle != null) 'itemTitle': itemTitle,
  };
}

class SellerStats {
  final int completedSales;
  final int followers;
  final int reviews;
  final double rating;

  const SellerStats({
    required this.completedSales,
    required this.followers,
    required this.reviews,
    required this.rating,
  });

  factory SellerStats.fromJson(Map<String, dynamic> json) {
    return SellerStats(
      completedSales: (json['completedSales'] as num?)?.toInt() ?? 0,
      followers: (json['followers'] as num?)?.toInt() ?? 0,
      reviews: (json['reviews'] as num?)?.toInt() ?? 0,
      rating: (json['rating'] as num?)?.toDouble() ?? 0.0,
    );
  }

  Map<String, dynamic> toJson() => {
    'completedSales': completedSales,
    'followers': followers,
    'reviews': reviews,
    'rating': rating,
  };
}

/// Visits over 30 days and favourites of one offer: what the Explorer ranks with (counts only, never who).
class ListingSignal {
  final int views;
  final int favorites;
  const ListingSignal({this.views = 0, this.favorites = 0});
  factory ListingSignal.fromJson(Map<String, dynamic> json) =>
      ListingSignal(views: (json['views'] as num?)?.toInt() ?? 0, favorites: (json['favorites'] as num?)?.toInt() ?? 0);
  Map<String, dynamic> toJson() => {'views': views, 'favorites': favorites};
}

class Stats {
  final Map<String, int> listings;
  final Map<String, SellerStats> sellers;
  final Map<String, ListingSignal> signals;

  const Stats({
    this.listings = const {},
    this.sellers = const {},
    this.signals = const {},
  });

  factory Stats.fromJson(Map<String, dynamic>? json) {
    if (json == null) return const Stats();
    final rawListings = json['listings'] as Map<String, dynamic>? ?? {};
    final rawSellers = json['sellers'] as Map<String, dynamic>? ?? {};

    return Stats(
      listings: rawListings.map((k, v) => MapEntry(k, (v as num).toInt())),
      sellers: rawSellers.map(
        (k, v) => MapEntry(k, SellerStats.fromJson(v as Map<String, dynamic>)),
      ),
      signals: (json['signals'] as Map<String, dynamic>? ?? {}).map((k, v) => MapEntry(k, ListingSignal.fromJson(v as Map<String, dynamic>))),
    );
  }

  Map<String, dynamic> toJson() => {
    'listings': listings,
    'sellers': sellers.map((k, v) => MapEntry(k, v.toJson())),
    'signals': signals.map((k, v) => MapEntry(k, v.toJson())),
  };
}
