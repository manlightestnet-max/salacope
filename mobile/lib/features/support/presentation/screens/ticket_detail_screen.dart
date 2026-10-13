import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:salacope/core/api/domain_error.dart';
import 'package:salacope/core/db/models/ticket.dart';
import 'package:salacope/core/db/store.dart';
import 'package:salacope/core/design/colors.dart';
import 'package:salacope/core/design/tokens.dart';
import 'package:salacope/core/design/typography.dart';
import 'package:salacope/core/lib/format.dart';
import 'package:salacope/core/ui/s_avatar.dart';
import 'package:salacope/core/ui/s_badge.dart';
import 'package:salacope/core/ui/s_button.dart';
import 'package:salacope/core/ui/s_empty_state.dart';
import 'package:salacope/core/ui/s_page.dart';
import 'package:salacope/core/ui/s_panel.dart';
import 'package:salacope/core/ui/s_toast.dart';
import 'package:salacope/features/support/data/support_api.dart';
import 'package:salacope/features/support/domain/support_model.dart';

class TicketDetailScreen extends StatefulWidget {
  final String ticketId;

  const TicketDetailScreen({
    super.key,
    required this.ticketId,
  });

  @override
  State<TicketDetailScreen> createState() => _TicketDetailScreenState();
}

class _TicketDetailScreenState extends State<TicketDetailScreen> {
  final TextEditingController _replyCtrl = TextEditingController();
  bool _sending = false;
  bool _resolving = false;

  @override
  void dispose() {
    _replyCtrl.dispose();
    super.dispose();
  }

