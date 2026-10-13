import 'package:flutter/material.dart';
import '../design/colors.dart';
import '../design/tokens.dart';
import '../design/typography.dart';
import 'package:salacope/core/lib/format.dart';
import 's_image.dart';

enum SAvatarSize {
  sm, // 24x24
  md, // 32x32
  lg, // 40x40
  xl, // 56x56
  xxl, // 88x88
}

class SAvatar extends StatelessWidget {
  final String name;
  final String? src;
  final SAvatarSize size;

  const SAvatar({
    super.key,
    required this.name,
    this.src,
    this.size = SAvatarSize.md,
  });

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;

    final double dimension = switch (size) {
      SAvatarSize.sm => 24.0,
      SAvatarSize.md => 32.0,
      SAvatarSize.lg => 40.0,
      SAvatarSize.xl => 56.0,
      SAvatarSize.xxl => 88.0,
    };

    final double fontSize = switch (size) {
      SAvatarSize.sm => 10.0,
      SAvatarSize.md => 12.0,
      SAvatarSize.lg => 14.0,
      SAvatarSize.xl => 18.0,
      SAvatarSize.xxl => 28.0,
    };

    if (src != null && src!.isNotEmpty) {
      return SizedBox(
        width: dimension,
        height: dimension,
        child: ClipRRect(
          borderRadius: SalacopeTokens.borderFull,
          child: SImage(
            url: src,
            width: dimension,
            height: dimension,
            fit: BoxFit.cover,
            placeholder: Container(color: colors.gray200),
            errorWidget: _buildInitials(colors, dimension, fontSize),
          ),
        ),
      );
    }

    return _buildInitials(colors, dimension, fontSize);
  }

  Widget _buildInitials(SalacopeColors colors, double dimension, double fontSize) {
    return Container(
      width: dimension,
      height: dimension,
      decoration: BoxDecoration(
        color: colors.gray200,
        shape: BoxShape.circle,
      ),
      child: Center(
        child: Text(
          SalacopeFormat.getInitials(name),
          style: TextStyle(
            fontFamily: SalacopeTypography.fontSans,
            fontSize: fontSize,
            fontWeight: FontWeight.w600,
            color: colors.gray700,
          ),
        ),
      ),
    );
  }
}
