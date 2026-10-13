import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../features/shell/presentation/shell_screen.dart';
import '../../features/catalog/presentation/screens/home_screen.dart';
import '../../features/catalog/presentation/screens/search_screen.dart';
import '../../features/catalog/presentation/screens/listing_detail_screen.dart';
import '../../features/catalog/presentation/screens/store_screen.dart';
import '../../features/orders/presentation/screens/orders_screen.dart';
import '../../features/orders/presentation/screens/order_detail_screen.dart';
import '../../features/profile/presentation/screens/profile_screen.dart';
import '../../features/profile/presentation/screens/settings_screen.dart';
import '../../features/profile/presentation/screens/profile_settings_screen.dart';
import '../../features/profile/presentation/screens/store_settings_screen.dart';
import '../../features/session/presentation/screens/sign_in_screen.dart';
import '../../features/notifications/presentation/screens/notifications_screen.dart';
import '../../features/library/presentation/screens/favorites_screen.dart';
import '../../features/library/presentation/screens/following_screen.dart';
import '../../features/checkout/presentation/screens/checkout_screen.dart';
import '../../features/checkout/presentation/screens/payment_return_screen.dart';
import '../../features/orders/presentation/screens/messages_screen.dart';
import '../../features/orders/presentation/screens/order_chat_screen.dart';
import '../../features/dashboard/presentation/screens/dashboard_screen.dart';
import '../../features/dashboard/presentation/screens/sales_screen.dart';
import '../../features/dashboard/presentation/screens/seller_listings_screen.dart';
import '../../features/dashboard/presentation/screens/listing_editor_screen.dart';
import '../../features/dashboard/presentation/screens/payouts_screen.dart';
import '../../features/dashboard/presentation/screens/verification_screen.dart';
import '../../features/dashboard/presentation/screens/customers_screen.dart';
import '../../features/dashboard/presentation/screens/open_store_screen.dart';
import '../../features/dashboard/presentation/screens/lightpay_callback_screen.dart';
import '../../features/support/presentation/screens/support_screen.dart';
import '../../features/support/presentation/screens/new_ticket_screen.dart';
import '../../features/support/presentation/screens/ticket_detail_screen.dart';
import '../ui/screens/design_gallery_screen.dart';
import '../ui/expand_page.dart';
import '../../features/disputes/presentation/dispute_room_screen.dart';

final GlobalKey<NavigatorState> _rootNavigatorKey = GlobalKey<NavigatorState>();

CustomTransitionPage<T> smoothTransitionPage<T>({
  required LocalKey key,
  required Widget child,
}) {
  return CustomTransitionPage<T>(
    key: key,
    child: child,
    transitionDuration: const Duration(milliseconds: 280),
    reverseTransitionDuration: const Duration(milliseconds: 240),
    transitionsBuilder: (context, animation, secondaryAnimation, child) {
      final curved = CurvedAnimation(
        parent: animation,
        curve: Curves.easeOutCubic,
        reverseCurve: Curves.easeInCubic,
      );
      return SlideTransition(
        position: Tween<Offset>(
          begin: const Offset(0.08, 0.0),
          end: Offset.zero,
        ).animate(curved),
        child: FadeTransition(
          opacity: curved,
          child: child,
        ),
      );
    },
  );
}

