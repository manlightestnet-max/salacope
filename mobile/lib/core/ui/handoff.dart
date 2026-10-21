import 'package:flutter/material.dart';
import '../design/colors.dart';
import '../design/tokens.dart';
import '../design/typography.dart';

enum Brand {
  salacope('Salacope', 'assets/images/salacope-mark.png'),
  lightpay('LightPay', 'assets/images/lightpay-mark.png');

  final String label;
  final String assetPath;
  const Brand(this.label, this.assetPath);
}

class BrandMark extends StatelessWidget {
  final Brand brand;
  final double size;

  const BrandMark({
    super.key,
    required this.brand,
    this.size = 64.0,
  });

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: colors.surface,
        borderRadius: SalacopeTokens.border2Xl,
        border: Border.all(color: colors.gray200, width: 1),
        boxShadow: SalacopeTokens.shadowSm,
      ),
      child: Center(
        child: brand == Brand.salacope
            ? Container(
                width: size * 0.65,
                height: size * 0.65,
                decoration: const BoxDecoration(
                  color: Color(0xFF0B0D0C),
                  borderRadius: SalacopeTokens.borderLg,
                ),
                child: Center(
                  child: Image.asset(
                    brand.assetPath,
                    width: size * 0.45,
                    fit: BoxFit.contain,
                  ),
                ),
              )
            : Image.asset(
                brand.assetPath,
                width: size * 0.6,
                fit: BoxFit.contain,
              ),
      ),
    );
  }
}

class Handoff extends StatefulWidget {
  final Brand from;
  final Brand to;
  final String title;
  final String? description;

  /// Without its own card (inside a sheet that already is one).
  final bool bare;

  const Handoff({
    super.key,
    required this.from,
    required this.to,
    required this.title,
    this.description,
    this.bare = false,
  });

  @override
  State<Handoff> createState() => _HandoffState();
}

class _HandoffState extends State<Handoff> with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    )..repeat();
    _animation = CurvedAnimation(parent: _controller, curve: Curves.easeInOut);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;

    return Center(
      child: Container(
        constraints: const BoxConstraints(maxWidth: 360),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
        decoration: widget.bare
            ? null
            : BoxDecoration(
                color: colors.surface,
                borderRadius: const BorderRadius.all(Radius.circular(24)),
                border: Border.all(color: colors.gray200.withValues(alpha: 0.7), width: 1),
                boxShadow: SalacopeTokens.shadowLg,
              ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                BrandMark(brand: widget.from),
                const SizedBox(width: 12),
                SizedBox(
                  width: 60,
                  height: 20,
                  child: AnimatedBuilder(
                    animation: _animation,
                    builder: (context, _) {
                      return Stack(
                        alignment: Alignment.centerLeft,
                        children: [
                          Center(
                            child: Container(
                              height: 2,
                              color: colors.gray300,
                            ),
                          ),
                          Positioned(
                            left: _animation.value * 50,
                            child: Container(
                              width: 10,
                              height: 10,
                              decoration: BoxDecoration(
                                color: colors.accent,
                                shape: BoxShape.circle,
                                boxShadow: [
                                  BoxShadow(
                                    color: colors.accent.withValues(alpha: 0.3),
                                    blurRadius: 6,
                                    spreadRadius: 2,
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      );
                    },
                  ),
                ),
                const SizedBox(width: 12),
                BrandMark(brand: widget.to),
              ],
            ),
            const SizedBox(height: 24),
            Text(
              widget.title,
              style: SalacopeTypography.headingMedium.copyWith(color: colors.gray900),
              textAlign: TextAlign.center,
            ),
            if (widget.description != null) ...[
              const SizedBox(height: 6),
              Text(
                widget.description!,
                style: SalacopeTypography.bodySmall.copyWith(color: colors.gray500),
                textAlign: TextAlign.center,
              ),
            ],
          ],
        ),
      ),
    );
  }
}
