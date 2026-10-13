import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:flutter_staggered_grid_view/flutter_staggered_grid_view.dart';
import '../../../../core/db/store.dart';
import '../../../../core/api/sync.dart';
import '../../../../core/design/colors.dart';
import '../../../../core/design/theme_provider.dart';
import '../../../../core/design/typography.dart';
import '../../../../core/ui/category_tabs.dart';
import '../../../../core/ui/s_empty_state.dart';
import '../../../../core/ui/s_shimmer.dart';
import '../../domain/catalog_model.dart';
import '../../domain/ranking.dart';
import '../../../../core/config/explore.dart';
import '../widgets/shop_banner.dart';
import '../widgets/listing_card.dart';
import '../../../notifications/presentation/widgets/notification_bell.dart';

import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Copes : bannière de la vitrine, pastilles de catégories épinglées, puis flux
/// mélangé en cascade (colonnes décalées) à défilement infini.
class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  static const int _pageSize = 12;

  final ScrollController _scroll = ScrollController();
  String _selectedCategory = 'all';
  int _visibleCount = _pageSize;
  int _cachedTotalCount = 0;

  @override
  void initState() {
    super.initState();
    _scroll.addListener(_onScroll);
    // The data is loaded at launch (main.dart); opening the storefront only checks the catalogue is current.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      sync.refreshCatalog().ignore();
    });
  }

  @override
  void dispose() {
    _scroll.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (!_scroll.hasClients) return;
    if (_scroll.position.extentAfter < 350 && _visibleCount < _cachedTotalCount) {
      setState(() {
        _visibleCount += _pageSize;
      });
    }
  }

  void _selectCategory(String id) {
    setState(() {
      _selectedCategory = id;
      _visibleCount = _pageSize;
    });
    if (_scroll.hasClients) _scroll.jumpTo(0);
  }

  /// Every offer of the public stores, ranked by the Explorer's algorithm (signals of the database, this person's
  /// interests, a daily rotation, at most a few offers of one store in a row). Services are never set apart: the
  /// person picks a category if they want.
  List<ListingView> _buildViews() {
    final state = db.state;
    return rankListings(buildListingViews(state), RankContext.of(state, deviceSeed));
  }

  List<ListingView> _filtered(List<ListingView> views) {
    if (_selectedCategory == 'all') return views;
    return views.where((v) => v.listing.category == _selectedCategory).toList();
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;

    return ListenableBuilder(
      listenable: Listenable.merge([db, sync, exploreSettings]),
      builder: (context, _) {
        final views = _buildViews();
        // "À la une": chosen by the administration, shown first on "Tout".
        final featured = _selectedCategory == 'all'
            ? exploreSettings.value.featured.map((id) => views.where((v) => v.listing.id == id).firstOrNull).whereType<ListingView>().toList()
            : const <ListingView>[];
        final pinned = featured.map((v) => v.listing.id).toSet();
        final filtered = _filtered(views).where((v) => !pinned.contains(v.listing.id)).toList();
        _cachedTotalCount = filtered.length;
        final shown = filtered.take(_visibleCount).toList();
        final hasMore = filtered.length > shown.length;
        final booting = views.isEmpty && sync.status == BootStatus.loading;

        final tabs = [
          const CategoryTabItem(id: 'all', label: 'Tout'),
          ...categoriesConfig.map(
            (c) => CategoryTabItem(id: c.id, label: c.label),
          ),
        ];

        return Scaffold(
          backgroundColor: colors.canvas,
          appBar: AppBar(
            backgroundColor: colors.surface,
            elevation: 0,
            scrolledUnderElevation: 1,
            titleSpacing: 16,
            title: Row(
              children: [
                Text(
                  'Salacope',
                  style: SalacopeTypography.title.copyWith(
                    color: colors.textPrimary,
                    fontWeight: FontWeight.w800,
                    letterSpacing: -0.5,
                  ),
                ),
                const SizedBox(width: 4),
                Container(
                  width: 6,
                  height: 6,
                  decoration: BoxDecoration(
                    color: colors.accent,
                    shape: BoxShape.circle,
                  ),
                ),
              ],
            ),
            actions: [
              IconButton(
                icon: const Icon(LucideIcons.search, size: 20),
                tooltip: 'Rechercher',
                onPressed: () => context.push('/search'),
              ),
              const NotificationBell(),
              IconButton(
                icon: Icon(
                  Theme.of(context).brightness == Brightness.dark
                      ? LucideIcons.sun
                      : LucideIcons.moon,
                  size: 20,
                ),
                tooltip: 'Changer de thème',
                onPressed: () => ref.read(themeModeProvider.notifier).toggle(),
              ),
              const SizedBox(width: 4),
            ],
          ),
          body: RefreshIndicator(
            color: colors.accent,
            backgroundColor: colors.surface,
            onRefresh: () async {
              await Future.wait([sync.refreshCatalog(force: true), sync.syncNow()]);
            },
            child: CustomScrollView(
              controller: _scroll,
              // ignore: deprecated_member_use
              cacheExtent: 350.0,
              physics: const AlwaysScrollableScrollPhysics(),
              slivers: [
                // Bannière de la vitrine (hors catégorie : grille seule)
                if (_selectedCategory == 'all' && !booting)
                  const SliverToBoxAdapter(
                    child: Padding(
                      padding: EdgeInsets.fromLTRB(12, 12, 12, 4),
                      child: ShopBanner(),
                    ),
                  ),

                // Pastilles de catégories, épinglées sous le header
                SliverPersistentHeader(
                  pinned: true,
                  delegate: SliverCategoryTabsDelegate(
                    tabs: CategoryTabs(
                      items: tabs,
                      selectedId: _selectedCategory,
                      onSelected: _selectCategory,
                    ),
                  ),
                ),

                const SliverToBoxAdapter(child: SizedBox(height: 8)),

                if (featured.isNotEmpty && !booting) ...[
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(16, 8, 16, 10),
                      child: Text('À la une', style: SalacopeTypography.title.copyWith(color: colors.textPrimary, fontSize: 17)),
                    ),
                  ),
                  SliverToBoxAdapter(
                    child: SizedBox(
                      height: 290,
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        itemCount: featured.length,
                        separatorBuilder: (_, _) => const SizedBox(width: 10),
                        itemBuilder: (context, i) {
                          final item = featured[i];
                          return SizedBox(
                            width: 168,
                            child: ListingCard(
                              key: ValueKey('une_${item.listing.id}'),
                              view: item,
                              heroTag: 'une_${item.listing.id}',
                              onTap: () => context.push('/l/${item.listing.id}?hero=une_${item.listing.id}'),
                            ),
                          );
                        },
                      ),
                    ),
                  ),
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(16, 18, 16, 10),
                      child: Text('Pour vous', style: SalacopeTypography.title.copyWith(color: colors.textPrimary, fontSize: 17)),
                    ),
                  ),
                ],

                // Flux
                if (booting)
                  const SliverToBoxAdapter(child: _FeedSkeleton(count: 6))
                else if (shown.isEmpty)
                  SliverFillRemaining(
                    hasScrollBody: false,
                    child: SEmptyState(
                      icon: LucideIcons.packageOpen,
                      title: 'Aucune offre pour le moment',
                      description:
                          'Revenez bientôt ou publiez la première offre dans cette catégorie.',
                    ),
                  )
                else
                  SliverPadding(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    sliver: SliverMasonryGrid.count(
                      crossAxisCount: 2,
                      mainAxisSpacing: 16,
                      crossAxisSpacing: 8,
                      childCount: shown.length,
                      itemBuilder: (context, index) {
                        final item = shown[index];
                        return RepaintBoundary(
                          child: ListingCard(
                            key: ValueKey(item.listing.id),
                            view: item,
                            heroTag: 'card_${item.listing.id}',
                            onTap: () => context.push(
                                '/l/${item.listing.id}?hero=card_${item.listing.id}'),
                          ),
                        );
                      },
                    ),
                  ),

                // Squelette de fin de liste pendant le chargement de la suite
                if (hasMore)
                  const SliverToBoxAdapter(child: _FeedSkeleton(count: 4)),

                const SliverToBoxAdapter(child: SizedBox(height: 80)),
              ],
            ),
          ),
        );
      },
    );
  }
}

