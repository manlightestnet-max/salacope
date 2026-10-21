import 'dart:async';
import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:salacope/core/db/models/order.dart';
import 'package:salacope/core/db/store.dart';
import 'package:salacope/core/design/theme.dart';
import 'package:salacope/core/design/tokens.dart';
import 'package:salacope/core/design/typography.dart';
import 'package:salacope/core/domain/orders.dart';
import 'package:salacope/core/lib/format.dart';
import 'package:salacope/core/ui/s_button.dart';
import 'package:salacope/core/ui/s_image.dart';
import '../../../checkout/presentation/checkout_sheet.dart';
import '../../data/orders_api.dart';
import '../../domain/chat.dart';

class PaymentRequestCard extends StatefulWidget {
  final Order order;
  final OrderMessage message;
  final bool mine;

  const PaymentRequestCard({
    super.key,
    required this.order,
    required this.message,
    required this.mine,
  });

  @override
  State<PaymentRequestCard> createState() => _PaymentRequestCardState();
}

class _PaymentRequestCardState extends State<PaymentRequestCard> {
  Timer? _timer;
  bool _opening = false;

  @override
  void initState() {
    super.initState();
    _startTimerIfNeeded();
  }

  @override
  void didUpdateWidget(covariant PaymentRequestCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.message.request?.openedAt != widget.message.request?.openedAt) {
      _startTimerIfNeeded();
    }
  }

  void _startTimerIfNeeded() {
    _timer?.cancel();
    final req = widget.message.request;
    if (req == null) return;
    final state = computeRequestState(req);
    if (state.state == PaymentRequestStatus.open) {
      _timer = Timer.periodic(const Duration(seconds: 1), (_) {
        if (mounted) setState(() {});
      });
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _handleOpen() async {
    setState(() => _opening = true);
    try {
      await ordersApi.openPaymentRequest(widget.order.id, widget.message.id);
      _startTimerIfNeeded();
    } catch (_) {}
    if (mounted) setState(() => _opening = false);
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final request = widget.message.request;
    if (request == null) return const SizedBox.shrink();

    final reqState = computeRequestState(request);
    final state = db.state;

    final isPaid = request.openedAt != null &&
        request.openedAt!.isNotEmpty &&
        state.orders.any(
          (o) =>
              o.listingId == request.listingId &&
              o.buyerId == widget.order.buyerId &&
              o.createdAt.compareTo(request.openedAt!) >= 0,
        );

    final isBuyer = !widget.mine;

    String timerText;
    if (isPaid) {
      timerText = 'Payée.';
    } else if (reqState.state == PaymentRequestStatus.waiting) {
      timerText = isBuyer
          ? 'Valable $paymentRequestMinutes min dès que vous l’ouvrez.'
          : 'Pas encore ouverte par le client.';
    } else if (reqState.state == PaymentRequestStatus.open) {
      timerText = 'Expire dans ${formatCountdown(reqState.leftMs)}';
    } else {
      timerText = isBuyer
          ? 'Expirée : demandez au vendeur de la renvoyer.'
          : 'Expirée.';
    }

    return Container(
      width: 280,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: colors.surface,
        borderRadius: BorderRadius.circular(SalacopeTokens.radiusXl),
        border: Border.all(color: colors.canvasBorder, width: 0.8),
        boxShadow: SalacopeTokens.shadowSm,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(SalacopeTokens.radiusSm),
                child: Container(
                  width: 48,
                  height: 48,
                  color: colors.canvas,
                  child: SImage(
                    url: request.coverImage,
                    fit: BoxFit.cover,
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Demande de paiement',
                      style: SalacopeTypography.caption.copyWith(
                        color: colors.textMuted,
                      ),
                    ),
                    const SizedBox(height: 1),
                    Text(
                      request.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: SalacopeTypography.bodyStrong.copyWith(
                        color: colors.textPrimary,
                        fontSize: 13,
                      ),
                    ),
                    const SizedBox(height: 1),
                    Text(
                      formatXaf(request.priceXaf),
                      style: SalacopeTypography.bodyStrong.copyWith(
                        color: colors.accent,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Icon(
                LucideIcons.timer,
                size: 14,
                color: reqState.state == PaymentRequestStatus.expired
                    ? colors.textMuted
                    : colors.textSecondary,
              ),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  timerText,
                  style: SalacopeTypography.caption.copyWith(
                    color: reqState.state == PaymentRequestStatus.expired
                        ? colors.textMuted
                        : colors.textSecondary,
                    fontSize: 12,
                  ),
                ),
              ),
            ],
          ),
          if (isBuyer && !isPaid && reqState.state == PaymentRequestStatus.waiting) ...[
            const SizedBox(height: 10),
            SButton(
              label: 'Ouvrir la demande',
              variant: SButtonVariant.primary,
              size: SButtonSize.sm,
              pill: true,
              isLoading: _opening,
              onPressed: _opening ? null : _handleOpen,
            ),
          ],
          if (isBuyer && !isPaid && reqState.state == PaymentRequestStatus.open) ...[
            const SizedBox(height: 10),
            SButton(
              label: 'Payer ${formatXaf(request.priceXaf)}',
              variant: SButtonVariant.primary,
              size: SButtonSize.sm,
              pill: true,
              onPressed: () => openCheckout(context, request.listingId),
            ),
          ],
        ],
      ),
    );
  }
}
