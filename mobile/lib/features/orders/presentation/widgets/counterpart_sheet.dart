import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:salacope/core/db/models/order.dart';
import 'package:salacope/core/db/store.dart';
import 'package:salacope/core/design/theme.dart';
import 'package:salacope/core/design/tokens.dart';
import 'package:salacope/core/design/typography.dart';
import 'package:salacope/core/domain/orders.dart';
import 'package:salacope/core/lib/format.dart';
import 'package:salacope/core/ui/s_avatar.dart';
import 'package:salacope/core/ui/s_badge.dart';
import 'package:salacope/core/ui/s_button.dart';
import 'package:salacope/core/ui/s_sheet.dart';

void showCounterpartSheet({
  required BuildContext context,
  required Order order,
  required Perspective perspective,
}) {
  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (ctx) => CounterpartSheet(order: order, perspective: perspective),
  );
}

class CounterpartSheet extends StatelessWidget {
  final Order order;
  final Perspective perspective;

  const CounterpartSheet({
    super.key,
    required this.order,
    required this.perspective,
  });

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final state = db.state;
    final isBuyer = perspective == Perspective.buyer;

    final otherUser = state.users.where(
      (u) => u.id == (isBuyer ? order.sellerId : order.buyerId),
    ).firstOrNull;

    final history = state.orders.where(
      (o) => o.sellerId == order.sellerId && o.buyerId == order.buyerId,
    ).toList()
      ..sort((a, b) => b.createdAt.compareTo(a.createdAt));

    final name = isBuyer
        ? (otherUser?.merchant?.storeName ?? otherUser?.name ?? 'Vendeur')
        : order.buyer.name;

    final logo = isBuyer ? otherUser?.merchant?.logo : null;
    final headline = isBuyer ? otherUser?.merchant?.headline : null;

    final totalAmount = history.where((o) => o.status != 'cancelled').fold<int>(
          0,
          (sum, o) => sum + (isBuyer ? o.amounts.total : o.amounts.net),
        );

    return SSheet(
      title: name,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              SAvatar(name: name, src: logo, size: SAvatarSize.lg),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      name,
                      style: SalacopeTypography.bodyStrong.copyWith(
                        color: colors.textPrimary,
                        fontSize: 16,
                      ),
                    ),
                    if (headline != null && headline.isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Text(
                        headline,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: SalacopeTypography.caption.copyWith(
                          color: colors.textSecondary,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Stat grid
          Row(
            children: [
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: colors.canvas,
                    borderRadius: BorderRadius.circular(SalacopeTokens.radiusMd),
                    border: Border.all(color: colors.canvasBorder, width: 0.8),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'COMMANDES',
                        style: SalacopeTypography.caption.copyWith(
                          color: colors.textMuted,
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${history.length}',
                        style: SalacopeTypography.title.copyWith(
                          color: colors.textPrimary,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: colors.canvas,
                    borderRadius: BorderRadius.circular(SalacopeTokens.radiusMd),
                    border: Border.all(color: colors.canvasBorder, width: 0.8),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        isBuyer ? 'PAYÉ AU TOTAL' : 'REÇU AU TOTAL (NET)',
                        style: SalacopeTypography.caption.copyWith(
                          color: colors.textMuted,
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        formatXaf(totalAmount),
                        style: SalacopeTypography.title.copyWith(
                          color: colors.textPrimary,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),

          Text(
            'COMMANDES EN COURS ET PASSÉES',
            style: SalacopeTypography.caption.copyWith(
              color: colors.textMuted,
              fontSize: 11,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: 8),

          Container(
            decoration: BoxDecoration(
              color: colors.surface,
              borderRadius: BorderRadius.circular(SalacopeTokens.radiusMd),
              border: Border.all(color: colors.canvasBorder, width: 0.8),
            ),
            child: ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: history.length,
              separatorBuilder: (_, _) => Divider(
                height: 1,
                thickness: 0.8,
                color: colors.canvasBorder,
              ),
              itemBuilder: (ctx, index) {
                final o = history[index];
                final info = statusDisplay(
                  status: o.status,
                  perspective: perspective,
                  extensionStatus: o.extension?.status,
                );

                final SBadgeTone badgeTone = switch (info.tone) {
                  OrderBadgeTone.success => SBadgeTone.success,
                  OrderBadgeTone.warning => SBadgeTone.warning,
                  OrderBadgeTone.danger => SBadgeTone.danger,
                  OrderBadgeTone.brand => SBadgeTone.brand,
                  OrderBadgeTone.info => SBadgeTone.info,
                  OrderBadgeTone.neutral => SBadgeTone.neutral,
                };

                return InkWell(
                  onTap: () {
                    Navigator.of(context).pop();
                    context.push('/orders/${o.id}');
                  },
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                o.item.title,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: SalacopeTypography.bodyStrong.copyWith(
                                  color: colors.textPrimary,
                                  fontSize: 13,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                '${o.number} · ${formatDate(o.createdAt)}',
                                style: SalacopeTypography.caption.copyWith(
                                  color: colors.textSecondary,
                                  fontSize: 11,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        SBadge(label: info.label, tone: badgeTone),
                        const SizedBox(width: 8),
                        Text(
                          formatXaf(isBuyer ? o.amounts.total : o.amounts.net),
                          style: SalacopeTypography.bodyStrong.copyWith(
                            color: colors.textPrimary,
                            fontSize: 13,
                          ),
                        ),
                        const SizedBox(width: 4),
                        Icon(LucideIcons.chevronRight, size: 16, color: colors.textMuted),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),

          if (isBuyer) ...[
            const SizedBox(height: 16),
            SButton(
              label: 'Voir la boutique',
              variant: SButtonVariant.secondary,
              size: SButtonSize.md,
              pill: true,
              onPressed: () {
                Navigator.of(context).pop();
                context.push('/boutique/${order.sellerId}');
              },
            ),
          ],
          const SizedBox(height: 8),
        ],
      ),
    );
  }
}
