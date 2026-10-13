import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_staggered_grid_view/flutter_staggered_grid_view.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:share_plus/share_plus.dart';
import '../../../../core/db/models/database.dart';
import '../../../../core/db/models/listing.dart';
import '../../../../core/db/models/user.dart';
import '../../../../core/db/store.dart';
import '../../../../core/api/sync.dart';
import '../../../../core/design/colors.dart';
import '../../../../core/design/typography.dart';
import '../../../../core/ui/s_avatar.dart';
import '../../../../core/ui/s_button.dart';
import '../../../../core/ui/s_empty_state.dart';
import '../../../../core/ui/s_image_viewer.dart';
import '../../../../core/ui/s_toast.dart';
import '../../../library/data/library_api.dart';
import '../../data/catalog_api.dart';
import '../../domain/catalog_model.dart';
import '../widgets/follow_button.dart';
import '../widgets/listing_card.dart';
import '../widgets/listing_reviews.dart';
import '../widgets/store_header.dart';

/// Boutique d'un créateur, façon profil Instagram : l'identité et trois chiffres en tête, puis deux onglets
/// d'icônes épinglés (offres, avis). Une fois l'en-tête passé, la barre garde la photo à gauche, comme WhatsApp,
/// et le bouton S'abonner reste flottant.
class StoreScreen extends StatefulWidget {
  /// The store's id, or `@handle` (verified stores, salacope.online/@handle).
  final String sellerId;

  const StoreScreen({
    super.key,
    required this.sellerId,
  });

  @override
  State<StoreScreen> createState() => _StoreScreenState();
}

class _StoreScreenState extends State<StoreScreen> {
  static const double _barHeight = 56;
  // Scroll distance after which the bar shows the small picture and the name.
  static const double _collapseAt = 150;

  final _scroll = ScrollController();
  final _followKey = GlobalKey();
  final _collapsed = ValueNotifier<bool>(false);
  final _floating = ValueNotifier<bool>(false);
  Timer? _presence;
  String _tab = 'offers';
  bool _isFollowingLoading = false;
  bool _online = false;
  // A store not in the catalogue may be private: the catalogue is asked for it by its link (once).
  bool _asking = false;

  /// The seller this address names: an id, or a verified store's @handle.
  User? _resolve(Database state) {
    final ref = widget.sellerId;
    if (ref.startsWith('@')) {
      final h = ref.substring(1).toLowerCase();
      return state.users.where((u) => u.merchant != null && u.merchant!.verified && (u.merchant!.handle ?? '').toLowerCase() == h).firstOrNull;
    }
    return state.users.where((u) => u.id == ref && u.merchant != null).firstOrNull;
  }

  String get _id => _resolve(db.state)?.id ?? widget.sellerId;

  @override
  void initState() {
    super.initState();
    _scroll.addListener(_onScroll);
    if (_resolve(db.state) == null) {
      _asking = true;
      sync.openStoreLink(widget.sellerId).whenComplete(() {
        if (mounted) setState(() => _asking = false);
      });
    }
    _pollPresence();
    // The seller's presence, read again every 20 seconds while this page is open.
    _presence = Timer.periodic(const Duration(seconds: 20), (_) => _pollPresence());
  }

  @override
  void dispose() {
    _presence?.cancel();
    _scroll.dispose();
    _collapsed.dispose();
    _floating.dispose();
    super.dispose();
  }

  void _onScroll() {
    _collapsed.value = _scroll.offset > _collapseAt;
    // The subscribe button floats once the one in the header has gone under the bar.
    final box = _followKey.currentContext?.findRenderObject() as RenderBox?;
    final barBottom = MediaQuery.paddingOf(context).top + _barHeight;
    _floating.value = box != null && box.attached
        ? box.localToGlobal(Offset.zero).dy + box.size.height < barBottom
        : _scroll.offset > 120;
  }

  /// The server tells whether the seller was seen in the last five minutes, per offer.
  Future<void> _pollPresence() async {
    final first = db.state.listings
        .where((l) => l.sellerId == _id && l.status == 'published')
        .firstOrNull;
    if (first == null) return;
    final stats = await fetchListingStats(first.id);
    if (mounted && stats != null && stats.sellerOnline != _online) {
      setState(() => _online = stats.sellerOnline);
    }
  }

