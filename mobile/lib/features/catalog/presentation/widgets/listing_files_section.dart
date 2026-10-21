import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../../core/db/models/listing.dart';
import '../../../../core/design/colors.dart';
import '../../../../core/design/typography.dart';
import '../../../../core/ui/s_button.dart';
import '../../../../core/ui/s_toast.dart';
import '../../../orders/presentation/widgets/order_cards.dart';
import '../../data/catalog_api.dart';

/// What a digital product contains, on the offer page (web: `ListingFilesSection`): each file with its kind and size, and a
/// button on the ones the seller offers as a free sample. Shown only when it says more than the rest of the page.
class ListingFilesSection extends StatefulWidget {
  final Listing listing;
  const ListingFilesSection({super.key, required this.listing});

  /// Several files, or at least one free sample.
  static bool shows(Listing l) {
    final files = filesOf(l.file);
    return l.kind == 'digital' && files.isNotEmpty && (files.length > 1 || files.any((f) => f.preview));
  }

  @override
  State<ListingFilesSection> createState() => _ListingFilesSectionState();
}

class _ListingFilesSectionState extends State<ListingFilesSection> {
  String? _busy;

  Future<void> _sample(String fileId) async {
    if (_busy != null) return;
    setState(() => _busy = fileId);
    try {
      await downloadSample(widget.listing.id, fileId);
    } catch (e) {
      if (mounted) SToast.error(context, e.toString());
    } finally {
      if (mounted) setState(() => _busy = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final files = filesOf(widget.listing.file);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(files.length > 1 ? '${files.length} fichiers inclus' : 'Fichier inclus', style: SalacopeTypography.bodyStrong.copyWith(color: colors.gray900)),
        const SizedBox(height: 8),
        for (final f in files) ...[
          FileRow(
            name: f.name,
            meta: fileMeta(f),
            trailing: f.preview && f.fileId != null
                ? SButton(
                    label: 'Aperçu gratuit',
                    variant: SButtonVariant.secondary,
                    size: SButtonSize.sm,
                    pill: true,
                    icon: const Icon(LucideIcons.download, size: 14),
                    isLoading: _busy == f.fileId,
                    onPressed: _busy == null ? () => _sample(f.fileId!) : null,
                  )
                : null,
          ),
          const SizedBox(height: 8),
        ],
      ],
    );
  }
}
