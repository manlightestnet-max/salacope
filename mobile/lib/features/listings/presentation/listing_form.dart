import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../core/config/platform.dart';
import '../../../core/db/models/listing.dart';
import '../../../core/design/colors.dart';
import '../../../core/design/tokens.dart';
import '../../../core/design/typography.dart';
import '../../../core/domain/listings.dart';
import 'package:salacope/core/lib/format.dart';
import 'package:salacope/core/lib/image.dart';
import '../../../core/ui/s_button.dart';
import '../../../core/ui/s_field.dart';
import '../../../core/ui/s_image.dart';
import '../../../core/ui/s_toast.dart';
import '../../catalog/domain/catalog_model.dart';
import 'product_file_field.dart';

/// The state shared by every screen that edits an offer (web: `useListingForm`): the creation wizard and the page of an offer
/// that exists. The "free offer" choice is kept apart (a price of 0 on a new offer may just be empty).
class ListingForm extends ChangeNotifier {
  String kind;
  String category;
  final title = TextEditingController();
  final summary = TextEditingController();
  final description = TextEditingController();
  final features = TextEditingController();
  final price = TextEditingController();
  final compareAt = TextEditingController();
  bool free;
  bool promo;
  String? promoEndsAt;
  String coverImage;
  int deliveryDays;
  int revisions;
  List<BriefQuestionInput> briefQuestions;
  List<ListingFileItem> files;

  ListingForm._({
    required this.kind,
    required this.category,
    required this.free,
    required this.promo,
    required this.promoEndsAt,
    required this.coverImage,
    required this.deliveryDays,
    required this.revisions,
    required this.briefQuestions,
    required this.files,
  }) {
    for (final c in [title, summary, description, features, price, compareAt]) {
      c.addListener(notifyListeners);
    }
  }

  factory ListingForm.fromListing(Listing? l) {
    final f = ListingForm._(
      kind: l?.kind ?? 'digital',
      category: l?.category ?? 'ebook',
      free: l != null && l.priceXaf == 0,
      promo: l?.compareAtXaf != null,
      promoEndsAt: l?.promo?.endsAt,
      coverImage: l?.coverImage ?? '',
      deliveryDays: l?.deliveryDays ?? 3,
      revisions: l?.revisions ?? 1,
      briefQuestions: [for (final q in l?.briefQuestions ?? const <BriefQuestion>[]) BriefQuestionInput(id: q.id, label: q.label, required: q.required)],
      files: List.of(filesOf(l?.file)),
    );
    if (l != null) {
      f.title.text = l.title;
      f.summary.text = l.summary;
      f.description.text = l.description;
      f.features.text = l.features.join('\n');
      f.price.text = l.priceXaf == 0 ? '' : '${l.priceXaf}';
      if (l.compareAtXaf != null) f.compareAt.text = '${l.compareAtXaf}';
    }
    return f;
  }

  /// Changes some fields and redraws what shows them.
  void update(VoidCallback change) {
    change();
    notifyListeners();
  }

  int get priceXaf => free ? 0 : int.tryParse(price.text.trim().replaceAll(' ', '')) ?? 0;
  int? get compareAtXaf => promo ? int.tryParse(compareAt.text.trim().replaceAll(' ', '')) : null;

  ListingInput toInput() => ListingInput(
        kind: kind,
        category: category,
        title: title.text.trim(),
        summary: summary.text.trim(),
        description: description.text.trim(),
        features: featureLines(features.text.split('\n')),
        priceXaf: priceXaf,
        compareAtXaf: compareAtXaf,
        promoEndsAt: compareAtXaf != null ? promoEndsAt : null,
        coverImage: coverImage.trim(),
        deliveryDays: kind == 'service' ? deliveryDays : null,
        revisions: kind == 'service' ? revisions : null,
        briefQuestions: kind == 'service' ? briefQuestions.where((q) => q.label.trim().isNotEmpty).toList() : null,
        files: kind == 'digital' ? files : null,
      );

  /// What would be saved, to tell whether anything changed.
  String snapshot() => jsonEncode(toInput().toJson());

