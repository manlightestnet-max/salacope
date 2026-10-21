import 'dart:async';

import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../../core/api/sync.dart';
import '../../../../core/db/models/listing.dart';
import '../../../../core/design/colors.dart';
import '../../../../core/design/tokens.dart';
import '../../../../core/design/typography.dart';

/// The clock of a promotion, at the top of the offer (web: `PromoCountdown`): days, hours, minutes and seconds ticking in real
/// time, and a bar that empties as the end comes closer. At zero the catalogue is read again, so the regular price is back.
class PromoCountdown extends StatefulWidget {
  final Listing listing;
  const PromoCountdown({super.key, required this.listing});

  @override
  State<PromoCountdown> createState() => _PromoCountdownState();
}

class _PromoCountdownState extends State<PromoCountdown> {
  Timer? _timer;
  bool _asked = false;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final listing = widget.listing;
    final promo = listing.promo;
    final end = promo == null ? null : DateTime.tryParse(promo.endsAt);
    if (promo == null || end == null) return const SizedBox.shrink();
    final now = DateTime.now();
    final left = end.difference(now);
    if (left <= Duration.zero) {
      if (!_asked) {
        _asked = true;
        sync.refreshCatalog(force: true).catchError((_) {});
      }
      return const SizedBox.shrink();
    }

    final colors = context.colors;
    final start = DateTime.tryParse(promo.startsAt);
    final total = start == null ? 0 : end.difference(start).inMilliseconds;
    final share = total > 0 ? (left.inMilliseconds / total).clamp(0.0, 1.0) : 0.0;
    final compareAt = listing.compareAtXaf;
    final off = compareAt != null && compareAt > listing.priceXaf ? ((1 - listing.priceXaf / compareAt) * 100).round() : 0;
    final label = listing.priceXaf == 0
        ? 'Gratuit'
        : off > 0
            ? 'Promotion −$off %'
            : 'Promotion';
    final days = left.inDays;
    final hours = left.inHours % 24;
    final minutes = left.inMinutes % 60;
    final seconds = left.inSeconds % 60;

    return Semantics(
      label: 'Fin de la promotion',
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: colors.red50,
          borderRadius: BorderRadius.circular(SalacopeTokens.radius2xl),
          border: Border.all(color: colors.red200),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Icon(LucideIcons.timer, size: 16, color: colors.red700),
                const SizedBox(width: 8),
                Expanded(
                  child: Text('$label · se termine dans', style: SalacopeTypography.bodyStrong.copyWith(color: colors.red700)),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                if (days > 0) _Unit(value: days, label: 'jours'),
                _Unit(value: hours, label: 'heures'),
                _Unit(value: minutes, label: 'min'),
                _Unit(value: seconds, label: 'sec'),
              ],
            ),
            const SizedBox(height: 12),
            ClipRRect(
              borderRadius: SalacopeTokens.borderFull,
              child: LinearProgressIndicator(value: share, minHeight: 6, backgroundColor: colors.red200, color: colors.red500),
            ),
          ],
        ),
      ),
    );
  }
}

class _Unit extends StatelessWidget {
  final int value;
  final String label;
  const _Unit({required this.value, required this.label});

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    return Container(
      width: 56,
      margin: const EdgeInsets.only(right: 6),
      padding: const EdgeInsets.symmetric(vertical: 6),
      decoration: BoxDecoration(color: colors.surface, borderRadius: BorderRadius.circular(SalacopeTokens.radiusLg)),
      child: Column(
        children: [
          Text(
            value.toString().padLeft(2, '0'),
            style: SalacopeTypography.panelTitle.copyWith(color: colors.gray900, height: 1, fontFeatures: const [FontFeature.tabularFigures()]),
          ),
          const SizedBox(height: 4),
          Text(label.toUpperCase(), style: SalacopeTypography.small.copyWith(color: colors.gray500, fontSize: 10, letterSpacing: 0.4)),
        ],
      ),
    );
  }
}
