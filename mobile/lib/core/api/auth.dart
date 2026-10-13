import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter/services.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:google_sign_in/google_sign_in.dart';
import '../config/env.dart';
import 'domain_error.dart';

/// Firebase accounts (same project as LightPay: one account for both), over REST API.
class AuthCredentials {
  final String uid;
  final String email;
  final String idToken;
  final String refreshToken;
  final int expiresAt; // ms epoch

  const AuthCredentials({
    required this.uid,
    required this.email,
    required this.idToken,
    required this.refreshToken,
    required this.expiresAt,
  });

  factory AuthCredentials.fromJson(Map<String, dynamic> json) {
    return AuthCredentials(
      uid: json['uid'] as String? ?? '',
      email: json['email'] as String? ?? '',
      idToken: json['idToken'] as String? ?? '',
      refreshToken: json['refreshToken'] as String? ?? '',
      expiresAt: (json['expiresAt'] as num?)?.toInt() ?? 0,
    );
  }

  Map<String, dynamic> toJson() => {
    'uid': uid,
    'email': email,
    'idToken': idToken,
    'refreshToken': refreshToken,
    'expiresAt': expiresAt,
  };
}

class AuthService {
  static const String apiKey = 'AIzaSyAyOdD8qSUfx8wvHhb5F4EJ4zKjavwnpeI';
  static const String _storageKey = 'salacope.auth';

  final FlutterSecureStorage _storage = const FlutterSecureStorage();
  final Dio _dio = Dio(BaseOptions(connectTimeout: const Duration(seconds: 20), receiveTimeout: const Duration(seconds: 20)));
  final GoogleSignIn _google = GoogleSignIn(
    serverClientId: Env.googleServerClientId.isNotEmpty ? Env.googleServerClientId : null,
    scopes: const ['email', 'profile'],
  );

  AuthCredentials? _current;
  bool _initialized = false;

  static const Map<String, String> _messages = {
    'EMAIL_EXISTS': 'Un compte existe déjà avec cet e-mail : connectez-vous.',
    'EMAIL_NOT_FOUND': 'E-mail ou mot de passe incorrect.',
    'INVALID_PASSWORD': 'E-mail ou mot de passe incorrect.',
    'INVALID_LOGIN_CREDENTIALS': 'E-mail ou mot de passe incorrect.',
    'INVALID_EMAIL': 'Adresse e-mail invalide.',
    'MISSING_PASSWORD': 'Saisissez votre mot de passe.',
    'WEAK_PASSWORD': 'Mot de passe trop court : 6 caractères minimum.',
    'TOO_MANY_ATTEMPTS_TRY_LATER': 'Trop de tentatives. Réessayez dans quelques minutes.',
    'USER_DISABLED': 'Ce compte est désactivé.',
    'TOKEN_EXPIRED': 'Session expirée : reconnectez-vous.',
    'INVALID_REFRESH_TOKEN': 'Session expirée : reconnectez-vous.',
  };

  Future<void> init() async {
    if (_initialized) return;
    try {
      final raw = await _storage.read(key: _storageKey);
      if (raw != null) {
        _current = AuthCredentials.fromJson(jsonDecode(raw) as Map<String, dynamic>);
      }
    } catch (_) {
      _current = null;
    }
    _initialized = true;
  }

  bool signedIn() => _current != null;
  String? email() => _current?.email;
  String? uid() => _current?.uid;

  Future<void> _save(AuthCredentials? creds) async {
    _current = creds;
    if (creds != null) {
      await _storage.write(key: _storageKey, value: jsonEncode(creds.toJson()));
    } else {
      await _storage.delete(key: _storageKey);
    }
  }

  Future<Map<String, dynamic>> _post(
    String url,
    dynamic data, {
    String contentType = 'application/json',
  }) async {
    try {
      final res = await _dio.post(
        url,
        data: data,
        options: Options(headers: {'Content-Type': contentType}),
      );
      return res.data as Map<String, dynamic>;
    } on DioException catch (e) {
      if (e.response != null && e.response?.data is Map) {
        final errObj = (e.response!.data as Map)['error'];
        final msg = errObj is Map ? (errObj['message'] as String? ?? '') : errObj.toString();
        final code = msg.split(' ').first;
        throw DomainError(
          _messages[code] ?? 'Connexion impossible pour le moment.',
          e.response?.statusCode,
        );
      }
      throw DomainError('Pas de connexion internet.');
    } catch (e) {
      if (e is DomainError) rethrow;
      throw DomainError('Pas de connexion internet.');
    }
  }

