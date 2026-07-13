# BLoC Pattern — Cubit, Full BLoC, Event-State Cycle, Team-Scale Apps

Socho ek second ke liye. Jab tum Zomato app chalate ho aur restaurant search karte ho, kya hota hai?

1. Tum search bar mein kuch likha ("panipuri")
2. App ko ye data handle karna hai, API call karna, results filter karna, UI update karna
3. Agar network fail ho, error dikhana hai
4. Agar user back button daba de, state clean karna hai

Ab Node.js/Express mein tum kya करते हो? Express route mein logic likha, database query चलाई, response भेजा। Bas single request-response.

**Flutter mein problem अलग है**: UI **continuous state पर depend करता है**। Ek app session mein states change होती हैं बार-बार, और हर change को multiple widgets को notify करना पड़ता है।

Yahi solve करने के लिए आया **BLoC Pattern** — Business Logic Component। अगर Riverpod को StateNotifier सोचा था, तो BLoC उसका big brother है, but event-driven और explicitly testable।

---

## BLoC का Philosophy: Separation of Concerns

BLoC का मतलब साफ है:
- **B**usiness Logic को UI से अलग रखो
- **L**isteners/Builders को state notify करने दो
- **C**omponent unit-testable हो

Node.js में जैसे तुम middleware stack बनाते हो (auth → validation → business logic → response), **Flutter में BLoC वही architecture enforce करता है**।

### Architecture Layers:

```
┌─────────────────────────────────────┐
│      Presentation (UI Widgets)      │  ← BlocBuilder, BlocListener
├─────────────────────────────────────┤
│      BLoC Layer (State Machine)     │  ← Cubit or BLoC
├─────────────────────────────────────┤
│  Data Layer (Repo, Models, API)     │  ← Services, API calls
├─────────────────────────────────────┤
│      Domain (Business Rules)        │  ← Entities, use cases
└─────────────────────────────────────┘
```

BLoC UI को business logic से isolate करता है तो testing **बहुत आसान** हो जाता है। Koi widget tree नहीं, सिर्फ input-output।

---

## Cubit vs BLoC: क्या फर्क है?

दोनों state manage करते हैं, **लेकिन semantics अलग हैं**।

### Cubit (Simple State Machine)

Cubit = State + Methods (no explicit events)

```dart
// Cubit: Simple methods जो state को change करते हैं
class CounterCubit extends Cubit<int> {
  CounterCubit() : super(0);

  void increment() => emit(state + 1);
  void decrement() => emit(state - 1);
  void reset() => emit(0);
}
```

**कब use करो Cubit?**
- Simple features जहाँ state changes **predictable** हों
- जब logic छोटी हो (counter, toggle, simple filter)
- Jab events explicit नहीं हों ("button दबाया जा रहा है" की बजाय सीधे "state X हो गई")

### BLoC (Event-Driven State Machine)

BLoC = Events → Processing → State change

```dart
// Events: क्या-क्या हो सकता है
abstract class SearchEvent extends Equatable {
  const SearchEvent();
}

class SearchQueryChanged extends SearchEvent {
  final String query;
  const SearchQueryChanged(this.query);

  @override
  List<Object?> get props => [query];
}

class SearchSubmitted extends SearchEvent {
  const SearchSubmitted();

  @override
  List<Object?> get props => [];
}

// BLoC: Events को handle करके state emit करता है
class SearchBloc extends Bloc<SearchEvent, SearchState> {
  SearchBloc({required this.repository}) : super(SearchInitial()) {
    on<SearchQueryChanged>(_onQueryChanged);
    on<SearchSubmitted>(_onSubmitted);
  }

  final SearchRepository repository;

  Future<void> _onQueryChanged(
    SearchQueryChanged event,
    Emitter<SearchState> emit,
  ) async {
    emit(SearchLoading());
    try {
      final results = await repository.search(event.query);
      emit(SearchSuccess(results));
    } catch (e) {
      emit(SearchError(e.toString()));
    }
  }

  Future<void> _onSubmitted(
    SearchSubmitted event,
    Emitter<SearchState> emit,
  ) async {
    // Handle submission
  }
}
```

**कब use करो BLoC?**
- Complex flows जहाँ multiple events trigger हो सकते हैं
- Concurrent operations (parallel requests)
- Explicit event handling (login, logout, retry logic)
- Large teams जहाँ code readability जरूरी हो

### फर्क Table

