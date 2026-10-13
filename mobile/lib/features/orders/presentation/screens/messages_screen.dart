import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:salacope/core/db/store.dart';
import 'package:salacope/core/design/theme.dart';
import 'package:salacope/core/design/tokens.dart';
import 'package:salacope/core/design/typography.dart';
import 'package:salacope/core/lib/format.dart';
import 'package:salacope/core/ui/s_avatar.dart';
import 'package:salacope/core/ui/s_empty_state.dart';
import 'package:salacope/core/ui/s_segmented.dart';
import '../../domain/chat.dart';
import '../../../disputes/data/disputes_api.dart';
import '../../../disputes/presentation/dispute_list.dart';
import 'package:salacope/core/ui/s_button.dart';

class MessagesScreen extends StatefulWidget {
  const MessagesScreen({super.key});

  @override
  State<MessagesScreen> createState() => _MessagesScreenState();
}

class _MessagesScreenState extends State<MessagesScreen> {
  String _selectedKind = 'service'; // 'digital', 'service' or 'disputes'

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;

    return ListenableBuilder(
      listenable: db,
      builder: (context, _) {
        final state = db.state;
        final currentUserId = state.sessionUserId ?? '';

        final digitalConvs = buildConversations(
          orders: state.orders,
          userId: currentUserId,
          kind: 'digital',
        );
        final serviceConvs = buildConversations(
          orders: state.orders,
          userId: currentUserId,
          kind: 'service',
        );

        final unreadDigital = digitalConvs.fold<int>(0, (sum, c) => sum + c.unread);
        final unreadServices = serviceConvs.fold<int>(0, (sum, c) => sum + c.unread);

        final conversations =
            _selectedKind == 'digital' ? digitalConvs : serviceConvs;
        final openDisputes = (disputesApi.mine.value ?? const []).where((d) => d.open).length;
        final signedOut = state.sessionUserId == null;

        return Scaffold(
          backgroundColor: colors.canvas,
          appBar: AppBar(
            backgroundColor: colors.surface,
            elevation: 0,
            title: Text(
              'Messages',
              style: SalacopeTypography.title.copyWith(
                color: colors.textPrimary,
                fontWeight: FontWeight.w700,
              ),
            ),
            bottom: PreferredSize(
              preferredSize: const Size.fromHeight(48),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                child: SSegmented<String>(
                  value: _selectedKind,
                  options: [
                    SSegmentedOption(
                      value: 'service',
                      label: unreadServices > 0
                          ? 'Services ($unreadServices)'
                          : 'Services',
                    ),
                    SSegmentedOption(
                      value: 'digital',
                      label: unreadDigital > 0
                          ? 'Produits ($unreadDigital)'
                          : 'Produits',
                    ),
                    SSegmentedOption(
                      value: 'disputes',
                      label: openDisputes > 0 ? 'Litiges ($openDisputes)' : 'Litiges',
                    ),
                  ],
                  onChanged: (val) => setState(() => _selectedKind = val),
                ),
              ),
            ),
          ),
          body: signedOut
              ? SEmptyState(
                  icon: LucideIcons.messagesSquare,
                  title: 'Vos discussions',
                  description: 'Chaque commande a sa discussion avec l’autre partie. Connectez-vous, ou achetez sans compte : elles apparaissent ici.',
                  action: SButton(label: 'Se connecter', pill: true, onPressed: () => context.push('/connexion')),
                )
              : _selectedKind == 'disputes'
              ? const DisputeList()
              : conversations.isEmpty
              ? SEmptyState(
                  icon: LucideIcons.messagesSquare,
                  title: 'Aucune discussion',
                  description:
                      'Chaque commande a sa discussion avec l’autre partie : elle apparaît ici dès le premier achat ou la première vente.',
                )
              : ListView.separated(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  itemCount: conversations.length,
                  separatorBuilder: (_, _) => Divider(
                    height: 1,
                    thickness: 0.8,
                    indent: 72,
                    color: colors.canvasBorder,
                  ),
                  itemBuilder: (context, index) {
                    final conv = conversations[index];
                    final counterpart = state.users
                        .where((u) => u.id == conv.counterpartId)
                        .firstOrNull;

                    // As buyer or as seller
                    final firstOrder = conv.orders.first;
                    final asBuyer = firstOrder.buyerId == currentUserId;
                    final name = asBuyer
                        ? (counterpart?.merchant?.storeName ?? counterpart?.name ?? 'Vendeur')
                        : firstOrder.buyer.name;
                    final logo = asBuyer ? counterpart?.merchant?.logo : null;

                    final isMine = conv.last?.authorId == currentUserId;
                    final preview = conv.last != null
                        ? '${isMine ? "Vous : " : ""}${messagePreviewOf(conv.last)}'
                        : firstOrder.item.title;

                    final isEphemeral = conv.orders.any((o) => o.chat.ephemeral);
                    final isBlocked = conv.orders.any((o) => o.chat.blocked);

                    return InkWell(
                      onTap: () {
                        if (conv.orders.length == 1) {
                          context.push('/compte/messages/${conv.orders.first.id}');
                        } else {
                          // Show sheet to pick which order
                          _showOrderPicker(context, conv, name);
                        }
                      },
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        child: Row(
                          children: [
                            SAvatar(
                              name: name,
                              src: logo,
                              size: SAvatarSize.lg,
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Expanded(
                                        child: Text(
                                          name,
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: SalacopeTypography.bodyStrong.copyWith(
                                            color: colors.textPrimary,
                                            fontWeight: conv.unread > 0
                                                ? FontWeight.w700
                                                : FontWeight.w600,
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 6),
                                      Text(
                                        formatRelative(conv.lastAt),
                                        style: SalacopeTypography.caption.copyWith(
                                          color: conv.unread > 0
                                              ? colors.accent
                                              : colors.textMuted,
                                          fontSize: 11,
                                          fontWeight: conv.unread > 0
                                              ? FontWeight.w600
                                              : FontWeight.w400,
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 3),
                                  Row(
                                    children: [
                                      Expanded(
                                        child: Text(
                                          preview,
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: SalacopeTypography.caption.copyWith(
                                            color: conv.unread > 0
                                                ? colors.textPrimary
                                                : colors.textSecondary,
                                            fontWeight: conv.unread > 0
                                                ? FontWeight.w600
                                                : FontWeight.w400,
                                          ),
                                        ),
                                      ),
                                      if (isEphemeral) ...[
                                        const SizedBox(width: 4),
                                        Icon(LucideIcons.timer, size: 12, color: colors.textMuted),
                                      ],
                                      if (isBlocked) ...[
                                        const SizedBox(width: 4),
                                        Icon(LucideIcons.ban, size: 12, color: colors.textMuted),
                                      ],
                                      if (conv.unread > 0) ...[
                                        const SizedBox(width: 6),
                                        Container(
                                          padding: const EdgeInsets.symmetric(
                                            horizontal: 6,
                                            vertical: 2,
                                          ),
                                          decoration: BoxDecoration(
                                            color: colors.accent,
                                            borderRadius: BorderRadius.circular(SalacopeTokens.radiusFull),
                                          ),
                                          child: Text(
                                            '${conv.unread}',
                                            style: TextStyle(
                                              color: colors.onAccent,
                                              fontSize: 10,
                                              fontWeight: FontWeight.w700,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ],
                                  ),
                                  if (conv.orders.length > 1)
                                    Padding(
                                      padding: const EdgeInsets.only(top: 2),
                                      child: Text(
                                        '${conv.orders.length} commandes',
                                        style: SalacopeTypography.caption.copyWith(
                                          color: colors.textMuted,
                                          fontSize: 10.5,
                                        ),
                                      ),
                                    ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
        );
      },
    );
  }

  void _showOrderPicker(BuildContext context, Conversation conv, String name) {
    final colors = context.colors;
    showModalBottomSheet(
      context: context,
      backgroundColor: colors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(SalacopeTokens.radiusXl)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Discussions avec $name',
                style: SalacopeTypography.title.copyWith(fontSize: 16),
              ),
              const SizedBox(height: 12),
              ...conv.orders.map((o) {
                return ListTile(
                  title: Text(o.item.title, style: SalacopeTypography.bodyStrong),
                  subtitle: Text('${o.number} · ${formatDate(o.createdAt)}'),
                  trailing: const Icon(LucideIcons.chevronRight, size: 16),
                  onTap: () {
                    Navigator.of(ctx).pop();
                    context.push('/compte/messages/${o.id}');
                  },
                );
              }),
            ],
          ),
        ),
      ),
    );
  }
}
