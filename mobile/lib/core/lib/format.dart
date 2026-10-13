import 'package:intl/intl.dart';

abstract final class SalacopeFormat {
  static final NumberFormat _xafFormat = NumberFormat('#,##0', 'fr_FR');
  static final NumberFormat _numberFormat = NumberFormat('#,##0', 'fr_FR');

  /// 12500 -> "12 500 FCFA"
  static String formatXaf(int amount) {
    return '${_xafFormat.format(amount)} FCFA';
  }

  /// 12500 -> "12 500"
  static String formatNumber(num value) {
    return _numberFormat.format(value);
  }

  /// "12 mars 2026"
  static String formatDate(String? isoString) {
    if (isoString == null || isoString.isEmpty) return '';
    try {
      final dt = DateTime.parse(isoString).toLocal();
      return DateFormat('d MMM y', 'fr_FR').format(dt);
    } catch (_) {
      return isoString;
    }
  }

  /// "12 mars 2026, 14:05"
  static String formatDateTime(String? isoString) {
    if (isoString == null || isoString.isEmpty) return '';
    try {
      final dt = DateTime.parse(isoString).toLocal();
      return DateFormat('d MMM y, HH:mm', 'fr_FR').format(dt);
    } catch (_) {
      return isoString;
    }
  }

  /// "mars 2026"
  static String formatMonthYear(String? isoString) {
    if (isoString == null || isoString.isEmpty) return '';
    try {
      final dt = DateTime.parse(isoString).toLocal();
      return DateFormat('MMMM y', 'fr_FR').format(dt);
    } catch (_) {
      return isoString;
    }
  }

  /// "il y a 3 heures", "hier", "à l'instant"
  static String formatRelative(String? isoString, [DateTime? now]) {
    if (isoString == null || isoString.isEmpty) return '';
    try {
      final dt = DateTime.parse(isoString).toLocal();
      final current = now ?? DateTime.now();
      final diff = current.difference(dt);

      if (diff.inSeconds.abs() < 60) return "à l'instant";
      if (diff.inMinutes.abs() < 60) {
        final m = diff.inMinutes;
        return m > 0 ? 'il y a $m min' : 'dans ${-m} min';
      }
      if (diff.inHours.abs() < 24) {
        final h = diff.inHours;
        return h > 0 ? 'il y a $h h' : 'dans ${-h} h';
      }
      if (diff.inDays.abs() < 30) {
        final d = diff.inDays;
        return d > 0 ? 'il y a $d j' : 'dans ${-d} j';
      }
      return formatDate(isoString);
    } catch (_) {
      return isoString;
    }
  }

  /// "Grace Ntsiba" -> "GN"
  static String getInitials(String name, [int max = 2]) {
    final parts = name.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty);
    final initials = parts.map((p) => p[0]).join();
    if (initials.length <= max) return initials.toUpperCase();
    return initials.substring(0, max).toUpperCase();
  }

  /// File size in bytes -> "820 Ko" / "2,4 Mo"
  static String formatFileSize(int bytes) {
    final mb = bytes / (1024 * 1024);
    if (mb < 1) {
      final kb = (bytes / 1024).round();
      return '${kb < 1 ? 1 : kb} Ko';
    }
    final formattedMb = mb.toStringAsFixed(1).replaceAll('.', ',');
    return '$formattedMb Mo';
  }

  /// Pluralization: "1 offre", "3 offres"
  static String plural(int count, String singular, [String? pluralForm]) {
    final p = pluralForm ?? '${singular}s';
    return '${formatNumber(count)} ${count > 1 ? p : singular}';
  }
}

String formatXaf(int amount) => SalacopeFormat.formatXaf(amount);
String formatNumber(num value) => SalacopeFormat.formatNumber(value);
String formatDate(String? isoString) => SalacopeFormat.formatDate(isoString);
String formatDateTime(String? isoString) => SalacopeFormat.formatDateTime(isoString);
String formatMonthYear(String? isoString) => SalacopeFormat.formatMonthYear(isoString);
String formatRelative(String? isoString, [DateTime? now]) => SalacopeFormat.formatRelative(isoString, now);
String getInitials(String name, [int max = 2]) => SalacopeFormat.getInitials(name, max);
String formatFileSize(int bytes) => SalacopeFormat.formatFileSize(bytes);
String plural(int count, String singular, [String? pluralForm]) => SalacopeFormat.plural(count, singular, pluralForm);

