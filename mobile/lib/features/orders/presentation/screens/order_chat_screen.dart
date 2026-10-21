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
import '../widgets/chat_parts.dart';
import '../widgets/next_step_card.dart';
import '../widgets/order_cards.dart';
import '../../../catalog/presentation/widgets/mini_cover.dart';

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
        final perms = orderPermissions(order, perspective);

        final canMessage = perms.message && !isSilenced;

        // Build sorted feed entries (messages + events)
        final entries = <_FeedEntry>[
          ...order.events.map((e) => _FeedEntry(at: e.at, event: e)),
          ...order.messages.map((m) => _FeedEntry(at: m.at, message: m)),
        ]..sort((a, b) => a.at.compareTo(b.at));

        final lastDeliveryEvent = order.events.reversed
            .where((e) => e.type == 'delivered')
            .firstOrNull;

        // Before any message, one line says how the discussion works; the action of the moment always closes the feed.
        final intro = order.messages.isEmpty;
        final count = entries.length + (intro ? 1 : 0) + 1;
        _scroll.onBuild(count);
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
                  // The offer the conversation is about, as on the order (a book stands up, a service lies wide).
                  MiniCover(src: order.item.coverImage, category: order.item.category, size: 40, muted: order.status == 'cancelled'),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          order.item.title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: SalacopeTypography.bodyStrong.copyWith(color: colors.textPrimary),
                        ),
                        Text(
                          '$counterpartName · ${order.number}',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: SalacopeTypography.caption.copyWith(color: colors.textMuted),
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
                child: ListView.builder(
                        controller: _scroll.controller,
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        itemCount: count,
                        itemBuilder: (context, index) {
                          if (intro && index == 0) {
                            return _Intro(
                              text: order.item.kind == 'service' && order.status == 'paid'
                                  ? isBuyer
                                      ? 'La discussion s’ouvrira dès que le vendeur aura accepté votre commande.'
                                      : 'La discussion s’ouvre quand vous acceptez la commande.'
                                  : 'Aucun message. Posez vos questions à $counterpartName ici.',
                            );
                          }
                          final i = index - (intro ? 1 : 0);
                          if (i == entries.length) {
                            return Padding(
                              padding: const EdgeInsets.only(top: 4, bottom: 8),
                              child: NextStepCard(order: order, perspective: perspective),
                            );
                          }
                          final entry = entries[i];
                          if (entry.event != null) {
                            final ev = entry.event!;
                            // What was said with the step (a refusal, a revision asked, a delay) is read in the conversation.
                            final said = ev.type != 'delivered' && _said.contains(ev.type) && (ev.note ?? '').isNotEmpty ? ev.note : null;
                            return Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                ChatEventPill(label: orderEventLabel(ev.type), at: ev.at),
                                if (said != null)
                                  Padding(
                                    padding: const EdgeInsets.fromLTRB(24, 0, 24, 12),
                                    child: Text(
                                      '« $said »',
                                      textAlign: TextAlign.center,
                                      style: SalacopeTypography.caption.copyWith(color: colors.gray600),
                                    ),
                                  ),
                                if (ev.type == 'paid' && (order.brief?.isNotEmpty ?? false))
                                  Padding(
                                    padding: const EdgeInsets.only(bottom: 12),
                                    child: BriefCard(order: order, perspective: perspective),
                                  ),
                                if (ev.type == 'delivered' && ev.id == lastDeliveryEvent?.id && order.item.kind == 'service' && order.delivery != null)
                                  Padding(
                                    padding: const EdgeInsets.only(bottom: 12),
                                    child: DeliveryCard(order: order, perspective: perspective),
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

/// The steps that carry a few words from the person who took them.
const _said = {'cancelled', 'disputed', 'revision_requested', 'extension_requested', 'extension_declined'};

class _Intro extends StatelessWidget {
  final String text;
  const _Intro({required this.text});

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 8, 24, 16),
      child: Column(
        children: [
          Icon(LucideIcons.messagesSquare, size: 20, color: colors.gray300),
          const SizedBox(height: 8),
          Text(text, textAlign: TextAlign.center, style: SalacopeTypography.caption.copyWith(color: colors.gray500)),
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
