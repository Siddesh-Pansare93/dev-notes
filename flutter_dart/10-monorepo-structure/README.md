# Monorepo Structure — Organizing Multi-Package Projects, Shared Code

Socho ek second ke liye — jab tum Zomato app chalate ho, toh backend mein kya hota hai? 🤔 Ek massive codebase hota hai jo:
- Authentication system
- Restaurant listings  
- Cart management
- Order tracking
- Payment processing
- Push notifications

Ab agar tum yeh sab ek single `main.dart` file mein likho toh code ekdum chaotic ho jayega. Real-world apps mein **monorepo pattern** use hota hai — ek repo mein multiple packages (libraries/modules), jahan har package ka apna responsibility hota hai.

Dart & Flutter mein monorepo structure setup karna thoda different hai JavaScript monorepos (Yarn workspaces, Nx) se. Let's explore kaise properly organize karte hain.

---

## What is a Monorepo? (Concept)

Monorepo = "**Mono** Repository" = ek single Git repo, lekin multiple Dart packages inside.

### Monorepo vs. Multiple Repos

```
❌ Multiple Repos Approach:
  repo-auth/
  repo-ui/
  repo-networking/
  repo-app/
  (4 alag repos, 4 alag git histories, dependencies management nightmare)

✅ Monorepo Approach:
  my_zomato_app/
    ├── packages/
    │   ├── core/              # shared utilities, models, constants
    │   ├── ui_components/     # shared widgets, themes
    │   ├── networking/        # API client, network layer
    │   ├── storage/           # local database, preferences
    │   ├── feature_auth/      # login/signup logic
    │   ├── feature_restaurants/
    │   ├── feature_cart/
    │   └── feature_orders/
    ├── apps/
    │   ├── customer_app/      # main Zomato app
    │   └── delivery_app/      # Zomato delivery partner app
    ├── pubspec.yaml           # workspace root
    └── pubspec.lock           # unified lock file
```

### Kab Use Karte Hain?

- **Large teams** — jaha multiple teams different features par kaam kar rahe hain
- **Multiple apps** — same codebase se multiple apps (customer + partner apps jaise Zomato)
- **Shared code** — UI components, networking, authentication — reuse karna ho
- **Consistent versioning** — sab packages same dependency versions use kare

---

## Monorepo Structure in Dart/Flutter

Dart mein koi built-in workspace tool nahi hai (like npm workspaces ya yarn). Lekin `pubspec.yaml` path dependencies se monorepo handle kar sakte hain.

### Directory Layout

```
zomato_monorepo/
│
├── packages/
│   │
│   ├── core/
│   │   ├── lib/
│   │   │   ├── models/
│   │   │   │   ├── restaurant.dart
│   │   │   │   ├── order.dart
│   │   │   │   └── user.dart
│   │   │   ├── constants/
│   │   │   │   └── app_config.dart
│   │   │   └── extensions/
│   │   │       └── string_extensions.dart
│   │   └── pubspec.yaml
│   │
│   ├── ui_components/
│   │   ├── lib/
│   │   │   ├── widgets/
│   │   │   │   ├── app_button.dart
│   │   │   │   ├── app_card.dart
│   │   │   │   └── app_theme.dart
│   │   │   └── theme/
│   │   │       └── app_colors.dart
│   │   └── pubspec.yaml
│   │
│   ├── networking/
│   │   ├── lib/
│   │   │   ├── api_client.dart
│   │   │   ├── interceptors.dart
│   │   │   └── endpoints.dart
│   │   └── pubspec.yaml
│   │
│   ├── feature_auth/
│   │   ├── lib/
│   │   │   ├── screens/
│   │   │   ├── services/
│   │   │   └── providers/
│   │   └── pubspec.yaml
│   │
│   ├── feature_restaurants/
│   │   ├── lib/
│   │   │   ├── screens/
│   │   │   ├── models/
│   │   │   └── providers/
│   │   └── pubspec.yaml
│   │
│   └── feature_cart/
│       ├── lib/
│       │   ├── screens/
│       │   └── providers/
│       └── pubspec.yaml
│
├── apps/
│   │
│   ├── customer_app/
│   │   ├── lib/
│   │   │   ├── main.dart
│   │   │   ├── app.dart
│   │   │   └── routes/
│   │   ├── pubspec.yaml
│   │   └── android/
│   │
│   └── delivery_app/
│       ├── lib/
│       ├── pubspec.yaml
│       └── ...
│
├── pubspec.yaml          # Optional: root pubspec
└── pubspec.lock          # Shared lock file
```

### Key Principles

