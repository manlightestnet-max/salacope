import 'package:flutter/material.dart';
import 'package:salacope/features/orders/presentation/widgets/order_row.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:salacope/core/db/models/order.dart';
import 'package:salacope/core/db/store.dart';
import 'package:salacope/core/design/colors.dart';
import 'package:salacope/core/design/tokens.dart';
import 'package:salacope/core/domain/orders.dart';
import 'package:salacope/core/lib/format.dart';
import 'package:salacope/core/ui/s_empty_state.dart';
import 'package:salacope/core/ui/s_page.dart';
import 'package:salacope/core/ui/s_panel.dart';
import 'package:salacope/core/ui/s_segmented.dart';

const Map<SellerLane, String> laneHelp = {
  SellerLane.disputed:
      'Le client a signalé un problème : l’argent est gelé par LightPay jusqu’à la décision.',
  SellerLane.late:
      'La date de livraison est passée : livrez ou demandez un délai au client.',
  SellerLane.toAccept:
      'Payées par le client, en attente de votre acceptation.',
  SellerLane.revision:
      'Le client a demandé une retouche : vous avez 3 jours pour relivrer.',
  SellerLane.toDeliver:
      'Acceptées, à livrer avant la date prévue.',
};

class SalesScreen extends StatefulWidget {
  const SalesScreen({super.key});

  @override
  State<SalesScreen> createState() => _SalesScreenState();
}

class _SalesScreenState extends State<SalesScreen> {
  String _view = 'todo'; // todo | waiting | completed | cancelled | all
  String _search = '';
  String _clientFilter = '';
  String _tagFilter = '';

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final user = db.user;
    final allOrders = db.orders;

    if (user == null || user.merchant == null) {
      return Scaffold(
        backgroundColor: colors.canvas,
        appBar: AppBar(
          backgroundColor: colors.canvas,
          title: const Text('Ventes'),
          leading: const BackButton(),
        ),
        body: const Center(
          child: SEmptyState(
            title: 'Boutique requise',
            description: 'Vous devez avoir une boutique pour voir vos ventes.',
          ),
        ),
      );
    }

    final sellerOrders = allOrders.where((o) => o.sellerId == user.id).toList();

    // Clients list
    final clientMap = <String, String>{};
    for (final o in sellerOrders) {
      clientMap[o.buyerId] = o.buyer.name;
    }
    final clientsList = clientMap.entries.toList()
      ..sort((a, b) => a.value.toLowerCase().compareTo(b.value.toLowerCase()));

    // Tags list
    final tagsSet = <String>{};
    for (final o in sellerOrders) {
      final tags = o.sellerMeta?.tags ?? [];
      tagsSet.addAll(tags);
    }
    final tagsList = tagsSet.toList()..sort();

    // Filtering
    final q = _search.toLowerCase().trim();
    final filtered = sellerOrders.where((o) {
      if (q.isNotEmpty) {
        final matchesNum = o.number.toLowerCase().contains(q);
        final matchesItem = o.item.title.toLowerCase().contains(q);
        final matchesBuyer = o.buyer.name.toLowerCase().contains(q);
        final matchesTags = (o.sellerMeta?.tags ?? []).any((t) => t.toLowerCase().contains(q));
        if (!matchesNum && !matchesItem && !matchesBuyer && !matchesTags) return false;
      }
      if (_clientFilter.isNotEmpty && o.buyerId != _clientFilter) return false;
      if (_tagFilter.isNotEmpty && !(o.sellerMeta?.tags ?? []).contains(_tagFilter)) return false;
      return true;
    }).toList();

    // Pinned
    final pinned = filtered.where((o) => o.sellerMeta?.pinnedAt != null).toList()
      ..sort((a, b) => (b.sellerMeta!.pinnedAt ?? '').compareTo(a.sellerMeta!.pinnedAt ?? ''));
    final matching = filtered.where((o) => o.sellerMeta?.pinnedAt == null).toList();

    int countForView(String v) {
      switch (v) {
        case 'todo':
          return sellerOrders.where((o) => sellerLanes.firstWhere((l) => l.lane == o.lane).todo).length;
        case 'waiting':
          return sellerOrders.where((o) => o.lane == SellerLane.waitingBuyer).length;
        case 'completed':
          return sellerOrders.where((o) => o.lane == SellerLane.completed).length;
        case 'cancelled':
          return sellerOrders.where((o) => o.lane == SellerLane.cancelled).length;
        case 'all':
        default:
          return sellerOrders.length;
      }
    }

    final todoCount = countForView('todo');
    final waitingCount = countForView('waiting');
    final completedCount = countForView('completed');
    final cancelledCount = countForView('cancelled');
    final allCount = countForView('all');