final GoRouter router = GoRouter(
  navigatorKey: _rootNavigatorKey,
  initialLocation: '/',
  redirect: (context, state) {
    final path = state.uri.path;
    if (path.startsWith('/@') && path.length > 2) return '/boutique/${Uri.encodeComponent(path.substring(1))}';
    return null;
  },
  routes: [
    // Shell Route for bottom navigation
    StatefulShellRoute.indexedStack(
      builder: (context, state, navigationShell) {
        return ShellScreen(navigationShell: navigationShell);
      },
      branches: [
        // 0: Copes / Home
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: '/',
              builder: (context, state) => const HomeScreen(),
            ),
          ],
        ),
        // 1: Orders / Achats
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: '/orders',
              builder: (context, state) => const OrdersScreen(),
            ),
          ],
        ),
        // 2: Messages (orders' conversations and disputes)
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: '/messages',
              builder: (context, state) => const MessagesScreen(),
            ),
          ],
        ),
        // 3: Boutique (sellers only: the tab is hidden for the others)
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: '/boutique',
              builder: (context, state) => const DashboardScreen(inTab: true),
            ),
          ],
        ),
        // 4: Profile / Compte
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: '/profile',
              builder: (context, state) => const ProfileScreen(),
            ),
          ],
        ),
      ],
    ),

    // Full screen detail routes
    GoRoute(
      path: '/search',
      parentNavigatorKey: _rootNavigatorKey,
      pageBuilder: (context, state) => smoothTransitionPage(
        key: state.pageKey,
        child: const SearchScreen(),
      ),
    ),
    GoRoute(
      path: '/l/:id',
      parentNavigatorKey: _rootNavigatorKey,
      pageBuilder: (context, state) {
        final id = state.pathParameters['id'] ?? '';
        final heroTag = state.uri.queryParameters['hero'];
        return CustomTransitionPage(
          key: state.pageKey,
          child: ListingDetailScreen(listingId: id, heroTag: heroTag),
          transitionDuration: const Duration(milliseconds: 260),
          reverseTransitionDuration: const Duration(milliseconds: 300),
          transitionsBuilder: (context, animation, secondaryAnimation, child) {
            // Opening: no fade, the page is there at once and only the cover (a Hero) moves.
            // Going back: the page is gone within the first 55 % of the time, the cover flies home until the end.
            final curved = CurvedAnimation(
              parent: animation,
              curve: const Threshold(0.0),
              reverseCurve: const Interval(0.0, 0.55, curve: Curves.easeOut),
            );
            return FadeTransition(
              opacity: curved,
              child: child,
            );
          },
        );
      },
    ),
    GoRoute(
      path: '/boutique/:id',
      parentNavigatorKey: _rootNavigatorKey,
      pageBuilder: (context, state) {
        final id = state.pathParameters['id'] ?? '';
        return smoothTransitionPage(
          key: state.pageKey,
          child: StoreScreen(sellerId: id),
        );
      },
    ),
    GoRoute(
      path: '/s/:id',
      redirect: (context, state) => '/boutique/${state.pathParameters['id']}',
    ),

    // Auth screen
    GoRoute(
      path: '/connexion',
      parentNavigatorKey: _rootNavigatorKey,
      pageBuilder: (context, state) {
        final creer = state.uri.queryParameters['creer'] == '1';
        return smoothTransitionPage(
          key: state.pageKey,
          child: SignInScreen(initialSignUp: creer),
        );
      },
    ),

    // Account sub-screens
    GoRoute(
      path: '/compte/parametres',
      parentNavigatorKey: _rootNavigatorKey,
      pageBuilder: (context, state) => smoothTransitionPage(
        key: state.pageKey,
        child: const SettingsScreen(),
      ),
    ),
    GoRoute(
      path: '/compte/parametres/profil',
      parentNavigatorKey: _rootNavigatorKey,
      pageBuilder: (context, state) => smoothTransitionPage(key: state.pageKey, child: const ProfileSettingsScreen()),
    ),
    GoRoute(
      path: '/compte/parametres/boutique',
      parentNavigatorKey: _rootNavigatorKey,
      pageBuilder: (context, state) => smoothTransitionPage(key: state.pageKey, child: const StoreSettingsScreen()),
    ),
    GoRoute(
      path: '/compte/notifications',
      parentNavigatorKey: _rootNavigatorKey,
      pageBuilder: (context, state) => smoothTransitionPage(
        key: state.pageKey,
        child: const NotificationsScreen(),
      ),
    ),
    GoRoute(
      path: '/compte/favoris',
      parentNavigatorKey: _rootNavigatorKey,
      pageBuilder: (context, state) => smoothTransitionPage(
        key: state.pageKey,
        child: const FavoritesScreen(),
      ),
    ),
    GoRoute(
      path: '/compte/abonnements',
      parentNavigatorKey: _rootNavigatorKey,
      pageBuilder: (context, state) => smoothTransitionPage(
        key: state.pageKey,
        child: const FollowingScreen(),
      ),
    ),

    // Messaging & Chat
    GoRoute(
      path: '/compte/messages',
      redirect: (context, state) => '/messages',
    ),
    GoRoute(
      path: '/ac/messages',
      redirect: (context, state) => '/messages',
    ),
    GoRoute(
      path: '/litiges/:id',
      parentNavigatorKey: _rootNavigatorKey,
      pageBuilder: (context, state) => smoothTransitionPage(
        key: state.pageKey,
        child: DisputeRoomScreen(disputeId: state.pathParameters['id'] ?? ''),
      ),
    ),
    GoRoute(
      path: '/ac/litiges/:id',
      redirect: (context, state) => '/litiges/${state.pathParameters['id']}',
    ),
    GoRoute(
      path: '/dashboard/litiges/:id',
      redirect: (context, state) => '/litiges/${state.pathParameters['id']}',
    ),
    GoRoute(
      path: '/compte/messages/:id',
      parentNavigatorKey: _rootNavigatorKey,
      pageBuilder: (context, state) {
        final id = state.pathParameters['id'] ?? '';
        return smoothTransitionPage(
          key: state.pageKey,
          child: OrderChatScreen(orderId: id),
        );
      },
    ),
    GoRoute(
      path: '/orders/:id/messages',
      redirect: (context, state) => '/compte/messages/${state.pathParameters['id']}',
    ),
    GoRoute(
      path: '/orders/:id/chat',
      redirect: (context, state) => '/compte/messages/${state.pathParameters['id']}',
    ),

    // Checkout & Payment
    GoRoute(
      path: '/checkout/:id',
      parentNavigatorKey: _rootNavigatorKey,
      pageBuilder: (context, state) {
        final id = state.pathParameters['id'] ?? '';
        final from = state.extra;
        // From the buy button of an offer: the button bursts open into the checkout.
        if (from is Rect) {
          return expandFromRectPage(
            key: state.pageKey,
            from: from,
            child: CheckoutScreen(listingId: id),
          );
        }
        return smoothTransitionPage(
          key: state.pageKey,
          child: CheckoutScreen(listingId: id),
        );
      },
    ),
    GoRoute(
      path: '/compte/checkout/:id',
      redirect: (context, state) => '/checkout/${state.pathParameters['id']}',
    ),
    GoRoute(
      path: '/paiement/retour',
      parentNavigatorKey: _rootNavigatorKey,
      pageBuilder: (context, state) {
        final tentative = state.uri.queryParameters['tentative'] ?? '';
        final annule = state.uri.queryParameters['annule'] == '1';
        return smoothTransitionPage(
          key: state.pageKey,
          child: PaymentReturnScreen(
            attemptId: tentative,
            cancelled: annule,
          ),
        );
      },
    ),

    // Web URL aliases & redirects
    // Addresses of the web (notifications, shared links, App Links) land on the same screens in the app.
    GoRoute(
      path: '/ac/achats',
      redirect: (context, state) => '/orders',
    ),
    GoRoute(
      path: '/ac/achats/:id',
      redirect: (context, state) => '/orders/${state.pathParameters['id']}',
    ),
    GoRoute(
      path: '/ac/messages/:id',
      redirect: (context, state) => '/compte/messages/${state.pathParameters['id']}',
    ),
    GoRoute(
      path: '/dashboard/ventes/:id',
      redirect: (context, state) => '/orders/${state.pathParameters['id']}',
    ),
    GoRoute(
      path: '/ac/support',
      redirect: (context, state) => '/compte/support',
    ),
    GoRoute(
      path: '/ac/support/nouveau',
      redirect: (context, state) => '/compte/support/nouveau',
    ),
    GoRoute(
      path: '/ac/support/:id',
      redirect: (context, state) => '/compte/support/${state.pathParameters['id']}',
    ),
    GoRoute(
      path: '/ac/abonnements',
      redirect: (context, state) => '/compte/abonnements',
    ),
    GoRoute(
      path: '/ac/favoris',
      redirect: (context, state) => '/compte/favoris',
    ),
    GoRoute(
      path: '/ac/parametres',
      redirect: (context, state) => '/compte/parametres',
    ),
    GoRoute(
      path: '/ac/litiges',
      redirect: (context, state) => '/messages',
    ),
    GoRoute(
      path: '/dashboard/litiges',
      redirect: (context, state) => '/messages',
    ),
    GoRoute(
      path: '/ac/explorer',
      redirect: (context, state) => '/',
    ),
    GoRoute(
      path: '/ac/recherche',
      redirect: (context, state) => '/search',
    ),
    GoRoute(
      path: '/ac',
      redirect: (context, state) => '/',
    ),
    GoRoute(
      path: '/ac/p/:id',
      redirect: (context, state) => '/l/${state.pathParameters['id']}',
    ),
    GoRoute(
      path: '/p/:id',
      redirect: (context, state) => '/l/${state.pathParameters['id']}',
    ),
    GoRoute(
      path: '/ac/s/:id',
      redirect: (context, state) => '/boutique/${state.pathParameters['id']}',
    ),
    GoRoute(
      path: '/ac/boutique',
      redirect: (context, state) => '/vendre',
    ),
    GoRoute(
      path: '/produit/:id',
      redirect: (context, state) => '/l/${state.pathParameters['id']}',
    ),
    GoRoute(
      path: '/recherche',
      redirect: (context, state) => '/search',
    ),
    GoRoute(
      path: '/compte/achats',
      redirect: (context, state) => '/orders',
    ),
    GoRoute(
      path: '/orders/:id',
      parentNavigatorKey: _rootNavigatorKey,
      pageBuilder: (context, state) {
        final id = state.pathParameters['id'] ?? '';
        return smoothTransitionPage(
          key: state.pageKey,
          child: OrderDetailScreen(orderId: id),
        );
      },
    ),
    GoRoute(
      path: '/compte/achats/:id',
      redirect: (context, state) => '/orders/${state.pathParameters['id']}',
    ),

    // Design Gallery
    GoRoute(
      path: '/gallery',
      parentNavigatorKey: _rootNavigatorKey,
      builder: (context, state) => const DesignGalleryScreen(),
    ),

    // Support
    GoRoute(
      path: '/compte/support',
      parentNavigatorKey: _rootNavigatorKey,
      builder: (context, state) => const SupportScreen(),
    ),
    GoRoute(
      path: '/compte/support/nouveau',
      parentNavigatorKey: _rootNavigatorKey,
      builder: (context, state) {
        final ref = state.uri.queryParameters['ref'];
        final sujet = state.uri.queryParameters['sujet'];
        return NewTicketScreen(
          initialRef: ref,
          initialTopic: sujet,
        );
      },
    ),
    GoRoute(
      path: '/compte/support/:id',
      parentNavigatorKey: _rootNavigatorKey,
      builder: (context, state) {
        final id = state.pathParameters['id'] ?? '';
        return TicketDetailScreen(ticketId: id);
      },
    ),

    // Seller Dashboard & Back-Office
    GoRoute(
      path: '/dashboard',
      parentNavigatorKey: _rootNavigatorKey,
      builder: (context, state) => const DashboardScreen(),
    ),
    GoRoute(
      path: '/dashboard/ventes',
      parentNavigatorKey: _rootNavigatorKey,
      builder: (context, state) => const SalesScreen(),
    ),
    GoRoute(
      path: '/dashboard/offres',
      parentNavigatorKey: _rootNavigatorKey,
      builder: (context, state) => const SellerListingsScreen(),
    ),
    GoRoute(
      path: '/dashboard/offres/nouvelle',
      parentNavigatorKey: _rootNavigatorKey,
      builder: (context, state) => const ListingEditorScreen(),
    ),
    GoRoute(
      path: '/dashboard/offres/:id',
      parentNavigatorKey: _rootNavigatorKey,
      builder: (context, state) {
        final id = state.pathParameters['id'];
        return ListingEditorScreen(listingId: id);
      },
    ),
    GoRoute(
      path: '/dashboard/paiements',
      parentNavigatorKey: _rootNavigatorKey,
      builder: (context, state) => const PayoutsScreen(),
    ),
    GoRoute(
      path: '/dashboard/verification',
      parentNavigatorKey: _rootNavigatorKey,
      builder: (context, state) => const VerificationScreen(),
    ),
    GoRoute(
      path: '/dashboard/clients',
      parentNavigatorKey: _rootNavigatorKey,
      builder: (context, state) => const CustomersScreen(),
    ),
    GoRoute(
      path: '/vendre',
      parentNavigatorKey: _rootNavigatorKey,
      builder: (context, state) => const OpenStoreScreen(),
    ),
    GoRoute(
      path: '/compte/boutique',
      parentNavigatorKey: _rootNavigatorKey,
      builder: (context, state) => const OpenStoreScreen(),
    ),
    GoRoute(
      path: '/lightpay/callback',
      parentNavigatorKey: _rootNavigatorKey,
      builder: (context, state) => LightPayCallbackScreen(
        queryParams: state.uri.queryParameters,
      ),
    ),

    // Dashboard Aliases
    GoRoute(
      path: '/compte/ventes',
      redirect: (context, state) => '/dashboard/ventes',
    ),
    GoRoute(
      path: '/compte/ventes/:id',
      redirect: (context, state) => '/orders/${state.pathParameters['id']}',
    ),
    GoRoute(
      path: '/compte/offres',
      redirect: (context, state) => '/dashboard/offres',
    ),
    GoRoute(
      path: '/compte/paiements',
      redirect: (context, state) => '/dashboard/paiements',
    ),
    GoRoute(
      path: '/compte/verification',
      redirect: (context, state) => '/dashboard/verification',
    ),
    GoRoute(
      path: '/compte/clients',
      redirect: (context, state) => '/dashboard/clients',
    ),
  ],
);
