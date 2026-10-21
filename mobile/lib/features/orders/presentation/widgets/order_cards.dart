import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:salacope/core/db/models/listing.dart';
import 'package:salacope/core/db/models/order.dart';
import 'package:salacope/core/design/colors.dart';
import 'package:salacope/core/design/tokens.dart';
import 'package:salacope/core/design/typography.dart';
import 'package:salacope/core/domain/orders.dart';
import 'package:salacope/core/lib/files.dart';
import 'package:salacope/core/lib/format.dart';
import 'package:salacope/core/ui/s_button.dart';
import 'package:salacope/core/ui/s_toast.dart';
import '../../data/orders_api.dart';
import '../../domain/chat.dart';

/// The cards of an order (web: `BriefCard`, `DeliveryCard`, `OrderFiles`, `DeadlineCard`, `ChatPreviewCard`): the same ones
/// in the order's discussion and on its detail screen.

class OrderCardFrame extends StatelessWidget {
  final String? title;
  final String? subtitle;
  final Widget child;
  const OrderCardFrame({super.key, this.title, this.subtitle, required this.child});

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: colors.surface,
        borderRadius: BorderRadius.circular(SalacopeTokens.radius2xl),
        border: Border.all(color: colors.gray200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          if (title != null) ...[
            Text(title!, style: SalacopeTypography.bodyStrong.copyWith(color: colors.gray900)),
            if (subtitle != null) Text(subtitle!, style: SalacopeTypography.caption.copyWith(color: colors.gray500)),
            const SizedBox(height: 12),
          ],
          child,
        ],
      ),
    );
  }
}

/// Answers the buyer gave at checkout; what the seller needs to start.
class BriefCard extends StatelessWidget {
  final Order order;
  final Perspective perspective;
  const BriefCard({super.key, required this.order, required this.perspective});

  @override
  Widget build(BuildContext context) {
    final brief = order.brief ?? const [];
    if (brief.isEmpty) return const SizedBox.shrink();
    final colors = context.colors;
    return OrderCardFrame(
      title: perspective == Perspective.seller ? 'Brief du client' : 'Votre brief',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (final (i, a) in brief.indexed) ...[
            if (i > 0) const SizedBox(height: 12),
            Text(a.question, style: SalacopeTypography.caption.copyWith(color: colors.gray500)),
            const SizedBox(height: 2),
            Text(a.answer, style: SalacopeTypography.body.copyWith(color: colors.gray900)),
          ],
        ],
      ),
    );
  }
}

/// What was delivered: the files of a digital product, the seller's delivery (note + files) for a service.
class DeliveryCard extends StatelessWidget {
  final Order order;
  final Perspective perspective;
  const DeliveryCard({super.key, required this.order, required this.perspective});

  @override
  Widget build(BuildContext context) {
    if (!['delivered', 'completed', 'disputed'].contains(order.status)) return const SizedBox.shrink();
    if (order.item.kind == 'digital') {
      return OrderCardFrame(
        title: perspective == Perspective.buyer ? 'Vos fichiers' : 'Fichiers livrés',
        child: OrderFiles(order: order, available: true),
      );
    }
    final delivery = order.delivery;
    if (delivery == null) return const SizedBox.shrink();
    final colors = context.colors;
    return OrderCardFrame(
      title: 'Livraison',
      subtitle: formatDateTime(delivery.at),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (delivery.note.isNotEmpty) Text(delivery.note, style: SalacopeTypography.body.copyWith(color: colors.gray700)),
          for (final f in delivery.files) ...[
            const SizedBox(height: 8),
            FileRow(
              name: f.name,
              meta: f.size,
              trailing: IconButton(
                icon: Icon(LucideIcons.download, size: 18, color: colors.gray500),
                tooltip: 'Télécharger',
                onPressed: () async {
                  try {
                    await openRemoteFile(f.dataUrl, f.name);
                  } catch (e) {
                    if (context.mounted) SToast.error(context, e.toString());
                  }
                },
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// One file in a list: icon of its type, name, format · size, and an action on the right.
class FileRow extends StatelessWidget {
  final String name;
  final String meta;
  final Widget? trailing;
  const FileRow({super.key, required this.name, required this.meta, this.trailing});

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 8, 8, 8),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(SalacopeTokens.radiusXl),
        border: Border.all(color: colors.gray200),
      ),
      child: Row(
        children: [
          Icon(fileIconOf(name), size: 18, color: colors.gray400),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name, maxLines: 1, overflow: TextOverflow.ellipsis, style: SalacopeTypography.bodyStrong.copyWith(color: colors.gray900)),
                if (meta.isNotEmpty) Text(meta, style: SalacopeTypography.caption.copyWith(color: colors.gray500)),
              ],
            ),
          ),
          ?trailing,
        ],
      ),
    );
  }
}

