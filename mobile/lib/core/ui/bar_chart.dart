import 'dart:math';
import 'package:flutter/material.dart';
import '../design/theme.dart';
import '../design/typography.dart';

class BarDatum {
  final String key;
  final String label;
  final int value;

  const BarDatum({
    required this.key,
    required this.label,
    required this.value,
  });
}

class BarChart extends StatefulWidget {
  final List<BarDatum> data;
  final String Function(int value) formatValue;
  final String title;
  final double height;
  final int labelEvery;

  const BarChart({
    super.key,
    required this.data,
    required this.formatValue,
    required this.title,
    this.height = 140,
    this.labelEvery = 5,
  });

  @override
  State<BarChart> createState() => _BarChartState();
}

class _BarChartState extends State<BarChart> {
  int? _activeIndex;

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final data = widget.data;
    if (data.isEmpty) return const SizedBox.shrink();

    final maxValue = data.fold<int>(1, (m, d) => max(m, d.value));
    final activeDatum = _activeIndex != null && _activeIndex! < data.length
        ? data[_activeIndex!]
        : null;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        // Active tooltip / subtitle
        SizedBox(
          height: 22,
          child: activeDatum != null
              ? Row(
                  children: [
                    Text(
                      widget.formatValue(activeDatum.value),
                      style: SalacopeTypography.bodyStrong.copyWith(
                        color: colors.textPrimary,
                        fontSize: 13,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      '· ${activeDatum.label}',
                      style: SalacopeTypography.caption.copyWith(
                        color: colors.textMuted,
                        fontSize: 12,
                      ),
                    ),
                  ],
                )
              : null,
        ),
        const SizedBox(height: 6),

        // Bars
        SizedBox(
          height: widget.height,
          child: Container(
            decoration: BoxDecoration(
              border: Border(
                bottom: BorderSide(color: colors.canvasBorder, width: 0.8),
              ),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: List.generate(data.length, (index) {
                final d = data[index];
                final isZero = d.value == 0;
                final isActive = _activeIndex == index;
                final heightFactor = isZero
                    ? (2.0 / widget.height)
                    : max(0.04, d.value / maxValue);

                return Expanded(
                  child: GestureDetector(
                    behavior: HitTestBehavior.opaque,
                    onTapDown: (_) => setState(() => _activeIndex = index),
                    onTapCancel: () => setState(() => _activeIndex = null),
                    onTapUp: (_) => setState(() => _activeIndex = index),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 1.5),
                      child: FractionallySizedBox(
                        heightFactor: heightFactor,
                        alignment: Alignment.bottomCenter,
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 150),
                          decoration: BoxDecoration(
                            color: isZero
                                ? colors.gray200
                                : isActive
                                    ? colors.accent
                                    : colors.accent.withValues(alpha: 0.8),
                            borderRadius: const BorderRadius.vertical(
                              top: Radius.circular(3),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                );
              }),
            ),
          ),
        ),

        // Labels
        const SizedBox(height: 6),
        Row(
          children: List.generate(data.length, (index) {
            final showLabel =
                index % widget.labelEvery == 0 || index == data.length - 1;
            return Expanded(
              child: showLabel
                  ? Text(
                      data[index].label,
                      maxLines: 1,
                      overflow: TextOverflow.visible,
                      style: SalacopeTypography.caption.copyWith(
                        color: colors.textMuted,
                        fontSize: 10,
                      ),
                    )
                  : const SizedBox.shrink(),
            );
          }),
        ),
      ],
    );
  }
}
