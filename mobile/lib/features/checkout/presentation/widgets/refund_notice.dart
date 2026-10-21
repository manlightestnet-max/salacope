import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:salacope/core/db/models/order.dart';
import 'package:salacope/core/design/colors.dart';
import 'package:salacope/core/design/tokens.dart';
import 'package:salacope/core/design/typography.dart';
import 'package:salacope/core/domain/refund.dart';
import 'package:salacope/core/lib/format.dart';
import 'package:salacope/core/ui/s_shimmer.dart';
import '../../data/checkout_api.dart';

class _Row extends StatelessWidget {
  final String label;
  final String value;
  final bool strong;
  const _Row(this.label, this.value, {this.strong = false});

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final style = SalacopeTypography.caption.copyWith(
      color: strong ? colors.gray900 : colors.gray600,
      fontWeight: strong ? FontWeight.w600 : FontWeight.w400,
    );
    return Padding(
      padding: const EdgeInsets.only(top: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(child: Text(label, style: style)),
          const SizedBox(width: 12),
          Text(value, style: style.copyWith(fontFeatures: const [FontFeature.tabularFigures()])),
        ],
      ),
    );
  }
}

class _Box extends StatelessWidget {
  final String title;
  final List<Widget> children;
  const _Box({required this.title, required this.children});

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
      decoration: BoxDecoration(
        color: colors.gray50,
        borderRadius: BorderRadius.circular(SalacopeTokens.radiusXl),
        border: Border.all(color: colors.gray200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Icon(LucideIcons.undo2, size: 14, color: colors.gray400),
              const SizedBox(width: 6),
              Text(title, style: SalacopeTypography.caption.copyWith(color: colors.gray900, fontWeight: FontWeight.w600)),
            ],
          ),
          ...children,
        ],
      ),
    );
  }
}

Widget _note(BuildContext context, String text) => Padding(
      padding: const EdgeInsets.only(top: 10),
      child: Text(text, style: SalacopeTypography.caption.copyWith(color: context.colors.gray500)),
    );

/// What happens to the money if the sale is cancelled, before the buyer pays and in their order (web: `RefundPreview`). A refund
/// to a phone loses the payout fees (operator + LightPay), a LightPay-wallet payment comes back whole; the figures come from
/// LightPay's own settings. Never asked for a total of 0.
class RefundPreview extends StatefulWidget {
  final int total;
  const RefundPreview({super.key, required this.total});

  @override
  State<RefundPreview> createState() => _RefundPreviewState();
}

class _RefundPreviewState extends State<RefundPreview> {
  RefundPreviewData? _data;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void didUpdateWidget(RefundPreview old) {
    super.didUpdateWidget(old);
    if (old.total != widget.total) _load();
  }

  Future<void> _load() async {
    final total = widget.total;
    // The last answer for this total is shown at once; the server is asked again behind it.
    setState(() {
      _data = checkoutApi.lastRefundPreview(total);
      _error = null;
    });
    try {
      final d = await checkoutApi.refundPreview(total);
      if (mounted && widget.total == total) setState(() => _data = d);
    } catch (e) {
      if (mounted && widget.total == total && _data == null) setState(() => _error = e.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    const title = 'Si la vente est annulée';
    final total = widget.total;
    final data = _data;
    if (data == null && _error != null) {
      return _Box(title: title, children: [_note(context, 'Détail du remboursement indisponible : $_error')]);
    }
    if (data == null) {
      return const _Box(
        title: title,
        children: [
          SizedBox(height: 10),
          SShimmer(child: SShimmerBox(height: 10, width: 180, radius: 4)),
          SizedBox(height: 8),
          SShimmer(child: SShimmerBox(height: 10, width: 120, radius: 4)),
        ],
      );
    }
    final fees = total - data.sent;
    return _Box(
      title: title,
      children: [
        const SizedBox(height: 4),
        if (fees > 0) ...[
          _Row('Payé par mobile money', formatXaf(total)),
          _Row('Frais de retrait (opérateur et LightPay)', '−${formatXaf(fees)}'),
          _Row(data.varies ? 'Remboursé sur votre numéro, au moins' : 'Remboursé sur votre numéro', formatXaf(data.sent), strong: true),
        ] else
          _Row('Remboursé sur votre numéro', formatXaf(total), strong: true),
        _Row('Payé par wallet LightPay : remboursé en totalité', formatXaf(total)),
        if (fees > 0) _note(context, refundFeesWhy),
      ],
    );
  }
}

/// A cancelled order: what the buyer really got back, and why it is not the whole amount (web: `RefundReceipt`).
class RefundReceipt extends StatelessWidget {
  final OrderRefund refund;
  const RefundReceipt({super.key, required this.refund});

  @override
  Widget build(BuildContext context) {
    final fees = refund.paid - refund.sent;
    final departs = refundDepartureTime(refund);
    return _Box(
      title: 'Remboursement',
      children: [
        const SizedBox(height: 4),
        _Row('Payé', formatXaf(refund.paid)),
        if (fees > 0 && refund.sent > 0) ...[
          _Row('Frais de retrait de l’opérateur', '−${formatXaf(refund.operatorFee)}'),
          _Row('Frais de retrait de LightPay', '−${formatXaf(refund.lightpayFee)}'),
        ],
        _Row(refund.via == 'wallet' ? 'Remboursé sur votre wallet LightPay' : 'Remboursé sur votre numéro', formatXaf(refund.sent), strong: true),
        if (departs != null) _note(context, 'Le virement part à $departs.'),
        if (refund.sent <= 0) _note(context, 'Le montant est trop faible pour couvrir les frais de retrait : contactez le support.'),
        if (fees > 0 && refund.sent > 0) _note(context, refundFeesWhy),
      ],
    );
  }
}
