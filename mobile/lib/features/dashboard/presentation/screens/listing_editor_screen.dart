import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:salacope/core/db/store.dart';
import 'package:salacope/core/design/colors.dart';
import 'package:salacope/core/design/tokens.dart';
import 'package:salacope/core/design/typography.dart';
import 'package:salacope/core/domain/listings.dart';
import 'package:salacope/core/lib/format.dart';
import 'package:salacope/core/ui/s_button.dart';
import 'package:salacope/core/ui/s_empty_state.dart';
import 'package:salacope/core/ui/s_image.dart';
import 'package:salacope/core/ui/s_page.dart';
import 'package:salacope/core/ui/s_panel.dart';
import 'package:salacope/core/ui/s_toast.dart';
import 'package:salacope/features/catalog/domain/catalog_model.dart';
import 'package:salacope/features/listings/data/listings_api.dart';
import 'package:salacope/features/listings/presentation/listing_form.dart';

/// Creating an offer, step by step. An offer that exists never comes back here: it opens on its own page, one section at a time
/// (see ListingManageScreen). The first file sent opens a draft that keeps what is typed and holds the files.
class ListingEditorScreen extends StatefulWidget {
  const ListingEditorScreen({super.key});

  @override
  State<ListingEditorScreen> createState() => _ListingEditorScreenState();
}

class _ListingEditorScreenState extends State<ListingEditorScreen> {
  static const _steps = ['Type', 'Présentation', 'Livraison', 'Couverture & Prix', 'Vérification'];

  final ListingForm _form = ListingForm.fromListing(null);
  int _step = 0;
  bool _saving = false;
  String? _draftId;

  @override
  void dispose() {
    _form.dispose();
    super.dispose();
  }

  Future<String> _openDraft() async {
    final existing = _draftId;
    if (existing != null) return existing;
    final f = _form.toInput();
    final draft = await listingsApi.createDraft(kind: f.kind, category: f.category, title: f.title, summary: f.summary);
    return _draftId = draft.id;
  }

  void _next() {
    final err = _form.stepError(_step);
    if (err != null) {
      SToast.error(context, err);
      return;
    }
    setState(() => _step = (_step + 1).clamp(0, _steps.length - 1));
  }

