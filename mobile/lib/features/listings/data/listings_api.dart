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
