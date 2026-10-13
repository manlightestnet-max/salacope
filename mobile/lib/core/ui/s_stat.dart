import 'package:flutter/material.dart';
import '../design/colors.dart';
import '../design/tokens.dart';
import '../design/typography.dart';

class SStat extends StatelessWidget {
  final String label;
  final String value;
  final String? hint;
  final bool emphasis;

  const SStat({
    super.key,
    required this.label,
    required this.value,
    this.hint,
    this.emphasis = false,
  });

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          label.toUpperCase(),
          style: SalacopeTypography.caption.copyWith(
            color: colors.gray500,
            letterSpacing: 0.5,
          ),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        const SizedBox(height: 6),
        Text(
          value,
          style: SalacopeTypography.headingLarge.copyWith(
            color: emphasis ? colors.primary700 : colors.gray900,
            fontFeatures: const [FontFeature.tabularFigures()],
          ),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        if (hint != null) ...[
          const SizedBox(height: 4),
          Text(
            hint!,
            style: SalacopeTypography.caption.copyWith(color: colors.gray500),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ],
    );
  }
}

class SStatGrid extends StatelessWidget {
  final List<SStat> stats;
  final bool isEnclosed;

  const SStatGrid({
    super.key,
    required this.stats,
    this.isEnclosed = true,
  });

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;

    final content = GridView.builder(
      physics: const NeverScrollableScrollPhysics(),
      shrinkWrap: true,
      itemCount: stats.length,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        mainAxisSpacing: 16,
        crossAxisSpacing: 16,
        childAspectRatio: 2.2,
      ),
      itemBuilder: (context, index) => stats[index],
    );

    if (!isEnclosed) {
      return content;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: colors.gray50,
        borderRadius: SalacopeTokens.borderXl,
        border: Border.all(color: colors.gray200.withValues(alpha: 0.7)),
      ),
      child: content,
    );
  }
}