  Future<void> _submit(bool publish) async {
    final input = _form.toInput();
    try {
      validateListing(input);
    } catch (e) {
      SToast.error(context, e.toString());
      return;
    }
    setState(() => _saving = true);
    try {
      final draft = _draftId;
      if (draft != null) {
        await listingsApi.updateListing(draft, input);
        if (publish) await listingsApi.setListingStatus(draft, 'published');
      } else {
        await listingsApi.createListing(input, publish);
      }
      if (mounted) {
        SToast.success(context, publish ? 'Offre publiée' : 'Brouillon enregistré');
        context.pop();
      }
    } catch (e) {
      if (mounted) SToast.error(context, e.toString());
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final user = db.user;
    if (user == null || user.merchant == null) {
      return Scaffold(
        backgroundColor: colors.canvas,
        appBar: AppBar(backgroundColor: colors.canvas, leading: const BackButton()),
        body: const Center(child: SEmptyState(title: 'Boutique requise', description: 'Vous devez avoir une boutique pour créer une offre.')),
      );
    }

    return ListenableBuilder(
      listenable: _form,
      builder: (context, _) => SPage(
        title: 'Nouvelle offre',
        leading: const BackButton(),
        actions: [
          if (_saving)
            const Padding(padding: EdgeInsets.all(12), child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)))
          else if (_step == _steps.length - 1)
            SButton(label: 'Publier', size: SButtonSize.sm, pill: true, onPressed: () => _submit(true)),
        ],
        toolbar: PreferredSize(preferredSize: const Size.fromHeight(48), child: _StepBar(steps: _steps, current: _step, onTap: (i) {
          if (i < _step) {
            setState(() => _step = i);
          } else if (i == _step + 1) {
            _next();
          }
        })),
        slivers: [
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  switch (_step) {
                    0 => _typeStep(context),
                    1 => SPanel(
                        titleText: 'Présentation de l’offre',
                        descriptionText: 'Donnez envie à vos clients avec des informations claires.',
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [ListingInfoFields(form: _form), const SizedBox(height: 14), ListingDescriptionFields(form: _form)],
                        ),
                      ),
                    2 => SPanel(
                        titleText: _form.kind == 'service' ? 'Livraison du service' : 'Fichiers livrés',
                        descriptionText: sectionHelp(ListingSection.livraison, _form.kind),
                        child: ListingDeliveryFields(form: _form, listingId: _draftId, openDraft: _openDraft),
                      ),
                    3 => SPanel(
                        titleText: 'Couverture & Prix',
                        descriptionText: 'Soignez votre couverture : c’est elle qui attire les regards dans le catalogue.',
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [ListingImagesFields(form: _form), const SizedBox(height: 20), ListingPriceFields(form: _form)],
                        ),
                      ),
                    _ => _review(context, user.merchant!.storeName),
                  },
                  const SizedBox(height: 24),
                  Row(
                    children: [
                      if (_step > 0) ...[
                        Expanded(child: SButton(label: 'Précédent', variant: SButtonVariant.secondary, onPressed: () => setState(() => _step--))),
                        const SizedBox(width: 12),
                      ],
                      Expanded(
                        child: _step < _steps.length - 1
                            ? SButton(label: 'Suivant', onPressed: _next)
                            : SButton(label: 'Enregistrer le brouillon', variant: SButtonVariant.secondary, onPressed: _saving ? null : () => _submit(false)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 32),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _typeStep(BuildContext context) => SPanel(
        titleText: 'Type d’offre',
        descriptionText: 'Ce que vous vendez : un fichier livré au paiement, ou un service.',
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Expanded(
                  child: _SelectCard(
                    selected: _form.kind == 'digital',
                    // Once a file is sent the draft exists with its kind.
                    enabled: _draftId == null,
                    icon: LucideIcons.download,
                    title: 'Produit numérique',
                    subtitle: 'Livré automatiquement dès le paiement.',
                    onTap: () => _form.update(() {
                      _form.kind = 'digital';
                      _form.category = 'ebook';
                    }),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _SelectCard(
                    selected: _form.kind == 'service',
                    enabled: _draftId == null,
                    icon: LucideIcons.wrench,
                    title: 'Service',
                    subtitle: 'Vous effectuez le travail dans un délai fixé.',
                    onTap: () => _form.update(() {
                      _form.kind = 'service';
                      _form.category = 'service';
                    }),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            ListingCategoryField(form: _form),
          ],
        ),
      );

  Widget _review(BuildContext context, String storeName) {
    final colors = context.colors;
    final input = _form.toInput();
    final files = input.files ?? const [];
    final checks = [
      (ok: input.title.length >= 8 && input.summary.isNotEmpty, label: 'Titre (${input.title.length} car.) et résumé'),
      (ok: input.description.isNotEmpty, label: 'Description détaillée'),
      (ok: input.features.isNotEmpty, label: 'Éléments inclus (${input.features.length})'),
      (
        ok: input.kind == 'service' ? (input.deliveryDays ?? 0) > 0 : filesError(files) == null,
        label: input.kind == 'service' ? 'Délai de ${input.deliveryDays} j' : plural(files.length, 'fichier'),
      ),
      (ok: input.coverImage.isNotEmpty, label: 'Image de couverture'),
      (ok: _form.stepError(3) == null, label: 'Prix : ${formatPrice(input.priceXaf)}'),
    ];
    return SPanel(
      titleText: 'Vérification avant publication',
      descriptionText: 'Relisez les points clés pour vous assurer que tout est parfait.',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          for (final c in checks)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: Row(
                children: [
                  Icon(c.ok ? LucideIcons.circleCheck : LucideIcons.circleAlert, size: 16, color: c.ok ? colors.accent : colors.danger),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      c.label,
                      style: SalacopeTypography.body.copyWith(color: c.ok ? colors.textPrimary : colors.danger, fontWeight: c.ok ? FontWeight.w400 : FontWeight.w600),
                    ),
                  ),
                ],
              ),
            ),
          const SizedBox(height: 16),
          const Divider(height: 1),
          const SizedBox(height: 16),
          Text('Aperçu de la carte catalogue', style: SalacopeTypography.bodyStrong),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: colors.canvas,
              borderRadius: BorderRadius.circular(SalacopeTokens.radiusLg),
              border: Border.all(color: colors.canvasBorder),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(SalacopeTokens.radiusMd),
                  child: SizedBox(width: 72, height: 72, child: SImage(url: input.coverImage, fit: BoxFit.cover)),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${getCategoryConfig(input.category)?.label ?? input.category} · ${input.kind == 'service' ? 'Service' : 'Produit'}',
                        style: SalacopeTypography.small.copyWith(color: colors.textMuted),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        input.title.isNotEmpty ? input.title : 'Titre de l’offre',
                        style: SalacopeTypography.bodyStrong.copyWith(color: colors.textPrimary),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Text(storeName, style: SalacopeTypography.caption.copyWith(color: colors.textSecondary)),
                      const SizedBox(height: 4),
                      Text(formatPrice(input.priceXaf), style: SalacopeTypography.bodyStrong.copyWith(color: colors.textPrimary)),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _StepBar extends StatelessWidget {
  final List<String> steps;
  final int current;
  final ValueChanged<int> onTap;
  const _StepBar({required this.steps, required this.current, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: [
          for (final (i, label) in steps.indexed)
            Padding(
              padding: const EdgeInsets.only(right: 6),
              child: InkWell(
                onTap: () => onTap(i),
                borderRadius: SalacopeTokens.borderFull,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: i == current ? colors.accent : colors.surface,
                    borderRadius: SalacopeTokens.borderFull,
                    border: Border.all(color: i == current ? colors.accent : colors.canvasBorder, width: 0.8),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (i < current)
                        Padding(padding: const EdgeInsets.only(right: 4), child: Icon(LucideIcons.check, size: 12, color: colors.accent))
                      else
                        Text('${i + 1}. ', style: SalacopeTypography.small.copyWith(color: i == current ? colors.onAccent : colors.textMuted, fontWeight: FontWeight.w700)),
                      Text(
                        label,
                        style: SalacopeTypography.caption.copyWith(
                          color: i == current ? colors.onAccent : colors.textPrimary,
                          fontWeight: i == current ? FontWeight.w600 : FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _SelectCard extends StatelessWidget {
  final bool selected;
  final bool enabled;
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  const _SelectCard({required this.selected, this.enabled = true, required this.icon, required this.title, required this.subtitle, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    return InkWell(
      onTap: enabled ? onTap : null,
      borderRadius: BorderRadius.circular(SalacopeTokens.radiusLg),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: selected ? colors.accent.withValues(alpha: 0.08) : colors.surface,
          borderRadius: BorderRadius.circular(SalacopeTokens.radiusLg),
          border: Border.all(color: selected ? colors.accent : colors.canvasBorder, width: selected ? 1.5 : 0.8),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, size: 20, color: selected ? colors.accent : colors.textMuted),
            const SizedBox(height: 8),
            Text(title, style: SalacopeTypography.bodyStrong.copyWith(color: selected ? colors.textPrimary : colors.textSecondary)),
            const SizedBox(height: 4),
            Text(subtitle, style: SalacopeTypography.small.copyWith(color: colors.textMuted)),
          ],
        ),
      ),
    );
  }
}
