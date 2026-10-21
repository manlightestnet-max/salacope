import 'package:intl/intl.dart';

import '../db/models/order.dart';

/// The seller's dashboard figures, computed from their orders and the visits counted by the server (pure: no screen, no
/// database). Same rules as the web (`src/shared/domain/analytics.ts`).

/// Days are local dates written `YYYY-MM-DD`.
class DateRange {
  final String from;
  final String to;
  const DateRange(this.from, this.to);

  @override
  bool operator ==(Object other) => other is DateRange && other.from == from && other.to == to;

  @override
  int get hashCode => Object.hash(from, to);
}

/// Views and clicks of one offer on one day, as counted by the server (the seller's own visits never count).
class DayStat {
  final String listingId;
  final String day;
  final int views;
  final int clicks;
  const DayStat({required this.listingId, required this.day, required this.views, required this.clicks});

  factory DayStat.fromJson(Map<String, dynamic> j) => DayStat(
        listingId: j['listingId']?.toString() ?? '',
        day: j['day']?.toString() ?? '',
        views: (j['views'] as num?)?.toInt() ?? 0,
        clicks: (j['clicks'] as num?)?.toInt() ?? 0,
      );
}

/// Visits of the store's own page on one day.
class StoreDayStat {
  final String day;
  final int views;
  const StoreDayStat({required this.day, required this.views});

  factory StoreDayStat.fromJson(Map<String, dynamic> j) => StoreDayStat(day: j['day']?.toString() ?? '', views: (j['views'] as num?)?.toInt() ?? 0);
}

/// What the server counted over a period (`GET /seller/analytics`).
class Analytics {
  final List<DayStat> stats;
  final List<StoreDayStat> store;
  const Analytics({this.stats = const [], this.store = const []});

  factory Analytics.fromJson(Map<String, dynamic> j) => Analytics(
        stats: (j['stats'] as List?)?.whereType<Map<String, dynamic>>().map(DayStat.fromJson).toList() ?? const [],
        store: (j['store'] as List?)?.whereType<Map<String, dynamic>>().map(StoreDayStat.fromJson).toList() ?? const [],
      );
}

String _two(int n) => n.toString().padLeft(2, '0');
String dayOf(DateTime d) => '${d.year}-${_two(d.month)}-${_two(d.day)}';
DateTime _at(String day) => DateTime.parse('${day}T12:00:00');
String addDays(String day, int n) {
  final d = _at(day);
  return dayOf(DateTime(d.year, d.month, d.day + n, 12));
}

int daysBetween(String from, String to) => (_at(to).difference(_at(from)).inHours / 24).round();

/// The local day an ISO date falls on.
String dayOfIso(String iso) {
  final d = DateTime.tryParse(iso);
  return d == null ? '' : dayOf(d.toLocal());
}

class SeriesPoint {
  final String key;
  final String label;
  int revenue = 0;
  int sales = 0;
  int views = 0;
  int clicks = 0;
  SeriesPoint(this.key, this.label);
}

class OfferFigures {
  final String listingId;
  int views = 0;
  int clicks = 0;
  int sales = 0;
  int revenue = 0;

  /// Sales divided by visits (at most 1), null without visits.
  double? conversion;
  OfferFigures(this.listingId);
}

class TopCustomer {
  final String id;
  final String name;
  int orders = 0;
  int spent = 0;
  TopCustomer(this.id, this.name);
}

class DashboardFigures {
  /// Net revenue: what the sales bring in, commission deducted, cancelled orders left out.
  final int revenue;
  final int sales;
  final int averageBasket;
  final int productsSold;
  final int servicesSold;
  final int customers;

  /// Customers whose first purchase from this store falls in the period.
  final int newCustomers;

  /// Customers who bought from this store at least twice (ever).
  final int repeatCustomers;
  final int views;

  /// Visits of the store's own page.
  final int storeViews;
  final int clicks;
  final double? conversion;
  final double? clickRate;
  final List<SeriesPoint> series;
  final String unit; // 'day' | 'month'
  final List<OfferFigures> byOffer;
  final List<TopCustomer> topCustomers;

  const DashboardFigures({
    required this.revenue,
    required this.sales,
    required this.averageBasket,
    required this.productsSold,
    required this.servicesSold,
    required this.customers,
    required this.newCustomers,
    required this.repeatCustomers,
    required this.views,
    required this.storeViews,
    required this.clicks,
    required this.conversion,
    required this.clickRate,
    required this.series,
    required this.unit,
    required this.byOffer,
    required this.topCustomers,
  });
}

double? _ratio(int n, int d) => d > 0 ? (n / d).clamp(0.0, 1.0) : null;
const int _monthsFrom = 92;

