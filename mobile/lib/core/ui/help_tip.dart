import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../design/colors.dart';
import '../design/tokens.dart';
import '../design/typography.dart';

class HelpTip extends StatelessWidget {
  final String text;

  const HelpTip({
    super.key,
    required this.text,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;

    return Tooltip(
      message: text,
      preferBelow: true,
      triggerMode: TooltipTriggerMode.tap,
      showDuration: const Duration(seconds: 4),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      margin: const EdgeInsets.symmetric(horizontal: 24),
      decoration: BoxDecoration(
        color: c.gray900,
        borderRadius: SalacopeTokens.borderLg,
        boxShadow: SalacopeTokens.shadowMd,
      ),
      textStyle: SalacopeTypography.small.copyWith(
        color: c.canvas,
      ),
      child: Padding(
        padding: const EdgeInsets.all(2.0),
        child: Icon(
          LucideIcons.info,
          size: 14,
          color: c.gray400,
        ),
      ),
    );
  }
}