  /// The first problem of a step of the wizard (the same checks apply to the sections of an existing offer).
  String? stepError(int step) {
    final f = toInput();
    if (step == 1) {
      if (f.title.length < 8) return 'Le titre doit faire au moins 8 caractères.';
      if (f.title.length > ListingLimits.title) return 'Le titre dépasse ${ListingLimits.title} caractères.';
      if (f.summary.isEmpty) return 'Ajoutez un résumé en une phrase.';
      if (f.summary.length > ListingLimits.summary) return 'Le résumé dépasse ${ListingLimits.summary} caractères.';
      return featuresError(f.features);
    }
    if (step == 2) {
      if (f.kind == 'service' && (f.deliveryDays ?? 0) < 1) return 'Indiquez un délai de livraison.';
      if (f.kind == 'digital') return filesError(f.files ?? const []);
    }
    if (step == 3) {
      if (f.coverImage.isEmpty) return 'Ajoutez une image de couverture.';
      final minimum = minPriceFor(f.kind);
      if (free && !PlatformConfig.freeOffers) return 'Les offres gratuites ne sont pas autorisées pour le moment.';
      if (free && f.compareAtXaf != null && f.compareAtXaf! < minimum) {
        return 'Une offre gratuite pendant une promotion repasse à un prix d’au moins $minimum FCFA.';
      }
      if (!free && f.priceXaf < minimum) return 'Le prix minimum est de $minimum FCFA.';
      if (promo && f.compareAtXaf == null) return 'Indiquez l’ancien prix de la promotion.';
      final p = priceError(f.kind, f.priceXaf, f.compareAtXaf);
      if (p != null) return p;
      return promoError(f.promoEndsAt, f.compareAtXaf);
    }
    return null;
  }

  @override
  void dispose() {
    for (final c in [title, summary, description, features, price, compareAt]) {
      c.dispose();
    }
    super.dispose();
  }
}

/// The sections of an offer that exists, each edited on its own screen (the wizard is only for creating it).
enum ListingSection { informations, description, images, prix, livraison }

String sectionTitle(ListingSection s, String kind) => switch (s) {
      ListingSection.informations => 'Informations',
      ListingSection.description => 'Description',
      ListingSection.images => 'Images',
      ListingSection.prix => 'Prix et promotion',
      ListingSection.livraison => kind == 'service' ? 'Livraison' : 'Fichiers livrés',
    };

String sectionHelp(ListingSection s, String kind) => switch (s) {
      ListingSection.informations => 'Le titre, le résumé et la catégorie : ce que le client voit en premier dans le catalogue.',
      ListingSection.description => 'Ce que le client lit sur la fiche : la description et les points forts de l’offre.',
      ListingSection.images => 'La couverture du catalogue et les images supplémentaires de la fiche.',
      ListingSection.prix => 'Le prix payé par le client, une offre gratuite, ou une promotion avec compte à rebours.',
      ListingSection.livraison => kind == 'service'
          ? 'Le délai, les retouches incluses et les questions posées au client.'
          : 'Les fichiers que le client reçoit au paiement, et ceux que vous offrez en aperçu gratuit.',
    };

IconData sectionIcon(ListingSection s) => switch (s) {
      ListingSection.informations => LucideIcons.package,
      ListingSection.description => LucideIcons.fileText,
      ListingSection.images => LucideIcons.image,
      ListingSection.prix => LucideIcons.tag,
      ListingSection.livraison => LucideIcons.truck,
    };

/// What each section holds right now, in a line, and whether it is complete ("Configuré" or "À compléter").
({String text, bool done}) sectionSummary(ListingSection s, Listing l) {
  switch (s) {
    case ListingSection.informations:
      return (text: l.summary.isNotEmpty ? l.summary : 'Pas de résumé', done: l.title.trim().isNotEmpty && l.summary.trim().isNotEmpty);
    case ListingSection.description:
      final d = l.description.trim();
      return (
        text: [
          d.isNotEmpty ? '${d.length > 60 ? d.substring(0, 60) : d}${d.length > 60 ? '…' : ''}' : 'Pas de description',
          if (l.features.isNotEmpty) plural(l.features.length, 'point fort'),
        ].join(' · '),
        done: d.isNotEmpty,
      );
    case ListingSection.images:
      return (
        text: l.coverImage.isNotEmpty ? 'Couverture${l.galleryCount > 0 ? ' · ${plural(l.galleryCount, 'image')} en plus' : ''}' : 'Pas de couverture',
        done: l.coverImage.isNotEmpty,
      );
    case ListingSection.prix:
      final promo = l.promo != null
          ? ' · promotion jusqu’au ${formatDate(l.promo!.endsAt)}'
          : l.compareAtXaf != null
              ? ' · ancien prix ${formatPrice(l.compareAtXaf!)}'
              : '';
      return (text: '${formatPrice(l.priceXaf)}$promo', done: true);
    case ListingSection.livraison:
      if (l.kind == 'service') {
        return (
          text: [
            if (l.deliveryDays != null) plural(l.deliveryDays!, 'jour'),
            plural(l.revisions ?? 0, 'retouche'),
            if (l.briefQuestions?.isNotEmpty ?? false) plural(l.briefQuestions!.length, 'question'),
          ].join(' · '),
          done: (l.deliveryDays ?? 0) > 0,
        );
      }
      final files = filesOf(l.file);
      final samples = files.where((f) => f.preview).length;
      return (
        text: files.isEmpty
            ? 'Aucun fichier'
            : [plural(files.length, 'fichier'), if (samples > 0) plural(samples, 'aperçu gratuit', 'aperçus gratuits')].join(' · '),
        done: files.isNotEmpty && files.every((f) => f.fileId != null),
      );
  }
}

