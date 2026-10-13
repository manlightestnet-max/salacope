import 'package:flutter/material.dart';
import '../../../listings/presentation/product_file_field.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:salacope/core/config/platform.dart';
import 'package:salacope/core/db/store.dart';
import 'package:salacope/features/catalog/domain/catalog_model.dart';
import 'package:salacope/core/design/colors.dart';
import 'package:salacope/core/design/tokens.dart';
import 'package:salacope/core/design/typography.dart';
import 'package:salacope/core/domain/listings.dart';
import 'package:salacope/core/lib/format.dart';
import 'package:salacope/core/lib/image.dart';
import 'package:salacope/core/ui/s_button.dart';
import 'package:salacope/core/ui/s_empty_state.dart';
import 'package:salacope/core/ui/s_field.dart';
import 'package:salacope/core/ui/s_image.dart';
import 'package:salacope/core/ui/s_page.dart';
import 'package:salacope/core/ui/s_panel.dart';
import 'package:salacope/core/ui/s_toast.dart';
import 'package:salacope/features/listings/data/listings_api.dart';


class ListingEditorScreen extends StatefulWidget {
  final String? listingId;

  const ListingEditorScreen({super.key, this.listingId});

  @override
  State<ListingEditorScreen> createState() => _ListingEditorScreenState();
}

class _ListingEditorScreenState extends State<ListingEditorScreen> {
  int _currentStep = 0;
  bool _saving = false;

  // Form state
  String _kind = 'digital'; // digital | service
  String _category = 'ebook';
  final _titleCtrl = TextEditingController();
  final _summaryCtrl = TextEditingController();
  final _descriptionCtrl = TextEditingController();
  final _featuresCtrl = TextEditingController();
  final _priceCtrl = TextEditingController();
  final _compareAtCtrl = TextEditingController();
  String _coverImage = '';

  // Service fields
  int _deliveryDays = 3;
  int _revisions = 1;
  final List<BriefQuestionInput> _briefQuestions = [];

  // Digital fields: the file itself, sent to storage (never just a name).
  ProductFileValue _file = const ProductFileValue();

  @override
  void initState() {
    super.initState();
    _loadExistingListing();
  }

  void _loadExistingListing() {
    if (widget.listingId == null) return;
    final l = db.listings.where((x) => x.id == widget.listingId).firstOrNull;
    if (l == null) return;

    _kind = l.kind;
    _category = l.category;
    _titleCtrl.text = l.title;
    _summaryCtrl.text = l.summary;
    _descriptionCtrl.text = l.description;
    _featuresCtrl.text = l.features.join('\n');
    _priceCtrl.text = '${l.priceXaf}';
    if (l.compareAtXaf != null) {
      _compareAtCtrl.text = '${l.compareAtXaf}';
    }
    _coverImage = l.coverImage;
    if (l.deliveryDays != null) _deliveryDays = l.deliveryDays!;
    if (l.revisions != null) _revisions = l.revisions!;
    if (l.briefQuestions != null) {
      _briefQuestions.addAll(l.briefQuestions!.map((q) => BriefQuestionInput(
            id: q.id,
            label: q.label,
            required: q.required,
          )));
    }
    if (l.file != null) {
      _file = ProductFileValue(fileId: l.file!.fileId, name: l.file!.name, size: l.file!.size, format: l.file!.format.isEmpty ? 'PDF' : l.file!.format);
    }
  }

  @override
  void dispose() {
    _titleCtrl.dispose();
    _summaryCtrl.dispose();
    _descriptionCtrl.dispose();
    _featuresCtrl.dispose();
    _priceCtrl.dispose();
    _compareAtCtrl.dispose();
    super.dispose();
  }

