import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:share_plus/share_plus.dart';
import '../../../../core/db/models/listing.dart';
import '../../../../core/db/store.dart';
import '../../../../core/design/colors.dart';
import '../../../../core/design/tokens.dart';
import '../../../../core/design/typography.dart';
import '../../../../core/ui/s_avatar.dart';
import '../../../../core/ui/s_button.dart';
import '../../../../core/ui/s_empty_state.dart';
import '../../../../core/ui/s_image.dart';
import '../../../../core/ui/s_image_viewer.dart';
import '../../../../core/ui/s_toast.dart';
import '../../../library/data/library_api.dart';
import '../../data/catalog_api.dart';
import '../../domain/ranking.dart';
import '../../../../core/api/sync.dart';
import '../../domain/catalog_model.dart';
import '../widgets/listing_gallery.dart';
import '../widgets/listing_price.dart';
import '../widgets/listing_reviews.dart';

/// Fiche d'une offre, pensée pour le téléphone : la galerie, l'essentiel, puis la suite en défilant.
/// Une fois la galerie passée, la barre du haut garde la couverture et le titre (un appui remonte).
/// Le bouton d'achat reste en bas à droite et s'ouvre en plein écran vers le paiement.
class ListingDetailScreen extends StatefulWidget {
  final String listingId;
  final String? heroTag;

  const ListingDetailScreen({
    super.key,
    required this.listingId,
    this.heroTag,
  });

  @override
  State<ListingDetailScreen> createState() => _ListingDetailScreenState();
}

class _ListingDetailScreenState extends State<ListingDetailScreen> {
  static const int _longDescription = 280;
  // How far the finger drags past the top before the page goes back.
  static const double _leaveAt = 72;
  static const double _barHeight = 60;
  // Scroll distance after which the top bar shows for an e-book.
  static const double _ebookBarAt = 40;

  final _scroll = ScrollController();
  final _buyKey = GlobalKey();
  final _compact = ValueNotifier<bool>(false);
  final _pull = ValueNotifier<double>(0);
  double _trigger = 300;
  double _pulled = 0;
  bool _leaving = false;
  ListingStats? _stats;
  bool _descOpen = false;
  // An offer not in the catalogue may belong to a private store (shared link): the catalogue is asked for it, once.
  bool _asking = false;

  @override
  void initState() {
    super.initState();
    _stats = cachedListingStats(widget.listingId);
    fetchListingStats(widget.listingId).then((s) {
      if (mounted && s != null) setState(() => _stats = s);
    });
    _scroll.addListener(() => _compact.value = _scroll.offset > _trigger);
    final known = db.state.listings.where((l) => l.id == widget.listingId).firstOrNull;
    if (known != null) {
      trackListing(known, 'view');
    } else {
      _asking = true;
      sync.openStoreLink(widget.listingId).whenComplete(() {
        if (!mounted) return;
        setState(() => _asking = false);
        final found = db.state.listings.where((l) => l.id == widget.listingId).firstOrNull;
        if (found != null) trackListing(found, 'view');
      });
    }
  }

  @override
  void dispose() {
    _scroll.dispose();
    _compact.dispose();
    _pull.dispose();
    super.dispose();
  }

  /// Dragging down while already at the ceiling: the page shrinks, and past a point it goes back
  /// to the card its cover came from.
  bool _onScroll(ScrollNotification n) {
    if (n.depth != 0 || _leaving) return false;
    if (n is OverscrollNotification && n.dragDetails != null && n.overscroll < 0) {
      _pulled -= n.overscroll;
      _pull.value = _pulled;
      if (_pulled >= _leaveAt) _leave();
    } else if (n is ScrollEndNotification || (n is ScrollUpdateNotification && n.metrics.pixels > 0)) {
      _pulled = 0;
      _pull.value = 0;
    }
    return false;
  }

  void _leave() {
    if (_leaving || !mounted) return;
    _leaving = true;
    HapticFeedback.mediumImpact();
    context.pop();
  }

  void _toTop() {
    if (!_scroll.hasClients) return;
    _scroll.animateTo(
      0,
      duration: const Duration(milliseconds: 380),
      curve: Curves.easeOutCubic,
    );
  }

  void _buy(Listing listing, bool isOwn) {
    if (isOwn) {
      context.push('/profile');
      return;
    }
    final box = _buyKey.currentContext?.findRenderObject() as RenderBox?;
    final from = box != null && box.hasSize ? box.localToGlobal(Offset.zero) & box.size : null;
    trackListing(listing, 'click');
    context.push('/checkout/${listing.id}', extra: from);
  }

