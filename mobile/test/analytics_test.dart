import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:salacope/core/db/models/order.dart';
import 'package:salacope/core/domain/analytics.dart';

Order _order(String id, {required String buyer, required String day, String listing = 'l1', String kind = 'digital', String status = 'completed', int net = 900, int total = 1000}) =>
    Order.fromJson({
      'id': id,
      'number': id,
      'listingId': listing,
      'item': {'title': 'Offre', 'kind': kind, 'category': kind == 'digital' ? 'ebook' : 'service', 'coverImage': ''},
      'sellerId': 's1',
      'buyerId': buyer,
      'buyer': {'name': 'Client $buyer', 'email': '', 'phone': ''},
      'payment': {'reference': 'r'},
      'amounts': {'subtotal': total, 'discount': 0, 'total': total, 'fee': total - net, 'net': net},
      'status': status,
      // Noon local time: the order falls on that local day whatever the time zone.
      'createdAt': DateTime.parse('${day}T12:00:00').toUtc().toIso8601String(),
      'updatedAt': '',
      'events': [],
      'messages': [],
      'chat': <String, dynamic>{},
    });

void main() {
  setUpAll(() => initializeDateFormatting('fr_FR', null));

  group('dates', () {
    test('addDays and daysBetween', () {
      expect(addDays('2026-02-27', 2), '2026-03-01');
      expect(addDays('2026-10-01', -1), '2026-09-30');
      expect(daysBetween('2026-10-01', '2026-10-31'), 30);
    });
  });

  group('dashboardFigures', () {
    const range = DateRange('2026-10-01', '2026-10-30');
    final orders = [
      _order('o1', buyer: 'b1', day: '2026-09-20'), // before the period: makes b1 a former client
      _order('o2', buyer: 'b1', day: '2026-10-05'),
      _order('o3', buyer: 'b2', day: '2026-10-06', kind: 'service', listing: 'l2', net: 4500, total: 5000),
      _order('o4', buyer: 'b3', day: '2026-10-07', status: 'cancelled'),
    ];
    const stats = [
      DayStat(listingId: 'l1', day: '2026-10-05', views: 10, clicks: 3),
      DayStat(listingId: 'l2', day: '2026-10-06', views: 10, clicks: 1),
      DayStat(listingId: 'l1', day: '2026-09-01', views: 99, clicks: 9), // outside
    ];

    test('sales, revenue and basket leave cancelled orders out', () {
      final f = dashboardFigures(orders, stats, range);
      expect(f.sales, 2);
      expect(f.revenue, 5400);
      expect(f.averageBasket, 2700);
      expect(f.productsSold, 1);
      expect(f.servicesSold, 1);
    });

    test('customers: new and repeat', () {
      final f = dashboardFigures(orders, stats, range);
      expect(f.customers, 2);
      expect(f.newCustomers, 1); // b2 only: b1 bought before
      expect(f.repeatCustomers, 1); // b1 bought twice
      expect(f.topCustomers.first.id, 'b2');
    });

    test('visits, conversion and click rate', () {
      final f = dashboardFigures(orders, stats, range, store: const [StoreDayStat(day: '2026-10-02', views: 4)]);
      expect(f.views, 20);
      expect(f.clicks, 4);
      expect(f.conversion, closeTo(0.1, 1e-9));
      expect(f.clickRate, closeTo(0.2, 1e-9));
      expect(f.storeViews, 4);
      expect(formatShare(f.conversion), '10 %');
      expect(formatShare(null), '—');
    });

    test('one offer', () {
      final f = dashboardFigures(orders, stats, range, listingId: 'l2');
      expect(f.sales, 1);
      expect(f.views, 10);
      expect(f.byOffer.single.listingId, 'l2');
    });

    test('a bar a day, a bar a month beyond three months', () {
      expect(dashboardFigures(orders, stats, range).series.length, 30);
      expect(dashboardFigures(orders, stats, range).unit, 'day');
      final year = dashboardFigures(orders, stats, const DateRange('2026-01-01', '2026-10-30'));
      expect(year.unit, 'month');
      expect(year.series.length, 10);
      expect(year.series.firstWhere((p) => p.key == '2026-10').sales, 2);
    });
  });
}
