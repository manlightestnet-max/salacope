import 'dart:async';
import 'package:flutter/material.dart';
import '../design/colors.dart';
import '../design/tokens.dart';
import '../design/typography.dart';

enum SButtonVariant {
  primary,
  secondary,
  ghost,
  danger,
  destructive, // Alias for danger
}

enum SButtonSize {
  sm(36.0, 12.0, EdgeInsets.symmetric(horizontal: 12)),
  md(44.0, 13.5, EdgeInsets.symmetric(horizontal: 16)),
  lg(48.0, 15.0, EdgeInsets.symmetric(horizontal: 20)),
  xl(52.0, 16.0, EdgeInsets.symmetric(horizontal: 24));

  final double height;
  final double fontSize;
  final EdgeInsets padding;
  const SButtonSize(this.height, this.fontSize, this.padding);

  // Backward-compatibility aliases
  static const SButtonSize small = sm;
  static const SButtonSize medium = md;
  static const SButtonSize large = lg;
  static const SButtonSize xlarge = xl;
}

class SButton extends StatefulWidget {
  final String label;
  final FutureOr<void> Function()? onPressed;
  final SButtonVariant variant;
  final SButtonSize size;
  final Widget? icon;
  final bool isLoading;
  final bool isFullWidth;
  final bool pill;

  const SButton({
    super.key,
    required this.label,
    this.onPressed,
    this.variant = SButtonVariant.primary,
    this.size = SButtonSize.md,
    this.icon,
    bool isLoading = false,
    bool? loading,
    this.isFullWidth = false,
    this.pill = false,
  }) : isLoading = loading ?? isLoading;

  @override
  State<SButton> createState() => _SButtonState();
}

class _SButtonState extends State<SButton> {
  bool _internalLoading = false;

  Future<void> _handlePress() async {
    if (widget.onPressed == null || widget.isLoading || _internalLoading) return;

    final result = widget.onPressed!();
    if (result is Future) {
      setState(() => _internalLoading = true);
      try {
        await result;
      } finally {
        if (mounted) setState(() => _internalLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final loading = widget.isLoading || _internalLoading;
    final disabled = widget.onPressed == null || loading;

    Color backgroundColor;
    Color textColor;
    BorderSide borderSide = BorderSide.none;

    final isDanger = widget.variant == SButtonVariant.danger || widget.variant == SButtonVariant.destructive;

    if (isDanger) {
      backgroundColor = disabled ? colors.gray200 : colors.surface;
      textColor = disabled ? colors.gray400 : colors.red600;
      borderSide = BorderSide(color: colors.red500.withValues(alpha: 0.3), width: 1);
    } else {
      switch (widget.variant) {
        case SButtonVariant.primary:
          backgroundColor = disabled ? colors.gray200 : colors.accent;
          textColor = disabled ? colors.gray500 : colors.onAccent;
          break;

        case SButtonVariant.secondary:
          backgroundColor = colors.surface;
          textColor = disabled ? colors.gray400 : colors.gray800;
          borderSide = BorderSide(color: colors.gray300, width: 1);
          break;

        case SButtonVariant.ghost:
          backgroundColor = Colors.transparent;
          textColor = disabled ? colors.gray400 : colors.gray700;
          break;

        default:
          backgroundColor = colors.accent;
          textColor = colors.onAccent;
      }
    }

    final borderRadius = widget.pill ? SalacopeTokens.borderFull : SalacopeTokens.borderMd;

    Widget content = Row(
      mainAxisSize: widget.isFullWidth ? MainAxisSize.max : MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        if (loading) ...[
          SizedBox(
            width: widget.size.fontSize + 2,
            height: widget.size.fontSize + 2,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              valueColor: AlwaysStoppedAnimation<Color>(textColor),
            ),
          ),
          const SizedBox(width: 8),
        ] else if (widget.icon != null) ...[
          widget.icon!,
          const SizedBox(width: 8),
        ],
        Text(
          widget.label,
          style: TextStyle(
            fontFamily: SalacopeTypography.fontSans,
            fontSize: widget.size.fontSize,
            fontWeight: FontWeight.w600,
            color: textColor,
          ),
        ),
      ],
    );

    return SizedBox(
      height: widget.size.height,
      width: widget.isFullWidth ? double.infinity : null,
      child: Material(
        color: backgroundColor,
        shape: RoundedRectangleBorder(
          borderRadius: borderRadius,
          side: borderSide,
        ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: disabled ? null : _handlePress,
          splashColor: Colors.white.withValues(alpha: 0.08),
          highlightColor: Colors.white.withValues(alpha: 0.04),
          child: Padding(
            padding: widget.size.padding,
            child: Center(
              widthFactor: widget.isFullWidth ? null : 1.0,
              child: content,
            ),
          ),
        ),
      ),
    );
  }
}
