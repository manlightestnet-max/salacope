import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:salacope/core/config/platform.dart';
import 'package:salacope/core/db/models/order.dart';
import 'package:salacope/core/design/colors.dart';
import 'package:salacope/core/design/tokens.dart';
import 'package:salacope/core/design/typography.dart';
import 'package:salacope/core/domain/orders.dart';
import 'package:salacope/core/domain/refund.dart';
import 'package:salacope/core/lib/format.dart';
import 'package:salacope/core/ui/s_button.dart';
import 'package:salacope/core/ui/s_dialog.dart';
import '../../data/orders_api.dart';
import 'order_dialogs.dart';

enum _Tone { action, waiting, done, alert }

String? _lastNote(Order order, String type) => order.events.reversed.where((e) => e.type == type).firstOrNull?.note;

String? _plusDays(String? iso, int days) {
  final at = iso == null ? null : DateTime.tryParse(iso);
  return at?.add(Duration(days: days)).toIso8601String();
}

String _days(int n) => '$n jour${n > 1 ? 's' : ''}';

/// What happens now on an order and who has to act, with the matching actions (web: `NextStepCard`). It closes the feed of the
/// order's discussion: every action (accept, refuse, deliver, ask for time, validate, revise, report) is taken here.
class NextStepCard extends StatelessWidget {
  final Order order;
  final Perspective perspective;

  const NextStepCard({super.key, required this.order, required this.perspective});

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final can = orderPermissions(order, perspective);
    final seller = perspective == Perspective.seller;
    final money = formatXaf(seller ? order.amounts.net : order.amounts.total);
    final left = revisionsLeft(revisions: order.item.revisions ?? 0, revisionsUsed: order.revisionsUsed ?? 0);
    final late = order.isLate();

    var title = '';
    String? body;
    Widget? link;
    var tone = _Tone.waiting;

    switch (order.status) {
      case 'paid':
        tone = seller ? _Tone.action : _Tone.waiting;
        title = seller ? 'Nouvelle commande à accepter' : 'En attente d\'acceptation';
        body = seller
            ? 'Acceptez pour démarrer et ouvrir la discussion : vous aurez ${order.item.deliveryDays ?? 3} jours pour livrer.'
            : 'Le vendeur doit accepter votre commande ; la discussion s\'ouvrira alors. Vous pouvez l\'annuler d\'ici là, vous serez remboursé.';
      case 'in_progress':
        final ext = order.extension;
        if (ext != null && hasPendingExtension(ext.status)) {
          tone = seller ? _Tone.waiting : _Tone.action;
          title = seller ? 'Délai de ${_days(ext.days)} demandé au client' : 'Le vendeur demande ${_days(ext.days)} de plus';
          body = seller
              ? 'En attente de sa réponse. D\'ici là, la livraison reste attendue ${formatRelative(order.dueAt)}.'
              : '« ${ext.reason} » — Si vous acceptez, livraison au plus tard le ${formatDate(_plusDays(order.dueAt, ext.days))}.';
        } else if (order.isRevising) {
          tone = seller ? (late ? _Tone.alert : _Tone.action) : _Tone.waiting;
          title = seller ? (late ? 'Retouche en retard' : 'Retouche à livrer ${formatRelative(order.dueAt)}') : 'Retouche en cours';
          body = seller
              ? '« ${_lastNote(order, 'revision_requested') ?? ''} »'
              : 'Le vendeur vous renvoie le travail d\'ici le ${formatDate(order.dueAt)}.';
        } else {
          tone = seller ? (late ? _Tone.alert : _Tone.action) : _Tone.waiting;
          title = seller
              ? late
                  ? 'Livraison en retard (prévue ${formatRelative(order.dueAt)})'
                  : 'Livraison attendue ${formatRelative(order.dueAt)}'
              : 'Le vendeur travaille sur votre commande';
          body = seller
              ? 'Livrez ici quand c’est prêt. Le client aura ensuite ${PlatformConfig.serviceValidationDays} jours pour valider.'
              : 'Livraison prévue le ${formatDate(order.dueAt)}.';
        }
      case 'delivered':
        if (order.item.kind == 'digital') {
          // A digital product is never confirmed by the buyer: the money is held for Salacope's delay, then paid out.
          tone = _Tone.waiting;
          title = seller ? 'Fichier livré, paiement automatique' : 'Votre fichier est disponible';
          body = seller
              ? 'Accès immédiat pour le client. $money vous seront versés automatiquement le ${formatDate(order.releaseAt)}, sans validation de personne, si aucun litige n’est ouvert d’ici là.'
              : 'Téléchargez-le quand vous voulez. Un problème ? Signalez-le avant le ${formatDate(order.releaseAt)}.';
          break;
        }
        tone = seller ? _Tone.waiting : _Tone.action;
        title = seller ? 'En attente de validation du client' : 'Votre commande est livrée';
        body = seller
            ? '$money vous seront versés à la validation, au plus tard le ${formatDate(order.releaseAt)}.'
            : 'Vérifiez la livraison puis confirmez${left > 0 ? ', ou demandez une retouche ($left restante${left > 1 ? 's' : ''})' : ''}. Sans réponse, le vendeur sera payé le ${formatDate(order.releaseAt)}.';
      case 'completed':
        tone = _Tone.done;
        title = seller ? 'Paiement libéré' : 'Commande terminée';
        if (seller) {
          body = '$money ont été ajoutés à votre solde.';
          link = GestureDetector(
            onTap: () => context.go('/boutique?vue=paiements'),
            child: Text(
              'Voir les paiements',
              style: SalacopeTypography.body.copyWith(color: colors.gray600, decoration: TextDecoration.underline),
            ),
          );
        } else {
          body = 'Merci pour votre achat.';
        }
      case 'disputed':
        tone = _Tone.alert;
        title = seller ? 'Le client a signalé un problème' : 'Litige en cours';
        body = '« ${_lastNote(order, 'disputed') ?? ''} » — Les fonds restent bloqués jusqu’à la décision de Salacope, qui contacte les deux parties sous 48 h.';
      case 'cancelled':
        tone = _Tone.done;
        title = 'Commande annulée';
        final said = _lastNote(order, 'cancelled');
        final refund = order.refund;
        final money = refund == null
            ? '${formatXaf(order.amounts.total)} remboursés au client par LightPay.'
            : seller
                ? refund.paid == 0
                    ? 'Commande gratuite : rien à rembourser.'
                    : 'Le client est remboursé de ${formatXaf(refund.sent)}${refund.paid > refund.sent ? ' (${formatXaf(refund.paid - refund.sent)} de frais de retrait déduits)' : ''}.'
                : refundSentence(refund, formatXaf);
        body = '${said != null && said.isNotEmpty ? '« $said » — ' : ''}$money';
    }