| Aspect | Cubit | BLoC |
|--------|-------|------|
| **Events** | नहीं, सीधे methods | हाँ, abstract classes |
| **Complexity** | Simple | Medium → Complex |
| **Testing** | Easy | Easy + Advanced scenarios |
| **Concurrency** | Basic | Excellent (event queue) |
| **Team Size** | Small | Medium → Large |
| **Learning Curve** | Shallow | Steeper |

---

## Deep Dive: Event-State Cycle (BLoC)

BLoC का heart है **event → state transition** cycle। Jैसे Redux (या Riverpod) में action dispatch होता है, BLoC में events होते हैं।

### State Design

State को हमेशा immutable enum-like classes बनाओ:

```dart
abstract class AuthState extends Equatable {
  const AuthState();

  @override
  List<Object?> get props => [];
}

class AuthInitial extends AuthState {
  const AuthInitial();
}

class AuthLoading extends AuthState {
  const AuthLoading();
}

class AuthSuccess extends AuthState {
  final User user;
  const AuthSuccess(this.user);

  @override
  List<Object?> get props => [user];
}

class AuthError extends AuthState {
  final String message;
  const AuthError(this.message);

  @override
  List<Object?> get props => [message];
}
```

**क्यों Equatable?** ताकि state comparison काम करे। Two `AuthSuccess` instances equal हों अगर same user हो।

### Event Design

Events जो UI से trigger होंगे:

```dart
abstract class AuthEvent extends Equatable {
  const AuthEvent();

  @override
  List<Object?> get props => [];
}

class LoginRequested extends AuthEvent {
  final String email;
  final String password;

  const LoginRequested(this.email, this.password);

  @override
  List<Object?> get props => [email, password];
}

class LogoutRequested extends AuthEvent {
  const LogoutRequested();
}

class SignupRequested extends AuthEvent {
  final String email;
  final String password;
  final String name;

  const SignupRequested(this.email, this.password, this.name);

  @override
  List<Object?> get props => [email, password, name];
}
```

### BLoC Implementation

```dart
class AuthBloc extends Bloc<AuthEvent, AuthState> {
  AuthBloc({required this.authService}) : super(const AuthInitial()) {
    // Event handlers को register करो
    on<LoginRequested>(_onLoginRequested);
    on<LogoutRequested>(_onLogoutRequested);
    on<SignupRequested>(_onSignupRequested);
  }

  final AuthService authService;

  Future<void> _onLoginRequested(
    LoginRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(const AuthLoading());
    try {
      final user = await authService.login(event.email, event.password);
      emit(AuthSuccess(user));
    } on NetworkException catch (e) {
      emit(AuthError('Network error: ${e.message}'));
    } on AuthException catch (e) {
      emit(AuthError(e.message));
    }
  }

  Future<void> _onLogoutRequested(
    LogoutRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(const AuthLoading());
    try {
      await authService.logout();
      emit(const AuthInitial());
    } catch (e) {
      emit(AuthError(e.toString()));
    }
  }

  Future<void> _onSignupRequested(
    SignupRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(const AuthLoading());
    try {
      final user = await authService.signup(
        event.email,
        event.password,
        event.name,
      );
      emit(AuthSuccess(user));
    } catch (e) {
      emit(AuthError(e.toString()));
    }
  }
}
```

**Flow Diagram:**

```
┌──────────────────┐
│  UI Event कृत्य  │ (user login button दबाया)
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────────┐
│ BLoC event queue में डाल दिया   │ add(LoginRequested(...))
└────────┬─────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│ Event handler (_onLoginRequested) │
└────────┬─────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│ Emit loading state               │ emit(AuthLoading())
└────────┬─────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│ Async work (API call)            │ await authService.login()
└────────┬─────────────────────────┘
         │
      ┌──┴──┐
      ▼     ▼
   Success  Error
      │     │
      ▼     ▼
    Success Error state emitted
    state   │
    │       ▼
    └──────▶ UI updates
```

---

## Flutter BLoC Package: BlocBuilder, BlocListener, MultiBlocProvider

`flutter_bloc` package UI को state के साथ rebuild और listen करने का तरीका देता है।

### BlocBuilder: State बदले तो rebuild

```dart
BlocBuilder<AuthBloc, AuthState>(
  builder: (context, state) {
    // ये function हर बार call होता है जब state change हो
    if (state is AuthInitial) {
      return const Scaffold(
        body: Center(child: Text('Welcome')),
      );
    } else if (state is AuthLoading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    } else if (state is AuthSuccess) {
      return HomePage(user: state.user);
    } else if (state is AuthError) {
      return ErrorPage(message: state.message);
    }
    return const SizedBox.shrink();
  },
);
```

**Important**: BlocBuilder सिर्फ UI rebuild करता है, side effects (toast, navigation) नहीं।

