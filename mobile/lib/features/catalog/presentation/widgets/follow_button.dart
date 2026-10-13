import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../../core/design/colors.dart';
import '../../../../core/design/typography.dart';

/// The subscribe button. Not subscribed: filled, white icon and label. Subscribed: outlined, with a tick.
/// The moment it becomes subscribed, sparks burst out around it.
class FollowButton extends StatefulWidget {
  final bool isFollowing;
  final bool loading;
  final VoidCallback onPressed;

  /// Icon and label only, for the floating version.
  final bool compact;

  const FollowButton({
    super.key,
    required this.isFollowing,
    required this.onPressed,
    this.loading = false,
    this.compact = false,
  });

  @override
  State<FollowButton> createState() => _FollowButtonState();
}

class _FollowButtonState extends State<FollowButton> with SingleTickerProviderStateMixin {
  late final AnimationController _burst;

  @override
  void initState() {
    super.initState();
    _burst = AnimationController(vsync: this, duration: const Duration(milliseconds: 850));
  }

  @override
  void didUpdateWidget(FollowButton old) {
    super.didUpdateWidget(old);
    if (!old.isFollowing && widget.isFollowing) {
      HapticFeedback.mediumImpact();
      if (!MediaQuery.of(context).disableAnimations) _burst.forward(from: 0);
    }
  }

  @override
  void dispose() {
    _burst.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final following = widget.isFollowing;
    final fg = following ? colors.textPrimary : Colors.white;

    return Stack(
      clipBehavior: Clip.none,
      alignment: Alignment.center,
      children: [
        // The sparks live outside the button's box.
        Positioned.fill(
          child: IgnorePointer(
            child: AnimatedBuilder(
              animation: _burst,
              builder: (context, _) => CustomPaint(
                painter: _SparksPainter(
                  progress: _burst.value,
                  colors: [colors.accent, colors.emerald400, colors.amber500, colors.blue500],
                ),
              ),
            ),
          ),
        ),
        Material(
          color: following ? Colors.transparent : colors.accent,
          shape: StadiumBorder(
            side: following ? BorderSide(color: colors.gray300, width: 1) : BorderSide.none,
          ),
          clipBehavior: Clip.antiAlias,
          child: InkWell(
            onTap: widget.loading ? null : widget.onPressed,
            child: Padding(
              padding: EdgeInsets.symmetric(horizontal: widget.compact ? 18 : 16, vertical: 12),
              child: Row(
                mainAxisSize: widget.compact ? MainAxisSize.min : MainAxisSize.max,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  widget.loading
                      ? SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2, color: fg),
                        )
                      : AnimatedSwitcher(
                          duration: const Duration(milliseconds: 200),
                          switchInCurve: Curves.easeOutBack,
                          transitionBuilder: (child, anim) => ScaleTransition(scale: anim, child: child),
                          child: Icon(
                            following ? LucideIcons.check : LucideIcons.userPlus,
                            key: ValueKey(following),
                            size: 17,
                            color: fg,
                          ),
                        ),
                  const SizedBox(width: 8),
                  Text(
                    following ? 'Abonné(e)' : 'S’abonner',
                    style: SalacopeTypography.bodyStrong.copyWith(color: fg),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}

/// Dots and short strokes flying out of the button, slowing down and fading.
class _SparksPainter extends CustomPainter {
  final double progress;
  final List<Color> colors;

  static const int _count = 22;

  _SparksPainter({required this.progress, required this.colors});

  @override
  void paint(Canvas canvas, Size size) {
    if (progress <= 0 || progress >= 1) return;
    final center = size.center(Offset.zero);
    final ease = Curves.easeOutCubic.transform(progress);
    final fade = 1 - Curves.easeIn.transform(progress);

    for (var i = 0; i < _count; i++) {
      // A fixed pseudo-random spread, the same on every burst.
      final seed = math.sin(i * 12.9898) * 43758.5453;
      final rnd = seed - seed.floorToDouble();
      final angle = (i / _count) * math.pi * 2 + rnd * 0.4;
      final reach = 34 + rnd * 46;
      // Start from the edge of the button, not from its middle.
      final from = Offset(math.cos(angle) * size.width * 0.32, math.sin(angle) * size.height * 0.3);
      final to = from + Offset(math.cos(angle), math.sin(angle)) * reach * ease;
      final paint = Paint()
        ..color = colors[i % colors.length].withValues(alpha: fade)
        ..strokeCap = StrokeCap.round
        ..strokeWidth = 2.6;

      if (i.isEven) {
        canvas.drawCircle(center + to, (3.2 - rnd * 1.4) * (1 - progress * 0.4), paint..style = PaintingStyle.fill);
      } else {
        final tail = to - Offset(math.cos(angle), math.sin(angle)) * (6 + rnd * 6) * (1 - progress);
        canvas.drawLine(center + tail, center + to, paint..style = PaintingStyle.stroke);
      }
    }
  }

  @override
  bool shouldRepaint(_SparksPainter old) => old.progress != progress;
}
