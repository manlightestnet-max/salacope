import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../../core/design/colors.dart';
import '../../../../core/design/typography.dart';
import '../../domain/catalog_model.dart';
import 'listing_card.dart';

class ListingRail extends StatelessWidget {
  final String title;
  final List<ListingView> views;
  final VoidCallback? onSeeAll;
  final void Function(ListingView view)? onSelectListing;

  const ListingRail({
    super.key,
    required this.title,
    required this.views,
    this.onSeeAll,
    this.onSelectListing,
  });

  @override
  Widget build(BuildContext context) {
    if (views.isEmpty) return const SizedBox.shrink();
    final colors = context.colors;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                title,
                style: SalacopeTypography.title.copyWith(
                  color: colors.textPrimary,
                  fontWeight: FontWeight.w700,
                ),
              ),
              if (onSeeAll != null)
                InkWell(
                  onTap: onSeeAll,
                  borderRadius: BorderRadius.circular(4),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          'Voir tout',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: colors.accent,
                          ),
                        ),
                        const SizedBox(width: 4),
                        Icon(
                          LucideIcons.arrowRight,
                          size: 13,
                          color: colors.accent,
                        ),
                      ],
                    ),
                  ),
                ),
            ],
          ),
        ),
        SizedBox(
          height: 345,
          child: ListView.separated(
            padding: const EdgeInsets.symmetric(horizontal: 16.0),
            scrollDirection: Axis.horizontal,
            itemCount: views.length,
            separatorBuilder: (_, _) => const SizedBox(width: 14),
            itemBuilder: (context, index) {
              final item = views[index];
              return SizedBox(
                width: 180,
                child: ListingCard(
                  view: item,
                  onTap: () => onSelectListing?.call(item),
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 16),
      ],
    );
  }
}
