import '../../../core/api/api_client.dart';
import '../../../core/api/domain_error.dart';
import '../../../core/db/models/ticket.dart';
import '../domain/support_model.dart';

final supportApi = SupportApi.instance;

class SupportApi {
  static final SupportApi instance = SupportApi._();
  SupportApi._();

  Future<Ticket> openTicket(OpenTicketInput input) async {
    if (input.subject.trim().length < 4) {
      throw const DomainError('Donnez un objet à votre demande.');
    }
    if (input.body.trim().length < 10) {
      throw const DomainError('Décrivez votre problème en quelques mots.');
    }

    final res = await api.mutate(
      'POST',
      '/tickets',
      body: input.toJson(),
    );

    final rawTicket = res['ticket'] as Map<String, dynamic>? ?? {};
    return Ticket.fromJson(rawTicket);
  }

  Future<void> replyToTicket(String ticketId, String body) async {
    final trimmed = body.trim();
    if (trimmed.isEmpty) {
      throw const DomainError('Écrivez votre message.');
    }

    await api.mutate(
      'POST',
      '/tickets/${Uri.encodeComponent(ticketId)}/messages',
      body: {'body': trimmed},
    );
  }

  Future<void> resolveTicket(String ticketId) async {
    await api.mutate(
      'POST',
      '/tickets/${Uri.encodeComponent(ticketId)}/resolve',
    );
  }
}