### BlocListener: Side Effects के लिए

```dart
BlocListener<AuthBloc, AuthState>(
  listener: (context, state) {
    // ये function हर बार call होता है जब state change हो
    // Yahan पर side effects डालो
    if (state is AuthSuccess) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Login successful!')),
      );
      Navigator.of(context).pushReplacementNamed('/home');
    } else if (state is AuthError) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(state.message)),
      );
    }
  },
  child: const LoginPage(), // या अन्य widget
);
```

### BlocConsumer: दोनों की शक्ति

```dart
BlocConsumer<AuthBloc, AuthState>(
  listener: (context, state) {
    // Side effects यहाँ
    if (state is AuthSuccess) {
      Navigator.of(context).pushReplacementNamed('/home');
    }
  },
  builder: (context, state) {
    // UI यहाँ
    if (state is AuthLoading) {
      return const CircularProgressIndicator();
    } else if (state is AuthError) {
      return Text(state.message);
    }
    return const SizedBox.shrink();
  },
);
```

### MultiBlocProvider: Multiple BLoCs

```dart
class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider(create: (context) => AuthBloc(authService)),
        BlocProvider(create: (context) => CartBloc(cartService)),
        BlocProvider(create: (context) => UserPreferencesCubit(storage)),
      ],
      child: MaterialApp(
        home: const HomePage(),
      ),
    );
  }
}
```

---

## Real App Example: Auth Flow with Error Handling

चलो एक **production-like auth flow** बनाते हैं जहाँ:
- Login, Signup, Logout
- Error handling (invalid credentials, network errors)
- Loading states
- State persistence (saved credentials)

### 1. Domain Models

```dart
// lib/domain/entities/user.dart
import 'package:equatable/equatable.dart';

class User extends Equatable {
  final String id;
  final String email;
  final String name;
  final String? profileImageUrl;

  const User({
    required this.id,
    required this.email,
    required this.name,
    this.profileImageUrl,
  });

  @override
  List<Object?> get props => [id, email, name, profileImageUrl];
}
```

### 2. Repository (Data Layer)

```dart
// lib/data/repositories/auth_repository.dart
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

abstract class AuthRepository {
  Future<User> login(String email, String password);
  Future<User> signup(String email, String password, String name);
  Future<void> logout();
  Future<User?> getStoredUser();
}

class AuthRepositoryImpl implements AuthRepository {
  AuthRepositoryImpl({
    required this.httpClient,
    required this.secureStorage,
  });

  final http.Client httpClient;
  final FlutterSecureStorage secureStorage;
  static const String _baseUrl = 'https://api.example.com';

  @override
  Future<User> login(String email, String password) async {
    try {
      final response = await httpClient.post(
        Uri.parse('$_baseUrl/auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'email': email,
          'password': password,
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final user = User(
          id: data['user']['id'],
          email: data['user']['email'],
          name: data['user']['name'],
          profileImageUrl: data['user']['profileImageUrl'],
        );
        final token = data['token'];
        
        // Token को secure storage में save करो
        await secureStorage.write(key: 'auth_token', value: token);
        await secureStorage.write(
          key: 'user_data',
          value: jsonEncode({
            'id': user.id,
            'email': user.email,
            'name': user.name,
            'profileImageUrl': user.profileImageUrl,
          }),
        );

        return user;
      } else if (response.statusCode == 401) {
        throw InvalidCredentialsException('Invalid email or password');
      } else {
        throw ServerException('Server error: ${response.statusCode}');
      }
    } on SocketException {
      throw NetworkException('No internet connection');
    }
  }

  @override
  Future<User> signup(String email, String password, String name) async {
    try {
      final response = await httpClient.post(
        Uri.parse('$_baseUrl/auth/signup'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'email': email,
          'password': password,
          'name': name,
        }),
      );

      if (response.statusCode == 201) {
        final data = jsonDecode(response.body);
        final user = User(
          id: data['user']['id'],
          email: data['user']['email'],
          name: data['user']['name'],
        );
        final token = data['token'];

        await secureStorage.write(key: 'auth_token', value: token);
        await secureStorage.write(
          key: 'user_data',
          value: jsonEncode({
            'id': user.id,
            'email': user.email,
            'name': user.name,
          }),
        );

        return user;
      } else if (response.statusCode == 400) {
        throw InvalidCredentialsException('Email already exists or invalid data');
      } else {
        throw ServerException('Server error: ${response.statusCode}');
      }
    } on SocketException {
      throw NetworkException('No internet connection');
    }
  }

  @override
  Future<void> logout() async {
    await secureStorage.delete(key: 'auth_token');
    await secureStorage.delete(key: 'user_data');
  }

  @override
  Future<User?> getStoredUser() async {
    try {
      final userDataStr = await secureStorage.read(key: 'user_data');
      if (userDataStr == null) return null;

      final data = jsonDecode(userDataStr);
      return User(
        id: data['id'],
        email: data['email'],
        name: data['name'],
        profileImageUrl: data['profileImageUrl'],
      );
    } catch (e) {
      return null;
    }
  }
}

// Custom exceptions
class NetworkException implements Exception {
  final String message;
  NetworkException(this.message);
}

class InvalidCredentialsException implements Exception {
  final String message;
  InvalidCredentialsException(this.message);
}

class ServerException implements Exception {
  final String message;
  ServerException(this.message);
}
```

