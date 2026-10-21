import '../db/models/order.dart';

/// Why a refund to a phone is smaller than what was paid (shown wherever the amounts are). Same words as the web
/// (`src/shared/domain/refund.ts`).
const String refundFeesWhy = 'Ces frais font partie de la maintenance et des opérations du réseau (opérateur mobile et LightPay).';

/// The two ways a payment comes back, in plain words.
const String refundRule =
    'Payé par mobile money : remboursé sur le même numéro, moins les frais de retrait (opérateur et LightPay). Payé par wallet LightPay : remboursé en totalité.';

/// "14:32", Congo time (UTC+1): when LightPay sends a refund that waits for its delay (null once that moment has passed).
String? refundDepartureTime(OrderRefund r, [DateTime? now]) {
  final at = r.releaseAt == null ? null : DateTime.tryParse(r.releaseAt!);
  if (at == null || !at.isAfter(now ?? DateTime.now())) return null;
  final congo = at.toUtc().add(const Duration(hours: 1));
  String two(int n) => n.toString().padLeft(2, '0');
  return '${two(congo.hour)}:${two(congo.minute)}';
}

/// What a refund came to, in one sentence ("Vous êtes remboursé de …").
String refundSentence(OrderRefund r, String Function(int) format, [DateTime? now]) {
  if (r.paid == 0) return 'Commande annulée : elle était gratuite, rien n’est à rembourser.';
  if (r.sent <= 0) return 'Le montant est trop faible pour couvrir les frais de retrait : contactez le support.';
  final departs = refundDepartureTime(r, now);
  final when = departs != null ? ' Le virement part à $departs.' : '';
  if (r.sent >= r.paid) return 'Vous êtes remboursé de ${format(r.paid)}.$when';
  return 'Vous êtes remboursé de ${format(r.sent)} : ${format(r.paid)} payés moins ${format(r.paid - r.sent)} de frais de retrait (opérateur et LightPay).$when';
}