/// The first thing to fix before saving an existing offer, and the section it is in.
({ListingSection section, String message})? firstProblem(ListingForm f) {
  final info = f.stepError(1);
  if (info != null) return (section: info.contains('inclus') ? ListingSection.description : ListingSection.informations, message: info);
  final delivery = f.stepError(2);
  if (delivery != null) return (section: ListingSection.livraison, message: delivery);
  if (f.coverImage.trim().isEmpty) return (section: ListingSection.images, message: 'Ajoutez une image de couverture.');
  final price = f.stepError(3);
  if (price != null) return (section: ListingSection.prix, message: price);
  return null;
}

// ---------------------------------------------------------------- fields

Widget _gap([double h = 14]) => SizedBox(height: h);

/// Title and summary (what the client sees first in the catalogue).
class ListingInfoFields extends StatelessWidget {
  final ListingForm form;
  const ListingInfoFields({super.key, required this.form});

  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SField(
            label: 'Titre de l’offre',
            hint: '${form.title.text.length} / ${ListingLimits.title}',
            child: TextField(
              controller: form.title,
              maxLength: ListingLimits.title,
              decoration: const InputDecoration(hintText: 'Ex. : Création de logo professionnel vectorisé', counterText: ''),
            ),
          ),
          _gap(),
          SField(
            label: 'Résumé en une phrase',
            hint: '${form.summary.text.length} / ${ListingLimits.summary}',
            child: TextField(
              controller: form.summary,
              maxLength: ListingLimits.summary,
              decoration: const InputDecoration(hintText: 'Ex. : Un logo moderne livré avec déclinaisons et fichiers sources.', counterText: ''),
            ),
          ),
        ],
      );
}

/// The category, among those of the offer's kind.
class ListingCategoryField extends StatelessWidget {
  final ListingForm form;
  const ListingCategoryField({super.key, required this.form});

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    return SField(
      label: 'Catégorie',
      child: Wrap(
        spacing: 8,
        runSpacing: 8,
        children: [
          for (final c in categoriesConfig.where((c) => c.kind == form.kind))
            ChoiceChip(
              label: Text(c.label),
              selected: form.category == c.id,
              showCheckmark: false,
              selectedColor: colors.accent,
              backgroundColor: colors.surface,
              labelStyle: SalacopeTypography.body.copyWith(
                color: form.category == c.id ? colors.onAccent : colors.textPrimary,
                fontWeight: FontWeight.w600,
              ),
              side: BorderSide(color: form.category == c.id ? colors.accent : colors.gray200),
              shape: const StadiumBorder(),
              onSelected: (v) {
                if (v) form.update(() => form.category = c.id);
              },
            ),
        ],
      ),
    );
  }
}

/// The description and the "what is included" lines.
class ListingDescriptionFields extends StatelessWidget {
  final ListingForm form;
  const ListingDescriptionFields({super.key, required this.form});

  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SField(
            label: 'Description détaillée',
            hint: '${form.description.text.length} / ${ListingLimits.description}',
            child: TextField(
              controller: form.description,
              maxLines: 6,
              maxLength: ListingLimits.description,
              decoration: const InputDecoration(
                hintText: 'Expliquez en détail ce que vous proposez, les étapes et les livrables…',
                counterText: '',
              ),
            ),
          ),
          _gap(),
          SField(
            label: 'Ce qui est inclus',
            hint: 'Une puce par ligne, ${ListingLimits.features} max.',
            child: TextField(
              controller: form.features,
              maxLines: 5,
              decoration: const InputDecoration(
                hintText: 'Fichiers PNG et PDF haute définition\nFichier source vectoriel AI / SVG\nCession des droits d’utilisation',
              ),
            ),
          ),
        ],
      );
}

