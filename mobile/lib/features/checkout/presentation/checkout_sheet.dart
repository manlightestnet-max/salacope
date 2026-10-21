import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:salacope/core/lib/format.dart';
import '../../../core/api/sync.dart';
import '../../../core/config/platform.dart';
import '../../../core/db/models/listing.dart';
import '../../../core/db/store.dart';
import '../../../core/design/colors.dart';
import '../../../core/design/tokens.dart';
import '../../../core/design/typography.dart';
import '../../../core/domain/contact.dart';
import '../../../core/domain/pricing.dart';
import '../../../core/routing/links.dart';
import '../../../core/routing/router.dart';
import '../../../core/ui/s_button.dart';
import '../../../core/ui/s_dialog.dart';
import '../../../core/ui/s_field.dart';
import '../../../core/ui/s_toast.dart';
import '../../catalog/presentation/widgets/mini_cover.dart';
import '../../profile/presentation/widgets/sign_in_sheet.dart';
import '../data/checkout_api.dart';
import '../data/lightpay_launcher.dart';
import 'widgets/payment_progress.dart';
import 'widgets/refund_notice.dart';

/// Buying never leaves the offer: the payment opens in a sheet over it, and stays there from start to end (details,
/// hand-off to LightPay with its animation, confirmation). Closing it while a payment is under way asks first.
/// Paid: the sheet closes on the purchase (its file, or its conversation with the seller).
Future<void> openCheckout(BuildContext context, String listingId) async {
  var listing = db.state.listings.where((l) => l.id == listingId).firstOrNull;
  // An offer of a private store (a payment request in a chat, a shared link) is asked for once.
  if (listing == null) {
    await sync.openStoreLink(listingId).catchError((_) => false);
    if (!context.mounted) return;
    listing = db.state.listings.where((l) => l.id == listingId).firstOrNull;
  }
  final state = db.state;
  if (listing == null || listing.status != 'published') {
    SToast.error(context, 'Cette offre n’est plus disponible.');
    return;
  }
  if (state.sessionUserId != null && state.sessionUserId == listing.sellerId) {
    SToast.info(context, 'C’est une offre de votre boutique.');
    return;
  }
  final orderId = await showModalBottomSheet<String>(
    context: context,
    useRootNavigator: true,
    isScrollControlled: true,
    // Only the close button and back close it (each asks first when a payment is under way).
    enableDrag: false,
    backgroundColor: Colors.transparent,
    builder: (_) => CheckoutSheet(listingId: listingId),
  );
  if (orderId == null) return;
  // A free offer: nothing was paid, the order is simply there.
  if (context.mounted && listing.priceXaf > 0) SToast.success(context, 'Paiement confirmé');
  router.push('/orders/$orderId');
}

class CheckoutSheet extends StatefulWidget {
  final String listingId;
  const CheckoutSheet({super.key, required this.listingId});

  @override
  State<CheckoutSheet> createState() => _CheckoutSheetState();
}

class _CheckoutSheetState extends State<CheckoutSheet> {
  static const _emailKey = 'salacope.guestEmail';

  final Map<String, TextEditingController> _brief = {};
  final _email = TextEditingController();
  final _company = TextEditingController();
  final _taxId = TextEditingController();
  final _progress = GlobalKey<PaymentProgressState>();

  bool _invoice = false;
  bool _busy = false;
  String? _error;
  // Set once the payment is handed to LightPay: the sheet then follows it.
  String? _attemptId;

  @override
  void initState() {
    super.initState();
    SharedPreferences.getInstance().then((p) {
      final saved = p.getString(_emailKey);
      if (saved != null && _email.text.isEmpty && mounted) _email.text = saved;
    });
  }

  @override
  void dispose() {
    if (_attemptId != null) links.paymentReturn = null;
    for (final c in _brief.values) {
      c.dispose();
    }
    _email.dispose();
    _company.dispose();
    _taxId.dispose();
    super.dispose();
  }

  bool get _member {
    final s = db.state;
    final me = s.users.where((u) => u.id == s.sessionUserId).firstOrNull;
    return me != null && me.guest != true;
  }

