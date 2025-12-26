import 'user.dart';

/// Login response from backend
class LoginResponse {
  final String accessToken;
  final String refreshToken;
  final String tokenType;
  final User user;

  LoginResponse({
    required this.accessToken,
    required this.refreshToken,
    required this.tokenType,
    required this.user,
  });

  factory LoginResponse.fromJson(Map<String, dynamic> json) {
    return LoginResponse(
      accessToken: json['access_token'] as String,
      refreshToken: json['refresh_token'] as String,
      tokenType: json['token_type'] as String,
      user: User.fromJson(json['user'] as Map<String, dynamic>),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'access_token': accessToken,
      'refresh_token': refreshToken,
      'token_type': tokenType,
      'user': user.toJson(),
    };
  }
}

/// Refresh token response
class RefreshResponse {
  final String accessToken;
  final String tokenType;

  RefreshResponse({
    required this.accessToken,
    required this.tokenType,
  });

  factory RefreshResponse.fromJson(Map<String, dynamic> json) {
    return RefreshResponse(
      accessToken: json['access_token'] as String,
      tokenType: json['token_type'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'access_token': accessToken,
      'token_type': tokenType,
    };
  }
}

/// Login request
class LoginRequest {
  final String username;
  final String password;

  LoginRequest({
    required this.username,
    required this.password,
  });

  Map<String, dynamic> toJson() {
    return {
      'username': username,
      'password': password,
    };
  }
}


