import 'listing.dart';

class OrderEvent {
  final String id;
  final String type;
  final String at;
  final String? actorId;
  final String? note;

  const OrderEvent({
    required this.id,
    required this.type,
    required this.at,
    this.actorId,
    this.note,
  });

  factory OrderEvent.fromJson(Map<String, dynamic> json) => OrderEvent(
        id: json['id']?.toString() ?? '',
        type: json['type']?.toString() ?? '',
        at: json['at']?.toString() ?? '',
        actorId: json['actorId']?.toString(),
        note: json['note']?.toString(),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'type': type,
        'at': at,
        if (actorId != null) 'actorId': actorId,
        if (note != null) 'note': note,
      };
}

class Attachment {
  final String id;
  final String name;
  final String size;
  final String type;
  final String? dataUrl;

  const Attachment({
    required this.id,
    required this.name,
    required this.size,
    required this.type,
    this.dataUrl,
  });

  factory Attachment.fromJson(Map<String, dynamic> json) => Attachment(
        id: json['id']?.toString() ?? '',
        name: json['name']?.toString() ?? '',
        size: json['size']?.toString() ?? '',
        type: json['type']?.toString() ?? '',
        dataUrl: json['dataUrl']?.toString(),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'size': size,
        'type': type,
        if (dataUrl != null) 'dataUrl': dataUrl,
      };
}

class PaymentRequest {
  final String listingId;
  final String title;
  final int priceXaf;
  final String coverImage;
  final String category;
  final String? openedAt;

  const PaymentRequest({
    required this.listingId,
    required this.title,
    required this.priceXaf,
    required this.coverImage,
    required this.category,
    this.openedAt,
  });

  factory PaymentRequest.fromJson(Map<String, dynamic> json) => PaymentRequest(
        listingId: json['listingId']?.toString() ?? '',
        title: json['title']?.toString() ?? '',
        priceXaf: (json['priceXaf'] as num?)?.toInt() ?? 0,
        coverImage: json['coverImage']?.toString() ?? '',
        category: json['category']?.toString() ?? '',
        openedAt: json['openedAt']?.toString(),
      );

  Map<String, dynamic> toJson() => {
        'listingId': listingId,
        'title': title,
        'priceXaf': priceXaf,
        'coverImage': coverImage,
        'category': category,
        if (openedAt != null) 'openedAt': openedAt,
      };
}

class OrderMessage {
  final String id;
  final String authorId;
  final String body;
  final List<Attachment>? attachments;
  final PaymentRequest? request;
  final String at;

  const OrderMessage({
    required this.id,
    required this.authorId,
    required this.body,
    this.attachments,
    this.request,
    required this.at,
  });

  factory OrderMessage.fromJson(Map<String, dynamic> json) => OrderMessage(
        id: json['id']?.toString() ?? '',
        authorId: json['authorId']?.toString() ?? '',
        body: json['body']?.toString() ?? '',
        attachments: (json['attachments'] as List?)
            ?.whereType<Map<String, dynamic>>()
            .map(Attachment.fromJson)
            .toList(),
        request: json['request'] is Map<String, dynamic>
            ? PaymentRequest.fromJson(json['request'] as Map<String, dynamic>)
            : null,
        at: json['at']?.toString() ?? '',
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'authorId': authorId,
        'body': body,
        if (attachments != null)
          'attachments': attachments!.map((a) => a.toJson()).toList(),
        if (request != null) 'request': request!.toJson(),
        'at': at,
      };
}

class OrderChatSeenRead {
  final String? buyer;
  final String? seller;

  const OrderChatSeenRead({this.buyer, this.seller});

  factory OrderChatSeenRead.fromJson(Map<String, dynamic> json) =>
      OrderChatSeenRead(
        buyer: json['buyer']?.toString(),
        seller: json['seller']?.toString(),
      );

  Map<String, dynamic> toJson() => {
        if (buyer != null) 'buyer': buyer,
        if (seller != null) 'seller': seller,
      };
}

class OrderChat {
  final bool ephemeral;
  final bool blocked;
  final OrderChatSeenRead seen;
  final OrderChatSeenRead read;

  const OrderChat({
    required this.ephemeral,
    required this.blocked,
    required this.seen,
    required this.read,
  });

