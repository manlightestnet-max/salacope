import 'dart:convert';
import '../config/env.dart';
import 'package:dio/dio.dart';
import 'auth.dart';
import 'guest.dart';
import 'domain_error.dart';
import '../db/store.dart';
import '../db/local_database.dart';

class ApiClient {
  final String baseUrl;
  final Dio _dio;

  // Slow networks are common: the first load (whole catalogue) may take a while, nothing is cut too early.
  ApiClient({this.baseUrl = Env.apiBaseUrl})
      : _dio = Dio(BaseOptions(
          baseUrl: baseUrl,
          connectTimeout: const Duration(seconds: 20),
          receiveTimeout: const Duration(seconds: 40),
        ));

  /// Calls the Salacope API as the signed-in person (or this app's guest profile).
  Future<dynamic> request(
    String method,
    String path, {
    dynamic body,
  }) async {
    final token = await auth.idToken();
    final guestKey = guest.key();

    final headers = <String, dynamic>{};
    if (body != null) headers['Content-Type'] = 'application/json';
    if (token != null) headers['Authorization'] = 'Bearer $token';
    if (guestKey != null) headers['X-Salacope-Guest'] = guestKey;

    try {
      final res = await _dio.request(
        path,
        data: body != null ? (body is String ? body : jsonEncode(body)) : null,
        options: Options(
          method: method,
          headers: headers,
        ),
      );
      return res.data;
    } on DioException catch (e) {
      if (e.response != null) {
        final data = e.response?.data;
        String errorMessage = 'Erreur du serveur. Réessayez dans un instant.';
        if (data is Map && data['error'] != null) {
          errorMessage = data['error'].toString();
        }
        throw DomainError(errorMessage, e.response?.statusCode);
      }
      throw const DomainError('Pas de connexion internet. Réessayez.');
    } catch (e) {
      if (e is DomainError) rethrow;
      throw const DomainError('Pas de connexion internet. Réessayez.');
    }
  }
  /// A write mutation: the server answers with the rows that changed, applied to the local store.
  Future<dynamic> mutate(
    String method,
    String path, {
    dynamic body,
  }) async {
    try {
      final result = await request(method, path, body: body);
      if (result is Map<String, dynamic>) {
        final patch = result['patch'] as Map<String, dynamic>?;
        final rawRemoved = result['removed'] as Map<String, dynamic>?;
        final removed = rawRemoved?.map((k, v) => MapEntry(k, (v as List).cast<String>()));

        if (patch != null || removed != null) {
          db.apply(patch: patch, removed: removed, persist: true);
        }
      }
      return result;
    } on DomainError catch (e) {
      final isNetworkError = e.status == null;
      // Only what is harmless to send later waits for the network (a message, a favourite, a follow, a read receipt).
      // Anything that moves money or changes an order (accept, deliver, cancel, dispute, payment…) is never queued:
      // the person sees the error and decides again.
      final queueable = RegExp(r'^/(orders/[^/]+/(messages|read)|favorites/[^/]+|follows/[^/]+(/seen)?)$').hasMatch(path);

      if (isNetworkError && queueable) {
        localDb.enqueueMutation(
          action: 'MUTATION_$method',
          method: method,
          endpoint: path,
          payload: body is Map<String, dynamic> ? body : null,
        );
        throw const DomainError(
          'Action enregistrée hors-ligne. Elle sera synchronisée dès la reconnexion.',
        );
      }
      rethrow;
    }
  }
}

final api = ApiClient();