  Future<void> _toggleFollow() async {
    final sessionUserId = db.state.sessionUserId;
    if (sessionUserId == null) {
      context.push('/connexion');
      return;
    }
    if (sessionUserId == _id) {
      SToast.info(context, 'Vous ne pouvez pas suivre votre propre boutique.');
      return;
    }

    setState(() => _isFollowingLoading = true);
    try {
      await libraryApi.toggleFollow(
        currentUserId: sessionUserId,
        sellerId: _id,
      );
    } catch (e) {
      if (mounted) SToast.error(context, e.toString());
    } finally {
      if (mounted) setState(() => _isFollowingLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final top = MediaQuery.paddingOf(context).top;
    final bottom = MediaQuery.paddingOf(context).bottom;

    return ListenableBuilder(
      listenable: db,
      builder: (context, _) {
        final state = db.state;
        final seller = _resolve(state);

        if (seller == null && _asking) {
          return Scaffold(
            backgroundColor: colors.canvas,
            appBar: AppBar(backgroundColor: colors.surface, elevation: 0),
            body: const Center(child: CircularProgressIndicator(strokeWidth: 2)),
          );
        }

        if (seller == null) {
          return Scaffold(
            backgroundColor: colors.canvas,
            appBar: AppBar(backgroundColor: colors.surface, elevation: 0),
            body: SEmptyState(
              icon: LucideIcons.store,
              title: 'Boutique introuvable',
              description: 'Ce créateur n’a pas encore activé sa boutique ou est introuvable.',
              action: SButton(
                label: 'Retour',
                variant: SButtonVariant.secondary,
                size: SButtonSize.sm,
                onPressed: () => context.pop(),
              ),
            ),
          );
        }

        final merchant = seller.merchant;
        final name = merchant?.storeName ?? seller.name;
        final handle = merchant?.handle;
        final isOwn = state.sessionUserId == seller.id;
        final isFollowing = state.follows.any((f) => f.sellerId == seller.id);
        final stats = state.stats.sellers[seller.id];

        final listings = state.listings
            .where((l) => l.sellerId == seller.id && l.status == 'published')
            .toList();
        final reviews = state.reviews.where((r) => r.sellerId == seller.id).toList()
          ..sort((a, b) => b.createdAt.compareTo(a.createdAt));

        void share() {
          final path = handle != null && handle.isNotEmpty ? '@$handle' : 's/${seller.id}';
          // ignore: deprecated_member_use
          Share.share('$name sur Salacope: https://salacope.online/$path');
        }

        return Scaffold(
          backgroundColor: colors.canvas,
          body: Stack(
            children: [
              Column(
                children: [
                  // The sky: nothing scrolls under the status bar, so its icons stay readable.
                  Container(height: top, color: colors.surface),
                  Expanded(
                    child: CustomScrollView(
                      controller: _scroll,
                      slivers: [
                        SliverAppBar(
                          primary: false,
                          pinned: true,
                          toolbarHeight: _barHeight,
                          backgroundColor: colors.surface,
                          elevation: 0,
                          scrolledUnderElevation: 0,
                          titleSpacing: 0,
                          leading: IconButton(
                            icon: const Icon(LucideIcons.arrowLeft, size: 20),
                            onPressed: () => context.pop(),
                          ),
                          // Like a chat contact: the picture stays at the leading edge, the name and presence next to it.
                          title: ValueListenableBuilder<bool>(
                            valueListenable: _collapsed,
                            builder: (context, collapsed, _) => AnimatedOpacity(
                              opacity: collapsed ? 1 : 0,
                              duration: const Duration(milliseconds: 160),
                              child: AnimatedSlide(
                                offset: collapsed ? Offset.zero : const Offset(0, 0.25),
                                duration: const Duration(milliseconds: 200),
                                curve: Curves.easeOutCubic,
                                child: Row(
                                  children: [
                                    SAvatar(name: name, src: merchant?.logo, size: SAvatarSize.lg),
                                    const SizedBox(width: 10),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          Text(
                                            name,
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: SalacopeTypography.bodyStrong.copyWith(
                                              color: colors.textPrimary,
                                              fontSize: 16,
                                            ),
                                          ),
                                          if (_online)
                                            Text(
                                              'En ligne',
                                              style: SalacopeTypography.caption.copyWith(
                                                color: colors.emerald500,
                                                fontWeight: FontWeight.w600,
                                              ),
                                            )
                                          else if (handle != null && handle.isNotEmpty)
                                            Text(
                                              '@$handle',
                                              maxLines: 1,
                                              overflow: TextOverflow.ellipsis,
                                              style: SalacopeTypography.caption.copyWith(
                                                color: colors.textMuted,
                                              ),
                                            ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ),
                        SliverToBoxAdapter(
                          child: ColoredBox(
                            color: colors.surface,
                            child: StoreHeader(
                              seller: seller,
                              offers: listings.length,
                              sales: stats?.completedSales ?? 0,
                              followers: stats?.followers ?? 0,
                              reviews: reviews.length,
                              rating: (stats != null && stats.reviews > 0) ? stats.rating : null,
                              online: _online,
                              isOwn: isOwn,
                              isFollowing: isFollowing,
                              followLoading: _isFollowingLoading,
                              followKey: _followKey,
                              onFollow: _toggleFollow,
                              onManage: () => context.push('/dashboard'),
                              onShare: share,
                              onLogo: () => SImageViewer.show(context, images: [merchant!.logo!]),
                              onReviews: () => setState(() => _tab = 'reviews'),
                            ),
                          ),
                        ),
                        SliverPersistentHeader(
                          pinned: true,
                          delegate: _TabsHeader(
                            color: colors.surface,
                            border: colors.canvasBorder,
                            tab: _tab,
                            onTab: (id) => setState(() => _tab = id),
                          ),
                        ),
                        if (_tab == 'offers')
                          ..._offers(listings, seller, state)
                        else
                          SliverToBoxAdapter(
                            child: Padding(
                              padding: const EdgeInsets.fromLTRB(16, 20, 16, 40),
                              child: reviews.isEmpty
                                  ? const SizedBox(
                                      height: 260,
                                      child: SEmptyState(
                                        icon: LucideIcons.messageSquareQuote,
                                        title: 'Pas encore d’avis',
                                        description:
                                            'Les avis apparaissent après les premières commandes terminées.',
                                      ),
                                    )
                                  : ListingReviews(reviews: reviews, showItem: true),
                            ),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
              if (!isOwn)
                Positioned(
                  right: 16,
                  bottom: 16 + bottom,
                  child: ValueListenableBuilder<bool>(
                    valueListenable: _floating,
                    builder: (context, floating, _) => IgnorePointer(
                      ignoring: !floating,
                      child: AnimatedSlide(
                        offset: floating ? Offset.zero : const Offset(0, 1.6),
                        duration: const Duration(milliseconds: 240),
                        curve: Curves.easeOutCubic,
                        child: AnimatedOpacity(
                          opacity: floating ? 1 : 0,
                          duration: const Duration(milliseconds: 160),
                          child: FollowButton(
                            compact: true,
                            isFollowing: isFollowing,
                            loading: _isFollowingLoading,
                            onPressed: _toggleFollow,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
            ],
          ),
        );
      },
    );
  }

  List<Widget> _offers(List<Listing> listings, User seller, Database state) {
    if (listings.isEmpty) {
      return [
        const SliverFillRemaining(
          hasScrollBody: false,
          child: SEmptyState(
            icon: LucideIcons.packageOpen,
            title: 'Aucune offre en ligne',
            description: 'Ce créateur n’a pas encore publié d’offre.',
          ),
        ),
      ];
    }
    return [
      const SliverToBoxAdapter(child: SizedBox(height: 12)),
      SliverPadding(
        padding: const EdgeInsets.symmetric(horizontal: 12),
        sliver: SliverMasonryGrid.count(
          crossAxisCount: 2,
          mainAxisSpacing: 16,
          crossAxisSpacing: 8,
          childCount: listings.length,
          itemBuilder: (context, index) {
            final listing = listings[index];
            final view = ListingView(
              listing: listing,
              seller: seller,
              salesCount: state.stats.listings[listing.id] ?? 0,
            );
            return RepaintBoundary(
              child: ListingCard(
                key: ValueKey(listing.id),
                view: view,
                heroTag: 'store_${listing.id}',
                onTap: () => context.push('/l/${listing.id}?hero=store_${listing.id}'),
              ),
            );
          },
        ),
      ),
      const SliverToBoxAdapter(child: SizedBox(height: 120)),
    ];
  }
}

/// Two icons, as on a profile grid: the offers and the reviews. The chosen one has a line under it.
class _TabsHeader extends SliverPersistentHeaderDelegate {
  final Color color;
  final Color border;
  final String tab;
  final ValueChanged<String> onTab;

  _TabsHeader({required this.color, required this.border, required this.tab, required this.onTab});

  @override
  double get minExtent => 46;

  @override
  double get maxExtent => 46;

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) {
    final colors = context.colors;

    Widget item(String id, IconData icon, String label) {
      final active = tab == id;
      return Expanded(
        child: Semantics(
          button: true,
          selected: active,
          label: label,
          child: InkWell(
            onTap: () => onTab(id),
            child: Container(
              alignment: Alignment.center,
              decoration: BoxDecoration(
                border: Border(
                  bottom: BorderSide(
                    color: active ? colors.textPrimary : Colors.transparent,
                    width: 2,
                  ),
                ),
              ),
              child: Icon(
                icon,
                size: 22,
                color: active ? colors.textPrimary : colors.textTertiary,
              ),
            ),
          ),
        ),
      );
    }

    return Container(
      decoration: BoxDecoration(
        color: color,
        border: Border(bottom: BorderSide(color: border, width: 0.8)),
      ),
      child: Row(
        children: [
          item('offers', LucideIcons.layoutGrid, 'Offres'),
          item('reviews', LucideIcons.star, 'Avis'),
        ],
      ),
    );
  }

  @override
  bool shouldRebuild(covariant _TabsHeader old) =>
      old.tab != tab || old.color != color || old.border != border;
}
