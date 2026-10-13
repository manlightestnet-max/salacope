import 'package:flutter/material.dart';
import '../design/colors.dart';
import '../design/tokens.dart';
import '../design/typography.dart';

class SEmptyState extends StatelessWidget {
  final IconData? icon;
  final String title;
  final String? description;
  final Widget? action;

  const SEmptyState({
    super.key,
    this.icon,
    required this.title,
    this.description,
    this.action,
  });

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 48),
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            if (icon != null) ...[
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: colors.gray100,
                  borderRadius: SalacopeTokens.borderLg,
                ),
                child: Center(
                  child: Icon(
                    icon,
                    size: 20,
                    color: colors.gray500,
                  ),
                ),
              ),
              const SizedBox(height: 14),
            ],
            Text(
              title,
              style: SalacopeTypography.headingSmall.copyWith(color: colors.gray900),
              textAlign: TextAlign.center,
            ),
            if (description != null) ...[
              const SizedBox(height: 6),
              ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 280),
                child: Text(
                  description!,
                  style: SalacopeTypography.bodySmall.copyWith(color: colors.gray500),
                  textAlign: TextAlign.center,
                ),
              ),
            ],
            if (action != null) ...[
              const SizedBox(height: 18),
              action!,
            ],
          ],
        ),
      ),
    );
  }
}
