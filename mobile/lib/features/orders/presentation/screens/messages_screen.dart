import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:salacope/core/db/store.dart';
import 'package:salacope/core/design/theme.dart';
import 'package:salacope/core/lib/format.dart';
import 'package:salacope/core/db/models/order.dart';
import 'package:salacope/core/domain/orders.dart';
import 'package:salacope/core/lib/remembered.dart';
import 'package:salacope/core/ui/s_page.dart';
import '../widgets/order_row.dart';
import 'package:salacope/core/ui/s_empty_state.dart';
import 'package:salacope/core/ui/s_segmented.dart';
import '../../domain/chat.dart';
import '../../../disputes/data/disputes_api.dart';
import '../../../disputes/presentation/dispute_list.dart';
import 'package:salacope/core/ui/s_button.dart';

/// Messages: one conversation per order (each with its offer's cover, so you see at once what it is about), services
/// and products apart, then the disputes. The chosen segment is kept for the next visit.
class MessagesScreen extends StatelessWidget {
  const MessagesScreen({super.key});

  static final Remembered _segment = Remembered('messages.segment', const ['service', 'digital', 'disputes'], 'service');

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;

    return ListenableBuilder(
      listenable: Listenable.merge([db, _segment, disputesApi.mine]),
      builder: (context, _) {
        final state = db.state;
        final me = state.sessionUserId ?? '';
        final signedOut = state.sessionUserId == null;
        final segment = _segment.value;

        List<Order> of(String kind) => state.orders.where((o) => o.item.kind == kind && (o.buyerId == me || o.sellerId == me)).toList()
          ..sort((a, b) => lastActivityAtOf(b).compareTo(lastActivityAtOf(a)));
        final services = of('service');
        final products = of('digital');
        int unreadOf(List<Order> list) => list.fold<int>(0, (n, o) => n + orderUnreadCount(o, me));
        final openDisputes = (disputesApi.mine.value ?? const []).where((d) => d.open).length;
        final shown = segment == 'digital' ? products : services;

        return SPage(
          title: 'Messages',
          toolbar: signedOut
              ? null
              : PreferredSize(
                  preferredSize: const Size.fromHeight(56),
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 4, 20, 12),
                    child: SSegmented<String>(
                      expand: true,
                      value: segment,
                      onChanged: (v) => _segment.value = v,
                      options: [
                        SSegmentedOption(value: 'service', label: 'Services', count: unreadOf(services)),
                        SSegmentedOption(value: 'digital', label: 'Produits', count: unreadOf(products)),
                        SSegmentedOption(value: 'disputes', label: 'Litiges', count: openDisputes),
                      ],
                    ),
                  ),
                ),
          slivers: [
            if (signedOut)
              SliverFillRemaining(
                hasScrollBody: false,
                child: SEmptyState(
                  icon: LucideIcons.messagesSquare,
                  title: 'Vos discussions',
                  description: 'Chaque commande a sa discussion avec l’autre partie. Connectez-vous pour les retrouver.',
                  action: SButton(label: 'Se connecter', pill: true, onPressed: () => context.push('/connexion')),
                ),
              )
            else if (segment == 'disputes')
              const SliverFillRemaining(child: DisputeList())
            else if (shown.isEmpty)
              const SliverFillRemaining(
                hasScrollBody: false,
                child: SEmptyState(
                  icon: LucideIcons.messagesSquare,
                  title: 'Aucune discussion',
                  description: 'Chaque commande a sa discussion : elle apparaît ici dès le premier achat ou la première vente.',
                ),
              )
            else
              SliverList.separated(
                itemCount: shown.length,
                separatorBuilder: (_, _) => Divider(height: 1, thickness: 0.8, indent: 86, color: colors.canvasBorder),
                itemBuilder: (context, i) => _row(context, shown[i], me),
              ),
          ],
        );
      },
    );
  }

  Widget _row(BuildContext context, Order o, String me) {
    final state = db.state;
    final asBuyer = o.buyerId == me;
    final other = state.users.where((u) => u.id == (asBuyer ? o.sellerId : o.buyerId)).firstOrNull;
    final name = asBuyer ? (other?.merchant?.storeName ?? other?.name ?? 'Vendeur') : o.buyer.name;
    final last = lastMessageOf(o);
    final unread = orderUnreadCount(o, me);
    final preview = last == null ? name : '${last.authorId == me ? 'Vous : ' : '$name : '}${messagePreviewOf(last)}';
    return OrderRow(
      order: o,
      perspective: asBuyer ? Perspective.buyer : Perspective.seller,
      subtitle: preview,
      subtitleStrong: unread > 0,
      corner: formatRelative(lastActivityAtOf(o)),
      unread: unread,
      // Something waits for this person on the order: accept, deliver, validate…
      todo: needsAction(o, asBuyer ? Perspective.buyer : Perspective.seller),
      onTap: () => context.push('/compte/messages/${o.id}'),
    );
  }
}
