import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../../core/design/colors.dart';
import '../../../../core/design/tokens.dart';
import '../../../../core/design/typography.dart';
import '../../../../core/ui/s_page.dart';
import '../../../../core/ui/s_toast.dart';
import '../widgets/sign_in_form.dart';

class SignInScreen extends StatelessWidget {
  final bool initialSignUp;

  const SignInScreen({
    super.key,
    this.initialSignUp = false,
  });

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;

    return SPage(
      title: initialSignUp ? 'Créer un compte' : 'Connexion',
      leading: BackButton(
        onPressed: () {
          if (context.canPop()) {
            context.pop();
          } else {
            context.go('/');
          }
        },
      ),
      slivers: [
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 24.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Center(
                  child: Container(
                    width: 56,
                    height: 56,
                    decoration: BoxDecoration(
                      color: colors.surface,
                      borderRadius: BorderRadius.circular(SalacopeTokens.radiusXl),
                      border: Border.all(color: colors.canvasBorder),
                    ),
                    child: Center(
                      child: Image.asset(
                        'assets/images/salacope-mark.png',
                        width: 32,
                        height: 32,
                        errorBuilder: (context, error, stackTrace) => Icon(
                          LucideIcons.user,
                          color: colors.accent,
                          size: 28,
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  'Salacope',
                  textAlign: TextAlign.center,
                  style: SalacopeTypography.display.copyWith(
                    color: colors.textPrimary,
                    fontSize: 24,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Un compte unique pour vos achats et votre boutique.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 13,
                    color: colors.textMuted,
                  ),
                ),
                const SizedBox(height: 28),
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: colors.surface,
                    borderRadius: BorderRadius.circular(SalacopeTokens.radius2Xl),
                    border: Border.all(color: colors.canvasBorder),
                  ),
                  child: SignInForm(
                    initialSignUp: initialSignUp,
                    onSignedIn: () {
                      SToast.success(context, 'Connexion réussie !');
                      if (context.canPop()) {
                        context.pop();
                      } else {
                        context.go('/');
                      }
                    },
                  ),
                ),
                const SizedBox(height: 24),
                Text(
                  'En continuant, vous acceptez les Conditions Générales de Salacope.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 11.5,
                    color: colors.textMuted,
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