### 3. BLoC with Events and States

```dart
// lib/presentation/bloc/auth_event.dart
abstract class AuthEvent extends Equatable {
  const AuthEvent();

  @override
  List<Object?> get props => [];
}

class LoginRequested extends AuthEvent {
  final String email;
  final String password;

  const LoginRequested(this.email, this.password);

  @override
  List<Object?> get props => [email, password];
}

class SignupRequested extends AuthEvent {
  final String email;
  final String password;
  final String name;

  const SignupRequested(this.email, this.password, this.name);

  @override
  List<Object?> get props => [email, password, name];
}

class LogoutRequested extends AuthEvent {
  const LogoutRequested();
}

class AppStarted extends AuthEvent {
  const AppStarted();
}

// lib/presentation/bloc/auth_state.dart
abstract class AuthState extends Equatable {
  const AuthState();

  @override
  List<Object?> get props => [];
}

class AuthInitial extends AuthState {
  const AuthInitial();
}

class AuthLoading extends AuthState {
  const AuthLoading();
}

class AuthSuccess extends AuthState {
  final User user;

  const AuthSuccess(this.user);

  @override
  List<Object?> get props => [user];
}

class AuthError extends AuthState {
  final String message;

  const AuthError(this.message);

  @override
  List<Object?> get props => [message];
}

// lib/presentation/bloc/auth_bloc.dart
class AuthBloc extends Bloc<AuthEvent, AuthState> {
  AuthBloc({required this.authRepository}) : super(const AuthInitial()) {
    on<AppStarted>(_onAppStarted);
    on<LoginRequested>(_onLoginRequested);
    on<SignupRequested>(_onSignupRequested);
    on<LogoutRequested>(_onLogoutRequested);
  }

  final AuthRepository authRepository;

  Future<void> _onAppStarted(
    AppStarted event,
    Emitter<AuthState> emit,
  ) async {
    // App launch पर check करो कि कोई saved user है या नहीं
    final user = await authRepository.getStoredUser();
    if (user != null) {
      emit(AuthSuccess(user));
    }
  }

  Future<void> _onLoginRequested(
    LoginRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(const AuthLoading());
    try {
      final user = await authRepository.login(event.email, event.password);
      emit(AuthSuccess(user));
    } on InvalidCredentialsException catch (e) {
      emit(AuthError(e.message));
    } on NetworkException catch (e) {
      emit(AuthError(e.message));
    } on ServerException catch (e) {
      emit(AuthError(e.message));
    } catch (e) {
      emit(AuthError('An unexpected error occurred'));
    }
  }

  Future<void> _onSignupRequested(
    SignupRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(const AuthLoading());
    try {
      final user = await authRepository.signup(
        event.email,
        event.password,
        event.name,
      );
      emit(AuthSuccess(user));
    } on InvalidCredentialsException catch (e) {
      emit(AuthError(e.message));
    } on NetworkException catch (e) {
      emit(AuthError(e.message));
    } catch (e) {
      emit(AuthError('An unexpected error occurred'));
    }
  }

  Future<void> _onLogoutRequested(
    LogoutRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(const AuthLoading());
    try {
      await authRepository.logout();
      emit(const AuthInitial());
    } catch (e) {
      emit(AuthError('Logout failed: ${e.toString()}'));
    }
  }
}
```

### 4. UI Integration

