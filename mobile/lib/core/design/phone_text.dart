import 'package:flutter/widgets.dart';

/// Text sizes for a phone, the policy of LightPay: the web's scale made a little larger, since a phone held at reading
/// distance shows text smaller than a computer screen. Body sizes gain a point (14 → 15, 13 → 14), nothing is ever under
/// 11.5, titles stay as they are. The person's own text size (Android settings) still applies on top.
class PhoneTextScaler extends TextScaler {
  final TextScaler system;
  const PhoneTextScaler(this.system);

  static double _phone(double size) {
    if (size >= 20) return size;
    if (size >= 16) return size + 0.5;
    final bigger = size + 1;
    return bigger < 11.5 ? 11.5 : bigger;
  }

  @override
  double scale(double fontSize) => system.scale(_phone(fontSize));

  @override
  // ignore: deprecated_member_use
  double get textScaleFactor => system.textScaleFactor;

  @override
  bool operator ==(Object other) => other is PhoneTextScaler && other.system == system;

  @override
  int get hashCode => Object.hash(PhoneTextScaler, system);
}
