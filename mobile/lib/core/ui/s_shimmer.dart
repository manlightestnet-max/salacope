import 'package:flutter/material.dart';
import '../design/colors.dart';

/// Balayage lumineux appliqué à tous les [SShimmerBox] descendants.
/// Un seul contrôleur pour tout le bloc : coût GPU minimal.
class SShimmer extends StatefulWidget {
  final Widget child;

  const SShimmer({super.key, required this.child});

  @override
  State<SShimmer> createState() => _SShimmerState();
}

class _SShimmerState extends State<SShimmer>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1400),
  )..repeat();

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final base = colors.canvasSubtle;
    final highlight = colors.canvasBorder;

    return AnimatedBuilder(
      animation: _ctrl,
      child: widget.child,
      builder: (context, child) {
        final t = _ctrl.value;
        return ShaderMask(
          blendMode: BlendMode.srcATop,
          shaderCallback: (rect) => LinearGradient(
            begin: Alignment(-1.5 + 3 * t, -0.3),
            end: Alignment(-0.5 + 3 * t, 0.3),
            colors: [base, highlight, base],
            stops: const [0.25, 0.5, 0.75],
          ).createShader(rect),
          child: child,
        );
      },
    );
  }
}

/// Bloc plein à peindre sous un [SShimmer].
class SShimmerBox extends StatelessWidget {
  final double? width;
  final double? height;
  final double radius;

  const SShimmerBox({super.key, this.width, this.height, this.radius = 12});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: context.colors.canvasSubtle,
        borderRadius: BorderRadius.circular(radius),
      ),
    );
  }
}
