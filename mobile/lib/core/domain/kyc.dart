import '../api/domain_error.dart';

const int kycMaxBytes = 1000000;

class KycOption {
  final String value;
  final String label;

  const KycOption(this.value, this.label);
}

const List<KycOption> kycIdTypes = [
  KycOption('national_id', 'Carte nationale d’identité'),
  KycOption('passport', 'Passeport'),
];

class KycDocOption {
  final String kind;
  final String label;
  final String hint;

  const KycDocOption(this.kind, this.label, this.hint);
}

const List<KycDocOption> kycDocuments = [
  KycDocOption('front', 'Pièce d’identité (recto)', 'Toute la pièce, lisible, sans reflet.'),
  KycDocOption('back', 'Pièce d’identité (verso)', 'Pour un passeport : la page avec votre photo.'),
  KycDocOption('selfie', 'Selfie avec la pièce', 'Votre visage et la pièce tenue à côté, bien visibles.'),
];

const Map<String, String> kycStatusLabels = {
  'none': 'À vérifier',
  'pending': 'En cours d’examen',
  'approved': 'Vérifié',
  'rejected': 'Refusé',
};

const Map<String, String> riskLabels = {
  'low': 'Faible',
  'medium': 'Moyen',
  'high': 'Élevé',
};

class KycValidationResult {
  final String fullName;
  final String birthDate;
  final String nationality;
  final String idType;
  final String idNumber;
  final String? idExpires;
  final String address;
  final bool pep;

  const KycValidationResult({
    required this.fullName,
    required this.birthDate,
    required this.nationality,
    required this.idType,
    required this.idNumber,
    this.idExpires,
    required this.address,
    required this.pep,
  });
}

String _clean(dynamic v, int max) =>
    (v?.toString() ?? '').trim().replaceAll(RegExp(r'\s+'), ' ').split('').take(max).join();

bool _isDay(String v) =>
    RegExp(r'^\d{4}-\d{2}-\d{2}$').hasMatch(v) && DateTime.tryParse('${v}T00:00:00Z') != null;

KycValidationResult validateKyc(Map<String, dynamic> raw, String today) {
  final fullName = _clean(raw['fullName'], 120);
  if (fullName.split(' ').where((s) => s.isNotEmpty).length < 2) {
    throw const DomainError('Indiquez votre nom complet, comme sur la pièce d’identité.');
  }

  final birthDate = _clean(raw['birthDate'], 10);
  if (!_isDay(birthDate)) {
    throw const DomainError('Date de naissance invalide.');
  }

  final todayParts = today.split('-').map(int.parse).toList();
  final adult = '${todayParts[0] - 18}-${todayParts[1].toString().padLeft(2, '0')}-${todayParts[2].toString().padLeft(2, '0')}';
  if (birthDate.compareTo(adult) > 0) {
    throw const DomainError('Il faut avoir 18 ans pour vendre sur Salacope.');
  }

  final nationality = _clean(raw['nationality'], 60);
  if (nationality.isEmpty) {
    throw const DomainError('Indiquez votre nationalité.');
  }

  final idType = raw['idType'] == 'passport' ? 'passport' : 'national_id';
  final idNumber = _clean(raw['idNumber'], 40);
  if (idNumber.length < 4) {
    throw const DomainError('Numéro de la pièce d’identité invalide.');
  }

  final idExpiresRaw = _clean(raw['idExpires'], 10);
  final idExpires = idExpiresRaw.isNotEmpty ? idExpiresRaw : null;
  if (idExpires != null) {
    if (!_isDay(idExpires) || idExpires.compareTo(today) <= 0) {
      throw const DomainError('Cette pièce d’identité est expirée.');
    }
  }

  final address = _clean(raw['address'], 200);
  if (address.length < 6) {
    throw const DomainError('Indiquez votre adresse.');
  }

  if (raw['pep'] is! bool) {
    throw const DomainError('Répondez à la question sur les fonctions publiques.');
  }

  return KycValidationResult(
    fullName: fullName,
    birthDate: birthDate,
    nationality: nationality,
    idType: idType,
    idNumber: idNumber,
    idExpires: idExpires,
    address: address,
    pep: raw['pep'] as bool,
  );
}
