import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:salacope/core/db/models/listing.dart';
import 'package:salacope/core/db/store.dart';
import 'package:salacope/core/design/theme.dart';
import 'package:salacope/core/design/tokens.dart';
import 'package:salacope/core/design/typography.dart';
import 'package:salacope/core/domain/analytics.dart';
import 'package:salacope/core/domain/orders.dart';
import 'package:salacope/core/lib/format.dart';
import 'package:salacope/core/lib/remembered.dart';
import 'package:salacope/core/ui/bar_chart.dart';
import 'package:salacope/core/ui/help_tip.dart';
import 'package:salacope/core/ui/s_empty_state.dart';
import 'package:salacope/core/ui/s_list.dart';
import 'package:salacope/core/ui/s_page.dart';
import 'package:salacope/core/ui/s_panel.dart';
import 'package:salacope/core/ui/s_shimmer.dart';
import 'package:salacope/features/catalog/presentation/widgets/mini_cover.dart';
import 'package:salacope/features/verification/presentation/widgets/verification_notice.dart';
import '../../data/analytics_api.dart';
import '../seller_hub.dart';

const _views = ['resume', 'ventes', 'visites', 'clients', 'conversion'];
const _periods = ['7', '30', '90', 'year', 'all', 'custom'];

/// The store's figures over a period, one view per chip (Résumé, Ventes, Visites, Clients, Taux de conversion), like the web's
/// `/dashboard`. The period, the offer filter and the view are kept for the next visit; sales and customers come from the
/// orders, visits from the server.
class DashboardScreen extends StatefulWidget {
  /// Shown as a section of the Boutique tab (no back arrow).
  final bool inTab;
  const DashboardScreen({super.key, this.inTab = false});

  static final Remembered _view = Remembered('seller.dashboard.view', _views, 'resume');
  static final Remembered _period = Remembered('seller.dashboard.period', _periods, '30');
  static final ValueNotifier<String> _offer = ValueNotifier('all');
  static DateRange? _custom;

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  Analytics? _counted;
  bool _failed = false;
  DateRange? _asked;

  void _load(DateRange range) {
    if (_asked == range) return;
    _asked = range;
    // The last answer for this period at once; the server is asked again behind it.
    _counted = analyticsApi.last(range);
    _failed = false;
    analyticsApi.fetch(range).then((a) {
      if (mounted && _asked == range) setState(() => _counted = a);
    }).catchError((_) {
      if (mounted && _asked == range && _counted == null) setState(() => _failed = true);
    });
  }

  Future<void> _pickDates(String today) async {
    final now = DateTime.parse('${today}T12:00:00');
    final current = DashboardScreen._custom;
    final picked = await showDateRangePicker(
      context: context,
      firstDate: DateTime(2024),
      lastDate: now,
      initialDateRange: current == null ? null : DateTimeRange(start: DateTime.parse('${current.from}T12:00:00'), end: DateTime.parse('${current.to}T12:00:00')),
    );
    if (picked == null) return;
    DashboardScreen._custom = DateRange(dayOf(picked.start), dayOf(picked.end));
    DashboardScreen._period.value = 'custom';
    setState(() {});
  }

