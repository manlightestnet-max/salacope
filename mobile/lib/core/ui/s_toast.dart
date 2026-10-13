import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../design/colors.dart';
import '../design/tokens.dart';
import '../design/typography.dart';

enum SToastVariant {
  success,
  danger,
  info,
}

abstract final class SToast {
  static void show(
    BuildContext context, {
    required String message,
    SToastVariant variant = SToastVariant.info,
  }) {
    switch (variant) {
      case SToastVariant.success:
        success(context, message);
        break;
      case SToastVariant.danger:
        error(context, message);
        break;
      case SToastVariant.info:
        info(context, message);
        break;
    }
  }

  static void success(BuildContext context, String message) {
    _show(context, message, isError: false);
  }

  static void error(BuildContext context, String message) {
    _show(context, message, isError: true);
  }

  static void info(BuildContext context, String message) {
    _show(context, message, isError: false, icon: LucideIcons.info);
  }

  static void _show(BuildContext context, String message, {required bool isError, IconData? icon}) {
    final colors = context.colors;

    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        behavior: SnackBarBehavior.floating,
        margin: const EdgeInsets.all(16),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        backgroundColor: colors.surface,
        elevation: 8,
        shape: RoundedRectangleBorder(
          borderRadius: SalacopeTokens.borderLg,
          side: BorderSide(
            color: isError ? colors.red500.withValues(alpha: 0.5) : colors.gray200,
            width: 1,
          ),
        ),
        duration: const Duration(seconds: 4),
        content: Row(
          children: [
            Icon(
              icon ?? (isError ? LucideIcons.circleAlert : LucideIcons.circleCheck),
              size: 18,
              color: isError ? colors.red500 : colors.emerald500,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                message,
                style: TextStyle(
                  fontFamily: SalacopeTypography.fontSans,
                  fontSize: 13.5,
                  fontWeight: FontWeight.w500,
                  color: colors.gray900,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
