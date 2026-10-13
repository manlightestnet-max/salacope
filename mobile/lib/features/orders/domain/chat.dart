import '../../../core/db/models/order.dart';
import '../../../core/domain/orders.dart';

String counterpartIdOf(Order order, String userId) =>
    order.buyerId == userId ? order.sellerId : order.buyerId;

Perspective sideOf(Order order, String userId) =>
    order.buyerId == userId ? Perspective.buyer : Perspective.seller;

int orderUnreadCount(Order order, String userId) {
  final side = sideOf(order, userId);
  final readAt = side == Perspective.buyer
      ? (order.chat.read.buyer ?? '')
      : (order.chat.read.seller ?? '');
  return order.messages
      .where((m) => m.authorId != userId && m.at.compareTo(readAt) > 0)
      .length;
}

enum MessageStatus {
  sent,
  received,
  read,
}

MessageStatus messageStatusOf(Order order, OrderMessage message, String userId) {
  final otherSide = sideOf(order, userId) == Perspective.buyer
      ? Perspective.seller
      : Perspective.buyer;
  final readAt = otherSide == Perspective.buyer
      ? (order.chat.read.buyer ?? '')
      : (order.chat.read.seller ?? '');
  final seenAt = otherSide == Perspective.buyer
      ? (order.chat.seen.buyer ?? '')
      : (order.chat.seen.seller ?? '');

  if (readAt.isNotEmpty && readAt.compareTo(message.at) >= 0) {
    return MessageStatus.read;
  }
  if (seenAt.isNotEmpty && seenAt.compareTo(message.at) >= 0) {
    return MessageStatus.received;
  }
  return MessageStatus.sent;
}

OrderMessage? lastMessageOf(Order order) =>
    order.messages.isNotEmpty ? order.messages.last : null;

String lastActivityAtOf(Order order) =>
    lastMessageOf(order)?.at ?? order.updatedAt;

String messagePreviewOf(OrderMessage? m) {
  if (m == null) return '';
  if (m.request != null) {
    return 'Demande de paiement · ${m.request!.title}';
  }
  if (m.body.trim().isNotEmpty) {
    return m.body.trim();
  }
  final n = m.attachments?.length ?? 0;
  return n > 0 ? '$n pièce${n > 1 ? 's' : ''} jointe${n > 1 ? 's' : ''}' : '';
}

enum PaymentRequestStatus {
  waiting,
  open,
  expired,
}

class RequestState {
  final PaymentRequestStatus state;
  final int leftMs;

  const RequestState({required this.state, required this.leftMs});
}

RequestState computeRequestState(PaymentRequest request, [DateTime? now]) {
  final currentTime = (now ?? DateTime.now()).millisecondsSinceEpoch;
  if (request.openedAt == null || request.openedAt!.isEmpty) {
    return const RequestState(
      state: PaymentRequestStatus.waiting,
      leftMs: paymentRequestMinutes * 60 * 1000,
    );
  }

  final opened = DateTime.tryParse(request.openedAt!)?.millisecondsSinceEpoch ?? 0;
  final expiresAt = opened + (paymentRequestMinutes * 60 * 1000);
  final left = expiresAt - currentTime;

  if (left > 0) {
    return RequestState(state: PaymentRequestStatus.open, leftMs: left);
  }
  return const RequestState(state: PaymentRequestStatus.expired, leftMs: 0);
}

String formatCountdown(int ms) {
  final s = (ms / 1000).ceil().clamp(0, 999999);
  final mins = s ~/ 60;
  final secs = s % 60;
  return '$mins:${secs.toString().padLeft(2, '0')}';
}

class Conversation {
  final String counterpartId;
  final List<Order> orders;
  final OrderMessage? last;
  final String lastAt;
  final int unread;

  const Conversation({
    required this.counterpartId,
    required this.orders,
    this.last,
    required this.lastAt,
    required this.unread,
  });
}

List<Conversation> buildConversations({
  required List<Order> orders,
  required String userId,
  required String kind,
}) {
  final byPerson = <String, List<Order>>{};

  for (final o in orders) {
    if (o.item.kind == kind && (o.buyerId == userId || o.sellerId == userId)) {
      final id = counterpartIdOf(o, userId);
      byPerson.putIfAbsent(id, () => []).add(o);
    }
  }

  final list = <Conversation>[];
  for (final entry in byPerson.entries) {
    final sortedOrders = List<Order>.from(entry.value)
      ..sort((a, b) => lastActivityAtOf(b).compareTo(lastActivityAtOf(a)));

    final last = lastMessageOf(sortedOrders.first);
    final lastAt = lastActivityAtOf(sortedOrders.first);
    final unread = sortedOrders.fold<int>(
      0,
      (sum, o) => sum + orderUnreadCount(o, userId),
    );

    list.add(Conversation(
      counterpartId: entry.key,
      orders: sortedOrders,
      last: last,
      lastAt: lastAt,
      unread: unread,
    ));
  }

  list.sort((a, b) => b.lastAt.compareTo(a.lastAt));
  return list;
}