/// The cover of the catalogue.
class ListingImagesFields extends StatelessWidget {
  final ListingForm form;
  const ListingImagesFields({super.key, required this.form});

  Future<void> _pick(BuildContext context) async {
    try {
      final dataUrl = await pickAndCompressImage(maxSide: 1200, maxBytes: 400000);
      if (dataUrl != null) form.update(() => form.coverImage = dataUrl);
    } catch (e) {
      if (context.mounted) SToast.error(context, e.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final cover = form.coverImage;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('Image de couverture', style: SalacopeTypography.label.copyWith(color: colors.gray900, fontWeight: FontWeight.w600)),
        _gap(8),
        ClipRRect(
          borderRadius: BorderRadius.circular(SalacopeTokens.radiusXl),
          child: Container(
            height: 180,
            color: colors.gray100,
            child: cover.isNotEmpty
                ? SImage(url: cover, fit: BoxFit.contain)
                : Center(child: Icon(LucideIcons.imagePlus, size: 32, color: colors.textMuted)),
          ),
        ),
        _gap(8),
        Row(
          children: [
            Expanded(
              child: SButton(
                label: cover.isNotEmpty ? 'Changer d’image' : 'Importer une image',
                variant: SButtonVariant.secondary,
                size: SButtonSize.sm,
                icon: const Icon(LucideIcons.imagePlus, size: 14),
                onPressed: () => _pick(context),
              ),
            ),
            if (cover.isNotEmpty) ...[
              const SizedBox(width: 8),
              SButton(label: 'Retirer', variant: SButtonVariant.ghost, size: SButtonSize.sm, onPressed: () => form.update(() => form.coverImage = '')),
            ],
          ],
        ),
      ],
    );
  }
}

