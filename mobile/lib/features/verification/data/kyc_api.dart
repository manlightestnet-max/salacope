import '../../../core/api/api_client.dart';
import '../../../core/domain/kyc.dart';

final kycApi = KycApi.instance;

class KycApi {
  static final KycApi instance = KycApi._();
  KycApi._();

  Future<void> submitKyc(Map<String, dynamic> data) async {
    final now = DateTime.now();
    final today =
        '${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';
    validateKyc(data, today);
    await api.mutate('POST', '/kyc', body: data);
  }
}
