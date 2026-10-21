import '../db/models/order.dart';

enum Perspective {
  buyer,
  seller,
}

const int maxMessageImages = 3;

bool isImageType(String? type) =>
    (type ?? '').startsWith('image/');

const int paymentRequestMinutes = 5;

const int maxSellerTags = 5;

List<String> cleanSellerTags(dynamic tags) {
  if (tags is! List) return [];
  final cleanSet = <String>{};
  for (final t in tags) {
    final s = t.toString().trim().toLowerCase().replaceAll(RegExp(r'\s+'), ' ');
    final sliced = s.length > 24 ? s.substring(0, 24) : s;
    if (sliced.isNotEmpty) {
      cleanSet.add(sliced);
    }
  }
  return cleanSet.take(maxSellerTags).toList();
}

Perspective? perspectiveOf({
  required String buyerId,
  required String sellerId,
  required String userId,
}) {
  if (buyerId == userId) return Perspective.buyer;
  if (sellerId == userId) return Perspective.seller;
  return null;
}

int revisionsLeft({int revisions = 0, int revisionsUsed = 0}) =>
    (revisions - revisionsUsed).clamp(0, 999);

bool hasPendingExtension(String? extensionStatus) =>
    extensionStatus == 'pending';

class OrderPermissions {
  final bool accept;
  final bool deliver;
  final bool cancel;
  final bool confirm;
  final bool dispute;
  final bool revise;
  final bool extend;
  final bool answerExtension;
  final bool message;

  const OrderPermissions({
    required this.accept,
    required this.deliver,
    required this.cancel,
    required this.confirm,
    required this.dispute,
    required this.revise,
    required this.extend,
    required this.answerExtension,
    required this.message,
  });
}

OrderPermissions permissionsFor({
  required String status,
  required String kind,
  required Perspective? perspective,
  int revisions = 0,
  int revisionsUsed = 0,
  String? extensionStatus,
}) {
  final seller = perspective == Perspective.seller;
  final buyer = perspective == Perspective.buyer;
  final isService = kind == 'service';
  final pendingExt = hasPendingExtension(extensionStatus);
  final revsLeft = revisionsLeft(revisions: revisions, revisionsUsed: revisionsUsed);

  return OrderPermissions(
    accept: seller && isService && status == 'paid',
    // A service is delivered once accepted: accepting comes first (it starts the clock and opens the discussion).
    deliver: seller && isService && status == 'in_progress',
    cancel: (seller && (status == 'paid' || status == 'in_progress')) ||
        (buyer && isService && status == 'paid'),
    // A digital product is never confirmed by the buyer: the money stays held for Salacope's delay, then is paid out.
    confirm: buyer && isService && status == 'delivered',
    dispute: buyer && status == 'delivered',
    revise: buyer && isService && status == 'delivered' && revsLeft > 0,
    extend: seller && isService && status == 'in_progress' && !pendingExt,
    answerExtension: buyer && status == 'in_progress' && pendingExt,
    // Until the seller has accepted a service order nobody writes: the discussion opens with the acceptance.
    message: perspective != null && status != 'cancelled' && !(isService && status == 'paid'),
  );
}

/// [permissionsFor] read from the order itself.
OrderPermissions orderPermissions(Order order, Perspective? perspective) => permissionsFor(
      status: order.status,
      kind: order.item.kind,
      perspective: perspective,
      revisions: order.item.revisions ?? 0,
      revisionsUsed: order.revisionsUsed ?? 0,
      extensionStatus: order.extension?.status,
    );

/// How the order was paid (the buyer picks on LightPay). Same words as the web (`paymentMethodLabel`).
String paymentMethodLabel(OrderPayment payment) => switch (payment.channel) {
      'MTN_MOMO_COG' => 'MTN MoMo',
      'AIRTEL_COG' => 'Airtel Money',
      _ => payment.via == 'free'
          ? 'Offre gratuite'
          : payment.via == 'wallet'
              ? 'Wallet LightPay'
              : 'Mobile Money via LightPay',
    };

