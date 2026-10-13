import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../core/design/colors.dart';
import '../../../core/design/tokens.dart';
import '../../../core/design/typography.dart';
import '../../../core/ui/s_button.dart';
import '../../../core/ui/s_shimmer.dart';
import '../data/uploads_api.dart';

/// The file of a digital product as it is now in the form.
class ProductFileValue {
  final String? fileId;
  final String name;
  final int? size;
  final String format;
  const ProductFileValue({this.fileId, this.name = '', this.size, this.format = 'PDF'});
}

const _formatByExtension = {'pdf': 'PDF', 'epub': 'EPUB', 'zip': 'ZIP', 'docx': 'DOCX', 'xlsx': 'XLSX', 'pptx': 'PPTX', 'mp4': 'Vidéo', 'mp3': 'Audio'};

/// The file a buyer receives: picked on the phone, sent straight to storage with a progress bar, downloaded by the buyer
/// after paying. Nothing is ever kept in the database; until storage is open nothing can be sent (and it says so).
class ProductFileField extends StatefulWidget {
  final ProductFileValue value;
  final ValueChanged<ProductFileValue> onChanged;
  final String? listingId;

  const ProductFileField({super.key, required this.value, required this.onChanged, this.listingId});

  @override
  State<ProductFileField> createState() => _ProductFileFieldState();
}

class _ProductFileFieldState extends State<ProductFileField> {
  StorageUsage? _usage = uploadsApi.lastUsage;
  String? _error;
  double? _progress;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final u = await uploadsApi.usage();
      if (mounted) setState(() => _usage = u);
    } catch (e) {
      if (mounted && _usage == null) setState(() => _error = e.toString());
    }
  }

  Future<void> _choose() async {
    final usage = _usage;
    if (usage == null || _progress != null) return;
    setState(() => _error = null);
    final picked = await FilePicker.pickFiles(type: FileType.any);
    if (picked.isEmpty) return;
    final file = picked.first.xFile;
    final size = await file.length();
    if (size > usage.maxFileBytes) {
      setState(() => _error = 'Fichier trop lourd : ${formatBytes(usage.maxFileBytes)} au maximum.');
      return;
    }
    if (size > usage.left) {
      setState(() => _error = 'Espace insuffisant : il vous reste ${formatBytes(usage.left)} sur ${formatBytes(usage.quotaBytes)}.');
      return;
    }
    setState(() => _progress = 0);
    try {
      final up = await uploadsApi.uploadProductFile(file, ref: widget.listingId, onProgress: (p) {
        if (mounted) setState(() => _progress = p);
      });
      final ext = up.name.split('.').last.toLowerCase();
      widget.onChanged(ProductFileValue(fileId: up.id, name: up.name, size: up.size, format: _formatByExtension[ext] ?? widget.value.format));
      _load();
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _progress = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final usage = _usage;
    final v = widget.value;

    if (usage == null) {
      return _error != null
          ? _Notice(text: _error!, onRetry: _load)
          : const SShimmer(child: SShimmerBox(height: 64, radius: 8));
    }
    if (!usage.product) {
      return const _Notice(text: 'L’envoi de fichiers n’est pas encore ouvert sur Salacope. Revenez dans un moment pour créer ce produit.');
    }

    final used = (usage.usedBytes / usage.quotaBytes).clamp(0.0, 1.0);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (v.fileId != null && _progress == null)
          Container(
            height: 52,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            decoration: BoxDecoration(
              color: colors.surface,
              borderRadius: BorderRadius.circular(SalacopeTokens.radiusLg),
              border: Border.all(color: colors.canvasBorder),
            ),
            child: Row(
              children: [
                Icon(LucideIcons.fileText, size: 18, color: colors.textMuted),
                const SizedBox(width: 10),
                Expanded(child: Text(v.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: SalacopeTypography.bodyStrong.copyWith(color: colors.textPrimary))),
                if (v.size != null) Text(formatBytes(v.size!), style: TextStyle(fontSize: 12, color: colors.textMuted)),
                IconButton(
                  tooltip: 'Retirer le fichier',
                  icon: Icon(LucideIcons.x, size: 16, color: colors.textMuted),
                  onPressed: () => widget.onChanged(ProductFileValue(format: v.format)),
                ),
              ],
            ),
          ),
        if (_progress != null)
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: colors.surface,
              borderRadius: BorderRadius.circular(SalacopeTokens.radiusLg),
              border: Border.all(color: colors.canvasBorder),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(children: [
                  Text('Envoi en cours…', style: TextStyle(fontSize: 12.5, color: colors.textMuted)),
                  const Spacer(),
                  Text('${(_progress! * 100).round()} %', style: TextStyle(fontSize: 12.5, color: colors.textMuted, fontFeatures: const [FontFeature.tabularFigures()])),
                ]),
                const SizedBox(height: 8),
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(value: _progress, minHeight: 6, backgroundColor: colors.gray100, color: colors.accent),
                ),
              ],
            ),
          )
        else ...[
          const SizedBox(height: 10),
          SButton(
            label: v.fileId != null ? 'Remplacer le fichier' : 'Choisir le fichier',
            variant: SButtonVariant.secondary,
            size: SButtonSize.md,
            icon: const Icon(LucideIcons.uploadCloud, size: 16),
            onPressed: _choose,
          ),
        ],
        if (_error != null) ...[
          const SizedBox(height: 8),
          Text(_error!, style: TextStyle(fontSize: 12.5, color: colors.danger)),
        ],
        const SizedBox(height: 12),
        ClipRRect(
          borderRadius: BorderRadius.circular(2),
          child: LinearProgressIndicator(value: used, minHeight: 3, backgroundColor: colors.gray100, color: used > .9 ? colors.danger : colors.gray400),
        ),
        const SizedBox(height: 4),
        Text(
          'Espace utilisé : ${formatBytes(usage.usedBytes)} sur ${formatBytes(usage.quotaBytes)} · ${formatBytes(usage.maxFileBytes)} au maximum par fichier',
          style: TextStyle(fontSize: 11, color: colors.textMuted),
        ),
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
        borderRadius: BorderRadius.circular(SalacopeTokens.radiusLg),
        border: Border.all(color: colors.canvasBorder),
      ),
      child: Row(
        children: [
          Expanded(child: Text(text, style: TextStyle(fontSize: 13, color: colors.textMuted))),
          if (onRetry != null) TextButton(onPressed: onRetry, child: const Text('Réessayer')),
        ],
      ),
    );
  }
}
