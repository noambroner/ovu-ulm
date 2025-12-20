/// API Configuration for ULM Backend
class ApiConfig {
  // Base URL - Production Backend Server
  static const String baseUrl = 'http://64.176.171.223:8001';

  // API Endpoints
  static const String authLogin = '/api/v1/auth/login';
  static const String authRefresh = '/api/v1/auth/refresh';
  static const String authLogout = '/api/v1/auth/logout';
  static const String authMe = '/api/v1/auth/me';

  // Timeout settings
  static const Duration connectTimeout = Duration(seconds: 30);
  static const Duration receiveTimeout = Duration(seconds: 30);

  // Storage keys
  static const String accessTokenKey = 'access_token';
  static const String refreshTokenKey = 'refresh_token';
  static const String userDataKey = 'user_data';

  // Token settings
  static const String tokenType = 'Bearer';
}


