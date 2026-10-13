import 'package:flutter/material.dart';
import '../design/colors.dart';
import '../design/tokens.dart';
import '../design/typography.dart';

class SSegmentedOption<T> {
  final T value;
  final String label;
  final IconData? icon;

  const SSegmentedOption({
    required this.value,
    required this.label,
    this.icon,
  });
}

class SSegmented<T> extends StatelessWidget {
  final T value;
  final List<SSegmentedOption<T>> options;
  final ValueChanged<T> onChanged;

  const SSegmented({
    super.key,
    required this.value,
    required this.options,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;

    return Container(
      padding: const EdgeInsets.all(2),
      decoration: BoxDecoration(
        color: colors.surface,
        borderRadius: SalacopeTokens.borderLg,
        border: Border.all(color: colors.gray200, width: 1),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: options.map((option) {
          final bool active = option.value == value;

          return Material(
            color: active ? colors.gray100 : Colors.transparent,
            borderRadius: SalacopeTokens.borderMd,
            child: InkWell(
              onTap: () => onChanged(option.value),
              borderRadius: SalacopeTokens.borderMd,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (option.icon != null) ...[
                      Icon(
                        option.icon,
                        size: 14,
                        color: active ? colors.gray900 : colors.gray500,
                      ),
                      const SizedBox(width: 6),
                    ],
                    Text(
                      option.label,
                      style: TextStyle(
                        fontFamily: SalacopeTypography.fontSans,
                        fontSize: 12.5,
                        fontWeight: active ? FontWeight.w600 : FontWeight.w500,
                        color: active ? colors.gray900 : colors.gray500,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}