  Future<void> _toggleFavorite(Listing listing) async {
    try {
      final nowFav = await libraryApi.toggleFavorite(listing.id);
      if (nowFav) Taste.noteListing(listing, 'like').ignore();
      if (mounted) {
        SToast.show(context, message: nowFav ? 'Ajouté aux favoris !' : 'Retiré des favoris');
      }
    } catch (e) {
      if (mounted) SToast.error(context, e.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;

    return ListenableBuilder(
      listenable: db,
      builder: (context, _) {
        final state = db.state;
        final listing = state.listings.where((l) => l.id == widget.listingId).firstOrNull;

        if (listing == null && _asking) {
          return Scaffold(
            backgroundColor: colors.canvas,
            appBar: AppBar(backgroundColor: colors.surface, elevation: 0),
            body: const Center(child: CircularProgressIndicator(strokeWidth: 2)),
          );
        }

        if (listing == null) {
          return Scaffold(
            backgroundColor: colors.canvas,
            appBar: AppBar(backgroundColor: colors.surface, elevation: 0),
            body: SEmptyState(
              icon: LucideIcons.alertCircle,
              title: 'Offre introuvable',
              description: 'Cette offre n’est plus disponible ou a été retirée.',
              action: SButton(
                label: 'Retour au catalogue',
                variant: SButtonVariant.secondary,
                size: SButtonSize.sm,
                onPressed: () => context.pop(),
              ),
            ),
          );
        }

        final seller = state.users.where((u) => u.id == listing.sellerId).firstOrNull;
        final isOwn = state.sessionUserId == listing.sellerId;
        final isService = listing.kind == 'service';
        final isFavorite = state.favorites.any((f) => f.listingId == listing.id);
        final reviews = state.reviews.where((r) => r.listingId == listing.id).toList()
          ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
        final rating = reviews.isEmpty
            ? null
            : reviews.fold<int>(0, (sum, r) => sum + r.rating) / reviews.length;

        final sellerName = seller?.merchant?.storeName ?? seller?.name ?? 'Créateur Salacope';
        final sellerLine = seller?.merchant?.headline ?? seller?.merchant?.city;
        final heroTag = widget.heroTag ?? 'card_${listing.id}';

        // The gallery runs edge to edge and takes the real shape of the cover, up to 62 % of the screen.
        final media = MediaQuery.of(context);
        final maxGallery = media.size.height * 0.62;
        // A book cover is tall: for it the top bar comes in after a short scroll instead of waiting for the gallery to leave.
        final isEbook = listing.category == 'ebook';
        if (isEbook) _trigger = _ebookBarAt;

        final description = listing.description.trim();
        final longDescription = description.length > _longDescription;

        return AnnotatedRegion<SystemUiOverlayStyle>(
          value: Theme.of(context).appBarTheme.systemOverlayStyle ?? SystemUiOverlayStyle.dark,
          child: Scaffold(
            backgroundColor: colors.canvas,
            body: Column(
              children: [
                // The sky: nothing scrolls under the status bar, so its icons stay readable.
                Container(height: media.padding.top, color: colors.surface),
                Expanded(
                  child: Stack(
              children: [
                NotificationListener<ScrollNotification>(
                  onNotification: _onScroll,
                  child: ValueListenableBuilder<double>(
                    valueListenable: _pull,
                    // While pulled, the page shrinks and rounds off, ready to fly back into its card.
                    builder: (context, pull, child) {
                      final t = (pull / _leaveAt).clamp(0.0, 1.0);
                      return AnimatedScale(
                        scale: 1 - 0.08 * t,
                        duration: pull == 0 ? const Duration(milliseconds: 200) : Duration.zero,
                        alignment: Alignment.topCenter,
                        child: ClipRRect(
                          borderRadius: BorderRadius.vertical(top: Radius.circular(32 * t)),
                          child: child,
                        ),
                      );
                    },
                    child: SingleChildScrollView(
                      controller: _scroll,
                      physics: const ClampingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          ListingGallery(
                            listing: listing,
                            heroTag: heroTag,
                            bleed: true,
                            maxHeight: maxGallery,
                            onHeight: (h) => _trigger = isEbook ? _ebookBarAt : h - 24,
                            overlayBuilder: (images, index) => Stack(
                              children: [
                                Positioned(
                                  top: 10,
                                  left: 12,
                                  child: _RoundButton(
                                    icon: LucideIcons.arrowLeft,
                                    onTap: () => context.pop(),
                                  ),
                                ),
                                Positioned(
                                  top: 10,
                                  right: 12,
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      _RoundButton(
                                        icon: LucideIcons.share2,
                                        onTap: () {
                                          // ignore: deprecated_member_use
                                          Share.share(
                                            '${listing.title} sur Salacope: https://salacope.online/l/${listing.id}',
                                          );
                                        },
                                      ),
                                      const SizedBox(width: 8),
                                      _RoundButton(
                                        icon: isFavorite ? LucideIcons.heartHandshake : LucideIcons.heart,
                                        color: isFavorite ? colors.accent : colors.textPrimary,
                                        onTap: () => _toggleFavorite(listing),
                                      ),
                                    ],
                                  ),
                                ),
                                Positioned(
                                  bottom: 10,
                                  right: 12,
                                  child: _RoundButton(
                                    icon: LucideIcons.maximize2,
                                    onTap: () => SImageViewer.show(
                                      context,
                                      images: images,
                                      initialIndex: index,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Padding(
                            padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  '${categoryLabel(listing.category)} · ${deliveryLabel(listing)}',
                                  style: SalacopeTypography.caption.copyWith(color: colors.textMuted),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  listing.title,
                                  style: SalacopeTypography.title.copyWith(
                                    color: colors.textPrimary,
                                    fontSize: 22,
                                    height: 1.25,
                                  ),
                                ),
                                if (listing.summary.trim().isNotEmpty) ...[
                                  const SizedBox(height: 6),
                                  Text(
                                    listing.summary,
                                    style: SalacopeTypography.body.copyWith(
                                      color: colors.textMuted,
                                      fontSize: 15,
                                      height: 1.4,
                                    ),
                                  ),
                                ],
                                const SizedBox(height: 10),
                                _Facts(rating: rating, reviewCount: reviews.length, stats: _stats),
                                const SizedBox(height: 16),
                                GestureDetector(
                                  onTap: longDescription
                                      ? () => setState(() => _descOpen = !_descOpen)
                                      : null,
                                  behavior: HitTestBehavior.opaque,
                                  child: AnimatedSize(
                                    duration: const Duration(milliseconds: 220),
                                    curve: Curves.easeOutCubic,
                                    alignment: Alignment.topCenter,
                                    child: Text(
                                      description,
                                      maxLines: longDescription && !_descOpen ? 6 : null,
                                      overflow: longDescription && !_descOpen
                                          ? TextOverflow.ellipsis
                                          : TextOverflow.visible,
                                      style: SalacopeTypography.body.copyWith(
                                        color: colors.textPrimary.withValues(alpha: 0.85),
                                        height: 1.5,
                                      ),
                                    ),
                                  ),
                                ),
                                if (listing.features.isNotEmpty) ...[
                                  const _Gap(),
                                  const _SectionTitle('Inclus'),
                                  const SizedBox(height: 8),
                                  for (final feat in listing.features)
                                    Padding(
                                      padding: const EdgeInsets.only(bottom: 8),
                                      child: Row(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Padding(
                                            padding: const EdgeInsets.only(top: 2, right: 8),
                                            child: Icon(LucideIcons.check, size: 16, color: colors.accent),
                                          ),
                                          Expanded(
                                            child: Text(
                                              feat,
                                              style: SalacopeTypography.body.copyWith(
                                                color: colors.textPrimary,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                ],
                                const _Gap(),
                                _SellerRow(
                                  name: sellerName,
                                  line: sellerLine,
                                  logo: seller?.merchant?.logo,
                                  verified: seller?.merchant?.verified == true,
                                  onTap: () => context.push('/boutique/${listing.sellerId}'),
                                ),
                                const _Gap(),
                                _Guarantee(isService: isService, listing: listing),
                                const _Gap(),
                                _SectionTitle(reviews.isEmpty ? 'Avis' : 'Avis des acheteurs'),
                                const SizedBox(height: 12),
                                ListingReviews(reviews: reviews),
                                const SizedBox(height: 32),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                // Once the gallery has gone, the cover and the title stay on top; a tap brings the gallery back.
                Positioned(
                  top: 0,
                  left: 0,
                  right: 0,
                  // Clipped to its own box: sliding out upwards it never goes past the sky.
                  child: ClipRect(
                    child: ValueListenableBuilder<bool>(
                    valueListenable: _compact,
                    builder: (context, compact, _) => IgnorePointer(
                      ignoring: !compact,
                      child: AnimatedSlide(
                        offset: compact ? Offset.zero : const Offset(0, -1),
                        duration: const Duration(milliseconds: 220),
                        curve: Curves.easeOutCubic,
                        child: AnimatedOpacity(
                          opacity: compact ? 1 : 0,
                          duration: const Duration(milliseconds: 160),
                          child: _CompactBar(
                            listing: listing,
                            top: 0,
                            onBack: () => context.pop(),
                            onTitleTap: _toTop,
                          ),
                        ),
                      ),
                    ),
                  ),
                  ),
                ),
              ],
            ),
                ),
              ],
            ),
            // The bar follows the page: it fades as the page is pulled away, instead of staying put and vanishing.
            bottomNavigationBar: ValueListenableBuilder<double>(
              valueListenable: _pull,
              builder: (context, pull, child) {
                final t = (pull / _leaveAt).clamp(0.0, 1.0);
                return IgnorePointer(
                  ignoring: t > 0.3,
                  child: Opacity(opacity: 1 - t, child: child),
                );
              },
              child: _BuyBar(
                buyKey: _buyKey,
                listing: listing,
                label: isOwn ? 'Mon offre' : (isService ? 'Commander' : 'Acheter'),
                onPressed: () => _buy(listing, isOwn),
              ),
            ),
          ),
        );
      },
    );
  }
}

/// La barre qui reste en haut quand la galerie est passée : retour, couverture, titre et prix.
class _CompactBar extends StatelessWidget {
  final Listing listing;
  final double top;
  final VoidCallback onBack;
  final VoidCallback onTitleTap;

  const _CompactBar({
    required this.listing,
    required this.top,
    required this.onBack,
    required this.onTitleTap,
  });

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;

    return Container(
      padding: EdgeInsets.only(top: top),
      decoration: BoxDecoration(
        color: colors.surface,
        border: Border(bottom: BorderSide(color: colors.canvasBorder, width: 0.8)),
      ),
      child: SizedBox(
        height: _ListingDetailScreenState._barHeight,
        child: Row(
          children: [
            IconButton(
              icon: const Icon(LucideIcons.arrowLeft, size: 20),
              onPressed: onBack,
            ),
            Expanded(
              child: GestureDetector(
                onTap: onTitleTap,
                behavior: HitTestBehavior.opaque,
                child: Row(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(SalacopeTokens.radiusMd),
                      child: SizedBox(
                        width: 38,
                        height: 38,
                        child: SImage(url: listing.coverImage, fit: BoxFit.cover, targetWidth: 96),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            listing.title,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: SalacopeTypography.bodyStrong.copyWith(color: colors.textPrimary),
                          ),
                          ListingPrice(
                            listing: listing,
                            showCompareAt: false,
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: colors.textPrimary,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Icon(LucideIcons.chevronUp, size: 18, color: colors.textMuted),
                  ],
                ),
              ),
            ),
            const SizedBox(width: 16),
          ],
        ),
      ),
    );
  }
}

/// Une seule ligne de chiffres : la note, les visites, les achats. Rien tant que le serveur n'a pas répondu.
class _Facts extends StatelessWidget {
  final double? rating;
  final int reviewCount;
  final ListingStats? stats;

  const _Facts({required this.rating, required this.reviewCount, required this.stats});

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final parts = <String>[
      if (stats != null) '${stats!.views} visite${stats!.views > 1 ? 's' : ''}',
      if (stats != null) '${stats!.purchases} achat${stats!.purchases > 1 ? 's' : ''}',
    ];
    final style = SalacopeTypography.caption.copyWith(
      color: colors.textMuted,
      fontWeight: FontWeight.w500,
    );

    if (rating == null && parts.isEmpty) return const SizedBox.shrink();

    return Wrap(
      crossAxisAlignment: WrapCrossAlignment.center,
      spacing: 6,
      children: [
        if (rating != null) ...[
          Icon(Icons.star_rounded, size: 15, color: colors.textPrimary),
          Text(
            '${formatRating(rating!)} ($reviewCount)',
            style: style.copyWith(color: colors.textPrimary, fontWeight: FontWeight.w600),
          ),
          if (parts.isNotEmpty) Text('·', style: style),
        ],
        if (parts.isNotEmpty) Text(parts.join(' · '), style: style),
      ],
    );
  }
}

class _SectionTitle extends StatelessWidget {
  final String text;

  const _SectionTitle(this.text);

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: SalacopeTypography.headline.copyWith(
        color: context.colors.textPrimary,
        fontSize: 16,
      ),
    );
  }
}

/// Espace entre deux blocs : un filet, puis de l'air.
class _Gap extends StatelessWidget {
  const _Gap();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 18),
      child: Divider(height: 1, thickness: 0.8, color: context.colors.canvasBorder),
    );
  }
}

class _RoundButton extends StatelessWidget {
  final IconData icon;
  final Color? color;
  final VoidCallback onTap;

  const _RoundButton({required this.icon, required this.onTap, this.color});

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: colors.canvas.withValues(alpha: 0.85),
          shape: BoxShape.circle,
          border: Border.all(color: colors.canvasBorder, width: 0.5),
        ),
        child: Icon(icon, size: 17, color: color ?? colors.textPrimary),
      ),
    );
  }
}

class _SellerRow extends StatelessWidget {
  final String name;
  final String? line;
  final String? logo;
  final bool verified;
  final VoidCallback onTap;

  const _SellerRow({
    required this.name,
    required this.line,
    required this.logo,
    required this.verified,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(SalacopeTokens.radiusLg),
      child: Row(
        children: [
          SAvatar(name: name, src: logo, size: SAvatarSize.lg),
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
                    if (verified)
                      Padding(
                        padding: const EdgeInsets.only(left: 4),
                        child: Icon(LucideIcons.badgeCheck, size: 15, color: colors.textPrimary),
                      ),
                  ],
                ),
                if (line != null && line!.trim().isNotEmpty)
                  Text(
                    line!,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: SalacopeTypography.caption.copyWith(color: colors.textMuted),
                  ),
              ],
            ),
          ),
          Icon(LucideIcons.chevronRight, size: 18, color: colors.textMuted),
        ],
      ),
    );
  }
}

