import 'package:flutter_test/flutter_test.dart';
import 'package:salacope/core/api/domain_error.dart';
import 'package:salacope/core/config/platform.dart';
import 'package:salacope/core/domain/contact.dart';
import 'package:salacope/core/domain/kyc.dart';
import 'package:salacope/core/domain/listings.dart';
import 'package:salacope/core/domain/orders.dart';
import 'package:salacope/core/domain/pricing.dart';

void main() {
  group('Contact Rules (contact.dart)', () {
    test('detects plain phone numbers', () {
      expect(containsContact('Mon tel est 061234567'), isTrue);
      expect(containsContact('+242 06 999 88 77'), isTrue);
      expect(containsContact('06-12-34-56-78'), isTrue);
    });

    test('detects e-mails', () {
      expect(containsContact('écris moi à contact@example.com'), isTrue);
      expect(containsContact('test.user+1@mail.org'), isTrue);
    });

    test('detects messaging handles', () {
      expect(containsContact('rejoins moi sur whatsapp'), isTrue);
      expect(containsContact('mon lien wa.me/242061234567'), isTrue);
      expect(containsContact('go telegram'), isTrue);
    });

    test('accepts clean messages', () {
      expect(containsContact('Bonjour, je confirme la commande.'), isFalse);
      expect(containsContact('Le fichier a été livré avec succès.'), isFalse);
    });
  });

  group('Pricing Rules (pricing.dart & platform.dart)', () {
    test('computes fee accurately at 10%', () {
      expect(computeFee(10000), equals(1000));
      expect(computeFee(12500), equals(1250));
      expect(computeFee(1500), equals(150));
    });

    test('prices order with fee deduction and net amount', () {
      final pricing = priceOrder(10000);
      expect(pricing.subtotal, equals(10000));
      expect(pricing.total, equals(10000));
      expect(pricing.fee, equals(1000));
      expect(pricing.net, equals(9000));
    });

    test('release days by kind', () {
      expect(releaseDays('digital'), equals(3));
      expect(releaseDays('service'), equals(2));
    });
  });

  group('Order Rules (orders.dart)', () {
    test('cleans seller tags and limits to 5', () {
      final cleaned = cleanSellerTags(['  Design  ', 'DESIGN', 'web', 'flutter', 'dart', 'extra', 'overflow']);
      expect(cleaned, equals(['design', 'web', 'flutter', 'dart', 'extra']));
    });

    test('perspective of buyer and seller', () {
      expect(perspectiveOf(buyerId: 'u1', sellerId: 'u2', userId: 'u1'), equals(Perspective.buyer));
      expect(perspectiveOf(buyerId: 'u1', sellerId: 'u2', userId: 'u2'), equals(Perspective.seller));
      expect(perspectiveOf(buyerId: 'u1', sellerId: 'u2', userId: 'u3'), isNull);
    });

    test('revisions left computation', () {
      expect(revisionsLeft(revisions: 3, revisionsUsed: 1), equals(2));
      expect(revisionsLeft(revisions: 2, revisionsUsed: 2), equals(0));
      expect(revisionsLeft(revisions: 1, revisionsUsed: 3), equals(0));
    });

    test('permissions for buyer and seller on service', () {
      // Seller permissions when order is paid
      final pSellerPaid = permissionsFor(
        status: 'paid',
        kind: 'service',
        perspective: Perspective.seller,
      );
      expect(pSellerPaid.accept, isTrue);
      expect(pSellerPaid.deliver, isTrue);
      expect(pSellerPaid.confirm, isFalse);

      // Buyer permissions when order is delivered
      final pBuyerDelivered = permissionsFor(
        status: 'delivered',
        kind: 'service',
        perspective: Perspective.buyer,
        revisions: 2,
        revisionsUsed: 0,
      );
      expect(pBuyerDelivered.confirm, isTrue);
      expect(pBuyerDelivered.dispute, isTrue);
      expect(pBuyerDelivered.revise, isTrue);
    });
  });

  group('Listings Validation (listings.dart)', () {
    test('validates correct digital listing', () {
      expect(
        () => validateListing(const ListingValidationInput(
          kind: 'digital',
          category: 'ebook',
          title: 'Guide complet Flutter Dart',
          summary: 'Apprenez Flutter de zéro à héros en quelques semaines.',
          description: 'Description détaillée du cours...',
          features: ['Code source inclus', 'Mises à jour à vie'],
          priceXaf: 15000,
          coverImage: 'data:image/jpeg;base64,...',
          fileName: 'guide_flutter.pdf',
        )),
        returnsNormally,
      );
    });

    test('rejects price below min', () {
      expect(
        () => validateListing(const ListingValidationInput(
          kind: 'digital',
          category: 'ebook',
          title: 'Guide complet Flutter',
          summary: 'Résumé valide.',
          description: 'Description.',
          features: ['Feature 1'],
          priceXaf: 500, // min is 1000
          coverImage: 'image',
          fileName: 'book.pdf',
        )),
        throwsA(isA<DomainError>()),
      );
    });

    test('rejects compareAtXaf lower than price', () {
      expect(
        () => validateListing(const ListingValidationInput(
          kind: 'digital',
          category: 'ebook',
          title: 'Guide complet Flutter',
          summary: 'Résumé valide.',
          description: 'Description.',
          features: ['Feature 1'],
          priceXaf: 10000,
          compareAtXaf: 8000, // compareAt must be higher
          coverImage: 'image',
          fileName: 'book.pdf',
        )),
        throwsA(isA<DomainError>()),
      );
    });
  });

  group('KYC Validation (kyc.dart)', () {
    test('validates adult user and normalises data', () {
      final res = validateKyc({
        'fullName': 'Marc Dupond',
        'birthDate': '2000-05-15',
        'nationality': 'Congolaise',
        'idType': 'national_id',
        'idNumber': 'CNI-123456789',
        'idExpires': '2030-12-31',
        'address': 'Brazzaville, Bacongo',
        'pep': false,
      }, '2026-10-11');

      expect(res.fullName, equals('Marc Dupond'));
      expect(res.pep, isFalse);
    });

    test('rejects minor user (under 18)', () {
      expect(
        () => validateKyc({
          'fullName': 'Jeune Dev',
          'birthDate': '2012-05-15',
          'nationality': 'Congolaise',
          'idType': 'national_id',
          'idNumber': 'CNI-123',
          'address': 'Brazzaville',
          'pep': false,
        }, '2026-10-11'),
        throwsA(isA<DomainError>()),
      );
    });
  });
}
