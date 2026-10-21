import 'dart:async';
import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../design/colors.dart';
import '../design/tokens.dart';
import '../design/typography.dart';
import 's_button.dart';

Future<T?> showSSheet<T>({
  required BuildContext context,
  String? title,
  String? description,
  Widget? footer,
  bool isDismissible = true,
  required Widget child,
}) {
  final c = context.colors;

  return showModalBottomSheet<T>(
    context: context,
    // Over the whole app (bottom bar included), so closing it never closes the screen beneath.
    useRootNavigator: true,
    isScrollControlled: true,
    isDismissible: isDismissible,
    enableDrag: isDismissible,
    backgroundColor: Colors.transparent,
    builder: (ctx) {
      return Container(
        constraints: BoxConstraints(
          maxHeight: MediaQuery.of(ctx).size.height * 0.90,
        ),
        decoration: BoxDecoration(
          color: c.surface,
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
                    color: c.gray300,
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
                                title,
                                style: SalacopeTypography.panelTitle.copyWith(
                                  color: c.gray900,
                                ),
                              ),
                            if (description != null) ...[
                              const SizedBox(height: 2),
                              Text(
                                description,
                                style: SalacopeTypography.caption.copyWith(
                                  color: c.gray500,
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                      if (isDismissible)
                        IconButton(
                          icon: Icon(LucideIcons.x, size: 18, color: c.gray400),
                          onPressed: () => Navigator.of(ctx).pop(),
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
                        color: c.gray200.withValues(alpha: 0.7),
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
    },
  );
}

Future<bool?> showSConfirm({
  required BuildContext context,
  required String title,
  required String description,
  required String confirmLabel,
  String cancelLabel = 'Retour',
  bool danger = false,
  required FutureOr<bool?> Function() onConfirm,
}) {
  final c = context.colors;

  return showDialog<bool>(
    context: context,
    builder: (ctx) {
      return Dialog(
        backgroundColor: c.surface,
        shape: RoundedRectangleBorder(
          borderRadius: SalacopeTokens.border2xl,
        ),
        insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: SalacopeTypography.panelTitle.copyWith(
                  color: c.gray900,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                description,
                style: SalacopeTypography.body.copyWith(
                  color: c.gray500,
                ),
              ),
              const SizedBox(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  SButton(
                    label: cancelLabel,
                    variant: SButtonVariant.secondary,
                    size: SButtonSize.md,
                    onPressed: () => Navigator.of(ctx).pop(false),
                  ),
                  const SizedBox(width: 8),
                  SButton(
                    label: confirmLabel,
                    variant: danger ? SButtonVariant.danger : SButtonVariant.primary,
                    size: SButtonSize.md,
                    onPressed: () async {
                      final result = await onConfirm();
                      if (ctx.mounted && result != false) {
                        Navigator.of(ctx).pop(true);
                      }
                    },
                  ),
                ],
              ),
            ],
          ),
        ),
      );
    },
  );
}

class SConfirm extends StatelessWidget {
  final String title;
  final String description;
  final String confirmLabel;
  final bool isDanger;
  final FutureOr<void> Function() onConfirm;

  const SConfirm({
    super.key,
    required this.title,
    required this.description,
    required this.confirmLabel,
    this.isDanger = false,
    required this.onConfirm,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;

    return Dialog(
      backgroundColor: c.surface,
      shape: RoundedRectangleBorder(
        borderRadius: SalacopeTokens.border2xl,
        side: BorderSide(color: c.gray200.withValues(alpha: 0.7)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              title,
              style: SalacopeTypography.panelTitle.copyWith(
                color: c.textPrimary,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              description,
              style: SalacopeTypography.body.copyWith(
                color: c.textMuted,
              ),
            ),
            const SizedBox(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                SButton(
                  label: 'Retour',
                  variant: SButtonVariant.secondary,
                  size: SButtonSize.md,
                  onPressed: () => Navigator.of(context).pop(false),
                ),
                const SizedBox(width: 8),
                SButton(
                  label: confirmLabel,
                  variant: isDanger ? SButtonVariant.danger : SButtonVariant.primary,
                  size: SButtonSize.md,
                  onPressed: () async {
                    await onConfirm();
                  },
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
