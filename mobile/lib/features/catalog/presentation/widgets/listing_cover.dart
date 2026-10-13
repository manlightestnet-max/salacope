import 'package:flutter/material.dart';
import '../../../../core/design/tokens.dart';
import '../../../../core/design/theme.dart';
import '../../../../core/ui/s_image.dart';
import '../../domain/catalog_model.dart';

class ListingCover extends StatelessWidget {
  final String src;
  final String category;
  final double? customAspectRatio;
  final Widget? overlay;
  final BorderRadius? borderRadius;
  final bool bare;

  const ListingCover({
    super.key,
    required this.src,
    required this.category,
    this.customAspectRatio,
    this.overlay,
    this.borderRadius,
    this.bare = false,
  });

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final ratio = customAspectRatio ?? CoverFormat.forCategory(category).aspectRatio;
    final radius = borderRadius ?? BorderRadius.circular(SalacopeTokens.radiusLg);

    return AspectRatio(
      aspectRatio: ratio,
      child: Container(
        decoration: BoxDecoration(
          borderRadius: radius,
          border: bare ? null : Border.all(color: colors.canvasBorder, width: 0.8),
          color: colors.canvasSubtle,
        ),
        clipBehavior: Clip.antiAlias,
        child: Stack(
          fit: StackFit.expand,
          children: [
            SImage(
              url: src,
              fit: BoxFit.cover,
              targetWidth: customAspectRatio != null ? 480 : 240,
            ),
            ?overlay,
          ],
        ),
      ),
    );
  }
}