enum OrderBadgeTone {
  neutral,
  success,
  warning,
  danger,
  info,
  brand,
}

class OrderStatusInfo {
  final String label;
  final OrderBadgeTone tone;

  const OrderStatusInfo({required this.label, required this.tone});
}

OrderStatusInfo statusDisplay({
  required String status,
  required Perspective perspective,
  String? kind,
  String? extensionStatus,
  bool isLate = false,
  bool isRevising = false,
}) {
  switch (status) {
    case 'paid':
      return perspective == Perspective.seller
          ? const OrderStatusInfo(label: 'À accepter', tone: OrderBadgeTone.warning)
          : const OrderStatusInfo(label: 'En attente du vendeur', tone: OrderBadgeTone.info);
    case 'in_progress':
      if (hasPendingExtension(extensionStatus)) {
        return perspective == Perspective.buyer
            ? const OrderStatusInfo(label: 'Délai demandé', tone: OrderBadgeTone.warning)
            : const OrderStatusInfo(label: 'Délai en attente', tone: OrderBadgeTone.info);
      }
      if (isLate) {
        return const OrderStatusInfo(label: 'En retard', tone: OrderBadgeTone.danger);
      }
      return isRevising
          ? const OrderStatusInfo(label: 'Retouche en cours', tone: OrderBadgeTone.info)
          : const OrderStatusInfo(label: 'En cours', tone: OrderBadgeTone.info);
    case 'delivered':
      // A digital product is never validated by anyone: the file is there at once and the seller is paid by themselves at the end of the delay.
      if (kind == 'digital') {
        return perspective == Perspective.buyer
            ? const OrderStatusInfo(label: 'Fichier disponible', tone: OrderBadgeTone.success)
            : const OrderStatusInfo(label: 'Livré', tone: OrderBadgeTone.brand);
      }
      return perspective == Perspective.buyer
          ? const OrderStatusInfo(label: 'À valider', tone: OrderBadgeTone.warning)
          : const OrderStatusInfo(label: 'Livrée', tone: OrderBadgeTone.brand);
    case 'completed':
      return const OrderStatusInfo(label: 'Terminée', tone: OrderBadgeTone.success);
    case 'cancelled':
      return const OrderStatusInfo(label: 'Annulée', tone: OrderBadgeTone.neutral);
    case 'disputed':
      return const OrderStatusInfo(label: 'Litige', tone: OrderBadgeTone.danger);
    default:
      return const OrderStatusInfo(label: 'En cours', tone: OrderBadgeTone.info);
  }
}

enum FundsState {
  escrow,
  released,
  refunded,
  frozen,
}

FundsState fundsState(String status) => switch (status) {
      'completed' => FundsState.released,
      'cancelled' => FundsState.refunded,
      'disputed' => FundsState.frozen,
      _ => FundsState.escrow,
    };

enum SellerLane {
  disputed,
  late,
  toAccept,
  revision,
  toDeliver,
  waitingBuyer,
  completed,
  cancelled,
}

class SellerLaneInfo {
  final SellerLane lane;
  final String label;
  final bool todo;

  const SellerLaneInfo({required this.lane, required this.label, required this.todo});
}

const List<SellerLaneInfo> sellerLanes = [
  SellerLaneInfo(lane: SellerLane.disputed, label: 'Litiges', todo: true),
  SellerLaneInfo(lane: SellerLane.late, label: 'En retard', todo: true),
  SellerLaneInfo(lane: SellerLane.toAccept, label: 'À accepter', todo: true),
  SellerLaneInfo(lane: SellerLane.revision, label: 'Retouches demandées', todo: true),
  SellerLaneInfo(lane: SellerLane.toDeliver, label: 'À livrer', todo: true),
  SellerLaneInfo(lane: SellerLane.waitingBuyer, label: 'En attente du client', todo: false),
  SellerLaneInfo(lane: SellerLane.completed, label: 'Terminées', todo: false),
  SellerLaneInfo(lane: SellerLane.cancelled, label: 'Annulées', todo: false),
];

