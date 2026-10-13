import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../../core/design/colors.dart';
import '../../../../core/design/tokens.dart';
import '../../../../core/ui/s_toast.dart';

class PaymentCode extends StatelessWidget {
  final String code;

  const PaymentCode({
    super.key,
    required this.code,
  });

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: colors.surface,
        borderRadius: BorderRadius.circular(SalacopeTokens.radiusXl),
        border: Border.all(color: colors.canvasBorder),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Code de la transaction',
                style: TextStyle(
                  fontSize: 11,
                  color: colors.textMuted,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                code,
                style: TextStyle(
                  fontFamily: 'monospace',
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 1.2,
                  color: colors.textPrimary,
                ),
              ),
            ],
          ),
          IconButton(
            icon: Icon(
              LucideIcons.copy,
              size: 18,
              color: colors.textMuted,
            ),
            tooltip: 'Copier le code',
            onPressed: () {
              Clipboard.setData(ClipboardData(text: code));
              SToast.success(context, 'Code copié');
            },
          ),
        ],
      ),
    );
  }
}