    return SPage(
      embedded: true,
      title: 'Ventes',
      slivers: [
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Search box
                TextField(
                  decoration: InputDecoration(
                    hintText: 'N°, client, offre, étiquette…',
                    hintStyle: TextStyle(color: colors.textMuted, fontSize: 13),
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
                const SizedBox(height: 12),

                // View segmented control
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: SSegmented<String>(
                    value: _view,
                    options: [
                      SSegmentedOption(value: 'todo', label: 'À traiter ($todoCount)'),
                      SSegmentedOption(value: 'waiting', label: 'Chez le client ($waitingCount)'),
                      SSegmentedOption(value: 'completed', label: 'Terminées ($completedCount)'),
                      SSegmentedOption(value: 'cancelled', label: 'Annulées ($cancelledCount)'),
                      SSegmentedOption(value: 'all', label: 'Toutes ($allCount)'),
                    ],
                    onChanged: (v) => setState(() => _view = v),
                  ),
                ),

                // Client & tag filters if available
                if (clientsList.isNotEmpty || tagsList.isNotEmpty) ...[
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      if (clientsList.isNotEmpty)
                        Expanded(
                          child: DropdownButtonFormField<String>(
                            initialValue: _clientFilter,
                            dropdownColor: colors.surface,
                            decoration: InputDecoration(
                              isDense: true,
                              contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(SalacopeTokens.radiusMd),
                                borderSide: BorderSide(color: colors.canvasBorder),
                              ),
                            ),
                            style: TextStyle(color: colors.textPrimary, fontSize: 12),
                            items: [
                              const DropdownMenuItem(value: '', child: Text('Tous les clients')),
                              ...clientsList.map((c) => DropdownMenuItem(
                                    value: c.key,
                                    child: Text(c.value, overflow: TextOverflow.ellipsis),
                                  )),
                            ],
                            onChanged: (v) => setState(() => _clientFilter = v ?? ''),
                          ),
                        ),
                      if (clientsList.isNotEmpty && tagsList.isNotEmpty) const SizedBox(width: 8),
                      if (tagsList.isNotEmpty)
                        Expanded(
                          child: DropdownButtonFormField<String>(
                            initialValue: _tagFilter,
                            dropdownColor: colors.surface,
                            decoration: InputDecoration(
                              isDense: true,
                              contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(SalacopeTokens.radiusMd),
                                borderSide: BorderSide(color: colors.canvasBorder),
                              ),
                            ),
                            style: TextStyle(color: colors.textPrimary, fontSize: 12),
                            items: [
                              const DropdownMenuItem(value: '', child: Text('Toutes étiquettes')),
                              ...tagsList.map((t) => DropdownMenuItem(
                                    value: t,
                                    child: Text(t, overflow: TextOverflow.ellipsis),
                                  )),
                            ],
                            onChanged: (v) => setState(() => _tagFilter = v ?? ''),
                          ),
                        ),
                    ],
                  ),
                ],
                const SizedBox(height: 16),

                // Pinned orders
                if (pinned.isNotEmpty) ...[
                  SPanel(
                    titleText: 'Épinglées',
                    count: pinned.length,
                    child: Column(
                      children: pinned.map((o) => _OrderRow(order: o)).toList(),
                    ),
                  ),
                  const SizedBox(height: 16),
                ],

                // Main content
                if (sellerOrders.isEmpty)
                  const SEmptyState(
                    title: 'Aucune vente pour le moment',
                    description: 'Vos commandes apparaîtront ici dès le premier paiement.',
                  )
                else if (_view == 'todo')
                  _buildTodoLanes(context, matching)
                else
                  _buildFlatList(context, matching),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildTodoLanes(BuildContext context, List<Order> matching) {
    final activeTodoLanes = sellerLanes.where((l) => l.todo).toList();
    final populated = activeTodoLanes
        .map((l) => (
              lane: l,
              items: matching.where((o) => o.lane == l.lane).toList()
                ..sort((a, b) => (a.dueAt ?? a.createdAt).compareTo(b.dueAt ?? b.createdAt)),
            ))
        .where((group) => group.items.isNotEmpty)
        .toList();

    if (populated.isEmpty) {
      return const SEmptyState(
        title: 'Tout est à jour !',
        description: 'Aucune commande ne nécessite votre attention immédiate.',
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: populated.map((group) {
        final lane = group.lane;
        final items = group.items;
        final help = laneHelp[lane.lane];

        return Padding(
          padding: const EdgeInsets.only(bottom: 16),
          child: SPanel(
            titleText: lane.label,
            count: items.length,
            help: help,
            child: Column(
              children: items.map((o) => _OrderRow(order: o)).toList(),
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildFlatList(BuildContext context, List<Order> matching) {
    List<Order> items;
    String emptyTitle;

    switch (_view) {
      case 'waiting':
        items = matching.where((o) => o.lane == SellerLane.waitingBuyer).toList();
        emptyTitle = 'Aucune commande en attente du client';
        break;
      case 'completed':
        items = matching.where((o) => o.lane == SellerLane.completed).toList();
        emptyTitle = 'Aucune commande terminée';
        break;
      case 'cancelled':
        items = matching.where((o) => o.lane == SellerLane.cancelled).toList();
        emptyTitle = 'Aucune commande annulée';
        break;
      case 'all':
      default:
        items = matching;
        emptyTitle = 'Aucune commande ne correspond aux filtres';
        break;
    }

    if (items.isEmpty) {
      return SEmptyState(title: emptyTitle);
    }

    return SPanel(
      titleText: _view == 'all'
          ? 'Toutes les commandes'
          : _view == 'completed'
              ? 'Commandes terminées'
              : _view == 'waiting'
                  ? 'Chez le client'
                  : 'Commandes annulées',
      count: items.length,
      child: Column(
        children: items.map((o) => _OrderRow(order: o)).toList(),
      ),
    );
  }
}

class _OrderRow extends StatelessWidget {
  final Order order;

  const _OrderRow({required this.order});

  @override
  Widget build(BuildContext context) {
    final late = order.dueAt != null && order.status == 'in_progress' && order.isLate();
    return OrderRow(
      order: order,
      perspective: Perspective.seller,
      subtitle: late ? 'En retard · ${order.buyer.name}' : '${order.buyer.name} · ${order.number}',
      subtitleStrong: late,
      corner: formatDate(order.createdAt),
      showAmount: true,
      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 12),
      onTap: () => context.push('/orders/${order.id}'),
    );
  }
}
