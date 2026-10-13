import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:salacope/core/db/models/order.dart';
import 'package:salacope/core/design/theme.dart';
import 'package:salacope/core/design/tokens.dart';
import 'package:salacope/core/design/typography.dart';
import 'package:salacope/core/domain/contact.dart';
import 'package:salacope/core/domain/orders.dart';
import 'package:salacope/core/lib/files.dart';
import 'package:salacope/core/lib/format.dart';
import 'package:salacope/core/lib/image.dart';
import 'package:salacope/core/ui/s_image.dart';
import 'package:salacope/core/ui/s_image_viewer.dart';
import 'package:salacope/core/ui/s_toast.dart';

/// The pieces of the messaging screens, shared by the order chat and the dispute rooms (same as the web's ChatParts):
/// the same bubbles, the same composer, so a conversation looks and behaves the same everywhere.

/// Images per message (more go in the next one), and what one send may weigh (the server takes 3 Mo once encoded).
const int maxMessageImages = 3;
const int maxSendBytes = 2100 * 1024;

/// One message: card (payment request), bubble, photos (opened in the viewer), files, then who and when.
class ChatBubble extends StatelessWidget {
  final String body;
  final List<Attachment> attachments;
  final String at;
  final bool mine;
  final Widget? avatar;

  /// Shown under the bubble for the other party ("Support Salacope", the store's name).
  final String? name;
  final Widget? ticks;
  final Widget? card;

  const ChatBubble({
    super.key,
    required this.body,
    required this.attachments,
    required this.at,
    required this.mine,
    this.avatar,
    this.name,
    this.ticks,
    this.card,
  });

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final photos = attachments.where((a) => isImageType(a.type) && (a.dataUrl ?? '').isNotEmpty).toList();
    final files = attachments.where((a) => !photos.contains(a)).toList();

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        mainAxisAlignment: mine ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (!mine && avatar != null) ...[avatar!, const SizedBox(width: 8)],
          Flexible(
            child: ConstrainedBox(
              constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * .78),
              child: Column(
                crossAxisAlignment: mine ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                children: [
                  if (card != null) Padding(padding: const EdgeInsets.only(bottom: 6), child: card!),
                  if (body.trim().isNotEmpty)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      decoration: BoxDecoration(
                        color: mine ? colors.accent : colors.surface,
                        borderRadius: BorderRadius.only(
                          topLeft: const Radius.circular(SalacopeTokens.radiusXl),
                          topRight: const Radius.circular(SalacopeTokens.radiusXl),
                          bottomLeft: Radius.circular(mine ? SalacopeTokens.radiusXl : 4),
                          bottomRight: Radius.circular(mine ? 4 : SalacopeTokens.radiusXl),
                        ),
                        border: mine ? null : Border.all(color: colors.canvasBorder, width: 0.8),
                      ),
                      child: SelectableText(
                        body.trim(),
                        style: SalacopeTypography.body.copyWith(color: mine ? colors.onAccent : colors.textPrimary, fontSize: 14, height: 1.4),
                      ),
                    ),
                  if (photos.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 6),
                      child: Wrap(
                        spacing: 6,
                        runSpacing: 6,
                        alignment: mine ? WrapAlignment.end : WrapAlignment.start,
                        children: [
                          for (var i = 0; i < photos.length; i++)
                            InkWell(
                              onTap: () => SImageViewer.show(context, images: photos.map((p) => p.dataUrl ?? '').toList(), initialIndex: i),
                              child: ClipRRect(
                                borderRadius: BorderRadius.circular(SalacopeTokens.radiusMd),
                                child: SizedBox(width: photos.length == 1 ? 200 : 120, height: photos.length == 1 ? 200 : 120, child: SImage(url: photos[i].dataUrl, fit: BoxFit.cover)),
                              ),
                            ),
                        ],
                      ),
                    ),
                  if (files.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 6),
                      child: Wrap(
                        spacing: 6,
                        runSpacing: 6,
                        alignment: mine ? WrapAlignment.end : WrapAlignment.start,
                        children: [for (final f in files) _FileChip(file: f)],
                      ),
                    ),
                  Padding(
                    padding: const EdgeInsets.only(top: 4, left: 4, right: 4),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          '${mine ? 'Vous' : (name ?? '')}${(mine || (name ?? '').isNotEmpty) ? ' · ' : ''}${formatRelative(at)}',
                          style: SalacopeTypography.caption.copyWith(color: colors.textMuted, fontSize: 11),
                        ),
                        if (mine && ticks != null) ...[const SizedBox(width: 4), ticks!],
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _FileChip extends StatelessWidget {
  final Attachment file;
  const _FileChip({required this.file});

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    return InkWell(
      borderRadius: BorderRadius.circular(SalacopeTokens.radiusFull),
      onTap: () async {
        try {
          await openRemoteFile(file.dataUrl, file.name);
        } catch (e) {
          if (context.mounted) SToast.error(context, e.toString());
        }
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: colors.surface,
          borderRadius: BorderRadius.circular(SalacopeTokens.radiusFull),
          border: Border.all(color: colors.canvasBorder, width: 0.8),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(LucideIcons.paperclip, size: 13, color: colors.textMuted),
            const SizedBox(width: 6),
            ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 160),
              child: Text(file.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: SalacopeTypography.caption.copyWith(color: colors.textPrimary, fontSize: 12)),
            ),
          ],
        ),
      ),
    );
  }
}

