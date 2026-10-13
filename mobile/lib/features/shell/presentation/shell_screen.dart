import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../../core/db/store.dart';
import '../../../../core/design/theme.dart';
import '../../../../core/design/tokens.dart';
import '../../../../core/ui/s_offline_banner.dart';
import '../../orders/domain/chat.dart';

/// The bottom bar: Copes (the storefront), Achats, Messages, Boutique (sellers only) and Compte. Messages shows the unread
/// count; Boutique shows the sales waiting on the seller. Branch indexes follow the router (Boutique is branch 3).
class ShellScreen extends StatelessWidget {
  final StatefulNavigationShell navigationShell;

  const ShellScreen({super.key, required this.navigationShell});

  void _onTap(int branch) {
    navigationShell.goBranch(branch, initialLocation: branch == navigationShell.currentIndex);
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;

    return ListenableBuilder(
      listenable: db,
      builder: (context, _) {
        final state = db.state;
        final me = state.sessionUserId ?? '';
        final user = state.users.where((u) => u.id == me).firstOrNull;
        final seller = user?.merchant != null;
        final unread = me.isEmpty ? 0 : state.orders.fold<int>(0, (n, o) => n + orderUnreadCount(o, me));
        final toDo = !seller
            ? 0
            : state.orders.where((o) => o.sellerId == me && (o.status == 'paid' || o.status == 'in_progress' || o.status == 'disputed')).length;

        final items = [
          const _ShellNavItem(branch: 0, icon: LucideIcons.store, label: 'Copes'),
          const _ShellNavItem(branch: 1, icon: LucideIcons.shoppingBag, label: 'Achats'),
          _ShellNavItem(branch: 2, icon: LucideIcons.messagesSquare, label: 'Messages', badge: unread),
          if (seller) _ShellNavItem(branch: 3, icon: LucideIcons.layoutDashboard, label: 'Boutique', badge: toDo),
          const _ShellNavItem(branch: 4, icon: LucideIcons.user, label: 'Compte'),
        ];
        final current = navigationShell.currentIndex;

        return Scaffold(
          body: Column(
            children: [
              const SOfflineBanner(),
              Expanded(child: navigationShell),
            ],
          ),
          bottomNavigationBar: Container(
            decoration: BoxDecoration(
              color: colors.surface,
              border: Border(top: BorderSide(color: colors.canvasBorder, width: 0.8)),
              boxShadow: SalacopeTokens.shadowSm,
            ),
            child: SafeArea(
              top: false,
              child: SizedBox(
                height: 60,
                child: Row(
                  children: [
                    for (final item in items)
                      Expanded(
                        child: _NavButton(item: item, selected: current == item.branch, onTap: () => _onTap(item.branch)),
                      ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}

class _NavButton extends StatelessWidget {
  final _ShellNavItem item;
  final bool selected;
  final VoidCallback onTap;
  const _NavButton({required this.item, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final color = selected ? colors.accent : colors.textMuted;
    final reduce = MediaQuery.of(context).disableAnimations;
    return Semantics(
      selected: selected,
      button: true,
      label: item.badge > 0 ? '${item.label}, ${item.badge} en attente' : item.label,
      child: InkWell(
        onTap: onTap,
        splashColor: Colors.transparent,
        highlightColor: Colors.transparent,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Stack(
              clipBehavior: Clip.none,
              children: [
                AnimatedContainer(
                  duration: reduce ? Duration.zero : const Duration(milliseconds: 200),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                  decoration: BoxDecoration(
                    color: selected ? colors.accent.withValues(alpha: 0.15) : Colors.transparent,
                    borderRadius: BorderRadius.circular(SalacopeTokens.radiusFull),
                  ),
                  child: Icon(item.icon, size: 20, color: color),
                ),
                if (item.badge > 0)
                  Positioned(
                    right: 4,
                    top: -2,
                    child: Container(
                      constraints: const BoxConstraints(minWidth: 16),
                      height: 16,
                      padding: const EdgeInsets.symmetric(horizontal: 4),
                      decoration: BoxDecoration(color: colors.accent, borderRadius: BorderRadius.circular(8)),
                      alignment: Alignment.center,
                      child: Text(
                        item.badge > 99 ? '99+' : '${item.badge}',
                        style: TextStyle(fontSize: 10, height: 1, fontWeight: FontWeight.w700, color: colors.onAccent),
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 2),
            Text(
              item.label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(fontSize: 10.5, fontWeight: selected ? FontWeight.w600 : FontWeight.w500, color: color),
            ),
          ],
        ),
      ),
    );
  }
}

class _ShellNavItem {
  final int branch;
  final IconData icon;
  final String label;
  final int badge;

  const _ShellNavItem({required this.branch, required this.icon, required this.label, this.badge = 0});
}
