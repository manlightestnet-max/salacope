import 'package:cross_file/cross_file.dart';
import 'package:dio/dio.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/domain_error.dart';

/// What storage offers this person: which kinds of file can be kept, and the room left (`GET /files/usage`).
class StorageUsage {
  final int usedBytes;
  final int quotaBytes;
  final int maxFileBytes;
  final bool product;

  const StorageUsage({required this.usedBytes, required this.quotaBytes, required this.maxFileBytes, required this.product});

  factory StorageUsage.fromJson(Map<String, dynamic> j) => StorageUsage(
        usedBytes: (j['usedBytes'] as num?)?.toInt() ?? 0,
        quotaBytes: (j['quotaBytes'] as num?)?.toInt() ?? 1,
        maxFileBytes: (j['maxFileBytes'] as num?)?.toInt() ?? 0,
        product: j['product'] == true,
      );

  int get left => (quotaBytes - usedBytes).clamp(0, quotaBytes);
}

class UploadedFile {
  final String id;
  final String name;
  final int size;
  const UploadedFile({required this.id, required this.name, required this.size});
}

String formatBytes(int bytes) => bytes >= 1024 * 1024 ? '${(bytes / 1024 / 1024).toStringAsFixed(1)} Mo' : '${(bytes / 1024).round().clamp(1, 1024)} Ko';

const _mimes = {
  'pdf': 'application/pdf',
  'epub': 'application/epub+zip',
  'zip': 'application/zip',
  'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'mp4': 'video/mp4',
  'mp3': 'audio/mpeg',
  'png': 'image/png',
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
};

String mimeOf(String name) => _mimes[name.split('.').last.toLowerCase()] ?? 'application/octet-stream';

final uploadsApi = UploadsApi._();

/// Files go straight from the phone to storage (Cloudflare R2), never through the database: the server hands out a
/// short-lived address, the phone sends the file there (with progress), then the server checks it arrived.
class UploadsApi {
  UploadsApi._();

  final Dio _storage = Dio(BaseOptions(connectTimeout: const Duration(seconds: 30), sendTimeout: const Duration(minutes: 30), receiveTimeout: const Duration(minutes: 2)));

  StorageUsage? _usage;
  StorageUsage? get lastUsage => _usage;

  Future<StorageUsage> usage() async {
    final res = await api.request('GET', '/files/usage') as Map<String, dynamic>;
    return _usage = StorageUsage.fromJson(res);
  }

  /// The file a buyer of a digital product receives. `ref`: the offer, once it exists.
  Future<UploadedFile> uploadProductFile(XFile file, {required void Function(double) onProgress, String? ref}) async {
    final size = await file.length();
    final type = mimeOf(file.name);
    final signed = await api.request('POST', '/files/sign', body: {'purpose': 'product', 'name': file.name, 'type': type, 'size': size, 'ref': ?ref}) as Map<String, dynamic>;
    final id = signed['id'] as String;
    try {
      await _storage.put<void>(
        signed['uploadUrl'] as String,
        data: file.openRead(),
        options: Options(headers: {Headers.contentTypeHeader: type, Headers.contentLengthHeader: size}),
        onSendProgress: (sent, total) => onProgress(total > 0 ? sent / total : 0),
      );
    } on DioException catch (e) {
      if (e.response == null) throw const DomainError('Envoi interrompu : vérifiez votre connexion et réessayez.');
      throw const DomainError('L’envoi a été refusé par le stockage. Réessayez.');
    }
    await api.request('POST', '/files/${Uri.encodeComponent(id)}/complete');
    _usage = null;
    return UploadedFile(id: id, name: file.name, size: size);
  }
}