class _Check extends StatelessWidget {
  final bool value;
  final ValueChanged<bool> onChanged;
  final String title;
  final String hint;
  const _Check({required this.value, required this.onChanged, required this.title, required this.hint});

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    return InkWell(
      onTap: () => onChanged(!value),
      borderRadius: SalacopeTokens.borderLg,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(
              width: 32,
              height: 24,
              child: Checkbox(value: value, activeColor: colors.accent, checkColor: colors.onAccent, onChanged: (v) => onChanged(v ?? false)),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: SalacopeTypography.bodyStrong.copyWith(color: colors.gray900)),
                  Text(hint, style: SalacopeTypography.caption.copyWith(color: colors.gray500)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

String _inDays(int n) => DateTime.now().add(Duration(days: n)).toUtc().toIso8601String();

/// The price, a free offer, and a promotion: the former price struck through (the price above is then the promotional one) and,
/// if the seller wants, a countdown at the top of the offer. When it ends the price goes back to the former one.
class ListingPriceFields extends StatelessWidget {
  final ListingForm form;
  const ListingPriceFields({super.key, required this.form});

  Future<void> _pickEnd(BuildContext context) async {
    final now = DateTime.now();
    final current = form.promoEndsAt == null ? null : DateTime.tryParse(form.promoEndsAt!)?.toLocal();
    final day = await showDatePicker(
      context: context,
      initialDate: current ?? now.add(const Duration(days: 3)),
      firstDate: now,
      lastDate: now.add(Duration(days: PlatformConfig.promoMaxDays)),
    );
    if (day == null || !context.mounted) return;
    final time = await showTimePicker(context: context, initialTime: TimeOfDay.fromDateTime(current ?? now));
    if (time == null) return;
    form.update(() => form.promoEndsAt = DateTime(day.year, day.month, day.day, time.hour, time.minute).toUtc().toIso8601String());
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final minimum = minPriceFor(form.kind);
    final price = form.priceXaf;
    final compareAt = form.compareAtXaf;
    final off = compareAt != null && price >= 0 && compareAt > price ? ((1 - price / compareAt) * 100).round() : 0;
    final compareError = compareAt != null && compareAt <= price ? 'Doit être plus élevé que le prix de vente.' : null;
    final timed = form.promoEndsAt != null;
    final dateError = promoError(form.promoEndsAt, compareAt);
    final caption = SalacopeTypography.caption.copyWith(color: colors.gray500);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SField(
          label: 'Prix de vente',
          hint: form.free
              ? 'Gratuit : aucun paiement. Avec une promotion, l’offre est gratuite jusqu’à la fin du compte à rebours puis repasse à l’ancien prix.'
              : 'Minimum $minimum FCFA.',
          child: TextField(
            controller: form.price,
            enabled: !form.free,
            keyboardType: TextInputType.number,
            decoration: InputDecoration(hintText: form.free ? '0' : '5 000', suffixText: 'FCFA'),
          ),
        ),
        if (PlatformConfig.freeOffers || form.free) ...[
          _gap(10),
          _Check(
            value: form.free,
            onChanged: (v) => form.update(() {
              form.free = v;
              if (v) form.price.text = '';
            }),
            title: 'Offre gratuite',
            hint: 'Le client l’obtient sans payer. Idéal pour un cadeau ou pour attirer des clients ; combinez-la avec une promotion pour la rendre gratuite un temps seulement.',
          ),
        ],
        _gap(16),
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(borderRadius: BorderRadius.circular(SalacopeTokens.radiusXl), border: Border.all(color: colors.gray200)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _Check(
                value: form.promo,
                onChanged: (v) => form.update(() {
                  form.promo = v;
                  if (!v) {
                    form.compareAt.text = '';
                    form.promoEndsAt = null;
                  }
                }),
                title: 'Activer une promotion',
                hint: 'Affichez une réduction : l’ancien prix barré, avec le pourcentage. Le prix ci-dessus devient le prix promotionnel.',
              ),
              if (form.promo) ...[
                _gap(),
                SField(
                  label: 'Prix barré (ancien prix)',
                  error: compareError,
                  hint: off > 0 ? 'Réduction affichée : −$off %.' : 'Le prix normal, plus élevé que le prix de vente.',
                  child: TextField(
                    controller: form.compareAt,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(hintText: '8 000', suffixText: 'FCFA'),
                  ),
                ),
                _gap(),
                _Check(
                  value: timed,
                  onChanged: (v) => form.update(() => form.promoEndsAt = v ? _inDays(3) : null),
                  title: 'Compte à rebours',
                  hint:
                      'Une horloge s’affiche en haut de l’offre jusqu’à la fin de la promotion (${PlatformConfig.promoMaxDays} jours au plus). Mettez la pression : après la fin, le prix repasse à l’ancien prix.',
                ),
                if (timed) ...[
                  _gap(10),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      for (final (label, days) in const [('24 h', 1), ('3 jours', 3), ('7 jours', 7)])
                        if (days <= PlatformConfig.promoMaxDays)
                          SButton(
                            label: label,
                            variant: SButtonVariant.secondary,
                            size: SButtonSize.sm,
                            pill: true,
                            onPressed: () => form.update(() => form.promoEndsAt = _inDays(days)),
                          ),
                    ],
                  ),
                  _gap(10),
                  SField(
                    label: 'Fin de la promotion',
                    error: dateError,
                    child: InkWell(
                      onTap: () => _pickEnd(context),
                      borderRadius: SalacopeTokens.borderLg,
                      child: InputDecorator(
                        decoration: const InputDecoration(suffixIcon: Icon(LucideIcons.calendarClock, size: 18)),
                        child: Text(formatDateTime(form.promoEndsAt), style: SalacopeTypography.body.copyWith(color: colors.gray900)),
                      ),
                    ),
                  ),
                  if (dateError == null && compareAt != null) ...[
                    _gap(8),
                    Row(
                      children: [
                        Icon(LucideIcons.timer, size: 14, color: colors.gray500),
                        const SizedBox(width: 6),
                        Expanded(child: Text('À la fin, l’offre repasse à ${formatXaf(compareAt)}.', style: caption)),
                      ],
                    ),
                  ],
                ],
              ],
            ],
          ),
        ),
      ],
    );
  }
}

