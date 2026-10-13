import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../design/colors.dart';
import '../design/typography.dart';

class UpdatedAt extends StatelessWidget {
  final DateTime? at;
  final String prefix;

  const UpdatedAt({
    super.key,
    this.at,
    this.prefix = 'Données à jour',
  });

  @override
  Widget build(BuildContext context) {
    if (at == null) return const SizedBox.shrink();

    final c = context.colors;
    final now = DateTime.now();
    final isToday = now.year == at!.year && now.month == at!.month && now.day == at!.day;
    String timeStr;
    String dateStr;
    try {
      timeStr = DateFormat('HH:mm', 'fr_FR').format(at!);
      dateStr = DateFormat('d MMM', 'fr_FR').format(at!);
    } catch (_) {
      timeStr = '${at!.hour.toString().padLeft(2, '0')}:${at!.minute.toString().padLeft(2, '0')}';
      dateStr = '${at!.day}/${at!.month}';
    }

    final text = isToday
        ? '$prefix à $timeStr'
        : '$prefix au $dateStr, $timeStr';

    return Text(
      text,
      style: SalacopeTypography.small.copyWith(
        color: c.gray500,
      ),
    );
  }
}
