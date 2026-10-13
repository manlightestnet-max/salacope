import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../../core/design/theme.dart';
import '../../domain/chat.dart';

class MessageTicks extends StatelessWidget {
  final MessageStatus status;

  const MessageTicks({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;

    switch (status) {
      case MessageStatus.sent:
        return Icon(
          LucideIcons.check,
          size: 13,
          color: colors.textMuted,
        );
      case MessageStatus.received:
        return Icon(
          LucideIcons.checkCheck,
          size: 13,
          color: colors.textMuted,
        );
      case MessageStatus.read:
        return Icon(
          LucideIcons.checkCheck,
          size: 13,
          color: colors.accent,
        );
    }
  }
}
