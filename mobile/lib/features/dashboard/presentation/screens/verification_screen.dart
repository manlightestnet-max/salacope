import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:salacope/core/db/store.dart';
import 'package:salacope/core/design/colors.dart';
import 'package:salacope/core/design/tokens.dart';
import 'package:salacope/core/design/typography.dart';
import 'package:salacope/core/lib/image.dart';
import 'package:salacope/core/ui/s_button.dart';
import 'package:salacope/core/ui/s_empty_state.dart';
import 'package:salacope/core/ui/s_field.dart';
import 'package:salacope/core/ui/s_image.dart';
import 'package:salacope/core/ui/s_page.dart';
import 'package:salacope/core/ui/s_panel.dart';
import 'package:salacope/core/ui/s_toast.dart';
import 'package:salacope/features/verification/data/kyc_api.dart';

class VerificationScreen extends StatefulWidget {
  const VerificationScreen({super.key});

  @override
  State<VerificationScreen> createState() => _VerificationScreenState();
}

class _VerificationScreenState extends State<VerificationScreen> {
  final _fullNameCtrl = TextEditingController();
  final _birthDateCtrl = TextEditingController();
  final _nationalityCtrl = TextEditingController();
  String _idType = 'national_id'; // national_id | passport
  final _idNumberCtrl = TextEditingController();
  final _idExpiresCtrl = TextEditingController();
  final _addressCtrl = TextEditingController();
  bool _isPep = false;
  bool _certified = false;
  bool _submitting = false;

  String? _frontDoc;
  String? _backDoc;
  String? _selfieDoc;

  @override
  void initState() {
    super.initState();
    final user = db.user;
    if (user != null) {
      _fullNameCtrl.text = user.name;
      _nationalityCtrl.text = 'Congolaise';
    }
  }

