import '../../../core/api/api_client.dart';
import '../../../core/db/models/listing.dart';
import '../../../core/domain/listings.dart';

final listingsApi = ListingsApi.instance;

class ListingsApi {
  static final ListingsApi instance = ListingsApi._();
  ListingsApi._();

  Future<Listing> createListing(ListingInput input, bool publish) async {
    validateListing(input);
    final res = await api.mutate(
      'POST',
      '/listings',
      body: {'listing': input.toJson(), 'publish': publish},
    );
    final listingData = res['listing'] as Map<String, dynamic>? ?? {};
    return Listing.fromJson(listingData);
  }

  Future<void> updateListing(String listingId, ListingInput input) async {
    validateListing(input);
    await api.mutate(
      'PATCH',
      '/listings/${Uri.encodeComponent(listingId)}',
      body: {'listing': input.toJson()},
    );
  }

  /// A draft opened by the first file sent: it keeps what is typed so far and holds the files from then on.
  Future<Listing> createDraft({required String kind, required String category, required String title, required String summary}) async {
    final res = await api.mutate(
      'POST',
      '/listings/draft',
      body: {
        'listing': {'kind': kind, 'category': category, 'title': title, 'summary': summary},
      },
    );
    return Listing.fromJson(res['listing'] as Map<String, dynamic>? ?? {});
  }

  /// The files of a draft, saved as they are added, taken out or marked as samples.
  Future<void> saveDraftFiles(String listingId, List<ListingFileItem> files) async {
    await api.mutate('PUT', '/listings/${Uri.encodeComponent(listingId)}/files', body: {'files': files.map((f) => f.toJson()).toList()});
  }

  Future<void> setListingStatus(String listingId, String status) async {
    await api.mutate(
      'POST',
      '/listings/${Uri.encodeComponent(listingId)}/status',
      body: {'status': status},
    );
  }

  Future<void> deleteListing(String listingId) async {
    await api.mutate(
      'DELETE',
      '/listings/${Uri.encodeComponent(listingId)}',
    );
  }
}