class _Guarantee extends StatelessWidget {
  final bool isService;
  final Listing listing;

  const _Guarantee({required this.isService, required this.listing});

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;

    Widget line(IconData icon, String text, {bool strong = false}) => Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.only(top: 1),
                child: Icon(icon, size: 16, color: colors.textPrimary),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  text,
                  style: (strong ? SalacopeTypography.bodyStrong : SalacopeTypography.caption).copyWith(
                    color: strong ? colors.textPrimary : colors.textMuted,
                    height: 1.4,
                  ),
                ),
              ),
            ],
          ),
        );

    return Column(
      children: [
        line(
          isService ? LucideIcons.clock : LucideIcons.download,
          deliveryLabel(listing),
          strong: true,
        ),
        line(
          LucideIcons.shieldCheck,
          isService
              ? 'Paiement protégé Mobile Money : le vendeur est payé après votre validation ou 3 jours après livraison.'
              : 'Paiement MTN MoMo ou Airtel Money. Fichiers accessibles immédiatement dans « Mes achats ».',
        ),
      ],
    );
  }
}

/// Prix à gauche, bouton d'achat à droite : toujours en bas de l'écran.
class _BuyBar extends StatelessWidget {
  final GlobalKey buyKey;
  final Listing listing;
  final String label;
  final VoidCallback onPressed;

  const _BuyBar({
    required this.buyKey,
    required this.listing,
    required this.label,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: colors.surface,
        border: Border(top: BorderSide(color: colors.canvasBorder, width: 0.8)),
      ),
      child: SafeArea(
        top: false,
        child: Row(
          children: [
            Expanded(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Prix total',
                    style: TextStyle(fontSize: 11.5, color: colors.textMuted),
                  ),
                  FittedBox(
                    fit: BoxFit.scaleDown,
                    alignment: Alignment.centerLeft,
                    child: ListingPrice(
                      listing: listing,
                      showBadge: true,
                      style: TextStyle(
                        fontSize: 28,
                        height: 1.1,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -0.5,
                        color: colors.textPrimary,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            SizedBox(
              key: buyKey,
              width: 148,
              child: SButton(
                label: label,
                variant: SButtonVariant.primary,
                size: SButtonSize.lg,
                pill: true,
                onPressed: onPressed,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
