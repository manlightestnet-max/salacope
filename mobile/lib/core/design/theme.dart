import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
export 'colors.dart';
import 'colors.dart';
import 'tokens.dart';
import 'typography.dart';

abstract final class SalacopeTheme {
  /// Dark Mode (Night, default brand experience)
  static ThemeData get darkTheme {
    const colors = SalacopeColors.dark;

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: colors.canvas,
      colorScheme: ColorScheme.dark(
        surface: colors.surface,
        primary: colors.accent,
        onPrimary: colors.onAccent,
        secondary: colors.gray700,
        error: colors.red500,
        outline: colors.gray200,
      ),
      extensions: const [colors],
      splashFactory: InkRipple.splashFactory,
      splashColor: colors.accent.withValues(alpha: 0.12),
      highlightColor: colors.accent.withValues(alpha: 0.06),
      fontFamily: SalacopeTypography.fontSans,
      appBarTheme: AppBarTheme(
        backgroundColor: colors.canvas,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        centerTitle: false,
        systemOverlayStyle: SystemUiOverlayStyle(
          statusBarColor: Colors.transparent,
          statusBarIconBrightness: Brightness.light,
          statusBarBrightness: Brightness.dark,
          systemNavigationBarColor: colors.canvas,
          systemNavigationBarIconBrightness: Brightness.light,
        ),
        titleTextStyle: SalacopeTypography.headingMedium.copyWith(color: colors.gray950),
        iconTheme: IconThemeData(
          color: colors.gray950,
          size: 20,
        ),
      ),
      dividerTheme: DividerThemeData(
        color: colors.gray200,
        thickness: 1,
        space: 1,
      ),
      cardTheme: CardThemeData(
        color: colors.surface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          side: BorderSide(color: colors.gray200),
          borderRadius: SalacopeTokens.borderLg,
        ),
      ),
    );
  }

  /// Light Mode
  static ThemeData get lightTheme {
    const colors = SalacopeColors.light;

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      scaffoldBackgroundColor: colors.canvas,
      colorScheme: ColorScheme.light(
        surface: colors.surface,
        primary: colors.accent,
        onPrimary: colors.onAccent,
        secondary: colors.gray700,
        error: colors.red500,
        outline: colors.gray200,
      ),
      extensions: const [colors],
      splashFactory: InkRipple.splashFactory,
      splashColor: colors.accent.withValues(alpha: 0.12),
      highlightColor: colors.accent.withValues(alpha: 0.06),
      fontFamily: SalacopeTypography.fontSans,
      appBarTheme: AppBarTheme(
        backgroundColor: colors.canvas,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        centerTitle: false,
        systemOverlayStyle: SystemUiOverlayStyle(
          statusBarColor: Colors.transparent,
          statusBarIconBrightness: Brightness.dark,
          statusBarBrightness: Brightness.light,
          systemNavigationBarColor: colors.canvas,
          systemNavigationBarIconBrightness: Brightness.dark,
        ),
        titleTextStyle: SalacopeTypography.headingMedium.copyWith(color: colors.gray950),
        iconTheme: IconThemeData(
          color: colors.gray950,
          size: 20,
        ),
      ),
      dividerTheme: DividerThemeData(
        color: colors.gray200,
        thickness: 1,
        space: 1,
      ),
      cardTheme: CardThemeData(
        color: colors.surface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          side: BorderSide(color: colors.gray200),
          borderRadius: SalacopeTokens.borderLg,
        ),
      ),
    );
  }
}
