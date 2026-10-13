import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:salacope/main.dart';

void main() {
  testWidgets('SalacopeApp smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const ProviderScope(child: SalacopeApp()));
    expect(find.text('Salacope'), findsWidgets);
    expect(find.text('Solde disponible'), findsOneWidget);
  });
}
