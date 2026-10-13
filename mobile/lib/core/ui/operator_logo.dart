import 'package:flutter/material.dart';
import '../config/payment.dart';
import '../design/tokens.dart';

class OperatorLogo extends StatelessWidget {
  final PaymentChannel channel;
  final double size;

  const OperatorLogo({
    super.key,
    required this.channel,
    this.size = 28.0,
  });

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: SalacopeTokens.borderSm,
      child: Image.asset(
        channel.assetPath,
        width: size,
        height: size,
        fit: BoxFit.cover,
        errorBuilder: (_, _, _) => Container(
          width: size,
          height: size,
          color: Colors.grey.shade800,
          alignment: Alignment.center,
          child: Text(
            channel.shortLabel.substring(0, 1),
            style: const TextStyle(fontSize: 10, color: Colors.white),
          ),
        ),
      ),
    );
  }
}
