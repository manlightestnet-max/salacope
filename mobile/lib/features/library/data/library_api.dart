import '../../../core/api/api_client.dart';
import '../../../core/api/domain_error.dart';
import '../../../core/db/store.dart';

final libraryApi = LibraryApi.instance;

class LibraryApi {
  static final LibraryApi instance = LibraryApi._();
  LibraryApi._();

  Future<bool> toggleFavorite(String listingId) async {
    final exists = db.state.favorites.any((f) => f.listingId == listingId);
    final method = exists ? 'DELETE' : 'POST';
    await api.mutate(method, '/favorites/${Uri.encodeComponent(listingId)}');
    return !exists;
  }

  Future<bool> toggleFollow({
    required String currentUserId,
    required String sellerId,
  }) async {
    if (currentUserId == sellerId) {
      throw DomainError('Vous ne pouvez pas suivre votre propre boutique.');
    }
    final exists = db.state.follows.any((f) => f.sellerId == sellerId);
    final method = exists ? 'DELETE' : 'POST';
    await api.mutate(method, '/follows/${Uri.encodeComponent(sellerId)}');
    return !exists;
  }

  Future<void> markFollowSeen(String sellerId) async {
    await api.mutate(
      'POST',
      '/follows/${Uri.encodeComponent(sellerId)}/seen',
    );
  }
}
