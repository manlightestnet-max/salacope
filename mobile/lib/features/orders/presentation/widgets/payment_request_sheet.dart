import 'package:flutter/material.dart';
import 'package:salacope/core/db/models/order.dart';
import 'package:salacope/core/db/store.dart';
import 'package:salacope/core/design/theme.dart';
import 'package:salacope/core/design/tokens.dart';
import 'package:salacope/core/design/typography.dart';
import 'package:salacope/core/domain/orders.dart';
import 'package:salacope/core/lib/format.dart';
import 'package:salacope/core/ui/s_empty_state.dart';
import 'package:salacope/core/ui/s_image.dart';
import 'package:salacope/core/ui/s_sheet.dart';
import '../../data/orders_api.dart';

void showPaymentRequestSheet({
  required BuildContext context,
  required Order order,
}) {
  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (ctx) => PaymentRequestSheet(order: order),
  );
}

class PaymentRequestSheet extends StatefulWidget {
  final Order order;

  const PaymentRequestSheet({super.key, required this.order});

  @override
  State<PaymentRequestSheet> createState() => _PaymentRequestSheetState();
}

class _PaymentRequestSheetState extends State<PaymentRequestSheet> {
  String? _sendingId;

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final state = db.state;
    final listings = state.listings
        // A free offer is never asked for in the chat: there is nothing to pay.
        .where((l) => l.sellerId == widget.order.sellerId && l.status == 'published' && l.priceXaf > 0)
        .toList();

    return SSheet(
      title: 'Demande de paiement',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            'Le client a $paymentRequestMinutes minutes pour payer, à partir du moment où il ouvre la demande.',
            style: SalacopeTypography.body.copyWith(
              color: colors.textSecondary,
              fontSize: 13,
            ),
          ),
          const SizedBox(height: 16),
          if (listings.isEmpty)
            const SEmptyState(
              title: 'Aucune offre en ligne',
              description: 'Publiez une offre active pour pouvoir la proposer au client.',
            )
          else
            Container(
              decoration: BoxDecoration(
                color: colors.surface,
                borderRadius: BorderRadius.circular(SalacopeTokens.radiusMd),
                border: Border.all(color: colors.canvasBorder, width: 0.8),
              ),
              child: ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: listings.length,
                separatorBuilder: (_, _) => Divider(
                  height: 1,
                  thickness: 0.8,
                  color: colors.canvasBorder,
                ),
                itemBuilder: (ctx, index) {
                  final l = listings[index];
                  final sending = _sendingId == l.id;

                  return InkWell(
                    onTap: _sendingId != null
                        ? null
                        : () async {
                            setState(() => _sendingId = l.id);
                            try {
                              await ordersApi.sendPaymentRequest(widget.order.id, l.id);
                              if (context.mounted) Navigator.of(context).pop();
                            } catch (e) {
                              if (context.mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text(e.toString()),
                                    backgroundColor: colors.danger,
                                  ),
                                );
                              }
                            } finally {
                              if (mounted) setState(() => _sendingId = null);
                            }
                          },
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      child: Row(
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(SalacopeTokens.radiusSm),
                            child: SizedBox(
                              width: 44,
                              height: 44,
                              child: SImage(url: l.coverImage, fit: BoxFit.cover),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  l.title,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: SalacopeTypography.bodyStrong.copyWith(
                                    color: colors.textPrimary,
                                    fontSize: 13,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  formatXaf(l.priceXaf),
                                  style: SalacopeTypography.bodyStrong.copyWith(
                                    color: colors.accent,
                                    fontSize: 13,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          if (sending)
                            SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: colors.accent,
                              ),
                            ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
          const SizedBox(height: 12),
        ],
      ),
    );
  }
}
