import 'package:flutter_test/flutter_test.dart';
import 'package:salacope/core/api/domain_error.dart';
import 'package:salacope/core/config/platform.dart';
import 'package:salacope/core/domain/contact.dart';
import 'package:salacope/core/domain/kyc.dart';
import 'package:salacope/core/domain/listings.dart';
import 'package:salacope/core/domain/orders.dart';
import 'package:salacope/core/domain/pricing.dart';
import 'package:salacope/core/domain/refund.dart';
import 'package:salacope/core/db/models/listing.dart';
import 'package:salacope/core/db/models/order.dart';
import 'package:salacope/core/lib/format.dart';

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
      // Delivering comes after accepting, and nobody writes before.
      expect(pSellerPaid.deliver, isFalse);
      expect(pSellerPaid.message, isFalse);
      expect(pSellerPaid.confirm, isFalse);

      final pSellerWorking = permissionsFor(status: 'in_progress', kind: 'service', perspective: Perspective.seller);
      expect(pSellerWorking.deliver, isTrue);
      expect(pSellerWorking.message, isTrue);
      expect(pSellerWorking.extend, isTrue);

      // A digital order can be talked about at once.
      expect(permissionsFor(status: 'paid', kind: 'digital', perspective: Perspective.buyer).message, isTrue);

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

    test('a digital product is never "à valider"', () {
      expect(statusDisplay(status: 'delivered', perspective: Perspective.buyer, kind: 'digital').label, 'Fichier disponible');
      expect(statusDisplay(status: 'delivered', perspective: Perspective.seller, kind: 'digital').label, 'Livré');
      expect(statusDisplay(status: 'delivered', perspective: Perspective.buyer, kind: 'service').label, 'À valider');
      expect(orderNeedsAction(status: 'delivered', perspective: Perspective.buyer, kind: 'digital'), isFalse);
      expect(orderNeedsAction(status: 'delivered', perspective: Perspective.buyer, kind: 'service'), isTrue);
    });
  });

  group('Refunds (refund.dart)', () {
    OrderRefund refund(int paid, int sent, {String? releaseAt}) =>
        OrderRefund(paid: paid, sent: sent, operatorFee: paid - sent, lightpayFee: 0, via: 'mobile_money', at: '2026-10-20T10:00:00Z', releaseAt: releaseAt);

    test('free order', () {
      expect(refundSentence(refund(0, 0), formatXaf), 'Commande annulée : elle était gratuite, rien n’est à rembourser.');
    });

    test('full and partial refunds', () {
      expect(refundSentence(refund(5000, 5000), formatXaf), startsWith('Vous êtes remboursé de 5'));
      expect(refundSentence(refund(5000, 4800), formatXaf), contains('moins'));
    });

    test('departure time in Congo time', () {
      final r = refund(5000, 4800, releaseAt: '2026-10-20T13:32:00Z');
      expect(refundDepartureTime(r, DateTime.utc(2026, 10, 20, 13, 0)), '14:32');
      expect(refundDepartureTime(r, DateTime.utc(2026, 10, 20, 14, 0)), isNull);
    });
  });

  group('Offers: free, promotion, files', () {
    test('a free offer is allowed only when the administration allows it', () {
      PlatformConfig.freeOffers = true;
      expect(priceError('digital', 0, null), isNull);
      PlatformConfig.freeOffers = false;
      expect(priceError('digital', 0, null), isNotNull);
      PlatformConfig.freeOffers = true;
    });

    test('free during a promotion goes back to a real price', () {
      expect(priceError('digital', 0, 500), isNotNull);
      expect(priceError('digital', 0, 2000), isNull);
    });

    test('minimum per kind', () {
      PlatformConfig.minPriceServiceXaf = 5000;
      expect(minPriceFor('service'), 5000);
      expect(minPriceFor('digital'), PlatformConfig.minPriceXaf);
      PlatformConfig.minPriceServiceXaf = null;
    });

    test('promotion end', () {
      final now = DateTime.utc(2026, 10, 21);
      expect(promoError(null, 5000, now), isNull);
      expect(promoError('2026-10-24T00:00:00Z', null, now), isNotNull);
      expect(promoError('2026-10-20T00:00:00Z', 5000, now), isNotNull);
      expect(promoError('2026-10-24T00:00:00Z', 5000, now), isNull);
      expect(promoError('2027-10-24T00:00:00Z', 5000, now), isNotNull);
    });

    test('files of a product', () {
      expect(filesError(const []), isNotNull);
      expect(filesError(const [ListingFileItem(name: 'a.pdf', format: 'PDF', fileId: 'f1', preview: true)]), isNotNull);
      expect(filesError(const [ListingFileItem(name: 'a.pdf', format: 'PDF', fileId: 'f1'), ListingFileItem(name: 'b.pdf', format: 'PDF', fileId: 'f1')]), isNotNull);
      expect(filesError(const [ListingFileItem(name: 'a.pdf', format: 'PDF', fileId: 'f1'), ListingFileItem(name: 'b.pdf', format: 'PDF', fileId: 'f2', preview: true)]), isNull);
    });

    test('filesOf reads the old single file', () {
      const old = ListingFile(name: 'livre.pdf', format: 'PDF', fileId: 'f1');
      expect(filesOf(old).single.name, 'livre.pdf');
      final many = ListingFile.fromJson({
        'name': 'a.pdf',
        'format': 'PDF',
        'files': [
          {'name': 'a.pdf', 'format': 'PDF'},
          {'name': 'b.pdf', 'format': 'PDF', 'preview': true},
        ],
      });
      expect(filesOf(many).length, 2);
      expect(filesOf(many).last.preview, isTrue);
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
          files: [ListingFileItem(name: 'guide_flutter.pdf', format: 'PDF', fileId: 'f_1')],
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
          files: [ListingFileItem(name: 'book.pdf', format: 'PDF', fileId: 'f_1')],
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
          files: [ListingFileItem(name: 'book.pdf', format: 'PDF', fileId: 'f_1')],
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
