import 'dart:async';
import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:salacope/core/lib/format.dart';
import '../../../../core/db/models/payment_attempt.dart';
import '../../../../core/design/colors.dart';
import '../../../../core/design/typography.dart';
import '../../../../core/ui/handoff.dart';
import '../../../../core/ui/s_button.dart';
import '../../data/checkout_api.dart';
import '../../data/lightpay_launcher.dart';
import '../../domain/checkout_model.dart';
import 'payment_code.dart';

/// Where a payment stands, after the hand-off to LightPay: the LightPay → Salacope animation while LightPay confirms,
/// then "not received yet" (resume or give up) or "not completed" (try again). Paid: [onPaid] with the order.
/// Back from the LightPay app (or its page) the server is asked again at once. Used by the payment sheet and by the
/// return screen (address opened from outside the sheet).
class PaymentProgress extends StatefulWidget {
  final String attemptId;

  /// The buyer cancelled on LightPay's page (`?annule=1`): no waiting.
  final bool cancelled;
  final ValueChanged<String> onPaid;
  final VoidCallback onRetry;
  final VoidCallback onAbandoned;
  final VoidCallback? onSupport;

  const PaymentProgress({
    super.key,
    required this.attemptId,
    required this.onPaid,
    required this.onRetry,
    required this.onAbandoned,
    this.onSupport,
    this.cancelled = false,
  });

  @override
  State<PaymentProgress> createState() => PaymentProgressState();
}

class PaymentProgressState extends State<PaymentProgress> with WidgetsBindingObserver {
  static const int _maxPolls = 20;
  static const Duration _every = Duration(seconds: 3);

  PaymentAttempt? _attempt;
  bool _checking = true;
  String? _error;
  int _polls = 0;
  Timer? _timer;
  bool _done = false;

  /// Still waiting on LightPay (nothing decided): leaving needs a warning.
  bool get unsettled => !_done && (_attempt == null || _attempt!.status == PaymentAttemptStatus.pending);

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _check();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _timer?.cancel();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) recheck();
  }

  /// Back from LightPay (app resumed, or its return address): ask again, whatever happened before.
  void recheck() {
    if (!mounted || _done) return;
    _timer?.cancel();
    _polls = 0;
    setState(() => _checking = true);
    _check();
  }

  Future<void> _check() async {
    if (!mounted || _done) return;
    try {
      final a = await checkoutApi.refreshAttempt(widget.attemptId);
      if (!mounted || _done) return;
      _polls += 1;
      if (a.status == PaymentAttemptStatus.succeeded && a.orderId != null) {
        _done = true;
        widget.onPaid(a.orderId!);
        return;
      }
      final wait = a.status == PaymentAttemptStatus.pending && !widget.cancelled && _polls < _maxPolls;
      setState(() {
        _attempt = a;
        _error = null;
        _checking = wait;
      });
      if (wait) _timer = Timer(_every, _check);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString().replaceFirst(RegExp(r'^[a-zA-Z0-9_]+(Error|Exception):\s*'), '');
        _checking = false;
      });
    }
  }

  Future<void> _abandon() async {
    final a = _attempt;
    _done = true;
    _timer?.cancel();
    if (a != null) await checkoutApi.cancelAttempt(a.id).catchError((_) {});
    widget.onAbandoned();
  }

  @override
  Widget build(BuildContext context) {
    final a = _attempt;
    final Widget child;
    if (_checking) {
      child = Handoff(
        key: const ValueKey('wait'),
        from: Brand.lightpay,
        to: Brand.salacope,
        bare: true,
        title: a == null ? 'Paiement sur LightPay' : 'Confirmation du paiement',
        description: 'Validez sur votre téléphone. Cette page se met à jour toute seule.',
      );
    } else if (a == null) {
      child = _Outcome(
        key: const ValueKey('error'),
        icon: LucideIcons.wifiOff,
        title: 'Paiement introuvable',
        text: _error ?? 'Vérifiez votre connexion.',
        primary: SButton(label: 'Réessayer', variant: SButtonVariant.primary, size: SButtonSize.lg, pill: true, isFullWidth: true, onPressed: recheck),
      );
    } else if (a.status == PaymentAttemptStatus.pending) {
      child = _Outcome(
        key: const ValueKey('pending'),
        icon: LucideIcons.clock,
        title: 'Paiement pas encore reçu',
        text: '${formatXaf(a.amount)} · rien n’est commandé tant que le paiement n’est pas confirmé.',
        code: a.code,
        primary: (a.checkoutUrl ?? '').isEmpty
            ? SButton(label: 'Vérifier à nouveau', variant: SButtonVariant.primary, size: SButtonSize.lg, pill: true, isFullWidth: true, onPressed: recheck)
            : SButton(
                label: 'Reprendre le paiement',
                variant: SButtonVariant.primary,
                size: SButtonSize.lg,
                pill: true,
                isFullWidth: true,
                onPressed: () async {
                  await openLightPayCheckout(context, a.checkoutUrl!);
                  recheck();
                },
              ),
        secondary: SButton(label: 'Abandonner', variant: SButtonVariant.ghost, size: SButtonSize.md, isFullWidth: true, onPressed: _abandon),
      );
    } else {
      child = _Outcome(
        key: const ValueKey('failed'),
        icon: LucideIcons.circleX,
        danger: true,
        title: attemptOutcome(a),
        text: 'Aucune commande n’a été créée.',
        code: a.code,
        primary: SButton(label: 'Réessayer', variant: SButtonVariant.primary, size: SButtonSize.lg, pill: true, isFullWidth: true, onPressed: widget.onRetry),
        secondary: widget.onSupport == null
            ? null
            : SButton(label: 'Contacter le support', variant: SButtonVariant.ghost, size: SButtonSize.md, isFullWidth: true, onPressed: widget.onSupport),
      );
    }
    return AnimatedSwitcher(
      duration: MediaQuery.of(context).disableAnimations ? Duration.zero : const Duration(milliseconds: 220),
      child: child,
    );
  }
}

class _Outcome extends StatelessWidget {
  final IconData icon;
  final String title;
  final String text;
  final String? code;
  final bool danger;
  final Widget primary;
  final Widget? secondary;

  const _Outcome({
    super.key,
    required this.icon,
    required this.title,
    required this.text,
    required this.primary,
    this.code,
    this.secondary,
    this.danger = false,
  });

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Icon(icon, size: 36, color: danger ? colors.danger : colors.textMuted),
          const SizedBox(height: 14),
          Text(title, textAlign: TextAlign.center, style: SalacopeTypography.title.copyWith(color: colors.textPrimary)),
          const SizedBox(height: 6),
          Text(text, textAlign: TextAlign.center, style: SalacopeTypography.body.copyWith(color: colors.textMuted, height: 1.45)),
          if (code != null) ...[
            const SizedBox(height: 20),
            PaymentCode(code: code!),
          ],
          const SizedBox(height: 24),
          primary,
          if (secondary != null) ...[
            const SizedBox(height: 8),
            secondary!,
          ],
        ],
      ),
    );
  }
}
