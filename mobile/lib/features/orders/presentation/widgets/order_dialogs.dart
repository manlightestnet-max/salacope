import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:salacope/core/config/platform.dart';
import 'package:salacope/core/design/colors.dart';
import 'package:salacope/core/design/tokens.dart';
import 'package:salacope/core/design/typography.dart';
import 'package:salacope/core/lib/image.dart';
import 'package:salacope/core/ui/s_button.dart';
import 'package:salacope/core/ui/s_dialog.dart';
import 'package:salacope/core/ui/s_field.dart';
import 'package:salacope/core/ui/s_toast.dart';
import '../../data/orders_api.dart';

/// The dialogs of an order (web: `OrderDialogs.tsx`), as sheets over the screen. Each one runs its action, says it went well or
/// what went wrong, and closes only when it succeeded.

/// Runs [action], shows [success] or the error; true when it went through.
Future<bool> runOrderAction(BuildContext context, Future<void> Function() action, [String? success]) async {
  try {
    await action();
    if (context.mounted && success != null) SToast.success(context, success);
    return true;
  } catch (e) {
    if (context.mounted) SToast.error(context, e.toString());
    return false;
  }
}

/// Seller delivers a service: message + files.
Future<void> showDeliverSheet(BuildContext context, String orderId) => showSSheet<void>(
      context: context,
      title: 'Livrer la commande',
      description:
          'Le client est notifié et dispose de ${PlatformConfig.serviceValidationDays} jours pour valider, demander une retouche ou signaler un problème.',
      child: _DeliverForm(orderId: orderId),
    );

class _DeliverForm extends StatefulWidget {
  final String orderId;
  const _DeliverForm({required this.orderId});

  @override
  State<_DeliverForm> createState() => _DeliverFormState();
}

class _DeliverFormState extends State<_DeliverForm> {
  final _note = TextEditingController();
  final List<Map<String, dynamic>> _files = [];
  bool _busy = false;

  /// What the server takes in one send (3 Mo once encoded).
  static const int _maxBytes = 2100 * 1024;
  int get _bytes => _files.fold(0, (n, f) => n + (((f['dataUrl'] as String?)?.length ?? 0) * 3 ~/ 4));

  @override
  void dispose() {
    _note.dispose();
    super.dispose();
  }

  Future<void> _attach() async {
    try {
      final f = await pickAttachmentFile(maxBytes: _maxBytes);
      if (f == null) return;
      final size = ((f['dataUrl'] as String?)?.length ?? 0) * 3 ~/ 4;
      if (_bytes + size > _maxBytes) {
        if (mounted) SToast.error(context, '2 Mo au total par envoi : envoyez les autres fichiers dans le chat.');
        return;
      }
      setState(() => _files.add(f));
    } catch (e) {
      if (mounted) SToast.error(context, e.toString().replaceFirst('Exception: ', ''));
    }
  }

  Future<void> _submit() async {
    setState(() => _busy = true);
    final ok = await runOrderAction(
      context,
      () => ordersApi.deliverOrder(orderId: widget.orderId, note: _note.text, files: _files),
      'Livraison envoyée au client',
    );
    if (!mounted) return;
    setState(() => _busy = false);
    if (ok) Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        SField(label: 'Message au client', controller: _note, placeholder: 'Ce qui est livré, comment l’utiliser…', maxLines: 4),
        const SizedBox(height: 12),
        for (final f in _files)
          Container(
            margin: const EdgeInsets.only(bottom: 6),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: colors.gray50,
              borderRadius: BorderRadius.circular(SalacopeTokens.radiusMd),
              border: Border.all(color: colors.gray200),
            ),
            child: Row(
              children: [
                Icon(LucideIcons.paperclip, size: 14, color: colors.gray400),
                const SizedBox(width: 8),
                Expanded(child: Text('${f['name']}', maxLines: 1, overflow: TextOverflow.ellipsis, style: SalacopeTypography.body)),
                Text('${f['size']}', style: SalacopeTypography.caption.copyWith(color: colors.gray500)),
                IconButton(
                  visualDensity: VisualDensity.compact,
                  icon: Icon(LucideIcons.x, size: 14, color: colors.gray400),
                  tooltip: 'Retirer',
                  onPressed: () => setState(() => _files.remove(f)),
                ),
              ],
            ),
          ),
        Align(
          alignment: Alignment.centerLeft,
          child: SButton(
            label: 'Joindre des fichiers',
            variant: SButtonVariant.secondary,
            size: SButtonSize.sm,
            icon: const Icon(LucideIcons.paperclip, size: 14),
            onPressed: _attach,
          ),
        ),
        const SizedBox(height: 18),
        SButton(label: 'Envoyer la livraison', size: SButtonSize.lg, pill: true, isLoading: _busy, onPressed: _busy ? null : _submit),
      ],
    );
  }
}

