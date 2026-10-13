import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import 'package:salacope/core/api/sync.dart';
import 'package:salacope/core/db/models/order.dart';
import 'package:salacope/core/db/store.dart';
import 'package:salacope/core/design/theme.dart';
import 'package:salacope/core/design/tokens.dart';
import 'package:salacope/core/design/typography.dart';
import 'package:salacope/core/domain/orders.dart';
import 'package:salacope/core/ui/s_avatar.dart';
import 'package:salacope/core/ui/s_dialog.dart';
import 'package:salacope/core/ui/s_empty_state.dart';
import 'package:salacope/core/ui/s_toast.dart';
import '../../data/orders_api.dart';
import '../../domain/chat.dart';
import '../widgets/counterpart_sheet.dart';
import '../widgets/message_ticks.dart';
import '../widgets/payment_request_card.dart';
import '../widgets/payment_request_sheet.dart';
import '../widgets/validation_card.dart';
import '../widgets/chat_parts.dart';

class OrderChatScreen extends StatefulWidget {
  final String orderId;

  const OrderChatScreen({super.key, required this.orderId});

  @override
  State<OrderChatScreen> createState() => _OrderChatScreenState();
}

class _OrderChatScreenState extends State<OrderChatScreen> {
  final ChatScrollKeeper _scroll = ChatScrollKeeper();
  String? _readUpTo;

  @override
  void initState() {
    super.initState();
    syncService.setFastSync(true);
  }

  @override
  void dispose() {
    syncService.setFastSync(false);
    _scroll.dispose();
    super.dispose();
  }

  /// On screen = read: the other party's ticks turn coloured (once per new message, never in a loop).
  void _markReadIfNeeded(Order order, String userId) {
    if (userId.isEmpty || orderUnreadCount(order, userId) == 0) return;
    final last = order.messages.isNotEmpty ? order.messages.last.at : '';
    if (_readUpTo == last) return;
    _readUpTo = last;
    WidgetsBinding.instance.addPostFrameCallback((_) => ordersApi.markRead(order.id).catchError((_) {}));
  }