1. **Layering** — dependenc(ies go **up**, never down:
   ```
   feature_cart → networking → core → (no deps down)
   feature_restaurants → ui_components → core
   customer_app → feature_cart, feature_auth, etc.
   ```

2. **No Circular Dependencies** — agar `core` depend karta hai `feature_auth` par toh bug invite kar rahe ho

3. **Clear Boundaries** — har package ka ek specific responsibility

---

## Setting Up Path Dependencies in pubspec.yaml

Ek monorepo mein packages ko reference karne ke liye `path:` dependency use hote hain.

### Example: customer_app

File: `apps/customer_app/pubspec.yaml`

```yaml
name: customer_app
description: Zomato customer facing app
publish_to: 'none'

environment:
  sdk: '>=3.0.0 <4.0.0'
  flutter: '>=3.0.0'

dependencies:
  flutter:
    sdk: flutter

  # Path dependencies ke packages from monorepo
  core:
    path: ../../packages/core
  ui_components:
    path: ../../packages/ui_components
  networking:
    path: ../../packages/networking
  feature_auth:
    path: ../../packages/feature_auth
  feature_restaurants:
    path: ../../packages/feature_restaurants
  feature_cart:
    path: ../../packages/feature_cart

  # Regular pub.dev dependencies
  riverpod: ^2.4.0
  riverpod_generator: ^2.3.0

dev_dependencies:
  flutter_test:
    sdk: flutter
  build_runner: ^2.4.0
```

### Example: feature_restaurants package

File: `packages/feature_restaurants/pubspec.yaml`

```yaml
name: feature_restaurants
description: Restaurant discovery & details feature
publish_to: 'none'

environment:
  sdk: '>=3.0.0 <4.0.0'
  flutter: '>=3.0.0'

dependencies:
  flutter:
    sdk: flutter

  # Dependencies on other monorepo packages
  core:
    path: ../core
  ui_components:
    path: ../ui_components
  networking:
    path: ../networking

  # External dependencies
  riverpod: ^2.4.0
  go_router: ^13.0.0
```

> [!important]
> **Path dependencies mein relative paths use hote hain** — `../` se navigate karte hain monorepo structure mein

---

## Core Package — Shared Utilities & Models

Core package sab kuch ka backbone hota hai. Yahan models, constants, extensions, validators — sab shared code rakha jata hai.

### Structure

```
packages/core/lib/
├── models/
│   ├── restaurant.dart
│   ├── order.dart
│   ├── user.dart
│   └── delivery_address.dart
├── constants/
│   ├── app_config.dart
│   ├── strings.dart
│   └── duration_constants.dart
├── extensions/
│   ├── string_extensions.dart
│   ├── datetime_extensions.dart
│   └── list_extensions.dart
├── enums/
│   ├── order_status.dart
│   └── restaurant_cuisine.dart
└── exceptions/
    ├── app_exception.dart
    └── network_exception.dart
```

### Example: Core Models

File: `packages/core/lib/models/restaurant.dart`

```dart
import 'package:flutter/foundation.dart';

/// Restaurant model shared across entire app
/// 
/// Yeh model feature_restaurants, feature_cart, dono jaga use hota hai
@immutable
class Restaurant {
  final String id;
  final String name;
  final double rating;
  final double deliveryTime; // minutes
  final double deliveryFee;
  final List<String> cuisines;
  final bool isOpen;
  final String imageUrl;
  final String location;

  const Restaurant({
    required this.id,
    required this.name,
    required this.rating,
    required this.deliveryTime,
    required this.deliveryFee,
    required this.cuisines,
    required this.isOpen,
    required this.imageUrl,
    required this.location,
  });

  /// JSON se Restaurant object banaao
  factory Restaurant.fromJson(Map<String, dynamic> json) {
    return Restaurant(
      id: json['id'] as String,
      name: json['name'] as String,
      rating: (json['rating'] as num).toDouble(),
      deliveryTime: (json['deliveryTime'] as num).toDouble(),
      deliveryFee: (json['deliveryFee'] as num).toDouble(),
      cuisines: List<String>.from(json['cuisines'] as List),
      isOpen: json['isOpen'] as bool,
      imageUrl: json['imageUrl'] as String,
      location: json['location'] as String,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'rating': rating,
    'deliveryTime': deliveryTime,
    'deliveryFee': deliveryFee,
    'cuisines': cuisines,
    'isOpen': isOpen,
    'imageUrl': imageUrl,
    'location': location,
  };

  /// CopyWith for immutability
  Restaurant copyWith({
    String? id,
    String? name,
    double? rating,
    double? deliveryTime,
    double? deliveryFee,
    List<String>? cuisines,
    bool? isOpen,
    String? imageUrl,
    String? location,
  }) {
    return Restaurant(
      id: id ?? this.id,
      name: name ?? this.name,
      rating: rating ?? this.rating,
      deliveryTime: deliveryTime ?? this.deliveryTime,
      deliveryFee: deliveryFee ?? this.deliveryFee,
      cuisines: cuisines ?? this.cuisines,
      isOpen: isOpen ?? this.isOpen,
      imageUrl: imageUrl ?? this.imageUrl,
      location: location ?? this.location,
    );
  }

  @override
  String toString() => 'Restaurant($name, rating: $rating)';
}
```

### Example: Constants

File: `packages/core/lib/constants/app_config.dart`

```dart
/// App-wide configuration
/// 
/// Isse dependency injection pattern mein use kar sakte hain
class AppConfig {
  static const String baseUrl = 'https://api.zomato.example.com/v1';
  static const Duration apiTimeout = Duration(seconds: 30);
  static const int maxRetries = 3;
  static const int pageSize = 20;
  
  /// Delivery fee calculation
  static double getDeliveryFee(double distanceInKm) {
    if (distanceInKm <= 2) return 20.0;
    if (distanceInKm <= 5) return 30.0;
    return 50.0 + ((distanceInKm - 5) * 5);
  }
}

class Strings {
  // Auth screens
  static const String loginTitle = 'Sign in to Zomato';
  static const String loginButton = 'Continue';
  static const String invalidEmail = 'Please enter valid email';
  
  // Restaurant screens
  static const String noRestaurants = 'Koi restaurants nahi mile';
  static const String loadingRestaurants = 'Loading restaurants...';
}
```

### Example: Extensions

File: `packages/core/lib/extensions/string_extensions.dart`

```dart
extension StringExtension on String {
  /// Email validation
  bool isValidEmail() {
    final emailRegex = RegExp(
      r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$',
    );
    return emailRegex.hasMatch(this);
  }

  /// Phone validation (Indian numbers)
  bool isValidPhone() {
    // 10 digit Indian phone
    return length == 10 && RegExp(r'^[6-9]\d{9}$').hasMatch(this);
  }

  /// First letter capital
  String capitalize() {
    if (isEmpty) return '';
    return '${this[0].toUpperCase()}${substring(1)}';
  }

  /// Format price for display
  String formatAsCurrency() {
    return '₹ $this'; // Indian rupee
  }
}

extension StringNullExtension on String? {
  /// Null-safe trim
  String get safeValue => this?.trim() ?? '';
  
  bool get isNotEmptyOrNull => this != null && this!.isNotEmpty;
}
```

> [!tip]
> **Core package ko PURE Dart rakho** — Flutter dependency nahi honi (ya minimal). Toh backend/CLI projects mein bhi reuse kar sakte ho

---

## UI Components Package — Shared Widgets

UI components package mein common widgets, themes, colors define karte hain. Jaise Zomato mein ek same "Order Button" har screen mein use hota hai.

### Structure

```
packages/ui_components/lib/
├── theme/
│   ├── app_theme.dart
│   ├── app_colors.dart
│   └── app_typography.dart
├── widgets/
│   ├── app_button.dart
│   ├── app_card.dart
│   ├── app_text_field.dart
│   ├── rating_widget.dart
│   └── loading_overlay.dart
└── utils/
    └── snackbar_utils.dart
```

### Example: App Theme

File: `packages/ui_components/lib/theme/app_theme.dart`

```dart
import 'package:flutter/material.dart';
import 'app_colors.dart';
import 'app_typography.dart';

/// Complete app theme — light & dark
class AppTheme {
  static ThemeData lightTheme() {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      colorScheme: ColorScheme.fromSeed(
        seedColor: AppColors.primary,
        brightness: Brightness.light,
      ),
      scaffoldBackgroundColor: AppColors.lightBackground,
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.white,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
      ),
      textTheme: AppTypography.lightTextTheme(),
      inputDecorationTheme: _buildInputDecorationTheme(
        focusedBorderColor: AppColors.primary,
      ),
    );
  }

  static ThemeData darkTheme() {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: ColorScheme.fromSeed(
        seedColor: AppColors.primary,
        brightness: Brightness.dark,
      ),
      scaffoldBackgroundColor: AppColors.darkBackground,
      appBarTheme: const AppBarTheme(
        backgroundColor: Color(0xFF1A1A1A),
        elevation: 0,
        surfaceTintColor: Colors.transparent,
      ),
      textTheme: AppTypography.darkTextTheme(),
      inputDecorationTheme: _buildInputDecorationTheme(
        focusedBorderColor: AppColors.primaryLight,
      ),
    );
  }

  static InputDecorationTheme _buildInputDecorationTheme({
    required Color focusedBorderColor,
  }) {
    return InputDecorationTheme(
      filled: true,
      contentPadding: const EdgeInsets.symmetric(
        horizontal: 16,
        vertical: 12,
      ),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: BorderSide(
          color: focusedBorderColor,
          width: 2,
        ),
      ),
    );
  }
}
```

### Example: Reusable Button Widget

File: `packages/ui_components/lib/widgets/app_button.dart`

```dart
import 'package:flutter/material.dart';

enum AppButtonStyle {
  primary,    // Zomato ka main orange button
  secondary,  // Gray outline
  ghost,      // Text only
}

enum AppButtonSize {
  large,      // Full width
  medium,     // 2/3 width
  small,      // Icon button
}

/// App-wide consistent button
/// 
/// Jaise Zomato ka har button consistent hota hai UI mein
class AppButton extends StatelessWidget {
  final String label;
  final VoidCallback onPressed;
  final AppButtonStyle style;
  final AppButtonSize size;
  final bool isLoading;
  final IconData? icon;
  final bool fullWidth;

  const AppButton({
    Key? key,
    required this.label,
    required this.onPressed,
    this.style = AppButtonStyle.primary,
    this.size = AppButtonSize.large,
    this.isLoading = false,
    this.icon,
    this.fullWidth = false,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    // Button dimension based on size
    final height = switch (size) {
      AppButtonSize.large => 52.0,
      AppButtonSize.medium => 44.0,
      AppButtonSize.small => 36.0,
    };

    final width = fullWidth ? double.infinity : null;

    // Button styling based on style enum
    final (backgroundColor, foregroundColor) = switch (style) {
      AppButtonStyle.primary => (
        theme.primaryColor,
        Colors.white,
      ),
      AppButtonStyle.secondary => (
        Colors.transparent,
        theme.primaryColor,
      ),
      AppButtonStyle.ghost => (
        Colors.transparent,
        theme.textTheme.bodyLarge?.color ?? Colors.black,
      ),
    };

    final buttonContent = isLoading
        ? SizedBox(
            width: 20,
            height: 20,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              valueColor: AlwaysStoppedAnimation(foregroundColor),
            ),
          )
        : Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (icon != null) ...[
                Icon(icon, size: 20),
                const SizedBox(width: 8),
              ],
              Text(label),
            ],
          );

    // Styling based on style
    final styleConfig = switch (style) {
      AppButtonStyle.primary => ElevatedButton.styleFrom(
        backgroundColor: backgroundColor,
        foregroundColor: foregroundColor,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
        ),
      ),
      AppButtonStyle.secondary => OutlinedButton.styleFrom(
        foregroundColor: foregroundColor,
        side: BorderSide(color: foregroundColor),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
        ),
      ),
      AppButtonStyle.ghost => TextButton.styleFrom(
        foregroundColor: foregroundColor,
      ),
    };

    final button = switch (style) {
      AppButtonStyle.primary => ElevatedButton(
        onPressed: isLoading ? null : onPressed,
        style: styleConfig,
        child: buttonContent,
      ),
      AppButtonStyle.secondary => OutlinedButton(
        onPressed: isLoading ? null : onPressed,
        style: styleConfig,
        child: buttonContent,
      ),
      AppButtonStyle.ghost => TextButton(
        onPressed: isLoading ? null : onPressed,
        style: styleConfig,
        child: buttonContent,
      ),
    };

    return SizedBox(
      height: height,
      width: width,
      child: button,
    );
  }
}
```

---

## Networking Package — API Layer

Networking package mein HTTP client, API endpoints, interceptors centralize karte hain.

### Example: API Client

File: `packages/networking/lib/api_client.dart`

```dart
import 'package:dio/dio.dart';
import 'package:core/core.dart'; // Core package

/// Centralized API client for entire app
/// 
/// Production Zomato app use karta hai similar approach
class ApiClient {
  final Dio _dio;
  
  ApiClient({Dio? dio})
      : _dio = dio ?? Dio(BaseOptions(
          baseUrl: AppConfig.baseUrl,
          connectTimeout: AppConfig.apiTimeout,
          receiveTimeout: AppConfig.apiTimeout,
          contentType: 'application/json',
        )) {
    // Add interceptors
    _dio.interceptors.addAll([
      LoggingInterceptor(),
      ErrorInterceptor(),
      AuthInterceptor(),
    ]);
  }

  /// GET request
  Future<T> get<T>(
    String endpoint, {
    required T Function(dynamic) fromJson,
    Map<String, dynamic>? queryParameters,
  }) async {
    try {
      final response = await _dio.get<dynamic>(
        endpoint,
        queryParameters: queryParameters,
      );
      return fromJson(response.data);
    } on DioException catch (e) {
      throw NetworkException.fromDio(e);
    }
  }

  /// POST request
  Future<T> post<T>(
    String endpoint, {
    required dynamic data,
    required T Function(dynamic) fromJson,
  }) async {
    try {
      final response = await _dio.post<dynamic>(
        endpoint,
        data: data,
      );
      return fromJson(response.data);
    } on DioException catch (e) {
      throw NetworkException.fromDio(e);
    }
  }

  /// PUT request
  Future<T> put<T>(
    String endpoint, {
    required dynamic data,
    required T Function(dynamic) fromJson,
  }) async {
    try {
      final response = await _dio.put<dynamic>(
        endpoint,
        data: data,
      );
      return fromJson(response.data);
    } on DioException catch (e) {
      throw NetworkException.fromDio(e);
    }
  }

  /// DELETE request
  Future<void> delete(String endpoint) async {
    try {
      await _dio.delete<dynamic>(endpoint);
    } on DioException catch (e) {
      throw NetworkException.fromDio(e);
    }
  }
}

/// Logging interceptor
class LoggingInterceptor extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    print('🚀 [${options.method}] ${options.path}');
    print('📦 Body: ${options.data}');
    handler.next(options);
  }

  @override
  void onResponse(Response response, ResponseInterceptorHandler handler) {
    print('✅ [${response.statusCode}] ${response.requestOptions.path}');
    handler.next(response);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    print('❌ Error: ${err.message}');
    handler.next(err);
  }
}

/// Error handling interceptor
class ErrorInterceptor extends Interceptor {
  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    if (err.response?.statusCode == 401) {
      // Token expired — refresh token logic
      print('⚠️ Token expired, refreshing...');
    }
    handler.next(err);
  }
}

/// Authentication interceptor
class AuthInterceptor extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    // Add auth token to headers
    final token = await _getAuthToken();
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  Future<String?> _getAuthToken() async {
    // Get from secure storage
    return null; // TODO: implement
  }
}

/// Custom network exception
class NetworkException implements Exception {
  final String message;
  final int? statusCode;
  final dynamic originalException;

  NetworkException({
    required this.message,
    this.statusCode,
    this.originalException,
  });

  factory NetworkException.fromDio(DioException e) {
    return NetworkException(
      message: e.message ?? 'Network error',
      statusCode: e.response?.statusCode,
      originalException: e,
    );
  }

  @override
  String toString() => 'NetworkException: $message (Status: $statusCode)';
}
```

### Example: API Repository

File: `packages/networking/lib/repositories/restaurant_repository.dart`

```dart
import 'package:core/models/restaurant.dart';
import '../api_client.dart';

/// Restaurant API repository
/// 
/// Feature layers ko API calls nahi direct karne dete
/// Sab kuch centralize yaha pe hota hai
class RestaurantRepository {
  final ApiClient _apiClient;

  RestaurantRepository(this._apiClient);

  /// Get all restaurants near location
  Future<List<Restaurant>> getNearbyRestaurants({
    required double latitude,
    required double longitude,
    required int page,
  }) async {
    try {
      final data = await _apiClient.get<List<dynamic>>(
        '/restaurants',
        queryParameters: {
          'lat': latitude,
          'lng': longitude,
          'page': page,
        },
        fromJson: (json) => json is List
            ? json.map((e) => Restaurant.fromJson(e as Map<String, dynamic>)).toList()
            : [],
      );
      return data;
    } catch (e) {
      rethrow; // Feature layer ko error dedenge
    }
  }

  /// Get restaurant details
  Future<Restaurant> getRestaurantDetails(String restaurantId) async {
    return _apiClient.get(
      '/restaurants/$restaurantId',
      fromJson: (json) => Restaurant.fromJson(json as Map<String, dynamic>),
    );
  }

  /// Search restaurants
  Future<List<Restaurant>> searchRestaurants(String query) async {
    return _apiClient.get(
      '/restaurants/search',
      queryParameters: {'q': query},
      fromJson: (json) => (json as List)
          .map((e) => Restaurant.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}
```

---

## Feature Package Example — feature_restaurants

Ab dekhte hain ek complete feature package kaise structure hota hai.

### Directory Structure

```
packages/feature_restaurants/lib/
├── screens/
│   ├── restaurants_list_screen.dart
│   ├── restaurant_details_screen.dart
│   └── search_screen.dart
├── widgets/
│   ├── restaurant_card.dart
│   ├── restaurant_filter.dart
│   └── cuisine_chip.dart
├── providers/
│   ├── restaurants_provider.dart
│   └── restaurant_filter_provider.dart
├── models/
│   └── filter_model.dart
└── feature_restaurants.dart  # Public API
```

### Example: Screen with Riverpod

File: `packages/feature_restaurants/lib/screens/restaurants_list_screen.dart`

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:core/core.dart';
import 'package:ui_components/ui_components.dart';
import '../providers/restaurants_provider.dart';
import '../widgets/restaurant_card.dart';

/// Restaurants list screen — Zomato ke "Home" screen jaisa
class RestaurantsListScreen extends ConsumerWidget {
  const RestaurantsListScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final restaurantsAsync = ref.watch(restaurantsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Nearby Restaurants'),
        centerTitle: true,
      ),
      body: restaurantsAsync.when(
        loading: () => const Center(
          child: CircularProgressIndicator(),
        ),
        error: (error, stack) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 48),
              const SizedBox(height: 16),
              Text('Error: $error'),
              const SizedBox(height: 24),
              AppButton(
                label: 'Retry',
                onPressed: () {
                  ref.refresh(restaurantsProvider);
                },
              ),
            ],
          ),
        ),
        data: (restaurants) => restaurants.isEmpty
            ? Center(
                child: Text(Strings.noRestaurants),
              )
            : ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: restaurants.length,
                itemBuilder: (context, index) {
                  final restaurant = restaurants[index];
                  return GestureDetector(
                    onTap: () {
                      // Navigate to details
                      // context.push('/restaurant/${restaurant.id}');
                    },
                    child: RestaurantCard(restaurant: restaurant),
                  );
                },
              ),
      ),
    );
  }
}
```

### Example: Riverpod Provider

File: `packages/feature_restaurants/lib/providers/restaurants_provider.dart`

```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:networking/networking.dart';
import 'package:core/models/restaurant.dart';