  @override
  void dispose() {
    _fullNameCtrl.dispose();
    _birthDateCtrl.dispose();
    _nationalityCtrl.dispose();
    _idNumberCtrl.dispose();
    _idExpiresCtrl.dispose();
    _addressCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickDocumentPhoto(String kind) async {
    try {
      final dataUrl = await pickAndCompressImage();
      if (dataUrl != null) {
        setState(() {
          if (kind == 'front') _frontDoc = dataUrl;
          if (kind == 'back') _backDoc = dataUrl;
          if (kind == 'selfie') _selfieDoc = dataUrl;
        });
      }
    } catch (e) {
      if (mounted) {
        SToast.error(context, e.toString());
      }
    }
  }

  Future<void> _submit() async {
    if (_frontDoc == null || _frontDoc!.isEmpty) {
      SToast.error(context, 'Ajoutez la photo recto de votre pièce.');
      return;
    }
    if (_idType == 'national_id' && (_backDoc == null || _backDoc!.isEmpty)) {
      SToast.error(context, 'Ajoutez la photo verso de votre pièce.');
      return;
    }
    if (_selfieDoc == null || _selfieDoc!.isEmpty) {
      SToast.error(context, 'Ajoutez votre selfie avec votre pièce d’identité.');
      return;
    }
    if (!_certified) {
      SToast.error(context, 'Cochez la case pour certifier vos informations.');
      return;
    }

    final docs = <String, String>{
      'front': _frontDoc!,
      'selfie': _selfieDoc!,
    };
    if (_backDoc != null && _backDoc!.isNotEmpty) {
      docs['back'] = _backDoc!;
    } else {
      docs['back'] = _frontDoc!;
    }

    final input = <String, dynamic>{
      'fullName': _fullNameCtrl.text.trim(),
      'birthDate': _birthDateCtrl.text.trim(),
      'nationality': _nationalityCtrl.text.trim(),
      'idType': _idType,
      'idNumber': _idNumberCtrl.text.trim(),
      if (_idExpiresCtrl.text.trim().isNotEmpty) 'idExpires': _idExpiresCtrl.text.trim(),
      'address': _addressCtrl.text.trim(),
      'pep': _isPep,
      'documents': docs,
    };

    setState(() => _submitting = true);
    try {
      await kycApi.submitKyc(input);
      if (mounted) {
        SToast.success(context, 'Dossier de vérification envoyé avec succès.');
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        SToast.error(context, e.toString());
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final user = db.user;

    if (user == null || user.merchant == null) {
      return Scaffold(
        backgroundColor: colors.canvas,
        appBar: AppBar(backgroundColor: colors.canvas, leading: const BackButton()),
        body: const Center(
          child: SEmptyState(
            title: 'Boutique requise',
            description: 'Vous devez avoir une boutique pour vérifier votre identité.',
          ),
        ),
      );
    }

    final kycStatus = user.merchant!.kycStatus;

    if (kycStatus == 'approved') {
      return SPage(
        title: 'Vérification d’identité',
        leading: const BackButton(),
        slivers: [
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 64,
                      height: 64,
                      decoration: BoxDecoration(
                        color: colors.accent.withValues(alpha: 0.1),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(LucideIcons.shieldCheck, size: 36, color: colors.accent),
                    ),
                    const SizedBox(height: 16),
                    Text('Identité vérifiée', style: SalacopeTypography.headingMedium),
                    const SizedBox(height: 8),
                    Text(
                      'Votre identité de vendeur a été validée avec succès. Vous pouvez publier et vendre sans restriction.',
                      style: SalacopeTypography.body.copyWith(color: colors.textSecondary),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 24),
                    SButton(
                      label: 'Retour au tableau de bord',
                      variant: SButtonVariant.primary,
                      onPressed: () => context.pop(),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      );
    }

    return SPage(
      title: 'Vérification d’identité',
      leading: const BackButton(),
      slivers: [
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (kycStatus == 'pending') ...[
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: colors.blue500.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(SalacopeTokens.radiusLg),
                      border: Border.all(color: colors.blue500.withValues(alpha: 0.3)),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(LucideIcons.clock, size: 20, color: colors.blue500),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Dossier en cours d’examen',
                                style: SalacopeTypography.bodyStrong.copyWith(color: colors.textPrimary),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                'Vos documents sont en cours de validation par l’équipe de conformité (sous 48 h ouvrées). Vous pouvez mettre à jour vos documents ci-dessous si nécessaire.',
                                style: SalacopeTypography.caption.copyWith(color: colors.textSecondary),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                ],

                SPanel(
                  titleText: 'Informations personnelles',
                  descriptionText: 'Identité telle qu’elle figure sur votre pièce officielle.',
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      SField(
                        label: 'Nom complet',
                        child: TextField(
                          controller: _fullNameCtrl,
                          decoration: const InputDecoration(hintText: 'Prénom et nom'),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: SField(
                              label: 'Date de naissance',
                              hint: 'AAAA-MM-JJ',
                              child: TextField(
                                controller: _birthDateCtrl,
                                decoration: const InputDecoration(hintText: '1995-05-14'),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: SField(
                              label: 'Nationalité',
                              child: TextField(
                                controller: _nationalityCtrl,
                                decoration: const InputDecoration(hintText: 'Congolaise'),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: SField(
                              label: 'Type de document',
                              child: DropdownButtonFormField<String>(
                                initialValue: _idType,
                                dropdownColor: colors.surface,
                                items: const [
                                  DropdownMenuItem(value: 'national_id', child: Text('Carte d’identité (CNI)')),
                                  DropdownMenuItem(value: 'passport', child: Text('Passeport')),
                                ],
                                onChanged: (v) {
                                  if (v != null) setState(() => _idType = v);
                                },
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: SField(
                              label: 'Numéro du document',
                              child: TextField(
                                controller: _idNumberCtrl,
                                decoration: const InputDecoration(hintText: 'N° de pièce'),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: SField(
                              label: 'Date d’expiration',
                              hint: 'Optionnelle',
                              child: TextField(
                                controller: _idExpiresCtrl,
                                decoration: const InputDecoration(hintText: 'AAAA-MM-JJ'),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: SField(
                              label: 'Adresse de résidence',
                              child: TextField(
                                controller: _addressCtrl,
                                decoration: const InputDecoration(hintText: 'Brazzaville, Ouenze…'),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      CheckboxListTile(
                        value: _isPep,
                        contentPadding: EdgeInsets.zero,
                        controlAffinity: ListTileControlAffinity.leading,
                        title: Text(
                          'Êtes-vous une Personne Exposée Politiquement (PEP) ?',
                          style: SalacopeTypography.caption.copyWith(color: colors.textPrimary),
                        ),
                        onChanged: (v) => setState(() => _isPep = v ?? false),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // Documents photos
                SPanel(
                  titleText: 'Documents d’identité',
                  descriptionText: 'Photos claires et nettes de votre pièce officielle et de vous-même.',
                  child: Column(
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: _PhotoBox(
                              label: 'Recto de la pièce',
                              hint: 'Face avant lisible',
                              dataUrl: _frontDoc,
                              onTap: () => _pickDocumentPhoto('front'),
                            ),
                          ),
                          if (_idType == 'national_id') ...[
                            const SizedBox(width: 10),
                            Expanded(
                              child: _PhotoBox(
                                label: 'Verso de la pièce',
                                hint: 'Face arrière',
                                dataUrl: _backDoc,
                                onTap: () => _pickDocumentPhoto('back'),
                              ),
                            ),
                          ],
                        ],
                      ),
                      const SizedBox(height: 12),
                      _PhotoBox(
                        label: 'Selfie avec votre pièce',
                        hint: 'Votre visage et votre pièce tenus côte à côte de façon lisible.',
                        dataUrl: _selfieDoc,
                        onTap: () => _pickDocumentPhoto('selfie'),
                      ),
                      const SizedBox(height: 16),
                      CheckboxListTile(
                        value: _certified,
                        contentPadding: EdgeInsets.zero,
                        controlAffinity: ListTileControlAffinity.leading,
                        title: Text(
                          'Je certifie sur l’honneur que les informations et documents fournis sont exacts et authentiques.',
                          style: SalacopeTypography.caption.copyWith(color: colors.textPrimary),
                        ),
                        onChanged: (v) => setState(() => _certified = v ?? false),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                SButton(
                  label: _submitting ? 'Envoi en cours…' : 'Envoyer pour vérification',
                  variant: SButtonVariant.primary,
                  size: SButtonSize.lg,
                  loading: _submitting,
                  onPressed: _submit,
                ),
                const SizedBox(height: 32),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _PhotoBox extends StatelessWidget {
  final String label;
  final String hint;
  final String? dataUrl;
  final VoidCallback onTap;

  const _PhotoBox({
    required this.label,
    required this.hint,
    this.dataUrl,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(SalacopeTokens.radiusLg),
      child: Container(
        height: 110,
        decoration: BoxDecoration(
          color: colors.gray50,
          borderRadius: BorderRadius.circular(SalacopeTokens.radiusLg),
          border: Border.all(color: colors.canvasBorder, style: BorderStyle.solid),
        ),
        clipBehavior: Clip.antiAlias,
        child: dataUrl != null && dataUrl!.isNotEmpty
            ? Stack(
                fit: StackFit.expand,
                children: [
                  SImage(url: dataUrl, fit: BoxFit.cover),
                  Positioned(
                    bottom: 0,
                    left: 0,
                    right: 0,
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 4),
                      color: Colors.black.withValues(alpha: 0.6),
                      child: Text(
                        '$label · Changer',
                        style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ),
                ],
              )
            : Padding(
                padding: const EdgeInsets.all(8),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(LucideIcons.camera, size: 22, color: colors.textMuted),
                    const SizedBox(height: 4),
                    Text(
                      label,
                      style: SalacopeTypography.bodyStrong.copyWith(color: colors.textPrimary, fontSize: 12),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      hint,
                      style: SalacopeTypography.caption.copyWith(color: colors.textMuted, fontSize: 10),
                      textAlign: TextAlign.center,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
      ),
    );
  }
}
