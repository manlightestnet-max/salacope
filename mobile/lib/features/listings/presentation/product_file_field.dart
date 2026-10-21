import 'package:cross_file/cross_file.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../core/config/platform.dart';
import '../../../core/db/models/listing.dart';
import '../../../core/design/colors.dart';
import '../../../core/design/tokens.dart';
import '../../../core/design/typography.dart';
import '../../../core/ui/s_shimmer.dart';
import '../../orders/presentation/widgets/order_cards.dart';
import '../data/listings_api.dart';
import '../data/uploads_api.dart';

/// A file being sent (or that failed): shown under the ones already kept.
class _Sending {
  final int key;
  final String name;
  final int size;
  double progress = 0;
  String? error;
  _Sending(this.key, this.name, this.size);
}

/// The files a buyer receives (web: `ProductFilesField`). The seller picks as many as the administration allows; each one goes
/// straight to storage (Cloudflare R2), one after the other, with its own progress, and can be marked as a free sample anyone may
/// download from the offer page. Nothing is ever kept in the database.
///
/// Creating an offer: the first file sent opens a draft ([openDraft] gives its id) and the list is saved in it as it changes, so
/// closing the screen loses nothing.
class ProductFilesField extends StatefulWidget {
  final List<ListingFileItem> files;
  final ValueChanged<List<ListingFileItem>> onChanged;
  final String? listingId;
  final Future<String> Function()? openDraft;

  const ProductFilesField({super.key, required this.files, required this.onChanged, this.listingId, this.openDraft});

  @override
  State<ProductFilesField> createState() => _ProductFilesFieldState();
}

class _ProductFilesFieldState extends State<ProductFilesField> {
  StorageUsage? _usage = uploadsApi.lastUsage;
  String? _loadError;
  String? _notice;
  final List<_Sending> _sending = [];
  late List<ListingFileItem> _latest = widget.files;
  String? _draftId;
  Future<void> _saving = Future.value();
  int _counter = 0;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void didUpdateWidget(ProductFilesField old) {
    super.didUpdateWidget(old);
    _latest = widget.files;
  }

  Future<void> _load() async {
    try {
      final u = await uploadsApi.usage();
      if (mounted) setState(() => _usage = u);
    } catch (e) {
      if (mounted && _usage == null) setState(() => _loadError = e.toString());
    }
  }

  /// The draft being created: opened here, or before (the wizard came back to this step with its id).
  String? get _draft => _draftId ?? (widget.openDraft != null ? widget.listingId : null);

  /// Takes the new list into the form and, while creating, into the draft.
  void _commit(List<ListingFileItem> next) {
    _latest = next;
    widget.onChanged(next);
    final id = _draft;
    if (id != null) _saving = _saving.then((_) => listingsApi.saveDraftFiles(id, next)).catchError((_) {});
  }

  Future<void> _send(XFile file, int size) async {
    final u = _Sending(++_counter, file.name, size);
    setState(() => _sending.add(u));
    try {
      // Creating an offer: the draft opens now, with what is typed so far, and the file is tied to it.
      if (widget.listingId == null && _draftId == null && widget.openDraft != null) _draftId = await widget.openDraft!();
      final up = await uploadsApi.uploadProductFile(file, ref: widget.listingId ?? _draftId, onProgress: (p) {
        if (mounted) setState(() => u.progress = p);
      });
      _commit([..._latest, ListingFileItem(name: up.name, format: fileFormatOf(up.name), fileId: up.id, size: up.size)]);
      if (mounted) setState(() => _sending.remove(u));
      _load();
    } catch (e) {
      if (mounted) setState(() => u.error = e.toString());
    }
  }

