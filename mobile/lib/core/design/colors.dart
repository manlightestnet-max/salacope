import 'package:flutter/material.dart';

/// Exact color palette from tokens.css for both Dark (Night, default) and Light modes.
@immutable
class SalacopeColors extends ThemeExtension<SalacopeColors> {
  final Color canvas;
  final Color surface;
  final Color gray50;
  final Color gray100;
  final Color gray200;
  final Color gray300;
  final Color gray400;
  final Color gray500;
  final Color gray600;
  final Color gray700;
  final Color gray800;
  final Color gray900;
  final Color gray950;

  final Color primary50;
  final Color primary100;
  final Color primary200;
  final Color primary300;
  final Color primary400;
  final Color primary500;
  final Color primary600;
  final Color primary700;
  final Color primary800;
  final Color primary900;
  final Color primary950;

  final Color accent;
  final Color onAccent;

  final Color emerald50;
  final Color emerald400;
  final Color emerald500;
  final Color emerald700;

  final Color amber50;
  final Color amber200;
  final Color amber500;
  final Color amber600;
  final Color amber800;
  final Color amber900;

  final Color red50;
  final Color red200;
  final Color red400;
  final Color red500;
  final Color red600;
  final Color red700;

  final Color blue50;
  final Color blue500;
  final Color blue700;

  const SalacopeColors({
    required this.canvas,
    required this.surface,
    required this.gray50,
    required this.gray100,
    required this.gray200,
    required this.gray300,
    required this.gray400,
    required this.gray500,
    required this.gray600,
    required this.gray700,
    required this.gray800,
    required this.gray900,
    required this.gray950,
    required this.primary50,
    required this.primary100,
    required this.primary200,
    required this.primary300,
    required this.primary400,
    required this.primary500,
    required this.primary600,
    required this.primary700,
    required this.primary800,
    required this.primary900,
    required this.primary950,
    required this.accent,
    required this.onAccent,
    required this.emerald50,
    required this.emerald400,
    required this.emerald500,
    required this.emerald700,
    required this.amber50,
    required this.amber200,
    required this.amber500,
    required this.amber600,
    required this.amber800,
    required this.amber900,
    required this.red50,
    required this.red200,
    required this.red400,
    required this.red500,
    required this.red600,
    required this.red700,
    required this.blue50,
    required this.blue500,
    required this.blue700,
  });

  Color get textPrimary => gray950;
  Color get textSecondary => gray700;
  Color get textMuted => gray500;
  Color get textTertiary => gray400;
  Color get canvasBorder => gray200;
  Color get canvasSubtle => gray50;
  Color get danger => red500;


  /// Dark mode (Night) - Default brand theme
  static const SalacopeColors dark = SalacopeColors(
    canvas:     Color(0xFF0B0B0C), // 11 11 12
    surface:    Color(0xFF131314), // 19 19 20
    gray50:     Color(0xFF161617), // 22 22 23
    gray100:    Color(0xFF1C1C1E), // 28 28 30
    gray200:    Color(0xFF2A2A2D), // 42 42 45
    gray300:    Color(0xFF3A3A3E), // 58 58 62
    gray400:    Color(0xFF6E6E75), // 110 110 117
    gray500:    Color(0xFF9B9BA2), // 155 155 162
    gray600:    Color(0xFFB8B8BE), // 184 184 190
    gray700:    Color(0xFFD4D4D8), // 212 212 216
    gray800:    Color(0xFFE8E8EA), // 232 232 234
    gray900:    Color(0xFFF4F4F5), // 244 244 245
    gray950:    Color(0xFFFAFAFA), // 250 250 250
    primary50:  Color(0xFF0A2A1F), // 10 42 31
    primary100: Color(0xFF0E3A2B), // 14 58 43
    primary200: Color(0xFF13503B), // 19 80 59
    primary300: Color(0xFF6EE7B7), // 110 231 183
    primary400: Color(0xFF34D399), // 52 211 153
    primary500: Color(0xFF10B981), // 16 185 129
    primary600: Color(0xFF059669), // 5 150 105 (logo green)
    primary700: Color(0xFF34D399), // 52 211 153 (prices in dark)
    primary800: Color(0xFF6EE7B7),
    primary900: Color(0xFFA7F3D0),
    primary950: Color(0xFFD1FAE5),
    accent:     Color(0xFF34D399), // 52 211 153
    onAccent:   Color(0xFF04130D), // 4 19 13
    emerald50:  Color(0xFF082A1F), // 8 42 31
    emerald400: Color(0xFF34D399),
    emerald500: Color(0xFF10B981),
    emerald700: Color(0xFF4ADE80), // 74 222 159
    amber50:    Color(0xFF2A1F07), // 42 31 7
    amber200:   Color(0xFF5C4311), // 92 67 17
    amber500:   Color(0xFFF59E0B), // 245 158 11
    amber600:   Color(0xFFFBBF24), // 251 191 36
    amber800:   Color(0xFFFCD34D), // 252 211 77
    amber900:   Color(0xFFFDE68A), // 253 230 138
    red50:      Color(0xFF2E1010), // 46 16 16
    red200:     Color(0xFF6B2323), // 107 35 35
    red400:     Color(0xFFF87171), // 248 113 113
    red500:     Color(0xFFEF4444), // 239 68 68
    red600:     Color(0xFFF87171), // 248 113 113
    red700:     Color(0xFFFCA5A5), // 252 165 165
    blue50:     Color(0xFF0C1D38), // 12 29 56
    blue500:    Color(0xFF60A5FA), // 96 165 250
    blue700:    Color(0xFF93C5FD), // 147 197 253
  );

