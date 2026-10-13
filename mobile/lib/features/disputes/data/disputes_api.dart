import 'package:flutter/foundation.dart';
import 'package:salacope/core/api/api_client.dart';
import 'package:salacope/core/db/models/order.dart';

/// Dispute rooms (`server/routes/disputes.ts`): the conversation of a disputed order between the buyer, the seller and
/// Salacope, or a conduct dispute opened by Salacope about one account. The money of a disputed order stays frozen until
/// Salacope decides: refund the buyer or pay the seller.

class DisputeMessage {
  final String id;

  /// null = Salacope.
  final String? authorId;
  final String role; // buyer | seller | salacope | accused
  final String name;
  final String body;
  final List<Attachment> attachments;
  final String at;

  const DisputeMessage({required this.id, this.authorId, required this.role, required this.name, required this.body, required this.attachments, required this.at});

  factory DisputeMessage.fromJson(Map<String, dynamic> j) => DisputeMessage(
        id: '${j['id']}',
        authorId: j['authorId'] as String?,
        role: '${j['role'] ?? 'buyer'}',
        name: '${j['name'] ?? ''}',
        body: '${j['body'] ?? ''}',
        attachments: (j['attachments'] as List? ?? []).map((a) => Attachment.fromJson(a as Map<String, dynamic>)).toList(),
        at: '${j['at']}',
      );
}

class DisputeOrder {
  final String id, number, listingId, title, kind, status, sellerId, buyerId, sellerName, buyerName;
  final int total;
  final bool held;
  const DisputeOrder({
    required this.id,
    required this.number,
    required this.listingId,
    required this.title,
    required this.kind,
    required this.status,
    required this.sellerId,
    required this.buyerId,
    required this.sellerName,
    required this.buyerName,
    required this.total,
    required this.held,
  });
  factory DisputeOrder.fromJson(Map<String, dynamic> j) => DisputeOrder(
        id: '${j['id']}',
        number: '${j['number'] ?? ''}',
        listingId: '${j['listingId'] ?? ''}',
        title: '${j['title'] ?? ''}',
        kind: '${j['kind'] ?? ''}',
        status: '${j['status'] ?? ''}',
        sellerId: '${j['sellerId'] ?? ''}',
        buyerId: '${j['buyerId'] ?? ''}',
        sellerName: '${j['sellerName'] ?? ''}',
        buyerName: '${j['buyerName'] ?? ''}',
        total: (j['total'] as num?)?.toInt() ?? 0,
        held: j['held'] == true,
      );
}

class DisputeDetail {
  final String id, label, kind, status;
  final String? title, outcome;
  final DisputeOrder? order;
  final String? subjectName;
  final List<DisputeMessage> messages;
  final String me; // buyer | seller | accused

  const DisputeDetail({
    required this.id,
    required this.label,
    required this.kind,
    required this.status,
    this.title,
    this.outcome,
    this.order,
    this.subjectName,
    required this.messages,
    required this.me,
  });

  bool get open => status == 'open';

  factory DisputeDetail.fromJson(Map<String, dynamic> j) {
    final d = j['dispute'] as Map<String, dynamic>? ?? {};
    final subject = j['subject'] as Map<String, dynamic>?;
    return DisputeDetail(
      id: '${d['id']}',
      label: '${d['label'] ?? 'Litige'}',
      kind: '${d['kind'] ?? 'order'}',
      status: '${d['status'] ?? 'open'}',
      title: d['title'] as String?,
      outcome: d['outcome'] as String?,
      order: j['order'] is Map<String, dynamic> ? DisputeOrder.fromJson(j['order'] as Map<String, dynamic>) : null,
      subjectName: subject?['name'] as String?,
      messages: (j['messages'] as List? ?? []).map((m) => DisputeMessage.fromJson(m as Map<String, dynamic>)).toList(),
      me: '${j['me'] ?? 'buyer'}',
    );
  }
}

/// One line of the person's list of disputes.
class DisputeRow {
  final String id, label, kind, status, title, updatedAt;
  final String? outcome, orderNumber, lastBody, counterpart, side;
  final int unread;
  final bool lastFromSalacope;

  const DisputeRow({
    required this.id,
    required this.label,
    required this.kind,
    required this.status,
    required this.title,
    required this.updatedAt,
    this.outcome,
    this.orderNumber,
    this.lastBody,
    this.counterpart,
    this.side,
    this.unread = 0,
    this.lastFromSalacope = false,
  });

  bool get open => status == 'open';

  factory DisputeRow.fromJson(Map<String, dynamic> j) {
    final counterpart = j['counterpart'] as String?;
    return DisputeRow(
      id: '${j['id']}',
      label: '${j['label'] ?? 'Litige'}',
      kind: '${j['kind'] ?? 'order'}',
      status: '${j['status'] ?? 'open'}',
      title: '${j['title'] ?? ''}',
      updatedAt: '${j['updated_at'] ?? ''}',
      outcome: j['outcome'] as String?,
      orderNumber: j['order_number'] as String?,
      lastBody: j['last_body'] as String?,
      counterpart: counterpart,
      side: j['side'] as String?,
      unread: (j['unread'] as num?)?.toInt() ?? 0,
      lastFromSalacope: j['last_from_salacope'] == true,
    );
  }
}

const disputeOutcomeLabel = {'seller': 'Vendeur payé', 'buyer': 'Acheteur remboursé', 'warning': 'Avertissement', 'cleared': 'Sans suite'};

final disputesApi = DisputesApi._();

class DisputesApi {
  DisputesApi._();

  /// The last answers, kept so that coming back to a list or a room shows it at once (no loading on return).
  final ValueNotifier<List<DisputeRow>?> mine = ValueNotifier(null);
  final Map<String, DisputeDetail> rooms = {};

  Future<List<DisputeRow>> list() async {
    final res = await api.request('GET', '/disputes?offset=0') as Map<String, dynamic>;
    final rows = (res['disputes'] as List? ?? []).map((r) => DisputeRow.fromJson(r as Map<String, dynamic>)).toList();
    mine.value = rows;
    return rows;
  }

  Future<DisputeDetail> detail(String id) async {
    final res = await api.request('GET', '/disputes/${Uri.encodeComponent(id)}') as Map<String, dynamic>;
    return rooms[id] = DisputeDetail.fromJson(res);
  }

  Future<DisputeDetail> send(String id, String body, List<Map<String, dynamic>> attachments) async {
    final res = await api.request('POST', '/disputes/${Uri.encodeComponent(id)}/messages', body: {'body': body, 'attachments': attachments}) as Map<String, dynamic>;
    return rooms[id] = DisputeDetail.fromJson(res);
  }
}