```dart
// lib/presentation/screens/login_screen.dart
class LoginScreen extends StatefulWidget {
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Login')),
      body: BlocConsumer<AuthBloc, AuthState>(
        listener: (context, state) {
          if (state is AuthSuccess) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Login successful!')),
            );
            Navigator.of(context).pushReplacementNamed('/home');
          } else if (state is AuthError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(state.message)),
            );
          }
        },
        builder: (context, state) {
          return SingleChildScrollView(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                TextField(
                  controller: _emailController,
                  decoration: const InputDecoration(
                    labelText: 'Email',
                    border: OutlineInputBorder(),
                  ),
                  enabled: state is! AuthLoading,
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _passwordController,
                  decoration: const InputDecoration(
                    labelText: 'Password',
                    border: OutlineInputBorder(),
                  ),
                  obscureText: true,
                  enabled: state is! AuthLoading,
                ),
                const SizedBox(height: 24),
                if (state is AuthLoading)
                  const CircularProgressIndicator()
                else
                  ElevatedButton(
                    onPressed: () {
                      context.read<AuthBloc>().add(
                            LoginRequested(
                              _emailController.text,
                              _passwordController.text,
                            ),
                          );
                    },
                    child: const Text('Login'),
                  ),
                const SizedBox(height: 16),
                TextButton(
                  onPressed: () {
                    Navigator.of(context).pushNamed('/signup');
                  },
                  child: const Text('Don\'t have an account? Sign up'),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

// lib/presentation/screens/home_screen.dart
class HomeScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Home'),
        actions: [
          IconButton(
            onPressed: () {
              context.read<AuthBloc>().add(const LogoutRequested());
            },
            icon: const Icon(Icons.logout),
          ),
        ],
      ),
      body: BlocBuilder<AuthBloc, AuthState>(
        builder: (context, state) {
          if (state is AuthSuccess) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CircleAvatar(
                    backgroundImage: state.user.profileImageUrl != null
                        ? NetworkImage(state.user.profileImageUrl!)
                        : null,
                    child: state.user.profileImageUrl == null
                        ? const Icon(Icons.person)
                        : null,
                  ),
                  const SizedBox(height: 16),
                  Text('Welcome, ${state.user.name}!'),
                  Text('Email: ${state.user.email}'),
                ],
              ),
            );
          }
          return const SizedBox.shrink();
        },
      ),
    );
  }
}

// lib/main.dart
void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp();

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider(
          create: (context) => AuthBloc(
            authRepository: AuthRepositoryImpl(
              httpClient: http.Client(),
              secureStorage: const FlutterSecureStorage(),
            ),
          )..add(const AppStarted()), // App launch पर check saved user
        ),
      ],
      child: MaterialApp(
        title: 'Auth App',
        theme: ThemeData(primarySwatch: Colors.blue),
        home: BlocBuilder<AuthBloc, AuthState>(
          builder: (context, state) {
            if (state is AuthInitial) {
              return const Scaffold(
                body: Center(child: CircularProgressIndicator()),
              );
            } else if (state is AuthSuccess) {
              return HomeScreen();
            } else {
              return LoginScreen();
            }
          },
        ),
        routes: {
          '/login': (context) => LoginScreen(),
          '/signup': (context) => SignupScreen(),
          '/home': (context) => HomeScreen(),
        },
      ),
    );
  }
}
```

---

## Testing BLoCs: Unit Tests बिना UI के

**यही BLoC का सबसे बड़ा फायदा है** — testing बहुत आसान हो जाता है।

### Setup

```yaml
dev_dependencies:
  flutter_test:
    sdk: flutter
  bloc_test: ^9.0.0
  mocktail: ^1.0.0
```

### Mock Repository

```dart
// test/mocks/mock_auth_repository.dart
import 'package:mocktail/mocktail.dart';
import 'package:your_app/data/repositories/auth_repository.dart';

class MockAuthRepository extends Mock implements AuthRepository {}
```

### Test Cases

