import 'package:flutter/material.dart';
import '../design/colors.dart';
import '../design/typography.dart';

class SPage extends StatelessWidget {
  final String title;
  final Widget? leading;
  final Widget? meta;
  final List<Widget>? actions;
  final PreferredSizeWidget? toolbar;
  final List<Widget>? slivers;
  final Widget? child;
  final Future<void> Function()? onRefresh;

  const SPage({
    super.key,
    required this.title,
    this.leading,
    this.meta,
    this.actions,
    this.toolbar,
    this.slivers,
    this.child,
    this.onRefresh,
  }) : assert(slivers != null || child != null, 'Either slivers or child must be provided');

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;

    final actualSlivers = slivers ??
        (child != null ? [SliverToBoxAdapter(child: child!)] : <Widget>[]);

    Widget scrollView = CustomScrollView(
      slivers: actualSlivers,
    );

    if (onRefresh != null) {
      scrollView = RefreshIndicator(
        onRefresh: onRefresh!,
        color: colors.accent,
        backgroundColor: colors.surface,
        child: scrollView,
      );
    }

    return Scaffold(
      backgroundColor: colors.canvas,
      appBar: AppBar(
        backgroundColor: colors.canvas,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        leading: leading,
        titleSpacing: leading == null ? 16 : 0,
        title: Row(
          children: [
            Expanded(
              child: Text(
                title,
                style: SalacopeTypography.headingMedium.copyWith(color: colors.gray950),
                overflow: TextOverflow.ellipsis,
              ),
            ),
            if (meta != null) ...[
              const SizedBox(width: 8),
              meta!,
            ],
          ],
        ),
        actions: [
          ...?actions,
          const SizedBox(width: 8),
        ],
        bottom: toolbar != null
            ? PreferredSize(
                preferredSize: toolbar!.preferredSize,
                child: Container(
                  decoration: BoxDecoration(
                    border: Border(
                      bottom: BorderSide(color: colors.gray200, width: 1),
                    ),
                  ),
                  child: toolbar,
                ),
              )
            : null,
      ),
      body: SafeArea(
        top: false,
        child: scrollView,
      ),
    );
  }
}
