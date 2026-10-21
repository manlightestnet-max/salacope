import 'package:flutter/material.dart';
import '../../../../core/db/models/order.dart';
import '../../../../core/design/colors.dart';
import '../../../../core/design/tokens.dart';
import '../../../../core/design/typography.dart';
import '../../../../core/domain/orders.dart';
import 'package:salacope/core/lib/format.dart';
import '../../../../core/ui/s_badge.dart';
import '../../../catalog/presentation/widgets/mini_cover.dart';

/// A cancelled order: struck through and in grey everywhere it is listed (cover, title, price), nothing in colour.
bool isVoidOrder(Order o) => o.status == 'cancelled';

SBadgeTone badgeToneOf(OrderBadgeTone t) => switch (t) {
      OrderBadgeTone.success => SBadgeTone.success,
      OrderBadgeTone.warning => SBadgeTone.warning,
      OrderBadgeTone.danger => SBadgeTone.danger,
      OrderBadgeTone.brand => SBadgeTone.brand,
      OrderBadgeTone.info => SBadgeTone.info,
      OrderBadgeTone.neutral => SBadgeTone.neutral,
    };

/// One order in a list (purchases, sales, conversations): the offer's cover in its shape, the title, a second line, and
/// on the right the date or the time of the last message, with the state or the unread count under it.
class OrderRow extends StatelessWidget {
  final Order order;
  final Perspective perspective;

  /// Second line: the counterpart, the last message…
  final String subtitle;
  final bool subtitleStrong;

  /// Top right: a date or a time.
  final String corner;
  final int unread;

  /// Shows the amount on the second line's right (purchases and sales).
  final bool showAmount;

  /// Something waits for this person on the order (accept, deliver, validate…): « À traiter » next to the state.
  final bool todo;
  final VoidCallback onTap;
  final EdgeInsets padding;

  const OrderRow({
    super.key,
    required this.order,
    required this.perspective,
    required this.subtitle,
    required this.corner,
    required this.onTap,
    this.subtitleStrong = false,
    this.unread = 0,
    this.showAmount = false,
    this.todo = false,
    this.padding = const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
  });

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final muted = isVoidOrder(order);
    final info = order.statusFor(perspective);
    final amount = perspective == Perspective.seller ? order.amounts.net : order.amounts.total;
    final strike = muted ? TextDecoration.lineThrough : null;

    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: padding,
        child: Row(
          children: [
            MiniCover(src: order.item.coverImage, category: order.item.category, size: 52, muted: muted),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          order.item.title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: SalacopeTypography.bodyStrong.copyWith(
                            color: muted ? colors.textMuted : colors.textPrimary,
                            decoration: strike,
                            decorationColor: colors.textMuted,
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Text(
                        corner,
                        style: SalacopeTypography.caption.copyWith(
                          color: unread > 0 ? colors.accent : colors.textMuted,
                          fontWeight: unread > 0 ? FontWeight.w600 : FontWeight.w400,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          subtitle,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: SalacopeTypography.caption.copyWith(
                            color: subtitleStrong && !muted ? colors.textPrimary : colors.textMuted,
                            fontWeight: subtitleStrong && !muted ? FontWeight.w600 : FontWeight.w400,
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      if (unread > 0)
                        Container(
                          constraints: const BoxConstraints(minWidth: 20),
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(color: colors.accent, borderRadius: BorderRadius.circular(SalacopeTokens.radiusFull)),
                          child: Text(
                            '$unread',
                            textAlign: TextAlign.center,
                            style: SalacopeTypography.small.copyWith(color: colors.onAccent, fontWeight: FontWeight.w700),
                          ),
                        )
                      else if (showAmount)
                        Text(
                          formatXaf(amount),
                          style: SalacopeTypography.bodyStrong.copyWith(
                            color: muted ? colors.textMuted : colors.textPrimary,
                            decoration: strike,
                            decorationColor: colors.textMuted,
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  muted
                      ? Text('Annulée', style: SalacopeTypography.small.copyWith(color: colors.textMuted))
                      : Wrap(
                          spacing: 6,
                          runSpacing: 4,
                          children: [
                            SBadge(label: info.label, tone: badgeToneOf(info.tone), dot: true),
                            if (todo) const SBadge(label: 'À traiter', tone: SBadgeTone.warning),
                          ],
                        ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