```dart
// test/presentation/bloc/auth_bloc_test.dart
import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

void main() {
  group('AuthBloc', () {
    late AuthBloc authBloc;
    late MockAuthRepository mockAuthRepository;

    setUp(() {
      mockAuthRepository = MockAuthRepository();
      authBloc = AuthBloc(authRepository: mockAuthRepository);
    });

    tearDown(() {
      authBloc.close();
    });

    final testUser = User(
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
    );

    group('LoginRequested', () {
      blocTest<AuthBloc, AuthState>(
        'emits [AuthLoading, AuthSuccess] when login succeeds',
        setUp: () {
          when(() => mockAuthRepository.login('test@example.com', 'password'))
              .thenAnswer((_) async => testUser);
        },
        build: () => authBloc,
        act: (bloc) => bloc.add(
          const LoginRequested('test@example.com', 'password'),
        ),
        expect: () => [
          const AuthLoading(),
          AuthSuccess(testUser),
        ],
      );

      blocTest<AuthBloc, AuthState>(
        'emits [AuthLoading, AuthError] when login fails with invalid credentials',
        setUp: () {
          when(() => mockAuthRepository.login('test@example.com', 'wrong'))
              .thenThrow(InvalidCredentialsException('Invalid credentials'));
        },
        build: () => authBloc,
        act: (bloc) => bloc.add(
          const LoginRequested('test@example.com', 'wrong'),
        ),
        expect: () => [
          const AuthLoading(),
          const AuthError('Invalid credentials'),
        ],
      );

      blocTest<AuthBloc, AuthState>(
        'emits [AuthLoading, AuthError] when network fails',
        setUp: () {
          when(() => mockAuthRepository.login('test@example.com', 'password'))
              .thenThrow(NetworkException('No internet'));
        },
        build: () => authBloc,
        act: (bloc) => bloc.add(
          const LoginRequested('test@example.com', 'password'),
        ),
        expect: () => [
          const AuthLoading(),
          const AuthError('No internet'),
        ],
      );
    });

    group('SignupRequested', () {
      blocTest<AuthBloc, AuthState>(
        'emits [AuthLoading, AuthSuccess] when signup succeeds',
        setUp: () {
          when(() => mockAuthRepository.signup(
            'new@example.com',
            'password',
            'New User',
          )).thenAnswer((_) async => testUser);
        },
        build: () => authBloc,
        act: (bloc) => bloc.add(
          const SignupRequested('new@example.com', 'password', 'New User'),
        ),
        expect: () => [
          const AuthLoading(),
          AuthSuccess(testUser),
        ],
      );
    });

    group('LogoutRequested', () {
      blocTest<AuthBloc, AuthState>(
        'emits [AuthLoading, AuthInitial] when logout succeeds',
        setUp: () {
          when(() => mockAuthRepository.logout())
              .thenAnswer((_) async => {});
        },
        build: () => authBloc,
        act: (bloc) => bloc.add(const LogoutRequested()),
        expect: () => [
          const AuthLoading(),
          const AuthInitial(),
        ],
      );
    });

    group('AppStarted', () {
      blocTest<AuthBloc, AuthState>(
        'emits [AuthSuccess] when user is stored',
        setUp: () {
          when(() => mockAuthRepository.getStoredUser())
              .thenAnswer((_) async => testUser);
        },
        build: () => authBloc,
        act: (bloc) => bloc.add(const AppStarted()),
        expect: () => [
          AuthSuccess(testUser),
        ],
      );

      blocTest<AuthBloc, AuthState>(
        'emits nothing when no stored user',
        setUp: () {
          when(() => mockAuthRepository.getStoredUser())
              .thenAnswer((_) async => null);
        },
        build: () => authBloc,
        act: (bloc) => bloc.add(const AppStarted()),
        expect: () => [],
      );
    });
  });
}
```

**Run tests:**

```bash
flutter test test/presentation/bloc/auth_bloc_test.dart
```

---

## Team-Scale Patterns: Multiple BLoCs, Clean Architecture

Jब बड़ी team हो, तो **proper folder structure** और **clear separation** ज़रूरी है।

### Folder Structure

```
lib/
├── data/
│   ├── datasources/
│   │   ├── remote_data_source.dart
│   │   └── local_data_source.dart
│   ├── models/
│   │   ├── user_model.dart
│   │   └── post_model.dart
│   └── repositories/
│       ├── auth_repository_impl.dart
│       └── post_repository_impl.dart
├── domain/
│   ├── entities/
│   │   ├── user.dart
│   │   └── post.dart
│   └── repositories/
│       ├── auth_repository.dart
│       └── post_repository.dart
├── presentation/
│   ├── bloc/
│   │   ├── auth/
│   │   │   ├── auth_bloc.dart
│   │   │   ├── auth_event.dart
│   │   │   └── auth_state.dart
│   │   └── post/
│   │       ├── post_bloc.dart
│   │       ├── post_event.dart
│   │       └── post_state.dart
│   ├── pages/
│   │   ├── auth/
│   │   │   ├── login_page.dart
│   │   │   └── signup_page.dart
│   │   └── home/
│   │       ├── home_page.dart
│   │       └── widgets/
│   │           └── post_widget.dart
│   └── routes/
│       └── app_router.dart
├── core/
│   ├── constants/
│   └── utils/
└── main.dart
```

### One BLoC Per Feature Rule

**Zomato की तरह सोचो:**
- Auth feature → AuthBloc
- Restaurant search → SearchBloc  
- Cart management → CartBloc
- Order tracking → OrderBloc
- User profile → ProfileBloc

हर feature का एक dedicated BLoC होता है जो सिर्फ उस feature से related events handle करता है।

