import { TicketStatus, TicketTopic } from '@/shared/db';
import { Tone } from '@/shared/ui';

export const TICKET_TOPICS: { value: TicketTopic; label: string }[] = [
  { value: 'payment', label: 'Paiement' },
  { value: 'order', label: 'Commande' },
  { value: 'account', label: 'Compte' },
  { value: 'other', label: 'Autre' },
];

export const topicLabel = (topic: TicketTopic) => TICKET_TOPICS.find((t) => t.value === topic)?.label ?? topic;

export const TICKET_STATUS: Record<TicketStatus, { label: string; tone: Tone }> = {
  open: { label: 'En attente du support', tone: 'warning' },
  answered: { label: 'Réponse reçue', tone: 'brand' },
  resolved: { label: 'Résolu', tone: 'neutral' },
};

/** Support answers within this many hours (shown in automatic replies). */
export const SUPPORT_DELAY_HOURS = 24;