  factory OrderChat.fromJson(Map<String, dynamic> json) => OrderChat(
        ephemeral: json['ephemeral'] == true,
        blocked: json['blocked'] == true,
        seen: json['seen'] is Map<String, dynamic>
            ? OrderChatSeenRead.fromJson(json['seen'] as Map<String, dynamic>)
            : const OrderChatSeenRead(),
        read: json['read'] is Map<String, dynamic>
            ? OrderChatSeenRead.fromJson(json['read'] as Map<String, dynamic>)
            : const OrderChatSeenRead(),
      );

  Map<String, dynamic> toJson() => {
        'ephemeral': ephemeral,
        'blocked': blocked,
        'seen': seen.toJson(),
        'read': read.toJson(),
      };
}

class OrderItem {
  final String title;
  final String kind;
  final String category;
  final String coverImage;
  final int? deliveryDays;
  final int? revisions;
  final ListingFile? file;

  const OrderItem({
    required this.title,
    required this.kind,
    required this.category,
    required this.coverImage,
    this.deliveryDays,
    this.revisions,
    this.file,
  });

  factory OrderItem.fromJson(Map<String, dynamic> json) => OrderItem(
        title: json['title']?.toString() ?? '',
        kind: json['kind']?.toString() ?? 'digital',
        category: json['category']?.toString() ?? 'ebook',
        coverImage: json['coverImage']?.toString() ?? '',
        deliveryDays: (json['deliveryDays'] as num?)?.toInt(),
        revisions: (json['revisions'] as num?)?.toInt(),
        file: json['file'] is Map<String, dynamic>
            ? ListingFile.fromJson(json['file'] as Map<String, dynamic>)
            : null,
      );

  Map<String, dynamic> toJson() => {
        'title': title,
        'kind': kind,
        'category': category,
        'coverImage': coverImage,
        if (deliveryDays != null) 'deliveryDays': deliveryDays,
        if (revisions != null) 'revisions': revisions,
        if (file != null) 'file': file!.toJson(),
      };
}

class OrderBuyer {
  final String name;
  final String email;
  final String phone;

  const OrderBuyer({required this.name, required this.email, required this.phone});

  factory OrderBuyer.fromJson(Map<String, dynamic> json) => OrderBuyer(
        name: json['name']?.toString() ?? '',
        email: json['email']?.toString() ?? '',
        phone: json['phone']?.toString() ?? '',
      );

  Map<String, dynamic> toJson() => {'name': name, 'email': email, 'phone': phone};
}

class OrderInvoice {
  final String companyName;
  final String taxId;

  const OrderInvoice({required this.companyName, required this.taxId});

  factory OrderInvoice.fromJson(Map<String, dynamic> json) => OrderInvoice(
        companyName: json['companyName']?.toString() ?? '',
        taxId: json['taxId']?.toString() ?? '',
      );

  Map<String, dynamic> toJson() => {'companyName': companyName, 'taxId': taxId};
}

class OrderPayment {
  final String? channel;
  final String? phone;
  final String reference;
  final String? code;
  final String? via;

  const OrderPayment({
    this.channel,
    this.phone,
    required this.reference,
    this.code,
    this.via,
  });

  factory OrderPayment.fromJson(Map<String, dynamic> json) => OrderPayment(
        channel: json['channel']?.toString(),
        phone: json['phone']?.toString(),
        reference: json['reference']?.toString() ?? '',
        code: json['code']?.toString(),
        via: json['via']?.toString(),
      );

  Map<String, dynamic> toJson() => {
        if (channel != null) 'channel': channel,
        if (phone != null) 'phone': phone,
        'reference': reference,
        if (code != null) 'code': code,
        if (via != null) 'via': via,
      };
}

class OrderAmounts {
  final int subtotal;
  final int discount;
  final int total;
  final int fee;
  final int net;

  const OrderAmounts({
    required this.subtotal,
    required this.discount,
    required this.total,
    required this.fee,
    required this.net,
  });

  factory OrderAmounts.fromJson(Map<String, dynamic> json) => OrderAmounts(
        subtotal: (json['subtotal'] as num?)?.toInt() ?? 0,
        discount: (json['discount'] as num?)?.toInt() ?? 0,
        total: (json['total'] as num?)?.toInt() ?? 0,
        fee: (json['fee'] as num?)?.toInt() ?? 0,
        net: (json['net'] as num?)?.toInt() ?? 0,
      );

  Map<String, dynamic> toJson() => {
        'subtotal': subtotal,
        'discount': discount,
        'total': total,
        'fee': fee,
        'net': net,
      };
}

class OrderBriefItem {
  final String question;
  final String answer;

  const OrderBriefItem({required this.question, required this.answer});