/// Asks for a reason before an irreversible action (refuse, cancel).
Future<void> showReasonSheet(
  BuildContext context, {
  required String title,
  required String description,
  required String label,
  required String confirmLabel,
  required Future<void> Function(String reason) onSubmit,
  required String success,
}) =>
    showSSheet<void>(
      context: context,
      title: title,
      description: description,
      child: _TextForm(
        label: label,
        confirmLabel: confirmLabel,
        danger: true,
        onSubmit: (text) => runOrderAction(context, () => onSubmit(text), success),
      ),
    );

/// Buyer sends the work back with what to change.
Future<void> showRevisionSheet(BuildContext context, String orderId, int left) => showSSheet<void>(
      context: context,
      title: 'Demander une retouche',
      description:
          'Il vous reste $left retouche${left > 1 ? 's' : ''}. Le vendeur a ${PlatformConfig.revisionDays} jours pour vous renvoyer le travail.',
      child: _TextForm(
        label: 'Ce qui doit être modifié',
        placeholder: 'Soyez précis : couleurs, textes, formats…',
        confirmLabel: 'Envoyer la demande',
        onSubmit: (text) => runOrderAction(context, () => ordersApi.requestRevision(orderId, text), 'Retouche demandée'),
      ),
    );

class _TextForm extends StatefulWidget {
  final String label;
  final String? placeholder;
  final String confirmLabel;
  final bool danger;
  final Future<bool> Function(String text) onSubmit;

  const _TextForm({required this.label, this.placeholder, required this.confirmLabel, this.danger = false, required this.onSubmit});

  @override
  State<_TextForm> createState() => _TextFormState();
}

class _TextFormState extends State<_TextForm> {
  final _text = TextEditingController();
  bool _busy = false;

  @override
  void dispose() {
    _text.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _busy = true);
    final ok = await widget.onSubmit(_text.text);
    if (!mounted) return;
    setState(() => _busy = false);
    if (ok) Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          SField(label: widget.label, controller: _text, placeholder: widget.placeholder, maxLines: 4),
          const SizedBox(height: 18),
          SButton(
            label: widget.confirmLabel,
            variant: widget.danger ? SButtonVariant.danger : SButtonVariant.primary,
            size: SButtonSize.lg,
            pill: true,
            isLoading: _busy,
            onPressed: _busy ? null : _submit,
          ),
        ],
      );
}

/// Seller asks the buyer for more time.
Future<void> showExtensionSheet(BuildContext context, String orderId) => showSSheet<void>(
      context: context,
      title: 'Demander un délai',
      description: 'Le client accepte ou refuse. Tant qu’il n’a pas répondu, la date actuelle reste valable.',
      child: _ExtensionForm(orderId: orderId),
    );

class _ExtensionForm extends StatefulWidget {
  final String orderId;
  const _ExtensionForm({required this.orderId});

  @override
  State<_ExtensionForm> createState() => _ExtensionFormState();
}

class _ExtensionFormState extends State<_ExtensionForm> {
  final _reason = TextEditingController();
  int _days = 2;
  bool _busy = false;

  @override
  void dispose() {
    _reason.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _busy = true);
    final ok = await runOrderAction(context, () => ordersApi.requestExtension(widget.orderId, _days, _reason.text), 'Demande envoyée au client');
    if (!mounted) return;
    setState(() => _busy = false);
    if (ok) Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        SField(
          label: 'Temps supplémentaire',
          child: DropdownButtonFormField<int>(
            initialValue: _days,
            dropdownColor: colors.surface,
            items: [
              for (var d = 1; d <= PlatformConfig.maxExtensionDays; d++) DropdownMenuItem(value: d, child: Text('$d jour${d > 1 ? 's' : ''}')),
            ],
            onChanged: (v) => setState(() => _days = v ?? _days),
          ),
        ),
        const SizedBox(height: 12),
        SField(label: 'Raison (visible par le client)', controller: _reason, maxLines: 3),
        const SizedBox(height: 18),
        SButton(label: 'Envoyer la demande', size: SButtonSize.lg, pill: true, isLoading: _busy, onPressed: _busy ? null : _submit),
      ],
    );
  }
}

