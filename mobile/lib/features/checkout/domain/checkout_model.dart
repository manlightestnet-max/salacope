import '../../../core/db/models/payment_attempt.dart';

bool isValidPhone(String phone) => phone.replaceAll(RegExp(r'\D'), '').length >= 9;

String failureLabel(PaymentFailure failure) {
  switch (failure) {
    case PaymentFailure.declined:
      return 'Paiement refusé';
    case PaymentFailure.insufficientFunds:
      return 'Solde insuffisant';
    case PaymentFailure.network:
      return 'Service de paiement indisponible';
  }
}

String attemptOutcome(PaymentAttempt a) {
  switch (a.status) {
    case PaymentAttemptStatus.pending:
      return 'En attente de paiement';
    case PaymentAttemptStatus.succeeded:
      return 'Paiement confirmé';
    case PaymentAttemptStatus.failed:
      return a.failure != null ? failureLabel(a.failure!) : 'Paiement refusé';
    case PaymentAttemptStatus.expired:
      return 'Délai de paiement dépassé';
    case PaymentAttemptStatus.cancelled:
      return 'Paiement annulé';
  }
}
