import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../../core/db/store.dart';
import '../../../../core/design/colors.dart';
import '../../../../core/design/theme_provider.dart';
import '../../../../core/design/typography.dart';
import '../../../../core/ui/s_dialog.dart';
import '../../../../core/ui/s_settings.dart';
import '../../../../core/ui/s_toast.dart';
import '../../../catalog/domain/ranking.dart';
import '../../../session/data/session_api.dart';
import '../widgets/legal_links.dart';
import '../../../../core/push/push_service.dart';

const appVersion = '1.0.0';

/// `/compte/parametres`: the account's settings as a list; each row opens its own screen or a short sheet.
class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  Future<void> _theme(BuildContext context, WidgetRef ref) async {
    final current = ref.read(themeModeProvider);
    final colors = context.colors;
    final picked = await showModalBottomSheet<ThemeMode>(
      context: context,
      backgroundColor: colors.surface,
      showDragHandle: true,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (final (mode, label, icon) in const [
              (ThemeMode.dark, 'Sombre', LucideIcons.moon),
              (ThemeMode.light, 'Clair', LucideIcons.sun),
              (ThemeMode.system, 'Comme le téléphone', LucideIcons.smartphone),
            ])
              ListTile(
                leading: Icon(icon, size: 19, color: colors.textMuted),
                title: Text(label, style: SalacopeTypography.bodyStrong.copyWith(color: colors.textPrimary)),
                trailing: mode == current ? Icon(LucideIcons.check, size: 18, color: colors.accent) : null,
                onTap: () => Navigator.of(ctx).pop(mode),
              ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
    if (picked != null) ref.read(themeModeProvider.notifier).set(picked);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final colors = context.colors;
    final mode = ref.watch(themeModeProvider);

    return ListenableBuilder(
      listenable: db,
      builder: (context, _) {
        final state = db.state;
        final user = state.users.where((u) => u.id == state.sessionUserId).firstOrNull;
        final member = user != null && user.guest != true;
        final m = user?.merchant;

        return Scaffold(
          backgroundColor: colors.canvas,
          appBar: AppBar(backgroundColor: colors.surface, elevation: 0, title: const Text('Paramètres')),
          body: ListView(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
            children: [
              if (member)
                SSettingsGroup(
                  title: 'Compte',
                  children: [
                    SSettingsRow(icon: LucideIcons.user, title: 'Profil', subtitle: '${user.name} · ${user.email}', onTap: () => context.push('/compte/parametres/profil')),
                  ],
                )
              else
                SSettingsGroup(
                  title: 'Compte',
                  footer: 'Vos achats sans compte restent sur ce téléphone. Créez un compte pour les retrouver partout.',
                  children: [SSettingsRow(icon: LucideIcons.logIn, title: 'Se connecter ou créer un compte', onTap: () => context.push('/connexion'))],
                ),
              if (m != null)
                SSettingsGroup(
                  title: 'Boutique',
                  children: [
                    SSettingsRow(
                      icon: LucideIcons.store,
                      title: 'Boutique',
                      subtitle: m.isPrivate ? '${m.storeName} · privée' : m.storeName,
                      onTap: () => context.push('/compte/parametres/boutique'),
                    ),
                    SSettingsRow(
                      icon: LucideIcons.wallet,
                      title: 'Versements',
                      subtitle: 'Vos ventes arrivent sur votre wallet LightPay',
                      value: m.lightpayConnected == true ? 'Connecté' : 'À connecter',
                      onTap: () => context.push('/dashboard/paiements'),
                    ),
                    if (m.kycStatus != 'approved')
                      SSettingsRow(
                        icon: LucideIcons.badgeCheck,
                        title: 'Vérification d’identité',
                        value: m.kycStatus == 'pending' ? 'En cours' : 'À faire',
                        onTap: () => context.push('/dashboard/verification'),
                      ),
                  ],
                ),
              SSettingsGroup(
                title: 'Préférences',
                children: [
                  if (user != null)
                    ValueListenableBuilder<bool>(
                      valueListenable: push.enabled,
                      builder: (context, on, _) => SSettingsRow(
                        icon: LucideIcons.bell,
                        title: 'Notifications',
                        subtitle: push.available ? 'Nouvelle vente, fichier prêt, message, litige, paiement versé' : 'Indisponibles sur cette version de l’app',
                        trailing: Switch.adaptive(
                          value: on && push.available,
                          activeTrackColor: colors.accent,
                          onChanged: push.available
                              ? (v) async {
                                  await push.setEnabled(v);
                                  if (v && !push.enabled.value && context.mounted) {
                                    SToast.error(context, 'Notifications refusées : autorisez-les dans les réglages du téléphone.');
                                  }
                                }
                              : null,
                        ),
                      ),
                    ),
                  SSettingsRow(
                    icon: LucideIcons.palette,
                    title: 'Apparence',
                    value: switch (mode) { ThemeMode.light => 'Clair', ThemeMode.system => 'Téléphone', _ => 'Sombre' },
                    onTap: () => _theme(context, ref),
                  ),
                  SSettingsRow(
                    icon: LucideIcons.sparkles,
                    title: 'Recommandations',
                    subtitle: 'Les offres ouvertes, enregistrées et cherchées, retenues sur ce téléphone seulement',
                    value: 'Effacer',
                    onTap: () async {
                      final ok = await showSConfirm(
                        context: context,
                        title: 'Effacer vos goûts ?',
                        description: 'L’Explorer oublie ce que vous avez regardé et cherché sur ce téléphone. Rien n’est envoyé à Salacope.',
                        confirmLabel: 'Effacer',
                        onConfirm: () async {
                          await Taste.clear();
                          return true;
                        },
                      );
                      if (ok == true && context.mounted) SToast.success(context, 'Goûts effacés sur ce téléphone');
                    },
                  ),
                ],
              ),
              SSettingsGroup(title: 'Informations', children: legalRows(context)),
              if (member)
                SSettingsGroup(
                  children: [
                    SSettingsRow(
                      icon: LucideIcons.logOut,
                      title: 'Se déconnecter',
                      danger: true,
                      onTap: () async {
                        final ok = await showSConfirm(
                          context: context,
                          title: 'Se déconnecter ?',
                          description: 'Vos données restent sur votre compte. Vous pourrez vous reconnecter avec Google ou votre e-mail.',
                          confirmLabel: 'Se déconnecter',
                          danger: true,
                          onConfirm: () async {
                            await sessionApi.signOut();
                            return true;
                          },
                        );
                        if (ok == true && context.mounted) context.go('/');
                      },
                    ),
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
