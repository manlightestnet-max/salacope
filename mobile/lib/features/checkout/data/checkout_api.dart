import '../../../core/api/api_client.dart';
import '../../../core/api/guest.dart';
import '../../../core/api/sync.dart';
import '../../../core/db/models/payment_attempt.dart';

final checkoutApi = CheckoutApi.instance;

class CheckoutApi {
  static final CheckoutApi instance = CheckoutApi._();
  CheckoutApi._();

  Future<Map<String, String>> startCheckout({
    required String listingId,
    Map<String, String>? brief,
    Map<String, String>? invoice,
    String? email,
  }) async {
    final body = <String, dynamic>{
      'email': ?email,
      'listingId': listingId,
      if (brief != null && brief.isNotEmpty) 'brief': brief,
      if (invoice != null && invoice.isNotEmpty) 'invoice': invoice,
    };

    final res = await api.mutate('POST', '/checkout', body: body);
    final guestKey = res['guestKey'] as String?;
    if (guestKey != null && guestKey.isNotEmpty) {
      await guest.save(guestKey);
      await syncService.reload();
    }

    final checkoutUrl = res['checkoutUrl'] as String? ?? '';
    final attemptMap = res['attempt'] as Map<String, dynamic>? ?? {};
    final attemptId = attemptMap['id'] as String? ?? '';

    return {
      'checkoutUrl': checkoutUrl,
      'attemptId': attemptId,
    };
  }

  Future<PaymentAttempt> refreshAttempt(String attemptId) async {
    final res = await api.mutate(
      'POST',
      '/checkout/${Uri.encodeComponent(attemptId)}/refresh',
    );
    final attemptMap = res['attempt'] as Map<String, dynamic>? ?? {};
    return PaymentAttempt.fromJson(attemptMap);
  }

  Future<void> cancelAttempt(String attemptId) async {
    await api.mutate(
      'POST',
      '/checkout/${Uri.encodeComponent(attemptId)}/cancel',
    );
  }
}