  factory OrderBriefItem.fromJson(Map<String, dynamic> json) => OrderBriefItem(
        question: json['question']?.toString() ?? '',
        answer: json['answer']?.toString() ?? '',
      );

  Map<String, dynamic> toJson() => {'question': question, 'answer': answer};
}

class OrderDelivery {
  final String note;
  final List<Attachment> files;
  final String at;

  const OrderDelivery({required this.note, required this.files, required this.at});

  factory OrderDelivery.fromJson(Map<String, dynamic> json) => OrderDelivery(
        note: json['note']?.toString() ?? '',
        files: (json['files'] as List?)
                ?.whereType<Map<String, dynamic>>()
                .map(Attachment.fromJson)
                .toList() ??
            [],
        at: json['at']?.toString() ?? '',
      );

  Map<String, dynamic> toJson() => {
        'note': note,
        'files': files.map((f) => f.toJson()).toList(),
        'at': at,
      };
}

class DeadlineExtension {
  final int days;
  final String reason;
  final String status; // 'pending' | 'accepted' | 'declined'
  final String requestedAt;
  final String? answeredAt;

  const DeadlineExtension({
    required this.days,
    required this.reason,
    required this.status,
    required this.requestedAt,
    this.answeredAt,
  });

  factory DeadlineExtension.fromJson(Map<String, dynamic> json) =>
      DeadlineExtension(
        days: (json['days'] as num?)?.toInt() ?? 0,
        reason: json['reason']?.toString() ?? '',
        status: json['status']?.toString() ?? 'pending',
        requestedAt: json['requestedAt']?.toString() ?? '',
        answeredAt: json['answeredAt']?.toString(),
      );

  Map<String, dynamic> toJson() => {
        'days': days,
        'reason': reason,
        'status': status,
        'requestedAt': requestedAt,
        if (answeredAt != null) 'answeredAt': answeredAt,
      };
}

/// A cancelled order: what the buyer really got back (a refund to a phone loses the payout fees).
class OrderRefund {
  final int paid;
  final int sent;
  final int operatorFee;
  final int lightpayFee;
  final String via; // 'wallet' | 'mobile_money'
  final String at;

  /// LightPay waits a few minutes before sending a refund to a phone: when it leaves.
  final String? releaseAt;

  const OrderRefund({
    required this.paid,
    required this.sent,
    required this.operatorFee,
    required this.lightpayFee,
    required this.via,
    required this.at,
    this.releaseAt,
  });

  factory OrderRefund.fromJson(Map<String, dynamic> json) => OrderRefund(
        paid: (json['paid'] as num?)?.toInt() ?? 0,
        sent: (json['sent'] as num?)?.toInt() ?? 0,
        operatorFee: (json['operatorFee'] as num?)?.toInt() ?? 0,
        lightpayFee: (json['lightpayFee'] as num?)?.toInt() ?? 0,
        via: json['via']?.toString() ?? 'mobile_money',
        at: json['at']?.toString() ?? '',
        releaseAt: json['releaseAt']?.toString(),
      );

  Map<String, dynamic> toJson() => {
        'paid': paid,
        'sent': sent,
        'operatorFee': operatorFee,
        'lightpayFee': lightpayFee,
        'via': via,
        'at': at,
        if (releaseAt != null) 'releaseAt': releaseAt,
      };
}

class SellerMeta {
  final List<String> tags;
  final String? pinnedAt;

  const SellerMeta({required this.tags, this.pinnedAt});

  factory SellerMeta.fromJson(Map<String, dynamic> json) => SellerMeta(
        tags: (json['tags'] as List?)?.map((t) => t.toString()).toList() ?? [],
        pinnedAt: json['pinnedAt']?.toString(),
      );

  Map<String, dynamic> toJson() => {
        'tags': tags,
        if (pinnedAt != null) 'pinnedAt': pinnedAt,
      };
}

class Order {
  final String id;
  final String number;
  final String listingId;
  final OrderItem item;
  final String sellerId;
  final String buyerId;
  final OrderBuyer buyer;
  final OrderInvoice? invoice;
  final OrderPayment payment;
  final List<OrderBriefItem>? brief;
  final OrderAmounts amounts;
  final String? couponCode;
  final String status;
  final String createdAt;
  final String updatedAt;
  final String? dueAt;
  final String? releaseAt;
  final OrderDelivery? delivery;
  final OrderRefund? refund;
  final int? revisionsUsed;
  final DeadlineExtension? extension;
  final List<OrderEvent> events;
  final List<OrderMessage> messages;
  final OrderChat chat;
  final SellerMeta? sellerMeta;

