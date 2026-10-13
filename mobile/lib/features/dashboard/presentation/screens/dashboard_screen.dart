import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:salacope/core/db/models/order.dart';
import 'package:salacope/core/db/store.dart';
import 'package:salacope/core/design/theme.dart';
import 'package:salacope/core/design/tokens.dart';
import 'package:salacope/core/design/typography.dart';
import 'package:salacope/core/domain/orders.dart';
import 'package:salacope/core/lib/format.dart';
import 'package:salacope/core/ui/bar_chart.dart';
import 'package:salacope/core/ui/s_badge.dart';
import 'package:salacope/core/ui/s_button.dart';
import 'package:salacope/core/ui/s_empty_state.dart';
import 'package:salacope/core/ui/s_image.dart';
import 'package:salacope/core/ui/s_page.dart';
import 'package:salacope/core/ui/s_panel.dart';
import 'package:salacope/core/ui/s_segmented.dart';
import 'package:salacope/core/ui/s_stat.dart';
import 'package:salacope/features/verification/presentation/widgets/verification_notice.dart';
import 'package:salacope/features/wallet/domain/wallet_model.dart';

class DashboardScreen extends StatefulWidget {
  /// Shown as the "Boutique" tab of the bottom bar (no back arrow).
  final bool inTab;
  const DashboardScreen({super.key, this.inTab = false});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  String _period = '30'; // '7', '30', '90', 'all'

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;

