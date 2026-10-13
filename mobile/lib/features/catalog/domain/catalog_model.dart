import '../../../core/db/models/user.dart';
import '../../../core/db/models/listing.dart';
import '../../../core/db/models/database.dart';
import 'ranking.dart';

class CategoryConfig {
  final String id;
  final String label;
  final String type;
  final String section;
  final String kind;

  const CategoryConfig({
    required this.id,
    required this.label,
    required this.type,
    required this.section,
    required this.kind,
  });
}

const List<CategoryConfig> categoriesConfig = [
  CategoryConfig(
    id: 'ebook',
    label: 'E-books & guides',
    type: 'E-book',
    section: 'Livres recommandés',
    kind: 'digital',
  ),
  CategoryConfig(
    id: 'formation',
    label: 'Formations',
    type: 'Formation',
    section: 'Formations',
    kind: 'digital',
  ),
  CategoryConfig(
    id: 'service',
    label: 'Services',
    type: 'Service',
    section: 'Services freelance',
    kind: 'service',
  ),
  CategoryConfig(
    id: 'template',
    label: 'Templates',
    type: 'Template',
    section: 'Templates',
    kind: 'digital',
  ),
  CategoryConfig(
    id: 'mentorat',
    label: 'Coaching',
    type: 'Coaching',
    section: 'Coaching 1:1',
    kind: 'service',
  ),
];

CategoryConfig? getCategoryConfig(String id) {
  for (final c in categoriesConfig) {
    if (c.id == id) return c;
  }
  return null;
}

String categoryLabel(String id) => getCategoryConfig(id)?.label ?? id;

List<String> cardBreadcrumb(Listing listing) {
  final type = getCategoryConfig(listing.category)?.type ?? listing.category;
  if (listing.kind == 'service') {
    final days = listing.deliveryDays ?? 3;
    return [type, '$days jour${days > 1 ? 's' : ''}'];
  }
  final format = listing.file?.format ?? 'Fichier';
  return [type, format.toLowerCase().startsWith('accès') ? 'En ligne' : format];
}

enum CoverFormat {
  portrait,
  landscape,
  video,
  square;

  static CoverFormat forCategory(String category) {
    switch (category) {
      case 'ebook':
        return CoverFormat.portrait;
      case 'formation':
        return CoverFormat.video;
      case 'service':
        return CoverFormat.landscape;
      case 'template':
      case 'mentorat':
      default:
        return CoverFormat.square;
    }
  }

  double get aspectRatio {
    switch (this) {
      case CoverFormat.portrait:
        return 3 / 4;
      case CoverFormat.landscape:
        return 4 / 3;
      case CoverFormat.video:
        return 16 / 9;
      case CoverFormat.square:
        return 1 / 1;
    }
  }
}

String deliveryLabel(Listing listing) {
  if (listing.kind == 'service') {
    final days = listing.deliveryDays ?? 3;
    return 'Livré en $days jour${days > 1 ? 's' : ''}';
  }
  final format = listing.file?.format;
  if (format == null) return 'Accès immédiat';
  return format.toLowerCase().startsWith('accès')
      ? 'Accès en ligne immédiat'
      : '$format · accès immédiat';
}

class ListingView {
  final Listing listing;
  final User? seller;
  final int salesCount;

  const ListingView({
    required this.listing,
    this.seller,
    this.salesCount = 0,
  });
}

/// Everything a visitor can buy in the catalogue. Offers of a private store (opened by its own link) never mix with the
/// catalogue; `includePrivate` keeps them where the person put them themselves (favourites, followed stores).
List<ListingView> buildListingViews(Database state, {bool includePrivate = false}) {
  final usersById = {for (final u in state.users) u.id: u};
  return state.listings
      .where((l) => l.status == 'published' && (includePrivate || usersById[l.sellerId]?.merchant?.isPrivate != true))
      .map((l) => ListingView(
            listing: l,
            seller: usersById[l.sellerId],
            salesCount: state.stats.listings[l.id] ?? 0,
          ))
      .toList();
}

enum CatalogSort {
  /// The Explorer's ranking (with words: the best answers first).
  forYou,
  popular,
  newest,
  priceAsc,
  priceDesc;

  String get label {
    switch (this) {
      case CatalogSort.forYou:
        return 'Recommandé';
      case CatalogSort.popular:
        return 'Les plus vendus';
      case CatalogSort.newest:
        return 'Les plus récents';
      case CatalogSort.priceAsc:
        return 'Prix croissant';
      case CatalogSort.priceDesc:
        return 'Prix décroissant';
    }
  }
}

class CatalogQuery {
  final String? category;
  final String? text;
  final int? minPrice;
  final int? maxPrice;
  final CatalogSort sort;

  const CatalogQuery({
    this.category,
    this.text,
    this.minPrice,
    this.maxPrice,
    this.sort = CatalogSort.forYou,
  });

  CatalogQuery copyWith({
    String? category,
    bool clearCategory = false,
    String? text,
    int? minPrice,
    int? maxPrice,
    CatalogSort? sort,
  }) {
    return CatalogQuery(
      category: clearCategory ? null : (category ?? this.category),
      text: text ?? this.text,
      minPrice: minPrice ?? this.minPrice,
      maxPrice: maxPrice ?? this.maxPrice,
      sort: sort ?? this.sort,
    );
  }
}

/// The offers that answer the query, in its order. Words are matched by `textScore` (accents, plurals and one typo
/// forgiven). "Recommandé" uses the Explorer's ranking when `rank` is given; without it, the most sold first.
List<ListingView> queryListings(List<ListingView> views, CatalogQuery query, {RankContext? rank}) {
  final text = (query.text ?? '').trim();
  final relevance = <String, double>{};
  final filtered = views.where((v) {
    if (query.category != null && v.listing.category != query.category) return false;
    if (query.minPrice != null && v.listing.priceXaf < query.minPrice!) return false;
    if (query.maxPrice != null && v.listing.priceXaf > query.maxPrice!) return false;
    if (text.isEmpty) return true;
    final score = textScore(v, text);
    relevance[v.listing.id] = score;
    return score > 0;
  }).toList();

  if (query.sort == CatalogSort.forYou && rank != null) return rankListings(filtered, rank, text.isEmpty ? null : relevance);

  filtered.sort((a, b) {
    switch (query.sort) {
      case CatalogSort.priceAsc:
        return a.listing.priceXaf.compareTo(b.listing.priceXaf);
      case CatalogSort.priceDesc:
        return b.listing.priceXaf.compareTo(a.listing.priceXaf);
      case CatalogSort.newest:
        return b.listing.createdAt.compareTo(a.listing.createdAt);
      case CatalogSort.forYou:
        if (text.isNotEmpty) {
          final c = (relevance[b.listing.id] ?? 0).compareTo(relevance[a.listing.id] ?? 0);
          if (c != 0) return c;
        }
        final cmp = b.salesCount.compareTo(a.salesCount);
        return cmp != 0 ? cmp : b.listing.createdAt.compareTo(a.listing.createdAt);
      case CatalogSort.popular:
        final cmp = b.salesCount.compareTo(a.salesCount);
        if (cmp != 0) return cmp;
        return b.listing.createdAt.compareTo(a.listing.createdAt);
    }
  });

  return filtered;
}