  ListingInput _buildInput() {
    final features = _featuresCtrl.text
        .split('\n')
        .map((f) => f.trim())
        .where((f) => f.isNotEmpty)
        .toList();

    final price = int.tryParse(_priceCtrl.text.trim()) ?? 0;
    final compareAt = int.tryParse(_compareAtCtrl.text.trim());

    return ListingInput(
      kind: _kind,
      category: _category,
      title: _titleCtrl.text.trim(),
      summary: _summaryCtrl.text.trim(),
      description: _descriptionCtrl.text.trim(),
      features: features,
      priceXaf: price,
      compareAtXaf: compareAt,
      coverImage: _coverImage.trim(),
      deliveryDays: _kind == 'service' ? _deliveryDays : null,
      revisions: _kind == 'service' ? _revisions : null,
      briefQuestions: _kind == 'service' ? _briefQuestions : null,
      fileName: _kind == 'digital' ? _file.name : null,
      fileFormat: _kind == 'digital' ? _file.format : null,
      fileId: _kind == 'digital' ? _file.fileId : null,
      fileSize: _kind == 'digital' ? _file.size : null,
    );
  }

  String? _stepError(int step) {
    final input = _buildInput();
    if (step == 0) {
      return null;
    }
    if (step == 1) {
      if (input.title.length < 8) return 'Le titre doit faire au moins 8 caractères.';
      if (input.title.length > ListingLimits.title) return 'Le titre dépasse ${ListingLimits.title} caractères.';
      if (input.summary.isEmpty) return 'Ajoutez un résumé en une phrase.';
      if (input.summary.length > ListingLimits.summary) return 'Le résumé dépasse ${ListingLimits.summary} caractères.';
      final fErr = featuresError(input.features);
      if (fErr != null) return fErr;
    }
    if (step == 2) {
      if (input.kind == 'service' && (input.deliveryDays == null || input.deliveryDays! < 1)) {
        return 'Indiquez un délai de livraison valide (1 à 90 jours).';
      }
      if (input.kind == 'digital' && input.fileId == null) {
        return 'Envoyez le fichier livré au client.';
      }
    }
    if (step == 3) {
      if (input.coverImage.isEmpty) return 'Veuillez ajouter une image de couverture.';
      if (input.priceXaf < PlatformConfig.minPriceXaf) {
        return 'Le prix minimum est de ${PlatformConfig.minPriceXaf} FCFA.';
      }
      if (input.compareAtXaf != null && input.compareAtXaf! <= input.priceXaf) {
        return 'Le prix barré doit être plus élevé que le prix de vente.';
      }
    }
    return null;
  }

  void _nextStep() {
    final err = _stepError(_currentStep);
    if (err != null) {
      SToast.show(context, message: err, variant: SToastVariant.danger);
      return;
    }
    setState(() => _currentStep = (_currentStep + 1).clamp(0, 4));
  }

