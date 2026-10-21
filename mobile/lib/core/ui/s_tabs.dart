import 'package:flutter/material.dart';
import '../design/colors.dart';
import '../design/typography.dart';

class STab<T> {
  final T value;
  final String label;

  /// Shown after the label (to do, unread…), hidden at 0.
  final int count;

  /// A dot instead of a count (something needs the person's attention).
  final bool alert;

  const STab({required this.value, required this.label, this.count = 0, this.alert = false});
}

/// The web's bar tabs (`Tabs bare`): labels side by side under a title, the chosen one in bold with a line under it.
/// Scrolls sideways when they do not fit; the chosen one is always brought into view.
class STabs<T> extends StatefulWidget {
  final T value;
  final List<STab<T>> tabs;
  final ValueChanged<T> onChanged;

  const STabs({super.key, required this.value, required this.tabs, required this.onChanged});

  @override
  State<STabs<T>> createState() => _STabsState<T>();
}

class _STabsState<T> extends State<STabs<T>> {
  final Map<T, GlobalKey> _keys = {};

  @override
  void didUpdateWidget(STabs<T> old) {
    super.didUpdateWidget(old);
    if (old.value != widget.value) _reveal();
  }

  @override
  void initState() {
    super.initState();
    _reveal();
  }

  void _reveal() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final ctx = _keys[widget.value]?.currentContext;
      if (ctx != null) Scrollable.ensureVisible(ctx, alignment: 0.5, duration: const Duration(milliseconds: 200));
    });
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final reduce = MediaQuery.of(context).disableAnimations;
    return SizedBox(
      height: 46,
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        child: Row(
          children: [
            for (final tab in widget.tabs)
              InkWell(
                key: _keys.putIfAbsent(tab.value, GlobalKey.new),
                onTap: () => widget.onChanged(tab.value),
                child: AnimatedContainer(
                  duration: reduce ? Duration.zero : const Duration(milliseconds: 180),
                  padding: const EdgeInsets.symmetric(horizontal: 10),
                  decoration: BoxDecoration(
                    border: Border(
                      bottom: BorderSide(color: tab.value == widget.value ? colors.accent : Colors.transparent, width: 2),
                    ),
                  ),
                  child: Row(
                    children: [
                      Text(
                        tab.label,
                        style: SalacopeTypography.bodyStrong.copyWith(
                          color: tab.value == widget.value ? colors.textPrimary : colors.textMuted,
                          fontWeight: tab.value == widget.value ? FontWeight.w600 : FontWeight.w500,
                        ),
                      ),
                      if (tab.count > 0) ...[
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                          decoration: BoxDecoration(color: colors.accent, borderRadius: BorderRadius.circular(999)),
                          child: Text('${tab.count}', style: SalacopeTypography.small.copyWith(color: colors.onAccent, fontWeight: FontWeight.w700)),
                        ),
                      ] else if (tab.alert) ...[
                        const SizedBox(width: 6),
                        Container(width: 6, height: 6, decoration: BoxDecoration(color: colors.amber500, shape: BoxShape.circle)),
                      ],
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
