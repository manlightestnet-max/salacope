import 'package:flutter/material.dart';
import '../../../../core/design/colors.dart';
import '../../../../core/design/tokens.dart';
import '../../../../core/ui/s_button.dart';
import '../../../../core/ui/s_field.dart';
import '../../data/session_api.dart';
import 'google_button.dart';

enum SignInMode {
  signin,
  signup,
  reset,
}

class SignInForm extends StatefulWidget {
  final VoidCallback onSignedIn;
  final bool initialSignUp;
  final ValueChanged<SignInMode>? onModeChanged;

  const SignInForm({
    super.key,
    required this.onSignedIn,
    this.initialSignUp = false,
    this.onModeChanged,
  });

  @override
  State<SignInForm> createState() => _SignInFormState();
}

class _SignInFormState extends State<SignInForm> {
  late SignInMode _mode;
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _phoneController = TextEditingController();

  String? _error;
  String? _notice;
  bool _busy = false;
  bool _googleBusy = false;

  Future<void> _google() async {
    if (_busy || _googleBusy) return;
    setState(() {
      _error = null;
      _notice = null;
      _googleBusy = true;
    });
    try {
      await sessionApi.signInWithGoogle();
      if (mounted) widget.onSignedIn();
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _googleBusy = false);
    }
  }

  @override
  void initState() {
    super.initState();
    _mode = widget.initialSignUp ? SignInMode.signup : SignInMode.signin;
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  void _switchMode(SignInMode next) {
    setState(() {
      _mode = next;
      _error = null;
      _notice = null;
    });
    final cb = widget.onModeChanged;
    if (cb != null) {
      cb(next);
    }
  }

  Future<void> _submit() async {
    if (_busy) return;
    setState(() {
      _error = null;
      _notice = null;
      _busy = true;
    });

    try {
      if (_mode == SignInMode.reset) {
        await sessionApi.resetPassword(_emailController.text);
        if (mounted) {
          setState(() {
            _notice =
                'Si un compte existe avec cet e-mail, un lien pour choisir un nouveau mot de passe vient d’être envoyé.';
            _mode = SignInMode.signin;
          });
        }
        return;
      }

      if (_mode == SignInMode.signup) {
        await sessionApi.signUp(
          name: _nameController.text,
          email: _emailController.text,
          password: _passwordController.text,
          phone: _phoneController.text.trim().isNotEmpty
              ? _phoneController.text
              : null,
        );
      } else {
        await sessionApi.signIn(
          _emailController.text,
          _passwordController.text,
        );
      }

      if (mounted) {
        widget.onSignedIn();
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString().replaceFirst(RegExp(r'^[a-zA-Z0-9_]+(Error|Exception):\s*'), '');
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _busy = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (_mode != SignInMode.reset) ...[
          GoogleButton(busy: _googleBusy, onTap: _google),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(child: Divider(color: colors.canvasBorder, height: 1)),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                child: Text('ou avec votre e-mail', style: TextStyle(fontSize: 12, color: colors.textMuted)),
              ),
              Expanded(child: Divider(color: colors.canvasBorder, height: 1)),
            ],
          ),
          const SizedBox(height: 16),
        ],
        if (_mode == SignInMode.signup) ...[
          SField(
            label: 'Votre nom',
            controller: _nameController,
            placeholder: 'Ex. Jean Makosso',
          ),
          const SizedBox(height: 12),
        ],

        SField(
          label: 'Adresse e-mail',
          controller: _emailController,
          keyboardType: TextInputType.emailAddress,
          placeholder: 'vous@exemple.cg',
        ),
        const SizedBox(height: 12),

        if (_mode == SignInMode.signup) ...[
          SField(
            label: 'Numéro de téléphone (facultatif)',
            hint: 'Pour la coordination de vos commandes',
            controller: _phoneController,
            keyboardType: TextInputType.phone,
            placeholder: '+242 06 ...',
          ),
          const SizedBox(height: 12),
        ],

        if (_mode != SignInMode.reset) ...[
          SField(
            label: 'Mot de passe',
            hint: _mode == SignInMode.signup ? '8 caractères minimum.' : null,
            action: _mode == SignInMode.signin
                ? GestureDetector(
                    onTap: () => _switchMode(SignInMode.reset),
                    child: Text(
                      'Mot de passe oublié ?',
                      style: TextStyle(
                        fontSize: 12,
                        color: colors.textMuted,
                      ),
                    ),
                  )
                : null,
            controller: _passwordController,
            obscureText: true,
            placeholder: '••••••••',
          ),
          const SizedBox(height: 14),
        ],

        if (_error != null) ...[
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: colors.danger.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(SalacopeTokens.radiusMd),
              border: Border.all(color: colors.danger.withValues(alpha: 0.3)),
            ),
            child: Text(
              _error!,
              style: TextStyle(color: colors.danger, fontSize: 13),
            ),
          ),
          const SizedBox(height: 12),
        ],

        if (_notice != null) ...[
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: colors.surface,
              borderRadius: BorderRadius.circular(SalacopeTokens.radiusMd),
              border: Border.all(color: colors.canvasBorder),
            ),
            child: Text(
              _notice!,
              style: TextStyle(color: colors.textMuted, fontSize: 13),
            ),
          ),
          const SizedBox(height: 12),
        ],

        SButton(
          label: _busy
              ? 'Un instant…'
              : _mode == SignInMode.signup
                  ? 'Créer mon compte'
                  : _mode == SignInMode.reset
                      ? 'Recevoir le lien'
                      : 'Se connecter',
          variant: SButtonVariant.primary,
          size: SButtonSize.lg,
          pill: true,
          isLoading: _busy,
          onPressed: _busy ? null : _submit,
        ),
        const SizedBox(height: 14),

        Center(
          child: Wrap(
            crossAxisAlignment: WrapCrossAlignment.center,
            alignment: WrapAlignment.center,
            children: [
              if (_mode == SignInMode.signup) ...[
                Text(
                  'Déjà un compte ? ',
                  style: TextStyle(fontSize: 13, color: colors.textMuted),
                ),
                GestureDetector(
                  onTap: () => _switchMode(SignInMode.signin),
                  child: Text(
                    'Se connecter',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: colors.accent,
                    ),
                  ),
                ),
              ] else if (_mode == SignInMode.reset) ...[
                GestureDetector(
                  onTap: () => _switchMode(SignInMode.signin),
                  child: Text(
                    'Retour à la connexion',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: colors.accent,
                    ),
                  ),
                ),
              ] else ...[
                Text(
                  'Pas encore de compte ? ',
                  style: TextStyle(fontSize: 13, color: colors.textMuted),
                ),
                GestureDetector(
                  onTap: () => _switchMode(SignInMode.signup),
                  child: Text(
                    'Créer un compte',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: colors.accent,
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}
