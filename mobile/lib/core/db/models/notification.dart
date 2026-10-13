class Notification {
  final String id;
  final String userId;
  final String title;
  final String? body;
  final String href;
  final bool read;
  final String createdAt;

  const Notification({
    required this.id,
    required this.userId,
    required this.title,
    this.body,
    required this.href,
    required this.read,
    required this.createdAt,
  });

  factory Notification.fromJson(Map<String, dynamic> json) {
    return Notification(
      id: json['id'] as String? ?? '',
      userId: json['userId'] as String? ?? '',
      title: json['title'] as String? ?? '',
      body: json['body'] as String?,
      href: json['href'] as String? ?? '',
      read: json['read'] as bool? ?? false,
      createdAt: json['createdAt'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'userId': userId,
    'title': title,
    if (body != null) 'body': body,
    'href': href,
    'read': read,
    'createdAt': createdAt,
  };

  Notification copyWith({
    String? id,
    String? userId,
    String? title,
    String? body,
    String? href,
    bool? read,
    String? createdAt,
  }) {
    return Notification(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      title: title ?? this.title,
      body: body ?? this.body,
      href: href ?? this.href,
      read: read ?? this.read,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}