  Future<void> _choose() async {
    final usage = _usage;
    if (usage == null) return;
    final max = PlatformConfig.maxProductFiles;
    final picked = await FilePicker.pickFiles(type: FileType.any);
    if (picked.isEmpty || !mounted) return;
    final problems = <String>[];
    final accepted = <(XFile, int)>[];
    var slots = max - _latest.length - _sending.length;
    var used = usage.usedBytes + _sending.fold<int>(0, (n, s) => n + (s.error == null ? s.size : 0));
    for (final p in picked) {
      final f = p.xFile;
      final size = await f.length();
      if (slots <= 0) {
        problems.add('$max fichiers au maximum : « ${f.name} » n’a pas été ajouté.');
      } else if (size > usage.maxFileBytes) {
        problems.add('« ${f.name} » est trop lourd : ${formatBytes(usage.maxFileBytes)} au maximum.');
      } else if (used + size > usage.quotaBytes) {
        final left = usage.quotaBytes - used;
        problems.add('Espace insuffisant pour « ${f.name} » : il vous reste ${formatBytes(left < 0 ? 0 : left)} sur ${formatBytes(usage.quotaBytes)}.');
      } else {
        accepted.add((f, size));
        slots -= 1;
        used += size;
      }
    }
    setState(() => _notice = problems.isEmpty ? null : problems.join(' '));
    // One after the other: a phone on a mobile network sends one file faster than three at once.
    for (final (f, size) in accepted) {
      await _send(f, size);
    }
  }

  void _remove(String fileId) {
    setState(() => _notice = null);
    _commit(_latest.where((x) => x.fileId != fileId).toList());
    // In a draft the file is deleted from storage as the list is saved. On an existing offer, a file sent today and not kept frees
    // its space at once; one the offer already lists is dropped when the offer is saved.
    if (_draft == null) {
      uploadsApi.discard(fileId).then((_) => _load());
    } else {
      _saving.then((_) => _load());
    }
  }

  void _toggleSample(String fileId, bool preview) => _commit([
        for (final x in _latest)
          x.fileId == fileId ? ListingFileItem(name: x.name, format: x.format, fileId: x.fileId, size: x.size, preview: preview) : x,
      ]);

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final usage = _usage;
    if (usage == null) {
      return _loadError != null ? _Notice(text: _loadError!, onRetry: _load) : const SShimmer(child: SShimmerBox(height: 96, radius: 16));
    }
    if (!usage.product) {
      // Files only ever go to storage (never into the database): until Salacope has set it up, nothing can be sent.
      return const _Notice(text: 'L’envoi de fichiers n’est pas encore ouvert sur Salacope. Revenez dans un moment pour créer ce produit.');
    }

