import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:salacope/core/lib/format.dart';
import 'package:salacope/core/lib/remembered.dart';
import '../../../../core/db/models/order.dart';
import '../../../../core/db/models/user.dart';
import '../../../../core/db/store.dart';
import '../../../../core/design/colors.dart';
import '../../../../core/design/tokens.dart';
import '../../../../core/design/typography.dart';
import '../../../../core/domain/orders.dart';
import '../../../../core/ui/s_badge.dart';
import '../../../../core/ui/s_button.dart';
import '../../../../core/ui/s_dialog.dart';
import '../../../../core/ui/s_empty_state.dart';
import '../../../../core/ui/s_field.dart';
import '../../../../core/ui/s_page.dart';
import '../../../../core/ui/s_tabs.dart';
import '../../../../core/ui/s_toast.dart';
import '../../../catalog/presentation/widgets/mini_cover.dart';
import '../../../checkout/presentation/widgets/refund_notice.dart';
import '../../data/orders_api.dart';
import '../widgets/order_cards.dart';
import '../widgets/order_dialogs.dart';
import '../widgets/order_row.dart';

/// Details of an order: what it is, what it cost, the clock, brief and delivery, and its steps. It only shows: every action
/// (accept, refuse, deliver, ask for time, validate, revise, report) is taken in the order's discussion, which opens from here.
class OrderDetailScreen extends StatelessWidget {
  final String orderId;

  const OrderDetailScreen({super.key, required this.orderId});

  static final Remembered _tab = Remembered('order.tab', const ['suivi', 'brief', 'historique'], 'suivi');

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: Listenable.merge([db, _tab]),
      builder: (context, _) {
        final state = db.state;
        final order = state.orders.where((o) => o.id == orderId).firstOrNull;
        final userId = state.sessionUserId ?? '';

        if (order == null) {
          return SPage(
            title: 'Commande',
            leading: const BackButton(),
            slivers: [
              SliverFillRemaining(
                hasScrollBody: false,
                child: SEmptyState(
                  icon: LucideIcons.circleAlert,
                  title: 'Commande introuvable',
                  description: 'Cette commande n’existe pas ou vous n’y avez pas accès.',
                  action: SButton(label: 'Mes achats', size: SButtonSize.md, pill: true, onPressed: () => context.go('/orders')),
                ),
              ),
            ],
          );
        }

        final perspective = perspectiveOf(buyerId: order.buyerId, sellerId: order.sellerId, userId: userId) ?? Perspective.buyer;
        final isSeller = perspective == Perspective.seller;
        final service = order.item.kind == 'service';
        final info = order.statusFor(perspective);
        final seller = state.users.where((u) => u.id == order.sellerId).firstOrNull;
        final sellerName = _storeName(seller);
        final counterpart = isSeller ? order.buyer.name : sellerName;

        final tabs = [
          const STab(value: 'suivi', label: 'Suivi'),
          if (service) const STab(value: 'brief', label: 'Brief et livraison'),
          const STab(value: 'historique', label: 'Historique'),
        ];
        final tab = tabs.any((t) => t.value == _tab.value) ? _tab.value : 'suivi';

        final List<Widget> content = switch (tab) {
          'brief' => [
              if (order.brief?.isNotEmpty ?? false) BriefCard(order: order, perspective: perspective),
              DeliveryCard(order: order, perspective: perspective),
              if ((order.brief?.isEmpty ?? true) && order.delivery == null)
                const SEmptyState(
                  icon: LucideIcons.clipboardList,
                  title: 'Rien pour l’instant',
                  description: 'Le brief du client et la livraison du vendeur apparaissent ici.',
                ),
            ],
          'historique' => [
              _Timeline(order: order, users: state.users),
              _Links(order: order, isSeller: isSeller),
            ],
          _ => [
              // Everything that is done on an order (accept, deliver, validate, revise…) is done in its discussion.
              ChatPreviewCard(order: order, userId: userId, counterpartName: counterpart),
              _Summary(order: order, perspective: perspective, sellerName: sellerName),
              if (!service) _DigitalFiles(order: order, perspective: perspective),
              if (service) DeadlineCard(order: order, perspective: perspective),
              if (!isSeller && order.status == 'completed') _ReviewPrompt(orderId: order.id),
            ],
        };

        return SPage(
          title: order.number,
          leading: const BackButton(),
          meta: SBadge(label: info.label, tone: badgeToneOf(info.tone), dot: true),
          actions: [
            IconButton(
              icon: Icon(LucideIcons.messagesSquare, size: 20, color: context.colors.textPrimary),
              tooltip: 'Discussion',
              onPressed: () => context.push('/compte/messages/${order.id}'),
            ),
          ],
          toolbar: PreferredSize(
            preferredSize: const Size.fromHeight(46),
            child: STabs<String>(value: tab, tabs: tabs, onChanged: (v) => _tab.value = v),
          ),
          slivers: [
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
              sliver: SliverList.separated(
                itemCount: content.length,
                separatorBuilder: (_, _) => const SizedBox(height: 16),
                itemBuilder: (_, i) => content[i],
              ),
            ),
          ],
        );
      },
    );
  }
}