### Multi-BLoC Dependency

कभी-कभी एक BLoC को दूसरे BLoC की state चाहिए:

```dart
class CartBloc extends Bloc<CartEvent, CartState> {
  CartBloc({
    required this.cartRepository,
    required this.authBloc, // Dependency injection
  }) : super(const CartInitial()) {
    // AuthBloc के state changes को listen करो
    _authListener = authBloc.stream.listen(_onAuthStateChanged);
    
    on<AddToCartRequested>(_onAddToCart);
  }

  final CartRepository cartRepository;
  final AuthBloc authBloc;
  late StreamSubscription<AuthState> _authListener;

  void _onAuthStateChanged(AuthState state) {
    if (state is AuthInitial) {
      // User logged out, clear cart
      emit(const CartInitial());
    }
  }

  @override
  Future<void> close() {
    _authListener.cancel();
    return super.close();
  }

  Future<void> _onAddToCart(
    AddToCartRequested event,
    Emitter<CartState> emit,
  ) async {
    // Ensure user is logged in
    if (authBloc.state is! AuthSuccess) {
      emit(const CartError('Please login first'));
      return;
    }

    // Rest of logic...
  }
}
```

या, **बेहतर तरीका** — separate BloCs को एक stream के through communicate करना:

```dart
// Event bus pattern (या simple StreamController)
class EventBus {
  static final _instance = EventBus._();
  final _controller = StreamController.broadcast();

  EventBus._();

  factory EventBus() => _instance;

  Stream get events => _controller.stream;

  void fire(dynamic event) => _controller.add(event);
}

// Usage
class CartBloc extends Bloc<CartEvent, CartState> {
  CartBloc({required this.cartRepository}) : super(const CartInitial()) {
    EventBus().events.listen((event) {
      if (event is UserLoggedOutEvent) {
        emit(const CartInitial());
      }
    });
  }

  // ...
}
```

---

## Concurrency Handling: Parallel Events

BLoC automatically event queue को manage करता है, लेकिन concurrent operations (जैसे parallel API calls) explicitly handle कर सकते हो।

```dart
class SearchBloc extends Bloc<SearchEvent, SearchState> {
  SearchBloc({required this.searchRepository}) : super(const SearchInitial()) {
    // Default: events एक-एक करके process होते हैं (sequential)
    on<SearchQueryChanged>(_onQueryChanged);

    // लेकिन अगर तुम concurrent करना चाहो (parallel requests):
    on<SearchQueryChanged>(
      _onQueryChanged,
      transformer: concurrent(), // Parallel events को allow करता है
    );
  }

  final SearchRepository searchRepository;

  Future<void> _onQueryChanged(
    SearchQueryChanged event,
    Emitter<SearchState> emit,
  ) async {
    emit(const SearchLoading());
    try {
      final results = await searchRepository.search(event.query);
      emit(SearchSuccess(results));
    } catch (e) {
      emit(SearchError(e.toString()));
    }
  }
}
```

**Sequential vs Concurrent:**

```dart
// Sequential (default)
Event1 → Process → Emit
Event2 → (wait) → Process → Emit
Event3 → (wait) → Process → Emit

// Concurrent
Event1 ─────► Process ──►
Event2 ─────► Process ──► All emit simultaneously
Event3 ─────► Process ──►
```

---

## BLoC vs Riverpod: कब कौन use करें?

दोनों state management solutions हैं, लेकिन फिलोसफी अलग है।

| Criteria | BLoC | Riverpod |
|----------|------|---------|
| **Learning Curve** | Steep (events, states, explicit) | Shallow (functional style) |
| **Boilerplate** | High (events, states classes) | Low (providers) |
| **For Simple State** | Overkill (use Cubit) | Better |
| **For Complex Flows** | Excellent | Good |
| **Team Coordination** | Enforces structure (good) | Loose (can be messy) |
| **Testing** | Very easy (pure functions) | Very easy (can mock providers) |
| **Performance** | Excellent | Excellent |
| **HotReload** | Good | Excellent |
| **Production Apps** | Proven, industry standard | Growing popularity |

### फैसला का logic:

```dart
// ✅ BLoC use करो जब:
// 1. Complex business logic हो (auth flow, payment, filters)
// 2. बड़ी team हो जहाँ consistency चाहिए
// 3. Event-driven behavior explicitly model करना हो
// 4. Testing बहुत जरूरी हो

// ✅ Riverpod use करो जब:
// 1. Simple computed state हो (favorites, filter toggle)
// 2. Rapid prototyping कर रहे हो
// 3. Team छोटी हो
// 4. Code reusability जरूरी हो (providers को easily combine कर सको)

// 🤝 दोनों mix करो:
// BLoC for features (auth, cart, orders)
// Riverpod for utilities (theme, locale, simple prefs)
```

