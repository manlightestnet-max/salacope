import 'package:flutter/material.dart';
import '../design/colors.dart';
import '../design/tokens.dart';
import '../design/typography.dart';

class CategoryTabItem {
  final String id;
  final String label;
  final int? count;

  const CategoryTabItem({
    required this.id,
    required this.label,
    this.count,
  });
}

class CategoryTabs extends StatelessWidget {
  final String selectedId;
  final List<CategoryTabItem> items;
  final ValueChanged<String> onSelected;

  const CategoryTabs({
    super.key,
    required this.selectedId,
    required this.items,
    required this.onSelected,
  });

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;

    return Container(
      height: 48,
      color: colors.canvas,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        itemCount: items.length,
        separatorBuilder: (_, _) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          final item = items[index];
          final bool isSelected = item.id == selectedId;

          return Material(
            color: isSelected ? colors.accent : colors.surface,
            borderRadius: SalacopeTokens.borderFull,
            child: InkWell(
              onTap: () => onSelected(item.id),
              borderRadius: SalacopeTokens.borderFull,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                decoration: BoxDecoration(
                  borderRadius: SalacopeTokens.borderFull,
                  border: isSelected
                      ? null
                      : Border.all(color: colors.gray200, width: 1),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      item.label,
                      style: TextStyle(
                        fontFamily: SalacopeTypography.fontSans,
                        fontSize: 13,
                        fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                        color: isSelected ? colors.onAccent : colors.gray700,
                      ),
                    ),
                    if (item.count != null) ...[
                      const SizedBox(width: 6),
                      Text(
                        '${item.count}',
                        style: TextStyle(
                          fontFamily: SalacopeTypography.fontSans,
                          fontSize: 11.5,
                          fontWeight: FontWeight.w600,
                          color: isSelected
                              ? colors.onAccent.withValues(alpha: 0.8)
                              : colors.gray400,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

class SliverCategoryTabsDelegate extends SliverPersistentHeaderDelegate {
  final CategoryTabs tabs;

  SliverCategoryTabsDelegate({required this.tabs});

  @override
  double get minExtent => 48.0;

  @override
  double get maxExtent => 48.0;

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) {
    return tabs;
  }

  @override
  bool shouldRebuild(covariant SliverCategoryTabsDelegate oldDelegate) {
    return oldDelegate.tabs.selectedId != tabs.selectedId ||
        oldDelegate.tabs.items != tabs.items;
  }
}