/// Squelette en cascade : deux colonnes décalées aux formats des couvertures.
class _FeedSkeleton extends StatelessWidget {
  final int count;

  const _FeedSkeleton({required this.count});

  static const List<double> _ratios = [3 / 4, 16 / 9, 1, 4 / 3, 3 / 4, 1];

  Widget _card(int i) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AspectRatio(
            aspectRatio: _ratios[i % _ratios.length],
            child: const SShimmerBox(radius: 16),
          ),
          const SizedBox(height: 10),
          const SShimmerBox(width: 70, height: 10, radius: 5),
          const SizedBox(height: 8),
          const SShimmerBox(height: 12, radius: 6),
          const SizedBox(height: 6),
          const SShimmerBox(width: 90, height: 10, radius: 5),
          const SizedBox(height: 8),
          const SShimmerBox(width: 56, height: 14, radius: 6),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final left = <Widget>[];
    final right = <Widget>[];
    for (var i = 0; i < count; i++) {
      // Colonne droite décalée d'un cran pour l'effet cascade.
      (i.isEven ? left : right).add(_card(i.isEven ? i : i + 1));
    }

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: SShimmer(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(child: Column(children: left)),
            const SizedBox(width: 12),
            Expanded(child: Column(children: right)),
          ],
        ),
      ),
    );
  }
}
