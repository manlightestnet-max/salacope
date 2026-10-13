import 'dart:ui' show lerpDouble;
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../design/colors.dart';

/// A page that grows out of a rectangle of the previous screen (a button) until it fills the screen,
/// and folds back into it on the way out. The rectangle is filled with the button's colour first,
/// then the screen fades in on top, so the button seems to burst open.
CustomTransitionPage<T> expandFromRectPage<T>({
  required LocalKey key,
  required Rect from,
  required Widget child,
}) {
  return CustomTransitionPage<T>(
    key: key,
    child: child,
    transitionDuration: const Duration(milliseconds: 420),
    reverseTransitionDuration: const Duration(milliseconds: 320),
    transitionsBuilder: (context, animation, secondaryAnimation, child) {
      final curved = CurvedAnimation(
        parent: animation,
        curve: Curves.easeInOutCubic,
        reverseCurve: Curves.easeInCubic,
      );
      return _Expand(animation: curved, from: from, child: child);
    },
  );
}

class _Expand extends StatelessWidget {
  final Animation<double> animation;
  final Rect from;
  final Widget child;

  const _Expand({required this.animation, required this.from, required this.child});

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final screen = MediaQuery.sizeOf(context);
    final full = Offset.zero & screen;

    return AnimatedBuilder(
      animation: animation,
      builder: (context, _) {
        final t = animation.value;
        final rect = Rect.lerp(from, full, t)!;
        final radius = lerpDouble(from.height / 2, 0, t)!;
        // The screen only shows once the colour has covered most of it.
        final reveal = ((t - 0.4) / 0.6).clamp(0.0, 1.0);

        return Stack(
          children: [
            Positioned.fromRect(
              rect: rect,
              child: ClipRRect(
                borderRadius: BorderRadius.circular(radius),
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    ColoredBox(color: colors.accent),
                    OverflowBox(
                      alignment: Alignment.topLeft,
                      minWidth: screen.width,
                      maxWidth: screen.width,
                      minHeight: screen.height,
                      maxHeight: screen.height,
                      child: Transform.translate(
                        offset: -rect.topLeft,
                        child: Opacity(opacity: reveal, child: child),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}
