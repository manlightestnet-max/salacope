import 'package:flutter/material.dart';
import '../design/colors.dart';
import '../design/tokens.dart';
import '../design/typography.dart';

class SSegmentedOption<T> {
  final T value;
  final String label;
  final IconData? icon;

  /// A count shown after the label (unread, to do…), hidden at 0.
  final int count;

  const SSegmentedOption({
    required this.value,
    required this.label,
    this.icon,
    this.count = 0,
  });
}

/// The web's switcher (`switcherTrack` / `switcherItem`): a grey track, the chosen option filled with the accent colour,
/// so which one is on is never in doubt. [expand]: the options share the whole width (a filter under a title).
class SSegmented<T> extends StatelessWidget {
  final T value;
  final List<SSegmentedOption<T>> options;
  final ValueChanged<T> onChanged;
  final bool expand;

  const SSegmented({
    super.key,
    required this.value,
    required this.options,
    required this.onChanged,
    this.expand = false,
  });

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final reduce = MediaQuery.of(context).disableAnimations;

    Widget item(SSegmentedOption<T> option) {
      final active = option.value == value;
      final fg = active ? colors.onAccent : colors.gray600;
      return Semantics(
        selected: active,
        button: true,
        child: GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: () => onChanged(option.value),
          child: AnimatedContainer(
            duration: reduce ? Duration.zero : const Duration(milliseconds: 180),
            curve: Curves.easeOutCubic,
            height: 34,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            decoration: BoxDecoration(
              color: active ? colors.accent : Colors.transparent,
              borderRadius: SalacopeTokens.borderMd,
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                if (option.icon != null) ...[
                  Icon(option.icon, size: 14, color: fg),
                  const SizedBox(width: 6),
                ],
                Flexible(
                  child: Text(
                    option.label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontFamily: SalacopeTypography.fontSans,
                      fontSize: 13,
                      fontWeight: active ? FontWeight.w600 : FontWeight.w500,
                      color: fg,
                    ),
                  ),
                ),
                if (option.count > 0) ...[
                  const SizedBox(width: 6),
                  Text(
                    '${option.count}',
                    style: TextStyle(
                      fontFamily: SalacopeTypography.fontSans,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: active ? colors.onAccent.withValues(alpha: 0.8) : colors.gray400,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(3),
      decoration: BoxDecoration(
        color: colors.gray100,
        borderRadius: SalacopeTokens.borderLg,
      ),
      child: Row(
        mainAxisSize: expand ? MainAxisSize.max : MainAxisSize.min,
        children: [
          for (final option in options) expand ? Expanded(child: item(option)) : item(option),
        ],
      ),
    );
  }
}
