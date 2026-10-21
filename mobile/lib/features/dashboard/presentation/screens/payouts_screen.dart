import 'package:flutter/material.dart';
import 'package:flutter_custom_tabs/flutter_custom_tabs.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:salacope/core/db/store.dart';
import 'package:salacope/core/design/colors.dart';
import 'package:salacope/core/design/tokens.dart';
import 'package:salacope/core/design/typography.dart';
import 'package:salacope/core/domain/orders.dart';
import 'package:salacope/core/lib/format.dart';
import 'package:salacope/core/ui/s_badge.dart';
import 'package:salacope/core/ui/s_button.dart';
import 'package:salacope/core/ui/s_empty_state.dart';
import 'package:salacope/core/ui/s_image.dart';
import 'package:salacope/core/ui/s_page.dart';
import 'package:salacope/core/ui/s_panel.dart';
import 'package:salacope/core/ui/s_segmented.dart';
import 'package:salacope/core/ui/s_stat.dart';
import 'package:salacope/core/ui/s_toast.dart';
import 'package:salacope/features/session/data/session_api.dart';
import 'package:salacope/features/wallet/domain/wallet_model.dart';

class PayoutsScreen extends StatefulWidget {
  const PayoutsScreen({super.key});

  @override
  State<PayoutsScreen> createState() => _PayoutsScreenState();
}

class _PayoutsScreenState extends State<PayoutsScreen> {
  String _view = 'releases'; // releases | movements
  bool _connecting = false;

