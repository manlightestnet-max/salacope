import 'dart:convert';
import 'dart:io';
import 'package:open_filex/open_filex.dart';
import 'package:path_provider/path_provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../api/domain_error.dart';

/// Opens a file of an order (a delivery, an attachment): a short-lived address goes to the phone's browser, which
/// downloads it; a file still kept as data is written to the phone and opened with the app that reads it.
Future<void> openRemoteFile(String? source, String name) async {
  if (source == null || source.isEmpty) throw const DomainError('Ce fichier n’est plus disponible.');
  if (source.startsWith('http')) {
    final ok = await launchUrl(Uri.parse(source), mode: LaunchMode.externalApplication);
    if (!ok) throw const DomainError('Impossible d’ouvrir le téléchargement sur ce téléphone.');
    return;
  }
  final comma = source.indexOf(',');
  if (!source.startsWith('data:') || comma < 0) throw const DomainError('Ce fichier n’est plus disponible.');
  final bytes = base64Decode(source.substring(comma + 1));
  final dir = await getTemporaryDirectory();
  final safe = name.replaceAll(RegExp(r'[^A-Za-z0-9._-]+'), '_');
  final file = File('${dir.path}/${safe.isEmpty ? 'fichier' : safe}');
  await file.writeAsBytes(bytes, flush: true);
  final result = await OpenFilex.open(file.path);
  if (result.type != ResultType.done) throw const DomainError('Aucune application de ce téléphone ne sait ouvrir ce fichier.');
}
