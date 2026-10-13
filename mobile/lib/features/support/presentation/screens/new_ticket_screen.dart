import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:salacope/core/api/domain_error.dart';
import 'package:salacope/core/db/models/ticket.dart';
import 'package:salacope/core/db/store.dart';
import 'package:salacope/core/design/colors.dart';
import 'package:salacope/core/design/tokens.dart';
import 'package:salacope/core/design/typography.dart';
import 'package:salacope/core/ui/s_button.dart';
import 'package:salacope/core/ui/s_field.dart';
import 'package:salacope/core/ui/s_page.dart';
import 'package:salacope/core/ui/s_panel.dart';
import 'package:salacope/core/ui/s_toast.dart';
import 'package:salacope/features/support/data/support_api.dart';
import 'package:salacope/features/support/domain/support_model.dart';

class NewTicketScreen extends StatefulWidget {
  final String? initialRef;
  final String? initialTopic;

  const NewTicketScreen({
    super.key,
    this.initialRef,
    this.initialTopic,
  });

  @override
  State<NewTicketScreen> createState() => _NewTicketScreenState();
}

class _NewTicketScreenState extends State<NewTicketScreen> {
  late TicketTopic _selectedTopic;
  late final TextEditingController _refCtrl;
  late final TextEditingController _subjectCtrl;
  late final TextEditingController _bodyCtrl;

  bool _submitting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    final initialRef = widget.initialRef ?? '';
    _refCtrl = TextEditingController(text: initialRef);
    _subjectCtrl = TextEditingController();
    _bodyCtrl = TextEditingController();

