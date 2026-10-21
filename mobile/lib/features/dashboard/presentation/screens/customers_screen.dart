import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:salacope/core/db/models/order.dart';
import 'package:salacope/core/db/store.dart';
import 'package:salacope/core/design/colors.dart';
import 'package:salacope/core/design/tokens.dart';
import 'package:salacope/core/design/typography.dart';
import 'package:salacope/core/lib/format.dart';
import 'package:salacope/core/ui/s_avatar.dart';
import 'package:salacope/core/ui/s_dialog.dart';
import 'package:salacope/core/ui/s_empty_state.dart';
import 'package:salacope/core/ui/s_page.dart';
import 'package:salacope/core/ui/s_panel.dart';
import 'package:salacope/core/ui/s_stat.dart';

class _Customer {
  final String id;
  final String name;
  int orders;
  int spent;
  String lastOrderAt;

  _Customer({
    required this.id,
    required this.name,
    required this.orders,
    required this.spent,
    required this.lastOrderAt,
  });
}

class CustomersScreen extends StatefulWidget {
  const CustomersScreen({super.key});

  @override
  State<CustomersScreen> createState() => _CustomersScreenState();
}

class _CustomersScreenState extends State<CustomersScreen> {
  String _search = '';

  void _showCustomerDetail(BuildContext context, _Customer customer, List<Order> customerOrders) {
    final colors = context.colors;

    showSSheet(
      context: context,
      title: customer.name,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              SAvatar(name: customer.name, size: SAvatarSize.lg),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      customer.name,
                      style: SalacopeTypography.bodyStrong.copyWith(color: colors.textPrimary, fontSize: 15),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Dernier achat : ${formatDate(customer.lastOrderAt)}',
                      style: SalacopeTypography.caption.copyWith(color: colors.textMuted),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          SStatGrid(
            stats: [
              SStat(
                label: 'COMMANDES',
                value: '${customer.orders}',
              ),
              SStat(
                label: 'DÉPENSÉ TOTAL',
                value: formatXaf(customer.spent),
                emphasis: true,
              ),
            ],
          ),
          const SizedBox(height: 20),
          Text(
            'HISTORIQUE DES COMMANDES',
            style: SalacopeTypography.caption.copyWith(color: colors.textMuted, letterSpacing: 0.5),
          ),
          const SizedBox(height: 8),
          ...customerOrders.map((o) => ListTile(
                contentPadding: EdgeInsets.zero,
                title: Text(
                  o.item.title,
                  style: SalacopeTypography.bodyStrong.copyWith(fontSize: 13),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                subtitle: Text(
                  '${o.number} · ${formatDate(o.createdAt)}',
                  style: SalacopeTypography.caption.copyWith(color: colors.textMuted),
                ),
                trailing: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      formatXaf(o.amounts.net),
                      style: SalacopeTypography.bodyStrong.copyWith(fontSize: 12),
                    ),
                    const SizedBox(width: 8),
                    Icon(LucideIcons.chevronRight, size: 16, color: colors.textMuted),
                  ],
                ),
                onTap: () {
                  Navigator.pop(context);
                  context.push('/orders/${o.id}');
                },
              )),
          const SizedBox(height: 16),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final user = db.user;
    final allOrders = db.orders;

    if (user == null || user.merchant == null) {
      return Scaffold(
        backgroundColor: colors.canvas,
        appBar: AppBar(backgroundColor: colors.canvas, leading: const BackButton()),
        body: const Center(
          child: SEmptyState(
            title: 'Boutique requise',
            description: 'Vous devez avoir une boutique pour voir vos clients.',
          ),
        ),
      );
    }

    final sellerOrders = allOrders.where((o) => o.sellerId == user.id).toList();

    // Build customers map
    final customerMap = <String, _Customer>{};
    for (final o in sellerOrders.where((x) => x.status != 'cancelled')) {
      final existing = customerMap[o.buyerId];
      if (existing == null) {
        customerMap[o.buyerId] = _Customer(
          id: o.buyerId,
          name: o.buyer.name,
          orders: 1,
          spent: o.amounts.total,
          lastOrderAt: o.createdAt,
        );
      } else {
        existing.orders += 1;
        existing.spent += o.amounts.total;
        if (o.createdAt.compareTo(existing.lastOrderAt) > 0) {
          existing.lastOrderAt = o.createdAt;
        }
      }
    }

    final customers = customerMap.values.toList()
      ..sort((a, b) => b.spent.compareTo(a.spent));

    final q = _search.toLowerCase().trim();
    final visible = customers.where((c) {
      if (q.isEmpty) return true;
      return c.name.toLowerCase().contains(q);
    }).toList();

    return SPage(
      embedded: true,
      title: 'Clients',
      slivers: [
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (customers.isEmpty)
                  const SEmptyState(
                    title: 'Aucun client',
                    description: 'Vos clients apparaîtront ici dès leur premier achat.',
                  )
                else ...[
                  TextField(
                    decoration: InputDecoration(
                      hintText: 'Rechercher un client…',
                      prefixIcon: Icon(LucideIcons.search, size: 18, color: colors.textMuted),
                      filled: true,
                      fillColor: colors.surface,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(SalacopeTokens.radiusLg),
                        borderSide: BorderSide(color: colors.canvasBorder),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(SalacopeTokens.radiusLg),
                        borderSide: BorderSide(color: colors.canvasBorder),
                      ),
                    ),
                    style: TextStyle(color: colors.textPrimary, fontSize: 13),
                    onChanged: (val) => setState(() => _search = val),
                  ),
                  const SizedBox(height: 16),
                  SPanel(
                    titleText: 'Répertoire des clients',
                    count: visible.length,
                    child: visible.isEmpty
                        ? const SEmptyState(title: 'Aucun client ne correspond.')
                        : Column(
                            children: visible.map((c) {
                              final cOrders = sellerOrders.where((o) => o.buyerId == c.id).toList();
                              return InkWell(
                                onTap: () => _showCustomerDetail(context, c, cOrders),
                                borderRadius: BorderRadius.circular(SalacopeTokens.radiusMd),
                                child: Padding(
                                  padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
                                  child: Row(
                                    children: [
                                      SAvatar(name: c.name, size: SAvatarSize.md),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              c.name,
                                              style: SalacopeTypography.bodyStrong
                                                  .copyWith(color: colors.textPrimary, fontSize: 13),
                                            ),
                                            const SizedBox(height: 2),
                                            Text(
                                              'Dernier achat le ${formatDate(c.lastOrderAt)}',
                                              style: SalacopeTypography.caption
                                                  .copyWith(color: colors.textMuted, fontSize: 11),
                                            ),
                                          ],
                                        ),
                                      ),
                                      Column(
                                        crossAxisAlignment: CrossAxisAlignment.end,
                                        children: [
                                          Text(
                                            formatXaf(c.spent),
                                            style: SalacopeTypography.bodyStrong
                                                .copyWith(color: colors.textPrimary, fontSize: 13),
                                          ),
                                          const SizedBox(height: 2),
                                          Text(
                                            '${c.orders} commande${c.orders > 1 ? "s" : ""}',
                                            style: SalacopeTypography.caption
                                                .copyWith(color: colors.textSecondary, fontSize: 11),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            }).toList(),
                          ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ],
    );
  }
}

