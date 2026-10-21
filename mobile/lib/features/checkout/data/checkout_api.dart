import '../../../core/api/api_client.dart';
import '../../../core/api/guest.dart';
import '../../../core/api/sync.dart';
import '../../../core/db/models/payment_attempt.dart';

final checkoutApi = CheckoutApi.instance;

/// What a buyer gets back if an order of [total] is cancelled (`GET /checkout/refund-preview`).
class RefundPreviewData {
  final int total;
  final int sent;
  final int operatorFee;
  final int lightpayFee;
  final bool varies;
  const RefundPreviewData({required this.total, required this.sent, required this.operatorFee, required this.lightpayFee, required this.varies});

  factory RefundPreviewData.fromJson(Map<String, dynamic> j) => RefundPreviewData(
        total: (j['total'] as num?)?.toInt() ?? 0,
        sent: (j['sent'] as num?)?.toInt() ?? 0,
        operatorFee: (j['operatorFee'] as num?)?.toInt() ?? 0,
        lightpayFee: (j['lightpayFee'] as num?)?.toInt() ?? 0,
        varies: j['varies'] == true,
      );
}

class CheckoutApi {
  static final CheckoutApi instance = CheckoutApi._();
  CheckoutApi._();

  final Map<int, RefundPreviewData> _refundPreviews = {};

  /// The last answer for this total, shown at once while the server is asked again.
  RefundPreviewData? lastRefundPreview(int total) => _refundPreviews[total];

  Future<RefundPreviewData> refundPreview(int total) async {
    final res = await api.request('GET', '/checkout/refund-preview?total=$total') as Map<String, dynamic>;
    return _refundPreviews[total] = RefundPreviewData.fromJson(res);
  }

  /// Starts a purchase. A free offer has no payment page: the order already exists (`free` = 'true', `orderId`).
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

    if (res['free'] == true && res['orderId'] != null) {
      return {'free': 'true', 'orderId': res['orderId'].toString()};
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