  /// Light mode
  static const SalacopeColors light = SalacopeColors(
    canvas:     Color(0xFFF4F4F6), // 244 244 246
    surface:    Color(0xFFFFFFFF), // 255 255 255
    gray50:     Color(0xFFFAFAFA), // 250 250 250
    gray100:    Color(0xFFF4F4F5), // 244 244 245
    gray200:    Color(0xFFE4E4E7), // 228 228 231
    gray300:    Color(0xFFD4D4D8), // 212 212 216
    gray400:    Color(0xFFA1A1AA), // 161 161 170
    gray500:    Color(0xFF71717A), // 113 113 122
    gray600:    Color(0xFF52525B), // 82 82 91
    gray700:    Color(0xFF3F3F46), // 63 63 70
    gray800:    Color(0xFF27272A), // 39 39 42
    gray900:    Color(0xFF18181B), // 24 24 27
    gray950:    Color(0xFF09090B), // 9 9 11
    primary50:  Color(0xFFECFDF5), // 236 253 245
    primary100: Color(0xFFD1FAE5),
    primary200: Color(0xFFA7F3D0),
    primary300: Color(0xFF6EE7B7),
    primary400: Color(0xFF34D399),
    primary500: Color(0xFF10B981),
    primary600: Color(0xFF059669), // 5 150 105
    primary700: Color(0xFF047857), // 4 120 87 (prices in light)
    primary800: Color(0xFF065F46),
    primary900: Color(0xFF064E3B),
    primary950: Color(0xFF022C22),
    accent:     Color(0xFF047857), // 4 120 87
    onAccent:   Color(0xFFFFFFFF),
    emerald50:  Color(0xFFECFDF5),
    emerald400: Color(0xFF34D399),
    emerald500: Color(0xFF10B981),
    emerald700: Color(0xFF047857),
    amber50:    Color(0xFFFFFBEB),
    amber200:   Color(0xFFFDE68A),
    amber500:   Color(0xFFF59E0B),
    amber600:   Color(0xFFD97706),
    amber800:   Color(0xFF92400E),
    amber900:   Color(0xFF78350F),
    red50:      Color(0xFFFEF2F2),
    red200:     Color(0xFFFECACA),
    red400:     Color(0xFFF87171),
    red500:     Color(0xFFEF4444),
    red600:     Color(0xFFDC2626),
    red700:     Color(0xFFB91C1C),
    blue50:     Color(0xFFEFF6FF),
    blue500:    Color(0xFF3B82F6),
    blue700:    Color(0xFF1D4ED8),
  );

  @override
  SalacopeColors copyWith({
    Color? canvas,
    Color? surface,
    Color? gray50,
    Color? gray100,
    Color? gray200,
    Color? gray300,
    Color? gray400,
    Color? gray500,
    Color? gray600,
    Color? gray700,
    Color? gray800,
    Color? gray900,
    Color? gray950,
    Color? primary50,
    Color? primary100,
    Color? primary200,
    Color? primary300,
    Color? primary400,
    Color? primary500,
    Color? primary600,
    Color? primary700,
    Color? primary800,
    Color? primary900,
    Color? primary950,
    Color? accent,
    Color? onAccent,
    Color? emerald50,
    Color? emerald400,
    Color? emerald500,
    Color? emerald700,
    Color? amber50,
    Color? amber200,
    Color? amber500,
    Color? amber600,
    Color? amber800,
    Color? amber900,
    Color? red50,
    Color? red200,
    Color? red400,
    Color? red500,
    Color? red600,
    Color? red700,
    Color? blue50,
    Color? blue500,
    Color? blue700,
  }) {
    return SalacopeColors(
      canvas: canvas ?? this.canvas,
      surface: surface ?? this.surface,
      gray50: gray50 ?? this.gray50,
      gray100: gray100 ?? this.gray100,
      gray200: gray200 ?? this.gray200,
      gray300: gray300 ?? this.gray300,
      gray400: gray400 ?? this.gray400,
      gray500: gray500 ?? this.gray500,
      gray600: gray600 ?? this.gray600,
      gray700: gray700 ?? this.gray700,
      gray800: gray800 ?? this.gray800,
      gray900: gray900 ?? this.gray900,
      gray950: gray950 ?? this.gray950,
      primary50: primary50 ?? this.primary50,
      primary100: primary100 ?? this.primary100,
      primary200: primary200 ?? this.primary200,
      primary300: primary300 ?? this.primary300,
      primary400: primary400 ?? this.primary400,
      primary500: primary500 ?? this.primary500,
      primary600: primary600 ?? this.primary600,
      primary700: primary700 ?? this.primary700,
      primary800: primary800 ?? this.primary800,
      primary900: primary900 ?? this.primary900,
      primary950: primary950 ?? this.primary950,
      accent: accent ?? this.accent,
      onAccent: onAccent ?? this.onAccent,
      emerald50: emerald50 ?? this.emerald50,
      emerald400: emerald400 ?? this.emerald400,
      emerald500: emerald500 ?? this.emerald500,
      emerald700: emerald700 ?? this.emerald700,
      amber50: amber50 ?? this.amber50,
      amber200: amber200 ?? this.amber200,
      amber500: amber500 ?? this.amber500,
      amber600: amber600 ?? this.amber600,
      amber800: amber800 ?? this.amber800,
      amber900: amber900 ?? this.amber900,
      red50: red50 ?? this.red50,
      red200: red200 ?? this.red200,
      red400: red400 ?? this.red400,
      red500: red500 ?? this.red500,
      red600: red600 ?? this.red600,
      red700: red700 ?? this.red700,
      blue50: blue50 ?? this.blue50,
      blue500: blue500 ?? this.blue500,
      blue700: blue700 ?? this.blue700,
    );
  }

