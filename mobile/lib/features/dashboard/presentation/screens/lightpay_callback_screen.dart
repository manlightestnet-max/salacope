import 'package:flutter/material.dart';
import 'package:salacope/features/dashboard/presentation/seller_hub.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:salacope/core/design/colors.dart';
import 'package:salacope/core/design/typography.dart';
import 'package:salacope/core/ui/s_button.dart';
import 'package:salacope/features/session/data/session_api.dart';

class LightPayCallbackScreen extends StatefulWidget {
  final Map<String, String> queryParams;

  const LightPayCallbackScreen({super.key, required this.queryParams});

  @override
  State<LightPayCallbackScreen> createState() => _LightPayCallbackScreenState();
}

class _LightPayCallbackScreenState extends State<LightPayCallbackScreen> {
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _handleCallback();
  }

  Future<void> _handleCallback() async {
    try {
      final code = widget.queryParams['code'];
      final state = widget.queryParams['state'];
      final error = widget.queryParams['error'];

      if (error != null && error.isNotEmpty) {
        setState(() {
          _loading = false;
          _error = 'Connexion annulée ou refusée par LightPay : $error';
        });
        return;
      }

      await sessionApi.completeLightPayConnection({
        'code': code,
        'state': state,
        'error': error,
      });

      if (mounted) {
        setState(() => _loading = false);
        Future.delayed(const Duration(milliseconds: 1200), () {
          if (mounted) openSellerSection(context, 'paiements');
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _loading = false;
          _error = e.toString();
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;

    return Scaffold(
      backgroundColor: colors.canvas,
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (_loading) ...[
                CircularProgressIndicator(color: colors.accent),
                const SizedBox(height: 20),
                Text(
                  'Finalisation de la connexion LightPay…',
                  style: SalacopeTypography.bodyStrong,
                ),
                const SizedBox(height: 6),
                Text(
                  'Veuillez patienter un instant.',
                  style: SalacopeTypography.caption.copyWith(color: colors.textSecondary),
                ),
              ] else if (_error != null) ...[
                Icon(LucideIcons.circleAlert, size: 48, color: colors.danger),
                const SizedBox(height: 16),
                Text('Échec de la connexion', style: SalacopeTypography.headingMedium),
                const SizedBox(height: 8),
                Text(
                  _error!,
                  style: SalacopeTypography.body.copyWith(color: colors.textSecondary),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 24),
                SButton(
                  label: 'Retour aux paiements',
                  variant: SButtonVariant.primary,
                  onPressed: () => openSellerSection(context, 'paiements'),
                ),
              ] else ...[
                Icon(LucideIcons.circleCheck, size: 48, color: colors.accent),
                const SizedBox(height: 16),
                Text('Compte LightPay connecté !', style: SalacopeTypography.headingMedium),
                const SizedBox(height: 8),
                Text(
                  'Vos ventes validées seront désormais versées directement sur votre wallet.',
                  style: SalacopeTypography.body.copyWith(color: colors.textSecondary),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 24),
                SButton(
                  label: 'Accéder aux paiements',
                  variant: SButtonVariant.primary,
                  onPressed: () => openSellerSection(context, 'paiements'),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
