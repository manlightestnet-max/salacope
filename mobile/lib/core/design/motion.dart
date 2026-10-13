import 'package:flutter/material.dart';

abstract final class SalacopeMotion {
  /// Custom ease curve from tailwind.config.js
  static const Curve curve = Cubic(0.2, 0.7, 0.2, 1.0);

  static const Duration durationFast = Duration(milliseconds: 150);
  static const Duration durationNormal = Duration(milliseconds: 250);
  static const Duration durationFadeUp = Duration(milliseconds: 450);

  /// Helper to check if animations should be skipped
  static bool shouldDisable(BuildContext context) {
    return MediaQuery.maybeDisableAnimationsOf(context) ?? false;
  }
}

/// Reveal animation for list items and cards with staggered delay
class RevealFadeUp extends StatefulWidget {
  final Widget child;
  final int index;
  final Duration duration;

  const RevealFadeUp({
    super.key,
    required this.child,
    this.index = 0,
    this.duration = SalacopeMotion.durationFadeUp,
  });

  @override
  State<RevealFadeUp> createState() => _RevealFadeUpState();
}

class _RevealFadeUpState extends State<RevealFadeUp>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _opacity;
  late final Animation<Offset> _offset;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: widget.duration);
    _opacity = CurvedAnimation(parent: _controller, curve: SalacopeMotion.curve);
    _offset = Tween<Offset>(
      begin: const Offset(0, 0.08),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _controller, curve: SalacopeMotion.curve));

    final delay = (widget.index % 4) * 60;
    Future.delayed(Duration(milliseconds: delay), () {
      if (mounted) _controller.forward();
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (SalacopeMotion.shouldDisable(context)) {
      return widget.child;
    }

    return FadeTransition(
      opacity: _opacity,
      child: SlideTransition(
        position: _offset,
        child: widget.child,
      ),
    );
  }
}
