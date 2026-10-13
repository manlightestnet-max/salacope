import 'package:salacope/core/db/models/order.dart';
import 'package:salacope/core/domain/orders.dart';

class SalesBalance {
  final int escrow;
  final int frozen;
  final int released;
  final int sold;
  final int commission;

  const SalesBalance({
    required this.escrow,
    required this.frozen,
    required this.released,
    required this.sold,
    required this.commission,
  });
}

SalesBalance computeBalance(List<Order> orders) {
  int sum(List<Order> list, String key) => list.fold(0, (s, o) {
        if (key == 'net') return s + o.amounts.net;
        if (key == 'total') return s + o.amounts.total;
        return s + o.amounts.fee;
      });

  final releasedOrders =
      orders.where((o) => fundsState(o.status) == FundsState.released).toList();

  return SalesBalance(
    escrow: sum(
        orders.where((o) => fundsState(o.status) == FundsState.escrow).toList(),
        'net'),
    frozen: sum(
        orders.where((o) => fundsState(o.status) == FundsState.frozen).toList(),
        'net'),
    released: sum(releasedOrders, 'net'),
    sold: sum(releasedOrders, 'total'),
    commission: sum(releasedOrders, 'fee'),
  );
}

class LedgerEntry {
  final String id;
  final String at;
  final String label;
  final String detail;
  final int amount;
  final int sale;
  final int commission;

  const LedgerEntry({
    required this.id,
    required this.at,
    required this.label,
    required this.detail,
    required this.amount,
    required this.sale,
    required this.commission,
  });
}

List<LedgerEntry> buildLedger(List<Order> orders) {
  final list = orders
      .where((o) => o.status == 'completed')
      .map((o) {
        final lastEv = o.events.reversed
            .where((e) => e.type == 'completed' || e.type == 'auto_completed')
            .firstOrNull;
        return LedgerEntry(
          id: o.id,
          at: lastEv?.at ?? o.updatedAt,
          label: 'Vente ${o.number}',
          detail: o.item.title,
          amount: o.amounts.net,
          sale: o.amounts.total,
          commission: o.amounts.fee,
        );
      })
      .toList();

  list.sort((a, b) => b.at.compareTo(a.at));
  return list;
}

class UpcomingRelease {
  final Order order;
  final String? at;
  final bool estimated;

  const UpcomingRelease({
    required this.order,
    this.at,
    required this.estimated,
  });
}

List<UpcomingRelease> upcomingReleases(List<Order> orders, int escrowDays) {
  const dayMs = 86400000;
  final list = orders
      .where((o) => fundsState(o.status) == FundsState.escrow)
      .map((order) {
        if (order.status == 'delivered') {
          return UpcomingRelease(order: order, at: order.releaseAt, estimated: false);
        }
        if (order.status == 'in_progress' && order.dueAt != null && order.dueAt!.isNotEmpty) {
          final due = DateTime.tryParse(order.dueAt!)?.millisecondsSinceEpoch;
          if (due != null) {
            final estDate = DateTime.fromMillisecondsSinceEpoch(due + escrowDays * dayMs);
            return UpcomingRelease(order: order, at: estDate.toIso8601String(), estimated: true);
          }
        }
        return UpcomingRelease(order: order, estimated: true);
      })
      .toList();

  list.sort((a, b) => (a.at ?? '9999').compareTo(b.at ?? '9999'));
  return list;
}
