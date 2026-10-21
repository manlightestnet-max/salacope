import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// A choice the app keeps on the phone (a tab, a filter): coming back shows it as it was left, like the web's
/// `useRememberedParam`. Read at once from memory, saved in the background.
class Remembered extends ValueNotifier<String> {
  final String key;
  final List<String> allowed;

  Remembered._(this.key, this.allowed, String initial) : super(initial) {
    SharedPreferences.getInstance().then((p) {
      final saved = p.getString('salacope.choice.$key');
      if (saved != null && allowed.contains(saved) && saved != value) super.value = saved;
    }).catchError((_) {});
  }

  static final Map<String, Remembered> _all = {};

  /// One per [key] for the whole app (the same choice on every screen that shows it).
  factory Remembered(String key, List<String> allowed, String initial) =>
      _all.putIfAbsent(key, () => Remembered._(key, allowed, initial));

  @override
  set value(String next) {
    if (!allowed.contains(next) || next == value) return;
    super.value = next;
    SharedPreferences.getInstance().then((p) => p.setString('salacope.choice.$key', next)).catchError((_) => false);
  }
}