  const Order({
    required this.id,
    required this.number,
    required this.listingId,
    required this.item,
    required this.sellerId,
    required this.buyerId,
    required this.buyer,
    this.invoice,
    required this.payment,
    this.brief,
    required this.amounts,
    this.couponCode,
    required this.status,
    required this.createdAt,
    required this.updatedAt,
    this.dueAt,
    this.releaseAt,
    this.delivery,
    this.refund,
    this.revisionsUsed,
    this.extension,
    required this.events,
    required this.messages,
    required this.chat,
    this.sellerMeta,
  });

  factory Order.fromJson(Map<String, dynamic> json) => Order(
        id: json['id']?.toString() ?? '',
        number: json['number']?.toString() ?? '',
        listingId: json['listingId']?.toString() ?? '',
        item: OrderItem.fromJson(json['item'] as Map<String, dynamic>? ?? {}),
        sellerId: json['sellerId']?.toString() ?? '',
        buyerId: json['buyerId']?.toString() ?? '',
        buyer: OrderBuyer.fromJson(json['buyer'] as Map<String, dynamic>? ?? {}),
        invoice: json['invoice'] is Map<String, dynamic>
            ? OrderInvoice.fromJson(json['invoice'] as Map<String, dynamic>)
            : null,
        payment: OrderPayment.fromJson(json['payment'] as Map<String, dynamic>? ?? {}),
        brief: (json['brief'] as List?)
            ?.whereType<Map<String, dynamic>>()
            .map(OrderBriefItem.fromJson)
            .toList(),
        amounts: OrderAmounts.fromJson(json['amounts'] as Map<String, dynamic>? ?? {}),
        couponCode: json['couponCode']?.toString(),
        status: json['status']?.toString() ?? 'paid',
        createdAt: json['createdAt']?.toString() ?? '',
        updatedAt: json['updatedAt']?.toString() ?? '',
        dueAt: json['dueAt']?.toString(),
        releaseAt: json['releaseAt']?.toString(),
        delivery: json['delivery'] is Map<String, dynamic>
            ? OrderDelivery.fromJson(json['delivery'] as Map<String, dynamic>)
            : null,
        refund: json['refund'] is Map<String, dynamic>
            ? OrderRefund.fromJson(json['refund'] as Map<String, dynamic>)
            : null,
        revisionsUsed: (json['revisionsUsed'] as num?)?.toInt(),
        extension: json['extension'] is Map<String, dynamic>
            ? DeadlineExtension.fromJson(json['extension'] as Map<String, dynamic>)
            : null,
        events: (json['events'] as List?)
                ?.whereType<Map<String, dynamic>>()
                .map(OrderEvent.fromJson)
                .toList() ??
            [],
        messages: (json['messages'] as List?)
                ?.whereType<Map<String, dynamic>>()
                .map(OrderMessage.fromJson)
                .toList() ??
            [],
        chat: OrderChat.fromJson(json['chat'] as Map<String, dynamic>? ?? {}),
        sellerMeta: json['sellerMeta'] is Map<String, dynamic>
            ? SellerMeta.fromJson(json['sellerMeta'] as Map<String, dynamic>)
            : null,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'number': number,
        'listingId': listingId,
        'item': item.toJson(),
        'sellerId': sellerId,
        'buyerId': buyerId,
        'buyer': buyer.toJson(),
        if (invoice != null) 'invoice': invoice!.toJson(),
        'payment': payment.toJson(),
        if (brief != null) 'brief': brief!.map((b) => b.toJson()).toList(),
        'amounts': amounts.toJson(),
        if (couponCode != null) 'couponCode': couponCode,
        'status': status,
        'createdAt': createdAt,
        'updatedAt': updatedAt,
        if (dueAt != null) 'dueAt': dueAt,
        if (releaseAt != null) 'releaseAt': releaseAt,
        if (delivery != null) 'delivery': delivery!.toJson(),
        if (refund != null) 'refund': refund!.toJson(),
        if (revisionsUsed != null) 'revisionsUsed': revisionsUsed,
        if (extension != null) 'extension': extension!.toJson(),
        'events': events.map((e) => e.toJson()).toList(),
        'messages': messages.map((m) => m.toJson()).toList(),
        'chat': chat.toJson(),
        if (sellerMeta != null) 'sellerMeta': sellerMeta!.toJson(),
      };
}