    final (icon, bg, fg) = switch (tone) {
      _Tone.action => (LucideIcons.zap, colors.primary50, colors.primary700),
      _Tone.waiting => (LucideIcons.clock, colors.gray100, colors.gray500),
      _Tone.done => (LucideIcons.circleCheck, colors.emerald50, colors.emerald700),
      _Tone.alert => (LucideIcons.triangleAlert, colors.red50, colors.red600),
    };

    final paidSeller = seller && order.status == 'paid';
    final actions = <Widget>[
      if (can.cancel)
        SButton(
          label: paidSeller ? 'Refuser' : 'Annuler',
          variant: SButtonVariant.ghost,
          size: SButtonSize.sm,
          pill: true,
          onPressed: () => showReasonSheet(
            context,
            title: paidSeller ? 'Refuser la commande' : 'Annuler la commande',
            description: order.amounts.total == 0
                ? 'Cette commande est gratuite. Cette action est définitive.'
                : 'Le client sera remboursé de ${formatXaf(order.amounts.total)}, moins les frais de retrait s’il a payé par mobile money. Cette action est définitive.',
            label: 'Raison (visible par l\'autre partie)',
            confirmLabel: 'Annuler et rembourser',
            onSubmit: (reason) => ordersApi.cancelOrder(order.id, reason),
            success: 'Commande annulée',
          ),
        ),
      if (can.extend)
        SButton(
          label: 'Demander un délai',
          variant: SButtonVariant.ghost,
          size: SButtonSize.sm,
          pill: true,
          onPressed: () => showExtensionSheet(context, order.id),
        ),
      if (can.dispute && order.amounts.total > 0)
        SButton(
          label: 'Signaler un problème',
          variant: SButtonVariant.danger,
          size: SButtonSize.sm,
          pill: true,
          onPressed: () => showReportSheet(context, order.id, order.item.kind),
        ),
      if (can.revise)
        SButton(
          label: 'Demander une retouche',
          variant: SButtonVariant.secondary,
          size: SButtonSize.sm,
          pill: true,
          onPressed: () => showRevisionSheet(context, order.id, left),
        ),
      if (can.answerExtension) ...[
        SButton(
          label: 'Refuser',
          variant: SButtonVariant.secondary,
          size: SButtonSize.sm,
          pill: true,
          onPressed: () => runOrderAction(context, () => ordersApi.answerExtension(order.id, false), 'Délai refusé'),
        ),
        SButton(
          label: 'Accepter',
          size: SButtonSize.sm,
          pill: true,
          onPressed: () => runOrderAction(context, () => ordersApi.answerExtension(order.id, true), 'Délai accepté'),
        ),
      ],
      if (can.accept)
        SButton(
          label: 'Accepter la commande',
          size: SButtonSize.sm,
          pill: true,
          onPressed: () => runOrderAction(context, () => ordersApi.acceptOrder(order.id), 'Commande acceptée'),
        ),
      if (can.deliver)
        SButton(
          label: 'Livrer',
          size: SButtonSize.sm,
          pill: true,
          onPressed: () => showDeliverSheet(context, order.id),
        ),
      if (can.confirm)
        SButton(
          label: 'Confirmer la réception',
          size: SButtonSize.sm,
          pill: true,
          onPressed: () => showSConfirm(
            context: context,
            title: 'Confirmer la réception ?',
            description: 'Le vendeur recevra ${formatXaf(order.amounts.total)}. Vous ne pourrez plus ouvrir de litige sur cette commande.',
            confirmLabel: 'Confirmer',
            onConfirm: () => runOrderAction(context, () => ordersApi.confirmOrder(order.id), 'Réception confirmée'),
          ),
        ),
    ];

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
      decoration: BoxDecoration(
        color: colors.surface,
        borderRadius: BorderRadius.circular(SalacopeTokens.radius2xl),
        border: Border.all(color: colors.gray200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(color: bg, shape: BoxShape.circle),
                child: Icon(icon, size: 16, color: fg),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: SalacopeTypography.bodyStrong.copyWith(color: colors.gray900)),
                    if (body != null) ...[
                      const SizedBox(height: 2),
                      Text(body, style: SalacopeTypography.body.copyWith(color: colors.gray600)),
                    ],
                    if (link != null) ...[const SizedBox(height: 4), link],
                  ],
                ),
              ),
            ],
          ),
          if (actions.isNotEmpty) ...[
            const SizedBox(height: 12),
            Wrap(spacing: 8, runSpacing: 8, alignment: WrapAlignment.end, children: actions),
          ],
        ],
      ),
    );
  }
}