    final files = widget.files;
    final max = PlatformConfig.maxProductFiles;
    final count = files.length + _sending.length;
    final room = max - count;
    final samples = files.where((f) => f.preview).length;
    final used = (usage.usedBytes / usage.quotaBytes).clamp(0.0, 1.0);
    final tooMany = files.length > max;
    final error = tooMany ? 'Cette offre a ${files.length} fichiers et le maximum est $max : retirez-en ${files.length - max}.' : _notice;
    final caption = SalacopeTypography.caption.copyWith(color: colors.gray500);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(child: Text('Fichiers livrés', style: SalacopeTypography.label.copyWith(color: colors.gray900, fontWeight: FontWeight.w600))),
            Text('$count / $max', style: caption),
          ],
        ),
        const SizedBox(height: 4),
        Text(
          'Le client reçoit tous ces fichiers après paiement. Un aperçu gratuit peut être téléchargé par tout le monde depuis la page de l’offre.',
          style: caption,
        ),
        const SizedBox(height: 12),
        for (final f in files) ...[
          FileRow(
            name: f.name,
            meta: '${f.format}${f.size != null ? ' · ${formatBytes(f.size!)}' : ''}${f.preview ? ' · aperçu gratuit' : ''}',
            trailing: IconButton(
              tooltip: 'Retirer ${f.name}',
              icon: Icon(LucideIcons.x, size: 16, color: colors.gray400),
              onPressed: f.fileId == null ? null : () => _remove(f.fileId!),
            ),
          ),
          if (files.length > 1 || f.preview)
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 0, 0, 0),
              child: Row(
                children: [
                  Icon(LucideIcons.eye, size: 16, color: colors.gray400),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Aperçu gratuit', style: SalacopeTypography.body.copyWith(color: colors.gray900)),
                        Text(f.preview ? 'Téléchargeable sans acheter' : 'Réservé aux acheteurs', style: caption),
                      ],
                    ),
                  ),
                  Switch.adaptive(
                    value: f.preview,
                    activeTrackColor: colors.accent,
                    onChanged: f.fileId == null ? null : (on) => _toggleSample(f.fileId!, on),
                  ),
                ],
              ),
            ),
          const SizedBox(height: 8),
        ],
        for (final u in _sending) ...[
          FileRow(
            name: u.name,
            meta: u.error != null ? formatBytes(u.size) : 'Envoi en cours · ${(u.progress * 100).round()} %',
            trailing: u.error != null
                ? IconButton(
                    tooltip: 'Fermer',
                    icon: Icon(LucideIcons.x, size: 16, color: colors.gray400),
                    onPressed: () => setState(() => _sending.remove(u)),
                  )
                : null,
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 6, 12, 0),
            child: u.error != null
                ? Text(u.error!, style: SalacopeTypography.caption.copyWith(color: colors.danger))
                : ClipRRect(
                    borderRadius: SalacopeTokens.borderFull,
                    child: LinearProgressIndicator(value: u.progress, minHeight: 6, backgroundColor: colors.gray100, color: colors.accent),
                  ),
          ),
          const SizedBox(height: 8),
        ],
        if (room > 0)
          InkWell(
            onTap: _choose,
            borderRadius: BorderRadius.circular(SalacopeTokens.radius2xl),
            child: Container(
              padding: EdgeInsets.symmetric(horizontal: 16, vertical: count == 0 ? 28 : 16),
              decoration: BoxDecoration(
                color: colors.gray50,
                borderRadius: BorderRadius.circular(SalacopeTokens.radius2xl),
                border: Border.all(color: colors.gray300, width: 1.5),
              ),
              child: Column(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(color: colors.surface, shape: BoxShape.circle, border: Border.all(color: colors.gray200)),
                    child: Icon(LucideIcons.cloudUpload, size: 20, color: colors.gray500),
                  ),
                  const SizedBox(height: 8),
                  Text(count == 0 ? 'Ajoutez vos fichiers' : 'Ajouter un fichier', style: SalacopeTypography.bodyStrong.copyWith(color: colors.gray900)),
                  const SizedBox(height: 2),
                  Text('Touchez pour choisir · ${formatBytes(usage.maxFileBytes)} au plus par fichier', style: caption, textAlign: TextAlign.center),
                ],
              ),
            ),
          )
        else
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(color: colors.gray50, borderRadius: BorderRadius.circular(SalacopeTokens.radius2xl)),
            child: Text(
              max > 1 ? 'Vous avez atteint le maximum de $max fichiers pour un produit.' : 'Un seul fichier par produit.',
              textAlign: TextAlign.center,
              style: caption,
            ),
          ),
        if (error != null) ...[
          const SizedBox(height: 8),
          Text(error, style: SalacopeTypography.caption.copyWith(color: colors.danger)),
        ],
        if (samples > 0 && files.length > samples) ...[
          const SizedBox(height: 8),
          Text(
            '$samples aperçu${samples > 1 ? 's' : ''} gratuit${samples > 1 ? 's' : ''} sur la page de l’offre, ${files.length - samples} fichier${files.length - samples > 1 ? 's' : ''} réservé${files.length - samples > 1 ? 's' : ''} aux acheteurs.',
            style: caption,
          ),
        ],
        const SizedBox(height: 12),
        ClipRRect(
          borderRadius: BorderRadius.circular(2),
          child: LinearProgressIndicator(value: used, minHeight: 3, backgroundColor: colors.gray100, color: used > .9 ? colors.danger : colors.gray400),
        ),
        const SizedBox(height: 4),
        Text('Espace utilisé : ${formatBytes(usage.usedBytes)} sur ${formatBytes(usage.quotaBytes)}', style: SalacopeTypography.small.copyWith(color: colors.gray500)),
      ],
    );
  }
}

class _Notice extends StatelessWidget {
  final String text;
  final VoidCallback? onRetry;
  const _Notice({required this.text, this.onRetry});

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(SalacopeTokens.radius2xl),
        border: Border.all(color: colors.gray200),
      ),
      child: Row(
        children: [
          Expanded(child: Text(text, style: SalacopeTypography.body.copyWith(color: colors.textMuted))),
          if (onRetry != null) TextButton(onPressed: onRetry, child: const Text('Réessayer')),
        ],
      ),
    );
  }
}
