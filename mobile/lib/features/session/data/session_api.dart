import 'package:flutter/foundation.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/auth.dart';
import '../../../core/api/guest.dart';
import '../../../core/api/sync.dart';
import '../../../core/api/domain_error.dart';
import '../../../core/db/store.dart';
import '../../../core/db/local_database.dart';
import '../../../core/push/push_service.dart';
import '../../../core/db/models/database.dart';

final sessionApi = SessionApi.instance;

class SessionApi {
  static final SessionApi instance = SessionApi._();
  SessionApi._();

  static bool isEmail(String email) =>
      RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(email.trim());

  /// One account for Salacope and LightPay (same sign-in).
  Future<void> signIn(String email, String password) async {
    if (!isEmail(email)) {
      throw DomainError('Adresse e-mail invalide.');
    }
    await auth.signIn(email, password);
    // Purchases made without an account join it.
    await api.request('POST', '/session', body: {});
    await guest.clear();
    await syncService.reload();
  }

  Future<void> signUp({
    required String name,
    required String email,
    required String password,
    String? phone,
  }) async {
    if (name.trim().isEmpty) {
      throw DomainError('Indiquez votre nom pour créer le compte.');
    }
    if (!isEmail(email)) {
      throw DomainError('Adresse e-mail invalide.');
    }
    if (password.length < 8) {
      throw DomainError('Mot de passe trop court : 8 caractères minimum.');
    }

    await auth.signUp(email, password);
    await api.request('POST', '/session', body: {
      'name': name.trim(),
      if (phone != null && phone.trim().isNotEmpty) 'phone': phone.trim(),
    });
    await guest.clear();
    await syncService.reload();
  }

  Future<void> resetPassword(String email) async {
    if (!isEmail(email)) {
      throw DomainError('Saisissez l’adresse e-mail du compte.');
    }
    await auth.resetPassword(email);
  }

  /// Google account chosen on the phone → the same Firebase account as on the web and LightPay.
  Future<void> signInWithGoogle() async {
    await auth.signInWithGoogle();
    // Purchases made without an account join it (and the account is created the first time).
    await api.request('POST', '/session', body: {});
    await guest.clear();
    await syncService.reload();
  }

  Future<void> signOut() async {
    // This phone stops receiving the account's notifications.
    await push.disable();
    await auth.signOut();
    await guest.clear();
    localDb.clearSession();
    db.load(Database.empty(), persist: false);
    try {
      await syncService.reload();
    } catch (e) {
      debugPrint('Sync boot after sign out: $e');
    }
  }

  Future<void> updateProfile({
    required String name,
    required String phone,
  }) async {
    if (name.trim().isEmpty) {
      throw DomainError('Le nom est obligatoire.');
    }
    await api.mutate('PATCH', '/me', body: {
      'name': name.trim(),
      'phone': phone.trim(),
    });
  }

  Future<void> activateMerchant({
    required String storeName,
    String? headline,
    String? city,
  }) async {
    if (storeName.trim().isEmpty) {
      throw DomainError('Le nom de la boutique est obligatoire.');
    }
    await api.mutate('POST', '/merchant', body: {
      'storeName': storeName.trim(),
      'headline': headline?.trim() ?? '',
      'city': city?.trim() ?? '',
    });
  }

  Future<void> updateMerchant({
    required String storeName,
    String? headline,
    String? city,
  }) async {
    if (storeName.trim().isEmpty) {
      throw DomainError('Le nom de la boutique est obligatoire.');
    }
    await api.mutate('PATCH', '/merchant', body: {
      'storeName': storeName.trim(),
      'headline': headline?.trim() ?? '',
      'city': city?.trim() ?? '',
    });
  }

  /// Private store: out of the catalogue, the storefront and the search; opened only by its own link.
  Future<void> setStorePrivate(bool isPrivate) async {
    await api.mutate('PUT', '/merchant/visibility', body: {'private': isPrivate});
  }

  /// Verified stores: their address salacope.online/@handle (null removes it).
  Future<void> setStoreHandle(String? handle) async {
    await api.mutate('PUT', '/merchant/handle', body: {'handle': handle});
  }

  Future<void> setStoreLogo(String? logo) async {
    await api.mutate('PUT', '/merchant/logo', body: {
      'logo': logo,
    });
  }

  Future<String> lightPayConnectUrl() async {
    final res = await api.request('POST', '/lightpay/connect', body: {});
    return res['url'] as String? ?? '';
  }

  Future<void> completeLightPayConnection(Map<String, String?> params) async {
    await api.mutate('POST', '/lightpay/callback', body: {
      'code': params['code'],
      'state': params['state'],
      'error': params['error'],
    });
  }
}
