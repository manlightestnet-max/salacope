import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/date_symbol_data_local.dart';

import 'core/design/theme.dart';
import 'core/design/theme_provider.dart';
import 'core/routing/router.dart';
import 'core/db/local_database.dart';
import 'core/db/store.dart';
import 'core/api/auth.dart';
import 'core/api/guest.dart';
import 'core/api/sync.dart';
import 'features/catalog/domain/ranking.dart';
import 'core/push/push_service.dart';
import 'core/routing/links.dart';
import 'core/design/phone_text.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initializeDateFormatting('fr_FR', null);

  // Performance tuning: limit RAM consumption to eliminate GC stutter during scrolling
  PaintingBinding.instance.imageCache.maximumSize = 100;
  PaintingBinding.instance.imageCache.maximumSizeBytes = 40 * 1024 * 1024; // 40 MB

  // Instant offline restore: warm up SQLite cache and session before first frame
  try {
    await localDb.init();
    final cached = localDb.loadDatabase();
    if (cached != null) {
      db.load(cached, persist: false);
    }
    await auth.init();
    await guest.init();
    await initRanking();
  } catch (e) {
    debugPrint('[Main] Offline restore error: $e');
  }

  // Clean error handling matching release mode (no red screen or yellow warning bars on screen)
  ErrorWidget.builder = (FlutterErrorDetails details) {
    return const SizedBox.shrink();
  };

  // Started by a tap on a notification: that screen opens once the app is up.
  String? fromPush;
  try {
    fromPush = await push.init();
  } catch (e) {
    debugPrint('[Main] Push init error: $e');
  }
  // A tap on a notification opens its screen on top of the current one (or its tab).
  push.onOpen = links.open;

  runApp(const ProviderScope(child: SalacopeApp()));
  if (fromPush != null && fromPush != '/') {
    final route = fromPush;
    WidgetsBinding.instance.addPostFrameCallback((_) => links.open(route));
  }
  // Addresses of the site (App Links, the return from LightPay) open on top of the current screen.
  links.attach(router).ignore();
  // Every screen finds its data: the saved copy is on screen already, the server is asked in the background.
  sync.boot().ignore();
}

class SalacopeApp extends ConsumerWidget {
  const SalacopeApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(themeModeProvider);

    return MaterialApp.router(
      title: 'Salacope',
      debugShowCheckedModeBanner: false,
      theme: SalacopeTheme.lightTheme,
      darkTheme: SalacopeTheme.darkTheme,
      themeMode: themeMode,
      routerConfig: router,
      // Text sizes for a phone, the same policy as LightPay (see PhoneTextScaler).
      builder: (context, child) {
        final media = MediaQuery.of(context);
        return MediaQuery(
          data: media.copyWith(textScaler: PhoneTextScaler(media.textScaler)),
          child: child ?? const SizedBox.shrink(),
        );
      },
    );
  }
}
