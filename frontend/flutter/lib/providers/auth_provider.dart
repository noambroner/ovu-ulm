import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/user.dart';
import '../services/auth_service.dart';

/// Authentication state
class AuthState {
  final User? user;
  final bool isLoading;
  final String? error;
  final bool isAuthenticated;

  AuthState({
    this.user,
    this.isLoading = false,
    this.error,
    this.isAuthenticated = false,
  });

  AuthState copyWith({
    User? user,
    bool? isLoading,
    String? error,
    bool? isAuthenticated,
  }) {
    return AuthState(
      user: user ?? this.user,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
    );
  }

  AuthState clearError() {
    return AuthState(
      user: user,
      isLoading: isLoading,
      error: null,
      isAuthenticated: isAuthenticated,
    );
  }
}

/// Auth state notifier
class AuthNotifier extends StateNotifier<AuthState> {
  final AuthService _authService;

  AuthNotifier(this._authService) : super(AuthState()) {
    _checkAuthStatus();
  }

  /// Check authentication status on app start
  Future<void> _checkAuthStatus() async {
    try {
      final isLoggedIn = await _authService.isLoggedIn();
      if (isLoggedIn) {
        // Try to get current user from backend
        try {
          final user = await _authService.getCurrentUser();
          state = AuthState(
            user: user,
            isAuthenticated: true,
            isLoading: false,
          );
        } catch (e) {
          // If failed to get user, try cached user
          final cachedUser = await _authService.getCachedUser();
          if (cachedUser != null) {
            state = AuthState(
              user: cachedUser,
              isAuthenticated: true,
              isLoading: false,
            );
          } else {
            // No cached user, logout
            await logout();
          }
        }
      }
    } catch (e) {
      state = AuthState(isLoading: false);
    }
  }

  /// Login with username and password
  Future<bool> login(String username, String password) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final response = await _authService.login(username, password);

      state = AuthState(
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      );

      return true;
    } on AuthException catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.message,
      );
      return false;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'An unexpected error occurred',
      );
      return false;
    }
  }

  /// Logout
  Future<void> logout() async {
    state = state.copyWith(isLoading: true);

    try {
      await _authService.logout();
    } catch (e) {
      // Ignore errors, clear state anyway
    }

    state = AuthState(isLoading: false);
  }

  /// Logout from all devices
  Future<void> logoutAllDevices() async {
    state = state.copyWith(isLoading: true);

    try {
      await _authService.logoutAllDevices();
    } catch (e) {
      // Ignore errors
    }

    state = AuthState(isLoading: false);
  }

  /// Refresh user data
  Future<void> refreshUser() async {
    try {
      final user = await _authService.getCurrentUser();
      state = state.copyWith(user: user);
    } catch (e) {
      // Ignore refresh errors
    }
  }

  /// Clear error message
  void clearError() {
    state = state.clearError();
  }
}

/// Auth provider - main provider for authentication state
final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  final authService = AuthService();
  authService.initialize();
  return AuthNotifier(authService);
});

/// Helper provider - check if user is authenticated
final isAuthenticatedProvider = Provider<bool>((ref) {
  return ref.watch(authProvider).isAuthenticated;
});

/// Helper provider - get current user
final currentUserProvider = Provider<User?>((ref) {
  return ref.watch(authProvider).user;
});

/// Helper provider - check if loading
final isAuthLoadingProvider = Provider<bool>((ref) {
  return ref.watch(authProvider).isLoading;
});

/// Helper provider - get error message
final authErrorProvider = Provider<String?>((ref) {
  return ref.watch(authProvider).error;
});