/// API client provider
final apiClientProvider = Provider((ref) => ApiClient());

/// Restaurant repository provider
final restaurantRepositoryProvider = Provider((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return RestaurantRepository(apiClient);
});

/// User location provider (mock for now)
final userLocationProvider = StateProvider<({double lat, double lng})>((ref) {
  return (lat: 28.6139, lng: 77.2090); // Delhi coordinates
});

/// Restaurants list provider with FutureProvider
final restaurantsProvider = FutureProvider<List<Restaurant>>((ref) async {
  final repository = ref.watch(restaurantRepositoryProvider);
  final location = ref.watch(userLocationProvider);
  
  return repository.getNearbyRestaurants(
    latitude: location.lat,
    longitude: location.lng,
    page: 1,
  );
});

/// Single restaurant details provider
final restaurantDetailsProvider = FutureProvider.family<Restaurant, String>(
  (ref, restaurantId) async {
    final repository = ref.watch(restaurantRepositoryProvider);
    return repository.getRestaurantDetails(restaurantId);
  },
);

/// Search results provider
final restaurantSearchProvider = 
    StateNotifierProvider<SearchNotifier, List<Restaurant>>((ref) {
  final repository = ref.watch(restaurantRepositoryProvider);
  return SearchNotifier(repository);
});

