class DomainError implements Exception {
  final String message;
  final int? status;

  const DomainError(this.message, [this.status]);

  @override
  String toString() => message;
}