String _storeName(User? u) => u?.merchant?.storeName.isNotEmpty == true ? u!.merchant!.storeName : (u?.name ?? 'Vendeur');

/// What the order is, who it is with, and its money on one line.
class _Summary extends StatelessWidget {
  final Order order;
  final Perspective perspective;
  final String sellerName;
  const _Summary({required this.order, required this.perspective, required this.sellerName});

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final isSeller = perspective == Perspective.seller;
    return OrderCardFrame(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              MiniCover(src: order.item.coverImage, category: order.item.category, size: 56, muted: order.status == 'cancelled'),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${isSeller ? 'Pour ${order.buyer.name}' : 'Par $sellerName'} · commandé ${formatRelative(order.createdAt)}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: SalacopeTypography.caption.copyWith(color: colors.gray500),
                    ),
                    const SizedBox(height: 4),
                    Text(order.item.title,
                        maxLines: 2, overflow: TextOverflow.ellipsis, style: SalacopeTypography.panelTitle.copyWith(color: colors.gray900)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Divider(height: 1, color: colors.gray100),
          const SizedBox(height: 14),
          _PaymentLine(order: order, perspective: perspective),
        ],
      ),
    );
  }
}

/// The money of an order: amount, where the funds sit (a tappable indicator), how it was paid, reference, code; for the buyer,
/// what a cancellation gives back.
class _PaymentLine extends StatefulWidget {
  final Order order;
  final Perspective perspective;
  const _PaymentLine({required this.order, required this.perspective});

  @override
  State<_PaymentLine> createState() => _PaymentLineState();
}

class _PaymentLineState extends State<_PaymentLine> {
  bool _open = false;

  String _explain(Order order, FundsState state) => switch (state) {
        FundsState.escrow =>
          'L’argent est gardé en sécurité jusqu’à la validation du client${order.releaseAt != null ? ', ou versé automatiquement ${formatRelative(order.releaseAt)} (${formatDateTime(order.releaseAt)})' : ''}.',
        FundsState.released => 'L’argent a été versé au vendeur · ${formatDateTime(order.updatedAt)}.',
        FundsState.refunded => 'Le client a été remboursé · ${formatDateTime(order.updatedAt)}.',
        FundsState.frozen => 'Un litige est ouvert : l’argent est bloqué jusqu’à la décision de Salacope.',
      };

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final order = widget.order;
    final seller = widget.perspective == Perspective.seller;
    final caption = SalacopeTypography.caption.copyWith(color: colors.gray500);

    // Nothing was paid: no funds to follow, no operator, no reference.
    if (order.amounts.total == 0) {
      return Wrap(
        crossAxisAlignment: WrapCrossAlignment.center,
        spacing: 10,
        children: [
          Text('Gratuit', style: SalacopeTypography.panelTitle.copyWith(color: colors.gray900)),
          Text('Offre gratuite · aucun paiement', style: caption),
        ],
      );
    }

