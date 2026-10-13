import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../../core/design/colors.dart';
import '../../../../core/design/typography.dart';

/// Recent searches under the field: a tap runs one again, the cross forgets it.
class SearchHistoryList extends StatelessWidget {
  final List<String> terms;
  final ValueChanged<String> onPick;
  final ValueChanged<String> onRemove;
  final VoidCallback onClear;

  const SearchHistoryList({
    super.key,
    required this.terms,
    required this.onPick,
    required this.onRemove,
    required this.onClear,
  });

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;

    return ListView(
      keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
      padding: const EdgeInsets.only(top: 8, bottom: 24),
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 4, 8, 0),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  'Recherches récentes',
                  style: SalacopeTypography.caption.copyWith(
                    color: colors.textMuted,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              TextButton(
                onPressed: onClear,
                style: TextButton.styleFrom(
                  foregroundColor: colors.textPrimary,
                  visualDensity: VisualDensity.compact,
                ),
                child: const Text('Effacer'),
              ),
            ],
          ),
        ),
        for (final term in terms)
          InkWell(
            onTap: () => onPick(term),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 4, 4, 4),
              child: Row(
                children: [
                  Icon(LucideIcons.clock, size: 18, color: colors.textMuted),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Text(
                      term,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: SalacopeTypography.body.copyWith(
                        color: colors.textPrimary,
                        fontSize: 15,
                      ),
                    ),
                  ),
                  IconButton(
                    icon: Icon(LucideIcons.x, size: 16, color: colors.textMuted),
                    tooltip: 'Retirer',
                    onPressed: () => onRemove(term),
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }
}
