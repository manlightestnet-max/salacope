enum PaymentChannel {
  mtnMomoCog('MTN_MOMO_COG', 'MTN MoMo', 'MTN MoMo', 'Notification USSD instantanée', 'assets/images/mtn-momo.png'),
  airtelCog('AIRTEL_COG', 'Airtel Money', 'Airtel', 'Code secret sur votre mobile', 'assets/images/airtel-money.png');

  final String id;
  final String label;
  final String shortLabel;
  final String hint;
  final String assetPath;

  const PaymentChannel(this.id, this.label, this.shortLabel, this.hint, this.assetPath);

  static PaymentChannel fromId(String id) {
    return PaymentChannel.values.firstWhere(
      (c) => c.id == id,
      orElse: () => PaymentChannel.mtnMomoCog,
    );
  }
}
