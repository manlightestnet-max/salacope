import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../../core/design/colors.dart';
import '../../../../core/design/typography.dart';
import '../../domain/catalog_model.dart';
import 'listing_cover.dart';
import 'listing_price.dart';

class ListingCard extends StatelessWidget {
  final ListingView view;
  final VoidCallback? onTap;
  final VoidCallback? onFavorite;
  final bool isFavorite;
  final String? heroTag;

  const ListingCard({
    super.key,
    required this.view,
    this.onTap,
    this.onFavorite,
    this.isFavorite = false,
    this.heroTag,
  });

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final listing = view.listing;
    final seller = view.seller;
    final breadcrumb = cardBreadcrumb(listing);
    final sellerName = seller?.merchant?.storeName ?? seller?.name ?? 'Créateur Salacope';

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.all(4.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Hero(
              tag: heroTag ?? 'card_${listing.id}',
              // The flight happens in the overlay, outside any Material: the heart's ink needs one.
              flightShuttleBuilder: (_, _, _, _, toContext) => Material(
                type: MaterialType.transparency,
                child: (toContext.widget as Hero).child,
              ),
              child: ListingCover(
                src: listing.coverImage,
                category: listing.category,
              overlay: Align(
                alignment: Alignment.topRight,
                child: Padding(
                  padding: const EdgeInsets.all(6.0),
                  child: InkWell(
                    onTap: onFavorite,
                    borderRadius: BorderRadius.circular(9999),
                    child: Container(
                      width: 32,
                      height: 32,
                      decoration: BoxDecoration(
                        color: colors.canvas.withValues(alpha: 0.75),
                        shape: BoxShape.circle,
                        border: Border.all(color: colors.canvasBorder, width: 0.5),
                      ),
                      child: Icon(
                        isFavorite ? LucideIcons.heartHandshake : LucideIcons.heart,
                        size: 16,
                        color: isFavorite ? colors.accent : colors.textMuted,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 10),
            // Breadcrumb: "Type › Détail"
            Row(
              children: [
                Text(
                  breadcrumb[0],
                  style: TextStyle(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w500,
                    color: colors.textMuted,
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  child: Icon(
                    LucideIcons.chevronRight,
                    size: 11,
                    color: colors.textMuted,
                  ),
                ),
                Expanded(
                  child: Text(
                    breadcrumb[1],
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w500,
                      color: colors.textMuted,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            // Title
            Text(
              listing.title,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: SalacopeTypography.bodyStrong.copyWith(
                color: colors.textPrimary,
                height: 1.25,
              ),
            ),
            const SizedBox(height: 4),
            // Seller
            Row(
              children: [
                Expanded(
                  child: Text(
                    sellerName,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 12.5,
                      color: colors.textMuted,
                    ),
                  ),
                ),
                if (seller?.merchant?.verified == true)
                  Padding(
                    padding: const EdgeInsets.only(left: 4),
                    child: Icon(
                      LucideIcons.badgeCheck,
                      size: 13,
                      color: colors.accent,
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 8),
            // Price
            ListingPrice(
              listing: listing,
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w700,
                color: colors.accent,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