    if (widget.initialTopic != null) {
      _selectedTopic = TicketTopic.fromString(widget.initialTopic!);
    } else if (initialRef.toUpperCase().startsWith('TX-')) {
      _selectedTopic = TicketTopic.payment;
    } else if (initialRef.toUpperCase().startsWith('SC-')) {
      _selectedTopic = TicketTopic.order;
    } else {
      _selectedTopic = TicketTopic.other;
    }
  }

  @override
  void dispose() {
    _refCtrl.dispose();
    _subjectCtrl.dispose();
    _bodyCtrl.dispose();
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    final subject = _subjectCtrl.text.trim();
    final body = _bodyCtrl.text.trim();
    final reference = _refCtrl.text.trim().toUpperCase();

    if (subject.length < 4) {
      setState(() => _error = 'Donnez un objet à votre demande.');
      return;
    }
    if (body.length < 10) {
      setState(() => _error = 'Décrivez votre problème en quelques mots.');
      return;
    }

    setState(() {
      _submitting = true;
      _error = null;
    });

    try {
      final ticket = await supportApi.openTicket(
        OpenTicketInput(
          topic: _selectedTopic,
          subject: subject,
          body: body,
          reference: reference.isNotEmpty ? reference : null,
        ),
      );

      if (mounted) {
        SToast.success(context, 'Ticket ${ticket.number} envoyé');
        context.pushReplacement('/compte/support/${ticket.id}');
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e is DomainError ? e.message : e.toString();
        });
      }
    } finally {
      if (mounted) {
        setState(() => _submitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final user = db.user;

    // Available reference suggestions
    final attempts = user != null
        ? db.paymentAttempts.where((a) => a.buyerId == user.id).map((a) => a.code).toList()
        : <String>[];
    final orders = user != null
        ? db.orders
            .where((o) => o.buyerId == user.id || o.sellerId == user.id)
            .map((o) => o.number)
            .toList()
        : <String>[];
    final suggestions = {...attempts, ...orders}.toList();

    return SPage(
      title: 'Nouveau ticket',
      leading: const BackButton(),
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            SPanel(
              titleText: 'Formulaire d’assistance',
              descriptionText: 'Notre équipe vous répond sous 24 h.',
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Topic selection
                  SField(
                    label: 'Sujet',
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      decoration: BoxDecoration(
                        color: colors.surface,
                        borderRadius: BorderRadius.circular(SalacopeTokens.radiusMd),
                        border: Border.all(color: colors.canvasBorder),
                      ),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<TicketTopic>(
                          value: _selectedTopic,
                          isExpanded: true,
                          dropdownColor: colors.surface,
                          icon: Icon(LucideIcons.chevronDown, size: 16, color: colors.textSecondary),
                          items: ticketTopics.map((t) {
                            return DropdownMenuItem<TicketTopic>(
                              value: t.topic,
                              child: Text(
                                t.label,
                                style: SalacopeTypography.body.copyWith(color: colors.textPrimary),
                              ),
                            );
                          }).toList(),
                          onChanged: (val) {
                            if (val != null) setState(() => _selectedTopic = val);
                          },
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Reference field with suggestions
                  SField(
                    label: 'Référence (optionnel)',
                    hint: 'Code TX-… d’un paiement ou n° SC-… d’une commande.',
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        TextField(
                          controller: _refCtrl,
                          textCapitalization: TextCapitalization.characters,
                          style: SalacopeTypography.body.copyWith(
                            fontFamily: 'monospace',
                            color: colors.textPrimary,
                          ),
                          decoration: InputDecoration(
                            hintText: 'TX-XXXX-XXXX',
                            hintStyle: SalacopeTypography.body.copyWith(
                              fontFamily: 'monospace',
                              color: colors.textTertiary,
                            ),
                            prefixIcon: Icon(
                              LucideIcons.creditCard,
                              size: 16,
                              color: colors.textSecondary,
                            ),
                            filled: true,
                            fillColor: colors.surface,
                            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
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
                        ),
                        if (suggestions.isNotEmpty) ...[
                          const SizedBox(height: 8),
                          Wrap(
                            spacing: 8,
                            runSpacing: 6,
                            children: suggestions.take(5).map((code) {
                              final isSelected = _refCtrl.text == code;
                              return ActionChip(
                                label: Text(
                                  code,
                                  style: SalacopeTypography.caption.copyWith(
                                    fontFamily: 'monospace',
                                    color: isSelected ? colors.onAccent : colors.textPrimary,
                                  ),
                                ),
                                backgroundColor: isSelected ? colors.accent : colors.gray100,
                                side: BorderSide(
                                  color: isSelected ? colors.accent : colors.canvasBorder,
                                ),
                                padding: const EdgeInsets.symmetric(horizontal: 4),
                                visualDensity: VisualDensity.compact,
                                onPressed: () {
                                  setState(() {
                                    _refCtrl.text = code;
                                    if (code.startsWith('TX-')) {
                                      _selectedTopic = TicketTopic.payment;
                                    } else if (code.startsWith('SC-')) {
                                      _selectedTopic = TicketTopic.order;
                                    }
                                  });
                                },
                              );
                            }).toList(),
                          ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Subject
                  SField(
                    label: 'Objet',
                    child: TextField(
                      controller: _subjectCtrl,
                      style: SalacopeTypography.body.copyWith(color: colors.textPrimary),
                      decoration: InputDecoration(
                        hintText: 'Ex. : débité mais pas de commande',
                        hintStyle: SalacopeTypography.body.copyWith(color: colors.textTertiary),
                        filled: true,
                        fillColor: colors.surface,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
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
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Message
                  SField(
                    label: 'Message',
                    child: TextField(
                      controller: _bodyCtrl,
                      maxLines: 5,
                      style: SalacopeTypography.body.copyWith(color: colors.textPrimary),
                      decoration: InputDecoration(
                        hintText: 'Ce qui s’est passé, et ce que vous attendez de nous.',
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
                    ),
                  ),

                  if (_error != null) ...[
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: colors.red50,
                        borderRadius: BorderRadius.circular(SalacopeTokens.radiusMd),
                        border: Border.all(color: colors.red600.withValues(alpha: 0.3)),
                      ),
                      child: Text(
                        _error!,
                        style: SalacopeTypography.caption.copyWith(color: colors.red700),
                      ),
                    ),
                  ],

                  const SizedBox(height: 24),
                  SButton(
                    label: 'Envoyer au support',
                    variant: SButtonVariant.primary,
                    size: SButtonSize.lg,
                    pill: true,
                    loading: _submitting,
                    onPressed: _handleSubmit,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
