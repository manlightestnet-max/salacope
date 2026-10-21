import '../../../core/api/api_client.dart';
import '../../../core/domain/analytics.dart';

final analyticsApi = AnalyticsApi._();

/// The visits the server counted for this seller's offers and store over a period (`GET /seller/analytics`). The last answer
/// for each period is kept: coming back to the dashboard shows it at once while the server is asked again.
class AnalyticsApi {
  AnalyticsApi._();

  final Map<DateRange, Analytics> _last = {};

  Analytics? last(DateRange range) => _last[range];

  Future<Analytics> fetch(DateRange range) async {
    final res = await api.request(
      'GET',
      '/seller/analytics?from=${Uri.encodeComponent(range.from)}&to=${Uri.encodeComponent(range.to)}',
    );
    return _last[range] = Analytics.fromJson(res is Map<String, dynamic> ? res : const {});
  }
}
