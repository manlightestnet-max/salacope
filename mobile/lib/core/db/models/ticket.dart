enum TicketTopic {
  payment,
  order,
  account,
  other;

  static TicketTopic fromString(String val) {
    return TicketTopic.values.firstWhere(
      (e) => e.name == val,
      orElse: () => TicketTopic.other,
    );
  }
}

enum TicketStatus {
  open,
  answered,
  resolved;

  static TicketStatus fromString(String val) {
    return TicketStatus.values.firstWhere(
      (e) => e.name == val,
      orElse: () => TicketStatus.open,
    );
  }
}

class TicketMessage {
  final String id;
  final String? authorId;
  final String body;
  final String at;

  const TicketMessage({
    required this.id,
    this.authorId,
    required this.body,
    required this.at,
  });

  factory TicketMessage.fromJson(Map<String, dynamic> json) {
    return TicketMessage(
      id: json['id'] as String? ?? '',
      authorId: json['authorId'] as String?,
      body: json['body'] as String? ?? '',
      at: json['at'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'authorId': authorId,
    'body': body,
    'at': at,
  };
}

class Ticket {
  final String id;
  final String number;
  final String userId;
  final TicketTopic topic;
  final String subject;
  final String? reference;
  final TicketStatus status;
  final List<TicketMessage> messages;
  final String createdAt;
  final String updatedAt;

  const Ticket({
    required this.id,
    required this.number,
    required this.userId,
    required this.topic,
    required this.subject,
    this.reference,
    required this.status,
    required this.messages,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Ticket.fromJson(Map<String, dynamic> json) {
    return Ticket(
      id: json['id'] as String? ?? '',
      number: json['number'] as String? ?? '',
      userId: json['userId'] as String? ?? '',
      topic: TicketTopic.fromString(json['topic'] as String? ?? ''),
      subject: json['subject'] as String? ?? '',
      reference: json['reference'] as String?,
      status: TicketStatus.fromString(json['status'] as String? ?? ''),
      messages: (json['messages'] as List<dynamic>? ?? [])
          .map((m) => TicketMessage.fromJson(m as Map<String, dynamic>))
          .toList(),
      createdAt: json['createdAt'] as String? ?? '',
      updatedAt: json['updatedAt'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'number': number,
    'userId': userId,
    'topic': topic.name,
    'subject': subject,
    if (reference != null) 'reference': reference,
    'status': status.name,
    'messages': messages.map((m) => m.toJson()).toList(),
    'createdAt': createdAt,
    'updatedAt': updatedAt,
  };
}