/// How the offer is delivered: delay, revisions and brief for a service; the files for a digital product.
class ListingDeliveryFields extends StatelessWidget {
  final ListingForm form;
  final String? listingId;
  final Future<String> Function()? openDraft;
  const ListingDeliveryFields({super.key, required this.form, this.listingId, this.openDraft});

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    if (form.kind != 'service') {
      return ProductFilesField(
        files: form.files,
        listingId: listingId,
        openDraft: openDraft,
        onChanged: (next) => form.update(() => form.files = next),
      );
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(
              child: SField(
                label: 'Délai de livraison',
                hint: 'À compter de l\'acceptation.',
                child: DropdownButtonFormField<int>(
                  initialValue: form.deliveryDays,
                  dropdownColor: colors.surface,
                  items: {1, 2, 3, 5, 7, 10, 14, 21, 30, 45, 60, 90, form.deliveryDays}
                      .toList()
                      .map((d) => DropdownMenuItem(value: d, child: Text('$d jour${d > 1 ? 's' : ''}')))
                      .toList()
                    ..sort((a, b) => a.value!.compareTo(b.value!)),
                  onChanged: (v) {
                    if (v != null) form.update(() => form.deliveryDays = v);
                  },
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: SField(
                label: 'Retouches incluses',
                child: DropdownButtonFormField<int>(
                  initialValue: form.revisions.clamp(0, PlatformConfig.maxRevisions),
                  dropdownColor: colors.surface,
                  items: [
                    for (var r = 0; r <= PlatformConfig.maxRevisions; r++)
                      DropdownMenuItem(value: r, child: Text(r == 0 ? 'Aucune' : '$r retouche${r > 1 ? 's' : ''}')),
                  ],
                  onChanged: (v) {
                    if (v != null) form.update(() => form.revisions = v);
                  },
                ),
              ),
            ),
          ],
        ),
        _gap(16),
        Text('Brief demandé au client', style: SalacopeTypography.bodyStrong.copyWith(color: colors.textPrimary)),
        _gap(4),
        Text(
          'Il y répond en payant : vous avez tout pour démarrer, sans aller-retour.',
          style: SalacopeTypography.caption.copyWith(color: colors.textMuted),
        ),
        _gap(12),
        for (final (i, q) in form.briefQuestions.indexed)
          _BriefQuestionCard(
            key: ValueKey(q.id),
            index: i,
            question: q,
            onChanged: (next) => form.update(() => form.briefQuestions[i] = next),
            onRemove: () => form.update(() => form.briefQuestions.removeAt(i)),
          ),
        if (form.briefQuestions.length < maxBriefQuestions)
          Align(
            alignment: Alignment.centerLeft,
            child: SButton(
              label: 'Ajouter une question',
              variant: SButtonVariant.secondary,
              size: SButtonSize.md,
              pill: true,
              icon: const Icon(LucideIcons.plus, size: 16),
              onPressed: () => form.update(
                () => form.briefQuestions.add(BriefQuestionInput(id: 'q_${DateTime.now().millisecondsSinceEpoch}', label: '', required: true)),
              ),
            ),
          ),
      ],
    );
  }
}

/// One question of the brief, in its own card: the question, whether an answer is required, remove.
class _BriefQuestionCard extends StatelessWidget {
  final int index;
  final BriefQuestionInput question;
  final ValueChanged<BriefQuestionInput> onChanged;
  final VoidCallback onRemove;

  const _BriefQuestionCard({super.key, required this.index, required this.question, required this.onChanged, required this.onRemove});

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.fromLTRB(14, 6, 6, 6),
      decoration: BoxDecoration(
        color: colors.surface,
        borderRadius: SalacopeTokens.borderLg,
        border: Border.all(color: colors.gray200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(child: Text('Question ${index + 1}', style: SalacopeTypography.small.copyWith(color: colors.textMuted))),
              IconButton(tooltip: 'Retirer', icon: Icon(LucideIcons.trash2, size: 16, color: colors.textMuted), onPressed: onRemove),
            ],
          ),
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: TextFormField(
              initialValue: question.label,
              maxLength: 120,
              minLines: 1,
              maxLines: 3,
              style: SalacopeTypography.body.copyWith(color: colors.textPrimary),
              decoration: InputDecoration(
                hintText: 'Ex. Quel est le nom de votre marque ?',
                hintStyle: SalacopeTypography.body.copyWith(color: colors.gray400),
                border: InputBorder.none,
                isDense: true,
                counterText: '',
                contentPadding: const EdgeInsets.symmetric(vertical: 4),
              ),
              onChanged: (v) => onChanged(BriefQuestionInput(id: question.id, label: v, required: question.required)),
            ),
          ),
          Row(
            children: [
              Expanded(child: Text('Réponse obligatoire', style: SalacopeTypography.caption.copyWith(color: colors.textSecondary))),
              Switch.adaptive(
                value: question.required,
                activeTrackColor: colors.accent,
                onChanged: (v) => onChanged(BriefQuestionInput(id: question.id, label: question.label, required: v)),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