/// A lifecycle step between the messages (paid, delivered, dispute…), discreet, with how long ago.
class ChatEventPill extends StatelessWidget {
  final String label;
  final String at;
  const ChatEventPill({super.key, required this.label, required this.at});

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Center(
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
          decoration: BoxDecoration(
            color: colors.surface,
            borderRadius: BorderRadius.circular(SalacopeTokens.radiusFull),
            border: Border.all(color: colors.canvasBorder, width: 0.8),
          ),
          child: Text('$label · ${formatRelative(at)}', style: SalacopeTypography.caption.copyWith(color: colors.textMuted, fontSize: 11)),
        ),
      ),
    );
  }
}

/// The composer: attach (photo or file), write, send. Contact details are refused as everywhere on Salacope. `onSend`
/// returns whether it worked (text and files are then cleared); `tools` adds buttons (the seller's payment request).
class ChatComposer extends StatefulWidget {
  final String placeholder;
  final Future<bool> Function(String body, List<Map<String, dynamic>> files) onSend;
  final List<Widget> tools;

  const ChatComposer({super.key, required this.placeholder, required this.onSend, this.tools = const []});

  @override
  State<ChatComposer> createState() => _ChatComposerState();
}

class _ChatComposerState extends State<ChatComposer> {
  final _text = TextEditingController();
  final List<Map<String, dynamic>> _files = [];
  bool _sending = false;

  @override
  void dispose() {
    _text.dispose();
    super.dispose();
  }

  int get _bytes => _files.fold(0, (n, f) => n + (((f['dataUrl'] as String?)?.length ?? 0) * 3 ~/ 4));
  int get _images => _files.where((f) => isImageType(f['type'] as String?)).length;

  void _add(Map<String, dynamic>? f) {
    if (f == null) return;
    final size = ((f['dataUrl'] as String?)?.length ?? 0) * 3 ~/ 4;
    if (isImageType(f['type'] as String?) && _images >= maxMessageImages) {
      SToast.error(context, '$maxMessageImages images par message : envoyez les autres dans le message suivant.');
      return;
    }
    if (_bytes + size > maxSendBytes) {
      SToast.error(context, '2 Mo au total par envoi : envoyez ce fichier dans le message suivant.');
      return;
    }
    setState(() => _files.add(f));
  }

