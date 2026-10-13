import 'package:shared_preferences/shared_preferences.dart';

class GuestManager {
  static const String _key = 'salacope.guest';

  String? _guestKey;
  bool _initialized = false;

  Future<void> init() async {
    if (_initialized) return;
    final prefs = await SharedPreferences.getInstance();
    _guestKey = prefs.getString(_key);
    _initialized = true;
  }

  String? key() => _guestKey;

  Future<void> save(String newKey) async {
    _guestKey = newKey;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_key, newKey);
  }

  Future<void> clear() async {
    _guestKey = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_key);
  }
}

final guest = GuestManager();
