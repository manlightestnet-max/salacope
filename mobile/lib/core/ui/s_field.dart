import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../design/colors.dart';
import '../design/tokens.dart';
import '../design/typography.dart';

class SField extends StatelessWidget {
  final String? label;
  final String? hint;
  final String? error;
  final bool optional;
  final Widget? action;
  final TextEditingController? controller;
  final ValueChanged<String>? onChanged;
  final TextInputType keyboardType;
  final bool obscureText;
  final Widget? leading;
  final Widget? trailing;
  final int maxLines;
  final bool enabled;
  final String? placeholder;
  final Widget? child;

  const SField({
    super.key,
    this.label,
    this.hint,
    this.error,
    this.optional = false,
    this.action,
    this.controller,
    this.onChanged,
    this.keyboardType = TextInputType.text,
    this.obscureText = false,
    this.leading,
    this.trailing,
    this.maxLines = 1,
    this.enabled = true,
    this.placeholder,
    this.child,
  });

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final hasError = error != null && error!.isNotEmpty;

    if (child != null) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          if (label != null) ...[
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  label!,
                  style: SalacopeTypography.label.copyWith(
                    fontWeight: FontWeight.w600,
                    color: colors.gray800,
                  ),
                ),
                if (optional)
                  Text(
                    'Facultatif',
                    style: SalacopeTypography.caption.copyWith(color: colors.gray400),
                  )
                else
                  ?action,
              ],
            ),
            const SizedBox(height: 6),
          ],
          child!,
          if (hasError) ...[
            const SizedBox(height: 5),
            Text(
              error!,
              style: SalacopeTypography.caption.copyWith(color: colors.red600),
            ),
          ] else if (hint != null) ...[
            const SizedBox(height: 5),
            Text(
              hint!,
              style: SalacopeTypography.caption.copyWith(color: colors.gray500),
            ),
          ],
        ],
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        if (label != null) ...[
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                label!,
                style: SalacopeTypography.label.copyWith(
                  fontWeight: FontWeight.w600,
                  color: colors.gray800,
                ),
              ),
              if (optional)
                Text(
                  'Facultatif',
                  style: SalacopeTypography.caption.copyWith(color: colors.gray400),
                )
              else
                ?action,
            ],
          ),
          const SizedBox(height: 6),
        ],
        Container(
          decoration: BoxDecoration(
            color: enabled ? colors.surface : colors.gray50,
            borderRadius: SalacopeTokens.borderMd,
            border: Border.all(
              color: hasError
                  ? colors.red500
                  : colors.gray300,
              width: hasError ? 1.5 : 1.0,
            ),
          ),
          child: Row(
            children: [
              if (leading != null) ...[
                Padding(
                  padding: const EdgeInsets.only(left: 12),
                  child: leading,
                ),
              ],
              Expanded(
                child: TextField(
                  controller: controller,
                  onChanged: onChanged,
                  keyboardType: keyboardType,
                  obscureText: obscureText,
                  maxLines: maxLines,
                  enabled: enabled,
                  style: TextStyle(
                    fontFamily: SalacopeTypography.fontSans,
                    fontSize: 14,
                    color: enabled ? colors.gray900 : colors.gray500,
                  ),
                  decoration: InputDecoration(
                    hintText: placeholder,
                    hintStyle: TextStyle(
                      fontFamily: SalacopeTypography.fontSans,
                      fontSize: 14,
                      color: colors.gray400,
                    ),
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 10,
                    ),
                    border: InputBorder.none,
                    isDense: true,
                  ),
                ),
              ),
              if (trailing != null) ...[
                Padding(
                  padding: const EdgeInsets.only(right: 12),
                  child: trailing,
                ),
              ],
            ],
          ),
        ),
        if (hasError) ...[
          const SizedBox(height: 5),
          Text(
            error!,
            style: SalacopeTypography.caption.copyWith(color: colors.red600),
          ),
        ] else if (hint != null) ...[
          const SizedBox(height: 5),
          Text(
            hint!,
            style: SalacopeTypography.caption.copyWith(color: colors.gray500),
          ),
        ],
      ],
    );
  }
}

class SSearchField extends StatelessWidget {
  final TextEditingController? controller;
  final ValueChanged<String>? onChanged;
  final VoidCallback? onSubmitted;
  final VoidCallback? onClear;
  final String placeholder;

  const SSearchField({
    super.key,
    this.controller,
    this.onChanged,
    this.onSubmitted,
    this.onClear,
    this.placeholder = 'Rechercher une offre, un vendeur…',
  });

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;

    return Container(
      height: 42,
      decoration: BoxDecoration(
        color: colors.surface,
        borderRadius: SalacopeTokens.borderMd,
        border: Border.all(color: colors.gray200, width: 1),
      ),
      child: TextField(
        controller: controller,
        onChanged: onChanged,
        onSubmitted: (_) => onSubmitted?.call(),
        style: TextStyle(
          fontFamily: SalacopeTypography.fontSans,
          fontSize: 13.5,
          color: colors.gray900,
        ),
        decoration: InputDecoration(
          prefixIcon: Icon(
            LucideIcons.search,
            size: 16,
            color: colors.gray400,
          ),
          suffixIcon: controller != null && controller!.text.isNotEmpty
              ? IconButton(
                  icon: Icon(LucideIcons.x, size: 14, color: colors.gray400),
                  onPressed: () {
                    controller!.clear();
                    onClear?.call();
                    onChanged?.call('');
                  },
                )
              : null,
          hintText: placeholder,
          hintStyle: TextStyle(
            fontFamily: SalacopeTypography.fontSans,
            fontSize: 13.5,
            color: colors.gray400,
          ),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 11),
          isDense: true,
        ),
      ),
    );
  }
}