    final state = fundsState(order.status);
    final (label, icon, bg, fg) = switch (state) {
      FundsState.escrow => ('Retenus par Salacope', LucideIcons.lock, colors.amber50, colors.amber800),
      FundsState.released => ('Versés au vendeur', LucideIcons.circleCheck, colors.emerald50, colors.emerald700),
      FundsState.refunded => ('Remboursés au client', LucideIcons.undo2, colors.gray100, colors.gray600),
      FundsState.frozen => ('Bloqués (litige)', LucideIcons.triangleAlert, colors.red50, colors.red600),
    };
    final refund = order.refund;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Wrap(
          crossAxisAlignment: WrapCrossAlignment.center,
          spacing: 10,
          runSpacing: 8,
          children: [
            Text(formatXaf(seller ? order.amounts.net : order.amounts.total), style: SalacopeTypography.panelTitle.copyWith(color: colors.gray900)),
            if (seller && order.amounts.net != order.amounts.total) Text('sur ${formatXaf(order.amounts.total)} payés', style: caption),
            if (order.amounts.discount > 0) Text('remise ${order.couponCode ?? ''} −${formatXaf(order.amounts.discount)}', style: caption),
            InkWell(
              onTap: () => setState(() => _open = !_open),
              borderRadius: SalacopeTokens.borderFull,
              child: Container(
                height: 28,
                padding: const EdgeInsets.fromLTRB(4, 0, 8, 0),
                decoration: BoxDecoration(borderRadius: SalacopeTokens.borderFull, border: Border.all(color: colors.gray200)),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 20,
                      height: 20,
                      decoration: BoxDecoration(color: bg, shape: BoxShape.circle),
                      child: Icon(icon, size: 12, color: fg),
                    ),
                    const SizedBox(width: 6),
                    Text(label, style: SalacopeTypography.caption.copyWith(color: colors.gray800, fontWeight: FontWeight.w500)),
                    const SizedBox(width: 4),
                    AnimatedRotation(
                      turns: _open ? 0.5 : 0,
                      duration: MediaQuery.of(context).disableAnimations ? Duration.zero : const Duration(milliseconds: 200),
                      child: Icon(LucideIcons.chevronDown, size: 12, color: colors.gray400),
                    ),
                  ],
                ),
              ),
            ),
            Text('${paymentMethodLabel(order.payment)} · ${order.payment.reference}', style: caption),
            if (order.payment.code != null) Text(order.payment.code!, style: caption.copyWith(fontFamily: 'monospace')),
          ],
        ),
        if (_open) ...[
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: colors.gray50,
              borderRadius: BorderRadius.circular(SalacopeTokens.radiusXl),
              border: Border.all(color: colors.gray200),
            ),
            child: Text(_explain(order, state), style: SalacopeTypography.caption.copyWith(color: colors.gray600)),
          ),
          if (!seller && refund == null && state == FundsState.escrow) ...[const SizedBox(height: 10), RefundPreview(total: order.amounts.total)],
        ],
        // A cancelled order: what the buyer really got back, always in sight.
        if (!seller && refund != null) ...[const SizedBox(height: 12), RefundReceipt(refund: refund)],
      ],
    );
  }
}

/// A digital product: its files, and for the buyer the way to report a problem before the seller is paid.
class _DigitalFiles extends StatelessWidget {
  final Order order;
  final Perspective perspective;
  const _DigitalFiles({required this.order, required this.perspective});

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final available = ['delivered', 'completed', 'disputed'].contains(order.status);
    final buyer = perspective == Perspective.buyer;
    final canReport = buyer && order.status == 'delivered' && orderPermissions(order, perspective).dispute && order.amounts.total > 0;
    final text = SalacopeTypography.caption.copyWith(color: colors.gray500);
    return OrderCardFrame(
      title: buyer ? 'Vos fichiers' : 'Fichiers livrés',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          OrderFiles(order: order, available: available),
          if (canReport) ...[
            const SizedBox(height: 12),
            Text.rich(
              TextSpan(children: [
                const TextSpan(text: 'Un problème avec le fichier ? '),
                WidgetSpan(
                  alignment: PlaceholderAlignment.baseline,
                  baseline: TextBaseline.alphabetic,
                  child: GestureDetector(
                    onTap: () => showReportSheet(context, order.id, 'digital'),
                    child: Text('Signalez-le', style: text.copyWith(color: colors.primary700, fontWeight: FontWeight.w600)),
                  ),
                ),
                TextSpan(
                  text:
                      ' avant le ${formatDate(order.releaseAt)} : l’argent reste alors bloqué jusqu’à la décision de Salacope. Sans signalement, le vendeur est payé automatiquement à cette date.',
                ),
              ]),
              style: text,
            ),
          ],
        ],
      ),
    );
  }
}

