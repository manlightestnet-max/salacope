import 'package:flutter/material.dart';
import '../../../../core/design/colors.dart';
import '../../domain/catalog_model.dart';
import '../../../../core/ui/s_image.dart';

/// The offer as a tiny product in its own shape (a book stands up with its spine, a service lies wide), centred in a
/// fixed square slot, like the web's `MiniCover`: purchases, sales, conversations, the payment sheet.
/// [muted]: a cancelled order, in grey and faded (nothing in colour).
class MiniCover extends StatelessWidget {
  final String src;
  final String category;
  final double size;
  final bool muted;

  const MiniCover({super.key, required this.src, required this.category, this.size = 48, this.muted = false});

  static const ColorFilter _grey = ColorFilter.matrix(<double>[
    0.2126, 0.7152, 0.0722, 0, 0, //
    0.2126, 0.7152, 0.0722, 0, 0,
    0.2126, 0.7152, 0.0722, 0, 0,
    0, 0, 0, 1, 0,
  ]);

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final format = CoverFormat.forCategory(category);
    final ratio = format.aspectRatio;
    final book = format == CoverFormat.portrait;
    final w = ratio >= 1 ? size : size * ratio;
    final h = ratio >= 1 ? size / ratio : size;
    final radius = book
        ? const BorderRadius.only(topRight: Radius.circular(6), bottomRight: Radius.circular(6), topLeft: Radius.circular(2), bottomLeft: Radius.circular(2))
        : BorderRadius.circular(size >= 48 ? 8 : 6);

    Widget cover = Container(
      width: w,
      height: h,
      decoration: BoxDecoration(
        color: colors.gray100,
        borderRadius: radius,
        border: Border.all(color: colors.gray950.withValues(alpha: 0.08), width: 0.8),
      ),
      clipBehavior: Clip.antiAlias,
      child: Stack(
        fit: StackFit.expand,
        children: [
          SImage(url: src, fit: BoxFit.cover, targetWidth: (size * 3).round()),
          if (book) Positioned(left: 0, top: 0, bottom: 0, width: 3, child: ColoredBox(color: Colors.black.withValues(alpha: 0.25))),
        ],
      ),
    );
    if (muted) cover = Opacity(opacity: 0.55, child: ColorFiltered(colorFilter: _grey, child: cover));

    return SizedBox(width: size, height: size, child: Center(child: cover));
  }
}
