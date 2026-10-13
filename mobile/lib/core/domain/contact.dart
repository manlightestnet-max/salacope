final List<RegExp> _contactPatterns = [
  RegExp(r'(?:\+?\d[\s.\-()]*){8,}'), // phone numbers, however they are spaced
  RegExp(r'[\w.+-]+@[\w-]+\.[a-z]{2,}', caseSensitive: false), // e-mails
  RegExp(r'\b(?:whats?\s?app|wa\.me|telegram|t\.me|signal|messenger|m\.me)\b', caseSensitive: false),
];

bool containsContact(String text) =>
    _contactPatterns.any((pattern) => pattern.hasMatch(text));

const String contactBlocked =
    'Pas de coordonnées ici (numéro, e-mail, WhatsApp…). Restez sur Salacope : c’est ce qui protège votre paiement et vos droits en cas de litige.';
