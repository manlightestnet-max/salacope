import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:salacope/core/lib/format.dart';
import '../../../../core/db/store.dart';
import '../../../../core/design/colors.dart';
import '../../../../core/design/tokens.dart';
import '../../../../core/design/typography.dart';
import '../../../../core/domain/contact.dart';
import '../../../../core/domain/pricing.dart';
import '../../../../core/ui/s_button.dart';
import '../../../../core/ui/s_empty_state.dart';
import '../../../../core/ui/s_field.dart';
import '../../../../core/ui/s_page.dart';
import '../../../../core/ui/s_panel.dart';
import '../../../catalog/domain/catalog_model.dart';
import '../../../catalog/presentation/widgets/listing_cover.dart';
import '../../../profile/presentation/widgets/sign_in_sheet.dart';
import '../../data/checkout_api.dart';
import '../../data/lightpay_launcher.dart';

class CheckoutScreen extends StatefulWidget {
  final String listingId;

  const CheckoutScreen({
    super.key,
    required this.listingId,
  });

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  final Map<String, TextEditingController> _briefControllers = {};
  final _companyNameCtrl = TextEditingController();
  final _taxIdCtrl = TextEditingController();
  // Without an account: where the download link and Salacope's messages are sent (never shown to the seller).
  final _emailCtrl = TextEditingController();
  static const _emailKey = 'salacope.guestEmail';

  @override
  void initState() {
    super.initState();
    SharedPreferences.getInstance().then((p) {
      final saved = p.getString(_emailKey);
      if (saved != null && _emailCtrl.text.isEmpty && mounted) _emailCtrl.text = saved;
    });
  }

  bool get _member {
    final state = db.state;
    final user = state.users.where((u) => u.id == state.sessionUserId).firstOrNull;
    return user != null && user.guest != true;
  }