  Future<void> _attach() async {
    final colors = context.colors;
    await showModalBottomSheet<void>(
      context: context,
      backgroundColor: colors.surface,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(SalacopeTokens.radiusXl))),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 12),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                leading: Icon(LucideIcons.image, color: colors.textPrimary),
                title: Text('Envoyer une photo', style: SalacopeTypography.bodyStrong),
                onTap: () async {
                  Navigator.of(ctx).pop();
                  try {
                    final dataUrl = await pickAndCompressImage();
                    if (dataUrl == null) return;
                    final at = DateTime.now().millisecondsSinceEpoch;
                    _add({'id': 'att_$at', 'name': 'photo_$at.jpg', 'size': 'Photo', 'type': 'image/jpeg', 'dataUrl': dataUrl});
                  } catch (e) {
                    if (mounted) SToast.error(context, e.toString());
                  }
                },
              ),
              ListTile(
                leading: Icon(LucideIcons.paperclip, color: colors.textPrimary),
                title: Text('Joindre un fichier (2 Mo au plus)', style: SalacopeTypography.bodyStrong),
                onTap: () async {
                  Navigator.of(ctx).pop();
                  try {
                    _add(await pickAttachmentFile(maxBytes: maxSendBytes));
                  } catch (e) {
                    if (mounted) SToast.error(context, e.toString().replaceFirst('Exception: ', ''));
                  }
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _send() async {
    final body = _text.text.trim();
    if (_sending || (body.isEmpty && _files.isEmpty) || containsContact(body)) return;
    setState(() => _sending = true);
    try {
      if (await widget.onSend(body, List.of(_files))) {
        _text.clear();
        _files.clear();
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final blocked = containsContact(_text.text);
    final canSend = !blocked && !_sending && (_text.text.trim().isNotEmpty || _files.isNotEmpty);
    return Container(
      padding: const EdgeInsets.fromLTRB(8, 8, 8, 8),
      decoration: BoxDecoration(color: colors.surface, border: Border(top: BorderSide(color: colors.canvasBorder, width: 0.8))),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (_files.isNotEmpty)
              Padding(
                padding: const EdgeInsets.fromLTRB(4, 0, 4, 8),
                child: Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    for (var i = 0; i < _files.length; i++)
                      InputChip(
                        label: Text(_files[i]['name']?.toString() ?? 'Fichier', style: TextStyle(fontSize: 12, color: colors.textPrimary)),
                        backgroundColor: colors.canvas,
                        side: BorderSide(color: colors.canvasBorder),
                        onDeleted: () => setState(() => _files.removeAt(i)),
                        deleteIcon: const Icon(LucideIcons.x, size: 14),
                      ),
                  ],
                ),
              ),
            Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                IconButton(icon: Icon(LucideIcons.paperclip, color: colors.textSecondary), onPressed: _attach, tooltip: 'Joindre un fichier'),
                ...widget.tools,
                Expanded(
                  child: TextField(
                    controller: _text,
                    onChanged: (_) => setState(() {}),
                    maxLines: 5,
                    minLines: 1,
                    textCapitalization: TextCapitalization.sentences,
                    style: TextStyle(color: colors.textPrimary, fontSize: 15),
                    decoration: InputDecoration(
                      hintText: widget.placeholder,
                      hintStyle: TextStyle(color: colors.textMuted),
                      filled: true,
                      fillColor: colors.canvas,
                      isDense: true,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(22), borderSide: BorderSide(color: colors.canvasBorder, width: 0.8)),
                      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(22), borderSide: BorderSide(color: colors.canvasBorder, width: 0.8)),
                      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(22), borderSide: BorderSide(color: colors.gray400, width: 1)),
                    ),
                  ),
                ),
                const SizedBox(width: 6),
                Padding(
                  padding: const EdgeInsets.only(bottom: 2),
                  child: Material(
                    color: canSend ? colors.accent : colors.gray100,
                    shape: const CircleBorder(),
                    child: InkWell(
                      customBorder: const CircleBorder(),
                      onTap: canSend ? _send : null,
                      child: SizedBox(
                        width: 40,
                        height: 40,
                        child: _sending
                            ? Padding(padding: const EdgeInsets.all(11), child: CircularProgressIndicator(strokeWidth: 2, color: colors.onAccent))
                            : Icon(LucideIcons.arrowUp, size: 18, color: canSend ? colors.onAccent : colors.textMuted),
                      ),
                    ),
                  ),
                ),
              ],
            ),
            if (blocked) Padding(padding: const EdgeInsets.only(top: 4, left: 12), child: Text(contactBlocked, style: TextStyle(color: colors.danger, fontSize: 11.5))),
          ],
        ),
      ),
    );
  }
}

/// Keeps a conversation on its last message: when it opens, and when a new message arrives (if the person was already
/// at the bottom; someone reading older messages is not pulled down).
class ChatScrollKeeper {
  final ScrollController controller = ScrollController();
  int _count = -1;

  void onBuild(int count) {
    if (count == _count) return;
    final first = _count < 0;
    _count = count;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!controller.hasClients) return;
      final pos = controller.position;
      final nearEnd = pos.maxScrollExtent - pos.pixels < 220;
      if (first) {
        controller.jumpTo(pos.maxScrollExtent);
      } else if (nearEnd) {
        controller.animateTo(pos.maxScrollExtent, duration: const Duration(milliseconds: 250), curve: Curves.easeOut);
      }
    });
  }

  void dispose() => controller.dispose();
}
