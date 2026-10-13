import '../../../core/api/api_client.dart';
import '../../../core/api/domain_error.dart';
import '../../../core/domain/contact.dart';
import 'package:salacope/core/lib/files.dart';

final ordersApi = OrdersApi.instance;

class OrdersApi {
  static final OrdersApi instance = OrdersApi._();
  OrdersApi._();

  void _noContact(String text) {
    if (containsContact(text)) {
      throw DomainError(contactBlocked);
    }
  }

  /// The file of a digital product the buyer paid for (or the seller's own copy): the server hands out an address that
  /// works for two minutes, and the phone's browser downloads it.
  Future<void> downloadFile(String orderId) async {
    final res = await api.request('GET', '/orders/${Uri.encodeComponent(orderId)}/file') as Map<String, dynamic>;
    await openRemoteFile(res['url'] as String?, res['name'] as String? ?? 'fichier');
  }

  Future<void> acceptOrder(String orderId) async {
    await api.mutate('POST', '/orders/${Uri.encodeComponent(orderId)}/accept', body: {});
  }

  Future<void> deliverOrder({
    required String orderId,
    required String note,
    List<Map<String, dynamic>> files = const [],
  }) async {
    if (note.trim().isEmpty && files.isEmpty) {
      throw DomainError('Ajoutez un message ou un fichier à la livraison.');
    }
    _noContact(note);
    await api.mutate(
      'POST',
      '/orders/${Uri.encodeComponent(orderId)}/deliver',
      body: {'note': note.trim(), 'files': files},
    );
  }

  Future<void> confirmOrder(String orderId) async {
    await api.mutate('POST', '/orders/${Uri.encodeComponent(orderId)}/confirm', body: {});
  }

  Future<void> cancelOrder(String orderId, String reason) async {
    if (reason.trim().isEmpty) {
      throw DomainError('Indiquez la raison de l’annulation.');
    }
    await api.mutate(
      'POST',
      '/orders/${Uri.encodeComponent(orderId)}/cancel',
      body: {'reason': reason.trim()},
    );
  }

  Future<void> disputeOrder(String orderId, String reason) async {
    if (reason.trim().isEmpty) {
      throw DomainError('Décrivez le problème rencontré.');
    }
    await api.mutate(
      'POST',
      '/orders/${Uri.encodeComponent(orderId)}/dispute',
      body: {'reason': reason.trim()},
    );
  }

  Future<void> requestRevision(String orderId, String note) async {
    if (note.trim().isEmpty) {
      throw DomainError('Décrivez ce qui doit être modifié.');
    }
    _noContact(note);
    await api.mutate(
      'POST',
      '/orders/${Uri.encodeComponent(orderId)}/revise',
      body: {'note': note.trim()},
    );
  }

  Future<void> requestExtension(String orderId, int days, String reason) async {
    if (reason.trim().isEmpty) {
      throw DomainError('Expliquez pourquoi il vous faut plus de temps.');
    }
    _noContact(reason);
    await api.mutate(
      'POST',
      '/orders/${Uri.encodeComponent(orderId)}/extend',
      body: {'days': days, 'reason': reason.trim()},
    );
  }

  Future<void> answerExtension(String orderId, bool accept) async {
    await api.mutate(
      'POST',
      '/orders/${Uri.encodeComponent(orderId)}/extension',
      body: {'accept': accept},
    );
  }

  Future<void> sendMessage({
    required String orderId,
    required String body,
    List<Map<String, dynamic>> attachments = const [],
  }) async {
    if (body.trim().isEmpty && attachments.isEmpty) return;
    _noContact(body);
    await api.mutate(
      'POST',
      '/orders/${Uri.encodeComponent(orderId)}/messages',
      body: {'body': body.trim(), 'attachments': attachments},
    );
  }

  Future<void> markRead(String orderId) async {
    await api.mutate('POST', '/orders/${Uri.encodeComponent(orderId)}/read', body: {})
        .catchError((_) => <String, dynamic>{});
  }

  Future<void> setEphemeral(String orderId, bool on) async {
    await api.mutate(
      'POST',
      '/orders/${Uri.encodeComponent(orderId)}/ephemeral',
      body: {'on': on},
    );
  }

  Future<void> reportProblem({
    required String orderId,
    required String reason,
    String detail = '',
  }) async {
    if (reason.trim().isEmpty) {
      throw DomainError('Choisissez ce qui ne va pas.');
    }
    await api.mutate(
      'POST',
      '/orders/${Uri.encodeComponent(orderId)}/report',
      body: {'reason': reason.trim(), 'detail': detail.trim()},
    );
  }

  Future<void> leaveReview({
    required String orderId,
    required int rating,
    String? comment,
  }) async {
    if (rating < 1 || rating > 5) {
      throw DomainError('Choisissez une note de 1 à 5 étoiles.');
    }
    if ((comment?.trim().length ?? 0) > 500) {
      throw DomainError('Votre avis dépasse 500 caractères.');
    }
    await api.mutate(
      'POST',
      '/orders/${Uri.encodeComponent(orderId)}/review',
      body: {
        'rating': rating,
        if (comment != null && comment.trim().isNotEmpty) 'comment': comment.trim(),
      },
    );
  }

  Future<void> sendPaymentRequest(String orderId, String listingId) async {
    await api.mutate(
      'POST',
      '/orders/${Uri.encodeComponent(orderId)}/payment-requests',
      body: {'listingId': listingId},
    );
  }

  Future<void> openPaymentRequest(String orderId, String messageId) async {
    await api.mutate(
      'POST',
      '/orders/${Uri.encodeComponent(orderId)}/messages/${Uri.encodeComponent(messageId)}/open',
      body: {},
    );
  }

  Future<void> blockSeller(String sellerId, bool blocked) async {
    await api.mutate(
      'POST',
      '/blocks',
      body: {'sellerId': sellerId, 'blocked': blocked},
    );
  }

  Future<void> setSellerTags(String orderId, List<String> tags) async {
    await api.mutate(
      'PATCH',
      '/orders/${Uri.encodeComponent(orderId)}/seller-meta',
      body: {'tags': tags},
    );
  }

  Future<void> setPinned(String orderId, bool pinned) async {
    await api.mutate(
      'PATCH',
      '/orders/${Uri.encodeComponent(orderId)}/seller-meta',
      body: {'pinned': pinned},
    );
  }
}
