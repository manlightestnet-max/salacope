import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:salacope/core/design/theme.dart';
import 'package:salacope/core/design/tokens.dart';
import 'package:salacope/core/design/typography.dart';
import 'package:salacope/core/lib/format.dart';
import 'package:salacope/core/ui/s_avatar.dart';
import 'package:salacope/core/ui/s_empty_state.dart';
import 'package:salacope/core/ui/s_shimmer.dart';
import '../data/disputes_api.dart';

/// The person's dispute rooms, in the style of their conversations. The last answer shows at once when coming back;
/// the server is asked again in the background.
class DisputeList extends StatefulWidget {
  const DisputeList({super.key});

  @override
  State<DisputeList> createState() => _DisputeListState();
}

class _DisputeListState extends State<DisputeList> {
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      await disputesApi.list();
      if (mounted) setState(() => _error = null);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    return ValueListenableBuilder<List<DisputeRow>?>(
      valueListenable: disputesApi.mine,
      builder: (context, rows, _) {
        if (rows == null) {
          if (_error != null) return SEmptyState(icon: LucideIcons.scale, title: 'Litiges indisponibles', description: _error!);
          return const Padding(
            padding: EdgeInsets.all(16),
            child: SShimmer(child: Column(children: [SShimmerBox(height: 64), SizedBox(height: 10), SShimmerBox(height: 64)])),
          );
        }
        if (rows.isEmpty) {
          return const SEmptyState(
            icon: LucideIcons.scale,
            title: 'Aucun litige',
            description: 'Un problème avec une commande ? Signalez-le depuis la commande : une salle s’ouvre ici avec le vendeur et Salacope, et l’argent reste bloqué jusqu’à la décision.',
          );
        }
        return RefreshIndicator(
          color: colors.accent,
          onRefresh: _load,
          child: ListView.separated(
            padding: const EdgeInsets.symmetric(vertical: 8),
            itemCount: rows.length,
            separatorBuilder: (_, _) => Divider(height: 1, thickness: 0.8, indent: 72, color: colors.canvasBorder),
            itemBuilder: (context, i) {
              final d = rows[i];
              final name = d.counterpart ?? 'Salacope';
              return InkWell(
                onTap: () async {
                  await context.push('/litiges/${d.id}');
                  _load();
                },
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  child: Row(
                    children: [
                      SAvatar(name: name, size: SAvatarSize.lg),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Expanded(
                                  child: Text('${d.label} · $name',
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: SalacopeTypography.bodyStrong.copyWith(color: colors.textPrimary, fontWeight: d.unread > 0 ? FontWeight.w700 : FontWeight.w600)),
                                ),
                                Text(formatRelative(d.updatedAt), style: SalacopeTypography.caption.copyWith(color: d.unread > 0 ? colors.accent : colors.textMuted, fontSize: 11)),
                              ],
                            ),
                            const SizedBox(height: 3),
                            Row(
                              children: [
                                Expanded(
                                  child: Text(d.lastBody ?? d.title,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: SalacopeTypography.caption.copyWith(color: d.unread > 0 ? colors.textPrimary : colors.textSecondary)),
                                ),
                                const SizedBox(width: 6),
                                Text(d.open ? 'Ouvert' : (disputeOutcomeLabel[d.outcome] ?? 'Clos'),
                                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: d.open ? colors.danger : colors.textMuted)),
                                if (d.unread > 0) ...[
                                  const SizedBox(width: 6),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(color: colors.accent, borderRadius: BorderRadius.circular(SalacopeTokens.radiusFull)),
                                    child: Text('${d.unread}', style: TextStyle(color: colors.onAccent, fontSize: 10, fontWeight: FontWeight.w700)),
                                  ),
                                ],
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
          ),
        );
      },
    );
  }
}
