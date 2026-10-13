import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/config/env.dart';
import '../../../../core/ui/s_settings.dart';
import '../../../../core/ui/s_toast.dart';

/// The legal pages live on the site (one text, kept up to date there): they open in the in-app browser.
Future<void> openSitePage(BuildContext context, String path) async {
  final ok = await launchUrl(Uri.parse('${Env.publicUrl}$path'), mode: LaunchMode.inAppBrowserView);
  if (!ok && context.mounted) SToast.error(context, 'Impossible d’ouvrir la page. Vérifiez votre connexion.');
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
