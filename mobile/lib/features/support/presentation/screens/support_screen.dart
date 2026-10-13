import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:salacope/core/config/payment.dart';
import 'package:salacope/core/db/models/payment_attempt.dart';
import 'package:salacope/core/db/store.dart';
import 'package:salacope/core/design/colors.dart';
import 'package:salacope/core/design/tokens.dart';
import 'package:salacope/core/design/typography.dart';
import 'package:salacope/core/lib/format.dart';
import 'package:salacope/core/ui/s_badge.dart';
import 'package:salacope/core/ui/s_button.dart';
import 'package:salacope/core/ui/s_empty_state.dart';
import 'package:salacope/core/ui/s_page.dart';
import 'package:salacope/core/ui/s_panel.dart';
import 'package:salacope/features/checkout/domain/checkout_model.dart';
import 'package:salacope/features/support/domain/support_model.dart';

class SupportScreen extends StatelessWidget {
  const SupportScreen({super.key});

  SBadgeTone _attemptTone(PaymentAttemptStatus status) {
    switch (status) {
      case PaymentAttemptStatus.succeeded:
        return SBadgeTone.success;
      case PaymentAttemptStatus.pending:
        return SBadgeTone.info;
      case PaymentAttemptStatus.failed:
        return SBadgeTone.danger;
      case PaymentAttemptStatus.expired:
        return SBadgeTone.warning;
      case PaymentAttemptStatus.cancelled:
        return SBadgeTone.neutral;
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;

    return ListenableBuilder(
      listenable: db,
      builder: (context, _) {
        final user = db.user;
        if (user == null) {
          return Scaffold(
            backgroundColor: colors.canvas,
            appBar: AppBar(
              backgroundColor: colors.canvas,
              title: const Text('Support'),
            ),
            body: Center(
              child: SEmptyState(
                icon: LucideIcons.lifeBuoy,
                title: 'Connexion requise',
                description: 'Connectez-vous pour consulter vos demandes d’assistance.',
                action: SButton(
                  label: 'Se connecter',
                  variant: SButtonVariant.primary,
                  onPressed: () => context.push('/connexion'),
                ),
              ),
            ),
          );
        }

        final tickets = db.tickets.where((t) => t.userId == user.id).toList();
        final attempts = db.paymentAttempts.where((a) => a.buyerId == user.id).take(8).toList();
        final titles = {for (var l in db.listings) l.id: l.title};

        return SPage(
          title: 'Support',
          leading: const BackButton(),
          actions: [
            SButton(
              label: 'Nouveau ticket',
              variant: SButtonVariant.primary,
              size: SButtonSize.sm,
              pill: true,
              icon: const Icon(LucideIcons.plus, size: 14),
              onPressed: () => context.push('/compte/support/nouveau'),
            ),
          ],
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'Vos demandes au support et vos derniers paiements, avec leur code.',
                  style: SalacopeTypography.body.copyWith(color: colors.textSecondary),
                ),
                const SizedBox(height: 20),

                // Tickets section
                SPanel(
                  titleText: 'Mes tickets',
                  descriptionText: tickets.isEmpty
                      ? null
                      : '${tickets.length} demande${tickets.length > 1 ? 's' : ''}',
                  child: tickets.isEmpty
                      ? const SEmptyState(
                          icon: LucideIcons.lifeBuoy,
                          title: 'Aucun ticket',
                          description:
                              'Un souci de paiement ou de commande ? Ouvrez un ticket avec le code concerné.',
                        )
                      : ListView.separated(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          itemCount: tickets.length,
                          separatorBuilder: (_, _) => Divider(
                            height: 1,
                            thickness: 1,
                            color: colors.canvasBorder,
                          ),
                          itemBuilder: (context, index) {
                            final ticket = tickets[index];
                            final statusCfg = ticketStatusConfig(ticket.status);

                            return InkWell(
                              onTap: () => context.push('/compte/support/${ticket.id}'),
                              borderRadius: BorderRadius.circular(SalacopeTokens.radiusMd),
                              child: Padding(
                                padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 4),
                                child: Row(
                                  children: [
                                    Container(
                                      width: 38,
                                      height: 38,
                                      decoration: BoxDecoration(
                                        color: colors.gray100,
                                        shape: BoxShape.circle,
                                      ),
                                      child: Icon(
                                        LucideIcons.lifeBuoy,
                                        size: 18,
                                        color: colors.textSecondary,
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            ticket.subject,
                                            style: SalacopeTypography.bodyStrong.copyWith(
                                              color: colors.textPrimary,
                                            ),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            '${ticket.number} · ${topicLabel(ticket.topic)}${ticket.reference != null ? ' · ${ticket.reference}' : ''} · ${SalacopeFormat.formatRelative(ticket.updatedAt)}',
                                            style: SalacopeTypography.caption.copyWith(
                                              color: colors.textSecondary,
                                            ),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ],
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    SBadge(
                                      label: statusCfg.label,
                                      tone: statusCfg.tone,
                                      dot: true,
                                    ),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
                ),

                if (attempts.isNotEmpty) ...[
                  const SizedBox(height: 24),
                  SPanel(
                    titleText: 'Paiements récents',
                    descriptionText:
                        'Chaque tentative a un code unique. Débité sans commande ? Signalez la tentative : le support la retrouve tout de suite.',
                    child: ListView.separated(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: attempts.length,
                      separatorBuilder: (_, _) => Divider(
                        height: 1,
                        thickness: 1,
                        color: colors.canvasBorder,
                      ),
                      itemBuilder: (context, index) {
                        final attempt = attempts[index];
                        final channel = PaymentChannel.fromId(attempt.channel);
                        final listingTitle = titles[attempt.listingId] ?? 'Offre supprimée';

                        return Padding(
                          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 4),
                          child: Row(
                            children: [
                              ClipRRect(
                                borderRadius: BorderRadius.circular(SalacopeTokens.radiusSm),
                                child: Image.asset(
                                  channel.assetPath,
                                  width: 36,
                                  height: 36,
                                  fit: BoxFit.contain,
                                  errorBuilder: (context, error, stackTrace) => Container(
                                    width: 36,
                                    height: 36,
                                    color: colors.gray100,
                                    child: Icon(LucideIcons.creditCard, size: 18, color: colors.textSecondary),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Text(
                                          attempt.code,
                                          style: SalacopeTypography.bodyStrong.copyWith(
                                            fontFamily: 'monospace',
                                            color: colors.textPrimary,
                                            letterSpacing: 0.5,
                                          ),
                                        ),
                                        const SizedBox(width: 8),
                                        SBadge(
                                          label: attemptOutcome(attempt),
                                          tone: _attemptTone(attempt.status),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      '$listingTitle · ${SalacopeFormat.formatRelative(attempt.createdAt)}',
                                      style: SalacopeTypography.caption.copyWith(
                                        color: colors.textSecondary,
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 8),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  Text(
                                    SalacopeFormat.formatXaf(attempt.amount),
                                    style: SalacopeTypography.bodyStrong.copyWith(
                                      color: colors.textPrimary,
                                      fontFeatures: const [FontFeature.tabularFigures()],
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  SButton(
                                    label: 'Signaler',
                                    variant: SButtonVariant.ghost,
                                    size: SButtonSize.sm,
                                    onPressed: () => context.push(
                                      '/compte/support/nouveau?ref=${attempt.code}&sujet=payment',
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        );
                      },
                    ),
                  ),
                ],
              ],
            ),
          ),
        );
      },
    );
  }
}
