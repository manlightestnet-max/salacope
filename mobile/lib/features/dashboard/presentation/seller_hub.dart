import 'package:flutter/material.dart';
import 'package:flutter_custom_tabs/flutter_custom_tabs.dart' as tabs;
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../core/api/api_client.dart';
import '../../../core/db/store.dart';
import '../../../core/design/colors.dart';
import '../../../core/design/typography.dart';
import '../../../core/domain/orders.dart';
import 'package:salacope/core/lib/remembered.dart';
import '../../../core/routing/links.dart';
import '../../../core/ui/s_button.dart';
import '../../../core/ui/s_empty_state.dart';
import '../../../core/ui/s_tabs.dart';
import '../../../core/ui/s_toast.dart';
import 'screens/customers_screen.dart';
import 'screens/dashboard_screen.dart';
import 'screens/payouts_screen.dart';
import 'screens/sales_screen.dart';
import 'screens/seller_listings_screen.dart';

const List<String> sellerSections = ['apercu', 'ventes', 'offres', 'clients', 'paiements'];

/// The section of the Boutique on screen, kept for the next visit.
final Remembered sellerSection = Remembered('seller.section', sellerSections, 'apercu');

/// Shows a section of the Boutique (its tab in the bottom bar), from anywhere in the app. Never a new screen on top.
void openSellerSection(BuildContext context, String section) {
  sellerSection.value = section;
  context.go('/boutique');
}

/// The seller's back-office in the Boutique tab: one bar (store name, the action of the section), the sections as tabs
/// under it (Aperçu, Ventes, Offres, Clients, Paiements). Switching section changes the content in place: nothing is
/// stacked, back leaves the tab. Each section keeps its scroll and filters while the app is open.
class SellerHubScreen extends StatefulWidget {
  /// From an address (`/boutique?vue=ventes`, notifications, the web's /dashboard/…).
  final String? initial;
  const SellerHubScreen({super.key, this.initial});

  @override
  State<SellerHubScreen> createState() => _SellerHubScreenState();
}

class _SellerHubScreenState extends State<SellerHubScreen> {
  final Set<String> _opened = {};

  @override
  void initState() {
    super.initState();
    _apply(widget.initial);
  }

  @override
  void didUpdateWidget(SellerHubScreen old) {
    super.didUpdateWidget(old);
    if (widget.initial != old.initial) _apply(widget.initial);
  }

  void _apply(String? section) {
    if (section != null && sellerSections.contains(section)) sellerSection.value = section;
  }

  Widget _section(String id) => switch (id) {
        'ventes' => const SalesScreen(),
        'offres' => const SellerListingsScreen(),
        'clients' => const CustomersScreen(),
        'paiements' => const PayoutsScreen(),
        _ => const DashboardScreen(inTab: true),
      };

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    return ListenableBuilder(
      listenable: Listenable.merge([db, sellerSection]),
      builder: (context, _) {
        final state = db.state;
        final me = state.sessionUserId ?? '';
        final merchant = state.users.where((u) => u.id == me).firstOrNull?.merchant;

        if (merchant == null) {
          return Scaffold(
            backgroundColor: colors.canvas,
            appBar: AppBar(backgroundColor: colors.canvas, title: Text('Boutique', style: SalacopeTypography.title.copyWith(color: colors.textPrimary))),
            body: SEmptyState(
              icon: LucideIcons.store,
              title: 'Ouvrez votre boutique',
              description: 'Vendez vos services, formations et e-books sur Salacope.',
              action: SButton(label: 'Ouvrir ma boutique', variant: SButtonVariant.primary, size: SButtonSize.md, pill: true, onPressed: () => context.push('/vendre')),
            ),
          );
        }

        final current = sellerSection.value;
        _opened.add(current);
        final toDo = state.orders.where((o) => o.sellerId == me && needsAction(o, Perspective.seller)).length;
        final drafts = state.listings.where((l) => l.sellerId == me && l.status == 'draft').length;

        return Scaffold(
          backgroundColor: colors.canvas,
          appBar: AppBar(
            backgroundColor: colors.canvas,
            surfaceTintColor: Colors.transparent,
            titleSpacing: 20,
            title: Row(
              children: [
                Flexible(
                  child: Text(
                    merchant.storeName.isNotEmpty ? merchant.storeName : 'Ma boutique',
                    overflow: TextOverflow.ellipsis,
                    style: SalacopeTypography.title.copyWith(color: colors.textPrimary),
                  ),
                ),
                if (merchant.verified == true) ...[
                  const SizedBox(width: 6),
                  Icon(LucideIcons.badgeCheck, size: 18, color: colors.textPrimary),
                ],
              ],
            ),
            actions: [
              if (current == 'paiements' && merchant.lightpayConnected == true)
                SButton(
                  label: 'Retirer',
                  variant: SButtonVariant.secondary,
                  size: SButtonSize.sm,
                  pill: true,
                  icon: const Icon(LucideIcons.arrowUpRight, size: 14),
                  onPressed: () => openLightPayWallet(context),
                )
              else if (current == 'apercu' || current == 'offres')
                SButton(
                  label: 'Nouvelle offre',
                  variant: SButtonVariant.primary,
                  size: SButtonSize.sm,
                  pill: true,
                  icon: const Icon(LucideIcons.plus, size: 14),
                  onPressed: () => context.push('/dashboard/offres/nouvelle'),
                ),
              const SizedBox(width: 16),
            ],
            bottom: PreferredSize(
              preferredSize: const Size.fromHeight(47),
              child: DecoratedBox(
                decoration: BoxDecoration(border: Border(bottom: BorderSide(color: colors.canvasBorder))),
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: STabs<String>(
                    value: current,
                    onChanged: (v) => sellerSection.value = v,
                    tabs: [
                      const STab(value: 'apercu', label: 'Aperçu'),
                      STab(value: 'ventes', label: 'Ventes', count: toDo),
                      STab(value: 'offres', label: 'Offres', alert: drafts > 0),
                      const STab(value: 'clients', label: 'Clients'),
                      STab(value: 'paiements', label: 'Paiements', alert: merchant.lightpayConnected != true),
                    ],
                  ),
                ),
              ),
            ),
          ),
          // Each section is built the first time it is shown, then kept (its scroll and filters stay as left).
          body: IndexedStack(
            index: sellerSections.indexOf(current),
            children: [
              for (final id in sellerSections) _opened.contains(id) ? _section(id) : const SizedBox.shrink(),
            ],
          ),
        );
      },
    );
  }
}

/// The seller's LightPay wallet (balance, withdrawals): the LightPay app when it is on the phone, in its own task;
/// otherwise LightPay's withdrawal page in a browser tab over Salacope.
Future<void> openLightPayWallet(BuildContext context) async {
  if (await links.launchLightPay()) return;
  if (!context.mounted) return;
  final toolbar = context.colors.surface;
  try {
    final res = await api.request('GET', '/lightpay/wallet');
    final url = res is Map ? (res['withdrawUrl'] ?? res['accountUrl'])?.toString() : null;
    if (url == null || url.isEmpty) throw Exception('LightPay n’a pas répondu.');
    await tabs.launchUrl(
      Uri.parse(url),
      customTabsOptions: tabs.CustomTabsOptions(
        colorSchemes: tabs.CustomTabsColorSchemes.defaults(toolbarColor: toolbar),
        shareState: tabs.CustomTabsShareState.off,
        showTitle: true,
      ),
    );
  } catch (e) {
    if (context.mounted) SToast.error(context, 'Impossible d’ouvrir LightPay. Vérifiez votre connexion.');
  }
}