  bool _showInvoice = false;
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    for (final ctrl in _briefControllers.values) {
      ctrl.dispose();
    }
    _companyNameCtrl.dispose();
    _taxIdCtrl.dispose();
    _emailCtrl.dispose();
    super.dispose();
  }

  Future<void> _pay() async {
    if (_busy) return;
    setState(() {
      _error = null;
    });

    final briefAnswers = <String, String>{};
    for (final entry in _briefControllers.entries) {
      final text = entry.value.text.trim();
      if (text.isNotEmpty) {
        if (containsContact(text)) {
          setState(() {
            _error = contactBlocked;
          });
          return;
        }
        briefAnswers[entry.key] = text;
      }
    }

    final email = _emailCtrl.text.trim();
    if (!_member && !RegExp(r'^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$').hasMatch(email)) {
      setState(() => _error = 'Indiquez votre adresse e-mail : vous y recevrez le lien de téléchargement et nos messages.');
      return;
    }
    if (!_member) (await SharedPreferences.getInstance()).setString(_emailKey, email);

    setState(() => _busy = true);

    try {
      final invoice = _showInvoice && _companyNameCtrl.text.trim().isNotEmpty
          ? {
              'companyName': _companyNameCtrl.text.trim(),
              'taxId': _taxIdCtrl.text.trim(),
            }
          : null;

      final res = await checkoutApi.startCheckout(
        listingId: widget.listingId,
        brief: briefAnswers.isNotEmpty ? briefAnswers : null,
        invoice: invoice,
        email: _member ? null : email,
      );

      final checkoutUrl = res['checkoutUrl'] ?? '';
      final attemptId = res['attemptId'] ?? '';

      if (checkoutUrl.isNotEmpty && mounted) {
        // The LightPay app pays if it is installed, otherwise the payment page opens here; either way the return screen
        // asks LightPay where the payment stands.
        await openLightPayCheckout(context, checkoutUrl);
        if (mounted) context.go('/paiement/retour?tentative=${Uri.encodeComponent(attemptId)}');
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString().replaceFirst(RegExp(r'^[a-zA-Z0-9_]+Error:\s*'), '');
        });
      }
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;

    return ListenableBuilder(
      listenable: db,
      builder: (context, _) {
        final state = db.state;
        final listing = state.listings.where((l) => l.id == widget.listingId).firstOrNull;
        final currentUserId = state.sessionUserId;
        final user = state.users.where((u) => u.id == currentUserId).firstOrNull;

        if (listing == null || listing.status != 'published') {
          return SPage(
            title: 'Paiement',
            leading: const BackButton(),
            slivers: [
              SliverFillRemaining(
                hasScrollBody: false,
                child: SEmptyState(
                  icon: LucideIcons.circleAlert,
                  title: 'Cette offre n’est plus disponible',
                  description: 'L’offre a été retirée ou n’existe plus.',
                  action: SButton(
                    label: 'Retour au catalogue',
                    variant: SButtonVariant.primary,
                    size: SButtonSize.md,
                    pill: true,
                    onPressed: () => context.go('/'),
                  ),
                ),
              ),
            ],
          );
        }

        if (currentUserId != null && currentUserId == listing.sellerId) {
          return SPage(
            title: 'Paiement',
            leading: const BackButton(),
            slivers: [
              SliverFillRemaining(
                hasScrollBody: false,
                child: SEmptyState(
                  icon: LucideIcons.store,
                  title: 'C’est votre propre offre',
                  description: 'Vous ne pouvez pas acheter une offre de votre propre boutique.',
                  action: SButton(
                    label: 'Modifier l’offre',
                    variant: SButtonVariant.primary,
                    size: SButtonSize.md,
                    pill: true,
                    onPressed: () => context.go('/dashboard/offres'),
                  ),
                ),
              ),
            ],
          );
        }

        final amounts = priceOrder(listing.priceXaf, listing.kind);
        final questions = listing.briefQuestions ?? [];

        // Ensure controllers exist for questions
        for (final q in questions) {
          _briefControllers.putIfAbsent(q.id, () => TextEditingController());
        }

        return SPage(
          title: 'Paiement',
          leading: const BackButton(),
          slivers: [
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Summary card
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: colors.surface,
                        borderRadius: BorderRadius.circular(SalacopeTokens.radiusXl),
                        border: Border.all(color: colors.canvasBorder, width: 0.8),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(SalacopeTokens.radiusMd),
                            child: SizedBox(
                              width: 68,
                              height: 68,
                              child: ListingCover(
                                src: listing.coverImage,
                                category: listing.category,
                                bare: true,
                              ),
                            ),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  cardBreadcrumb(listing).join(' › '),
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                    color: colors.textMuted,
                                    letterSpacing: 0.3,
                                  ),
                                ),
                                const SizedBox(height: 3),
                                Text(
                                  listing.title,
                                  style: SalacopeTypography.bodyStrong.copyWith(
                                    color: colors.textPrimary,
                                  ),
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  formatXaf(amounts.total),
                                  style: TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w800,
                                    color: colors.accent,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 16),

                    // Account identity card
                    SPanel(
                      titleText: user != null && user.guest != true ? 'Votre compte' : 'Sans compte',
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: user != null && user.guest != true
                            ? Row(
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          user.name,
                                          style: SalacopeTypography.bodyStrong.copyWith(
                                            color: colors.textPrimary,
                                          ),
                                        ),
                                        Text(
                                          user.email,
                                          style: TextStyle(
                                            fontSize: 12.5,
                                            color: colors.textMuted,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  TextButton(
                                    onPressed: () => showSignInSheet(context),
                                    child: Text(
                                      'Changer',
                                      style: TextStyle(
                                        fontSize: 12.5,
                                        fontWeight: FontWeight.w600,
                                        color: colors.accent,
                                      ),
                                    ),
                                  ),
                                ],
                              )
                            : Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Payez directement par Mobile Money. Votre achat et le suivi restent sur cet appareil.',
                                    style: TextStyle(fontSize: 13, color: colors.textMuted),
                                  ),
                                  const SizedBox(height: 14),
                                  SField(
                                    label: 'Votre e-mail',
                                    hint: listing.kind == 'digital'
                                        ? 'Vous y recevez le lien de téléchargement, et nos messages en cas de litige. Jamais transmis au vendeur.'
                                        : 'Vous y recevez le suivi de la commande, et nos messages en cas de litige. Jamais transmis au vendeur.',
                                    controller: _emailCtrl,
                                    keyboardType: TextInputType.emailAddress,
                                    placeholder: 'vous@exemple.com',
                                  ),
                                  const SizedBox(height: 12),
                                  GestureDetector(
                                    onTap: () => showSignInSheet(context),
                                    child: Text(
                                      'Vous avez un compte ? Se connecter',
                                      style: TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w600,
                                        color: colors.accent,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                      ),
                    ),

                    // Brief questions if service
                    if (questions.isNotEmpty) ...[
                      const SizedBox(height: 16),
                      SPanel(
                        titleText: 'Brief pour le créateur',
                        descriptionText: 'Ce dont le vendeur a besoin pour démarrer votre commande.',
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              for (final q in questions) ...[
                                SField(
                                  label: q.label,
                                  optional: !q.required,
                                  controller: _briefControllers[q.id],
                                  placeholder: 'Votre réponse...',
                                  maxLines: 2,
                                ),
                                const SizedBox(height: 12),
                              ],
                            ],
                          ),
                        ),
                      ),
                    ],

                    const SizedBox(height: 16),

                    // Invoice option
                    SPanel(
                      titleText: 'Facturation',
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Row(
                              children: [
                                Checkbox(
                                  value: _showInvoice,
                                  activeColor: colors.accent,
                                  onChanged: (v) => setState(() => _showInvoice = v ?? false),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: GestureDetector(
                                    onTap: () => setState(() => _showInvoice = !_showInvoice),
                                    child: Text(
                                      'Reçu au nom d’une entreprise',
                                      style: SalacopeTypography.body.copyWith(
                                        color: colors.textPrimary,
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            if (_showInvoice) ...[
                              const SizedBox(height: 12),
                              SField(
                                label: 'Raison sociale',
                                controller: _companyNameCtrl,
                                placeholder: 'Ex. SMLab SARL',
                              ),
                              const SizedBox(height: 12),
                              SField(
                                label: 'Numéro d’Identification Unique (NIU)',
                                controller: _taxIdCtrl,
                                placeholder: 'Ex. M2024100...',
                              ),
                            ],
                          ],
                        ),
                      ),
                    ),

                    const SizedBox(height: 16),

                    // Operators & Security notice
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: colors.surface,
                        borderRadius: BorderRadius.circular(SalacopeTokens.radiusLg),
                        border: Border.all(color: colors.canvasBorder, width: 0.6),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(
                            LucideIcons.shieldCheck,
                            size: 20,
                            color: colors.accent,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              'Paiement sécurisé par MTN Mobile Money & Airtel Money via LightPay. Les fonds sont garantis sous séquestre jusqu’à confirmation.',
                              style: TextStyle(
                                fontSize: 12,
                                height: 1.4,
                                color: colors.textMuted,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),

                    if (_error != null) ...[
                      const SizedBox(height: 16),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
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
                    ],

                    const SizedBox(height: 24),

                    // Pay Button
                    SButton(
                      label: _busy ? 'Redirection LightPay…' : 'Payer ${formatXaf(amounts.total)}',
                      variant: SButtonVariant.primary,
                      size: SButtonSize.xl,
                      pill: true,
                      isFullWidth: true,
                      isLoading: _busy,
                      onPressed: _busy ? null : _pay,
                    ),

                    const SizedBox(height: 14),
                    Center(
                      child: Text(
                        'En confirmant, vous acceptez les conditions de vente de Salacope.',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 11,
                          color: colors.textMuted.withValues(alpha: 0.8),
                        ),
                      ),
                    ),
                    const SizedBox(height: 32),
                  ],
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}
