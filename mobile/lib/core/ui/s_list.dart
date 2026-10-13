import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../design/colors.dart';
import '../design/tokens.dart';
import '../design/typography.dart';
import 's_panel.dart';

class SList extends StatelessWidget {
  final List<Widget> children;
  final bool inPanel;

  const SList({
    super.key,
    required this.children,
    this.inPanel = false,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;

    final content = ListView.separated(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: children.length,
      separatorBuilder: (_, _) => Divider(
        height: 1,
        thickness: 1,
        color: c.gray200.withValues(alpha: 0.7),
      ),
      itemBuilder: (_, index) => children[index],
    );

    if (inPanel) {
      return content;
    }

    return Container(
      decoration: BoxDecoration(
        color: c.surface,
        borderRadius: SalacopeTokens.border2xl,
        border: Border.all(
          color: c.gray200.withValues(alpha: 0.7),
          width: 1,
        ),
      ),
      clipBehavior: Clip.antiAlias,
      child: content,
    );
  }
}

class SListRow extends StatelessWidget {
  final Widget? leading;
  final String title;
  final String? subtitle;
  final Widget? meta;
  final Widget? trailing;
  final Widget? actions;
  final VoidCallback? onTap;
  final bool selected;

  const SListRow({
    super.key,
    this.leading,
    required this.title,
    this.subtitle,
    this.meta,
    this.trailing,
    this.actions,
    this.onTap,
    this.selected = false,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;

    final content = Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          if (leading != null) ...[
            leading!,
            const SizedBox(width: 12),
          ],
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  title,
                  style: SalacopeTypography.bodyStrong.copyWith(
                    color: c.gray900,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                if (subtitle != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    subtitle!,
                    style: SalacopeTypography.caption.copyWith(
                      color: c.gray500,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
                if (meta != null) ...[
                  const SizedBox(height: 6),
                  meta!,
                ],
              ],
            ),
          ),
          if (trailing != null) ...[
            const SizedBox(width: 8),
            trailing!,
          ],
          if (actions != null) ...[
            const SizedBox(width: 8),
            actions!,
          ] else if (onTap != null) ...[
            const SizedBox(width: 8),
            Icon(
              LucideIcons.chevronRight,
              size: 16,
              color: c.gray300,
            ),
          ],
        ],
      ),
    );

    return Material(
      color: selected ? c.gray100 : Colors.transparent,
      child: InkWell(
        onTap: onTap,
        child: content,
      ),
    );
  }
}

class SListSection extends StatelessWidget {
  final Widget? title;
  final String? titleText;
  final int? count;
  final String? help;
  final Widget? actions;
  final Widget? footer;
  final List<Widget> children;

  const SListSection({
    super.key,
    this.title,
    this.titleText,
    this.count,
    this.help,
    this.actions,
    this.footer,
    required this.children,
  });

  @override
  Widget build(BuildContext context) {
    return SPanel(
      flush: true,
      title: title,
      titleText: titleText,
      count: count,
      help: help,
      actions: actions,
      footer: footer,
      child: SList(
        inPanel: true,
        children: children,
      ),
    );
  }
}
