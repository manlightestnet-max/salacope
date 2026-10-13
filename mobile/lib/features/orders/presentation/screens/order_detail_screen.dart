import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:salacope/core/lib/format.dart';
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
import '../../../../core/ui/s_panel.dart';
import '../../../../core/ui/s_toast.dart';
import '../../data/orders_api.dart';
import 'package:salacope/core/lib/files.dart';
import '../../../../core/db/models/order.dart';

class OrderDetailScreen extends StatefulWidget {
  final String orderId;

  const OrderDetailScreen({
    super.key,
    required this.orderId,
  });

  @override
  State<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends State<OrderDetailScreen> {
  void _showReportDialog(BuildContext context) {
    final order = db.state.orders.where((o) => o.id == widget.orderId).firstOrNull;
    // Same reasons as the web (OrderDialogs.tsx), by kind of offer.
    final reasons = order?.item.kind == 'digital'
        ? const ['Le fichier ne s’ouvre pas', 'Contenu différent de l’annonce', 'Fichier incomplet', 'Autre']
        : const ['Livraison non conforme', 'Travail incomplet', 'Pas de nouvelles du vendeur', 'Autre'];
    String reason = reasons.first;
    final detailCtrl = TextEditingController();

    showSSheet(
      context: context,
      title: 'Signaler un problème',
      description: 'Tant que l’argent est bloqué, un litige est ouvert : il reste gelé jusqu’à la décision de Salacope.',
      child: StatefulBuilder(
        builder: (context, setSheetState) {
          final colors = context.colors;
          return Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                DropdownButtonFormField<String>(
                  initialValue: reason,
                  decoration: const InputDecoration(labelText: 'Ce qui ne va pas'),
                  dropdownColor: colors.surface,
                  items: [for (final r in reasons) DropdownMenuItem(value: r, child: Text(r))],
                  onChanged: (v) {
                    if (v != null) setSheetState(() => reason = v);
                  },
                ),
                const SizedBox(height: 12),
                SField(
                  label: 'Détails supplémentaires',
                  controller: detailCtrl,
                  placeholder: 'Décrivez précisément la situation...',
                  maxLines: 3,
                ),
                const SizedBox(height: 18),
                SButton(
                  label: 'Envoyer le signalement',
                  variant: SButtonVariant.danger,
                  size: SButtonSize.lg,
                  pill: true,
                  onPressed: () async {
                    Navigator.of(context, rootNavigator: true).pop();
                    try {
                      await ordersApi.reportProblem(
                        orderId: widget.orderId,
                        reason: reason,
                        detail: detailCtrl.text,
                      );
                      if (context.mounted) {
                        SToast.success(context, 'Signalement enregistré');
                      }
                    } catch (e) {
                      if (context.mounted) {
                        SToast.error(context, e.toString());
                      }
                    }
                  },
                ),
                const SizedBox(height: 16),
              ],
            ),
          );
        },
      ),
    );
  }

  void _showRevisionDialog(BuildContext context) {
    final noteCtrl = TextEditingController();

    showSSheet(
      context: context,
      title: 'Demander une retouche',
      description: 'Expliquez au vendeur ce qui doit être modifié ou amélioré.',
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            SField(
              label: 'Ce qui doit être modifié',
              controller: noteCtrl,
              placeholder: 'Ex. Corriger les couleurs du logo...',
              maxLines: 3,
            ),
            const SizedBox(height: 18),
            SButton(
              label: 'Envoyer la demande',
              variant: SButtonVariant.primary,
              size: SButtonSize.lg,
              pill: true,
              onPressed: () async {
                Navigator.of(context, rootNavigator: true).pop();
                try {
                  await ordersApi.requestRevision(widget.orderId, noteCtrl.text);
                  if (context.mounted) {
                    SToast.success(context, 'Demande de retouche envoyée');
                  }
                } catch (e) {
                  if (context.mounted) {
                    SToast.error(context, e.toString());
                  }
                }
              },
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  void _showReviewDialog(BuildContext context) {
    int rating = 5;
    final commentCtrl = TextEditingController();

    showSSheet(
      context: context,
      title: 'Laisser un avis',
      description: 'Votre retour aide les autres acheteurs et valorise le créateur.',
      child: StatefulBuilder(
        builder: (context, setSheetState) {
          final colors = context.colors;
          return Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Center(
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: List.generate(5, (index) {
                      final star = index + 1;
                      return IconButton(
                        icon: Icon(
                          LucideIcons.star,
                          size: 28,
                          color: star <= rating ? colors.accent : colors.textMuted,
                        ),
                        onPressed: () => setSheetState(() => rating = star),
                      );
                    }),
                  ),
                ),
                const SizedBox(height: 12),
                SField(
                  label: 'Commentaire (facultatif)',
                  controller: commentCtrl,
                  placeholder: 'Partagez votre expérience...',
                  maxLines: 3,
                ),
                const SizedBox(height: 18),
                SButton(
                  label: 'Publier mon avis',
                  variant: SButtonVariant.primary,
                  size: SButtonSize.lg,
                  pill: true,
                  onPressed: () async {
                    Navigator.of(context, rootNavigator: true).pop();
                    try {
                      await ordersApi.leaveReview(
                        orderId: widget.orderId,
                        rating: rating,
                        comment: commentCtrl.text,
                      );
                      if (context.mounted) {
                        SToast.success(context, 'Avis publié avec succès');
                      }
                    } catch (e) {
                      if (context.mounted) {
                        SToast.error(context, e.toString());
                      }
                    }
                  },
                ),
                const SizedBox(height: 16),
              ],
            ),
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;

    return ListenableBuilder(
      listenable: db,
      builder: (context, _) {
        final state = db.state;
        final order = state.orders.where((o) => o.id == widget.orderId).firstOrNull;
        final currentUserId = state.sessionUserId ?? '';

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
                  action: SButton(
                    label: 'Mes achats',
                    variant: SButtonVariant.primary,
                    size: SButtonSize.md,
                    pill: true,
                    onPressed: () => context.go('/orders'),
                  ),
                ),
              ),
            ],
          );
        }

        final perspective = perspectiveOf(
              buyerId: order.buyerId,
              sellerId: order.sellerId,
              userId: currentUserId,
            ) ??
            Perspective.buyer;

        final isBuyer = perspective == Perspective.buyer;
        final perms = permissionsFor(
          status: order.status,
          kind: order.item.kind,
          perspective: perspective,
          revisions: order.item.revisions ?? 0,
          revisionsUsed: order.revisionsUsed ?? 0,
          extensionStatus: order.extension?.status,
        );

        final statusInfo = statusDisplay(
          status: order.status,
          perspective: perspective,
          extensionStatus: order.extension?.status,
        );

        final badgeTone = switch (statusInfo.tone) {
          OrderBadgeTone.success => SBadgeTone.success,
          OrderBadgeTone.warning => SBadgeTone.warning,
          OrderBadgeTone.danger => SBadgeTone.danger,
          OrderBadgeTone.brand => SBadgeTone.brand,
          OrderBadgeTone.info => SBadgeTone.info,
          OrderBadgeTone.neutral => SBadgeTone.neutral,
        };

        final seller = state.users.where((u) => u.id == order.sellerId).firstOrNull;
        final sellerName = seller?.merchant?.storeName.isNotEmpty == true
            ? seller!.merchant!.storeName
            : (seller?.name ?? 'Créateur Salacope');

        return SPage(
          title: order.number,
          leading: const BackButton(),
          meta: SBadge(
            label: statusInfo.label,
            tone: badgeTone,
            dot: true,
          ),
          actions: [
            IconButton(
              icon: Icon(LucideIcons.messagesSquare, size: 20, color: colors.textPrimary),
              tooltip: 'Discussion',
              onPressed: () => context.push('/compte/messages/${order.id}'),
            ),
            if (isBuyer && order.status != 'cancelled')
              IconButton(
                icon: Icon(LucideIcons.flag, size: 18, color: colors.textMuted),
                tooltip: 'Signaler un problème',
                onPressed: () => _showReportDialog(context),
              ),
          ],
          slivers: [
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Item summary header
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: colors.surface,
                        borderRadius: BorderRadius.circular(SalacopeTokens.radiusXl),
                        border: Border.all(color: colors.canvasBorder, width: 0.8),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      order.item.title,
                                      style: SalacopeTypography.title.copyWith(
                                        color: colors.textPrimary,
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      'Vendu par $sellerName',
                                      style: TextStyle(
                                        fontSize: 12.5,
                                        color: colors.textMuted,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              Text(
                                formatXaf(order.amounts.total),
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w800,
                                  color: colors.accent,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              Text(
                                'Commandé le ${formatDate(order.createdAt)}',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: colors.textMuted,
                                ),
                              ),
                              const Spacer(),
                              Text(
                                order.payment.channel ?? 'Mobile Money',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                  color: colors.textMuted,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 16),

                    // A digital product: the file the buyer paid for. Never confirmed: the money stays held for
                    // Salacope's delay, then goes to the seller unless a problem is reported.
                    if (order.item.kind == 'digital' && ['delivered', 'completed', 'disputed'].contains(order.status)) ...[
                      _DigitalFilePanel(order: order, isBuyer: isBuyer, canReport: isBuyer && perms.dispute, onReport: () => _showReportDialog(context)),
                      const SizedBox(height: 16),
                    ],

                    // Next Step Card for Service / Validation
                    if (isBuyer && perms.confirm) ...[
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: colors.accent.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(SalacopeTokens.radiusXl),
                          border: Border.all(color: colors.accent.withValues(alpha: 0.4)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Icon(LucideIcons.packageCheck, color: colors.accent, size: 20),
                                const SizedBox(width: 8),
                                Text(
                                  'Livraison reçue : À valider',
                                  style: SalacopeTypography.bodyStrong.copyWith(
                                    color: colors.textPrimary,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Text(
                              'Consultez les fichiers livrés ci-dessous. Si tout est conforme, validez pour libérer les fonds au vendeur.',
                              style: TextStyle(fontSize: 12.5, color: colors.textMuted),
                            ),
                            const SizedBox(height: 14),
                            Row(
                              children: [
                                Expanded(
                                  child: SButton(
                                    label: 'Confirmer la réception',
                                    variant: SButtonVariant.primary,
                                    size: SButtonSize.md,
                                    pill: true,
                                    onPressed: () async {
                                      final ok = await showSConfirm(
                                        context: context,
                                        title: 'Valider la commande',
                                        description:
                                            'En confirmant, vous attestez avoir bien reçu la livraison et les fonds seront transférés au créateur.',
                                        confirmLabel: 'Confirmer',
                                        onConfirm: () async {
                                          await ordersApi.confirmOrder(order.id);
                                          return true;
                                        },
                                      );
                                      if (ok == true && context.mounted) {
                                        SToast.success(context, 'Commande confirmée !');
                                      }
                                    },
                                  ),
                                ),
                                if (perms.revise) ...[
                                  const SizedBox(width: 10),
                                  SButton(
                                    label: 'Retouche',
                                    variant: SButtonVariant.secondary,
                                    size: SButtonSize.md,
                                    pill: true,
                                    onPressed: () => _showRevisionDialog(context),
                                  ),
                                ],
                              ],
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],

                    // Extension request card if pending
                    if (isBuyer && perms.answerExtension && order.extension != null) ...[
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: colors.amber500.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(SalacopeTokens.radiusXl),
                          border: Border.all(color: colors.amber500.withValues(alpha: 0.4)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Icon(LucideIcons.clock, color: colors.amber500, size: 20),
                                const SizedBox(width: 8),
                                Text(
                                  'Demande de délai supplémentaire',
                                  style: SalacopeTypography.bodyStrong.copyWith(
                                    color: colors.textPrimary,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Text(
                              'Le vendeur demande +${order.extension!.days} jours : « ${order.extension!.reason} »',
                              style: TextStyle(fontSize: 13, color: colors.textMuted),
                            ),
                            const SizedBox(height: 14),
                            Row(
                              children: [
                                SButton(
                                  label: 'Accepter le délai',
                                  variant: SButtonVariant.primary,
                                  size: SButtonSize.sm,
                                  pill: true,
                                  onPressed: () async {
                                    await ordersApi.answerExtension(order.id, true);
                                    if (context.mounted) {
                                      SToast.success(context, 'Délai accepté');
                                    }
                                  },
                                ),
                                const SizedBox(width: 10),
                                SButton(
                                  label: 'Refuser',
                                  variant: SButtonVariant.secondary,
                                  size: SButtonSize.sm,
                                  pill: true,
                                  onPressed: () async {
                                    await ordersApi.answerExtension(order.id, false);
                                    if (context.mounted) {
                                      SToast.info(context, 'Délai refusé');
                                    }
                                  },
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],

                    // Digital Downloads / Delivered files
                    if (order.delivery != null && order.delivery!.files.isNotEmpty) ...[
                      SPanel(
                        titleText: 'Fichiers livrés',
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              if (order.delivery!.note.isNotEmpty) ...[
                                Text(
                                  'Message du vendeur :',
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                    color: colors.textMuted,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  order.delivery!.note,
                                  style: TextStyle(fontSize: 13.5, color: colors.textPrimary),
                                ),
                                const SizedBox(height: 14),
                              ],
                              for (final f in order.delivery!.files)
                                Container(
                                  margin: const EdgeInsets.only(bottom: 8),
                                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                                  decoration: BoxDecoration(
                                    color: colors.canvas,
                                    borderRadius: BorderRadius.circular(SalacopeTokens.radiusLg),
                                    border: Border.all(color: colors.canvasBorder),
                                  ),
                                  child: Row(
                                    children: [
                                      Icon(LucideIcons.fileDown, size: 20, color: colors.accent),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              f.name,
                                              style: SalacopeTypography.bodyStrong.copyWith(
                                                color: colors.textPrimary,
                                              ),
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                            Text(
                                              f.size,
                                              style: TextStyle(fontSize: 11.5, color: colors.textMuted),
                                            ),
                                          ],
                                        ),
                                      ),
                                      SButton(
                                        label: 'Télécharger',
                                        variant: SButtonVariant.primary,
                                        size: SButtonSize.sm,
                                        pill: true,
                                        onPressed: () async {
                                          try {
                                            await openRemoteFile(f.dataUrl, f.name);
                                          } catch (e) {
                                            if (context.mounted) SToast.error(context, e.toString());
                                          }
                                        },
                                      ),
                                    ],
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],

                    // Brief details
                    if (order.brief != null && order.brief!.isNotEmpty) ...[
                      SPanel(
                        titleText: 'Brief transmis',
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              for (final b in order.brief!) ...[
                                Text(
                                  b.question,
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                    color: colors.textMuted,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  b.answer,
                                  style: TextStyle(fontSize: 13.5, color: colors.textPrimary),
                                ),
                                const SizedBox(height: 12),
                              ],
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],

                    // Review section if completed
                    if (isBuyer && order.status == 'completed') ...[
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: colors.surface,
                          borderRadius: BorderRadius.circular(SalacopeTokens.radiusXl),
                          border: Border.all(color: colors.canvasBorder, width: 0.8),
                        ),
                        child: Row(
                          children: [
                            Icon(LucideIcons.star, color: colors.accent, size: 20),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Votre avis sur cette commande',
                                    style: SalacopeTypography.bodyStrong.copyWith(
                                      color: colors.textPrimary,
                                    ),
                                  ),
                                  Text(
                                    'Notez le travail de ce créateur.',
                                    style: TextStyle(fontSize: 12, color: colors.textMuted),
                                  ),
                                ],
                              ),
                            ),
                            SButton(
                              label: 'Donner mon avis',
                              variant: SButtonVariant.secondary,
                              size: SButtonSize.sm,
                              pill: true,
                              onPressed: () => _showReviewDialog(context),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],

                    // Timeline & Events
                    if (order.events.isNotEmpty) ...[
                      SPanel(
                        titleText: 'Historique de la commande',
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              for (final evt in order.events) ...[
                                Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Container(
                                      margin: const EdgeInsets.only(top: 4),
                                      width: 6,
                                      height: 6,
                                      decoration: BoxDecoration(
                                        shape: BoxShape.circle,
                                        color: colors.accent,
                                      ),
                                    ),
                                    const SizedBox(width: 10),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            evt.type == 'paid'
                                                ? 'Paiement reçu'
                                                : evt.type == 'accepted'
                                                    ? 'Commande acceptée'
                                                    : evt.type == 'delivered'
                                                        ? 'Livraison effectuée'
                                                        : evt.type == 'completed'
                                                            ? 'Commande confirmée'
                                                            : evt.type == 'revision_requested'
                                                                ? 'Retouche demandée'
                                                                : evt.type,
                                            style: SalacopeTypography.body.copyWith(
                                              color: colors.textPrimary,
                                              fontWeight: FontWeight.w600,
                                            ),
                                          ),
                                          if (evt.note != null && evt.note!.isNotEmpty) ...[
                                            const SizedBox(height: 2),
                                            Text(
                                              evt.note!,
                                              style: TextStyle(
                                                fontSize: 12.5,
                                                color: colors.textMuted,
                                              ),
                                            ),
                                          ],
                                          Text(
                                            formatDateTime(evt.at),
                                            style: TextStyle(
                                              fontSize: 11,
                                              color: colors.textMuted.withValues(alpha: 0.7),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 12),
                              ],
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],

                    // Support shortcut
                    SButton(
                      label: 'Besoin d’aide sur cette commande ?',
                      variant: SButtonVariant.ghost,
                      size: SButtonSize.md,
                      onPressed: () => context.push('/compte/support'),
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


/// The file of a digital product: one button that really downloads it (a short-lived address from the server).
class _DigitalFilePanel extends StatefulWidget {
  final Order order;
  final bool isBuyer;
  final bool canReport;
  final VoidCallback onReport;
  const _DigitalFilePanel({required this.order, required this.isBuyer, required this.canReport, required this.onReport});

  @override
  State<_DigitalFilePanel> createState() => _DigitalFilePanelState();
}

class _DigitalFilePanelState extends State<_DigitalFilePanel> {
  bool _busy = false;

  Future<void> _download() async {
    setState(() => _busy = true);
    try {
      await ordersApi.downloadFile(widget.order.id);
    } catch (e) {
      if (mounted) SToast.error(context, e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final file = widget.order.item.file;
    final releaseAt = widget.order.releaseAt;
    return SPanel(
      titleText: widget.isBuyer ? 'Votre fichier' : 'Fichier livré',
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Icon(LucideIcons.fileText, size: 18, color: colors.textMuted),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(file?.name.isNotEmpty == true ? file!.name : widget.order.item.title,
                      maxLines: 1, overflow: TextOverflow.ellipsis, style: SalacopeTypography.bodyStrong.copyWith(color: colors.textPrimary)),
                ),
                Text(file?.format ?? 'Fichier', style: TextStyle(fontSize: 12, color: colors.textMuted)),
              ],
            ),
            const SizedBox(height: 14),
            SButton(
              label: 'Télécharger',
              variant: SButtonVariant.primary,
              size: SButtonSize.lg,
              pill: true,
              isLoading: _busy,
              icon: const Icon(LucideIcons.download, size: 16),
              onPressed: _busy ? null : _download,
            ),
            if (widget.canReport && releaseAt != null) ...[
              const SizedBox(height: 12),
              Wrap(
                children: [
                  Text('Un problème avec le fichier ? ', style: TextStyle(fontSize: 12.5, color: colors.textMuted)),
                  GestureDetector(
                    onTap: widget.onReport,
                    child: Text('Signalez-le', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: colors.accent)),
                  ),
                  Text(' avant le ${formatDate(releaseAt)} : l’argent reste bloqué jusqu’à la décision de Salacope.',
                      style: TextStyle(fontSize: 12.5, color: colors.textMuted)),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}