  Future<void> _pay(Listing listing) async {
    if (_busy) return;
    setState(() => _error = null);
    final answers = <String, String>{};
    for (final q in listing.briefQuestions ?? const <BriefQuestion>[]) {
      final text = _brief[q.id]?.text.trim() ?? '';
      if (text.isEmpty && q.required) {
        setState(() => _error = 'Répondez à « ${q.label} ».');
        return;
      }
      if (containsContact(text)) {
        setState(() => _error = contactBlocked);
        return;
      }
      if (text.isNotEmpty) answers[q.id] = text;
    }
    final email = _email.text.trim();
    if (!_member && !RegExp(r'^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$').hasMatch(email)) {
      setState(() => _error = 'Indiquez votre adresse e-mail : votre achat y est envoyé.');
      return;
    }
    if (!_member) (await SharedPreferences.getInstance()).setString(_emailKey, email);

    setState(() => _busy = true);
    try {
      final res = await checkoutApi.startCheckout(
        listingId: listing.id,
        brief: answers.isEmpty ? null : answers,
        invoice: _invoice && _company.text.trim().isNotEmpty ? {'companyName': _company.text.trim(), 'taxId': _taxId.text.trim()} : null,
        email: _member ? null : email,
      );
      if (!mounted) return;
      // Free offer: nothing to pay, the order is already there.
      if (res['free'] == 'true') {
        _finish(res['orderId']);
        return;
      }
      final url = res['checkoutUrl'] ?? '';
      final attemptId = res['attemptId'] ?? '';
      if (url.isEmpty || attemptId.isEmpty) {
        setState(() => _error = 'Le paiement n’a pas pu démarrer. Réessayez.');
        return;
      }
      FocusScope.of(context).unfocus();
      // The return from LightPay lands here (the sheet checks again), never on a new screen.
      links.paymentReturn = (_) {
        _progress.currentState?.recheck();
        return true;
      };
      setState(() => _attemptId = attemptId);
      await openLightPayCheckout(context, url);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString().replaceFirst(RegExp(r'^[a-zA-Z0-9_]+(Error|Exception):\s*'), ''));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _finish([String? orderId]) {
    if (!mounted) return;
    links.paymentReturn = null;
    Navigator.of(context).pop(orderId);
  }

  Future<void> _close() async {
    if (_attemptId == null) {
      if (!_busy) _finish();
      return;
    }
    if (!(_progress.currentState?.unsettled ?? false)) {
      _finish();
      return;
    }
    final attemptId = _attemptId!;
    final leave = await showSConfirm(
      context: context,
      title: 'Abandonner le paiement ?',
      description: 'Il n’est pas encore confirmé. Si vous l’avez validé sur votre téléphone, restez : la confirmation arrive en quelques secondes.',
      confirmLabel: 'Abandonner',
      cancelLabel: 'Rester',
      danger: true,
      onConfirm: () async {
        await checkoutApi.cancelAttempt(attemptId).catchError((_) {});
        return true;
      },
    );
    if (leave == true) _finish();
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final media = MediaQuery.of(context);

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _close();
      },
      child: Padding(
        // Above the keyboard: the pay button always stays in sight.
        padding: EdgeInsets.only(bottom: media.viewInsets.bottom),
        child: Container(
          constraints: BoxConstraints(maxHeight: media.size.height * 0.92),
          decoration: BoxDecoration(
            color: colors.surface,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
            boxShadow: SalacopeTokens.shadowLg,
          ),
          child: SafeArea(
            top: false,
            child: ListenableBuilder(
              listenable: db,
              builder: (context, _) {
                final listing = db.state.listings.where((l) => l.id == widget.listingId).firstOrNull;
                return Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    _Header(
                      title: _attemptId != null
                          ? 'Paiement en cours'
                          : listing?.priceXaf == 0
                              ? 'Obtenir'
                              : 'Paiement',
                      onClose: _close,
                    ),
                    if (listing == null)
                      const Padding(padding: EdgeInsets.all(32), child: Center(child: CircularProgressIndicator(strokeWidth: 2)))
                    else if (_attemptId != null)
                      Flexible(
                        child: SingleChildScrollView(
                          padding: const EdgeInsets.fromLTRB(24, 8, 24, 24),
                          child: PaymentProgress(
                            key: _progress,
                            attemptId: _attemptId!,
                            onPaid: _finish,
                            onRetry: () => setState(() => _attemptId = null),
                            onAbandoned: _finish,
                            onSupport: () {
                              _finish();
                              router.push('/compte/support');
                            },
                          ),
                        ),
                      )
                    else ...[
                      Flexible(child: _form(context, listing)),
                      _footer(context, listing),
                    ],
                  ],
                );
              },
            ),
          ),
        ),
      ),
    );
  }

  Widget _form(BuildContext context, Listing listing) {
    final colors = context.colors;
    final amounts = priceOrder(listing.priceXaf, listing.kind);
    final questions = listing.briefQuestions ?? const <BriefQuestion>[];
    for (final q in questions) {
      _brief.putIfAbsent(q.id, () => TextEditingController());
    }
    final seller = db.state.users.where((u) => u.id == listing.sellerId).firstOrNull;
    final sellerName = seller?.merchant?.storeName ?? seller?.name ?? '';

    return SingleChildScrollView(
      keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
      padding: const EdgeInsets.fromLTRB(24, 4, 24, 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              MiniCover(src: listing.coverImage, category: listing.category, size: 56),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(listing.title, maxLines: 2, overflow: TextOverflow.ellipsis, style: SalacopeTypography.bodyStrong.copyWith(color: colors.textPrimary, height: 1.3)),
                    if (sellerName.isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Text(sellerName, maxLines: 1, overflow: TextOverflow.ellipsis, style: SalacopeTypography.caption.copyWith(color: colors.textMuted)),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Text(formatPrice(amounts.total), style: SalacopeTypography.headline.copyWith(color: colors.textPrimary)),
            ],
          ),
          if (!_member) ...[
            const _Divider(),
            SField(
              label: 'Votre e-mail',
              hint: 'Votre achat y est envoyé. Jamais transmis au vendeur.',
              controller: _email,
              keyboardType: TextInputType.emailAddress,
              placeholder: 'vous@exemple.com',
            ),
            const SizedBox(height: 4),
            Align(
              alignment: Alignment.centerLeft,
              child: TextButton(
                style: TextButton.styleFrom(padding: EdgeInsets.zero, minimumSize: const Size(0, 36)),
                onPressed: () => showSignInSheet(context),
                child: Text('J’ai déjà un compte', style: SalacopeTypography.label.copyWith(color: colors.accent, fontWeight: FontWeight.w600)),
              ),
            ),
          ],
          if (questions.isNotEmpty) ...[
            const _Divider(),
            Text('Pour le vendeur', style: SalacopeTypography.panelTitle.copyWith(color: colors.textPrimary)),
            const SizedBox(height: 14),
            for (final q in questions) ...[
              SField(
                label: q.label,
                optional: !q.required,
                controller: _brief[q.id],
                placeholder: 'Votre réponse',
                maxLines: 3,
              ),
              const SizedBox(height: 16),
            ],
          ],
          const _Divider(),
          InkWell(
            onTap: () => setState(() => _invoice = !_invoice),
            borderRadius: SalacopeTokens.borderMd,
            child: Row(
              children: [
                Expanded(child: Text('Reçu au nom d’une entreprise', style: SalacopeTypography.body.copyWith(color: colors.textPrimary))),
                Switch.adaptive(value: _invoice, activeTrackColor: colors.accent, onChanged: (v) => setState(() => _invoice = v)),
              ],
            ),
          ),
          if (_invoice) ...[
            const SizedBox(height: 12),
            SField(label: 'Raison sociale', controller: _company, placeholder: 'Ex. SMLab SARL'),
            const SizedBox(height: 12),
            SField(label: 'NIU', optional: true, controller: _taxId, placeholder: 'Ex. M2024100…'),
          ],
          if (amounts.total > 0) ...[
            const SizedBox(height: 20),
            RefundPreview(total: amounts.total),
          ],
          if (_error != null) ...[
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: colors.danger.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(SalacopeTokens.radiusMd),
              ),
              child: Text(_error!, style: SalacopeTypography.label.copyWith(color: colors.danger)),
            ),
          ],
        ],
      ),
    );
  }

  Widget _footer(BuildContext context, Listing listing) {
    final colors = context.colors;
    final amounts = priceOrder(listing.priceXaf, listing.kind);
    final free = amounts.total == 0;
    final digital = listing.kind == 'digital';
    final days = releaseDays(listing.kind);
    return Container(
      padding: const EdgeInsets.fromLTRB(24, 12, 24, 12),
      decoration: BoxDecoration(border: Border(top: BorderSide(color: colors.canvasBorder, width: 0.8))),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SButton(
            label: free
                ? 'Obtenir gratuitement'
                : _busy
                    ? 'Ouverture de LightPay…'
                    : 'Payer ${formatXaf(amounts.total)}',
            icon: free ? const Icon(LucideIcons.gift, size: 16) : null,
            variant: SButtonVariant.primary,
            size: SButtonSize.xl,
            pill: true,
            isFullWidth: true,
            isLoading: _busy,
            onPressed: _busy ? null : () => _pay(listing),
          ),
          const SizedBox(height: 8),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(free ? LucideIcons.shieldCheck : LucideIcons.lock, size: 12, color: colors.textMuted),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  free
                      ? 'Offre gratuite : aucun paiement. ${digital ? 'Votre fichier est disponible tout de suite dans vos achats.' : 'Le vendeur va accepter votre commande.'}'
                      : 'MTN MoMo, Airtel Money ou LightPay. ${digital ? 'Le vendeur n\'est payé que $days jours après votre achat, si vous ne signalez aucun problème.' : 'Le vendeur n\'est payé qu\'après votre validation, ou $days jours après la livraison.'}',
                  style: SalacopeTypography.caption.copyWith(color: colors.textMuted),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _Header extends StatelessWidget {
  final String title;
  final VoidCallback onClose;
  const _Header({required this.title, required this.onClose});

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 10, 12, 4),
      child: Row(
        children: [
          Expanded(child: Text(title, style: SalacopeTypography.headline.copyWith(color: colors.textPrimary))),
          IconButton(
            tooltip: 'Fermer',
            icon: Icon(LucideIcons.x, size: 20, color: colors.textMuted),
            onPressed: onClose,
          ),
        ],
      ),
    );
  }
}

class _Divider extends StatelessWidget {
  const _Divider();

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 20),
        child: Divider(height: 1, thickness: 0.8, color: context.colors.canvasBorder),
      );
}
