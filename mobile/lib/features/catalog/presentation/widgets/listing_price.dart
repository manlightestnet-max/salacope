import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../../core/db/models/listing.dart';
import '../../../../core/design/colors.dart';

class ListingPrice extends StatelessWidget {
  final Listing listing;
  final TextStyle? style;
  final bool showCompareAt;
  final bool showBadge;

  const ListingPrice({
    super.key,
    required this.listing,
    this.style,
    this.showCompareAt = true,
    this.showBadge = false,
  });

  static String formatXaf(num amount) {
    final formatter = NumberFormat.currency(
      locale: 'fr_FR',
      symbol: 'FCFA',
      decimalDigits: 0,
      customPattern: '#,##0 \u00a4',
    );
    return formatter.format(amount).trim();
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final defaultStyle = TextStyle(
      fontSize: 15,
      fontWeight: FontWeight.w600,
      color: colors.accent,
      fontFeatures: const [FontFeature.tabularFigures()],
    );

    final effectiveStyle = style ?? defaultStyle;
    final compareAt = listing.compareAtXaf;
    final hasCompare = showCompareAt && compareAt != null && compareAt > listing.priceXaf;

    int discountPercent = 0;
    if (hasCompare) {
      discountPercent = (((compareAt - listing.priceXaf) / compareAt) * 100).round();
    }

    return Row(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.baseline,
      textBaseline: TextBaseline.alphabetic,
      children: [
        Text(
          // A free offer reads « Gratuit » everywhere (the web's `formatPrice`).
          listing.priceXaf == 0 ? 'Gratuit' : formatXaf(listing.priceXaf),
          style: effectiveStyle,
        ),
        if (hasCompare) ...[
          const SizedBox(width: 8),
          Text(
            formatXaf(compareAt),
            style: TextStyle(
              fontSize: (effectiveStyle.fontSize ?? 15) * 0.85,
              fontWeight: FontWeight.w400,
              decoration: TextDecoration.lineThrough,
              color: colors.textMuted,
              fontFeatures: const [FontFeature.tabularFigures()],
            ),
          ),
          if (showBadge && discountPercent > 0) ...[
            const SizedBox(width: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
              decoration: BoxDecoration(
                color: colors.accent.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(4),
              ),
              child: Text(
                '-$discountPercent%',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: colors.accent,
                ),
              ),
            ),
          ],
        ],
      ],
    );
  }
}
