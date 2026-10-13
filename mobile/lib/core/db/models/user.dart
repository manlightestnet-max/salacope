class MerchantSuspension {
  final String at;
  final String reason;

  const MerchantSuspension({required this.at, required this.reason});

  factory MerchantSuspension.fromJson(Map<String, dynamic> json) =>
      MerchantSuspension(
        at: json['at']?.toString() ?? '',
        reason: json['reason']?.toString() ?? '',
      );

  Map<String, dynamic> toJson() => {'at': at, 'reason': reason};
}

class Merchant {
  final String storeName;
  final String headline;
  final String city;
  final String? logo;
  final String? handle; // the @username of a verified store
  final bool verified;
  final String activatedAt;
  final bool? lightpayConnected;
  final String? kycStatus;
  final String? kycNote;
  final MerchantSuspension? suspended;

  /// Never in the catalogue, the storefront or the search: only its own link opens it, as a shop of its own.
  final bool isPrivate;

  const Merchant({
    required this.storeName,
    required this.headline,
    required this.city,
    this.logo,
    this.handle,
    required this.verified,
    required this.activatedAt,
    this.lightpayConnected,
    this.kycStatus,
    this.kycNote,
    this.suspended,
    this.isPrivate = false,
  });

  factory Merchant.fromJson(Map<String, dynamic> json) => Merchant(
        storeName: json['storeName']?.toString() ?? '',
        headline: json['headline']?.toString() ?? '',
        city: json['city']?.toString() ?? '',
        logo: json['logo']?.toString(),
        handle: json['handle']?.toString(),
        verified: json['verified'] == true,
        activatedAt: json['activatedAt']?.toString() ?? '',
        lightpayConnected: json['lightpayConnected'] as bool?,
        kycStatus: json['kycStatus']?.toString(),
        kycNote: json['kycNote']?.toString(),
        suspended: json['suspended'] is Map<String, dynamic>
            ? MerchantSuspension.fromJson(json['suspended'] as Map<String, dynamic>)
            : null,
        isPrivate: json['private'] == true,
      );

  Map<String, dynamic> toJson() => {
        'storeName': storeName,
        if (isPrivate) 'private': true,
        'headline': headline,
        'city': city,
        if (logo != null) 'logo': logo,
        if (handle != null) 'handle': handle,
        'verified': verified,
        'activatedAt': activatedAt,
        if (lightpayConnected != null) 'lightpayConnected': lightpayConnected,
        if (kycStatus != null) 'kycStatus': kycStatus,
        if (kycNote != null) 'kycNote': kycNote,
        if (suspended != null) 'suspended': suspended!.toJson(),
      };
}

class UserBlocked {
  final String at;
  final String reason;

  const UserBlocked({required this.at, required this.reason});

  factory UserBlocked.fromJson(Map<String, dynamic> json) => UserBlocked(
        at: json['at']?.toString() ?? '',
        reason: json['reason']?.toString() ?? '',
      );

  Map<String, dynamic> toJson() => {'at': at, 'reason': reason};
}

class User {
  final String id;
  final String name;
  final String email;
  final String phone;
  final String createdAt;
  final bool? guest;
  final UserBlocked? blocked;
  final bool? admin;
  final List<String>? blocks;
  final Merchant? merchant;

  const User({
    required this.id,
    required this.name,
    required this.email,
    required this.phone,
    required this.createdAt,
    this.guest,
    this.blocked,
    this.admin,
    this.blocks,
    this.merchant,
  });

  factory User.fromJson(Map<String, dynamic> json) => User(
        id: json['id']?.toString() ?? '',
        name: json['name']?.toString() ?? '',
        email: json['email']?.toString() ?? '',
        phone: json['phone']?.toString() ?? '',
        createdAt: json['createdAt']?.toString() ?? '',
        guest: json['guest'] as bool?,
        blocked: json['blocked'] is Map<String, dynamic>
            ? UserBlocked.fromJson(json['blocked'] as Map<String, dynamic>)
            : null,
        admin: json['admin'] as bool?,
        blocks: (json['blocks'] as List?)?.map((e) => e.toString()).toList(),
        merchant: json['merchant'] is Map<String, dynamic>
            ? Merchant.fromJson(json['merchant'] as Map<String, dynamic>)
            : null,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'email': email,
        'phone': phone,
        'createdAt': createdAt,
        if (guest != null) 'guest': guest,
        if (blocked != null) 'blocked': blocked!.toJson(),
        if (admin != null) 'admin': admin,
        if (blocks != null) 'blocks': blocks,
        if (merchant != null) 'merchant': merchant!.toJson(),
      };
}
