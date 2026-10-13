import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../design/colors.dart';
import '../design/tokens.dart';
import '../design/typography.dart';

class SSheet extends StatelessWidget {
  final String? title;
  final String? description;
  final Widget? footer;
  final Widget child;

  const SSheet({
    super.key,
    this.title,
    this.description,
    this.footer,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;

    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.90,
      ),
      decoration: BoxDecoration(
        color: colors.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(16.0)),
        boxShadow: SalacopeTokens.shadowLg,
      ),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Drag handle
            Center(
              child: Container(
                margin: const EdgeInsets.only(top: 8, bottom: 4),
                width: 36,
                height: 4,
                decoration: BoxDecoration(
                  color: colors.gray300,
                  borderRadius: SalacopeTokens.borderFull,
                ),
              ),
            ),
            if (title != null || description != null)
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 12, 12, 12),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (title != null)
                            Text(
                              title!,
                              style: SalacopeTypography.panelTitle.copyWith(
                                color: colors.textPrimary,
                              ),
                            ),
                          if (description != null) ...[
                            const SizedBox(height: 2),
                            Text(
                              description!,
                              style: SalacopeTypography.caption.copyWith(
                                color: colors.textMuted,
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                    IconButton(
                      icon: Icon(LucideIcons.x, size: 18, color: colors.textMuted),
                      onPressed: () => Navigator.of(context).pop(),
                      splashRadius: 20,
                    ),
                  ],
                ),
              ),
            Flexible(
              child: SingleChildScrollView(
                padding: EdgeInsets.fromLTRB(
                  20,
                  (title == null && description == null) ? 12 : 0,
                  20,
                  footer != null ? 12 : 20,
                ),
                child: child,
              ),
            ),
            if (footer != null)
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  border: Border(
                    top: BorderSide(
                      color: colors.canvasBorder,
                      width: 1,
                    ),
                  ),
                ),
                child: footer,
              ),
          ],
        ),
      ),
    );
  }
}
