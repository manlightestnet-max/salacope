import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../../core/db/store.dart';
import '../../../../core/design/colors.dart';
import '../../../../core/design/tokens.dart';
import '../../../../core/design/typography.dart';
import '../../../../core/ui/s_avatar.dart';
import '../../../../core/ui/s_button.dart';
import '../../../../core/ui/s_empty_state.dart';
import '../../../../core/ui/s_page.dart';
import '../../../catalog/domain/catalog_model.dart';
import '../../../catalog/presentation/widgets/listing_card.dart';
import '../../data/library_api.dart';

class FollowingScreen extends StatelessWidget {
  const FollowingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;

    return ListenableBuilder(
      listenable: db,
      builder: (context, _) {
        final state = db.state;
        final currentUserId = state.sessionUserId;
        final follows = state.follows
            .where((f) => currentUserId == null || f.userId == currentUserId)
            .toList();

        final followedSellerIds = follows.map((f) => f.sellerId).toSet();
        final sellers = state.users
            .where((u) => followedSellerIds.contains(u.id) && u.merchant != null)
            .toList();

        final allViews = buildListingViews(state, includePrivate: true);

        return SPage(
          title: 'Abonnements',
          leading: const BackButton(),
          slivers: [
            if (sellers.isEmpty)
              SliverFillRemaining(
                hasScrollBody: false,
                child: SEmptyState(
                  icon: LucideIcons.userCheck,
                  title: 'Aucun abonnement',
                  description:
                      'Suivez des créateurs pour être averti de leurs nouvelles offres et publications.',
                  action: SButton(
                    label: 'Découvrir les créateurs',
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
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      final seller = sellers[index];
                      final merchant = seller.merchant!;
                      final sellerViews = allViews
                          .where((v) => v.seller?.id == seller.id)
                          .toList();

                      return Container(
                        margin: const EdgeInsets.only(bottom: 16),
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: colors.surface,
                          borderRadius: BorderRadius.circular(SalacopeTokens.radiusXl),
                          border: Border.all(color: colors.canvasBorder, width: 0.8),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                SAvatar(
                                  name: merchant.storeName.isNotEmpty
                                      ? merchant.storeName
                                      : seller.name,
                                  size: SAvatarSize.lg,
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        children: [
                                          Flexible(
                                            child: Text(
                                              merchant.storeName.isNotEmpty
                                                  ? merchant.storeName
                                                  : seller.name,
                                              style: SalacopeTypography.bodyStrong.copyWith(
                                                color: colors.textPrimary,
                                              ),
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                          ),
                                          if (merchant.verified == true)
                                            Padding(
                                              padding: const EdgeInsets.only(left: 6),
                                              child: Icon(
                                                LucideIcons.badgeCheck,
                                                size: 15,
                                                color: colors.accent,
                                              ),
                                            ),
                                        ],
                                      ),
                                      if (merchant.city.isNotEmpty) ...[
                                        const SizedBox(height: 2),
                                        Text(
                                          merchant.city,
                                          style: TextStyle(
                                            fontSize: 12,
                                            color: colors.textMuted,
                                          ),
                                        ),
                                      ],
                                    ],
                                  ),
                                ),
                                SButton(
                                  label: 'Abonné',
                                  variant: SButtonVariant.secondary,
                                  size: SButtonSize.sm,
                                  pill: true,
                                  onPressed: () async {
                                    if (currentUserId != null) {
                                      await libraryApi.toggleFollow(
                                        currentUserId: currentUserId,
                                        sellerId: seller.id,
                                      );
                                    }
                                  },
                                ),
                              ],
                            ),
                            if (merchant.headline.isNotEmpty) ...[
                              const SizedBox(height: 10),
                              Text(
                                merchant.headline,
                                style: TextStyle(
                                  fontSize: 13,
                                  color: colors.textMuted,
                                ),
                              ),
                            ],
                            if (sellerViews.isNotEmpty) ...[
                              const SizedBox(height: 14),
                              SizedBox(
                                height: 260,
                                child: ListView.separated(
                                  scrollDirection: Axis.horizontal,
                                  itemCount: sellerViews.length,
                                  separatorBuilder: (context, index) => const SizedBox(width: 12),
                                  itemBuilder: (context, i) {
                                    final v = sellerViews[i];
                                    return SizedBox(
                                      width: 160,
                                      child: ListingCard(
                                        view: v,
                                        onTap: () => context.push('/l/${v.listing.id}'),
                                      ),
                                    );
                                  },
                                ),
                              ),
                            ],
                          ],
                        ),
                      );
                    },
                    childCount: sellers.length,
                  ),
                ),
              ),
          ],
        );
      },
    );
  }
}
