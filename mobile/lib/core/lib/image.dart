import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'package:flutter_image_compress/flutter_image_compress.dart';
import 'package:image_picker/image_picker.dart';
import 'package:file_picker/file_picker.dart';

const Map<String, String> imageTypes = {
  'image/jpeg': 'JPG',
  'image/png': 'PNG',
  'image/webp': 'WebP',
};

String? sniffImageType(Uint8List bytes) {
  if (bytes.length < 12) return null;
  // JPEG: FF D8 FF
  if (bytes[0] == 0xFF && bytes[1] == 0xD8 && bytes[2] == 0xFF) {
    return 'image/jpeg';
  }
  // PNG: 89 50 4E 47 ('\x89PNG')
  if (bytes[0] == 0x89 &&
      bytes[1] == 0x50 &&
      bytes[2] == 0x4E &&
      bytes[3] == 0x47) {
    return 'image/png';
  }
  // WebP: RIFF....WEBP
  final header = String.fromCharCodes(bytes.sublist(0, 4));
  final format = String.fromCharCodes(bytes.sublist(8, 12));
  if (header == 'RIFF' && format == 'WEBP') {
    return 'image/webp';
  }
  return null;
}

/// Compresses an image file (e.g. from camera or gallery) to a JPEG data URL.
/// Longest side <= maxSide (default 1600), total weight <= maxBytes (default 700 000).
Future<String> shrinkImageFile(
  File file, {
  int maxSide = 1600,
  int maxBytes = 700000,
}) async {
  int quality = 85;
  int currentSide = maxSide;

  for (int attempt = 0; attempt < 6; attempt++) {
    final result = await FlutterImageCompress.compressWithFile(
      file.absolute.path,
      minWidth: currentSide,
      minHeight: currentSide,
      quality: quality,
      format: CompressFormat.jpeg,
    );

    if (result != null) {
      if (result.length <= maxBytes) {
        final b64 = base64Encode(result);
        return 'data:image/jpeg;base64,$b64';
      }
    }

    quality = (quality * 0.8).round();
    currentSide = (currentSide * 0.8).round();
  }

  // Fallback: read file directly and encode
  final rawBytes = await file.readAsBytes();
  return 'data:image/jpeg;base64,${base64Encode(rawBytes)}';
}

/// Pick an image from gallery or camera, with optional compression
Future<String?> pickAndCompressImage({
  ImageSource source = ImageSource.gallery,
  int maxSide = 1600,
  int maxBytes = 700000,
}) async {
  final picker = ImagePicker();
  final picked = await picker.pickImage(source: source);
  if (picked == null) return null;
  return shrinkImageFile(File(picked.path), maxSide: maxSide, maxBytes: maxBytes);
}

/// Pick a file (document or image) and convert to attachment format {id, name, size, type, dataUrl}
Future<Map<String, dynamic>?> pickAttachmentFile({int maxBytes = 2100 * 1024}) async {
  final files = await FilePicker.pickFiles(
    type: FileType.any,
  );

  if (files.isEmpty) return null;
  final file = files.first;
  final bytes = await file.xFile.readAsBytes();

  // What the server takes in one send (3 Mo once encoded).
  if (bytes.length > maxBytes) {
    throw Exception('Le fichier dépasse ${(maxBytes / 1024 / 1024).toStringAsFixed(0)} Mo : envoyez-en un plus léger.');
  }

  final ext = file.extension?.toLowerCase() ?? '';
  String mimeType = 'application/octet-stream';
  if (ext == 'jpg' || ext == 'jpeg') {
    mimeType = 'image/jpeg';
  } else if (ext == 'png') {
    mimeType = 'image/png';
  } else if (ext == 'webp') {
    mimeType = 'image/webp';
  } else if (ext == 'pdf') {
    mimeType = 'application/pdf';
  } else if (ext == 'zip') {
    mimeType = 'application/zip';
  } else if (ext == 'docx') {
    mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  } else if (ext == 'xlsx') {
    mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  } else if (ext == 'mp4') {
    mimeType = 'video/mp4';
  }

  final dataUrl = 'data:$mimeType;base64,${base64Encode(bytes)}';
  final id = 'att_${DateTime.now().millisecondsSinceEpoch}_${file.name.hashCode.abs()}';

  return {
    'id': id,
    'name': file.name,
    'size': '${(bytes.length / 1024).round()} Ko',
    'type': mimeType,
    'dataUrl': dataUrl,
  };
}
