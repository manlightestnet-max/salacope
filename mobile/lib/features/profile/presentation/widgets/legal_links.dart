import 'package:flutter/material.dart';
import 'package:flutter_custom_tabs/flutter_custom_tabs.dart' as tabs;
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:url_launcher/url_launcher.dart' as urls;
import '../../../../core/config/env.dart';
import '../../../../core/design/colors.dart';
import '../../../../core/ui/s_settings.dart';
import '../../../../core/ui/s_toast.dart';

/// The legal pages live on the site (one text, kept up to date there): they open over the app in a browser tab.
Future<void> openSitePage(BuildContext context, String path) async {
  final colors = context.colors;
  final uri = Uri.parse('${Env.publicUrl}$path');
  try {
    await tabs.launchUrl(
      uri,
      customTabsOptions: tabs.CustomTabsOptions(
        colorSchemes: tabs.CustomTabsColorSchemes.defaults(toolbarColor: colors.surface),
        shareState: tabs.CustomTabsShareState.off,
        showTitle: true,
      ),
    );
  } catch (_) {
    // No browser with Custom Tabs: the phone's browser itself.
    final ok = await urls.launchUrl(uri, mode: urls.LaunchMode.externalApplication).catchError((_) => false);
    if (!ok && context.mounted) SToast.error(context, 'Impossible d’ouvrir la page. Vérifiez votre connexion.');
  }
}

/// Conditions, refunds, privacy, anti-money-laundering: rows of a settings group.
List<Widget> legalRows(BuildContext context) => [
      for (final (icon, title, path) in const [
        (LucideIcons.fileText, 'Conditions générales', '/legal/cgu'),
        (LucideIcons.undo2, 'Remboursements', '/legal/remboursement'),
        (LucideIcons.lock, 'Confidentialité', '/legal/confidentialite'),
        (LucideIcons.scale, 'Lutte anti-blanchiment', '/legal/lutte-anti-blanchiment'),
        (LucideIcons.building2, 'Mentions légales', '/legal'),
      ])
        SSettingsRow(icon: icon, title: title, external: true, onTap: () => openSitePage(context, path)),
    ];
