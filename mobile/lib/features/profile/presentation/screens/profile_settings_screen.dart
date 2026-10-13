import 'package:flutter/material.dart';
import '../../../../core/db/store.dart';
import '../../../../core/design/colors.dart';
import '../../../../core/ui/s_button.dart';
import '../../../../core/ui/s_field.dart';
import '../../../../core/ui/s_toast.dart';
import '../../../session/data/session_api.dart';

/// `/compte/parametres/profil`: name and phone (never shown to sellers); the e-mail is the sign-in, not editable.
class ProfileSettingsScreen extends StatefulWidget {
  const ProfileSettingsScreen({super.key});

  @override
  State<ProfileSettingsScreen> createState() => _ProfileSettingsScreenState();
}

class _ProfileSettingsScreenState extends State<ProfileSettingsScreen> {
  final _name = TextEditingController();
  final _phone = TextEditingController();
  String _email = '';
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    final user = db.user;
    _name.text = user?.name ?? '';
    _phone.text = user?.phone ?? '';
    _email = user?.email ?? '';
  }

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() => _busy = true);
    try {
      await sessionApi.updateProfile(name: _name.text, phone: _phone.text);
      if (mounted) {
        SToast.success(context, 'Profil enregistré');
        Navigator.of(context).maybePop();
      }
    } catch (e) {
      if (mounted) SToast.error(context, e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    return Scaffold(
      backgroundColor: colors.canvas,
      appBar: AppBar(backgroundColor: colors.surface, elevation: 0, title: const Text('Profil')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          SField(label: 'Nom', controller: _name, placeholder: 'Votre nom'),
          const SizedBox(height: 14),
          SField(label: 'Téléphone', hint: 'Jamais montré aux vendeurs.', controller: _phone, keyboardType: TextInputType.phone, placeholder: '+242 06 ...'),
          const SizedBox(height: 14),
          SField(label: 'E-mail', hint: 'Identifiant de connexion (Salacope et LightPay), non modifiable.', controller: TextEditingController(text: _email), enabled: false),
          const SizedBox(height: 24),
          SButton(label: 'Enregistrer', size: SButtonSize.lg, pill: true, isLoading: _busy, onPressed: _busy ? null : _save),
        ],
      ),
    );
  }
}