/// Same reasons as the web, by kind of offer.
const Map<String, List<String>> reportReasons = {
  'digital': ['Le fichier ne s’ouvre pas', 'Contenu différent de l’annonce', 'Fichier incomplet', 'Autre'],
  'service': ['Livraison non conforme', 'Travail incomplet', 'Pas de nouvelles du vendeur', 'Autre'],
};

/// One-step report: pick what's wrong (optional detail), it is recorded right away, then a confirmation says Salacope handles it.
Future<void> showReportSheet(BuildContext context, String orderId, String kind) => showSSheet<void>(
      context: context,
      child: _ReportForm(orderId: orderId, kind: kind),
    );

class _ReportForm extends StatefulWidget {
  final String orderId;
  final String kind;
  const _ReportForm({required this.orderId, required this.kind});

  @override
  State<_ReportForm> createState() => _ReportFormState();
}

class _ReportFormState extends State<_ReportForm> {
  final _detail = TextEditingController();
  String? _reason;
  ReportResult? _result;
  bool _busy = false;

  @override
  void dispose() {
    _detail.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final reason = _reason;
    if (reason == null) return;
    setState(() => _busy = true);
    ReportResult? result;
    await runOrderAction(context, () async {
      result = await ordersApi.reportProblem(orderId: widget.orderId, reason: reason, detail: _detail.text);
    });
    if (!mounted) return;
    setState(() {
      _busy = false;
      _result = result;
    });
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final result = _result;
    if (result != null) {
      return Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const SizedBox(height: 8),
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(color: colors.primary50, shape: BoxShape.circle),
            child: Icon(LucideIcons.circleCheck, size: 24, color: colors.primary700),
          ),
          const SizedBox(height: 12),
          Text('Signalement enregistré', style: SalacopeTypography.panelTitle.copyWith(color: colors.gray900)),
          const SizedBox(height: 6),
          Text(
            'On s’en occupe. Notre équipe examine la commande et vous contacte sous 24 h par e-mail'
            '${result.kind == 'dispute' ? ' ; en attendant, le vendeur n’est pas payé.' : '.'}',
            textAlign: TextAlign.center,
            style: SalacopeTypography.body.copyWith(color: colors.gray600),
          ),
          if (result.reference.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text('Référence ${result.reference}', style: SalacopeTypography.caption.copyWith(color: colors.gray500)),
          ],
          const SizedBox(height: 16),
          SButton(label: 'Compris', size: SButtonSize.lg, pill: true, isFullWidth: true, onPressed: () => Navigator.of(context).pop()),
        ],
      );
    }
    final reasons = reportReasons[widget.kind] ?? reportReasons['service']!;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text('Signaler un problème', style: SalacopeTypography.panelTitle.copyWith(color: colors.gray900)),
        const SizedBox(height: 14),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final r in reasons)
              ChoiceChip(
                label: Text(r),
                selected: _reason == r,
                showCheckmark: false,
                onSelected: (_) => setState(() => _reason = r),
                selectedColor: colors.accent,
                backgroundColor: colors.surface,
                labelStyle: SalacopeTypography.body.copyWith(
                  fontWeight: FontWeight.w500,
                  color: _reason == r ? colors.onAccent : colors.gray600,
                ),
                side: BorderSide(color: _reason == r ? colors.accent : colors.gray200),
                shape: const StadiumBorder(),
              ),
          ],
        ),
        const SizedBox(height: 14),
        SField(controller: _detail, placeholder: 'Précisions (facultatif)', maxLines: 3),
        const SizedBox(height: 18),
        SButton(
          label: 'Signaler',
          size: SButtonSize.lg,
          pill: true,
          isLoading: _busy,
          onPressed: _busy || _reason == null ? null : _submit,
        ),
      ],
    );
  }
}
