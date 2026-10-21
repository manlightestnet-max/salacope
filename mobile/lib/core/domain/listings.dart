import '../api/domain_error.dart';
import '../db/models/listing.dart';
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

  /// Promotion: former price, higher than [priceXaf]; null = no promotion.
  final int? compareAtXaf;

  /// End of a promotion shown with a countdown (ISO date); null = a lasting reduction. Always sent (null included): when the
  /// field is absent the server leaves a running promotion as it is.
  final String? promoEndsAt;
  final String coverImage;
  final int? deliveryDays;
  final int? revisions;
  final List<BriefQuestionInput>? briefQuestions;

  /// Digital: every file delivered to the buyer, in order; the seller marks the free samples with `preview`.
  final List<ListingFileItem>? files;

  const ListingInput({
    required this.kind,
    required this.category,
    required this.title,
    required this.summary,
    required this.description,
    required this.features,
    required this.priceXaf,
    this.compareAtXaf,
    this.promoEndsAt,
    required this.coverImage,
    this.deliveryDays,
    this.revisions,
    this.briefQuestions,
    this.files,
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
        'promoEndsAt': compareAtXaf != null ? promoEndsAt : null,
        'coverImage': coverImage,
        if (deliveryDays != null) 'deliveryDays': deliveryDays,
        if (revisions != null) 'revisions': revisions,
        if (briefQuestions != null)
          'briefQuestions': briefQuestions!.map((q) => q.toJson()).toList(),
        if (kind == 'digital' && files != null) 'files': files!.map((f) => f.toJson()).toList(),
      };
}

typedef ListingValidationInput = ListingInput;

/// First problem with the files of a digital product, in words the seller can act on.
String? filesError(List<ListingFileItem> files) {
  if (files.isEmpty) return 'Envoyez le fichier livré au client.';
  if (files.length > PlatformConfig.maxProductFiles) {
    return '${PlatformConfig.maxProductFiles} fichiers au maximum par produit (vous en avez ${files.length}).';
  }
  if (files.any((f) => f.fileId == null || f.name.trim().isEmpty)) {
    return 'Un des fichiers n’est pas encore envoyé : attendez la fin de l’envoi.';
  }
  if (files.map((f) => f.fileId).toSet().length != files.length) return 'Le même fichier est ajouté deux fois.';
  if (files.every((f) => f.preview)) {
    return 'Gardez au moins un fichier réservé aux acheteurs : tout ne peut pas être en aperçu gratuit.';
  }
  return null;
}

/// What is wrong with a promotion's end date (the same check runs on the server).
String? promoError(String? endsAt, int? compareAtXaf, [DateTime? now]) {
  if (endsAt == null || endsAt.isEmpty) return null;
  final end = DateTime.tryParse(endsAt);
  if (end == null) return 'Date de fin de la promotion invalide.';
  if (compareAtXaf == null || compareAtXaf == 0) return 'Une promotion avec compte à rebours demande l’ancien prix (prix barré).';
  final t = (now ?? DateTime.now()).millisecondsSinceEpoch;
  if (end.millisecondsSinceEpoch <= t + 60000) return 'La fin de la promotion doit être dans le futur.';
  if (end.millisecondsSinceEpoch > t + PlatformConfig.promoMaxDays * 86400000) {
    return 'Une promotion dure ${PlatformConfig.promoMaxDays} jours au plus.';
  }
  return null;
}

/// First problem with the price fields, in words the seller can act on (also shown under the field in the editor).
String? priceError(String kind, int priceXaf, int? compareAtXaf) {
  final minimum = minPriceFor(kind);
  // 0 is a free offer (or free during a promotion): allowed only when the administration lets sellers do it.
  if (priceXaf == 0) {
    if (!PlatformConfig.freeOffers) return 'Les offres gratuites ne sont pas autorisées : le prix minimum est de $minimum FCFA.';
  } else if (priceXaf < minimum) {
    return 'Le prix minimum est de $minimum FCFA.';
  }
  if (priceXaf > ListingLimits.price) return 'Prix trop élevé.';
  if (compareAtXaf != null) {
    if (compareAtXaf > ListingLimits.price) return 'Prix barré invalide.';
    if (compareAtXaf <= priceXaf) return 'Le prix barré doit être plus élevé que le prix de vente.';
    // Free during a promotion: the price it goes back to is a real price, so it respects the minimum.
    if (priceXaf == 0 && compareAtXaf < minimum) return 'Une offre gratuite pendant une promotion repasse à un prix d’au moins $minimum FCFA.';
  }
  return null;
}

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
  final price = priceError(input.kind, input.priceXaf, input.compareAtXaf);
  if (price != null) throw DomainError(price);
  final promo = promoError(input.promoEndsAt, input.compareAtXaf);
  if (promo != null) throw DomainError(promo);
  if (input.kind == 'service' &&
      (input.deliveryDays == null || input.deliveryDays! < 1 || input.deliveryDays! > 90)) {
    throw const DomainError('Indiquez un délai de livraison en jours (1 à 90).');
  }
  // The files a buyer receives are always stored (Cloudflare R2): naming a file is not enough.
  if (input.kind == 'digital') {
    final problem = filesError(input.files ?? const []);
    if (problem != null) throw DomainError(problem);
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
