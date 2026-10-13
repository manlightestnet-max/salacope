import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../../core/db/models/user.dart';
import '../../../../core/design/colors.dart';
import '../../../../core/design/typography.dart';
import '../../../../core/ui/s_avatar.dart';
import 'follow_button.dart';
import 'listing_reviews.dart';

const List<String> _months = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

String _since(String iso) {
  final at = DateTime.tryParse(iso);
  if (at == null) return '';
  return 'Vendeur depuis ${_months[at.month - 1]} ${at.year}';
}

/// A store, the way a profile reads on Instagram: the picture on the left and three figures on its right,
/// then the name, the @username, the line about it, and the buttons.
class StoreHeader extends StatelessWidget {
  final User seller;
  final int offers;
  final int sales;
  final int followers;
  final int reviews;
  final double? rating;
  final bool online;
  final bool isOwn;
  final bool isFollowing;
  final bool followLoading;
  final GlobalKey followKey;
  final VoidCallback onFollow;
  final VoidCallback onManage;
  final VoidCallback onShare;
  final VoidCallback onLogo;
  final VoidCallback onReviews;

  const StoreHeader({
    super.key,
    required this.seller,
    required this.offers,
    required this.sales,
    required this.followers,
    required this.reviews,
    required this.rating,
    required this.online,
    required this.isOwn,
    required this.isFollowing,
    required this.followLoading,
    required this.followKey,
    required this.onFollow,
    required this.onManage,
    required this.onShare,
    required this.onLogo,
    required this.onReviews,
  });

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final merchant = seller.merchant;
    final name = merchant?.storeName ?? seller.name;
    final handle = merchant?.handle;
    final headline = merchant?.headline.trim() ?? '';
    final where = [
      if ((merchant?.city ?? '').isNotEmpty) merchant!.city,
      _since(merchant?.activatedAt ?? seller.createdAt),
    ].where((p) => p.isNotEmpty).join(' · ');

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              GestureDetector(
                onTap: merchant?.logo == null ? null : onLogo,
                child: Stack(
                  clipBehavior: Clip.none,
                  children: [
                    SAvatar(name: name, src: merchant?.logo, size: SAvatarSize.xxl),
                    if (online)
                      Positioned(
                        right: 2,
                        bottom: 2,
                        child: Container(
                          width: 18,
                          height: 18,
                          decoration: BoxDecoration(
                            color: colors.emerald500,
                            shape: BoxShape.circle,
                            border: Border.all(color: colors.surface, width: 3),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(width: 20),
              Expanded(
                child: Row(
                  children: [
                    _Figure(value: '$offers', label: 'offres'),
                    _Figure(value: '$sales', label: 'ventes'),
                    _Figure(value: '$followers', label: 'abonnés'),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Flexible(
                child: Text(
                  name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: SalacopeTypography.title.copyWith(
                    color: colors.textPrimary,
                    fontSize: 17,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              if (merchant?.verified == true)
                Padding(
                  padding: const EdgeInsets.only(left: 5),
                  child: Icon(LucideIcons.badgeCheck, size: 18, color: colors.accent),
                ),
            ],
          ),
          if (handle != null && handle.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 1),
              child: Text(
                '@$handle',
                style: SalacopeTypography.body.copyWith(
                  color: colors.textMuted,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          if (online)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Row(
                children: [
                  Container(
                    width: 8,
                    height: 8,
                    decoration: BoxDecoration(color: colors.emerald500, shape: BoxShape.circle),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    'En ligne',
                    style: SalacopeTypography.caption.copyWith(
                      color: colors.emerald500,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
          if (headline.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              headline,
              style: SalacopeTypography.body.copyWith(
                color: colors.textPrimary,
                fontSize: 14.5,
                height: 1.4,
              ),
            ),
          ],
          if (where.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(where, style: SalacopeTypography.caption.copyWith(color: colors.textMuted)),
          ],
          if (rating != null) ...[
            const SizedBox(height: 8),
            GestureDetector(
              onTap: onReviews,
              behavior: HitTestBehavior.opaque,
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.star_rounded, size: 16, color: colors.textPrimary),
                  const SizedBox(width: 4),
                  Text(
                    '${formatRating(rating!)} · $reviews avis',
                    style: SalacopeTypography.bodyStrong.copyWith(color: colors.textPrimary),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: isOwn
                    ? _OutlineButton(label: 'Gérer ma boutique', onTap: onManage)
                    : KeyedSubtree(
                        key: followKey,
                        child: FollowButton(
                          isFollowing: isFollowing,
                          loading: followLoading,
                          onPressed: onFollow,
                        ),
                      ),
              ),
              const SizedBox(width: 8),
              _OutlineButton(icon: LucideIcons.share2, onTap: onShare),
            ],
          ),
        ],
      ),
    );
  }
}

class _Figure extends StatelessWidget {
  final String value;
  final String label;

  const _Figure({required this.value, required this.label});

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    return Expanded(
      child: Column(
        children: [
          Text(
            value,
            style: SalacopeTypography.title.copyWith(
              color: colors.textPrimary,
              fontSize: 18,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 1),
          Text(label, style: SalacopeTypography.caption.copyWith(color: colors.textMuted)),
        ],
      ),
    );
  }
}

class _OutlineButton extends StatelessWidget {
  final String? label;
  final IconData? icon;
  final VoidCallback onTap;

  const _OutlineButton({this.label, this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    return Material(
      color: Colors.transparent,
      shape: StadiumBorder(side: BorderSide(color: colors.gray300, width: 1)),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: EdgeInsets.symmetric(horizontal: label == null ? 14 : 16, vertical: 12),
          child: label != null
              ? Center(
                  child: Text(
                    label!,
                    style: SalacopeTypography.bodyStrong.copyWith(color: colors.textPrimary),
                  ),
                )
              : Icon(icon, size: 17, color: colors.textPrimary),
        ),
      ),
    );
  }
}