  void _pickOffer(List<Listing> listings) {
    final colors = context.colors;
    showModalBottomSheet<void>(
      context: context,
      useRootNavigator: true,
      backgroundColor: colors.surface,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (ctx) => SafeArea(
        child: ConstrainedBox(
          constraints: BoxConstraints(maxHeight: MediaQuery.of(ctx).size.height * 0.7),
          child: ListView(
            shrinkWrap: true,
            padding: const EdgeInsets.symmetric(vertical: 12),
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 4, 20, 8),
                child: Text('Offre', style: SalacopeTypography.caption.copyWith(color: colors.gray500, fontWeight: FontWeight.w500)),
              ),
              for (final (id, title) in [('all', 'Toutes les offres'), for (final l in listings) (l.id, l.title)])
                ListTile(
                  title: Text(title, maxLines: 1, overflow: TextOverflow.ellipsis, style: SalacopeTypography.body.copyWith(color: colors.textPrimary)),
                  trailing: DashboardScreen._offer.value == id ? Icon(LucideIcons.check, size: 18, color: colors.accent) : null,
                  onTap: () {
                    DashboardScreen._offer.value = id;
                    Navigator.of(ctx).pop();
                  },
                ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: Listenable.merge([db, DashboardScreen._view, DashboardScreen._period, DashboardScreen._offer]),
      builder: (context, _) {
        final state = db.state;
        final me = state.sessionUserId ?? '';
        final merchant = state.users.where((u) => u.id == me).firstOrNull?.merchant;
        if (merchant == null) return const SizedBox.shrink();

        final orders = state.orders.where((o) => o.sellerId == me).toList();
        final listings = state.listings.where((l) => l.sellerId == me).toList();
        final today = dayOf(DateTime.now());
        var since = addDays(today, -29);
        for (final o in orders) {
          final d = dayOfIso(o.createdAt);
          if (d.isNotEmpty && d.compareTo(since) < 0) since = d;
        }
        final presets = <String, (String, DateRange)>{
          '7': ('7 jours', DateRange(addDays(today, -6), today)),
          '30': ('30 jours', DateRange(addDays(today, -29), today)),
          '90': ('90 jours', DateRange(addDays(today, -89), today)),
          'year': ('Cette année', DateRange('${today.substring(0, 4)}-01-01', today)),
          'all': ('Depuis le début', DateRange(since, today)),
        };
        final period = DashboardScreen._period.value;
        final custom = DashboardScreen._custom;
        final range = period == 'custom' && custom != null ? custom : (presets[period] ?? presets['30']!).$2;
        final offerId = DashboardScreen._offer.value;
        final offer = offerId != 'all' && listings.any((l) => l.id == offerId) ? offerId : null;
        _load(range);

        final f = dashboardFigures(orders, _counted?.stats ?? const [], range, listingId: offer, store: _counted?.store ?? const []);
        final todo = orders.where((o) => needsAction(o, Perspective.seller)).length;
        final view = DashboardScreen._view.value;
        final loading = _counted == null && !_failed;

        return SPage(
          embedded: true,
          title: merchant.storeName,
          slivers: [
            SliverPersistentHeader(
              pinned: true,
              delegate: _ToolbarDelegate(
                child: _Toolbar(
                  period: period == 'custom' && custom == null ? '30' : period,
                  presets: {for (final e in presets.entries) e.key: e.value.$1},
                  customLabel: custom == null ? 'Dates' : '${formatDate('${custom.from}T12:00:00')} – ${formatDate('${custom.to}T12:00:00')}',
                  onPeriod: (p) => DashboardScreen._period.value = p,
                  onDates: () => _pickDates(today),
                  filtered: offer != null,
                  onFilter: () => _pickOffer(listings),
                  view: view,
                  onView: (v) => DashboardScreen._view.value = v,
                ),
              ),
            ),
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
              sliver: SliverList.list(
                children: [
                  VerificationNotice(merchant: merchant),
                  ..._content(context, view, f, todo, offer, listings, loading),
                ],
              ),
            ),
          ],
        );
      },
    );
  }

  List<Widget> _content(BuildContext context, String view, DashboardFigures f, int todo, String? offer, List<Listing> listings, bool loading) {
    final colors = context.colors;
    String counted(String Function() value) => _failed ? '—' : value();
    _Tile visitsTile() => _Tile(
          label: 'Nombre total de visites',
          value: counted(() => formatNumber(f.views)),
          loading: loading,
          help: 'Fiches d’offres ouvertes, une seule fois par visiteur et par jour. Vos propres visites, les robots et les aperçus de liens ne comptent pas.',
        );
    _Tile rateTile() => _Tile(
          label: 'Taux de conversion',
          value: counted(() => formatShare(f.conversion)),
          loading: loading,
          help: 'Les ventes divisées par les visites sur la période.',
        );
    final salesTiles = [
      _Tile(label: 'Revenu total', value: formatXaf(f.revenue), help: 'Ce que vos ventes vous rapportent sur la période, commission déduite. Les commandes annulées sont exclues.'),
      _Tile(label: 'Panier moyen', value: formatXaf(f.averageBasket), help: 'Le revenu total divisé par le nombre de ventes.'),
      _Tile(label: 'Produits vendus', value: formatNumber(f.productsSold), help: 'Ventes de produits numériques (fichiers livrés au paiement) sur la période.'),
      _Tile(label: 'Total des ventes', value: formatNumber(f.sales), help: 'Toutes vos ventes de la période, produits et services, annulations exclues.'),
    ];
    final customerTiles = [
      _Tile(label: 'Nombre total de clients', value: formatNumber(f.customers), help: 'Personnes qui vous ont acheté quelque chose sur la période.'),
      _Tile(label: 'Nouveaux clients', value: formatNumber(f.newCustomers), help: 'Clients dont le premier achat dans votre boutique tombe dans la période.'),
    ];
    List<BarDatum> bars(int Function(SeriesPoint p) value) => [for (final p in f.series) BarDatum(key: p.key, label: p.label, value: value(p))];
    final every = (f.series.length / 6).ceil().clamp(1, 1000);
    final where = offer != null ? ' pour cette offre' : '';
    const gap = SizedBox(height: 16);

    switch (view) {
      case 'ventes':
        return [
          gap,
          _StatSection(title: 'Ventes', tiles: salesTiles),
          gap,
          SPanel(
            titleText: 'Revenus',
            help: 'Ce que vos ventes vous rapportent, commission déduite, par jour (par mois sur une longue période).',
            child: BarChart(data: bars((p) => p.revenue), formatValue: formatXaf, title: 'Revenus$where', labelEvery: every),
          ),
        ];
      case 'visites':
        return [
          gap,
          _StatSection(title: 'Visites', tiles: [
            visitsTile(),
            _Tile(
              label: 'Visites de la boutique',
              value: offer != null ? '—' : counted(() => formatNumber(f.storeViews)),
              loading: loading,
              help: 'Page de votre boutique ouverte, une seule fois par visiteur et par jour. Non disponible quand une offre est filtrée.',
            ),
            _Tile(
              label: 'Clics sur « Acheter »',
              value: counted(() => formatNumber(f.clicks)),
              loading: loading,
              help: 'Visiteurs qui ont touché « Acheter » ou « Commander » sur la période.',
            ),
            _Tile(
              label: 'Taux de clic',
              value: counted(() => formatShare(f.clickRate)),
              loading: loading,
              help: 'Les clics sur « Acheter » divisés par les visites.',
            ),
          ]),
          gap,
          SPanel(
            titleText: 'Visites',
            help: 'Fiches d’offres ouvertes, par jour (par mois sur une longue période).',
            child: BarChart(data: bars((p) => p.views), formatValue: (v) => plural(v, 'visite'), title: 'Visites$where', labelEvery: every),
          ),
        ];
      case 'clients':
        return [
          gap,
          _StatSection(title: 'Clients', tiles: [
            ...customerTiles,
            _Tile(label: 'Clients fidèles', value: formatNumber(f.repeatCustomers), help: 'Clients de la période qui ont acheté au moins deux fois chez vous.'),
          ]),
          gap,
          _ListTitle(title: 'Meilleurs clients', action: 'Tous les clients', onAction: () => openSellerSection(context, 'clients')),
          if (f.topCustomers.isEmpty)
            const SEmptyState(title: 'Aucun client sur cette période')
          else
            SList(children: [
              for (final c in f.topCustomers.take(5))
                SListRow(
                  title: c.name,
                  subtitle: plural(c.orders, 'commande'),
                  trailing: Text(formatXaf(c.spent), style: SalacopeTypography.bodyStrong.copyWith(color: colors.textPrimary)),
                  onTap: () => openSellerSection(context, 'clients'),
                ),
            ]),
        ];
      case 'conversion':
        return [
          gap,
          _StatSection(title: 'Taux de conversion', tiles: [
            rateTile(),
            _Tile(label: 'Total des ventes', value: formatNumber(f.sales), help: 'Toutes vos ventes de la période, produits et services, annulations exclues.'),
          ]),
          gap,
          _ListTitle(title: 'Par offre', action: 'Mes offres', onAction: () => openSellerSection(context, 'offres')),
          if (f.byOffer.isEmpty)
            SEmptyState(
              title: 'Pas encore de visite ni de vente sur cette période',
              description: listings.isNotEmpty ? 'Partagez le lien de vos offres.' : 'Publiez votre première offre.',
            )
          else
            SList(children: [
              for (final o in f.byOffer)
                Builder(builder: (context) {
                  final l = listings.where((x) => x.id == o.listingId).firstOrNull;
                  return SListRow(
                    leading: l == null ? null : MiniCover(src: l.coverImage, category: l.category, size: 44),
                    title: l?.title ?? 'Offre supprimée',
                    subtitle: '${plural(o.views, 'visite')} · ${plural(o.sales, 'vente')} · ${formatXaf(o.revenue)}',
                    trailing: Text(
                      formatShare(o.conversion),
                      style: SalacopeTypography.bodyStrong.copyWith(color: o.conversion == null ? colors.gray400 : colors.textPrimary),
                    ),
                    onTap: l == null ? null : () => context.push('/dashboard/offres/${l.id}'),
                  );
                }),
            ]),
        ];
      default:
        return [
          if (todo > 0) ...[
            gap,
            InkWell(
              onTap: () => openSellerSection(context, 'ventes'),
              borderRadius: BorderRadius.circular(SalacopeTokens.radiusXl),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  color: colors.surface,
                  borderRadius: BorderRadius.circular(SalacopeTokens.radiusXl),
                  border: Border.all(color: colors.gray200),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Text.rich(
                        TextSpan(children: [
                          TextSpan(text: plural(todo, 'commande'), style: const TextStyle(fontWeight: FontWeight.w600)),
                          const TextSpan(text: ' à traiter'),
                        ]),
                        style: SalacopeTypography.body.copyWith(color: colors.textPrimary),
                      ),
                    ),
                    Text('Voir', style: SalacopeTypography.body.copyWith(color: colors.gray500)),
                    Icon(LucideIcons.chevronRight, size: 16, color: colors.gray500),
                  ],
                ),
              ),
            ),
          ],
          gap,
          _StatSection(title: 'Ventes', tiles: salesTiles),
          gap,
          _StatSection(title: 'Visites', tiles: [visitsTile(), rateTile()]),
          gap,
          _StatSection(title: 'Clients', tiles: customerTiles),
        ];
    }
  }
}