bool isOrderLate(String status, String? dueAt, [DateTime? now]) {
  if (status != 'in_progress' || dueAt == null || dueAt.isEmpty) return false;
  final dueTime = DateTime.tryParse(dueAt)?.millisecondsSinceEpoch ?? 0;
  final currentTime = (now ?? DateTime.now()).millisecondsSinceEpoch;
  return dueTime > 0 && dueTime < currentTime;
}

bool isOrderRevising(String status, List<dynamic>? events) {
  if (status != 'in_progress' || events == null || events.isEmpty) return false;
  for (final e in events.reversed) {
    final type = e is Map ? e['type']?.toString() : null;
    if (type == 'revision_requested') return true;
    if (type == 'accepted') return false;
  }
  return false;
}

bool orderNeedsAction({
  required String status,
  required Perspective perspective,
  String? kind,
  String? extensionStatus,
}) {
  if (perspective == Perspective.seller) {
    return status == 'paid' || status == 'in_progress' || status == 'disputed';
  }
  return (status == 'delivered' && kind == 'service') ||
      (status == 'in_progress' && hasPendingExtension(extensionStatus));
}

/// Something waits for this party on the order (accept, deliver, validate…): the web's `needsAction`.
bool needsAction(Order order, Perspective perspective) =>
    orderNeedsAction(status: order.status, perspective: perspective, kind: order.item.kind, extensionStatus: order.extension?.status);

extension OrderSellerHelpers on Order {
  /// Status wording for this party, from the order itself.
  OrderStatusInfo statusFor(Perspective perspective) => statusDisplay(
        status: status,
        perspective: perspective,
        kind: item.kind,
        extensionStatus: extension?.status,
        isLate: isLate(),
        isRevising: isRevising,
      );

  bool isLate([DateTime? now]) => isOrderLate(status, dueAt, now);

  bool get isRevising =>
      isOrderRevising(status, events.map((e) => e.toJson()).toList());

  SellerLane get lane {
    switch (status) {
      case 'disputed':
        return SellerLane.disputed;
      case 'paid':
        return SellerLane.toAccept;
      case 'in_progress':
        return isLate()
            ? SellerLane.late
            : isRevising
                ? SellerLane.revision
                : SellerLane.toDeliver;
      case 'delivered':
        return SellerLane.waitingBuyer;
      case 'completed':
        return SellerLane.completed;
      case 'cancelled':
        return SellerLane.cancelled;
      default:
        return SellerLane.toDeliver;
    }
  }

  String statusLabel(String perspective) {
    switch (status) {
      case 'paid':
        return perspective == 'seller' ? 'À accepter' : 'En attente du vendeur';
      case 'in_progress':
        if (isLate()) return 'En retard';
        if (isRevising) return 'Retouche en cours';
        return 'En cours';
      case 'delivered':
        if (item.kind == 'digital') return perspective == 'buyer' ? 'Fichier disponible' : 'Livré';
        return perspective == 'buyer' ? 'À valider' : 'Livrée';
      case 'completed':
        return 'Terminée';
      case 'cancelled':
        return 'Annulée';
      case 'disputed':
        return 'Litige';
      default:
        return 'En cours';
    }
  }
}

/// Same words as the web (`EVENT_LABEL` in src/features/orders/model.ts), for the server's event types.
String orderEventLabel(String type) => switch (type) {
      'paid' => 'Paiement reçu',
      'accepted' => 'Commande acceptée',
      'delivered' => 'Livraison effectuée',
      'completed' => 'Réception confirmée',
      'auto_completed' => 'Clôturée automatiquement',
      'cancelled' => 'Commande annulée, client remboursé',
      'funds_released' => 'Décision de Salacope : vendeur payé',
      'funds_refunded' => 'Décision de Salacope : client remboursé',
      'disputed' => 'Litige ouvert',
      'revision_requested' => 'Retouche demandée',
      'extension_requested' => 'Délai supplémentaire demandé',
      'extension_accepted' => 'Délai supplémentaire accepté',
      'extension_declined' => 'Délai supplémentaire refusé',
      _ => 'Mise à jour de la commande',
    };
