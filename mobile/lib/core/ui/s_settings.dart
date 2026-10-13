import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../design/colors.dart';
import '../design/tokens.dart';
import '../design/typography.dart';

/// Settings and account menus: rows grouped in one framed block under a small title (like the phone's own settings).
/// One row = one thing; a tap opens its own screen or a sheet, never a long form on the same page.
class SSettingsGroup extends StatelessWidget {
  final String? title;
  final List<Widget> children;
  final String? footer;

  const SSettingsGroup({super.key, this.title, required this.children, this.footer});

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final rows = <Widget>[];
    for (var i = 0; i < children.length; i++) {
      if (i > 0) rows.add(Divider(height: 1, thickness: 0.6, indent: 52, color: colors.canvasBorder));
      rows.add(children[i]);
    }
    return Padding(
      padding: const EdgeInsets.only(bottom: 22),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (title != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(4, 0, 4, 8),
              child: Text(title!.toUpperCase(), style: SalacopeTypography.overline.copyWith(color: colors.textMuted, letterSpacing: 0.8)),
            ),
          Container(
            decoration: BoxDecoration(
              color: colors.surface,
              borderRadius: BorderRadius.circular(SalacopeTokens.radiusXl),
              border: Border.all(color: colors.canvasBorder, width: 0.6),
            ),
            clipBehavior: Clip.antiAlias,
            child: Column(children: rows),
          ),
          if (footer != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(4, 8, 4, 0),
              child: Text(footer!, style: TextStyle(fontSize: 12, color: colors.textMuted, height: 1.4)),
            ),
        ],
      ),
    );
  }
}

class SSettingsRow extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? subtitle;

  /// A value on the right (the current theme, "Connecté"…), before the arrow.
  final String? value;
  final Widget? trailing;
  final int badge;
  final bool danger;
  final bool external;
  final VoidCallback? onTap;

  const SSettingsRow({
    super.key,
    required this.icon,
    required this.title,
    this.subtitle,
    this.value,
    this.trailing,
    this.badge = 0,
    this.danger = false,
    this.external = false,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final fg = danger ? colors.danger : colors.textPrimary;
    return InkWell(
      onTap: onTap,
      child: ConstrainedBox(
        constraints: const BoxConstraints(minHeight: 54),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          child: Row(
            children: [
              SizedBox(width: 24, child: Icon(icon, size: 19, color: danger ? colors.danger : colors.textMuted)),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(title, style: SalacopeTypography.bodyStrong.copyWith(color: fg, fontSize: 14.5)),
                    if (subtitle != null) ...[
                      const SizedBox(height: 2),
                      Text(subtitle!, style: TextStyle(fontSize: 12.5, color: colors.textMuted, height: 1.3)),
                    ],
                  ],
                ),
              ),
              if (badge > 0)
                Container(
                  margin: const EdgeInsets.only(left: 8),
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                  decoration: BoxDecoration(color: colors.accent, borderRadius: BorderRadius.circular(SalacopeTokens.radiusFull)),
                  child: Text('$badge', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: colors.onAccent)),
                ),
              if (value != null)
                Padding(
                  padding: const EdgeInsets.only(left: 8),
                  child: Text(value!, style: TextStyle(fontSize: 13, color: colors.textMuted)),
                ),
              if (trailing != null)
                Padding(padding: const EdgeInsets.only(left: 8), child: trailing!)
              else if (onTap != null && !danger)
                Padding(
                  padding: const EdgeInsets.only(left: 6),
                  child: Icon(external ? LucideIcons.externalLink : LucideIcons.chevronRight, size: 16, color: colors.textTertiary),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
