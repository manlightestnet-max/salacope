enum PaymentAttemptStatus {
  pending,
  succeeded,
  failed,
  expired,
  cancelled;

  static PaymentAttemptStatus fromString(String val) {
    return PaymentAttemptStatus.values.firstWhere(
      (e) => e.name == val,
      orElse: () => PaymentAttemptStatus.pending,
    );
  }
}

enum PaymentFailure {
  declined,
  insufficientFunds,
  network;

  static PaymentFailure? fromString(String? val) {
    if (val == null) return null;
    switch (val) {
      case 'declined':
        return PaymentFailure.declined;
      case 'insufficient_funds':
        return PaymentFailure.insufficientFunds;
      case 'network':
        return PaymentFailure.network;
      default:
        return null;
    }
  }

  String get jsonValue {
    switch (this) {
      case PaymentFailure.declined:
        return 'declined';
      case PaymentFailure.insufficientFunds:
        return 'insufficient_funds';
      case PaymentFailure.network:
        return 'network';
    }
  }
}

class PaymentAttempt {
  final String id;
  final String code;
  final String buyerId;
  final String listingId;
  final String sellerId;
  final String channel;
  final String phone;
  final int amount;
  final PaymentAttemptStatus status;
  final PaymentFailure? failure;
  final String? orderId;
  final String? checkoutUrl;
  final String createdAt;
  final String updatedAt;

  const PaymentAttempt({
    required this.id,
    required this.code,
    required this.buyerId,
    required this.listingId,
    required this.sellerId,
    required this.channel,
    required this.phone,
    required this.amount,
    required this.status,
    this.failure,
    this.orderId,
    this.checkoutUrl,
    required this.createdAt,
    required this.updatedAt,
  });

  factory PaymentAttempt.fromJson(Map<String, dynamic> json) {
    return PaymentAttempt(
      id: json['id'] as String? ?? '',
      code: json['code'] as String? ?? '',
      buyerId: json['buyerId'] as String? ?? '',
      listingId: json['listingId'] as String? ?? '',
      sellerId: json['sellerId'] as String? ?? '',
      channel: json['channel'] as String? ?? '',
      phone: json['phone'] as String? ?? '',
      amount: (json['amount'] as num?)?.toInt() ?? 0,
      status: PaymentAttemptStatus.fromString(json['status'] as String? ?? ''),
      failure: PaymentFailure.fromString(json['failure'] as String?),
      orderId: json['orderId'] as String?,
      checkoutUrl: json['checkoutUrl'] as String?,
      createdAt: json['createdAt'] as String? ?? '',
      updatedAt: json['updatedAt'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'code': code,
    'buyerId': buyerId,
    'listingId': listingId,
    'sellerId': sellerId,
    'channel': channel,
    'phone': phone,
    'amount': amount,
    'status': status.name,
    if (failure != null) 'failure': failure!.jsonValue,
    if (orderId != null) 'orderId': orderId,
    if (checkoutUrl != null) 'checkoutUrl': checkoutUrl,
    'createdAt': createdAt,
    'updatedAt': updatedAt,
  };
}
