import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:intl/intl.dart';
import '../../../../core/db/store.dart';
import '../../../../core/design/colors.dart';
import '../../../../core/design/tokens.dart';
import '../../../../core/design/typography.dart';
import '../../../../core/domain/orders.dart';
import '../../../../core/ui/s_badge.dart';
import '../../../../core/ui/s_button.dart';
import '../../../../core/ui/s_empty_state.dart';
import '../../../../core/ui/s_image.dart';
import 'package:salacope/features/catalog/presentation/widgets/listing_price.dart';

class OrdersScreen extends StatelessWidget {
  const OrdersScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;

    return ListenableBuilder(
      listenable: db,
      builder: (context, _) {
        final state = db.state;
        final orders = state.orders;

        return Scaffold(
          backgroundColor: colors.canvas,
          appBar: AppBar(
            backgroundColor: colors.surface,
            elevation: 0,
            title: Text(
              'Mes achats',
              style: SalacopeTypography.title.copyWith(
                color: colors.textPrimary,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          body: orders.isEmpty
              ? SEmptyState(
                  icon: LucideIcons.shoppingBag,
                  title: 'Aucun achat pour le moment',
                  description:
                      'Vos commandes, formations et e-books téléchargés apparaîtront ici une fois payés.',
                  action: SButton(
                    label: 'Explorer le catalogue',
                    variant: SButtonVariant.secondary,
                    size: SButtonSize.sm,
                    pill: true,
                    onPressed: () => context.go('/'),
                  ),
                )
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: orders.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 12),
                  itemBuilder: (context, index) {
                    final order = orders[index];
                    final perspective = perspectiveOf(
                          buyerId: order.buyerId,
                          sellerId: order.sellerId,
                          userId: state.sessionUserId ?? '',
                        ) ??
                        Perspective.buyer;

                    final info = statusDisplay(
                      status: order.status,
                      perspective: perspective,
                      extensionStatus: order.extension?.status,
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
                      onTap: () => context.push('/orders/${order.id}'),
                      borderRadius: BorderRadius.circular(SalacopeTokens.radiusXl),
                      child: Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: colors.surface,
                          borderRadius: BorderRadius.circular(SalacopeTokens.radiusXl),
                          border: Border.all(color: colors.canvasBorder, width: 0.8),
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Thumbnail
                            Container(
                              width: 64,
                              height: 64,
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(SalacopeTokens.radiusLg),
                                color: colors.canvasSubtle,
                              ),
                              clipBehavior: Clip.antiAlias,
                              child: SImage(
                                url: order.item.coverImage,
                                fit: BoxFit.cover,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        order.number,
                                        style: TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w600,
                                          color: colors.textMuted,
                                        ),
                                      ),
                                      SBadge(
                                        label: info.label,
                                        tone: badgeTone,
                                        dot: true,
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    order.item.title,
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: SalacopeTypography.bodyStrong.copyWith(
                                      color: colors.textPrimary,
                                      height: 1.25,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        ListingPrice.formatXaf(order.amounts.total),
                                        style: TextStyle(
                                          fontSize: 14,
                                          fontWeight: FontWeight.w700,
                                          color: colors.accent,
                                        ),
                                      ),
                                      Text(
                                        _formatDate(order.createdAt),
                                        style: TextStyle(
                                          fontSize: 11.5,
                                          color: colors.textMuted,
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
        );
      },
    );
  }

  String _formatDate(String iso) {
    try {
      final dt = DateTime.parse(iso).toLocal();
      return DateFormat('d MMM y', 'fr_FR').format(dt);
    } catch (_) {
      return '';
    }
  }
}