  Future<bool> _send(String body, List<Map<String, dynamic>> files) async {
    try {
      await ordersApi.sendMessage(orderId: widget.orderId, body: body, attachments: files);
      return true;
    } catch (e) {
      if (mounted) SToast.error(context, e.toString());
      return false;
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;

    return ListenableBuilder(
      listenable: db,
      builder: (context, _) {
        final state = db.state;
        final order = state.orders.where((o) => o.id == widget.orderId).firstOrNull;

        if (order == null) {
          return Scaffold(
            backgroundColor: colors.canvas,
            appBar: AppBar(
              backgroundColor: colors.surface,
              elevation: 0,
              leading: const BackButton(),
              title: const Text('Discussion'),
            ),
            body: const SEmptyState(
              title: 'Discussion introuvable',
              description: 'Cette commande ou discussion n’existe pas.',
            ),
          );
        }

        final currentUserId = state.sessionUserId ?? '';
        final perspective = perspectiveOf(
              buyerId: order.buyerId,
              sellerId: order.sellerId,
              userId: currentUserId,
            ) ??
            Perspective.buyer;

        final isBuyer = perspective == Perspective.buyer;
        final otherUser = state.users.where(
          (u) => u.id == (isBuyer ? order.sellerId : order.buyerId),
        ).firstOrNull;

        final counterpartName = isBuyer
            ? (otherUser?.merchant?.storeName ?? otherUser?.name ?? 'Vendeur')
            : order.buyer.name;
        final counterpartLogo = isBuyer ? otherUser?.merchant?.logo : null;

        final isSilenced = perspective == Perspective.seller && order.chat.blocked;
        final meUser = state.users.where((u) => u.id == currentUserId).firstOrNull;
        final isMeBlocked = meUser?.blocks?.contains(order.sellerId) ?? false;
        final perms = permissionsFor(
          status: order.status,
          kind: order.item.kind,
          perspective: perspective,
          revisions: order.item.revisions ?? 0,
          revisionsUsed: order.revisionsUsed ?? 0,
          extensionStatus: order.extension?.status,
        );

        final canMessage = perms.message && !isSilenced;

        // Build sorted feed entries (messages + events)
        final entries = <_FeedEntry>[
          ...order.events.map((e) => _FeedEntry(at: e.at, event: e)),
          ...order.messages.map((m) => _FeedEntry(at: m.at, message: m)),
        ]..sort((a, b) => a.at.compareTo(b.at));

        final lastDeliveryEvent = order.events.reversed
            .where((e) => e.type == 'delivered')
            .firstOrNull;

        _scroll.onBuild(entries.length);
        _markReadIfNeeded(order, currentUserId);

        return Scaffold(
          backgroundColor: colors.canvas,
          appBar: AppBar(
            backgroundColor: colors.surface,
            elevation: 0,
            leading: const BackButton(),
            titleSpacing: 0,
            title: InkWell(
              onTap: () => showCounterpartSheet(
                context: context,
                order: order,
                perspective: perspective,
              ),
              child: Row(
                children: [
                  SAvatar(
                    name: counterpartName,
                    src: counterpartLogo,
                    size: SAvatarSize.md,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          counterpartName,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: SalacopeTypography.bodyStrong.copyWith(
                            color: colors.textPrimary,
                            fontSize: 14,
                          ),
                        ),
                        Text(
                          '${order.number} · ${order.item.title}',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: SalacopeTypography.caption.copyWith(
                            color: colors.textMuted,
                            fontSize: 11,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            actions: [
              PopupMenuButton<String>(
                icon: Icon(LucideIcons.ellipsisVertical, color: colors.textPrimary, size: 20),
                color: colors.surface,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(SalacopeTokens.radiusMd),
                ),
                onSelected: (val) async {
                  if (val == 'order') {
                    context.push('/orders/${order.id}');
                  } else if (val == 'ephemeral') {
                    final next = !order.chat.ephemeral;
                    await ordersApi.setEphemeral(order.id, next);
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(
                            next ? 'Messages éphémères activés' : 'Messages conservés',
                          ),
                        ),
                      );
                    }
                  } else if (val == 'block') {
                    if (isMeBlocked) {
                      await ordersApi.blockSeller(order.sellerId, false);
                    } else {
                      showDialog(
                        context: context,
                        builder: (ctx) => SConfirm(
                          title: 'Bloquer ce vendeur ?',
                          description:
                              'Ce vendeur ne pourra plus vous écrire sur aucune de vos commandes chez lui.',
                          confirmLabel: 'Bloquer',
                          isDanger: true,
                          onConfirm: () async {
                            await ordersApi.blockSeller(order.sellerId, true);
                            if (ctx.mounted) Navigator.of(ctx).pop();
                          },
                        ),
                      );
                    }
                  }
                },
                itemBuilder: (ctx) => [
                  PopupMenuItem(
                    value: 'order',
                    child: Row(
                      children: [
                        Icon(LucideIcons.receiptText, size: 16, color: colors.textSecondary),
                        const SizedBox(width: 10),
                        const Text('Voir la commande'),
                      ],
                    ),
                  ),
                  if (isBuyer) ...[
                    PopupMenuItem(
                      value: 'ephemeral',
                      child: Row(
                        children: [
                          Icon(LucideIcons.timer, size: 16, color: colors.textSecondary),
                          const SizedBox(width: 10),
                          Text(
                            order.chat.ephemeral
                                ? 'Désactiver messages éphémères'
                                : 'Activer messages éphémères',
                          ),
                        ],
                      ),
                    ),
                    PopupMenuItem(
                      value: 'block',
                      child: Row(
                        children: [
                          Icon(
                            LucideIcons.ban,
                            size: 16,
                            color: isMeBlocked ? colors.textSecondary : colors.danger,
                          ),
                          const SizedBox(width: 10),
                          Text(
                            isMeBlocked ? 'Débloquer ce vendeur' : 'Bloquer ce vendeur',
                            style: TextStyle(
                              color: isMeBlocked ? colors.textPrimary : colors.danger,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ],
          ),
          body: Column(
            children: [
              if (order.chat.ephemeral)
                const _Notice(icon: LucideIcons.timer, text: 'Messages éphémères : effacés à la clôture de la commande.'),
              if (order.chat.blocked)
                _Notice(
                  icon: LucideIcons.ban,
                  text: isBuyer ? 'Vous avez bloqué ce vendeur : il ne peut plus vous écrire.' : 'Ce client a bloqué les messages de votre boutique.',
                ),
              Expanded(
                child: entries.isEmpty
                    ? SEmptyState(
                        icon: LucideIcons.messagesSquare,
                        title: 'Aucun message',
                        description: 'Posez vos questions à $counterpartName ici : c’est le seul canal entre vous, les coordonnées sont bloquées.',
                      )
                    : ListView.builder(
                        controller: _scroll.controller,
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        itemCount: entries.length,
                        itemBuilder: (context, index) {
                          final entry = entries[index];
                          if (entry.event != null) {
                            final ev = entry.event!;
                            return Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                ChatEventPill(label: eventLabel(ev.type), at: ev.at),
                                if (ev.type == 'delivered' && ev.id == lastDeliveryEvent?.id && order.item.kind == 'service')
                                  Padding(
                                    padding: const EdgeInsets.only(bottom: 12),
                                    child: Center(child: ValidationCard(order: order, perspective: perspective, current: true)),
                                  ),
                              ],
                            );
                          }
                          final msg = entry.message!;
                          final mine = msg.authorId == currentUserId;
                          return ChatBubble(
                            body: msg.body,
                            attachments: msg.attachments ?? const [],
                            at: msg.at,
                            mine: mine,
                            avatar: SAvatar(name: counterpartName, src: counterpartLogo, size: SAvatarSize.sm),
                            ticks: MessageTicks(status: messageStatusOf(order, msg, currentUserId)),
                            card: msg.request != null ? PaymentRequestCard(order: order, message: msg, mine: mine) : null,
                          );
                        },
                      ),
              ),
              if (canMessage)
                ChatComposer(
                  placeholder: 'Écrire à $counterpartName…',
                  onSend: _send,
                  tools: [
                    if (perspective == Perspective.seller)
                      IconButton(
                        icon: Icon(LucideIcons.banknote, color: colors.textSecondary),
                        onPressed: () => showPaymentRequestSheet(context: context, order: order),
                        tooltip: 'Demande de paiement',
                      ),
                  ],
                ),
            ],
          ),
        );
      },
    );
  }
}

class _Notice extends StatelessWidget {
  final IconData icon;
  final String text;
  const _Notice({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      color: colors.surface,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 14, color: colors.textMuted),
          const SizedBox(width: 6),
          Flexible(child: Text(text, textAlign: TextAlign.center, style: SalacopeTypography.caption.copyWith(color: colors.textMuted))),
        ],
      ),
    );
  }
}

class _FeedEntry {
  final String at;
  final OrderEvent? event;
  final OrderMessage? message;

  _FeedEntry({required this.at, this.event, this.message});
}

/// Same words as the web (`EVENT_LABEL` in src/features/orders/model.ts), for the server's event types.
String eventLabel(String type) => switch (type) {
      'paid' => 'Paiement reçu',
      'accepted' => 'Commande acceptée',
      'delivered' => 'Livraison effectuée',
      'completed' => 'Réception confirmée',
      'auto_completed' => 'Clôturée automatiquement',
      'cancelled' => 'Commande annulée, client remboursé',
      'funds_released' => 'Décision de Salacope : vendeur payé',
      'funds_refunded' => 'Décision de Salacope : client remboursé',
      'disputed' => 'Litige ouvert',
      'revision_requested' => 'Retouche demandée',
      'extension_requested' => 'Délai supplémentaire demandé',
      'extension_accepted' => 'Délai supplémentaire accepté',
      'extension_declined' => 'Délai supplémentaire refusé',
      _ => 'Mise à jour de la commande',
    };