/// Everything the dashboard shows for a period. [listingId] narrows sales and visits to one offer; new customers are always
/// judged against the whole store (someone who bought another offer before is not new).
DashboardFigures dashboardFigures(
  List<Order> orders,
  List<DayStat> stats,
  DateRange range, {
  String? listingId,
  List<StoreDayStat> store = const [],
}) {
  final live = orders.where((o) => o.status != 'cancelled').toList();
  final firstDay = <String, String>{};
  final boughtTimes = <String, int>{};
  for (final o in live) {
    final day = dayOfIso(o.createdAt);
    final known = firstDay[o.buyerId];
    if (known == null || day.compareTo(known) < 0) firstDay[o.buyerId] = day;
    boughtTimes[o.buyerId] = (boughtTimes[o.buyerId] ?? 0) + 1;
  }

  bool inRange(String day) => day.compareTo(range.from) >= 0 && day.compareTo(range.to) <= 0;
  final sold = live.where((o) => inRange(dayOfIso(o.createdAt)) && (listingId == null || o.listingId == listingId)).toList();
  final seen = stats.where((s) => inRange(s.day) && (listingId == null || s.listingId == listingId)).toList();

  final revenue = sold.fold<int>(0, (sum, o) => sum + o.amounts.net);
  final views = seen.fold<int>(0, (sum, s) => sum + s.views);
  final clicks = seen.fold<int>(0, (sum, s) => sum + s.clicks);

  final buyers = <String, TopCustomer>{};
  for (final o in sold) {
    final c = buyers.putIfAbsent(o.buyerId, () => TopCustomer(o.buyerId, o.buyer.name));
    c.orders += 1;
    c.spent += o.amounts.total;
  }

  // Series: one bar a day, one a month beyond ~3 months.
  final span = daysBetween(range.from, range.to) + 1;
  final unit = span > _monthsFrom ? 'month' : 'day';
  String bucketOf(String day) => unit == 'day' ? day : day.substring(0, 7);
  String labelOf(String key) => unit == 'day'
      ? DateFormat('d MMM', 'fr_FR').format(_at(key))
      : DateFormat('MMM yy', 'fr_FR').format(DateTime.parse('$key-15T12:00:00'));
  final points = <String, SeriesPoint>{};
  for (var i = 0; i < span; i++) {
    final key = bucketOf(addDays(range.from, i));
    points.putIfAbsent(key, () => SeriesPoint(key, labelOf(key)));
  }
  for (final o in sold) {
    final p = points[bucketOf(dayOfIso(o.createdAt))];
    if (p != null) {
      p.revenue += o.amounts.net;
      p.sales += 1;
    }
  }
  for (final s in seen) {
    final p = points[bucketOf(s.day)];
    if (p != null) {
      p.views += s.views;
      p.clicks += s.clicks;
    }
  }

  final offers = <String, OfferFigures>{};
  for (final o in sold) {
    final f = offers.putIfAbsent(o.listingId, () => OfferFigures(o.listingId));
    f.sales += 1;
    f.revenue += o.amounts.net;
  }
  for (final s in seen) {
    final f = offers.putIfAbsent(s.listingId, () => OfferFigures(s.listingId));
    f.views += s.views;
    f.clicks += s.clicks;
  }
  for (final f in offers.values) {
    f.conversion = _ratio(f.sales, f.views);
  }

  return DashboardFigures(
    revenue: revenue,
    sales: sold.length,
    averageBasket: sold.isEmpty ? 0 : (revenue / sold.length).round(),
    productsSold: sold.where((o) => o.item.kind == 'digital').length,
    servicesSold: sold.where((o) => o.item.kind == 'service').length,
    customers: buyers.length,
    newCustomers: buyers.keys.where((id) => inRange(firstDay[id] ?? '')).length,
    repeatCustomers: buyers.keys.where((id) => (boughtTimes[id] ?? 0) >= 2).length,
    views: views,
    storeViews: store.where((s) => inRange(s.day)).fold<int>(0, (sum, s) => sum + s.views),
    clicks: clicks,
    conversion: _ratio(sold.length, views),
    clickRate: _ratio(clicks, views),
    series: points.values.toList(),
    unit: unit,
    byOffer: offers.values.toList()
      ..sort((a, b) => b.revenue != a.revenue ? b.revenue.compareTo(a.revenue) : b.views.compareTo(a.views)),
    topCustomers: buyers.values.toList()..sort((a, b) => b.spent.compareTo(a.spent)),
  );
}

/// "12,5 %": a share written with at most one decimal; "—" without it.
String formatShare(double? r) {
  if (r == null) return '—';
  final v = (r * 1000).round() / 10;
  final text = v == v.roundToDouble() ? v.toStringAsFixed(0) : v.toStringAsFixed(1).replaceAll('.', ',');
  return '$text %';
}