  Future<void> _handleReply(String ticketId) async {
    final text = _replyCtrl.text.trim();
    if (text.isEmpty) return;

    setState(() => _sending = true);
    try {
      await supportApi.replyToTicket(ticketId, text);
      _replyCtrl.clear();
      if (mounted) {
        SToast.success(context, 'Message envoyé au support');
      }
    } catch (e) {
      if (mounted) {
        final msg = e is DomainError ? e.message : e.toString();
        SToast.error(context, msg);
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _handleResolve(String ticketId) async {
    setState(() => _resolving = true);
    try {
      await supportApi.resolveTicket(ticketId);
      if (mounted) {
        SToast.success(context, 'Ticket marqué comme résolu');
      }
    } catch (e) {
      if (mounted) {
        final msg = e is DomainError ? e.message : e.toString();
        SToast.error(context, msg);
      }
    } finally {
      if (mounted) setState(() => _resolving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;

    return ListenableBuilder(
      listenable: db,
      builder: (context, _) {
        final user = db.user;
        final ticket = db.tickets.where((t) => t.id == widget.ticketId).firstOrNull;

        if (ticket == null || user == null) {
          return SPage(
            title: 'Ticket introuvable',
            leading: const BackButton(),
            child: const Center(
              child: SEmptyState(
                icon: LucideIcons.lifeBuoy,
                title: 'Ticket introuvable',
                description: "Ce ticket n'existe pas ou n'est plus accessible.",
              ),
            ),
          );
        }

        final statusCfg = ticketStatusConfig(ticket.status);

        return SPage(
          title: ticket.subject,
          leading: const BackButton(),
          actions: [
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: Center(
                child: SBadge(
                  label: statusCfg.label,
                  tone: statusCfg.tone,
                  dot: true,
                ),
              ),
            ),
          ],
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Ticket metadata header
                Row(
                  children: [
                    Text(
                      ticket.number,
                      style: SalacopeTypography.bodyStrong.copyWith(
                        fontFamily: 'monospace',
                        color: colors.textSecondary,
                      ),
                    ),
                    Text(
                      ' · ${topicLabel(ticket.topic)}',
                      style: SalacopeTypography.body.copyWith(
                        color: colors.textSecondary,
                      ),
                    ),
                    if (ticket.reference != null && ticket.reference!.isNotEmpty) ...[
                      Text(
                        ' · ',
                        style: SalacopeTypography.body.copyWith(
                          color: colors.textSecondary,
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: colors.gray100,
                          borderRadius: BorderRadius.circular(SalacopeTokens.radiusSm),
                        ),
                        child: Text(
                          ticket.reference!,
                          style: SalacopeTypography.caption.copyWith(
                            fontFamily: 'monospace',
                            color: colors.textPrimary,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 16),

                // Messages conversation list
                SPanel(
                  titleText: 'Échanges avec le support',
                  child: ticket.messages.isEmpty
                      ? const SEmptyState(
                          title: 'Aucun message',
                          description: 'Les réponses du support apparaîtront ici.',
                        )
                      : ListView.separated(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          itemCount: ticket.messages.length,
                          separatorBuilder: (_, _) => Divider(
                            height: 24,
                            thickness: 1,
                            color: colors.canvasBorder,
                          ),
                          itemBuilder: (context, index) {
                            final msg = ticket.messages[index];
                            final mine = msg.authorId == user.id;

                            return Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                if (mine)
                                  SAvatar(
                                    name: user.name,
                                    size: SAvatarSize.md,
                                  )
                                else
                                  Container(
                                    width: 32,
                                    height: 32,
                                    decoration: BoxDecoration(
                                      color: const Color(0xFF0B0D0C),
                                      shape: BoxShape.circle,
                                      border: Border.all(
                                        color: colors.canvasBorder,
                                      ),
                                    ),
                                    padding: const EdgeInsets.all(6),
                                    child: Image.asset(
                                      'assets/images/salacope-mark.png',
                                      fit: BoxFit.contain,
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
                                            mine ? 'Vous' : 'Support Salacope',
                                            style: SalacopeTypography.bodyStrong.copyWith(
                                              color: colors.textPrimary,
                                            ),
                                          ),
                                          const SizedBox(width: 8),
                                          Text(
                                            '· ${SalacopeFormat.formatRelative(msg.at)}',
                                            style: SalacopeTypography.caption.copyWith(
                                              color: colors.textSecondary,
                                            ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 6),
                                      Text(
                                        msg.body,
                                        style: SalacopeTypography.body.copyWith(
                                          color: colors.textPrimary,
                                          height: 1.5,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            );
                          },
                        ),
                ),

                const SizedBox(height: 20),

                // Reply box panel
                SPanel(
                  titleText: ticket.status == TicketStatus.resolved
                      ? 'Ticket résolu'
                      : 'Répondre',
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      TextField(
                        controller: _replyCtrl,
                        maxLines: 3,
                        style: SalacopeTypography.body.copyWith(color: colors.textPrimary),
                        decoration: InputDecoration(
                          hintText: ticket.status == TicketStatus.resolved
                              ? 'Écrire rouvre le ticket.'
                              : 'Ajouter une précision…',
                          hintStyle: SalacopeTypography.body.copyWith(color: colors.textTertiary),
                          filled: true,
                          fillColor: colors.surface,
                          contentPadding: const EdgeInsets.all(12),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(SalacopeTokens.radiusMd),
                            borderSide: BorderSide(color: colors.canvasBorder),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(SalacopeTokens.radiusMd),
                            borderSide: BorderSide(color: colors.canvasBorder),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(SalacopeTokens.radiusMd),
                            borderSide: BorderSide(color: colors.accent),
                          ),
                        ),
                        onChanged: (_) => setState(() {}),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          if (ticket.status != TicketStatus.resolved)
                            SButton(
                              label: 'Mon problème est résolu',
                              variant: SButtonVariant.ghost,
                              size: SButtonSize.sm,
                              loading: _resolving,
                              onPressed: () => _handleResolve(ticket.id),
                            )
                          else
                            const SizedBox.shrink(),
                          SButton(
                            label: 'Envoyer',
                            variant: SButtonVariant.primary,
                            size: SButtonSize.sm,
                            pill: true,
                            icon: const Icon(LucideIcons.send, size: 14),
                            loading: _sending,
                            onPressed: _replyCtrl.text.trim().isEmpty
                                ? null
                                : () => _handleReply(ticket.id),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
