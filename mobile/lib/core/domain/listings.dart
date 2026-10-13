import '../api/domain_error.dart';
import '../config/platform.dart';

const int maxBriefQuestions = 6;
const List<String> categoryIds = ['ebook', 'formation', 'service', 'template', 'mentorat'];

abstract final class ListingLimits {
  static const int title = 120;
  static const int summary = 200;
  static const int description = 5000;
  static const int feature = 120;
  static const int features = 12;
  static const int price = 5000000;
}

List<String> featureLines(List<String>? features) =>
    (features ?? []).map((f) => f.trim()).where((f) => f.isNotEmpty).toList();

String? featuresError(List<String>? features) {
  final lines = featureLines(features);
  if (lines.length > ListingLimits.features) {
    return '${ListingLimits.features} éléments au maximum dans « Ce qui est inclus » (vous en avez ${lines.length}).';
  }
  for (int i = 0; i < lines.length; i++) {
    if (lines[i].length > ListingLimits.feature) {
      return 'L’élément ${i + 1} de « Ce qui est inclus » fait ${lines[i].length} caractères : ${ListingLimits.feature} au maximum.';
    }
  }
  return null;
}

class BriefQuestionInput {
  final String id;
  final String label;
  final bool required;

  const BriefQuestionInput({
    required this.id,
    required this.label,
    this.required = false,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'label': label,
        'required': required,
      };
}

class ListingInput {
  final String kind; // 'digital' | 'service'
  final String category;
  final String title;
  final String summary;
  final String description;
  final List<String> features;
  final int priceXaf;
  final int? compareAtXaf;
  final String coverImage;
  final int? deliveryDays;
  final int? revisions;
  final List<BriefQuestionInput>? briefQuestions;
  final String? fileName;
  final String? fileFormat;

  /// The uploaded file (stored on R2) and its size: a digital product is never just a file name.
  final String? fileId;
  final int? fileSize;

  const ListingInput({
    required this.kind,
    required this.category,
    required this.title,
    required this.summary,
    required this.description,
    required this.features,
    required this.priceXaf,
    this.compareAtXaf,
    required this.coverImage,
    this.deliveryDays,
    this.revisions,
    this.briefQuestions,
    this.fileName,
    this.fileFormat,
    this.fileId,
    this.fileSize,
  });

  Map<String, dynamic> toJson() => {
        'kind': kind,
        'category': category,
        'title': title,
        'summary': summary,
        'description': description,
        'features': features,
        'priceXaf': priceXaf,
        if (compareAtXaf != null) 'compareAtXaf': compareAtXaf,
        'coverImage': coverImage,
        if (deliveryDays != null) 'deliveryDays': deliveryDays,
        if (revisions != null) 'revisions': revisions,
        if (briefQuestions != null)
          'briefQuestions': briefQuestions!.map((q) => q.toJson()).toList(),
        if (fileName != null) 'fileName': fileName,
        if (fileFormat != null) 'fileFormat': fileFormat,
        if (fileId != null) 'fileId': fileId,
        if (fileSize != null) 'fileSize': fileSize,
      };
}

typedef ListingValidationInput = ListingInput;

void validateListing(ListingValidationInput input) {
  if (input.kind != 'digital' && input.kind != 'service') {
    throw const DomainError('Type d’offre invalide.');
  }
  if (!categoryIds.contains(input.category)) {
    throw const DomainError('Catégorie invalide.');
  }
  final title = input.title.trim();
  if (title.length < 8) {
    throw const DomainError('Le titre doit faire au moins 8 caractères.');
  }
  if (title.length > ListingLimits.title) {
    throw DomainError('Le titre dépasse ${ListingLimits.title} caractères.');
  }
  final summary = input.summary.trim();
  if (summary.isEmpty) {
    throw const DomainError('Ajoutez un résumé en une phrase.');
  }
  if (summary.length > ListingLimits.summary) {
    throw DomainError('Le résumé dépasse ${ListingLimits.summary} caractères.');
  }
  if (input.description.length > ListingLimits.description) {
    throw const DomainError('La description est trop longue.');
  }
  final featuresErr = featuresError(input.features);
  if (featuresErr != null) {
    throw DomainError(featuresErr);
  }
  if (input.priceXaf < PlatformConfig.minPriceXaf) {
    throw DomainError('Le prix minimum est de ${PlatformConfig.minPriceXaf} FCFA.');
  }
  if (input.priceXaf > ListingLimits.price) {
    throw const DomainError('Prix trop élevé.');
  }
  if (input.compareAtXaf != null) {
    if (input.compareAtXaf! > ListingLimits.price) {
      throw const DomainError('Prix barré invalide.');
    }
    if (input.compareAtXaf! <= input.priceXaf) {
      throw const DomainError('Le prix barré doit être plus élevé que le prix de vente.');
    }
  }
  if (input.kind == 'service' &&
      (input.deliveryDays == null || input.deliveryDays! < 1 || input.deliveryDays! > 90)) {
    throw const DomainError('Indiquez un délai de livraison en jours (1 à 90).');
  }
  if (input.kind == 'digital' && (input.fileId == null || (input.fileName?.trim().isEmpty ?? true))) {
    throw const DomainError('Envoyez le fichier livré au client.');
  }
  if (input.kind == 'service') {
    final revisions = input.revisions ?? 0;
    if (revisions < 0 || revisions > PlatformConfig.maxRevisions) {
      throw DomainError('Les retouches incluses vont de 0 à ${PlatformConfig.maxRevisions}.');
    }
    final questions = (input.briefQuestions ?? []).where((q) => q.label.trim().isNotEmpty).toList();
    if (questions.length > maxBriefQuestions) {
      throw DomainError('$maxBriefQuestions questions au maximum.');
    }
    if (questions.any((q) => q.label.trim().length > 120)) {
      throw const DomainError('Une question dépasse 120 caractères.');
    }
  }
}
