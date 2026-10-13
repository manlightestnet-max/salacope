import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:salacope/core/db/models/order.dart';
import 'package:salacope/core/design/theme.dart';
import 'package:salacope/core/design/tokens.dart';
import 'package:salacope/core/design/typography.dart';
import 'package:salacope/core/domain/orders.dart';
import 'package:salacope/core/lib/format.dart';
import 'package:salacope/core/ui/s_button.dart';
import 'package:salacope/core/ui/s_dialog.dart';
import 'package:salacope/core/ui/s_sheet.dart';
import 'package:salacope/core/ui/s_field.dart';
import '../../data/orders_api.dart';

class ValidationCard extends StatefulWidget {
  final Order order;
  final Perspective perspective;
  final bool current;

  const ValidationCard({
    super.key,
    required this.order,
    required this.perspective,
    required this.current,
  });

  @override
  State<ValidationCard> createState() => _ValidationCardState();
}

class _ValidationCardState extends State<ValidationCard> {
  bool _busy = false;

  void _showConfirmDialog(BuildContext context) {
    final colors = context.colors;
    showDialog(
      context: context,
      builder: (ctx) => SConfirm(
        title: 'Valider la livraison ?',
        description:
            'Le vendeur recevra ${formatXaf(widget.order.amounts.total)}. Vous ne pourrez plus ouvrir de litige sur cette commande.',
        confirmLabel: 'Valider',
        onConfirm: () async {
          setState(() => _busy = true);
          try {
            await ordersApi.confirmOrder(widget.order.id);
            if (ctx.mounted) Navigator.of(ctx).pop();
          } catch (e) {
            if (context.mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(e.toString()),
                  backgroundColor: colors.danger,
                ),
              );
            }
          } finally {
            if (mounted) setState(() => _busy = false);
          }
        },
      ),
    );
  }

  void _showRevisionSheet(BuildContext context) {
    final controller = TextEditingController();
    bool sheetBusy = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) {
          final colors = ctx.colors;
          return SSheet(
            title: 'Demander une retouche',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'Expliquez au vendeur ce qui doit être modifié ou amélioré.',
                  style: SalacopeTypography.body.copyWith(
                    color: colors.textSecondary,
                    fontSize: 13,
                  ),
                ),
                const SizedBox(height: 12),
                SField(
                  controller: controller,
                  placeholder: 'Détails des ajustements souhaités…',
                  maxLines: 4,
                ),
                const SizedBox(height: 16),
                SButton(
                  label: 'Envoyer la demande',
                  variant: SButtonVariant.primary,
                  size: SButtonSize.md,
                  isLoading: sheetBusy,
                  onPressed: sheetBusy
                      ? null
                      : () async {
                          final text = controller.text.trim();
                          if (text.isEmpty) return;
                          setSheetState(() => sheetBusy = true);
                          try {
                            await ordersApi.requestRevision(widget.order.id, text);
                            if (ctx.mounted) Navigator.of(ctx).pop();
                          } catch (e) {
                            if (ctx.mounted) {
                              ScaffoldMessenger.of(ctx).showSnackBar(
                                SnackBar(
                                  content: Text(e.toString()),
                                  backgroundColor: colors.danger,
                                ),
                              );
                            }
                          } finally {
                            setSheetState(() => sheetBusy = false);
                          }
                        },
                ),
                const SizedBox(height: 8),
              ],
            ),
          );
        },
      ),
    );
  }

  void _showReportSheet(BuildContext context) {
    String selectedReason = 'Qualité insuffisante';
    final detailsController = TextEditingController();
    bool sheetBusy = false;

    final reasons = [
      'Qualité insuffisante',
      'Travail non conforme à la description',
      'Fichier endommagé ou manquant',
      'Vendeur injoignable',
      'Autre problème',
    ];

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) {
          final colors = ctx.colors;
          return SSheet(
            title: 'Signaler un problème',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'Sélectionnez le motif pour ouvrir un litige ou avertir le support :',
                  style: SalacopeTypography.body.copyWith(
                    color: colors.textSecondary,
                    fontSize: 13,
                  ),
                ),
                const SizedBox(height: 12),
                ...reasons.map((r) {
                  final active = selectedReason == r;
                  return InkWell(
                    onTap: () => setSheetState(() => selectedReason = r),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      child: Row(
                        children: [
                          Icon(
                            active ? LucideIcons.circleDot : LucideIcons.circle,
                            size: 18,
                            color: active ? colors.accent : colors.textMuted,
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              r,
                              style: SalacopeTypography.body.copyWith(
                                color: colors.textPrimary,
                                fontWeight: active ? FontWeight.w600 : FontWeight.w400,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                }),
                const SizedBox(height: 12),
                SField(
                  controller: detailsController,
                  placeholder: 'Précisions supplémentaires (facultatif)…',
                  maxLines: 3,
                ),
                const SizedBox(height: 16),
                SButton(
                  label: 'Ouvrir un litige',
                  variant: SButtonVariant.danger,
                  size: SButtonSize.md,
                  isLoading: sheetBusy,
                  onPressed: sheetBusy
                      ? null
                      : () async {
                          setSheetState(() => sheetBusy = true);
                          try {
                            await ordersApi.reportProblem(
                              orderId: widget.order.id,
                              reason: selectedReason,
                              detail: detailsController.text.trim(),
                            );
                            if (ctx.mounted) Navigator.of(ctx).pop();
                          } catch (e) {
                            if (ctx.mounted) {
                              ScaffoldMessenger.of(ctx).showSnackBar(
                                SnackBar(
                                  content: Text(e.toString()),
                                  backgroundColor: colors.danger,
                                ),
                              );
                            }
                          } finally {
                            setSheetState(() => sheetBusy = false);
                          }
                        },
                ),
                const SizedBox(height: 8),
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
    final order = widget.order;
    final live = widget.current && order.status == 'delivered';
    final perms = permissionsFor(
      status: order.status,
      kind: order.item.kind,
      perspective: widget.perspective,
      revisions: order.item.revisions ?? 0,
      revisionsUsed: order.revisionsUsed ?? 0,
      extensionStatus: order.extension?.status,
    );

    String text;
    if (!widget.current) {
      text = 'Retouche demandée : une nouvelle livraison a suivi.';
    } else if (!live) {
      switch (order.status) {
        case 'completed':
          text = 'Livraison validée.';
          break;
        case 'disputed':
          text = 'Problème signalé : examen en cours par Salacope.';
          break;
        case 'cancelled':
          text = 'Commande annulée.';
          break;
        default:
          text = 'Retouche demandée.';
      }
    } else if (widget.perspective == Perspective.buyer) {
      text =
          'Vérifiez la livraison puis validez-la. Sans réponse, elle sera validée le ${formatDate(order.releaseAt ?? '')}.';
    } else {
      text =
          'En attente de la validation du client (automatique le ${formatDate(order.releaseAt ?? '')}).';
    }

    return Container(
      width: 290,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: colors.surface,
        borderRadius: BorderRadius.circular(SalacopeTokens.radiusXl),
        border: Border.all(color: colors.canvasBorder, width: 0.8),
        boxShadow: SalacopeTokens.shadowSm,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(
                live ? LucideIcons.packageCheck : LucideIcons.circleCheck,
                size: 16,
                color: live ? colors.accent : colors.textMuted,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Validation de la livraison',
                      style: SalacopeTypography.bodyStrong.copyWith(
                        color: colors.textPrimary,
                        fontSize: 13,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      text,
                      style: SalacopeTypography.caption.copyWith(
                        color: colors.textSecondary,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          if (live && perms.confirm) ...[
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                SButton(
                  label: 'Valider',
                  variant: SButtonVariant.primary,
                  size: SButtonSize.sm,
                  pill: true,
                  isLoading: _busy,
                  onPressed: _busy ? null : () => _showConfirmDialog(context),
                ),
                if (perms.revise)
                  SButton(
                    label: 'Retouche',
                    variant: SButtonVariant.secondary,
                    size: SButtonSize.sm,
                    pill: true,
                    onPressed: () => _showRevisionSheet(context),
                  ),
                if (perms.dispute)
                  SButton(
                    label: 'Signaler',
                    variant: SButtonVariant.ghost,
                    size: SButtonSize.sm,
                    pill: true,
                    onPressed: () => _showReportSheet(context),
                  ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
