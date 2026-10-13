import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:salacope/core/lib/format.dart';
import '../../../../core/db/models/payment_attempt.dart';
import '../../../../core/design/colors.dart';
import '../../../../core/design/typography.dart';
import '../../../../core/ui/handoff.dart';
import '../../../../core/ui/s_button.dart';
import '../../../../core/ui/s_empty_state.dart';
import '../../../../core/ui/s_page.dart';
import '../../../../core/ui/s_toast.dart';
import '../../data/checkout_api.dart';
import '../../data/lightpay_launcher.dart';
import '../../domain/checkout_model.dart';
import '../widgets/payment_code.dart';

class PaymentReturnScreen extends StatefulWidget {
  final String attemptId;
  final bool cancelled;

  const PaymentReturnScreen({
    super.key,
    required this.attemptId,
    this.cancelled = false,
  });

  @override
  State<PaymentReturnScreen> createState() => _PaymentReturnScreenState();
}

class _PaymentReturnScreenState extends State<PaymentReturnScreen> with WidgetsBindingObserver {
  PaymentAttempt? _attempt;
  bool _checking = true;
  String? _error;
  int _polls = 0;
  Timer? _timer;

  static const int _maxPolls = 20;
  static const Duration _pollInterval = Duration(seconds: 3);

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _startPolling();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _timer?.cancel();
    super.dispose();
  }

  /// Back from the LightPay app (or its page): the payment may have taken minutes (PIN, Mobile Money approval on the
  /// phone). The server is asked again at once, whatever happened before.
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state != AppLifecycleState.resumed) return;
    if (_attempt?.status == PaymentAttemptStatus.succeeded) return;
    _timer?.cancel();
    _polls = 0;
    setState(() => _checking = true);
    _check();
  }

  void _startPolling() {
    _check();
  }

  Future<void> _check() async {
    if (!mounted) return;
    try {
      final a = await checkoutApi.refreshAttempt(widget.attemptId);
      if (!mounted) return;

      setState(() {
        _attempt = a;
        _error = null;
      });

      _polls += 1;

      if (a.status == PaymentAttemptStatus.succeeded && a.orderId != null) {
        SToast.success(context, 'Paiement confirmé');
        // Straight to the purchase: its file (digital product) or its conversation with the seller (service).
        if (mounted) context.go('/orders/${a.orderId}');
        return;
      }

      if (a.status == PaymentAttemptStatus.pending &&
          !widget.cancelled &&
          _polls < _maxPolls) {
        _timer = Timer(_pollInterval, _check);
      } else {
        setState(() {
          _checking = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString().replaceFirst(RegExp(r'^[a-zA-Z0-9_]+Error:\s*'), '');
          _checking = false;
        });
      }
    }
  }

  Future<void> _resumePayment(String url) async {
    await openLightPayCheckout(context, url);
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final attempt = _attempt;

    return SPage(
      title: 'Retour de paiement',
      leading: BackButton(
        onPressed: () {
          if (context.canPop()) {
            context.pop();
          } else {
            context.go('/');
          }
        },
      ),
      slivers: [
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 32),
            child: Builder(
              builder: (context) {
                if (attempt == null && _checking) {
                  return const Padding(
                    padding: EdgeInsets.symmetric(vertical: 40),
                    child: Handoff(
                      from: Brand.lightpay,
                      to: Brand.salacope,
                      title: 'Vérification de votre paiement…',
                      description: 'LightPay confirme votre paiement auprès de l’opérateur.',
                    ),
                  );
                }

                if (attempt == null && _error != null) {
                  return SEmptyState(
                    icon: LucideIcons.circleAlert,
                    title: 'Paiement introuvable',
                    description: _error!,
                    action: SButton(
                      label: 'Mes achats',
                      variant: SButtonVariant.primary,
                      size: SButtonSize.md,
                      pill: true,
                      onPressed: () => context.go('/orders'),
                    ),
                  );
                }

                if (attempt != null &&
                    attempt.status == PaymentAttemptStatus.pending &&
                    _checking) {
                  return const Padding(
                    padding: EdgeInsets.symmetric(vertical: 40),
                    child: Handoff(
                      from: Brand.lightpay,
                      to: Brand.salacope,
                      title: 'Confirmation du paiement…',
                      description:
                          'LightPay confirme votre paiement. Cela prend quelques secondes.',
                    ),
                  );
                }

                if (attempt != null && attempt.status == PaymentAttemptStatus.pending) {
                  return Column(
                    children: [
                      Icon(
                        LucideIcons.clock,
                        size: 40,
                        color: colors.textMuted,
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'Paiement pas encore reçu',
                        style: SalacopeTypography.title.copyWith(
                          color: colors.textPrimary,
                          fontWeight: FontWeight.w700,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 6),
                      Text(
                        '${formatXaf(attempt.amount)} · rien n’a été commandé tant que le paiement n’est pas confirmé.',
                        style: TextStyle(fontSize: 13, color: colors.textMuted),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 24),
                      PaymentCode(code: attempt.code),
                      const SizedBox(height: 24),
                      if (attempt.checkoutUrl != null &&
                          attempt.checkoutUrl!.isNotEmpty) ...[
                        SButton(
                          label: 'Reprendre le paiement',
                          variant: SButtonVariant.primary,
                          size: SButtonSize.lg,
                          pill: true,
                          isFullWidth: true,
                          onPressed: () => _resumePayment(attempt.checkoutUrl!),
                        ),
                        const SizedBox(height: 10),
                      ],
                      SButton(
                        label: 'Abandonner',
                        variant: SButtonVariant.ghost,
                        size: SButtonSize.md,
                        isFullWidth: true,
                        onPressed: () async {
                          await checkoutApi.cancelAttempt(attempt.id);
                          if (context.mounted) {
                            context.go('/');
                          }
                        },
                      ),
                    ],
                  );
                }

                if (attempt != null && attempt.status == PaymentAttemptStatus.succeeded) {
                  return SEmptyState(
                    icon: LucideIcons.circleCheck,
                    title: 'Paiement confirmé',
                    description: 'Votre commande est en cours d’ouverture…',
                    action: SButton(
                      label: 'Voir mes achats',
                      variant: SButtonVariant.primary,
                      size: SButtonSize.md,
                      pill: true,
                      onPressed: () => context.go('/orders'),
                    ),
                  );
                }

                // Failed, expired or cancelled
                return Column(
                  children: [
                    Icon(
                      LucideIcons.circleX,
                      size: 40,
                      color: colors.danger,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      attempt != null ? attemptOutcome(attempt) : 'Paiement non finalisé',
                      style: SalacopeTypography.title.copyWith(
                        color: colors.textPrimary,
                        fontWeight: FontWeight.w700,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Aucune commande n’a été créée. Gardez ce code si vous contactez le support.',
                      style: TextStyle(fontSize: 13, color: colors.textMuted),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 24),
                    if (attempt != null) PaymentCode(code: attempt.code),
                    const SizedBox(height: 24),
                    if (attempt != null)
                      SButton(
                        label: 'Réessayer',
                        variant: SButtonVariant.primary,
                        size: SButtonSize.lg,
                        pill: true,
                        isFullWidth: true,
                        onPressed: () => context.push('/checkout/${attempt.listingId}'),
                      ),
                    const SizedBox(height: 10),
                    SButton(
                      label: 'Contacter le support',
                      variant: SButtonVariant.ghost,
                      size: SButtonSize.md,
                      isFullWidth: true,
                      onPressed: () => context.push('/compte/support'),
                    ),
                  ],
                );
              },
            ),
          ),
        ),
      ],
    );
  }
}
