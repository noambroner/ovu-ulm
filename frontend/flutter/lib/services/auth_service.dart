import 'package:dio/dio.dart';
import '../config/api_config.dart';
import '../models/auth_response.dart';
import '../models/user.dart';
import 'secure_storage_service.dart';

/// Authentication service for managing API calls
class AuthService {
  static final AuthService _instance = AuthService._internal();
  factory AuthService() => _instance;
  AuthService._internal();

  final Dio _dio = Dio(
    BaseOptions(
      baseUrl: ApiConfig.baseUrl,
      connectTimeout: ApiConfig.connectTimeout,
      receiveTimeout: ApiConfig.receiveTimeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ),
  );

  final SecureStorageService _storage = SecureStorageService();

  /// Initialize Dio with interceptors
  void initialize() {
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          // Add access token to all requests (except auth endpoints)
          if (!options.path.contains('/auth/login') &&
              !options.path.contains('/auth/refresh')) {
            final accessToken = await _storage.getAccessToken();
            if (accessToken != null) {
              options.headers['Authorization'] = '${ApiConfig.tokenType} $accessToken';
            }
          }
          return handler.next(options);
        },
        onError: (error, handler) async {
          // Handle 401 errors - try to refresh token
          if (error.response?.statusCode == 401) {
            try {
              // Try to refresh token
              final refreshed = await _refreshToken();
              if (refreshed) {
                // Retry the original request
                final options = error.requestOptions;
                final accessToken = await _storage.getAccessToken();
                options.headers['Authorization'] = '${ApiConfig.tokenType} $accessToken';

                final response = await _dio.fetch(options);
                return handler.resolve(response);
              }
            } catch (e) {
              // Refresh failed, logout user
              await logout();
            }
          }
          return handler.next(error);
        },
      ),
    );
  }

  /// Login with username and password
  Future<LoginResponse> login(String username, String password) async {
    try {
      final request = LoginRequest(username: username, password: password);

      final response = await _dio.post(
        ApiConfig.authLogin,
        data: request.toJson(),
      );

      if (response.statusCode == 200) {
        final loginResponse = LoginResponse.fromJson(response.data);

        // Save tokens and user data
        await _storage.saveAccessToken(loginResponse.accessToken);
        await _storage.saveRefreshToken(loginResponse.refreshToken);
        await _storage.saveUser(loginResponse.user);

        return loginResponse;
      } else {
        throw DioException(
          requestOptions: response.requestOptions,
          response: response,
          type: DioExceptionType.badResponse,
          error: 'Login failed',
        );
      }
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) {
        throw AuthException('Incorrect username or password');
      } else if (e.type == DioExceptionType.connectionTimeout ||
          e.type == DioExceptionType.receiveTimeout) {
        throw AuthException('Connection timeout. Please check your internet connection.');
      } else if (e.type == DioExceptionType.connectionError) {
        throw AuthException('Cannot connect to server. Please try again later.');
      } else {
        throw AuthException(e.response?.data['detail'] ?? 'Login failed. Please try again.');
      }
    } catch (e) {
      throw AuthException('An unexpected error occurred: $e');
    }
  }

  /// Refresh access token using refresh token
  Future<bool> _refreshToken() async {
    try {
      final refreshToken = await _storage.getRefreshToken();
      if (refreshToken == null) return false;

      final response = await _dio.post(
        ApiConfig.authRefresh,
        data: {'refresh_token': refreshToken},
      );

      if (response.statusCode == 200) {
        final refreshResponse = RefreshResponse.fromJson(response.data);
        await _storage.saveAccessToken(refreshResponse.accessToken);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  /// Get current user from backend
  Future<User> getCurrentUser() async {
    try {
      final response = await _dio.get(ApiConfig.authMe);

      if (response.statusCode == 200) {
        final user = User.fromJson(response.data);
        await _storage.saveUser(user);
        return user;
      } else {
        throw AuthException('Failed to get user information');
      }
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) {
        throw AuthException('Session expired. Please login again.');
      } else {
        throw AuthException('Failed to get user information');
      }
    }
  }

  /// Logout - revoke refresh token
  Future<void> logout({String? refreshToken}) async {
    try {
      final token = refreshToken ?? await _storage.getRefreshToken();

      if (token != null) {
        await _dio.post(
          ApiConfig.authLogout,
          queryParameters: {'refresh_token': token},
        );
      }
    } catch (e) {
      // Ignore logout errors - clear local data anyway
    } finally {
      // Always clear local storage
      await _storage.clearAll();
    }
  }

  /// Logout from all devices
  Future<void> logoutAllDevices() async {
    try {
      await _dio.post(ApiConfig.authLogout);
    } catch (e) {
      // Ignore logout errors
    } finally {
      await _storage.clearAll();
    }
  }

  /// Check if user is logged in
  Future<bool> isLoggedIn() async {
    return await _storage.isLoggedIn();
  }

  /// Get cached user from storage
  Future<User?> getCachedUser() async {
    return await _storage.getUser();
  }
}

/// Custom exception for authentication errors
class AuthException implements Exception {
  final String message;
  AuthException(this.message);

  @override
  String toString() => message;
}


