import 'package:flutter/material.dart';
import '../../../../core/ui/s_dialog.dart';
import '../../../../core/ui/s_toast.dart';
import '../../../session/presentation/widgets/sign_in_form.dart';

void showSignInSheet(BuildContext context, {bool initialSignUp = false}) {
  showSSheet(
    context: context,
    title: initialSignUp ? 'Créer un compte' : 'Connexion Salacope',
    description: 'Accédez à vos commandes, vos favoris et votre boutique.',
    child: Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
      child: SignInForm(
        initialSignUp: initialSignUp,
        onSignedIn: () {
          Navigator.of(context, rootNavigator: true).pop();
          SToast.success(context, 'Connexion réussie !');
        },
      ),
    ),
  );
}