  Future<void> _connectLightPay() async {
    final toolbarColor = Theme.of(context).scaffoldBackgroundColor;
    setState(() => _connecting = true);
    try {
      final url = await sessionApi.lightPayConnectUrl();
      if (url.isNotEmpty) {
        await launchUrl(
          Uri.parse(url),
          customTabsOptions: CustomTabsOptions(
            colorSchemes: CustomTabsColorSchemes.defaults(
              toolbarColor: toolbarColor,
            ),
            shareState: CustomTabsShareState.off,
            showTitle: true,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        SToast.error(context, e.toString());
      }
    } finally {
      if (mounted) setState(() => _connecting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final user = db.user;
    final orders = db.orders;

    if (user == null || user.merchant == null) {
      return Scaffold(
        backgroundColor: colors.canvas,
        appBar: AppBar(
          backgroundColor: colors.canvas,
          title: const Text('Paiements'),
          leading: const BackButton(),
        ),
        body: const Center(
          child: SEmptyState(
            title: 'Boutique requise',
            description: 'Vous devez avoir une boutique pour voir vos paiements.',
          ),
        ),
      );
    }

    final merchant = user.merchant!;
    final sellerOrders = orders.where((o) => o.sellerId == user.id).toList();
    final balance = computeBalance(sellerOrders);
    final releases = upcomingReleases(sellerOrders, 3);
    final ledger = buildLedger(sellerOrders);
    final isConnected = merchant.lightpayConnected == true;

    return SPage(
      embedded: true,
      title: 'Paiements',
      slivers: [
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // LightPay connection alert if not connected
                if (!isConnected) ...[
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: colors.surface,
                      borderRadius: BorderRadius.circular(SalacopeTokens.radiusXl),
                      border: Border.all(color: colors.canvasBorder),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              width: 36,
                              height: 36,
                              decoration: BoxDecoration(
                                color: colors.accent.withValues(alpha: 0.12),
                                shape: BoxShape.circle,
                              ),
                              child: Icon(LucideIcons.wallet, size: 18, color: colors.accent),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Connectez votre compte LightPay',
                                    style: SalacopeTypography.bodyStrong.copyWith(color: colors.textPrimary),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    'Où recevoir vos ventes une fois validées par les clients.',
                                    style: SalacopeTypography.caption.copyWith(color: colors.textSecondary),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 14),
                        SButton(
                          label: _connecting ? 'Connexion en cours…' : 'Connecter mon wallet LightPay',
                          variant: SButtonVariant.primary,
                          size: SButtonSize.md,
                          pill: true,
                          loading: _connecting,
                          onPressed: _connectLightPay,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                ],

                // Overview stats panel
                SPanel(
                  titleText: 'Aperçu des paiements',
                  descriptionText:
                      'Ce que Salacope vous a versé. Votre solde et vos retraits se gèrent sur LightPay.',
                  child: SStatGrid(
                    stats: [
                      SStat(
                        label: 'BLOQUÉ',
                        value: formatXaf(balance.escrow + balance.frozen),
                        hint: balance.frozen > 0
                            ? 'dont ${formatXaf(balance.frozen)} en litige'
                            : '${releases.length} vente${releases.length > 1 ? "s" : ""} en cours',
                      ),
                      SStat(
                        label: 'VENTES VALIDÉES',
                        value: formatXaf(balance.sold),
                        hint: '${ledger.length} vente${ledger.length > 1 ? "s" : ""}',
                      ),
                      SStat(
                        label: 'COMMISSION SALACOPE',
                        value: balance.commission > 0 ? '−${formatXaf(balance.commission)}' : formatXaf(0),
                      ),
                      SStat(
                        label: 'VERSÉ SUR LIGHTPAY',
                        value: formatXaf(balance.released),
                        emphasis: true,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // Movements / Releases panel
                SPanel(
                  titleText: _view == 'releases' ? 'Déblocages à venir' : 'Ventes versées',
                  count: _view == 'releases' ? releases.length : ledger.length,
                  actions: SSegmented<String>(
                    value: _view,
                    options: [
                      SSegmentedOption(value: 'releases', label: 'À venir (${releases.length})'),
                      SSegmentedOption(value: 'movements', label: 'Versées (${ledger.length})'),
                    ],
                    onChanged: (v) => setState(() => _view = v),
                  ),
                  child: _view == 'releases'
                      ? _buildReleasesList(context, releases)
                      : _buildLedgerList(context, ledger),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildReleasesList(BuildContext context, List<UpcomingRelease> releases) {
    final colors = context.colors;

    if (releases.isEmpty) {
      return const SEmptyState(
        title: 'Aucun paiement en attente',
        description: 'L’argent des futures ventes apparaîtra ici pendant leur traitement.',
      );
    }

    return Column(
      children: releases.map((r) {
        final order = r.order;
        return InkWell(
          onTap: () => context.push('/orders/${order.id}'),
          borderRadius: BorderRadius.circular(SalacopeTokens.radiusMd),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(SalacopeTokens.radiusMd),
                  child: SizedBox(
                    width: 48,
                    height: 48,
                    child: SImage(url: order.item.coverImage, fit: BoxFit.cover),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        order.item.title,
                        style: SalacopeTypography.bodyStrong.copyWith(color: colors.textPrimary, fontSize: 13),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${order.number} · ${order.buyer.name}',
                        style: SalacopeTypography.caption.copyWith(color: colors.textMuted, fontSize: 11),
                      ),
                      const SizedBox(height: 4),
                      SBadge(
                        label: order.statusLabel('seller'),
                        variant: order.status == 'delivered' ? SBadgeVariant.info : SBadgeVariant.neutral,
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      formatXaf(order.amounts.net),
                      style: SalacopeTypography.bodyStrong.copyWith(color: colors.textPrimary, fontSize: 13),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      r.at != null
                          ? '${r.estimated ? "vers le" : "le"} ${formatDate(r.at!)}'
                          : 'après livraison',
                      style: SalacopeTypography.caption.copyWith(color: colors.textMuted, fontSize: 11),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildLedgerList(BuildContext context, List<LedgerEntry> ledger) {
    final colors = context.colors;

    if (ledger.isEmpty) {
      return const SEmptyState(
        title: 'Aucune vente versée pour l’instant',
        description: 'Les fonds versés sur votre wallet LightPay apparaîtront ici.',
      );
    }

    return Column(
      children: ledger.map((entry) {
        return InkWell(
          onTap: () => context.push('/orders/${entry.id}'),
          borderRadius: BorderRadius.circular(SalacopeTokens.radiusMd),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: colors.accent.withValues(alpha: 0.1),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(LucideIcons.arrowDownLeft, size: 18, color: colors.accent),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        entry.label,
                        style: SalacopeTypography.bodyStrong.copyWith(color: colors.textPrimary, fontSize: 13),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${entry.detail} · ${formatDate(entry.at)}',
                        style: SalacopeTypography.caption.copyWith(color: colors.textMuted, fontSize: 11),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      '+${formatXaf(entry.amount)}',
                      style: SalacopeTypography.bodyStrong.copyWith(color: colors.accent, fontSize: 13),
                    ),
                    if (entry.commission > 0) ...[
                      const SizedBox(height: 2),
                      Text(
                        '${formatXaf(entry.sale)} − ${formatXaf(entry.commission)}',
                        style: SalacopeTypography.caption.copyWith(color: colors.textMuted, fontSize: 10),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }
}

