import 'package:flutter/foundation.dart';

/// How the Explorer ranks offers, set by the administration (Admin → Paramètres → Explorer on the web). Same rules as
/// `src/shared/config/explore.ts`: every weight goes from 0 (not used) to 10 (counts the most).
class ExploreWeights {
  final int sales, views, favorites, rating, freshness, taste, rotation;
  const ExploreWeights({
    this.sales = 6,
    this.views = 3,
    this.favorites = 4,
    this.rating = 3,
    this.freshness = 5,
    this.taste = 6,
    this.rotation = 2,
  });

  int get total => sales + views + favorites + rating + freshness + taste + rotation;
}

class ExploreSettings {
  final ExploreWeights weights;
  final int freshDays;

  /// At most this many offers of the same store in a row.
  final int sellerRun;

  /// "À la une": offers chosen by the administration, shown first in this order.
  final List<String> featured;

  const ExploreSettings({this.weights = const ExploreWeights(), this.freshDays = 14, this.sellerRun = 2, this.featured = const []});

  static ExploreSettings fromJson(Object? raw) {
    if (raw is! Map) return const ExploreSettings();
    final w = raw['weights'] is Map ? raw['weights'] as Map : const {};
    int weight(String k, int d) => w[k] is num ? (w[k] as num).round().clamp(0, 10) : d;
    int whole(Object? v, int min, int max, int d) => v is num && v.round() >= min && v.round() <= max ? v.round() : d;
    const d = ExploreWeights();
    return ExploreSettings(
      weights: ExploreWeights(
        sales: weight('sales', d.sales),
        views: weight('views', d.views),
        favorites: weight('favorites', d.favorites),
        rating: weight('rating', d.rating),
        freshness: weight('freshness', d.freshness),
        taste: weight('taste', d.taste),
        rotation: weight('rotation', d.rotation),
      ),
      freshDays: whole(raw['freshDays'], 1, 90, 14),
      sellerRun: whole(raw['sellerRun'], 1, 10, 2),
      featured: (raw['featured'] is List ? raw['featured'] as List : const []).whereType<String>().take(12).toList(),
    );
  }
}

/// The settings the server sent last (they arrive with the catalogue).
final ValueNotifier<ExploreSettings> exploreSettings = ValueNotifier(const ExploreSettings());

void applyExplore(Object? raw) {
  if (raw == null) return;
  exploreSettings.value = ExploreSettings.fromJson(raw);
}