  Future<Map<String, dynamic>> _identity(String path, Map<String, dynamic> body) {
    return _post(
      'https://identitytoolkit.googleapis.com/v1/$path?key=$apiKey',
      body,
    );
  }

  AuthCredentials _fromSignIn(Map<String, dynamic> d) {
    return AuthCredentials(
      uid: d['localId'] as String? ?? '',
      email: (d['email'] as String? ?? '').toLowerCase(),
      idToken: d['idToken'] as String? ?? '',
      refreshToken: d['refreshToken'] as String? ?? '',
      expiresAt: DateTime.now().millisecondsSinceEpoch +
          (int.tryParse(d['expiresIn']?.toString() ?? '3600') ?? 3600) * 1000,
    );
  }

  Future<void> signIn(String email, String password) async {
    final res = await _identity('accounts:signInWithPassword', {
      'email': email.trim(),
      'password': password,
      'returnSecureToken': true,
    });
    await _save(_fromSignIn(res));
  }

  Future<void> signUp(String email, String password) async {
    final res = await _identity('accounts:signUp', {
      'email': email.trim(),
      'password': password,
      'returnSecureToken': true,
    });
    await _save(_fromSignIn(res));
  }

  Future<void> resetPassword(String email) async {
    await _identity('accounts:sendOobCode', {
      'requestType': 'PASSWORD_RESET',
      'email': email.trim(),
    });
  }

  /// Google account chosen on the phone (the account sheet opens every time) → Firebase account, same as LightPay.
  Future<void> signInWithGoogle() async {
    String idToken;
    try {
      try {
        await _google.signOut();
      } catch (_) {}
      final account = await _google.signIn();
      if (account == null) throw DomainError('Connexion Google annulée.');
      final token = (await account.authentication).idToken;
      if (token == null) throw DomainError('Google n’a pas confirmé la connexion. Réessayez.');
      idToken = token;
    } on PlatformException catch (e) {
      throw DomainError(switch (e.code) {
        'sign_in_canceled' => 'Connexion Google annulée.',
        'network_error' => 'Pas de connexion internet. Réessayez.',
        _ => 'Connexion Google impossible (${e.code}). Réessayez.',
      });
    }
    final res = await _identity('accounts:signInWithIdp', {
      'postBody': 'id_token=$idToken&providerId=google.com',
      'requestUri': 'http://localhost',
      'returnIdpCredential': true,
      'returnSecureToken': true,
    });
    await _save(_fromSignIn(res));
  }

  Future<void> signOut() async {
    await _save(null);
    try {
      await _google.signOut();
    } catch (_) {}
  }

  /// A valid ID token (refreshed a few minutes before expiry), or null when signed out.
  Future<String?> idToken() async {
    if (!_initialized) await init();
    if (_current == null) return null;

    final now = DateTime.now().millisecondsSinceEpoch;
    if (_current!.expiresAt - now > 5 * 60 * 1000) {
      return _current!.idToken;
    }

    try {
      final res = await _post(
        'https://securetoken.googleapis.com/v1/token?key=$apiKey',
        'grant_type=refresh_token&refresh_token=${Uri.encodeComponent(_current!.refreshToken)}',
        contentType: 'application/x-www-form-urlencoded',
      );

      final next = AuthCredentials(
        uid: _current!.uid,
        email: _current!.email,
        idToken: res['id_token'] as String,
        refreshToken: res['refresh_token'] as String,
        expiresAt: DateTime.now().millisecondsSinceEpoch +
            (int.tryParse(res['expires_in']?.toString() ?? '3600') ?? 3600) * 1000,
      );
      await _save(next);
      return next.idToken;
    } on DomainError catch (err) {
      if (err.status == 400) {
        await _save(null);
        rethrow;
      }
      // If offline or network unreachable, fallback to existing token
      if (err.status == null) {
        return _current?.idToken;
      }
      rethrow;
    }
  }
}

final auth = AuthService();
