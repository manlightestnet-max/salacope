import 'package:flutter/material.dart';
import 'package:salacope/core/routing/links.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:salacope/core/lib/format.dart';
import '../../../../core/db/store.dart';
import '../../../../core/design/colors.dart';
import '../../../../core/design/tokens.dart';
import '../../../../core/design/typography.dart';
import '../../../../core/ui/s_button.dart';
import '../../../../core/ui/s_empty_state.dart';
import '../../../../core/ui/s_page.dart';
import '../../data/notifications_api.dart';

class NotificationsScreen extends StatelessWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;

    return ListenableBuilder(
      listenable: db,
      builder: (context, _) {
        final notifications = db.state.notifications;
        final unreadCount = notifications.where((n) => !n.read).length;

        return SPage(
          title: 'Notifications',
          leading: const BackButton(),
          actions: [
            if (unreadCount > 0)
              TextButton(
                onPressed: () {
                  notificationsApi.markAllNotificationsRead();
                },
                child: Text(
                  'Tout marquer comme lu',
                  style: TextStyle(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w600,
                    color: colors.accent,
                  ),
                ),
              ),
          ],
          slivers: [
            if (notifications.isEmpty)
              SliverFillRemaining(
                hasScrollBody: false,
                child: SEmptyState(
                  icon: LucideIcons.bell,
                  title: 'Rien de nouveau',
                  description: 'Vous serez notifié dès qu’un événement survient.',
                  action: SButton(
                    label: 'Retour à l’accueil',
                    variant: SButtonVariant.secondary,
                    size: SButtonSize.md,
                    onPressed: () => context.go('/'),
                  ),
                ),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      final n = notifications[index];
                      return Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        decoration: BoxDecoration(
                          color: colors.surface,
                          borderRadius: BorderRadius.circular(SalacopeTokens.radiusLg),
                          border: Border.all(
                            color: n.read
                                ? colors.canvasBorder.withValues(alpha: 0.5)
                                : colors.accent.withValues(alpha: 0.3),
                            width: 0.8,
                          ),
                        ),
                        child: Material(
                          color: Colors.transparent,
                          child: InkWell(
                            borderRadius: BorderRadius.circular(SalacopeTokens.radiusLg),
                            onTap: () {
                              notificationsApi.markNotificationRead(n.id);
                              // On top of this list: back returns here (it never empties the app).
                              if (n.href.isNotEmpty) links.open(n.href);
                            },
                            child: Padding(
                              padding: const EdgeInsets.all(14),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Container(
                                    margin: const EdgeInsets.only(top: 4),
                                    width: 8,
                                    height: 8,
                                    decoration: BoxDecoration(
                                      shape: BoxShape.circle,
                                      color: n.read ? Colors.transparent : colors.accent,
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          n.title,
                                          style: SalacopeTypography.bodyStrong.copyWith(
                                            color: colors.textPrimary,
                                            fontWeight:
                                                n.read ? FontWeight.w500 : FontWeight.w700,
                                          ),
                                        ),
                                        if (n.body != null && n.body!.isNotEmpty) ...[
                                          const SizedBox(height: 3),
                                          Text(
                                            n.body!,
                                            style: TextStyle(
                                              fontSize: 13,
                                              color: colors.textMuted,
                                            ),
                                          ),
                                        ],
                                        const SizedBox(height: 6),
                                        Text(
                                          SalacopeFormat.formatRelative(n.createdAt),
                                          style: TextStyle(
                                            fontSize: 11.5,
                                            color: colors.textMuted.withValues(alpha: 0.7),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Icon(
                                    LucideIcons.chevronRight,
                                    size: 16,
                                    color: colors.textMuted,
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      );
                    },
                    childCount: notifications.length,
                  ),
                ),
              ),
          ],
        );
      },
    );
  }
}
