import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:share_plus/share_plus.dart';
import 'package:salacope/core/lib/image.dart';
import '../../../../core/config/env.dart';
import '../../../../core/db/store.dart';
import '../../../../core/design/colors.dart';
import '../../../../core/design/typography.dart';
import '../../../../core/ui/s_avatar.dart';
import '../../../../core/ui/s_button.dart';
import '../../../../core/ui/s_field.dart';
import '../../../../core/ui/s_segmented.dart';
import '../../../../core/ui/s_toast.dart';
import '../../../session/data/session_api.dart';

/// `/compte/parametres/boutique`: the store as buyers see it (photo, name, line, city), its address, and whether it shows
/// in the catalogue (public) or only through its own link (private, for sellers who prefer to stay away from competitors).
class StoreSettingsScreen extends StatefulWidget {
  const StoreSettingsScreen({super.key});

  @override
  State<StoreSettingsScreen> createState() => _StoreSettingsScreenState();
}

class _StoreSettingsScreenState extends State<StoreSettingsScreen> {
  final _name = TextEditingController();
  final _headline = TextEditingController();
  final _city = TextEditingController();
  final _handle = TextEditingController();
  bool _busy = false;
  bool _photoBusy = false;

  @override
  void initState() {
    super.initState();
    final m = db.user?.merchant;
    _name.text = m?.storeName ?? '';
    _headline.text = m?.headline ?? '';
    _city.text = m?.city ?? '';
    _handle.text = m?.handle ?? '';
  }

  @override
  void dispose() {
    _name.dispose();
    _headline.dispose();
    _city.dispose();
    _handle.dispose();
    super.dispose();
  }

  Future<void> _run(Future<void> Function() fn, String done) async {
    try {
      await fn();
      if (mounted) SToast.success(context, done);
    } catch (e) {
      if (mounted) SToast.error(context, e.toString());
    }
  }

  Future<void> _save() async {
    setState(() => _busy = true);
    await _run(() => sessionApi.updateMerchant(storeName: _name.text, headline: _headline.text, city: _city.text), 'Boutique enregistrée');
    if (mounted) setState(() => _busy = false);
  }

  Future<void> _photo() async {
    setState(() => _photoBusy = true);
    try {
      // Square and light: the server keeps it on storage (never in the database).
      final picked = await pickAndCompressImage(maxSide: 512, maxBytes: 75000);
      if (picked != null) await _run(() => sessionApi.setStoreLogo(picked), 'Photo enregistrée');
    } catch (e) {
      if (mounted) SToast.error(context, e.toString());
    } finally {
      if (mounted) setState(() => _photoBusy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    return ListenableBuilder(
      listenable: db,
      builder: (context, _) {
        final user = db.user;
        final m = user?.merchant;
        if (user == null || m == null) {
          return Scaffold(appBar: AppBar(title: const Text('Boutique')), body: const SizedBox.shrink());
        }
        final link = '${Env.publicUrl}${m.verified && (m.handle ?? '').isNotEmpty ? '/@${m.handle}' : '/s/${user.id}'}';

        return Scaffold(
          backgroundColor: colors.canvas,
          appBar: AppBar(backgroundColor: colors.surface, elevation: 0, title: const Text('Boutique')),
          body: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Row(
                children: [
                  SAvatar(name: m.storeName, src: m.logo, size: SAvatarSize.xl),
                  const SizedBox(width: 14),
                  Expanded(
                    child: SButton(
                      label: m.logo == null ? 'Ajouter une photo' : 'Changer la photo',
                      variant: SButtonVariant.secondary,
                      size: SButtonSize.md,
                      isLoading: _photoBusy,
                      icon: const Icon(LucideIcons.camera, size: 16),
                      onPressed: _photoBusy ? null : _photo,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              SField(label: 'Nom de la boutique', controller: _name),
              const SizedBox(height: 14),
              SField(label: 'Accroche', hint: 'Une phrase sur ce que vous proposez.', controller: _headline),
              const SizedBox(height: 14),
              SField(label: 'Ville', controller: _city, placeholder: 'Brazzaville'),
              const SizedBox(height: 18),
              SButton(label: 'Enregistrer', size: SButtonSize.lg, pill: true, isLoading: _busy, onPressed: _busy ? null : _save),
              const SizedBox(height: 28),

              Text('Visibilité', style: SalacopeTypography.bodyStrong.copyWith(color: colors.textPrimary)),
              const SizedBox(height: 8),
              SSegmented<String>(
                value: m.isPrivate ? 'private' : 'public',
                options: const [SSegmentedOption(value: 'public', label: 'Publique'), SSegmentedOption(value: 'private', label: 'Privée')],
                onChanged: (v) => _run(() => sessionApi.setStorePrivate(v == 'private'), v == 'private' ? 'Boutique privée' : 'Boutique publique'),
              ),
              const SizedBox(height: 8),
              Text(
                m.isPrivate
                    ? 'Votre boutique n’apparaît nulle part sur Salacope. Seules les personnes qui ont votre lien la voient, comme une boutique à part.'
                    : 'Votre boutique et vos offres apparaissent dans le catalogue, l’Explorer et la recherche.',
                style: TextStyle(fontSize: 12.5, color: colors.textMuted, height: 1.4),
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  Expanded(child: Text(link.replaceFirst(RegExp('^https?://'), ''), maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 13, color: colors.textPrimary))),
                  IconButton(
                    tooltip: 'Copier le lien',
                    icon: Icon(LucideIcons.copy, size: 18, color: colors.textMuted),
                    onPressed: () async {
                      await Clipboard.setData(ClipboardData(text: link));
                      if (context.mounted) SToast.success(context, 'Lien copié');
                    },
                  ),
                  IconButton(
                    tooltip: 'Partager',
                    icon: Icon(LucideIcons.share2, size: 18, color: colors.textMuted),
                    // ignore: deprecated_member_use
                    onPressed: () => Share.share('${m.storeName} sur Salacope : $link'),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              Text('Adresse de la boutique', style: SalacopeTypography.bodyStrong.copyWith(color: colors.textPrimary)),
              const SizedBox(height: 8),
              if (!m.verified)
                Text('Disponible une fois votre identité vérifiée : salacope.online/@votre-nom.', style: TextStyle(fontSize: 12.5, color: colors.textMuted))
              else ...[
                SField(label: '@', hint: '3 à 30 caractères : lettres, chiffres, point, tiret ou tiret bas.', controller: _handle, placeholder: 'maboutique'),
                const SizedBox(height: 10),
                SButton(
                  label: 'Enregistrer l’adresse',
                  variant: SButtonVariant.secondary,
                  size: SButtonSize.md,
                  onPressed: () {
                    final h = _handle.text.trim().replaceFirst('@', '').toLowerCase();
                    _run(() => sessionApi.setStoreHandle(h.isEmpty ? null : h), h.isEmpty ? 'Adresse retirée' : 'Adresse enregistrée');
                  },
                ),
              ],
            ],
          ),
        );
      },
    );
  }
}
