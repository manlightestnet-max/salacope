import 'package:flutter/material.dart';
import '../../../../core/design/colors.dart';
import '../../../../core/design/typography.dart';

class SearchTab {
  final String id;
  final String label;
  final int count;

  const SearchTab({required this.id, required this.label, required this.count});
}

/// Categories as plain text with a counter: the chosen one is bold with a line under it.
/// No fill and no accent colour, so nothing fights with the covers below.
class SearchCategoryTabs extends StatelessWidget {
  final List<SearchTab> tabs;
  final String selectedId;
  final ValueChanged<String> onSelected;

  const SearchCategoryTabs({
    super.key,
    required this.tabs,
    required this.selectedId,
    required this.onSelected,
  });

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;

    return SizedBox(
      height: 44,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: tabs.length,
        separatorBuilder: (_, _) => const SizedBox(width: 20),
        itemBuilder: (context, i) {
          final tab = tabs[i];
          final active = tab.id == selectedId;
          final color = active ? colors.textPrimary : colors.textMuted;

          return GestureDetector(
            onTap: () => onSelected(tab.id),
            behavior: HitTestBehavior.opaque,
            child: Container(
              alignment: Alignment.center,
              decoration: BoxDecoration(
                border: Border(
                  bottom: BorderSide(
                    color: active ? colors.textPrimary : Colors.transparent,
                    width: 2,
                  ),
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    tab.label,
                    style: SalacopeTypography.bodyStrong.copyWith(
                      color: color,
                      fontWeight: active ? FontWeight.w600 : FontWeight.w500,
                    ),
                  ),
                  const SizedBox(width: 5),
                  Text(
                    '${tab.count}',
                    style: SalacopeTypography.caption.copyWith(color: colors.textTertiary),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
