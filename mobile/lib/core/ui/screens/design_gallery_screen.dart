import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../config/payment.dart';
import '../../design/colors.dart';
import '../../design/typography.dart';
import '../category_tabs.dart';
import '../handoff.dart';
import '../operator_logo.dart';
import '../s_avatar.dart';
import '../s_badge.dart';
import '../s_button.dart';
import '../s_dialog.dart';
import '../s_empty_state.dart';
import '../s_field.dart';
import '../s_list.dart';
import '../s_page.dart';
import '../s_panel.dart';
import '../s_segmented.dart';
import '../s_stat.dart';
import '../s_toast.dart';
import '../updated_at.dart';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../design/theme_provider.dart';

class DesignGalleryScreen extends ConsumerStatefulWidget {
  const DesignGalleryScreen({super.key});

  @override
  ConsumerState<DesignGalleryScreen> createState() => _DesignGalleryScreenState();
}

class _DesignGalleryScreenState extends ConsumerState<DesignGalleryScreen> {
  String _selectedCategory = 'all';
  String _selectedSegment = 'grid';
  final TextEditingController _textController = TextEditingController();
  final TextEditingController _searchController = TextEditingController();

  @override
  void dispose() {
    _textController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;

    final isDark = ref.watch(themeModeProvider) == ThemeMode.dark;

    return SPage(
      title: 'Galerie Design System',
      meta: SBadge(
        label: isDark ? 'Mode Nuit' : 'Mode Clair',
        tone: SBadgeTone.neutral,
      ),
      actions: [
        IconButton(
          tooltip: 'Basculer le thème',
          icon: Icon(
            isDark ? LucideIcons.sun : LucideIcons.moon,
            size: 20,
            color: colors.gray700,
          ),
          onPressed: () => ref.read(themeModeProvider.notifier).toggle(),
        ),
      ],
      slivers: [
        SliverPadding(
          padding: const EdgeInsets.all(16),
          sliver: SliverList(
            delegate: SliverChildListDelegate([
              // 1. TYPOGRAPHY
              _buildSectionTitle('1. Typographie & Chiffres tabulaires', colors),
              SPanel(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '142 500 FCFA',
                      style: SalacopeTypography.display.copyWith(color: colors.primary700),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'créateurs du Congo',
                      style: SalacopeTypography.accentSerif.copyWith(
                        fontSize: 26,
                        color: colors.primary700,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'Titre principal de l\'écran',
                      style: SalacopeTypography.title.copyWith(color: colors.gray950),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Sous-titre de panneau ou section',
                      style: SalacopeTypography.panelTitle.copyWith(color: colors.gray900),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Corps de texte explicatif garantissant une hiérarchie par la taille et la graisse sans fioritures.',
                      style: SalacopeTypography.body.copyWith(color: colors.gray600),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'LÉGENDE / OVERLINE EN MAJUSCULES',
                      style: SalacopeTypography.overline.copyWith(color: colors.gray400),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // 2. BUTTONS
              _buildSectionTitle('2. Boutons d\'action (SButton)', colors),
              SPanel(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        SButton(
                          label: 'Principal',
                          icon: const Icon(LucideIcons.plus, size: 16),
                          onPressed: () {},
                        ),
                        SButton(
                          label: 'Secondaire',
                          variant: SButtonVariant.secondary,
                          icon: const Icon(LucideIcons.arrowUpRight, size: 16),
                          onPressed: () {},
                        ),
                        SButton(
                          label: 'Ghost',
                          variant: SButtonVariant.ghost,
                          onPressed: () {},
                        ),
                        SButton(
                          label: 'Supprimer',
                          variant: SButtonVariant.danger,
                          icon: const Icon(LucideIcons.trash2, size: 16),
                          onPressed: () {},
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Text('Tailles cibles tactiles (sm, md, lg, xl & pill) :', style: SalacopeTypography.small.copyWith(color: colors.gray500)),
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        SButton(
                          label: 'sm 36px',
                          size: SButtonSize.sm,
                          onPressed: () {},
                        ),
                        SButton(
                          label: 'md 44px',
                          size: SButtonSize.md,
                          onPressed: () {},
                        ),
                        SButton(
                          label: 'lg 48px',
                          size: SButtonSize.lg,
                          onPressed: () {},
                        ),
                        SButton(
                          label: 'xl 52px Pill',
                          size: SButtonSize.xl,
                          pill: true,
                          onPressed: () {},
                        ),
                        SButton(
                          label: 'Async Loading',
                          onPressed: () async {
                            await Future.delayed(const Duration(seconds: 2));
                          },
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // 3. BADGES
              _buildSectionTitle('3. Badges de statut (SBadge)', colors),
              SPanel(
                child: Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: const [
                    SBadge(label: 'Neutre', tone: SBadgeTone.neutral),
                    SBadge(label: 'Actif', tone: SBadgeTone.success, dot: true),
                    SBadge(label: 'En attente', tone: SBadgeTone.warning, dot: true),
                    SBadge(label: 'Litige', tone: SBadgeTone.danger, dot: true),
                    SBadge(label: 'En cours', tone: SBadgeTone.info, dot: true),
                    SBadge(label: 'Salacope', tone: SBadgeTone.brand),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // 4. STATS GRID
              _buildSectionTitle('4. Grille de métriques (SStatGrid)', colors),
              const SStatGrid(
                stats: [
                  SStat(label: 'Chiffre d\'affaires', value: '485 000 FCFA', emphasis: true),
                  SStat(label: 'Ventes confirmées', value: '24'),
                  SStat(label: 'En séquestre', value: '62 000 FCFA', hint: '3 commandes'),
                  SStat(label: 'Satisfaction', value: '98 %', hint: 'Basé sur 19 avis'),
                ],
              ),

              const SizedBox(height: 24),

              // 5. INPUT FIELDS
              _buildSectionTitle('5. Champs de formulaire (SField)', colors),
              SPanel(
                child: Column(
                  children: [
                    SSearchField(
                      controller: _searchController,
                      placeholder: 'Rechercher une offre, un créateur…',
                      onChanged: (_) {},
                    ),
                    const SizedBox(height: 14),
                    SField(
                      label: 'Titre de l\'offre',
                      placeholder: 'Ex. Guide complet Flutter & Dart',
                      controller: _textController,
                      hint: 'Un titre concis et percutant.',
                    ),
                    const SizedBox(height: 14),
                    const SField(
                      label: 'Prix de vente (FCFA)',
                      placeholder: '15 000',
                      optional: true,
                      error: 'Le montant minimum est de 1 000 FCFA',
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // 6. CATEGORY TABS & SEGMENTED
              _buildSectionTitle('6. Filtres & Onglets de catégories', colors),
              SPanel(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    CategoryTabs(
                      selectedId: _selectedCategory,
                      items: const [
                        CategoryTabItem(id: 'all', label: 'Tout', count: 48),
                        CategoryTabItem(id: 'ebook', label: 'E-books', count: 18),
                        CategoryTabItem(id: 'formation', label: 'Formations', count: 12),
                        CategoryTabItem(id: 'service', label: 'Services', count: 14),
                        CategoryTabItem(id: 'coaching', label: 'Coaching', count: 4),
                      ],
                      onSelected: (id) => setState(() => _selectedCategory = id),
                    ),
                    const SizedBox(height: 16),
                    SSegmented<String>(
                      value: _selectedSegment,
                      options: const [
                        SSegmentedOption(value: 'grid', label: 'Grille', icon: LucideIcons.layoutGrid),
                        SSegmentedOption(value: 'list', label: 'Liste', icon: LucideIcons.list),
                      ],
                      onChanged: (val) => setState(() => _selectedSegment = val),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // 7. LIST & ROWS
              _buildSectionTitle('7. Listes & Lignes (SList & SListRow)', colors),
              SList(
                children: [
                  SListRow(
                    leading: const SAvatar(name: 'Grace Ntsiba', size: SAvatarSize.md),
                    title: 'Formation Flutter Pro',
                    subtitle: 'Grace Ntsiba · Vente confirmée',
                    trailing: Text('35 000 FCFA', style: SalacopeTypography.bodyStrong.copyWith(color: colors.primary700)),
                    onTap: () {},
                  ),
                  SListRow(
                    leading: const SAvatar(name: 'Marc Dupond', size: SAvatarSize.md),
                    title: 'Template Figma E-commerce',
                    subtitle: 'Marc Dupond · En attente',
                    trailing: Text('15 000 FCFA', style: SalacopeTypography.bodyStrong.copyWith(color: colors.gray900)),
                    onTap: () {},
                  ),
                ],
              ),

              const SizedBox(height: 24),

              // 8. BRANDS & OPERATORS
              _buildSectionTitle('8. Mobile Money & Avatars', colors),
              SPanel(
                child: Row(
                  children: [
                    const OperatorLogo(channel: PaymentChannel.mtnMomoCog, size: 36),
                    const SizedBox(width: 14),
                    const OperatorLogo(channel: PaymentChannel.airtelCog, size: 36),
                    const Spacer(),
                    const SAvatar(name: 'Grace Ntsiba', size: SAvatarSize.md),
                    const SizedBox(width: 8),
                    const SAvatar(name: 'Marc Dupond', size: SAvatarSize.lg),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // 9. HANDOFF & DIALOGS
              _buildSectionTitle('9. Handoff LightPay & Boîtes de dialogue', colors),
              const Handoff(
                from: Brand.salacope,
                to: Brand.lightpay,
                title: 'Passerelle de paiement sécurisée',
                description: 'Finalisez votre transaction en toute sérénité sur LightPay.',
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  Expanded(
                    child: SButton(
                      label: 'Ouvrir Bottom Sheet',
                      variant: SButtonVariant.secondary,
                      onPressed: () {
                        showSSheet(
                          context: context,
                          title: 'Détails de la commande',
                          description: 'Consultez les informations de facturation.',
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Contenu de la feuille modale', style: SalacopeTypography.body.copyWith(color: colors.gray700)),
                              const SizedBox(height: 12),
                              const SField(label: 'Raison sociale', placeholder: 'Mon Entreprise SARL'),
                            ],
                          ),
                          footer: SButton(
                            label: 'Fermer',
                            size: SButtonSize.lg,
                            onPressed: () => Navigator.of(context).pop(),
                          ),
                        );
                      },
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: SButton(
                      label: 'Confirmer (Dialogue)',
                      variant: SButtonVariant.secondary,
                      onPressed: () {
                        showSConfirm(
                          context: context,
                          title: 'Annuler la commande ?',
                          description: 'Cette action est irréversible et libérera les fonds réservés.',
                          confirmLabel: 'Confirmer l\'annulation',
                          danger: true,
                          onConfirm: () async => true,
                        );
                      },
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 24),

              // 10. TOASTS & DIVERS
              _buildSectionTitle('10. Notifications & Horodatage', colors),
              SPanel(
                footer: UpdatedAt(at: DateTime.now()),
                child: Row(
                  children: [
                    Expanded(
                      child: SButton(
                        label: 'Toast Succès',
                        onPressed: () => SToast.success(context, 'Paiement confirmé avec succès !'),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: SButton(
                        label: 'Toast Erreur',
                        variant: SButtonVariant.secondary,
                        onPressed: () => SToast.error(context, 'Délai d\'attente dépassé. Réessayez.'),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // 11. EMPTY STATE
              _buildSectionTitle('11. État vide (SEmptyState)', colors),
              SPanel(
                child: SEmptyState(
                  icon: LucideIcons.inbox,
                  title: 'Aucune commande pour le moment',
                  description: 'Vos futures ventes apparaîtront ici dès que vos clients commanderont.',
                  action: SButton(
                    label: 'Créer une offre',
                    size: SButtonSize.sm,
                    onPressed: () {},
                  ),
                ),
              ),

              const SizedBox(height: 48),
            ]),
          ),
        ),
      ],
    );
  }

  Widget _buildSectionTitle(String title, SalacopeColors colors) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8, left: 4),
      child: Text(
        title,
        style: SalacopeTypography.panelTitle.copyWith(color: colors.gray900),
      ),
    );
  }
}
