import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/ui/s_page.dart';
import '../../../../core/ui/s_toast.dart';
import '../../data/checkout_api.dart';
import '../widgets/payment_progress.dart';

/// `/paiement/retour`: the return from LightPay when no payment sheet is open (the app was closed meanwhile, or the link
/// was opened from elsewhere). Same follow-up as the sheet; paid, it opens the purchase.
class PaymentReturnScreen extends StatelessWidget {
  final String attemptId;
  final bool cancelled;

  const PaymentReturnScreen({super.key, required this.attemptId, this.cancelled = false});

  void _leave(BuildContext context) {
    if (context.canPop()) {
      context.pop();
    } else {
      context.go('/');
    }
  }

  @override
  Widget build(BuildContext context) {
    return SPage(
      title: 'Paiement',
      leading: BackButton(onPressed: () => _leave(context)),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(24, 24, 24, 32),
        child: PaymentProgress(
          attemptId: attemptId,
          cancelled: cancelled,
          onPaid: (orderId) {
            SToast.success(context, 'Paiement confirmé');
            context.pushReplacement('/orders/$orderId');
          },
          onRetry: () async {
            // The attempt says which offer: back to it, with the payment sheet open.
            final listingId = await _listingOf(attemptId);
            if (!context.mounted) return;
            if (listingId == null) {
              _leave(context);
            } else {
              context.pushReplacement('/l/$listingId?acheter=1');
            }
          },
          onAbandoned: () => _leave(context),
          onSupport: () => context.push('/compte/support'),
        ),
      ),
    );
  }
}

Future<String?> _listingOf(String attemptId) async {
  try {
    final a = await checkoutApi.refreshAttempt(attemptId);
    return a.listingId.isEmpty ? null : a.listingId;
  } catch (_) {
    return null;
  }
}
