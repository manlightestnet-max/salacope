import 'package:salacope/core/lib/files.dart';
import '../domain/ranking.dart';
import '../../../core/db/store.dart';
import '../../../core/api/api_client.dart';
import '../../../core/db/models/listing.dart';

/// Extra images of each offer, fetched once per version of the offer.
final Map<String, Future<List<String>>> _galleries = {};

/// The images after the cover (the catalogue only knows how many there are).
Future<List<String>> fetchListingGallery(Listing listing) {
  final key = '${listing.id}:${listing.updatedAt}';
  return _galleries.putIfAbsent(key, () async {
    try {
      final res = await api.request(
        'GET',
        '/listings/${Uri.encodeComponent(listing.id)}/gallery',
      );
      final images = res is Map ? res['images'] : null;
      return images is List
          ? images.map((e) => e.toString()).where((e) => e.isNotEmpty).toList()
          : <String>[];
    } catch (_) {
      _galleries.remove(key);
      return <String>[];
    }
  });
}

/// One advertising slot of the storefront banner, set by an administrator.
class ShopBannerSlot {
  final String image;
  final String title;
  final String link;

  const ShopBannerSlot({required this.image, required this.title, required this.link});
}

/// Kept for the session: coming back to the storefront shows the banner at once, and refreshes it in the background.
List<ShopBannerSlot>? cachedBanners;

Future<List<ShopBannerSlot>> fetchBanners() async {
  try {
    final res = await api.request('GET', '/banners');
    final raw = res is Map ? res['banners'] : null;
    cachedBanners = raw is List
        ? raw
            .whereType<Map>()
            .map((b) => ShopBannerSlot(
                  image: b['image']?.toString() ?? '',
                  title: b['title']?.toString() ?? '',
                  link: b['link']?.toString() ?? '',
                ))
            .where((b) => b.image.isNotEmpty)
            .toList()
        : <ShopBannerSlot>[];
  } catch (_) {
    cachedBanners ??= <ShopBannerSlot>[];
  }
  return cachedBanners!;
}

/// Real figures of an offer: visits, purchases, whether the seller is online.
class ListingStats {
  final int views;
  final int purchases;
  final bool sellerOnline;

  const ListingStats({required this.views, required this.purchases, required this.sellerOnline});
}

final Map<String, ListingStats> _stats = {};

/// The last known figures, shown at once on a return visit.
ListingStats? cachedListingStats(String listingId) => _stats[listingId];

Future<ListingStats?> fetchListingStats(String listingId) async {
  try {
    final res = await api.request('GET', '/listings/${Uri.encodeComponent(listingId)}/stats');
    if (res is! Map) return _stats[listingId];
    return _stats[listingId] = ListingStats(
      views: (res['views'] as num?)?.toInt() ?? 0,
      purchases: (res['purchases'] as num?)?.toInt() ?? 0,
      sellerOnline: res['sellerOnline'] == true,
    );
  } catch (_) {
    return _stats[listingId];
  }
}


final Set<String> _viewedThisSession = {};

/// Insights for the seller (a visit of the offer once per session, or a tap on Buy) and this person's interests for the
/// Explorer (kept on the phone). Fire and forget: a failure never bothers the visitor.
void trackListing(Listing listing, String type) {
  if (listing.sellerId == db.state.sessionUserId) return;
  if (type == 'view' && !_viewedThisSession.add(listing.id)) return;
  Taste.noteListing(listing, type).ignore();
  api.request('POST', '/listings/${Uri.encodeComponent(listing.id)}/track', body: {'type': type}).ignore();
}

/// A visit of a store page, once per opening (the server counts one per visitor and per day, and never the seller).
void trackStore(String sellerId) {
  if (sellerId == db.state.sessionUserId) return;
  api.request('POST', '/stores/${Uri.encodeComponent(sellerId)}/track', body: const <String, dynamic>{}).ignore();
}

/// A free sample of an offer: anyone can take it, without buying (an address that works for two minutes).
Future<void> downloadSample(String listingId, String fileId) async {
  final res = await api.request('GET', '/listings/${Uri.encodeComponent(listingId)}/preview?f=${Uri.encodeComponent(fileId)}') as Map<String, dynamic>;
  await openRemoteFile(res['url'] as String?, res['name'] as String? ?? 'apercu');
}
