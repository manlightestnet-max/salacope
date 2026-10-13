abstract final class Env {
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://salacope.online/api',
  );

  static const String publicUrl = String.fromEnvironment(
    'PUBLIC_URL',
    defaultValue: 'https://salacope.online',
  );

  static const String firebaseApiKey = String.fromEnvironment(
    'FIREBASE_API_KEY',
    defaultValue: 'AIzaSyAyOdD8qSUfx8wvHhb5F4EJ4zKjavwnpeI',
  );

  /// OAuth client "Web" of the Firebase project lightpay-a5f01 (same as LightPay): Google gives an identity token for it,
  /// which Firebase exchanges for the Salacope/LightPay account. The app's SHA-1 must be registered in Firebase.
  static const String googleServerClientId = String.fromEnvironment(
    'GOOGLE_SERVER_CLIENT_ID',
    defaultValue: '771621885931-l11snfe03jslit84rrdmb3dbnnhmuv6f.apps.googleusercontent.com',
  );
}
