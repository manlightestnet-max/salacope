import 'package:flutter/material.dart';

abstract final class SalacopeTypography {
  static const String fontSans = 'Geist';
  static const String fontSerif = 'Instrument Serif';

  // Base text style with tabular figures enabled for all numbers/amounts
  static const TextStyle _baseGeist = TextStyle(
    fontFamily: fontSans,
    fontFeatures: [FontFeature.tabularFigures()],
  );

  /// display: 38 (height 1.03, spacing -0.035em), 600 - Titre hero vitrine
  static final TextStyle display = _baseGeist.copyWith(
    fontSize: 38,
    height: 1.03,
    letterSpacing: 38 * -0.035,
    fontWeight: FontWeight.w600,
  );

  /// title: 20 (spacing -0.011em), 600 - Titre d'écran
  static final TextStyle title = _baseGeist.copyWith(
    fontSize: 20,
    letterSpacing: 20 * -0.011,
    fontWeight: FontWeight.w600,
  );

  /// headline: 18 (spacing -0.011em), 600 - Titre de fiche, prix mis en avant
  static final TextStyle headline = _baseGeist.copyWith(
    fontSize: 18,
    letterSpacing: 18 * -0.011,
    fontWeight: FontWeight.w600,
  );

  /// panelTitle: 15 (spacing -0.011em), 600 - Titre de Panel
  static final TextStyle panelTitle = _baseGeist.copyWith(
    fontSize: 15,
    letterSpacing: 15 * -0.011,
    fontWeight: FontWeight.w600,
  );

  /// body: 14, 400 - Texte courant
  static final TextStyle body = _baseGeist.copyWith(
    fontSize: 14,
    fontWeight: FontWeight.w400,
  );

  /// bodyStrong: 14, 600 - Titre de carte
  static final TextStyle bodyStrong = _baseGeist.copyWith(
    fontSize: 14,
    fontWeight: FontWeight.w600,
  );

  /// caption: 12.5, 400 - Vendeur sous une carte
  static final TextStyle caption = _baseGeist.copyWith(
    fontSize: 12.5,
    fontWeight: FontWeight.w400,
  );

  /// small: 12, 500 - Badges, fil d'Ariane de carte
  static final TextStyle small = _baseGeist.copyWith(
    fontSize: 12,
    fontWeight: FontWeight.w500,
  );

  /// overline: 11, 600 MAJUSCULES, espacement +0.06em - En-têtes de colonnes
  static final TextStyle overline = _baseGeist.copyWith(
    fontSize: 11,
    fontWeight: FontWeight.w600,
    letterSpacing: 11 * 0.06,
  );

  /// label: 13, 500 - Libellés de champs
  static final TextStyle label = _baseGeist.copyWith(
    fontSize: 13,
    fontWeight: FontWeight.w500,
  );

  /// Instrument Serif italic accent - Réservé à l'accent du hero ("créateurs du Congo")
  static const TextStyle accentSerif = TextStyle(
    fontFamily: fontSerif,
    fontStyle: FontStyle.italic,
    fontWeight: FontWeight.normal,
  );

  // --- Aliases for compatibility ---
  static TextStyle get displayLarge => display;
  static TextStyle get displayMedium => headline;
  static TextStyle get displaySmall => headline;
  static TextStyle get headingLarge => title;
  static TextStyle get headingMedium => panelTitle;
  static TextStyle get headingSmall => bodyStrong;
  static TextStyle get bodySmall => caption;
  static TextStyle get bodyMuted => body;
}
