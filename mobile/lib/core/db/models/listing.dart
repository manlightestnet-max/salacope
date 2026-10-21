/// One file of a digital product.
class ListingFileItem {
  final String name;
  final String format;

  /// The stored file (Cloudflare R2) a buyer downloads, and its size in bytes. A visitor only gets the id of free samples.
  final String? fileId;
  final int? size;

  /// A free sample: anyone can download it from the offer page, without buying.
  final bool preview;

  const ListingFileItem({required this.name, required this.format, this.fileId, this.size, this.preview = false});

  factory ListingFileItem.fromJson(Map<String, dynamic> json) => ListingFileItem(
        name: json['name']?.toString() ?? '',
        format: json['format']?.toString() ?? '',
        fileId: json['fileId']?.toString(),
        size: (json['size'] as num?)?.toInt(),
        preview: json['preview'] == true,
      );

  Map<String, dynamic> toJson() => {
        'name': name,
        'format': format,
        if (fileId != null) 'fileId': fileId,
        if (size != null) 'size': size,
        if (preview) 'preview': true,
      };
}

/// What a digital product delivers: `name`, `format`, `fileId`, `size` are those of the main file (what the first versions read);
/// [files] lists them all, in the order the seller chose. Read either shape with [filesOf].
class ListingFile extends ListingFileItem {
  final List<ListingFileItem>? files;

  const ListingFile({required super.name, required super.format, super.fileId, super.size, super.preview, this.files});

  factory ListingFile.fromJson(Map<String, dynamic> json) => ListingFile(
        name: json['name']?.toString() ?? '',
        format: json['format']?.toString() ?? '',
        fileId: json['fileId']?.toString(),
        size: (json['size'] as num?)?.toInt(),
        preview: json['preview'] == true,
        files: (json['files'] as List?)?.whereType<Map<String, dynamic>>().map(ListingFileItem.fromJson).toList(),
      );

  @override
  Map<String, dynamic> toJson() => {
        ...super.toJson(),
        if (files != null) 'files': files!.map((f) => f.toJson()).toList(),
      };
}

/// Every file a digital product delivers, whichever shape was stored (the first versions kept a single one).
List<ListingFileItem> filesOf(ListingFile? file) {
  if (file == null) return const [];
  if (file.files?.isNotEmpty == true) return file.files!;
  if (file.name.isEmpty) return const [];
  return [ListingFileItem(name: file.name, format: file.format, fileId: file.fileId, size: file.size)];
}

/// A promotion with a countdown, present only while it runs.
class ListingPromo {
  final String startsAt;
  final String endsAt;
  const ListingPromo({required this.startsAt, required this.endsAt});

  factory ListingPromo.fromJson(Map<String, dynamic> json) =>
      ListingPromo(startsAt: json['startsAt']?.toString() ?? '', endsAt: json['endsAt']?.toString() ?? '');

  Map<String, dynamic> toJson() => {'startsAt': startsAt, 'endsAt': endsAt};
}

class BriefQuestion {
  final String id;
  final String label;
  final bool required;

  const BriefQuestion({
    required this.id,
    required this.label,
    required this.required,
  });

  factory BriefQuestion.fromJson(Map<String, dynamic> json) => BriefQuestion(
        id: json['id']?.toString() ?? '',
        label: json['label']?.toString() ?? '',
        required: json['required'] == true,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'label': label,
        'required': required,
      };
}

class Listing {
  final String id;
  final String sellerId;
  final String kind; // 'digital' | 'service'
  final String category; // 'ebook' | 'formation' | 'template' | 'service' | 'mentorat'
  final String title;
  final String summary;
  final String description;
  final List<String> features;
  final int priceXaf;
  final int? compareAtXaf;

  /// While a promotion with a countdown runs: [priceXaf] is the promotional price, [compareAtXaf] the regular one, back at the end.
  final ListingPromo? promo;
  final String coverImage;
  final int galleryCount; // extra images beyond the cover
  final int? deliveryDays;
  final int? revisions;
  final List<BriefQuestion>? briefQuestions;
  final ListingFile? file;
  final String status; // 'published' | 'draft'
  final String? publishedAt;
  final String createdAt;
  final String updatedAt;

  const Listing({
    required this.id,
    required this.sellerId,
    required this.kind,
    required this.category,
    required this.title,
    required this.summary,
    required this.description,
    required this.features,
    required this.priceXaf,
    this.compareAtXaf,
    this.promo,
    required this.coverImage,
    this.galleryCount = 0,
    this.deliveryDays,
    this.revisions,
    this.briefQuestions,
    this.file,
    required this.status,
    this.publishedAt,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Listing.fromJson(Map<String, dynamic> json) => Listing(
        id: json['id']?.toString() ?? '',
        sellerId: json['sellerId']?.toString() ?? '',
        kind: json['kind']?.toString() ?? 'digital',
        category: json['category']?.toString() ?? 'ebook',
        title: json['title']?.toString() ?? '',
        summary: json['summary']?.toString() ?? '',
        description: json['description']?.toString() ?? '',
        features: (json['features'] as List?)?.map((e) => e.toString()).toList() ?? [],
        priceXaf: (json['priceXaf'] as num?)?.toInt() ?? 0,
        compareAtXaf: (json['compareAtXaf'] as num?)?.toInt(),
        promo: json['promo'] is Map<String, dynamic> ? ListingPromo.fromJson(json['promo'] as Map<String, dynamic>) : null,
        coverImage: json['coverImage']?.toString() ?? '',
        galleryCount: (json['galleryCount'] as num?)?.toInt() ?? 0,
        deliveryDays: (json['deliveryDays'] as num?)?.toInt(),
        revisions: (json['revisions'] as num?)?.toInt(),
        briefQuestions: (json['briefQuestions'] as List?)
            ?.whereType<Map<String, dynamic>>()
            .map(BriefQuestion.fromJson)
            .toList(),
        file: json['file'] is Map<String, dynamic>
            ? ListingFile.fromJson(json['file'] as Map<String, dynamic>)
            : null,
        status: json['status']?.toString() ?? 'draft',
        publishedAt: json['publishedAt']?.toString(),
        createdAt: json['createdAt']?.toString() ?? '',
        updatedAt: json['updatedAt']?.toString() ?? '',
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'sellerId': sellerId,
        'kind': kind,
        'category': category,
        'title': title,
        'summary': summary,
        'description': description,
        'features': features,
        'priceXaf': priceXaf,
        if (compareAtXaf != null) 'compareAtXaf': compareAtXaf,
        if (promo != null) 'promo': promo!.toJson(),
        'coverImage': coverImage,
        if (galleryCount > 0) 'galleryCount': galleryCount,
        if (deliveryDays != null) 'deliveryDays': deliveryDays,
        if (revisions != null) 'revisions': revisions,
        if (briefQuestions != null)
          'briefQuestions': briefQuestions!.map((q) => q.toJson()).toList(),
        if (file != null) 'file': file!.toJson(),
        'status': status,
        if (publishedAt != null) 'publishedAt': publishedAt,
        'createdAt': createdAt,
        'updatedAt': updatedAt,
      };
}
