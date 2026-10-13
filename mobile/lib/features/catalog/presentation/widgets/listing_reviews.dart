import 'package:flutter/material.dart';
import '../../../../core/db/models/interaction.dart';
import '../../../../core/design/colors.dart';
import '../../../../core/design/tokens.dart';
import '../../../../core/design/typography.dart';
import '../../../../core/ui/s_avatar.dart';

/// Stars in the text colour: full for the rating, grey for the rest.
class RatingStars extends StatelessWidget {
  final double rating;
  final double size;

  const RatingStars({super.key, required this.rating, this.size = 14});

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        for (var i = 1; i <= 5; i++)
          Icon(
            Icons.star_rounded,
            size: size,
            color: i <= rating.round() ? colors.textPrimary : colors.gray300,
          ),
      ],
    );
  }
}

String formatRating(double value) => value.toStringAsFixed(1).replaceAll('.', ',');

String _ago(String iso) {
  final at = DateTime.tryParse(iso);
  if (at == null) return '';
  final days = DateTime.now().difference(at).inDays;
  if (days < 1) return 'aujourd’hui';
  if (days < 30) return 'il y a $days j';
  final months = days ~/ 30;
  if (months < 12) return 'il y a $months mois';
  return 'il y a ${months ~/ 12} an${months ~/ 12 > 1 ? 's' : ''}';
}

/// What other buyers said of an offer: the average, how the ratings spread, then their words.
class ListingReviews extends StatefulWidget {
  final List<Review> reviews;

  /// On a store page each review says which offer it is about.
  final bool showItem;

  const ListingReviews({super.key, required this.reviews, this.showItem = false});

  @override
  State<ListingReviews> createState() => _ListingReviewsState();
}

class _ListingReviewsState extends State<ListingReviews> {
  static const int _firstShown = 3;
  bool _all = false;

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final reviews = widget.reviews;

    if (reviews.isEmpty) {
      return Text(
        'Pas encore d’avis. Ils apparaissent ici après un achat.',
        style: SalacopeTypography.body.copyWith(color: colors.textMuted),
      );
    }

    final average = reviews.fold<int>(0, (sum, r) => sum + r.rating) / reviews.length;
    final shown = _all ? reviews : reviews.take(_firstShown).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Text(
              formatRating(average),
              style: SalacopeTypography.title.copyWith(
                color: colors.textPrimary,
                fontSize: 32,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  for (var star = 5; star >= 1; star--)
                    _Bar(
                      star: star,
                      share: reviews.where((r) => r.rating == star).length / reviews.length,
                    ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 4),
        Text(
          '${reviews.length} avis',
          style: SalacopeTypography.caption.copyWith(color: colors.textMuted),
        ),
        const SizedBox(height: 16),
        for (final r in shown) _ReviewRow(review: r, showItem: widget.showItem),
        if (reviews.length > _firstShown)
          Padding(
            padding: const EdgeInsets.only(top: 4),
            child: GestureDetector(
              onTap: () => setState(() => _all = !_all),
              behavior: HitTestBehavior.opaque,
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Text(
                  _all ? 'Réduire' : 'Voir les ${reviews.length} avis',
                  style: SalacopeTypography.bodyStrong.copyWith(color: colors.textPrimary),
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class _Bar extends StatelessWidget {
  final int star;
  final double share;

  const _Bar({required this.star, required this.share});

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        children: [
          SizedBox(
            width: 10,
            child: Text(
              '$star',
              style: TextStyle(fontSize: 11, color: colors.textMuted),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(SalacopeTokens.radiusFull),
              child: LinearProgressIndicator(
                value: share,
                minHeight: 4,
                backgroundColor: colors.gray200,
                valueColor: AlwaysStoppedAnimation(colors.textPrimary),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ReviewRow extends StatelessWidget {
  final Review review;
  final bool showItem;

  const _ReviewRow({required this.review, required this.showItem});

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final name = (review.authorName ?? '').trim().isEmpty ? 'Acheteur' : review.authorName!.trim();
    final comment = review.comment?.trim() ?? '';

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SAvatar(name: name, size: SAvatarSize.md),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Text(
                        name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: SalacopeTypography.bodyStrong.copyWith(color: colors.textPrimary),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      _ago(review.createdAt),
                      style: SalacopeTypography.caption.copyWith(color: colors.textMuted),
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                RatingStars(rating: review.rating.toDouble(), size: 13),
                if (showItem && (review.itemTitle ?? '').isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 2),
                    child: Text(
                      review.itemTitle!,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: SalacopeTypography.caption.copyWith(color: colors.textMuted),
                    ),
                  ),
                if (comment.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Text(
                    comment,
                    style: SalacopeTypography.body.copyWith(
                      color: colors.textPrimary.withValues(alpha: 0.85),
                      height: 1.45,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