/// The period chips with the offer filter, then the view chips: pinned under the Boutique tabs, never scrolled away.
class _Toolbar extends StatelessWidget {
  final String period;
  final Map<String, String> presets;
  final String customLabel;
  final ValueChanged<String> onPeriod;
  final VoidCallback onDates;
  final bool filtered;
  final VoidCallback onFilter;
  final String view;
  final ValueChanged<String> onView;

  const _Toolbar({
    required this.period,
    required this.presets,
    required this.customLabel,
    required this.onPeriod,
    required this.onDates,
    required this.filtered,
    required this.onFilter,
    required this.view,
    required this.onView,
  });

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    const views = {
      'resume': ('Résumé', LucideIcons.chartColumn),
      'ventes': ('Ventes', LucideIcons.shoppingBag),
      'visites': ('Visites', LucideIcons.eye),
      'clients': ('Clients', LucideIcons.users),
      'conversion': ('Taux de conversion', LucideIcons.arrowUpDown),
    };
    return Container(
      color: colors.canvas,
      padding: const EdgeInsets.only(top: 10, bottom: 10),
      child: Column(
        children: [
          SizedBox(
            height: 36,
            child: Row(
              children: [
                Expanded(
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.only(left: 16, right: 8),
                    children: [
                      for (final e in presets.entries)
                        _Chip(label: e.value, selected: period == e.key, onTap: () => onPeriod(e.key)),
                      _Chip(label: customLabel, icon: LucideIcons.calendar, selected: period == 'custom', onTap: onDates),
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.only(right: 16),
                  child: InkWell(
                    onTap: onFilter,
                    borderRadius: SalacopeTokens.borderLg,
                    child: Stack(
                      clipBehavior: Clip.none,
                      children: [
                        Container(
                          width: 36,
                          height: 36,
                          decoration: BoxDecoration(
                            color: colors.gray50,
                            borderRadius: SalacopeTokens.borderLg,
                            border: Border.all(color: colors.gray200),
                          ),
                          child: Icon(LucideIcons.listFilter, size: 16, color: colors.gray700),
                        ),
                        if (filtered)
                          Positioned(
                            right: -2,
                            top: -2,
                            child: Container(
                              width: 10,
                              height: 10,
                              decoration: BoxDecoration(color: colors.amber500, shape: BoxShape.circle, border: Border.all(color: colors.canvas, width: 2)),
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),
          SizedBox(
            height: 36,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              children: [
                for (final e in views.entries) _Chip(label: e.value.$1, icon: e.value.$2, selected: view == e.key, onTap: () => onView(e.key)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ToolbarDelegate extends SliverPersistentHeaderDelegate {
  final Widget child;
  _ToolbarDelegate({required this.child});

  static const double _height = 102;

  @override
  double get minExtent => _height;
  @override
  double get maxExtent => _height;

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) => SizedBox.expand(child: child);

  @override
  bool shouldRebuild(_ToolbarDelegate old) => true;
}

class _Chip extends StatelessWidget {
  final String label;
  final IconData? icon;
  final bool selected;
  final VoidCallback onTap;
  const _Chip({required this.label, this.icon, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final fg = selected ? colors.onAccent : colors.gray600;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: InkWell(
        onTap: onTap,
        borderRadius: SalacopeTokens.borderFull,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14),
          decoration: BoxDecoration(
            color: selected ? colors.accent : colors.surface,
            borderRadius: SalacopeTokens.borderFull,
            border: Border.all(color: selected ? colors.accent : colors.gray200),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (icon != null) ...[Icon(icon, size: 14, color: fg), const SizedBox(width: 6)],
              Text(label, style: SalacopeTypography.label.copyWith(color: fg, fontWeight: FontWeight.w500)),
            ],
          ),
        ),
      ),
    );
  }
}

/// A grey block of white figure cards (big number, name, ⓘ).
class _StatSection extends StatelessWidget {
  final String title;
  final List<_Tile> tiles;
  const _StatSection({required this.title, required this.tiles});

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: colors.gray100, borderRadius: BorderRadius.circular(SalacopeTokens.radius2xl)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(4, 2, 4, 10),
            child: Text(title, style: SalacopeTypography.bodyStrong.copyWith(color: colors.gray900)),
          ),
          LayoutBuilder(
            builder: (context, box) {
              final w = (box.maxWidth - 10) / 2;
              return Wrap(
                spacing: 10,
                runSpacing: 10,
                children: [for (final t in tiles) SizedBox(width: w, child: t)],
              );
            },
          ),
        ],
      ),
    );
  }
}

class _Tile extends StatelessWidget {
  final String label;
  final String value;
  final String help;
  final bool loading;
  const _Tile({required this.label, required this.value, required this.help, this.loading = false});

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    return Container(
      constraints: const BoxConstraints(minHeight: 96),
      padding: const EdgeInsets.fromLTRB(14, 12, 8, 12),
      decoration: BoxDecoration(color: colors.surface, borderRadius: BorderRadius.circular(SalacopeTokens.radiusXl)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            height: 32,
            child: loading
                ? const Align(alignment: Alignment.centerLeft, child: SShimmer(child: SShimmerBox(width: 64, height: 24, radius: 6)))
                : FittedBox(
                    fit: BoxFit.scaleDown,
                    alignment: Alignment.centerLeft,
                    child: Text(
                      value,
                      style: SalacopeTypography.title.copyWith(color: colors.gray900, fontFeatures: const [FontFeature.tabularFigures()]),
                    ),
                  ),
          ),
          const SizedBox(height: 6),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(child: Text(label, style: SalacopeTypography.caption.copyWith(color: colors.gray500))),
              HelpTip(text: help),
            ],
          ),
        ],
      ),
    );
  }
}

class _ListTitle extends StatelessWidget {
  final String title;
  final String action;
  final VoidCallback onAction;
  const _ListTitle({required this.title, required this.action, required this.onAction});

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    return Padding(
      padding: const EdgeInsets.fromLTRB(4, 0, 0, 8),
      child: Row(
        children: [
          Expanded(child: Text(title, style: SalacopeTypography.bodyStrong.copyWith(color: colors.gray900))),
          TextButton(onPressed: onAction, child: Text(action, style: SalacopeTypography.body.copyWith(color: colors.gray500))),
        ],
      ),
    );
  }
}
