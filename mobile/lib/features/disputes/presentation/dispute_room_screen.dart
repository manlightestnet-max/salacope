import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:salacope/core/design/theme.dart';
import 'package:salacope/core/design/typography.dart';
import 'package:salacope/core/ui/s_avatar.dart';
import 'package:salacope/core/ui/s_badge.dart';
import 'package:salacope/core/ui/s_button.dart';
import 'package:salacope/core/ui/s_empty_state.dart';
import 'package:salacope/core/ui/s_shimmer.dart';
import 'package:salacope/core/ui/s_toast.dart';
import '../../orders/presentation/widgets/chat_parts.dart';
import '../data/disputes_api.dart';

/// A dispute room of the person: the buyer, the seller and Salacope (or, for a conduct dispute, Salacope and the account
/// concerned). It keeps the logic of a chat (same bubbles, same composer as the orders). Salacope's decisions are taken on
/// the web administration only: nothing of the administration is ever in the app.
class DisputeRoomScreen extends StatefulWidget {
  final String disputeId;
  const DisputeRoomScreen({super.key, required this.disputeId});

  @override
  State<DisputeRoomScreen> createState() => _DisputeRoomScreenState();
}

class _DisputeRoomScreenState extends State<DisputeRoomScreen> with WidgetsBindingObserver {
  late DisputeDetail? _detail = disputesApi.rooms[widget.disputeId];
  String? _error;
  Timer? _timer;
  final ChatScrollKeeper _scroll = ChatScrollKeeper();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _load();
    // A room is live: new messages arrive within a few seconds while it is open.
    _timer = Timer.periodic(const Duration(seconds: 6), (_) => _load());
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) _load();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _timer?.cancel();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final d = await disputesApi.detail(widget.disputeId);
      if (mounted) setState(() => _detail = d);
    } catch (e) {
      if (mounted && _detail == null) setState(() => _error = e.toString());
    }
  }

  Future<bool> _send(String body, List<Map<String, dynamic>> files) async {
    try {
      final d = await disputesApi.send(widget.disputeId, body, files);
      if (mounted) setState(() => _detail = d);
      return true;
    } catch (e) {
      if (mounted) SToast.error(context, e.toString());
      return false;
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final d = _detail;

    if (d == null) {
      return Scaffold(
        backgroundColor: colors.canvas,
        appBar: AppBar(backgroundColor: colors.surface, elevation: 0, title: const Text('Litige')),
        body: _error != null
            ? SEmptyState(icon: LucideIcons.scale, title: 'Litige indisponible', description: _error!, action: SButton(label: 'Réessayer', onPressed: _load))
            : const Padding(padding: EdgeInsets.all(16), child: SShimmer(child: Column(children: [SShimmerBox(height: 56), SizedBox(height: 12), SShimmerBox(height: 56)]))),
      );
    }

    final order = d.order;
    final other = d.kind == 'conduct'
        ? 'Salacope'
        : d.me == 'seller'
                ? order?.buyerName ?? 'Client'
                : order?.sellerName ?? 'Vendeur';
    final subtitle = order != null ? '${order.number} · ${order.title}' : (d.title ?? 'Conduite');
    _scroll.onBuild(d.messages.length);

    return Scaffold(
      backgroundColor: colors.canvas,
      appBar: AppBar(
        backgroundColor: colors.surface,
        elevation: 0,
        titleSpacing: 0,
        title: Row(
          children: [
            SAvatar(name: other, size: SAvatarSize.md),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('${d.label} · $other', maxLines: 1, overflow: TextOverflow.ellipsis, style: SalacopeTypography.bodyStrong.copyWith(color: colors.textPrimary, fontSize: 14)),
                  Text(subtitle, maxLines: 1, overflow: TextOverflow.ellipsis, style: SalacopeTypography.caption.copyWith(color: colors.textMuted, fontSize: 11)),
                ],
              ),
            ),
          ],
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: SBadge(label: d.open ? 'Ouvert' : (disputeOutcomeLabel[d.outcome] ?? 'Clos'), tone: d.open ? SBadgeTone.danger : SBadgeTone.neutral, dot: true),
          ),
          if (order != null)
            IconButton(tooltip: 'Voir la commande', icon: Icon(LucideIcons.receiptText, size: 20, color: colors.textPrimary), onPressed: () => context.push('/orders/${order.id}')),
        ],
      ),
      body: Column(
        children: [
          if (order != null && order.held && d.open)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              color: colors.surface,
              child: Text(
                'L’argent de cette commande est gelé jusqu’à la décision de Salacope : remboursement de l’acheteur ou versement au vendeur.',
                textAlign: TextAlign.center,
                style: SalacopeTypography.caption.copyWith(color: colors.textMuted),
              ),
            ),
          Expanded(
            child: ListView.builder(
              controller: _scroll.controller,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              itemCount: d.messages.length,
              itemBuilder: (context, i) {
                final m = d.messages[i];
                final mine = m.role == d.me;
                return ChatBubble(
                  body: m.body,
                  attachments: m.attachments,
                  at: m.at,
                  mine: mine,
                  name: m.name,
                  avatar: SAvatar(name: m.name, size: SAvatarSize.sm),
                );
              },
            ),
          ),
          if (d.open)
            ChatComposer(placeholder: 'Répondre dans le litige…', onSend: _send)
          else
            SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Text('Ce litige est clos : la décision est prise.', textAlign: TextAlign.center, style: TextStyle(fontSize: 12.5, color: colors.textMuted)),
              ),
            ),
        ],
      ),
    );
  }
}
