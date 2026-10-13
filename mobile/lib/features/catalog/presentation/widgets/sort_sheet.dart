import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../../core/design/colors.dart';
import '../../../../core/design/typography.dart';
import '../../domain/catalog_model.dart';

/// Sort choices in a bottom sheet: one line each, a tick on the current one.
Future<CatalogSort?> showSortSheet(BuildContext context, CatalogSort current) {
  return showModalBottomSheet<CatalogSort>(
    context: context,
    backgroundColor: context.colors.surface,
    showDragHandle: true,
    builder: (context) {
      final colors = context.colors;
      return SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'Trier par',
                  style: SalacopeTypography.headline.copyWith(color: colors.textPrimary),
                ),
              ),
            ),
            for (final sort in CatalogSort.values)
              InkWell(
                onTap: () => Navigator.of(context).pop(sort),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          sort.label,
                          style: SalacopeTypography.body.copyWith(
                            color: colors.textPrimary,
                            fontWeight: sort == current ? FontWeight.w600 : FontWeight.w400,
                          ),
                        ),
                      ),
                      if (sort == current)
                        Icon(LucideIcons.check, size: 18, color: colors.textPrimary),
                    ],
                  ),
                ),
              ),
            const SizedBox(height: 8),
          ],
        ),
      );
    },
  );
}
