/// Business rules shared with the web (`src/shared/config/platform.ts`). Commission and payout delays are set by the
/// administration: the server sends them with the data and [applyPlatform] puts them here.
abstract final class PlatformConfig {
  /// Commission taken on each completed sale, deducted from the seller (0 = launch offer).
  static double feeRate = 0.1;

  /// Own rate for digital products / services; null = the general rate.
  static double? feeRateDigital;
  static double? feeRateService;

  /// Digital product: never confirmed by the buyer; funds held this many days, then paid out if no dispute.
  static int digitalHoldDays = 3;

  /// Service marked delivered: validated automatically after this many days.
  static int serviceValidationDays = 2;

  /// Days the seller has to deliver a requested revision.
  static const int revisionDays = 2;

  /// Longest extension a seller can ask for at once.
  static const int maxExtensionDays = 14;

  /// Most revisions a service can include.
  static const int maxRevisions = 5;

  /// Time the buyer has to approve the Mobile Money request on their phone.
  static const int paymentTimeoutSeconds = 60;

  static const int minWithdrawalXaf = 1000;

  /// Smallest price of an offer (at or above LightPay's own minimum deposit). Set by the administration.
  static int minPriceXaf = 1000;

  /// Own minimum for digital products / services; null = the general one.
  static int? minPriceDigitalXaf;
  static int? minPriceServiceXaf;

  /// Longest promotion with a countdown, in days: its price goes back to the former one at the end.
  static int promoMaxDays = 30;

  /// Sellers may set a price of 0 (a free offer, or free during a promotion).
  static bool freeOffers = true;

  /// Most files one digital product can deliver.
  static int maxProductFiles = 5;

  static const String country = 'République du Congo';

  /// Where the team is based (footer).
  static const String headquarters = 'Luanda, Angola';

  static const String currency = 'XAF';
  static const String phonePrefix = '+242';
  static const String supportEmail = 'contact@salacope.online';
}

/// What the server sent (values that make no sense are ignored).
void applyPlatform(Object? raw) {
  if (raw is! Map) return;
  double? rate(Object? v) => v is num && v >= 0 && v <= 0.5 ? v.toDouble() : null;
  int? days(Object? v) => v is num && v == v.roundToDouble() && v >= 1 && v <= 60 ? v.toInt() : null;
  PlatformConfig.feeRate = rate(raw['feeRate']) ?? PlatformConfig.feeRate;
  PlatformConfig.feeRateDigital = raw['feeRateDigital'] == null ? null : (rate(raw['feeRateDigital']) ?? PlatformConfig.feeRateDigital);
  PlatformConfig.feeRateService = raw['feeRateService'] == null ? null : (rate(raw['feeRateService']) ?? PlatformConfig.feeRateService);
  PlatformConfig.digitalHoldDays = days(raw['digitalHoldDays']) ?? PlatformConfig.digitalHoldDays;
  PlatformConfig.serviceValidationDays = days(raw['serviceValidationDays']) ?? PlatformConfig.serviceValidationDays;
  int? minPrice(Object? v) => v is num && v == v.roundToDouble() && v >= 100 && v <= 1000000 ? v.toInt() : null;
  PlatformConfig.minPriceXaf = minPrice(raw['minPriceXaf']) ?? PlatformConfig.minPriceXaf;
  if (raw.containsKey('minPriceDigitalXaf')) {
    PlatformConfig.minPriceDigitalXaf = raw['minPriceDigitalXaf'] == null ? null : (minPrice(raw['minPriceDigitalXaf']) ?? PlatformConfig.minPriceDigitalXaf);
  }
  if (raw.containsKey('minPriceServiceXaf')) {
    PlatformConfig.minPriceServiceXaf = raw['minPriceServiceXaf'] == null ? null : (minPrice(raw['minPriceServiceXaf']) ?? PlatformConfig.minPriceServiceXaf);
  }
  final promo = raw['promoMaxDays'];
  if (promo is num && promo == promo.roundToDouble() && promo >= 1 && promo <= 365) PlatformConfig.promoMaxDays = promo.toInt();
  if (raw['freeOffers'] is bool) PlatformConfig.freeOffers = raw['freeOffers'] as bool;
  final files = raw['maxProductFiles'];
  if (files is num && files == files.roundToDouble() && files >= 1 && files <= 20) PlatformConfig.maxProductFiles = files.toInt();
}

/// The smallest price an offer of this kind may have.
int minPriceFor(String? kind) =>
    (kind == 'digital' ? PlatformConfig.minPriceDigitalXaf : kind == 'service' ? PlatformConfig.minPriceServiceXaf : null) ?? PlatformConfig.minPriceXaf;

/// The commission rate that applies to an offer of this kind.
double feeRateFor(String? kind) =>
    (kind == 'digital' ? PlatformConfig.feeRateDigital : kind == 'service' ? PlatformConfig.feeRateService : null) ?? PlatformConfig.feeRate;

int computeFee(int amount, [String? kind]) => (amount * feeRateFor(kind)).round();

/// Days between delivery and automatic payout to the seller, by kind of offer.
int releaseDays(String kind) =>
    kind == 'digital' ? PlatformConfig.digitalHoldDays : PlatformConfig.serviceValidationDays;

/// The same rule in words, for pages covering both kinds.
String get releaseRule =>
    '${PlatformConfig.digitalHoldDays} jours pour un produit numérique, ${PlatformConfig.serviceValidationDays} jours pour un service';