/// What happened to the order, step by step (the conversation lives in Messages).
class _Timeline extends StatelessWidget {
  final Order order;
  final List<User> users;
  const _Timeline({required this.order, required this.users});

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final events = order.events.reversed.toList();
    return OrderCardFrame(
      title: 'Suivi de la commande',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          for (final (i, e) in events.indexed)
            Padding(
              padding: EdgeInsets.only(bottom: i == events.length - 1 ? 0 : 12),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    margin: const EdgeInsets.only(top: 5),
                    width: 7,
                    height: 7,
                    decoration: BoxDecoration(shape: BoxShape.circle, color: i == 0 ? colors.accent : colors.gray300),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text.rich(
                          TextSpan(children: [
                            TextSpan(text: orderEventLabel(e.type)),
                            if (e.actorId != null)
                              TextSpan(
                                text: ' · ${_actorName(users.where((u) => u.id == e.actorId).firstOrNull)}',
                                style: TextStyle(color: colors.gray500),
                              ),
                          ]),
                          style: SalacopeTypography.caption.copyWith(color: colors.gray900),
                        ),
                        Text(formatDateTime(e.at), style: SalacopeTypography.small.copyWith(color: colors.gray400)),
                        if ((e.note ?? '').isNotEmpty && e.type != 'delivered')
                          Padding(
                            padding: const EdgeInsets.only(top: 2),
                            child: Text('« ${e.note} »', style: SalacopeTypography.caption.copyWith(color: colors.gray500)),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

String _actorName(User? u) => u?.merchant?.storeName.isNotEmpty == true ? u!.merchant!.storeName : (u?.name ?? 'Salacope');

class _Links extends StatelessWidget {
  final Order order;
  final bool isSeller;
  const _Links({required this.order, required this.isSeller});

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final style = SalacopeTypography.body.copyWith(color: colors.gray500);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (!isSeller)
          TextButton(
            style: TextButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 4), minimumSize: const Size(0, 36)),
            onPressed: () => context.push('/l/${order.listingId}'),
            child: Text('Voir l\'offre →', style: style),
          ),
        TextButton(
          style: TextButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 4), minimumSize: const Size(0, 36)),
          onPressed: () => context.push('/compte/support/nouveau?ref=${Uri.encodeComponent(order.number)}&sujet=order'),
          child: Text('Un problème ? Contacter le support →', style: style),
        ),
      ],
    );
  }
}

class _ReviewPrompt extends StatelessWidget {
  final String orderId;
  const _ReviewPrompt({required this.orderId});

  void _open(BuildContext context) {
    int rating = 5;
    final commentCtrl = TextEditingController();
    showSSheet(
      context: context,
      title: 'Laisser un avis',
      description: 'Votre retour aide les autres acheteurs et valorise le créateur.',
      child: StatefulBuilder(
        builder: (context, setSheetState) {
          final colors = context.colors;
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            mainAxisSize: MainAxisSize.min,
            children: [
              Center(
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: List.generate(5, (index) {
                    final star = index + 1;
                    return IconButton(
                      icon: Icon(LucideIcons.star, size: 28, color: star <= rating ? colors.accent : colors.textMuted),
                      onPressed: () => setSheetState(() => rating = star),
                    );
                  }),
                ),
              ),
              const SizedBox(height: 12),
              SField(label: 'Commentaire (facultatif)', controller: commentCtrl, placeholder: 'Partagez votre expérience...', maxLines: 3),
              const SizedBox(height: 18),
              SButton(
                label: 'Publier mon avis',
                size: SButtonSize.lg,
                pill: true,
                onPressed: () async {
                  Navigator.of(context, rootNavigator: true).pop();
                  try {
                    await ordersApi.leaveReview(orderId: orderId, rating: rating, comment: commentCtrl.text);
                    if (context.mounted) SToast.success(context, 'Avis publié avec succès');
                  } catch (e) {
                    if (context.mounted) SToast.error(context, e.toString());
                  }
                },
              ),
            ],
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    return OrderCardFrame(
      child: Row(
        children: [
          Icon(LucideIcons.star, color: colors.accent, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Votre avis sur cette commande', style: SalacopeTypography.bodyStrong.copyWith(color: colors.textPrimary)),
                Text('Notez le travail de ce créateur.', style: SalacopeTypography.caption.copyWith(color: colors.textMuted)),
              ],
            ),
          ),
          SButton(label: 'Donner mon avis', variant: SButtonVariant.secondary, size: SButtonSize.sm, pill: true, onPressed: () => _open(context)),
        ],
      ),
    );
  }
}
