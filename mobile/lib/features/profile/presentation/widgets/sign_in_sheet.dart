import 'package:flutter/material.dart';
import '../../../../core/ui/s_dialog.dart';
import '../../../../core/ui/s_toast.dart';
import '../../../session/presentation/widgets/sign_in_form.dart';

/// Signing in without leaving the screen. Once signed in (e-mail or Google), only this sheet closes: the screen beneath
/// stays (closing the root page instead left an empty, black app).
void showSignInSheet(BuildContext context, {bool initialSignUp = false}) {
  showSSheet(
    context: context,
    title: initialSignUp ? 'Créer un compte' : 'Connexion Salacope',
    description: 'Accédez à vos commandes, vos favoris et votre boutique.',
    child: Builder(
      builder: (sheet) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 8.0),
        child: SignInForm(
          initialSignUp: initialSignUp,
          onSignedIn: () {
            final route = ModalRoute.of(sheet);
            if (route != null && route.isActive) Navigator.of(sheet).removeRoute(route);
            if (context.mounted) SToast.success(context, 'Connexion réussie');
          },
        ),
      ),
    ),
  );
}
