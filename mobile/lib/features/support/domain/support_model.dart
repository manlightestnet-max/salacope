import '../../../core/db/models/ticket.dart';
import '../../../core/ui/s_badge.dart';

class TicketTopicOption {
  final TicketTopic topic;
  final String label;
  const TicketTopicOption(this.topic, this.label);
}

const List<TicketTopicOption> ticketTopics = [
  TicketTopicOption(TicketTopic.payment, 'Paiement'),
  TicketTopicOption(TicketTopic.order, 'Commande'),
  TicketTopicOption(TicketTopic.account, 'Compte'),
  TicketTopicOption(TicketTopic.other, 'Autre'),
];

String topicLabel(TicketTopic topic) {
  for (final t in ticketTopics) {
    if (t.topic == topic) return t.label;
  }
  return topic.name;
}

class TicketStatusConfig {
  final String label;
  final SBadgeTone tone;
  const TicketStatusConfig(this.label, this.tone);
}

TicketStatusConfig ticketStatusConfig(TicketStatus status) {
  switch (status) {
    case TicketStatus.open:
      return const TicketStatusConfig('En attente du support', SBadgeTone.warning);
    case TicketStatus.answered:
      return const TicketStatusConfig('Réponse reçue', SBadgeTone.brand);
    case TicketStatus.resolved:
      return const TicketStatusConfig('Résolu', SBadgeTone.neutral);
  }
}

const int supportDelayHours = 24;

class OpenTicketInput {
  final TicketTopic topic;
  final String subject;
  final String body;
  final String? reference;

  const OpenTicketInput({
    required this.topic,
    required this.subject,
    required this.body,
    this.reference,
  });

  Map<String, dynamic> toJson() => {
    'topic': topic.name,
    'subject': subject,
    'body': body,
    if (reference != null && reference!.trim().isNotEmpty) 'reference': reference!.trim().toUpperCase(),
  };
}
