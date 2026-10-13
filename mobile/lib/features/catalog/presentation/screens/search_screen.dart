import 'package:flutter/material.dart';
import 'package:flutter_staggered_grid_view/flutter_staggered_grid_view.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../../core/db/store.dart';
import '../../../../core/design/colors.dart';
import '../../../../core/design/typography.dart';
import '../../../../core/ui/s_button.dart';
import '../../../../core/ui/s_empty_state.dart';
import '../../data/search_history.dart';
import '../../domain/catalog_model.dart';
import '../../domain/ranking.dart';
import '../widgets/listing_card.dart';
import '../widgets/search_category_tabs.dart';
import '../widgets/search_history_list.dart';
import '../widgets/sort_sheet.dart';

/// Explorer : le champ de recherche vit dans la barre du haut (sans cadre), les catégories sont un
/// simple rang de textes, le tri s'ouvre en feuille, et les résultats tombent en cascade comme sur Copes.
class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key});

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final TextEditingController _searchCtrl = TextEditingController();
  final FocusNode _focus = FocusNode();
  CatalogQuery _query = const CatalogQuery();
  List<String> _history = const [];

  @override
  void initState() {
    super.initState();
    _focus.addListener(() => setState(() {}));
    searchHistory.load().then((h) {
      if (mounted) setState(() => _history = h);
    });
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    _focus.dispose();
    super.dispose();
  }

  /// Keeps what was searched for, once the person has validated or opened a result.
  Future<void> _remember(String text) async {
    if (text.trim().isNotEmpty) Taste.noteSearch(text).ignore();
    final h = await searchHistory.add(text);
    if (mounted) setState(() => _history = h);
  }

  void _pick(String term) {
    _searchCtrl.text = term;
    _searchCtrl.selection = TextSelection.collapsed(offset: term.length);
    _setText(term);
    _remember(term);
    _focus.unfocus();
  }

  void _setText(String text) => setState(() => _query = _query.copyWith(text: text));

  void _reset() {
    _searchCtrl.clear();
    setState(() => _query = const CatalogQuery());
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;

    return ListenableBuilder(
      listenable: db,
      builder: (context, _) {
        final allViews = buildListingViews(db.state);

        // Category counts follow the typed text, so each tab tells what it would show.
        final textOnly = queryListings(allViews, CatalogQuery(text: _query.text, sort: CatalogSort.popular));
        final results = queryListings(allViews, _query, rank: RankContext.of(db.state, deviceSeed));
        // While typing: real titles, stores and categories that answer the words (nothing invented, nothing sponsored).
        final suggestions = _focus.hasFocus ? searchSuggestions(allViews, _searchCtrl.text) : const <({String kind, String label, String value})>[];

        final tabs = [
          SearchTab(id: 'all', label: 'Tout', count: textOnly.length),
          ...categoriesConfig.map(
            (c) => SearchTab(
              id: c.id,
              label: c.label,
              count: textOnly.where((v) => v.listing.category == c.id).length,
            ),
          ),
        ];

        return Scaffold(
          backgroundColor: colors.canvas,
          appBar: AppBar(
            backgroundColor: colors.surface,
            elevation: 0,
            scrolledUnderElevation: 0,
            titleSpacing: 0,
            leading: IconButton(
              icon: const Icon(LucideIcons.arrowLeft, size: 20),
              onPressed: () => context.pop(),
            ),
            title: TextField(
              controller: _searchCtrl,
              focusNode: _focus,
              autofocus: true,
              textInputAction: TextInputAction.search,
              onChanged: _setText,
              onSubmitted: (text) {
                _remember(text);
                _focus.unfocus();
              },
              cursorColor: colors.textPrimary,
              style: SalacopeTypography.title.copyWith(
                color: colors.textPrimary,
                fontSize: 18,
                fontWeight: FontWeight.w500,
              ),
              decoration: InputDecoration(
                hintText: 'Rechercher',
                hintStyle: SalacopeTypography.title.copyWith(
                  color: colors.textTertiary,
                  fontSize: 18,
                  fontWeight: FontWeight.w400,
                ),
                filled: false,
                isDense: true,
                contentPadding: EdgeInsets.zero,
                border: InputBorder.none,
                enabledBorder: InputBorder.none,
                focusedBorder: InputBorder.none,
              ),
            ),
            actions: [
              if (_searchCtrl.text.isNotEmpty)
                IconButton(
                  icon: const Icon(LucideIcons.x, size: 18),
                  tooltip: 'Effacer',
                  onPressed: () {
                    _searchCtrl.clear();
                    _setText('');
                  },
                ),
              const SizedBox(width: 4),
            ],
          ),
          body: suggestions.isNotEmpty
              ? ListView(
                  keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
                  children: [
                    for (final sug in suggestions)
                      ListTile(
                        leading: Icon(
                          sug.kind == 'store' ? LucideIcons.store : sug.kind == 'category' ? LucideIcons.layoutGrid : LucideIcons.search,
                          size: 18,
                          color: colors.textMuted,
                        ),
                        title: Text(sug.label, maxLines: 1, overflow: TextOverflow.ellipsis, style: SalacopeTypography.body.copyWith(color: colors.textPrimary)),
                        trailing: sug.kind == 'offer'
                            ? null
                            : Text(sug.kind == 'store' ? 'Boutique' : 'Catégorie', style: SalacopeTypography.caption.copyWith(color: colors.textMuted)),
                        onTap: () {
                          if (sug.kind == 'category') {
                            _focus.unfocus();
                            setState(() => _query = _query.copyWith(category: sug.value));
                          } else {
                            _pick(sug.value);
                          }
                        },
                      ),
                  ],
                )
              : _focus.hasFocus && _searchCtrl.text.isEmpty && _history.isNotEmpty
              ? SearchHistoryList(
                  terms: _history,
                  onPick: _pick,
                  onRemove: (term) async {
                    final h = await searchHistory.remove(term);
                    if (mounted) setState(() => _history = h);
                  },
                  onClear: () async {
                    final h = await searchHistory.clear();
                    if (mounted) setState(() => _history = h);
                  },
                )
              : Column(
            children: [
              Container(
                color: colors.surface,
                child: SearchCategoryTabs(
                  tabs: tabs,
                  selectedId: _query.category ?? 'all',
                  onSelected: (id) => setState(() {
                    _query = _query.copyWith(
                      category: id == 'all' ? null : id,
                      clearCategory: id == 'all',
                    );
                  }),
                ),
              ),
              Divider(height: 1, thickness: 0.8, color: colors.canvasBorder),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 10, 8, 2),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        '${results.length} résultat${results.length > 1 ? 's' : ''}',
                        style: SalacopeTypography.caption.copyWith(color: colors.textMuted),
                      ),
                    ),
                    InkWell(
                      onTap: () async {
                        final sort = await showSortSheet(context, _query.sort);
                        if (sort != null) setState(() => _query = _query.copyWith(sort: sort));
                      },
                      borderRadius: BorderRadius.circular(8),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              _query.sort.label,
                              style: SalacopeTypography.caption.copyWith(
                                color: colors.textPrimary,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const SizedBox(width: 4),
                            Icon(LucideIcons.chevronDown, size: 14, color: colors.textPrimary),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: results.isEmpty
                    ? SEmptyState(
                        icon: LucideIcons.searchX,
                        title: 'Aucun résultat',
                        description: 'Essayez d’autres mots ou retirez les filtres.',
                        action: SButton(
                          label: 'Réinitialiser',
                          variant: SButtonVariant.secondary,
                          size: SButtonSize.sm,
                          pill: true,
                          onPressed: _reset,
                        ),
                      )
                    : CustomScrollView(
                        keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
                        slivers: [
                          const SliverToBoxAdapter(child: SizedBox(height: 8)),
                          SliverPadding(
                            padding: const EdgeInsets.symmetric(horizontal: 12),
                            sliver: SliverMasonryGrid.count(
                              crossAxisCount: 2,
                              mainAxisSpacing: 16,
                              crossAxisSpacing: 8,
                              childCount: results.length,
                              itemBuilder: (context, index) {
                                final item = results[index];
                                final tag = 'search_${item.listing.id}';
                                return RepaintBoundary(
                                  child: ListingCard(
                                    key: ValueKey(item.listing.id),
                                    view: item,
                                    heroTag: tag,
                                    onTap: () {
                                      _remember(_searchCtrl.text);
                                      context.push('/l/${item.listing.id}?hero=$tag');
                                    },
                                  ),
                                );
                              },
                            ),
                          ),
                          const SliverToBoxAdapter(child: SizedBox(height: 40)),
                        ],
                      ),
              ),
            ],
          ),
        );
      },
    );
  }
}
