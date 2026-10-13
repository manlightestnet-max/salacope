import '../config/platform.dart';

class OrderPricing {
  final int subtotal;
  final int discount;
  final int total;
  final int fee;
  final int net;

  const OrderPricing({
    required this.subtotal,
    required this.discount,
    required this.total,
    required this.fee,
    required this.net,
  });
}

/// Order amounts: what the buyer pays and what the seller receives once released.
OrderPricing priceOrder(int subtotal, [String? kind]) {
  const discount = 0;
  final total = subtotal - discount;
  final fee = computeFee(total, kind);
  return OrderPricing(
    subtotal: subtotal,
    discount: discount,
    total: total,
    fee: fee,
    net: total - fee,
  );
}
