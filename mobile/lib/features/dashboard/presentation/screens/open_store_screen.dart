import 'package:flutter/material.dart';
import 'package:salacope/features/dashboard/presentation/seller_hub.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:salacope/core/db/store.dart';
import 'package:salacope/core/design/colors.dart';
import 'package:salacope/core/design/typography.dart';
import 'package:salacope/core/lib/image.dart';
import 'package:salacope/core/ui/s_button.dart';
import 'package:salacope/core/ui/s_field.dart';
import 'package:salacope/core/ui/s_image.dart';
import 'package:salacope/core/ui/s_page.dart';
import 'package:salacope/core/ui/s_panel.dart';
import 'package:salacope/core/ui/s_toast.dart';
import 'package:salacope/features/session/data/session_api.dart';

const List<String> kCongoCities = [
  'Brazzaville',
  'Pointe-Noire',
  'Dolisie',
  'Nkayi',
  'Ouesso',
  'Autre',
];

class OpenStoreScreen extends StatefulWidget {
  const OpenStoreScreen({super.key});

  @override
  State<OpenStoreScreen> createState() => _OpenStoreScreenState();
}

class _OpenStoreScreenState extends State<OpenStoreScreen> {
  final _storeNameCtrl = TextEditingController();
  final _headlineCtrl = TextEditingController();
  String _city = 'Brazzaville';
  String? _logoDataUrl;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    final user = db.user;
    if (user != null) {
      _storeNameCtrl.text = user.merchant?.storeName ?? user.name;
      _headlineCtrl.text = user.merchant?.headline ?? '';
      if (user.merchant?.city != null && kCongoCities.contains(user.merchant!.city)) {
        _city = user.merchant!.city;
      }
      _logoDataUrl = user.merchant?.logo;
    }
  }

  @override
  void dispose() {
    _storeNameCtrl.dispose();
    _headlineCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickLogo() async {
    try {
      final dataUrl = await pickAndCompressImage(maxSide: 400, maxBytes: 80000);
      if (dataUrl != null) {
        setState(() => _logoDataUrl = dataUrl);
      }
    } catch (e) {
      if (mounted) {
        SToast.error(context, e.toString());
      }
    }
  }

  Future<void> _submit() async {
    if (_storeNameCtrl.text.trim().isEmpty) {
      SToast.show(context, message: 'Indiquez le nom de votre boutique.', variant: SToastVariant.danger);
      return;
    }

    setState(() => _busy = true);
    try {
      final user = db.user;
      final isUpdate = user?.merchant != null;

      if (isUpdate) {
        await sessionApi.updateMerchant(
          storeName: _storeNameCtrl.text.trim(),
          headline: _headlineCtrl.text.trim(),
          city: _city,
        );
      } else {
        await sessionApi.activateMerchant(
          storeName: _storeNameCtrl.text.trim(),
          headline: _headlineCtrl.text.trim(),
          city: _city,
        );
      }

      if (_logoDataUrl != null) {
        await sessionApi.setStoreLogo(_logoDataUrl);
      }

      if (mounted) {
        SToast.show(
          context,
          message: isUpdate ? 'Boutique mise à jour' : 'Boutique créée avec succès !',
          variant: SToastVariant.success,
        );
        openSellerSection(context, 'apercu');
      }
    } catch (e) {
      if (mounted) {
        SToast.show(context, message: e.toString(), variant: SToastVariant.danger);
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final user = db.user;
    final isUpdate = user?.merchant != null;

    return SPage(
      title: isUpdate ? 'Ma boutique' : 'Ouvrir ma boutique',
      leading: const BackButton(),
      slivers: [
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (!isUpdate) ...[
                  Text(
                    'Vendez vos produits digitaux et services aux créateurs et professionnels du Congo. Sans abonnement, vos fonds sont sécurisés par séquestre bancaire.',
                    style: SalacopeTypography.body.copyWith(color: colors.textSecondary),
                  ),
                  const SizedBox(height: 16),
                ],

                SPanel(
                  titleText: 'Identité de la boutique',
                  descriptionText: 'Ces informations apparaîtront sur vos offres et reçus clients.',
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Logo
                      Center(
                        child: Column(
                          children: [
                            InkWell(
                              onTap: _pickLogo,
                              borderRadius: BorderRadius.circular(999),
                              child: Container(
                                width: 80,
                                height: 80,
                                decoration: BoxDecoration(
                                  color: colors.gray100,
                                  shape: BoxShape.circle,
                                  border: Border.all(color: colors.canvasBorder, width: 1.5),
                                ),
                                clipBehavior: Clip.antiAlias,
                                child: _logoDataUrl != null
                                    ? SImage(url: _logoDataUrl!, fit: BoxFit.cover)
                                    : Icon(LucideIcons.store, size: 36, color: colors.textMuted),
                              ),
                            ),
                            const SizedBox(height: 8),
                            InkWell(
                              onTap: _pickLogo,
                              child: Text(
                                _logoDataUrl != null ? 'Modifier le logo' : '+ Ajouter un logo',
                                style: TextStyle(
                                  color: colors.accent,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 20),

                      SField(
                        label: 'Nom de la boutique',
                        hint: 'Nom public visible par tous',
                        child: TextField(
                          controller: _storeNameCtrl,
                          maxLength: 60,
                          decoration: const InputDecoration(
                            hintText: 'Ex. : Studio Design Brazza',
                            counterText: '',
                          ),
                        ),
                      ),
                      const SizedBox(height: 14),

                      SField(
                        label: 'Activité principale',
                        hint: 'Ex. : Graphiste, Formateur Excel, Développeur Web…',
                        child: TextField(
                          controller: _headlineCtrl,
                          maxLength: 140,
                          decoration: const InputDecoration(
                            hintText: 'Votre spécialité ou métier',
                            counterText: '',
                          ),
                        ),
                      ),
                      const SizedBox(height: 14),

                      SField(
                        label: 'Ville au Congo',
                        child: DropdownButtonFormField<String>(
                          initialValue: _city,
                          dropdownColor: colors.surface,
                          items: kCongoCities
                              .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                              .toList(),
                          onChanged: (v) {
                            if (v != null) setState(() => _city = v);
                          },
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                SButton(
                  label: _busy
                      ? 'Enregistrement…'
                      : isUpdate
                          ? 'Enregistrer les modifications'
                          : 'Ouvrir ma boutique',
                  variant: SButtonVariant.primary,
                  size: SButtonSize.lg,
                  loading: _busy,
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
