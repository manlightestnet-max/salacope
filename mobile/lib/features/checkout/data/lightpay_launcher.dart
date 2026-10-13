import 'package:flutter/material.dart';
import 'package:flutter_custom_tabs/flutter_custom_tabs.dart' as tabs;
import 'package:url_launcher/url_launcher.dart' as links;
import '../../../core/design/colors.dart';

/// Opens LightPay's payment page. When the LightPay app is on the phone it takes the page itself (it answers
/// https://checkout.smlab.xyz/pay/…): the buyer pays there with their wallet or Mobile Money, and LightPay sends them
/// back to Salacope. Otherwise the same page opens inside Salacope (Chrome Custom Tab). → whether the LightPay app took it.
Future<bool> openLightPayCheckout(BuildContext context, String checkoutUrl) async {
  final uri = Uri.parse(checkoutUrl);
  try {
    if (await links.launchUrl(uri, mode: links.LaunchMode.externalNonBrowserApplication)) return true;
  } catch (_) {
    // no app answers this address: the page opens here
  }
  if (!context.mounted) return false;
  final colors = Theme.of(context).extension<SalacopeColors>() ?? SalacopeColors.dark;
  try {
    await tabs.launchUrl(
      uri,
      customTabsOptions: tabs.CustomTabsOptions(
        colorSchemes: tabs.CustomTabsColorSchemes.defaults(toolbarColor: colors.surface),
        showTitle: true,
      ),
    );
  } catch (_) {
    await links.launchUrl(uri, mode: links.LaunchMode.externalApplication);
  }
  return false;
}
