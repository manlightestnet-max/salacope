import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../../core/db/store.dart';
import '../../../../core/design/colors.dart';
import '../../../../core/domain/orders.dart';
import 'package:salacope/core/lib/format.dart';
import 'package:salacope/core/lib/remembered.dart';
import '../../../../core/ui/s_button.dart';
import '../../../../core/ui/s_empty_state.dart';
import '../../../../core/ui/s_page.dart';
import '../../../../core/ui/s_segmented.dart';
import '../widgets/order_row.dart';

/// Achats: what the person bought (never their sales), the newest first. Filter Tout / Produits / Services, kept for
/// the next visit. Cancelled orders stay listed, struck through and in grey.
class OrdersScreen extends StatelessWidget {
  const OrdersScreen({super.key});

  static final Remembered _filter = Remembered('purchases.kind', const ['all', 'digital', 'service'], 'all');

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;

    return ListenableBuilder(
      listenable: Listenable.merge([db, _filter]),
      builder: (context, _) {
        final state = db.state;
        final me = state.sessionUserId ?? '';
        final mine = state.orders.where((o) => o.buyerId == me).toList()..sort((a, b) => b.createdAt.compareTo(a.createdAt));
        final kind = _filter.value;
        final shown = kind == 'all' ? mine : mine.where((o) => o.item.kind == kind).toList();
        final products = mine.where((o) => o.item.kind == 'digital').length;
        final services = mine.where((o) => o.item.kind == 'service').length;

        return SPage(
          title: 'Mes achats',
          toolbar: mine.isEmpty
              ? null
              : PreferredSize(
                  preferredSize: const Size.fromHeight(56),
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 4, 20, 12),
                    child: SSegmented<String>(
                      expand: true,
                      value: kind,
                      onChanged: (v) => _filter.value = v,
                      options: [
                        SSegmentedOption(value: 'all', label: 'Tout', count: mine.length),
                        SSegmentedOption(value: 'digital', label: 'Produits', count: products),
                        SSegmentedOption(value: 'service', label: 'Services', count: services),
                      ],
                    ),
                  ),
                ),
          slivers: [
            if (shown.isEmpty)
              SliverFillRemaining(
                hasScrollBody: false,
                child: SEmptyState(
                  icon: LucideIcons.shoppingBag,
                  title: mine.isEmpty ? 'Aucun achat pour le moment' : (kind == 'service' ? 'Aucun service commandé' : 'Aucun produit acheté'),
                  description: mine.isEmpty ? 'Vos e-books, formations et services commandés apparaissent ici.' : null,
                  action: mine.isEmpty
                      ? SButton(label: 'Explorer les copes', variant: SButtonVariant.secondary, size: SButtonSize.md, pill: true, onPressed: () => context.go('/'))
                      : null,
                ),
              )
            else
              SliverList.separated(
                itemCount: shown.length,
                separatorBuilder: (_, _) => Divider(height: 1, thickness: 0.8, indent: 86, color: colors.canvasBorder),
                itemBuilder: (context, i) {
                  final o = shown[i];
                  final seller = state.users.where((u) => u.id == o.sellerId).firstOrNull;
                  return OrderRow(
                    order: o,
                    perspective: Perspective.buyer,
                    subtitle: seller?.merchant?.storeName ?? seller?.name ?? o.number,
                    corner: formatDate(o.createdAt),
                    showAmount: true,
                    onTap: () => context.push('/orders/${o.id}'),
                  );
                },
              ),
            const SliverToBoxAdapter(child: SizedBox(height: 24)),
          ],
        );
      },
    );
  }
}