  @override
  SalacopeColors lerp(ThemeExtension<SalacopeColors>? other, double t) {
    if (other is! SalacopeColors) return this;
    return SalacopeColors(
      canvas: Color.lerp(canvas, other.canvas, t)!,
      surface: Color.lerp(surface, other.surface, t)!,
      gray50: Color.lerp(gray50, other.gray50, t)!,
      gray100: Color.lerp(gray100, other.gray100, t)!,
      gray200: Color.lerp(gray200, other.gray200, t)!,
      gray300: Color.lerp(gray300, other.gray300, t)!,
      gray400: Color.lerp(gray400, other.gray400, t)!,
      gray500: Color.lerp(gray500, other.gray500, t)!,
      gray600: Color.lerp(gray600, other.gray600, t)!,
      gray700: Color.lerp(gray700, other.gray700, t)!,
      gray800: Color.lerp(gray800, other.gray800, t)!,
      gray900: Color.lerp(gray900, other.gray900, t)!,
      gray950: Color.lerp(gray950, other.gray950, t)!,
      primary50: Color.lerp(primary50, other.primary50, t)!,
      primary100: Color.lerp(primary100, other.primary100, t)!,
      primary200: Color.lerp(primary200, other.primary200, t)!,
      primary300: Color.lerp(primary300, other.primary300, t)!,
      primary400: Color.lerp(primary400, other.primary400, t)!,
      primary500: Color.lerp(primary500, other.primary500, t)!,
      primary600: Color.lerp(primary600, other.primary600, t)!,
      primary700: Color.lerp(primary700, other.primary700, t)!,
      primary800: Color.lerp(primary800, other.primary800, t)!,
      primary900: Color.lerp(primary900, other.primary900, t)!,
      primary950: Color.lerp(primary950, other.primary950, t)!,
      accent: Color.lerp(accent, other.accent, t)!,
      onAccent: Color.lerp(onAccent, other.onAccent, t)!,
      emerald50: Color.lerp(emerald50, other.emerald50, t)!,
      emerald400: Color.lerp(emerald400, other.emerald400, t)!,
      emerald500: Color.lerp(emerald500, other.emerald500, t)!,
      emerald700: Color.lerp(emerald700, other.emerald700, t)!,
      amber50: Color.lerp(amber50, other.amber50, t)!,
      amber200: Color.lerp(amber200, other.amber200, t)!,
      amber500: Color.lerp(amber500, other.amber500, t)!,
      amber600: Color.lerp(amber600, other.amber600, t)!,
      amber800: Color.lerp(amber800, other.amber800, t)!,
      amber900: Color.lerp(amber900, other.amber900, t)!,
      red50: Color.lerp(red50, other.red50, t)!,
      red200: Color.lerp(red200, other.red200, t)!,
      red400: Color.lerp(red400, other.red400, t)!,
      red500: Color.lerp(red500, other.red500, t)!,
      red600: Color.lerp(red600, other.red600, t)!,
      red700: Color.lerp(red700, other.red700, t)!,
      blue50: Color.lerp(blue50, other.blue50, t)!,
      blue500: Color.lerp(blue500, other.blue500, t)!,
      blue700: Color.lerp(blue700, other.blue700, t)!,
    );
  }
}

/// Shorthand extension on BuildContext: `final c = context.colors;`
extension BuildContextColors on BuildContext {
  SalacopeColors get colors {
    return Theme.of(this).extension<SalacopeColors>() ?? SalacopeColors.dark;
  }
}
