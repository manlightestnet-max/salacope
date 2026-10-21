import 'package:flutter/material.dart';
import 'package:salacope/features/dashboard/presentation/seller_hub.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../../core/db/store.dart';
import '../../../../core/db/models/ticket.dart';
import '../../../../core/design/colors.dart';
import '../../../../core/design/tokens.dart';
import '../../../../core/design/typography.dart';
import '../../../../core/ui/s_avatar.dart';
import '../../../../core/ui/s_button.dart';
import '../../../../core/ui/s_settings.dart';
import '../widgets/legal_links.dart';
import '../widgets/sign_in_sheet.dart';
import 'settings_screen.dart' show appVersion;

/// The "Compte" tab: who is signed in, then what they come back to (purchases, saved offers, followed stores,
/// notifications), the store for sellers, help and the legal pages. The administration is never in the app (web only).
class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;

    return ListenableBuilder(
      listenable: db,
      builder: (context, _) {
        final state = db.state;
        final user = state.users.where((u) => u.id == state.sessionUserId).firstOrNull;
        final member = user != null && user.guest != true;
        final m = user?.merchant;
        final unread = state.notifications.where((n) => !n.read).length;
        // Support answered and waits on the person.
        final openTickets = state.tickets.where((t) => t.status == TicketStatus.answered).length;

        return Scaffold(
          backgroundColor: colors.canvas,
          appBar: AppBar(
            backgroundColor: colors.surface,
            elevation: 0,
            title: Text('Compte', style: SalacopeTypography.title.copyWith(color: colors.textPrimary, fontWeight: FontWeight.w700)),
            actions: [
              IconButton(tooltip: 'Paramètres', icon: Icon(LucideIcons.settings, size: 20, color: colors.textPrimary), onPressed: () => context.push('/compte/parametres')),
            ],
          ),
          body: ListView(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
            children: [
              _Header(member: member),
              const SizedBox(height: 22),
              SSettingsGroup(
                title: 'Mes achats',
                children: [
                  SSettingsRow(icon: LucideIcons.shoppingBag, title: 'Achats', subtitle: 'Commandes, téléchargements et livraisons', onTap: () => context.go('/orders')),
                  SSettingsRow(icon: LucideIcons.heart, title: 'Favoris', onTap: () => context.push('/compte/favoris')),
                  SSettingsRow(icon: LucideIcons.users, title: 'Abonnements', subtitle: 'Les boutiques que vous suivez', onTap: () => context.push('/compte/abonnements')),
                  SSettingsRow(icon: LucideIcons.bell, title: 'Notifications', badge: unread, onTap: () => context.push('/compte/notifications')),
                ],
              ),
              if (member)
                SSettingsGroup(
                  title: 'Vendre',
                  children: m != null
                      ? [
                          SSettingsRow(icon: LucideIcons.layoutDashboard, title: 'Ma boutique', subtitle: m.storeName, onTap: () => context.go('/boutique')),
                          SSettingsRow(icon: LucideIcons.package, title: 'Mes offres', onTap: () => openSellerSection(context, 'offres')),
                          SSettingsRow(icon: LucideIcons.wallet, title: 'Paiements', value: m.lightpayConnected == true ? 'LightPay connecté' : 'À connecter', onTap: () => openSellerSection(context, 'paiements')),
                        ]
                      : [
                          SSettingsRow(
                            icon: LucideIcons.store,
                            title: 'Ouvrir ma boutique',
                            subtitle: 'Vendez vos formations, e-books et services',
                            onTap: () => context.push('/vendre'),
                          ),
                        ],
                ),
              SSettingsGroup(
                title: 'Aide',
                children: [
                  SSettingsRow(icon: LucideIcons.lifeBuoy, title: 'Support', subtitle: 'Une question, un paiement, une commande', badge: openTickets, onTap: () => context.push('/compte/support')),
                  ...legalRows(context),
                ],
              ),
              Center(child: Text('Salacope $appVersion', style: TextStyle(fontSize: 11.5, color: colors.textMuted))),
            ],
          ),
        );
      },
    );
  }
}

class _Header extends StatelessWidget {
  final bool member;
  const _Header({required this.member});

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final user = db.user;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: colors.surface,
        borderRadius: BorderRadius.circular(SalacopeTokens.radiusXl),
        border: Border.all(color: colors.canvasBorder, width: 0.6),
      ),
      child: member && user != null
          ? Row(
              children: [
                SAvatar(name: user.name.isNotEmpty ? user.name : 'Vous', src: user.merchant?.logo, size: SAvatarSize.xl),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Flexible(child: Text(user.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: SalacopeTypography.headline.copyWith(color: colors.textPrimary))),
                          if (user.merchant?.verified == true) ...[
                            const SizedBox(width: 6),
                            Icon(LucideIcons.badgeCheck, size: 16, color: colors.accent),
                          ],
                        ],
                      ),
                      const SizedBox(height: 2),
                      Text(user.email, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 13, color: colors.textMuted)),
                    ],
                  ),
                ),
              ],
            )
          : Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text('Bienvenue sur Salacope', style: SalacopeTypography.headline.copyWith(color: colors.textPrimary)),
                const SizedBox(height: 4),
                Text(
                  user != null
                      ? 'Vos achats sans compte restent sur ce téléphone. Créez un compte pour les retrouver partout et vendre.'
                      : 'Un seul compte pour acheter, vendre et payer avec LightPay.',
                  style: TextStyle(fontSize: 13, color: colors.textMuted, height: 1.4),
                ),
                const SizedBox(height: 14),
                SButton(label: 'Se connecter ou créer un compte', size: SButtonSize.md, pill: true, onPressed: () => showSignInSheet(context)),
              ],
            ),
    );
  }
}