class SearchNotifier extends StateNotifier<List<Restaurant>> {
  final RestaurantRepository _repository;

  SearchNotifier(this._repository) : super([]);

  Future<void> search(String query) async {
    if (query.isEmpty) {
      state = [];
      return;
    }
    final results = await _repository.searchRestaurants(query);
    state = results;
  }
}
```

### Example: Widget

File: `packages/feature_restaurants/lib/widgets/restaurant_card.dart`

```dart
import 'package:flutter/material.dart';
import 'package:core/core.dart';
import 'package:core/models/restaurant.dart';
import 'package:ui_components/ui_components.dart';

/// Reusable restaurant card widget
class RestaurantCard extends StatelessWidget {
  final Restaurant restaurant;

  const RestaurantCard({
    Key? key,
    required this.restaurant,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    return Card(
      margin: const EdgeInsets.symmetric(vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Restaurant image
          ClipRRect(
            borderRadius: const BorderRadius.vertical(
              top: Radius.circular(12),
            ),
            child: Stack(
              children: [
                Image.network(
                  restaurant.imageUrl,
                  width: double.infinity,
                  height: 200,
                  fit: BoxFit.cover,
                  errorBuilder: (context, error, stackTrace) {
                    return Container(
                      color: Colors.grey[300],
                      width: double.infinity,
                      height: 200,
                      child: const Icon(Icons.image_not_supported),
                    );
                  },
                ),
                // Status badge
                Positioned(
                  top: 12,
                  right: 12,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: restaurant.isOpen ? Colors.green : Colors.red,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      restaurant.isOpen ? 'Open' : 'Closed',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          // Restaurant info
          Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Name
                Text(
                  restaurant.name,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                // Rating, delivery time, fee
                Row(
                  children: [
                    // Rating
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.green,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Row(
                        children: [
                          const Icon(
                            Icons.star_rounded,
                            size: 14,
                            color: Colors.white,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            restaurant.rating.toString(),
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    // Delivery time
                    Text(
                      '${restaurant.deliveryTime.toInt()} mins',
                      style: theme.textTheme.bodySmall,
                    ),
                    const SizedBox(width: 12),
                    // Delivery fee
                    Text(
                      '₹${restaurant.deliveryFee.toInt()} delivery',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: Colors.grey[600],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                // Cuisines
                Wrap(
                  spacing: 4,
                  children: restaurant.cuisines
                      .take(3)
                      .map((cuisine) {
                        return Chip(
                          label: Text(cuisine),
                          labelStyle: theme.textTheme.bodySmall,
                          visualDensity: VisualDensity.compact,
                        );
                      })
                      .toList(),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
```

### Public API Export

File: `packages/feature_restaurants/lib/feature_restaurants.dart`

```dart
// Screens
export 'screens/restaurants_list_screen.dart';
export 'screens/restaurant_details_screen.dart';
export 'screens/search_screen.dart';

// Providers
export 'providers/restaurants_provider.dart';

// Widgets
export 'widgets/restaurant_card.dart';

// Models
export 'models/filter_model.dart';
```

> [!tip]
> **Feature package ko library package rakho** — direct main app se import karte ho feature_restaurants ko, sab exports automatically available hote hain

---

## Main App Assembly — customer_app

Ab main app mein sab packages ko assemble karte hain.

### Example: main.dart

File: `apps/customer_app/lib/main.dart`

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ui_components/theme/app_theme.dart';
import 'app.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize dependencies
  // - Database
  // - Secure storage
  // - Firebase
  // - etc.
  
  runApp(
    const ProviderScope(
      child: MyApp(),
    ),
  );
}
```

### Example: app.dart

File: `apps/customer_app/lib/app.dart`

```dart
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:ui_components/ui_components.dart';
import 'package:feature_restaurants/feature_restaurants.dart';
import 'package:feature_auth/feature_auth.dart';
import 'package:feature_cart/feature_cart.dart';
import 'routes/app_routes.dart';

class MyApp extends StatelessWidget {
  const MyApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'Zomato Clone',
      theme: AppTheme.lightTheme(),
      darkTheme: AppTheme.darkTheme(),
      themeMode: ThemeMode.system,
      routerConfig: _buildRouter(),
    );
  }

  GoRouter _buildRouter() {
    return GoRouter(
      initialLocation: '/',
      routes: [
        // Auth routes
        GoRoute(
          path: '/login',
          builder: (context, state) => const LoginScreen(),
        ),
        GoRoute(
          path: '/signup',
          builder: (context, state) => const SignupScreen(),
        ),
        // Main app routes
        GoRoute(
          path: '/',
          builder: (context, state) => const RestaurantsListScreen(),
        ),
        GoRoute(
          path: '/restaurant/:id',
          builder: (context, state) {
            final id = state.pathParameters['id']!;
            return RestaurantDetailsScreen(restaurantId: id);
          },
        ),
        // Cart
        GoRoute(
          path: '/cart',
          builder: (context, state) => const CartScreen(),
        ),
      ],
    );
  }
}
```

---

## pubspec.lock — Dependency Coordination

Monorepo mein `pubspec.lock` file crucial hota hai. Sab packages same version ke dependencies use kare ensure karna padta hai.

### Kaise kam karta hai

```
1. tum `flutter pub get` chalaate ho root mein
   ↓
2. Dart resolver sab pubspec.yaml files analyze karta hai
   ↓
3. Conflicts resolve karta hai (sab packages same version chahiye)
   ↓
4. Single pubspec.lock file generate hota hai
   ↓
5. Team mein sab ko same versions milte hain (git se)
```

### Workflow

```bash
# Root directory mein
$ flutter pub get

# Toh lock file update hota hai
# pubspec.lock mein sab packages + versions fixed
# Git mein commit karo

$ git add pubspec.lock
$ git commit -m "chore: update dependencies"
```

> [!warning]
> **pubspec.lock always commit karo** — toh CI/CD aur team members ko same versions milte hain. Agar ignore karo toh "works on my machine" problem ho jayega

---

## Dependency Graph & Layering

Monorepo properly organize karne ke liye strict layering follow karni padti hai:

```
❌ BAD — Circular dependency:
  core → feature_auth (core uses auth feature?!)
  
✅ GOOD — Clear hierarchy:
  feature_restaurants
      ↓
  networking (API calls)
      ↓
  core (models, constants)
      ↓
  (nothing below)
```

### Dependency Rules (Mandatory!)

1. **Core never depends on anything** — pure Dart, sirf stdlib
2. **Shared libs (ui_components, networking) depend on core only**
3. **Features depend on core + shared libs only**
4. **App depends on features + all else**
5. **No feature depends on another feature** — agar data share karna ho toh core mein rakho

### Checking Dependencies

Dart mein automated dependency graph checker nahi hai, lekin manually check kar sakte ho:

```bash
# Check what feature_restaurants imports
$ grep -r "import 'package:" packages/feature_restaurants/lib/

# Should only show:
# - package:core
# - package:ui_components
# - package:networking
# - package:flutter
```

---

## Multiple Apps in One Monorepo

Zomato-like setup mein 2-3 apps hote hain:

```
apps/
├── customer_app/      # Customer facing
├── delivery_app/      # Partner/delivery app
└── admin_app/         # Admin dashboard
```

Har app same monorepo packages use karta hai, lekin alag-alag features:

```dart
// customer_app/pubspec.yaml
dependencies:
  core: path: ../../packages/core
  networking: path: ../../packages/networking
  feature_auth: path: ../../packages/feature_auth
  feature_restaurants: path: ../../packages/feature_restaurants
  feature_cart: path: ../../packages/feature_cart
  feature_orders: path: ../../packages/feature_orders

// delivery_app/pubspec.yaml
dependencies:
  core: path: ../../packages/core
  networking: path: ../../packages/networking
  feature_auth: path: ../../packages/feature_auth
  feature_delivery: path: ../../packages/feature_delivery
  feature_earnings: path: ../../packages/feature_earnings
```

---

## CI/CD with Monorepos

GitHub Actions / Gitlab CI mein monorepo handle karna thoda complex hota hai:

### Strategy 1: Test Everything

```yaml
# .github/workflows/test.yml
name: Test All Packages

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Flutter
        uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.13.0'
      
      - name: Get dependencies (root)
        run: flutter pub get
      
      - name: Get dependencies (core)
        working-directory: packages/core
        run: flutter pub get
      
      - name: Get dependencies (feature_auth)
        working-directory: packages/feature_auth
        run: flutter pub get
      
      # ... repeat for all packages
      
      - name: Run tests
        run: |
          cd packages/core && flutter test
          cd packages/networking && flutter test
          cd apps/customer_app && flutter test
```

### Strategy 2: Changed Packages Only

```yaml
# .github/workflows/test-changed.yml
name: Test Changed Packages

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0
      
      - name: Setup Flutter
        uses: subosito/flutter-action@v2
      
      - name: Find changed packages
        run: |
          git diff --name-only origin/main...HEAD | grep -E '^packages/|^apps/' | \
          cut -d'/' -f1-2 | sort -u > changed_packages.txt
      
      - name: Test changed packages
        run: |
          while read package; do
            echo "Testing $package..."
            cd $package
            flutter pub get && flutter test
            cd ../..
          done < changed_packages.txt
```

---

## Real Zomato-Like Monorepo Example

Ek concrete example — Zomato ke similar structure:

```
zomato_clone/
├── packages/
│   ├── core/
│   │   └── lib/
│   │       ├── models/ (Restaurant, Order, User, etc.)
│   │       ├── constants/ (API URLs, timeouts, etc.)
│   │       ├── extensions/ (String, DateTime, etc.)
│   │       └── exceptions/ (NetworkException, etc.)
│   │
│   ├── ui_components/
│   │   └── lib/
│   │       ├── theme/ (colors, typography)
│   │       └── widgets/ (AppButton, AppCard, etc.)
│   │
│   ├── networking/
│   │   └── lib/
│   │       ├── api_client.dart
│   │       ├── interceptors.dart
│   │       └── repositories/
│   │
│   ├── storage/
│   │   └── lib/
│   │       ├── local_database.dart
│   │       ├── shared_preferences.dart
│   │       └── secure_storage.dart
│   │
│   ├── feature_auth/
│   │   └── lib/
│   │       ├── screens/ (LoginScreen, SignupScreen)
│   │       ├── providers/ (auth state)
│   │       └── services/ (AuthService)
│   │
│   ├── feature_restaurants/
│   │   └── lib/ (as described above)
│   │
│   ├── feature_cart/
│   │   └── lib/
│   │       ├── screens/ (CartScreen, CheckoutScreen)
│   │       ├── providers/ (cart state)
│   │       └── models/ (CartItem, etc.)
│   │
│   ├── feature_orders/
│   │   └── lib/
│   │       ├── screens/ (OrdersListScreen, OrderTrackingScreen)
│   │       ├── providers/
│   │       └── widgets/
│   │
│   └── feature_payment/
│       └── lib/
│           ├── screens/ (PaymentScreen)
│           ├── services/ (PaymentService)
│           └── models/
│
├── apps/
│   ├── customer_app/
│   │   ├── lib/
│   │   │   ├── main.dart
│   │   │   ├── app.dart
│   │   │   └── routes/
│   │   ├── android/
│   │   └── ios/
│   │
│   └── delivery_partner_app/
│       ├── lib/
│       │   ├── main.dart
│       │   ├── app.dart
│       │   └── routes/
│       ├── android/
│       └── ios/
│
├── pubspec.yaml
├── pubspec.lock
├── .github/workflows/
│   ├── test.yml
│   └── deploy.yml
└── README.md
```

---

## Common Pitfalls & Solutions

### Pitfall 1: Circular Dependencies

```dart
// ❌ BAD
// core/pubspec.yaml
dependencies:
  networking: path: ../networking

// networking/pubspec.yaml
dependencies:
  core: path: ../core  # OK
  feature_auth: path: ../feature_auth  # CIRCULAR!

// feature_auth/pubspec.yaml
dependencies:
  core: path: ../core  # References core which depends on networking
  networking: path: ../networking
```

**Solution**: Strict layering follow karo. Core → Networking → Features, kabhi backward reference nahi.

### Pitfall 2: Shared State Between Packages

```dart
// ❌ BAD — feature_auth aur feature_cart directly share state?
// feature_cart/lib/cart_provider.dart
final cartProvider = StateNotifierProvider((ref) {
  // feature_auth package ko access karna
  final user = ref.watch(featureAuthUserProvider); // WRONG
});
```

**Solution**: Shared state ko shared lib mein rakho:

```dart
// ✅ GOOD
// core/lib/providers/user_provider.dart
final currentUserProvider = StateNotifierProvider((ref) => UserNotifier());

// feature_cart/lib/cart_provider.dart
final cartProvider = StateNotifierProvider((ref) {
  final user = ref.watch(currentUserProvider); // Core se access
});
```

### Pitfall 3: Version Conflicts

```
❌ BAD scenario:
  feature_restaurants uses riverpod: 2.0.0
  feature_cart uses riverpod: 2.4.0
  → pubspec.lock mein conflict
```

**Solution**: Monorepo root mein version lock karo:

```yaml
# pubspec.yaml (root)
dependencies:
  riverpod: 2.4.0  # Single source of truth

# pubspec.lock ke through sab packages ye version use karte hain
```

### Pitfall 4: Not Versioning pubspec.lock

```bash
❌ BAD:
  .gitignore mein pubspec.lock
  → Different developers ko different versions mil sakte hain

✅ GOOD:
  pubspec.lock ko git mein commit karo
  → Team coherent rahe
```

---

## Migration Guide — Single Package se Monorepo

Agar existing app ko monorepo structure mein convert karna ho:

### Step 1: Create Package Structure

```bash
# Monorepo root mein
mkdir -p packages/{core,ui_components,networking,feature_auth}
mkdir -p apps/customer_app
```

### Step 2: Extract Core Package

```bash
# Create core package
cd packages/core
flutter create --template=package .

# Move models, constants, extensions
cp -r /old_app/lib/models ./lib/
cp -r /old_app/lib/constants ./lib/
cp -r /old_app/lib/extensions ./lib/

# Update pubspec.yaml
# Add dependencies if any
```

### Step 3: Extract UI Components

```bash
cd packages/ui_components
flutter create --template=package .

# Move theme, reusable widgets
cp -r /old_app/lib/theme ./lib/
cp -r /old_app/lib/widgets ./lib/
```

### Step 4: Extract Features

```bash
cd packages/feature_auth
flutter create --template=package .

# Move auth-specific files
cp -r /old_app/lib/screens/auth ./lib/screens/
cp -r /old_app/lib/providers/auth_provider.dart ./lib/providers/
```

### Step 5: Create Main App

```bash
cd apps/customer_app
flutter create .

# Update pubspec.yaml with path dependencies
# Copy routing, main.dart, etc.
```

### Step 6: Test Everything

```bash
# Root level
flutter pub get

# Each package
cd packages/core && flutter test
cd packages/ui_components && flutter test

# Main app
cd apps/customer_app && flutter test
```

---

## Performance Considerations

Monorepo mein performance kaise maintain karte hain?

### 1. Lazy Loading

```dart
// ✅ GOOD — feature_restaurants lazy load hota hai jab navigate kare
GoRoute(
  path: '/restaurants',
  pageBuilder: (context, state) async {
    // Import on-demand
    final RestaurantsListScreen = (await Future.value(
      await import('package:feature_restaurants/feature_restaurants.dart')
    ));
    return NoTransitionPage(child: RestaurantsListScreen());
  },
),
```

### 2. Code Generation

Dart code generation ke liye `build_runner` use karte hain:

```yaml
# root pubspec.yaml
dev_dependencies:
  build_runner: ^2.4.0
  
# Har package mein jo generation karna ho
# packages/core/pubspec.yaml
dev_dependencies:
  built_value_generator: ^8.8.0
```

```bash
# Generate code across all packages
flutter pub run build_runner build
```

### 3. Monorepo Size Management

```bash
# Large files exclude karo
# .git/info/exclude ya .gitignore
*.apk
*.ipa
build/
.dart_tool/
.flutter/
```

---

## Testing Monorepos

### Unit Tests

```dart
// packages/core/test/models/restaurant_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:core/models/restaurant.dart';

void main() {
  group('Restaurant Model', () {
    test('fromJson correctly deserializes', () {
      final json = {
        'id': '1',
        'name': 'Zomato',
        'rating': 4.5,
        'deliveryTime': 30.0,
        'deliveryFee': 40.0,
        'cuisines': ['North Indian', 'Chinese'],
        'isOpen': true,
        'imageUrl': 'https://...',
        'location': 'Delhi',
      };

      final restaurant = Restaurant.fromJson(json);

      expect(restaurant.id, '1');
      expect(restaurant.name, 'Zomato');
      expect(restaurant.rating, 4.5);
    });

    test('copyWith creates new instance', () {
      const original = Restaurant(
        id: '1',
        name: 'Old Name',
        rating: 4.0,
        deliveryTime: 30.0,
        deliveryFee: 40.0,
        cuisines: [],
        isOpen: true,
        imageUrl: 'https://...',
        location: 'Delhi',
      );

      final updated = original.copyWith(name: 'New Name');

      expect(updated.name, 'New Name');
      expect(original.name, 'Old Name'); // Original unchanged
    });
  });
}
```

### Widget Tests

```dart
// packages/ui_components/test/widgets/app_button_test.dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ui_components/widgets/app_button.dart';

void main() {
  testWidgets('AppButton renders correctly', (WidgetTester tester) async {
    var tapCount = 0;

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: AppButton(
            label: 'Tap Me',
            onPressed: () => tapCount++,
          ),
        ),
      ),
    );

    expect(find.text('Tap Me'), findsOneWidget);

    await tester.tap(find.byType(AppButton));
    expect(tapCount, 1);
  });
}
```

### Integration Tests

```dart
// apps/customer_app/integration_test/app_test.dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:customer_app/main.dart' as app;

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('Full app flow', (WidgetTester tester) async {
    app.main();
    await tester.pumpAndSettle();

    // Verify home screen
    expect(find.text('Nearby Restaurants'), findsOneWidget);

    // Tap first restaurant
    await tester.tap(find.byType(GestureDetector).first);
    await tester.pumpAndSettle();

    // Verify details screen
    expect(find.text('Restaurant Details'), findsOneWidget);
  });
}
```

---

## Documentation & Navigation

Monorepo mein team ko guide karne ke liye good documentation zaroori hai:

### README Structure

```
README.md (root)
  ├── Overview
  ├── Quick Start
  ├── Architecture
  ├── Package Descriptions
  ├── Development Guide
  └── CI/CD

packages/
  ├── core/README.md
  ├── networking/README.md
  ├── feature_auth/README.md
  └── ...

apps/
  ├── customer_app/README.md
  └── delivery_app/README.md
```

### Example: Root README

```markdown
# Zomato Clone Monorepo

## Architecture

```
customer_app
  ├── feature_restaurants
  ├── feature_cart
  ├── feature_orders
  └── feature_auth
      ↓
  [All depend on]
      ↓
  networking + ui_components + core
```

## Getting Started

```bash
# Install dependencies
flutter pub get

# Run app
cd apps/customer_app
flutter run
```

## Package Guide

### Core Package
Shared models, constants, extensions. No Flutter dependencies.

### Networking Package
API client, repositories, error handling.

### Feature Packages
Feature-specific screens, logic, state management.

## Dependency Rules
1. No circular dependencies
2. Features never depend on other features
3. Everything depends upward to shared libs only
```

---

## Key Takeaways

- **Monorepo = single repo, multiple packages** — organization aur code sharing ke liye ideal
- **Layering critical** — core → shared libs → features → apps, circular dependencies kabhi nahi
- **Path dependencies** — `pubspec.yaml` mein `path:` use karke local packages reference karte hain
- **pubspec.lock share karo** — git mein commit karo toh team coherent rahe
- **Core package pure Dart rakho** — reusability aur independence ke liye
- **UI Components centralize** — theme, common widgets — ek hi jaga
- **Networking layer abstract** — API details hide karo, repositories expose karo
- **Feature isolation** — har feature apna responsibility, dependencies clear
- **Multiple apps same codebase** — customer + delivery apps same packages use kar sakte hain
- **CI/CD careful** — changed packages hi test/deploy karo, unnecessary builds avoid karo
- **Documentation essential** — team ko clear guide honi chahiye dependency graph ki
- **Testing at multiple levels** — unit tests (models), widget tests (UI), integration tests (flows)
- **Performance mindful** — lazy loading, code generation, monorepo size manage karo
