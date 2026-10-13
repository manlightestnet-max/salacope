import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:salacope/core/db/models/user.dart';
import 'package:salacope/core/design/theme.dart';
import 'package:salacope/core/design/tokens.dart';
import 'package:salacope/core/design/typography.dart';

class VerificationNotice extends StatelessWidget {
  final Merchant merchant;

  const VerificationNotice({super.key, required this.merchant});

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;

    if (merchant.suspended != null) {
      return Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: colors.amber500.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(SalacopeTokens.radiusLg),
          border: Border.all(color: colors.amber500.withValues(alpha: 0.4), width: 0.8),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(LucideIcons.triangleAlert, size: 18, color: colors.amber500),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Boutique suspendue',
                    style: SalacopeTypography.bodyStrong.copyWith(
                      color: colors.textPrimary,
                      fontSize: 13,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '${merchant.suspended?.reason.isNotEmpty == true ? merchant.suspended!.reason : "Vos offres ne sont plus visibles."} Pour en parler, écrivez au support.',
                    style: SalacopeTypography.caption.copyWith(
                      color: colors.textSecondary,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    final kycStatus = merchant.kycStatus;
    if (kycStatus == 'approved' || kycStatus == null) return const SizedBox.shrink();

    String title;
    String description;
    String? actionLabel;
    VoidCallback? onAction;
    Color toneColor;
    IconData icon;

    if (kycStatus == 'pending') {
      title = 'Identité en cours de vérification';
      description =
          'Vous pourrez publier vos offres dès qu’elle sera validée, en général sous 48 h ouvrées.';
      toneColor = colors.blue500;
      icon = LucideIcons.clock;
    } else if (kycStatus == 'rejected') {
      title = 'Vérification refusée';
      description = merchant.kycNote ?? 'Certains documents n’ont pas pu être validés.';
      actionLabel = 'Envoyer de nouveaux documents';
      onAction = () => context.push('/dashboard/verification');
      toneColor = colors.danger;
      icon = LucideIcons.circleAlert;
    } else {
      title = 'Vérifiez votre identité pour vendre';
      description = 'Salacope vérifie chaque vendeur avant la mise en ligne de ses offres.';
      actionLabel = 'Vérifier mon identité';
      onAction = () => context.push('/dashboard/verification');
      toneColor = colors.amber500;
      icon = LucideIcons.shieldAlert;
    }

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: toneColor.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(SalacopeTokens.radiusLg),
        border: Border.all(color: toneColor.withValues(alpha: 0.3), width: 0.8),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 18, color: toneColor),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: SalacopeTypography.bodyStrong.copyWith(
                    color: colors.textPrimary,
                    fontSize: 13,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  description,
                  style: SalacopeTypography.caption.copyWith(
                    color: colors.textSecondary,
                    fontSize: 12,
                  ),
                ),
                if (actionLabel != null && onAction != null) ...[
                  const SizedBox(height: 6),
                  InkWell(
                    onTap: onAction,
                    child: Text(
                      actionLabel,
                      style: SalacopeTypography.bodyStrong.copyWith(
                        color: toneColor,
                        fontSize: 12,
                        decoration: TextDecoration.underline,
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
