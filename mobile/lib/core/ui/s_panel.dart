import 'package:flutter/material.dart';
import '../design/colors.dart';
import '../design/tokens.dart';
import '../design/typography.dart';
import 'help_tip.dart';

class SPanel extends StatelessWidget {
  final Widget? title;
  final String? titleText;
  final int? count;
  final String? help;
  final Widget? description;
  final String? descriptionText;
  final Widget? actions;
  final Widget? footer;
  final bool flush;
  final Widget? bar;
  final VoidCallback? onTap;
  final EdgeInsetsGeometry? padding;
  final Widget child;

  const SPanel({
    super.key,
    this.title,
    this.titleText,
    this.count,
    this.help,
    this.description,
    this.descriptionText,
    this.actions,
    this.footer,
    this.flush = false,
    this.bar,
    this.onTap,
    this.padding,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final hasHeader = title != null || titleText != null || actions != null;

    final headerWidget = hasHeader
        ? Padding(
            padding: EdgeInsets.fromLTRB(16, 16, 16, flush ? 12 : 16),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (titleText != null)
                            Flexible(
                              child: Text(
                                titleText!,
                                style: SalacopeTypography.panelTitle.copyWith(
                                  color: c.gray900,
                                ),
                                overflow: TextOverflow.ellipsis,
                              ),
                            )
                          else if (title != null)
                            Flexible(child: title!),
                          if (count != null) ...[
                            const SizedBox(width: 6),
                            Text(
                              '$count',
                              style: SalacopeTypography.body.copyWith(
                                color: c.gray400,
                              ),
                            ),
                          ],
                          if (help != null) ...[
                            const SizedBox(width: 6),
                            HelpTip(text: help!),
                          ],
                        ],
                      ),
                      if (descriptionText != null) ...[
                        const SizedBox(height: 2),
                        Text(
                          descriptionText!,
                          style: SalacopeTypography.caption.copyWith(
                            color: c.gray500,
                          ),
                        ),
                      ] else if (description != null) ...[
                        const SizedBox(height: 2),
                        description!,
                      ],
                    ],
                  ),
                ),
                if (actions != null) ...[
                  const SizedBox(width: 8),
                  actions!,
                ],
              ],
            ),
          )
        : null;

    final bodyWidget = Container(
      decoration: flush
          ? BoxDecoration(
              border: Border(
                top: BorderSide(
                  color: c.gray200.withValues(alpha: 0.7),
                  width: 1,
                ),
              ),
            )
          : null,
      padding: flush
          ? EdgeInsets.zero
          : (padding ?? EdgeInsets.fromLTRB(16, hasHeader ? 0 : 16, 16, 16)),
      child: child,
    );

    final barWidget = bar != null
        ? Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              border: Border(
                top: BorderSide(
                  color: c.gray200.withValues(alpha: 0.7),
                  width: 1,
                ),
              ),
            ),
            child: bar!,
          )
        : null;

    final footerWidget = footer != null
        ? Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            alignment: Alignment.centerRight,
            decoration: flush
                ? BoxDecoration(
                    border: Border(
                      top: BorderSide(
                        color: c.gray200.withValues(alpha: 0.7),
                        width: 1,
                      ),
                    ),
                  )
                : null,
            child: DefaultTextStyle(
              style: SalacopeTypography.small.copyWith(
                color: c.gray500,
              ),
              child: footer!,
            ),
          )
        : null;

    final content = Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        ?headerWidget,
        bodyWidget,
        ?barWidget,
        ?footerWidget,
      ],
    );

    final panelBox = Container(
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

    if (onTap == null) {
      return panelBox;
    }

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: SalacopeTokens.border2xl,
        child: panelBox,
      ),
    );
  }
}