IconData fileIconOf(String name) {
  final ext = name.split('.').last.toLowerCase();
  return switch (ext) {
    'png' || 'jpg' || 'jpeg' || 'webp' => LucideIcons.fileImage,
    'mp4' || 'mov' => LucideIcons.fileVideo,
    'mp3' || 'wav' => LucideIcons.fileAudio,
    'zip' => LucideIcons.fileArchive,
    'xlsx' || 'csv' => LucideIcons.fileSpreadsheet,
    _ => LucideIcons.fileText,
  };
}

String fileMeta(ListingFileItem f) => '${f.format.isEmpty ? 'Fichier' : f.format}${f.size != null ? ' · ${formatFileSize(f.size!)}' : ''}';

/// Every file of a digital product, each with its own download, and one button to take them all. The same list for the buyer and
/// for the seller's own copy; the server decides who may download and when.
class OrderFiles extends StatefulWidget {
  final Order order;
  final bool available;
  const OrderFiles({super.key, required this.order, required this.available});

  @override
  State<OrderFiles> createState() => _OrderFilesState();
}

class _OrderFilesState extends State<OrderFiles> {
  String? _busy;

  Future<void> _run(String key, Future<void> Function() action) async {
    if (_busy != null) return;
    setState(() => _busy = key);
    try {
      await action();
    } catch (e) {
      if (mounted) SToast.error(context, e.toString());
    } finally {
      if (mounted) setState(() => _busy = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final order = widget.order;
    final files = filesOf(order.item.file);
    final rows = files.isNotEmpty ? files : [ListingFileItem(name: order.item.title, format: 'Fichier')];
    final ids = [for (final f in files) ?f.fileId];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final (i, f) in rows.indexed) ...[
          if (i > 0) const SizedBox(height: 8),
          FileRow(
            name: f.name,
            meta: fileMeta(f),
            trailing: SButton(
              label: 'Télécharger',
              size: SButtonSize.sm,
              pill: true,
              variant: rows.length > 1 ? SButtonVariant.secondary : SButtonVariant.primary,
              icon: const Icon(LucideIcons.download, size: 14),
              isLoading: _busy == 'f$i',
              onPressed: widget.available && _busy == null ? () => _run('f$i', () => ordersApi.downloadFile(order.id, f.fileId)) : null,
            ),
          ),
        ],
        if (ids.length > 1) ...[
          const SizedBox(height: 10),
          SButton(
            label: 'Tout télécharger (${ids.length})',
            pill: true,
            isFullWidth: true,
            icon: const Icon(LucideIcons.download, size: 16),
            isLoading: _busy == 'all',
            onPressed: widget.available && _busy == null ? () => _run('all', () => ordersApi.downloadFiles(order.id, ids)) : null,
          ),
        ],
      ],
    );
  }
}

/// "2 j 5 h", "3 h 20 min", "12 min".
String formatSpan(Duration d) {
  final minutes = (d.inSeconds.abs() / 60).round();
  final days = minutes ~/ 1440;
  final hours = (minutes % 1440) ~/ 60;
  if (days > 0) return '$days j $hours h';
  if (hours > 0) return '$hours h ${minutes % 60} min';
  return '$minutes min';
}

/// The clock of a service order: time left to deliver (or to validate), and revisions. Re-drawn every minute.
class DeadlineCard extends StatefulWidget {
  final Order order;
  final Perspective perspective;
  const DeadlineCard({super.key, required this.order, required this.perspective});

  @override
  State<DeadlineCard> createState() => _DeadlineCardState();
}

