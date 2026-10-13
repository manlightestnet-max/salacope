import 'package:shared_preferences/shared_preferences.dart';

/// The last things searched for, newest first, kept on the phone.
class SearchHistory {
  static const String _key = 'search_history';
  static const int _max = 8;

  Future<List<String>> load() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return prefs.getStringList(_key) ?? const [];
    } catch (_) {
      return const [];
    }
  }

  /// Puts [text] first (once), dropping the oldest beyond the limit.
  Future<List<String>> add(String text) async {
    final term = text.trim();
    if (term.length < 2) return load();
    final list = [
      term,
      ...(await load()).where((t) => t.toLowerCase() != term.toLowerCase()),
    ].take(_max).toList();
    return _save(list);
  }

  Future<List<String>> remove(String text) async =>
      _save((await load()).where((t) => t != text).toList());

  Future<List<String>> clear() => _save(const []);

  Future<List<String>> _save(List<String> list) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setStringList(_key, list);
    } catch (_) {
      // Without storage the history just is not kept.
    }
    return list;
  }
}

final searchHistory = SearchHistory();
