import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../../core/db/store.dart';
import '../../../../core/ui/s_button.dart';
import '../../../../core/ui/s_empty_state.dart';
import '../../../../core/ui/s_page.dart';
import '../../../catalog/domain/catalog_model.dart';
import '../../../catalog/presentation/widgets/listing_card.dart';

class FavoritesScreen extends StatelessWidget {
  const FavoritesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: db,
      builder: (context, _) {
        final state = db.state;
        final currentUserId = state.sessionUserId;
        final favoriteListingIds = state.favorites
            .where((f) => currentUserId == null || f.userId == currentUserId)
            .map((f) => f.listingId)
            .toSet();

        final allViews = buildListingViews(state, includePrivate: true);
        final favoriteViews = allViews
            .where((v) => favoriteListingIds.contains(v.listing.id))
            .toList();

        return SPage(
          title: 'Favoris',
          leading: const BackButton(),
          slivers: [
            if (favoriteViews.isEmpty)
              SliverFillRemaining(
                hasScrollBody: false,
                child: SEmptyState(
                  icon: LucideIcons.heart,
                  title: 'Aucun favori',
                  description:
                      'Les offres que vous enregistrez apparaîtront ici pour les retrouver facilement.',
                  action: SButton(
                    label: 'Explorer le catalogue',
                    variant: SButtonVariant.primary,
                    size: SButtonSize.md,
                    pill: true,
                    onPressed: () => context.go('/'),
                  ),
                ),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                sliver: SliverGrid(
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    mainAxisSpacing: 16,
                    crossAxisSpacing: 16,
                    mainAxisExtent: 345,
                  ),
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      final item = favoriteViews[index];
                      return ListingCard(
                        view: item,
                        onTap: () => context.push('/l/${item.listing.id}'),
                      );
                    },
                    childCount: favoriteViews.length,
                  ),
                ),
              ),
          ],
        );
      },
    );
  }
}