    return ListenableBuilder(
      listenable: db,
      builder: (context, _) {
        final state = db.state;
        final currentUserId = state.sessionUserId ?? '';
        final currentUser = state.users.where((u) => u.id == currentUserId).firstOrNull;
        final merchant = currentUser?.merchant;

        if (merchant == null) {
          return Scaffold(
            backgroundColor: colors.canvas,
            appBar: AppBar(
              backgroundColor: colors.surface,
              elevation: 0,
              title: const Text('Boutique'),
            ),
            body: SEmptyState(
              icon: LucideIcons.store,
              title: 'Ouvrez votre boutique',
              description: 'Vendez vos services et formations sur Salacope en quelques minutes.',
              action: SButton(
                label: 'Ouvrir ma boutique',
                variant: SButtonVariant.primary,
                size: SButtonSize.md,
                pill: true,
                onPressed: () => context.push('/vendre'),
              ),
            ),
          );
        }

        final sellerOrders = state.orders.where((o) => o.sellerId == currentUserId).toList();
        final balance = computeBalance(sellerOrders);

        final listings = state.listings.where((l) => l.sellerId == currentUserId).toList();

        final todoOrders = sellerOrders.where((o) {
          final perms = permissionsFor(
            status: o.status,
            kind: o.item.kind,
            perspective: Perspective.seller,
          );
          return perms.accept || perms.deliver || o.status == 'disputed';
        }).toList()
          ..sort((a, b) => b.createdAt.compareTo(a.createdAt));

        final series = _buildSeries(sellerOrders, _period);
        final periodLabel = _period == 'all' ? 'depuis le début' : 'sur $_period jours';

        // Best seller listings
        final listingSales = <String, int>{};
        final listingRevenue = <String, int>{};
        for (final o in sellerOrders) {
          if (o.status != 'cancelled') {
            listingSales[o.listingId] = (listingSales[o.listingId] ?? 0) + 1;
            listingRevenue[o.listingId] = (listingRevenue[o.listingId] ?? 0) + o.amounts.net;
          }
        }

        final topListings = listings.where((l) => (listingSales[l.id] ?? 0) > 0).toList()
          ..sort((a, b) => (listingRevenue[b.id] ?? 0).compareTo(listingRevenue[a.id] ?? 0));

        return SPage(
          title: merchant.storeName.isNotEmpty ? merchant.storeName : 'Tableau de bord',
          leading: widget.inTab ? null : const BackButton(),
          actions: [
            SButton(
              label: 'Nouvelle offre',
              variant: SButtonVariant.primary,
              size: SButtonSize.sm,
              pill: true,
              icon: const Icon(LucideIcons.plus, size: 14),
              onPressed: () => context.push('/dashboard/offres/nouvelle'),
            ),
          ],
          toolbar: PreferredSize(
            preferredSize: const Size.fromHeight(48),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(
                children: [
                  _NavPill(
                    label: "Vue d'ensemble",
                    active: true,
                    onTap: () {},
                  ),
                  _NavPill(
                    label: 'Ventes',
                    badge: todoOrders.isNotEmpty ? '${todoOrders.length}' : null,
                    onTap: () => context.push('/dashboard/ventes'),
                  ),
                  _NavPill(
                    label: 'Offres',
                    onTap: () => context.push('/dashboard/offres'),
                  ),
                  _NavPill(
                    label: 'Clients',
                    onTap: () => context.push('/dashboard/clients'),
                  ),
                  _NavPill(
                    label: 'Paiements',
                    onTap: () => context.push('/dashboard/paiements'),
                  ),
                  if (merchant.kycStatus != 'approved')
                    _NavPill(
                      label: 'Vérification',
                      badge: merchant.kycStatus == 'pending' ? null : '!',
                      onTap: () => context.push('/dashboard/verification'),
                    ),
                ],
              ),
            ),
          ),
          slivers: [
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    VerificationNotice(merchant: merchant),
                    const SizedBox(height: 16),

                    // Overview panel
                    SPanel(
                      titleText: 'Aperçu des ventes',
                      actions: SSegmented<String>(
                        value: _period,
                        options: const [
                          SSegmentedOption(value: '7', label: '7 j'),
                          SSegmentedOption(value: '30', label: '30 j'),
                          SSegmentedOption(value: '90', label: '90 j'),
                          SSegmentedOption(value: 'all', label: 'Tout'),
                        ],
                        onChanged: (p) => setState(() => _period = p),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          SStatGrid(
                            stats: [
                              SStat(
                                label: 'COMMANDES',
                                value: '${series.count}',
                              ),
                              SStat(
                                label: 'VOLUME NET',
                                value: formatXaf(series.revenue),
                              ),
                              SStat(
                                label: 'BLOQUÉ',
                                value: formatXaf(balance.escrow + balance.frozen),
                              ),
                              SStat(
                                label: 'VERSÉ SUR LIGHTPAY',
                                value: formatXaf(balance.released),
                                emphasis: true,
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),
                          BarChart(
                            title: 'Revenus $periodLabel',
                            data: series.data,
                            formatValue: (v) => formatXaf(v),
                            labelEvery: _period == '7' ? 1 : _period == '30' ? 7 : _period == '90' ? 15 : 2,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Todo orders lane
                    SPanel(
                      titleText: 'À traiter',
                      count: todoOrders.length,
                      actions: todoOrders.length > 5
                          ? InkWell(
                              onTap: () => context.push('/dashboard/ventes'),
                              child: Text(
                                'Tout voir',
                                style: TextStyle(
                                  color: colors.accent,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            )
                          : null,
                      child: todoOrders.isEmpty
                          ? Center(
                              child: Padding(
                                padding: const EdgeInsets.symmetric(vertical: 16),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(LucideIcons.circleCheck, size: 16, color: colors.accent),
                                    const SizedBox(width: 8),
                                    Text(
                                      'Tout est à jour ! Aucune action en attente.',
                                      style: SalacopeTypography.body.copyWith(
                                        color: colors.textSecondary,
                                        fontSize: 13,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            )
                          : ListView.separated(
                              shrinkWrap: true,
                              physics: const NeverScrollableScrollPhysics(),
                              itemCount: todoOrders.take(5).length,
                              separatorBuilder: (_, _) => Divider(
                                height: 1,
                                thickness: 0.8,
                                color: colors.canvasBorder,
                              ),
                              itemBuilder: (context, index) {
                                final order = todoOrders[index];
                                final info = statusDisplay(
                                  status: order.status,
                                  perspective: Perspective.seller,
                                  extensionStatus: order.extension?.status,
                                );

                                final SBadgeTone badgeTone = switch (info.tone) {
                                  OrderBadgeTone.success => SBadgeTone.success,
                                  OrderBadgeTone.warning => SBadgeTone.warning,
                                  OrderBadgeTone.danger => SBadgeTone.danger,
                                  OrderBadgeTone.brand => SBadgeTone.brand,
                                  OrderBadgeTone.info => SBadgeTone.info,
                                  OrderBadgeTone.neutral => SBadgeTone.neutral,
                                };

                                return InkWell(
                                  onTap: () => context.push('/orders/${order.id}'),
                                  child: Padding(
                                    padding: const EdgeInsets.symmetric(vertical: 10),
                                    child: Row(
                                      children: [
                                        ClipRRect(
                                          borderRadius: BorderRadius.circular(SalacopeTokens.radiusSm),
                                          child: SizedBox(
                                            width: 40,
                                            height: 40,
                                            child: SImage(
                                              url: order.item.coverImage,
                                              fit: BoxFit.cover,
                                            ),
                                          ),
                                        ),
                                        const SizedBox(width: 10),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Text(
                                                order.item.title,
                                                maxLines: 1,
                                                overflow: TextOverflow.ellipsis,
                                                style: SalacopeTypography.bodyStrong.copyWith(fontSize: 13),
                                              ),
                                              Text(
                                                '${order.buyer.name} · ${order.number}',
                                                style: SalacopeTypography.caption.copyWith(fontSize: 11),
                                              ),
                                            ],
                                          ),
                                        ),
                                        const SizedBox(width: 8),
                                        SBadge(label: info.label, tone: badgeTone),
                                        const SizedBox(width: 8),
                                        Text(
                                          formatXaf(order.amounts.net),
                                          style: SalacopeTypography.bodyStrong.copyWith(fontSize: 13),
                                        ),
                                        Icon(LucideIcons.chevronRight, size: 16, color: colors.textMuted),
                                      ],
                                    ),
                                  ),
                                );
                              },
                            ),
                    ),
                    const SizedBox(height: 16),

                    // Top listings
                    SPanel(
                      titleText: 'Meilleures offres',
                      actions: topListings.isNotEmpty
                          ? InkWell(
                              onTap: () => context.push('/dashboard/offres'),
                              child: Text(
                                'Tout voir',
                                style: TextStyle(
                                  color: colors.accent,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            )
                          : null,
                      child: topListings.isEmpty
                          ? Center(
                              child: Padding(
                                padding: const EdgeInsets.symmetric(vertical: 16),
                                child: Text(
                                  'Pas encore de ventes sur vos offres.',
                                  style: SalacopeTypography.body.copyWith(
                                    color: colors.textMuted,
                                    fontSize: 13,
                                  ),
                                ),
                              ),
                            )
                          : ListView.separated(
                              shrinkWrap: true,
                              physics: const NeverScrollableScrollPhysics(),
                              itemCount: topListings.take(4).length,
                              separatorBuilder: (_, _) => Divider(
                                height: 1,
                                thickness: 0.8,
                                color: colors.canvasBorder,
                              ),
                              itemBuilder: (context, index) {
                                final l = topListings[index];
                                final sales = listingSales[l.id] ?? 0;
                                final rev = listingRevenue[l.id] ?? 0;

                                return InkWell(
                                  onTap: () => context.push('/dashboard/offres/${l.id}'),
                                  child: Padding(
                                    padding: const EdgeInsets.symmetric(vertical: 10),
                                    child: Row(
                                      children: [
                                        ClipRRect(
                                          borderRadius: BorderRadius.circular(SalacopeTokens.radiusSm),
                                          child: SizedBox(
                                            width: 40,
                                            height: 40,
                                            child: SImage(url: l.coverImage, fit: BoxFit.cover),
                                          ),
                                        ),
                                        const SizedBox(width: 10),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Text(
                                                l.title,
                                                maxLines: 1,
                                                overflow: TextOverflow.ellipsis,
                                                style: SalacopeTypography.bodyStrong.copyWith(fontSize: 13),
                                              ),
                                              Text(
                                                plural(sales, 'vente'),
                                                style: SalacopeTypography.caption.copyWith(fontSize: 11),
                                              ),
                                            ],
                                          ),
                                        ),
                                        const SizedBox(width: 8),
                                        Text(
                                          formatXaf(rev),
                                          style: SalacopeTypography.bodyStrong.copyWith(
                                            color: colors.accent,
                                            fontSize: 13,
                                          ),
                                        ),
                                        Icon(LucideIcons.chevronRight, size: 16, color: colors.textMuted),
                                      ],
                                    ),
                                  ),
                                );
                              },
                            ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        );
      },
    );
  }

  _SeriesResult _buildSeries(List<Order> orders, String period) {
    const dayMs = 86400000;
    final paidOrders = orders.where((o) => o.status != 'cancelled').toList();

    if (period == 'all') {
      final now = DateTime.now();
      final months = List.generate(12, (i) {
        final d = DateTime(now.year, now.month - 11 + i, 1);
        final monthNames = [
          'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
          'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'
        ];
        return _MonthBucket(
          year: d.year,
          month: d.month,
          label: monthNames[d.month - 1],
          value: 0,
        );
      });

      int revenue = 0;
      for (final o in paidOrders) {
        final d = DateTime.tryParse(o.createdAt);
        if (d != null) {
          final bucket = months.where((b) => b.year == d.year && b.month == d.month).firstOrNull;
          if (bucket != null) bucket.value += o.amounts.net;
          revenue += o.amounts.net;
        }
      }

      return _SeriesResult(
        data: months.map((b) => BarDatum(key: '${b.year}-${b.month}', label: b.label, value: b.value)).toList(),
        revenue: revenue,
        count: paidOrders.length,
      );
    }

    final days = int.tryParse(period) ?? 30;
    final now = DateTime.now();
    final start = DateTime(now.year, now.month, now.day).subtract(Duration(days: days - 1));
    final startTime = start.millisecondsSinceEpoch;

    final data = List.generate(days, (i) {
      final d = start.add(Duration(days: i));
      return BarDatum(
        key: '${d.year}-${d.month}-${d.day}',
        label: '${d.day}',
        value: 0,
      );
    });

    int revenue = 0;
    int count = 0;
    final dataMap = <int, int>{};

    for (final o in paidOrders) {
      final d = DateTime.tryParse(o.createdAt);
      if (d != null) {
        final idx = (d.millisecondsSinceEpoch - startTime) ~/ dayMs;
        if (idx >= 0 && idx < days) {
          dataMap[idx] = (dataMap[idx] ?? 0) + o.amounts.net;
          revenue += o.amounts.net;
          count++;
        }
      }
    }

    final finalData = List.generate(days, (i) {
      final base = data[i];
      return BarDatum(key: base.key, label: base.label, value: dataMap[i] ?? 0);
    });

    return _SeriesResult(data: finalData, revenue: revenue, count: count);
  }
}

class _NavPill extends StatelessWidget {
  final String label;
  final bool active;
  final String? badge;
  final VoidCallback onTap;

  const _NavPill({
    required this.label,
    this.active = false,
    this.badge,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;

    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(SalacopeTokens.radiusFull),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
          decoration: BoxDecoration(
            color: active ? colors.accent : colors.surface,
            borderRadius: BorderRadius.circular(SalacopeTokens.radiusFull),
            border: Border.all(
              color: active ? colors.accent : colors.canvasBorder,
              width: 0.8,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                label,
                style: TextStyle(
                  fontSize: 12.5,
                  fontWeight: active ? FontWeight.w600 : FontWeight.w500,
                  color: active ? colors.onAccent : colors.textPrimary,
                ),
              ),
              if (badge != null) ...[
                const SizedBox(width: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                  decoration: BoxDecoration(
                    color: active ? colors.onAccent.withValues(alpha: 0.2) : colors.accent,
                    borderRadius: BorderRadius.circular(SalacopeTokens.radiusFull),
                  ),
                  child: Text(
                    badge!,
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w700,
                      color: active ? colors.onAccent : colors.onAccent,
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _SeriesResult {
  final List<BarDatum> data;
  final int revenue;
  final int count;

  _SeriesResult({required this.data, required this.revenue, required this.count});
}

class _MonthBucket {
  final int year;
  final int month;
  final String label;
  int value;

  _MonthBucket({required this.year, required this.month, required this.label, required this.value});
}