  Future<void> _submit(bool publish) async {
    final input = _buildInput();
    try {
      validateListing(input);
    } catch (e) {
      SToast.show(context, message: e.toString(), variant: SToastVariant.danger);
      return;
    }

    setState(() => _saving = true);
    try {
      if (widget.listingId != null) {
        await listingsApi.updateListing(widget.listingId!, input);
        if (publish) {
          await listingsApi.setListingStatus(widget.listingId!, 'published');
        }
      } else {
        await listingsApi.createListing(input, publish);
      }

      if (mounted) {
        SToast.show(
          context,
          message: publish ? 'Offre publiée avec succès !' : 'Brouillon enregistré',
          variant: SToastVariant.success,
        );
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        SToast.show(context, message: e.toString(), variant: SToastVariant.danger);
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _pickCoverImage() async {
    try {
      final dataUrl = await pickAndCompressImage(maxSide: 1200, maxBytes: 400000);
      if (dataUrl != null) {
        setState(() => _coverImage = dataUrl);
      }
    } catch (e) {
      if (mounted) {
        SToast.error(context, e.toString());
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final user = db.user;
    final isNew = widget.listingId == null;

    if (user == null || user.merchant == null) {
      return Scaffold(
        backgroundColor: colors.canvas,
        appBar: AppBar(backgroundColor: colors.canvas, leading: const BackButton()),
        body: const Center(
          child: SEmptyState(
            title: 'Boutique requise',
            description: 'Vous devez avoir une boutique pour créer une offre.',
          ),
        ),
      );
    }

    final steps = ['Type', 'Présentation', 'Livraison', 'Couverture & Prix', 'Vérification'];

    return SPage(
      title: isNew ? 'Nouvelle offre' : 'Modifier l’offre',
      leading: const BackButton(),
      actions: [
        if (_saving)
          const Padding(
            padding: EdgeInsets.all(12),
            child: SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
          )
        else if (_currentStep == 4)
          SButton(
            label: 'Publier',
            variant: SButtonVariant.primary,
            size: SButtonSize.sm,
            pill: true,
            onPressed: () => _submit(true),
          ),
      ],
      toolbar: PreferredSize(
        preferredSize: const Size.fromHeight(48),
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Row(
            children: List.generate(steps.length, (i) {
              final active = i == _currentStep;
              final done = i < _currentStep;
              return Padding(
                padding: const EdgeInsets.only(right: 6),
                child: InkWell(
                  onTap: () {
                    if (i < _currentStep) {
                      setState(() => _currentStep = i);
                    } else if (i == _currentStep + 1) {
                      _nextStep();
                    }
                  },
                  borderRadius: BorderRadius.circular(999),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: active ? colors.accent : colors.surface,
                      borderRadius: BorderRadius.circular(999),
                      border: Border.all(
                        color: active ? colors.accent : colors.canvasBorder,
                        width: 0.8,
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (done)
                          Icon(LucideIcons.check, size: 12, color: colors.accent)
                        else
                          Text(
                            '${i + 1}. ',
                            style: TextStyle(
                              color: active ? colors.onAccent : colors.textMuted,
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        Text(
                          steps[i],
                          style: TextStyle(
                            color: active ? colors.onAccent : colors.textPrimary,
                            fontSize: 12.5,
                            fontWeight: active ? FontWeight.w600 : FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            }),
          ),
        ),
      ),
      slivers: [
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (_currentStep == 0) _buildStep0Type(context),
                if (_currentStep == 1) _buildStep1Presentation(context),
                if (_currentStep == 2) _buildStep2Delivery(context),
                if (_currentStep == 3) _buildStep3CoverPrice(context),
                if (_currentStep == 4) _buildStep4Review(context, user.merchant!.storeName),
                const SizedBox(height: 24),
                Row(
                  children: [
                    if (_currentStep > 0)
                      Expanded(
                        child: SButton(
                          label: 'Précédent',
                          variant: SButtonVariant.secondary,
                          onPressed: () => setState(() => _currentStep--),
                        ),
                      ),
                    if (_currentStep > 0) const SizedBox(width: 12),
                    if (_currentStep < 4)
                      Expanded(
                        child: SButton(
                          label: 'Suivant',
                          variant: SButtonVariant.primary,
                          onPressed: _nextStep,
                        ),
                      )
                    else
                      Expanded(
                        child: SButton(
                          label: 'Enregistrer le brouillon',
                          variant: SButtonVariant.secondary,
                          onPressed: () => _submit(false),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 32),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildStep0Type(BuildContext context) {
    final colors = context.colors;
    final isNew = widget.listingId == null;
    final allowedCategories = categoriesConfig.where((c) => c.kind == _kind).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SPanel(
          titleText: 'Type d’offre',
          descriptionText: 'Ce que vous vendez : un fichier livré au paiement, ou un service.',
          child: Column(
            children: [
              Row(
                children: [
                  Expanded(
                    child: _SelectCard(
                      selected: _kind == 'digital',
                      enabled: isNew,
                      icon: LucideIcons.download,
                      title: 'Produit numérique',
                      subtitle: 'Livré automatiquement dès le paiement.',
                      onTap: () {
                        setState(() {
                          _kind = 'digital';
                          _category = 'ebook';
                        });
                      },
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _SelectCard(
                      selected: _kind == 'service',
                      enabled: isNew,
                      icon: LucideIcons.wrench,
                      title: 'Service',
                      subtitle: 'Vous effectuez le travail dans un délai fixé.',
                      onTap: () {
                        setState(() {
                          _kind = 'service';
                          _category = 'service';
                        });
                      },
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Align(
                alignment: Alignment.centerLeft,
                child: Text('Catégorie', style: SalacopeTypography.bodyStrong),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: allowedCategories.map((c) {
                  final active = _category == c.id;
                  return ChoiceChip(
                    label: Text(c.label),
                    selected: active,
                    selectedColor: colors.accent,
                    backgroundColor: colors.surface,
                    labelStyle: TextStyle(
                      color: active ? colors.onAccent : colors.textPrimary,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                    onSelected: (val) {
                      if (val) setState(() => _category = c.id);
                    },
                  );
                }).toList(),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildStep1Presentation(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SPanel(
          titleText: 'Présentation de l’offre',
          descriptionText: 'Donnez envie à vos clients avec des informations claires.',
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              SField(
                label: 'Titre de l’offre',
                hint: '${_titleCtrl.text.length} / ${ListingLimits.title}',
                child: TextField(
                  controller: _titleCtrl,
                  maxLength: ListingLimits.title,
                  decoration: const InputDecoration(
                    hintText: 'Ex. : Création de logo professionnel vectorisé',
                    counterText: '',
                  ),
                  onChanged: (_) => setState(() {}),
                ),
              ),
              const SizedBox(height: 14),
              SField(
                label: 'Résumé en une phrase',
                hint: '${_summaryCtrl.text.length} / ${ListingLimits.summary}',
                child: TextField(
                  controller: _summaryCtrl,
                  maxLength: ListingLimits.summary,
                  decoration: const InputDecoration(
                    hintText: 'Ex. : Un logo moderne livré avec déclinaisons et fichiers sources.',
                    counterText: '',
                  ),
                  onChanged: (_) => setState(() {}),
                ),
              ),
              const SizedBox(height: 14),
              SField(
                label: 'Description détaillée',
                hint: '${_descriptionCtrl.text.length} / ${ListingLimits.description}',
                child: TextField(
                  controller: _descriptionCtrl,
                  maxLines: 5,
                  maxLength: ListingLimits.description,
                  decoration: const InputDecoration(
                    hintText: 'Expliquez en détail ce que vous proposez, les étapes et les livrables…',
                    counterText: '',
                  ),
                  onChanged: (_) => setState(() {}),
                ),
              ),
              const SizedBox(height: 14),
              SField(
                label: 'Ce qui est inclus',
                hint: 'Une puce par ligne, 12 max. Évitez les puces vides.',
                child: TextField(
                  controller: _featuresCtrl,
                  maxLines: 4,
                  decoration: const InputDecoration(
                    hintText: 'Fichiers PNG et PDF haute définition\nFichier source vectoriel AI / SVG\nCession des droits d’utilisation',
                  ),
                  onChanged: (_) => setState(() {}),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildStep2Delivery(BuildContext context) {
    final colors = context.colors;

    if (_kind == 'service') {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SPanel(
            titleText: 'Livraison du service',
            descriptionText: 'Fixez votre délai de réalisation et les questions pour le client.',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: SField(
                        label: 'Délai de livraison (jours)',
                        child: DropdownButtonFormField<int>(
                          initialValue: _deliveryDays,
                          dropdownColor: colors.surface,
                          items: [1, 2, 3, 5, 7, 10, 14, 21, 30, 45, 60]
                              .map((d) => DropdownMenuItem(value: d, child: Text('$d jour${d > 1 ? "s" : ""}')))
                              .toList(),
                          onChanged: (v) {
                            if (v != null) setState(() => _deliveryDays = v);
                          },
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: SField(
                        label: 'Retouches incluses',
                        child: DropdownButtonFormField<int>(
                          initialValue: _revisions,
                          dropdownColor: colors.surface,
                          items: List.generate(PlatformConfig.maxRevisions + 1, (i) => i)
                              .map((r) => DropdownMenuItem(
                                    value: r,
                                    child: Text(r == 0 ? 'Aucune' : '$r retouche${r > 1 ? "s" : ""}'),
                                  ))
                              .toList(),
                          onChanged: (v) {
                            if (v != null) setState(() => _revisions = v);
                          },
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Questions du brief au client', style: SalacopeTypography.bodyStrong),
                    if (_briefQuestions.length < maxBriefQuestions)
                      InkWell(
                        onTap: () {
                          setState(() {
                            _briefQuestions.add(BriefQuestionInput(
                              id: 'q_${DateTime.now().millisecondsSinceEpoch}',
                              label: '',
                              required: true,
                            ));
                          });
                        },
                        child: Text(
                          '+ Ajouter',
                          style: TextStyle(color: colors.accent, fontSize: 13, fontWeight: FontWeight.w600),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 8),
                if (_briefQuestions.isEmpty)
                  Text(
                    'Aucune question. Le client commandera directement sans questionnaire préalable.',
                    style: SalacopeTypography.caption.copyWith(color: colors.textMuted),
                  )
                else
                  Column(
                    children: _briefQuestions.asMap().entries.map((entry) {
                      final idx = entry.key;
                      final q = entry.value;
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Row(
                          children: [
                            Expanded(
                              child: TextFormField(
                                initialValue: q.label,
                                maxLength: 120,
                                decoration: InputDecoration(
                                  hintText: 'Ex. : Quel est le nom de votre marque ?',
                                  counterText: '',
                                  isDense: true,
                                ),
                                onChanged: (val) {
                                  _briefQuestions[idx] = BriefQuestionInput(
                                    id: q.id,
                                    label: val,
                                    required: q.required,
                                  );
                                },
                              ),
                            ),
                            const SizedBox(width: 8),
                            InkWell(
                              onTap: () {
                                setState(() {
                                  _briefQuestions[idx] = BriefQuestionInput(
                                    id: q.id,
                                    label: q.label,
                                    required: !q.required,
                                  );
                                });
                              },
                              child: Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 4),
                                child: Text(
                                  q.required ? 'Obligatoire' : 'Facultatif',
                                  style: TextStyle(
                                    fontSize: 11,
                                    color: q.required ? colors.accent : colors.textMuted,
                                    fontWeight: q.required ? FontWeight.w600 : FontWeight.normal,
                                  ),
                                ),
                              ),
                            ),
                            IconButton(
                              icon: Icon(LucideIcons.trash2, size: 16, color: colors.textMuted),
                              onPressed: () {
                                setState(() => _briefQuestions.removeAt(idx));
                              },
                            ),
                          ],
                        ),
                      );
                    }).toList(),
                  ),
              ],
            ),
          ),
        ],
      );
    } else {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SPanel(
            titleText: 'Fichier livré',
            descriptionText: 'Envoyé sur notre stockage sécurisé, téléchargé par le client après paiement.',
            child: ProductFileField(
              value: _file,
              listingId: widget.listingId,
              onChanged: (v) => setState(() => _file = v),
            ),
          ),
        ],
      );
    }
  }

  Widget _buildStep3CoverPrice(BuildContext context) {
    final colors = context.colors;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SPanel(
          titleText: 'Image de couverture & Prix',
          descriptionText: 'Soignez votre couverture : c’est elle qui attire les regards dans le catalogue.',
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Align(
                alignment: Alignment.centerLeft,
                child: Text('Image de couverture', style: SalacopeTypography.bodyStrong),
              ),
              const SizedBox(height: 8),
              if (_coverImage.isNotEmpty)
                ClipRRect(
                  borderRadius: BorderRadius.circular(SalacopeTokens.radiusLg),
                  child: SizedBox(
                    height: 160,
                    width: double.infinity,
                    child: SImage(url: _coverImage, fit: BoxFit.cover),
                  ),
                )
              else
                Container(
                  height: 140,
                  decoration: BoxDecoration(
                    color: colors.gray100,
                    borderRadius: BorderRadius.circular(SalacopeTokens.radiusLg),
                    border: Border.all(color: colors.canvasBorder, style: BorderStyle.solid),
                  ),
                  child: Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(LucideIcons.imagePlus, size: 32, color: colors.textMuted),
                        const SizedBox(height: 6),
                        Text('Aucune image sélectionnée', style: SalacopeTypography.caption),
                      ],
                    ),
                  ),
                ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: SButton(
                      label: _coverImage.isNotEmpty ? 'Changer d’image' : 'Importer une image',
                      variant: SButtonVariant.secondary,
                      size: SButtonSize.sm,
                      icon: const Icon(LucideIcons.imagePlus, size: 14),
                      onPressed: _pickCoverImage,
                    ),
                  ),
                  if (_coverImage.isNotEmpty) ...[
                    const SizedBox(width: 8),
                    SButton(
                      label: 'Retirer',
                      variant: SButtonVariant.ghost,
                      size: SButtonSize.sm,
                      onPressed: () => setState(() => _coverImage = ''),
                    ),
                  ],
                ],
              ),
              const SizedBox(height: 20),
              Row(
                children: [
                  Expanded(
                    child: SField(
                      label: 'Prix de vente (FCFA)',
                      child: TextField(
                        controller: _priceCtrl,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(
                          hintText: '5 000',
                          suffixText: 'FCFA',
                        ),
                        onChanged: (_) => setState(() {}),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: SField(
                      label: 'Prix barré (optionnel)',
                      hint: 'Doit être > prix de vente',
                      child: TextField(
                        controller: _compareAtCtrl,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(
                          hintText: '8 000',
                          suffixText: 'FCFA',
                        ),
                        onChanged: (_) => setState(() {}),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildStep4Review(BuildContext context, String storeName) {
    final colors = context.colors;
    final input = _buildInput();

    final checks = [
      (
        ok: input.title.length >= 8 && input.summary.isNotEmpty,
        label: 'Titre (${input.title.length} car.) et résumé',
      ),
      (
        ok: input.description.isNotEmpty,
        label: 'Description détaillée',
      ),
      (
        ok: input.features.isNotEmpty,
        label: 'Éléments inclus (${input.features.length})',
      ),
      (
        ok: _kind == 'service' ? (input.deliveryDays ?? 0) > 0 : input.fileId != null,
        label: _kind == 'service' ? 'Délai de ${input.deliveryDays} j' : 'Fichier ${input.fileName}',
      ),
      (
        ok: input.coverImage.isNotEmpty,
        label: 'Image de couverture',
      ),
      (
        ok: input.priceXaf >= PlatformConfig.minPriceXaf,
        label: 'Prix : ${formatXaf(input.priceXaf)}',
      ),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SPanel(
          titleText: 'Vérification avant publication',
          descriptionText: 'Relisez les points clés pour vous assurer que tout est parfait.',
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              ...checks.map((c) => Padding(
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    child: Row(
                      children: [
                        Icon(
                          c.ok ? LucideIcons.circleCheck : LucideIcons.circleAlert,
                          size: 16,
                          color: c.ok ? colors.accent : colors.danger,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          c.label,
                          style: TextStyle(
                            color: c.ok ? colors.textPrimary : colors.danger,
                            fontSize: 13,
                            fontWeight: c.ok ? FontWeight.normal : FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  )),
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
                      child: SizedBox(
                        width: 72,
                        height: 72,
                        child: SImage(url: input.coverImage, fit: BoxFit.cover),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '${getCategoryConfig(input.category)?.label ?? input.category} · ${_kind == "service" ? "Service" : "Produit"}',
                            style: SalacopeTypography.caption.copyWith(color: colors.textMuted, fontSize: 11),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            input.title.isNotEmpty ? input.title : 'Titre de l’offre',
                            style: SalacopeTypography.bodyStrong.copyWith(color: colors.textPrimary),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 2),
                          Text(
                            storeName,
                            style: SalacopeTypography.caption.copyWith(color: colors.textSecondary),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            formatXaf(input.priceXaf),
                            style: SalacopeTypography.bodyStrong.copyWith(color: colors.accent, fontSize: 14),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
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

  const _SelectCard({
    required this.selected,
    this.enabled = true,
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

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
          border: Border.all(
            color: selected ? colors.accent : colors.canvasBorder,
            width: selected ? 1.5 : 0.8,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, size: 20, color: selected ? colors.accent : colors.textMuted),
            const SizedBox(height: 8),
            Text(
              title,
              style: SalacopeTypography.bodyStrong.copyWith(
                color: selected ? colors.textPrimary : colors.textSecondary,
                fontSize: 13,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              subtitle,
              style: SalacopeTypography.caption.copyWith(
                color: colors.textMuted,
                fontSize: 11,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