class _DeadlineCardState extends State<DeadlineCard> {
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(minutes: 1), (_) => setState(() {}));
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final order = widget.order;
    final seller = widget.perspective == Perspective.seller;
    final now = DateTime.now();
    final included = order.item.revisions ?? 0;
    final left = revisionsLeft(revisions: included, revisionsUsed: order.revisionsUsed ?? 0);

    String label;
    String figure;
    String hint;
    double? progress;
    var late = false;
    final due = order.dueAt == null ? null : DateTime.tryParse(order.dueAt!);
    final release = order.releaseAt == null ? null : DateTime.tryParse(order.releaseAt!);

    if (order.status == 'paid') {
      label = 'Délai de livraison';
      figure = '${order.item.deliveryDays ?? 3} jours';
      hint = seller ? 'Le chrono démarre à l\'acceptation. Commande reçue ${formatRelative(order.createdAt)}.' : 'Démarre quand le vendeur accepte.';
    } else if (order.status == 'in_progress' && due != null) {
      final start = order.events.reversed.where((e) => e.type == 'accepted' || e.type == 'revision_requested').firstOrNull?.at;
      final from = (start == null ? null : DateTime.tryParse(start)) ?? due.subtract(Duration(days: order.item.deliveryDays ?? 3));
      late = order.isLate(now);
      label = late ? 'En retard de' : 'Temps restant';
      figure = formatSpan(due.difference(now));
      hint = 'Livraison attendue le ${formatDateTime(order.dueAt)}';
      final total = due.difference(from).inMilliseconds;
      progress = (now.difference(from).inMilliseconds / (total < 1 ? 1 : total)).clamp(0.0, 1.0);
    } else if (order.status == 'delivered' && release != null) {
      label = seller ? 'Paiement automatique dans' : 'Validation automatique dans';
      figure = formatSpan(release.difference(now));
      hint = seller
          ? 'Si le client ne répond pas, vous êtes payé le ${formatDate(order.releaseAt)}.'
          : 'Sans réponse de votre part, le vendeur est payé le ${formatDate(order.releaseAt)}.';
    } else {
      return const SizedBox.shrink();
    }

    final barColor = late ? colors.red500 : (progress ?? 0) > 0.75 ? colors.amber500 : colors.accent;
    return OrderCardFrame(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(label, style: SalacopeTypography.caption.copyWith(color: colors.gray500)),
          const SizedBox(height: 4),
          Text(
            figure,
            style: SalacopeTypography.title.copyWith(
              color: late ? colors.red600 : colors.gray900,
              fontFeatures: const [FontFeature.tabularFigures()],
            ),
          ),
          if (progress != null) ...[
            const SizedBox(height: 12),
            ClipRRect(
              borderRadius: SalacopeTokens.borderFull,
              child: LinearProgressIndicator(
                value: progress < 0.04 ? 0.04 : progress,
                minHeight: 6,
                backgroundColor: colors.gray100,
                valueColor: AlwaysStoppedAnimation(barColor),
              ),
            ),
          ],
          const SizedBox(height: 12),
          Text(hint, style: SalacopeTypography.caption.copyWith(color: colors.gray500)),
          if (included > 0) ...[
            const SizedBox(height: 14),
            Divider(height: 1, color: colors.gray100),
            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(child: Text('Retouches', style: SalacopeTypography.body.copyWith(color: colors.gray500))),
                for (var i = 0; i < included; i++)
                  Container(
                    width: 8,
                    height: 8,
                    margin: const EdgeInsets.only(left: 4),
                    decoration: BoxDecoration(color: i < left ? colors.gray900 : colors.gray200, shape: BoxShape.circle),
                  ),
                const SizedBox(width: 6),
                Text('$left/$included', style: SalacopeTypography.body.copyWith(color: colors.gray900)),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

/// The conversation kept apart from the order details: the last messages at a glance and the way into the room, where every
/// action of the order is taken.
class ChatPreviewCard extends StatelessWidget {
  final Order order;
  final String userId;
  final String counterpartName;
  const ChatPreviewCard({super.key, required this.order, required this.userId, required this.counterpartName});

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final unread = orderUnreadCount(order, userId);
    final last = order.messages.length > 2 ? order.messages.sublist(order.messages.length - 2) : order.messages;
    return OrderCardFrame(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Icon(LucideIcons.messagesSquare, size: 16, color: colors.gray400),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Discussion avec $counterpartName',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: SalacopeTypography.bodyStrong.copyWith(color: colors.gray900),
                ),
              ),
              if (unread > 0)
                Container(
                  constraints: const BoxConstraints(minWidth: 20),
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(color: colors.accent, borderRadius: SalacopeTokens.borderFull),
                  child: Text('$unread',
                      textAlign: TextAlign.center, style: SalacopeTypography.small.copyWith(color: colors.onAccent, fontWeight: FontWeight.w600)),
                ),
            ],
          ),
          const SizedBox(height: 10),
          if (last.isEmpty)
            Text('Aucun message pour l’instant.', style: SalacopeTypography.caption.copyWith(color: colors.gray500))
          else
            for (final m in last)
              Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Text.rich(
                  TextSpan(children: [
                    TextSpan(text: m.authorId == userId ? 'Vous' : counterpartName, style: const TextStyle(fontWeight: FontWeight.w500)),
                    TextSpan(text: ' · ${messagePreviewOf(m)}'),
                    TextSpan(text: ' · ${formatRelative(m.at)}', style: TextStyle(color: colors.gray400)),
                  ]),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: SalacopeTypography.caption.copyWith(color: m.authorId == userId ? colors.gray500 : colors.gray800),
                ),
              ),
          const SizedBox(height: 8),
          SButton(
            label: unread > 0 ? 'Lire ${unread > 1 ? 'les $unread messages' : 'le message'}' : 'Ouvrir la discussion',
            variant: unread > 0 ? SButtonVariant.primary : SButtonVariant.secondary,
            size: SButtonSize.sm,
            isFullWidth: true,
            pill: true,
            onPressed: () => context.push('/compte/messages/${order.id}'),
          ),
        ],
      ),
    );
  }
}
