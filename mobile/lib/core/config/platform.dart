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

  /// Same as the mobile-money minimum: below it an offer could not be paid.
  static const int minPriceXaf = 1000;

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
}

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