---

## Performance Optimization Tips

### 1. Don't Emit Unnecessary States

```dart
// ❌ Bad: हर character change पर search करना
on<SearchQueryChanged>((event, emit) async {
  emit(SearchLoading());
  final results = await repository.search(event.query);
  emit(SearchSuccess(results));
});

// ✅ Good: Debounce करो
on<SearchQueryChanged>(
  (event, emit) async {
    emit(SearchLoading());
    final results = await repository.search(event.query);
    emit(SearchSuccess(results));
  },
  transformer: debounceTime(const Duration(milliseconds: 500)),
);
```

### 2. Use Equatable Properly

```dart
// ✅ अगर state fields same हैं, तो अलग emit न करो
class SearchSuccess extends SearchState {
  final List<Item> items;
  const SearchSuccess(this.items);

  @override
  List<Object?> get props => [items]; // Equatable auto-compares
}
```

### 3. Close BLoCs Properly

```dart
// ✅ Always close BLoCs in MultiBlocProvider
BlocProvider(
  create: (context) => MyBloc(),
  child: MyWidget(),
) // Close() automatically called by Flutter
```

---

## Common Gotchas

### 1. Infinite Loops: State Listener Creating New Events

```dart
// ❌ Careful! हो सकता है infinite loop बन जाए
BlocListener<MyBloc, MyState>(
  listener: (context, state) {
    if (state is LoadingState) {
      context.read<MyBloc>().add(AnotherEvent()); // Careful!
    }
  },
);
```

### 2. Accessing BLoC Before Initialization

```dart
// ❌ Wrong: BLoC अभी initialize नहीं हुआ
@override
void initState() {
  context.read<MyBloc>().add(InitEvent()); // May fail
}

// ✅ Correct: WidgetsBinding.instance.addPostFrameCallback में
@override
void initState() {
  super.initState();
  WidgetsBinding.instance.addPostFrameCallback((_) {
    context.read<MyBloc>().add(InitEvent());
  });
}
```

### 3. Multiple Instances of Same BLoC

```dart
// ❌ Wrong: हर बार नया instance बनता है
@override
Widget build(BuildContext context) {
  return BlocProvider(
    create: (context) => MyBloc(), // हर rebuild पर नया BLoC!
    child: MyWidget(),
  );
}

// ✅ Correct: Provide करो, create न करो
@override
Widget build(BuildContext context) {
  return BlocProvider(
    create: (context) => MyBloc(),
    child: MyWidget(),
  );
}

// या, better: top-level मein provide करो
class MyApp {
  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider(create: (_) => MyBloc()), // एक बार
      ],
      child: MaterialApp(...),
    );
  }
}
```

---

## Key Takeaways

- **BLoC = Business Logic Component** — UI को business logic से अलग करने का design pattern है, जिससे code testable, reusable, और maintainable बनता है।

- **Cubit vs BLoC**: Cubit simple features के लिए (state methods), BLoC complex flows के लिए (event-driven)।

- **Event-State Cycle**: UI events trigger करता है → BLoC event handle करता है → state emit करता है → UI update होता है। Pure functional, testable।

- **flutter_bloc Package**: 
  - `BlocBuilder` — UI rebuild करने के लिए
  - `BlocListener` — side effects के लिए (toast, navigation)
  - `BlocConsumer` — दोनों combined
  - `MultiBlocProvider` — multiple BLoCs inject करने के लिए

- **Testing**: BLoCs को unit test करना सबसे आसान है क्योंकि pure state machines हैं। Mock repository, add events, verify state transitions। `bloc_test` package से बहुत straightforward।

- **Team Scale Patterns**:
  - One BLoC per feature (auth, cart, search, etc.)
  - Proper folder structure (data/domain/presentation layers)
  - Avoid tight coupling between BLoCs
  - Use event bus या dependency injection for inter-BLoC communication

- **BLoC vs Riverpod**: BLoC बड़ी teams के लिए, explicit structure enforce करता है। Riverpod fast और lightweight है। दोनों को mix भी कर सकते हो।

- **Performance**: Debounce unnecessary events, equatable states properly, close BLoCs explicitly।

- **Common Pitfalls**: Infinite loops से बचो, BLoC initialization का timing सही रखो, multiple instances create न करो।

- **Production Ready**: BLoC Firebase, state persistence, push notifications, offline-first apps सब में काम करता है। Proven pattern है।
