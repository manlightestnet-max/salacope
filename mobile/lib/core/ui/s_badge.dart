import 'package:flutter/material.dart';
import '../design/colors.dart';
import '../design/tokens.dart';
import '../design/typography.dart';

enum SBadgeTone {
  neutral,
  success,
  warning,
  danger,
  info,
  brand,
}

typedef SBadgeVariant = SBadgeTone;

class SBadge extends StatelessWidget {
  final String label;
  final SBadgeTone tone;
  final bool dot;
  final Widget? icon;

  const SBadge({
    super.key,
    required this.label,
    SBadgeTone? tone,
    SBadgeVariant? variant,
    this.dot = false,
    this.icon,
  }) : tone = variant ?? tone ?? SBadgeTone.neutral;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;

    Color bg;
    Color textColor;
    Color dotColor;

    switch (tone) {
      case SBadgeTone.neutral:
        bg = c.gray100;
        textColor = c.gray700;
        dotColor = c.gray400;
        break;
      case SBadgeTone.success:
        bg = c.emerald50;
        textColor = c.emerald700;
        dotColor = c.emerald500;
        break;
      case SBadgeTone.warning:
        bg = c.amber50;
        textColor = c.amber800;
        dotColor = c.amber500;
        break;
      case SBadgeTone.danger:
        bg = c.red50;
        textColor = c.red700;
        dotColor = c.red500;
        break;
      case SBadgeTone.info:
        bg = c.blue50;
        textColor = c.blue700;
        dotColor = c.blue500;
        break;
      case SBadgeTone.brand:
        bg = c.primary50;
        textColor = c.primary700;
        dotColor = c.primary500;
        break;
    }

    return Container(
      height: 20,
      padding: const EdgeInsets.symmetric(horizontal: 8),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: SalacopeTokens.borderFull,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          if (dot) ...[
            Container(
              width: 6,
              height: 6,
              decoration: BoxDecoration(
                color: dotColor,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 6),
          ],
          if (icon != null) ...[
            icon!,
            const SizedBox(width: 4),
          ],
          Text(
            label,
            style: SalacopeTypography.small.copyWith(
              color: textColor,
              height: 1.0,
            ),
          ),
        ],
      ),
    );
  }
}
