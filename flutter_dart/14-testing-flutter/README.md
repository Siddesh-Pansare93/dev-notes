# Testing Flutter — Unit, Widget, Integration Tests, Golden Tests

Socho ek second ke liye — jab tum Zomato par koi naya feature launch karte ho, poora app break ho jayega na agar kisi choti si cheez galat ho gaye? Isliye testing zaroori hai. Flutter mein testing ka poora ecosystem hai: unit tests, widget tests, integration tests, aur golden tests. Ye sab milke ek safety net banate hain jo ensure karta hai ki app production mein properly kaam kare.

Testing ke through tum sirf bugs dhundh nahi rahe — tum confidence build kar rahe ho ki code predictable hai, maintainable hai, aur future mein changes karte time kuch break nahi hoga.

---

## Testing Pyramid: Architecture Samajho

```
        /\
       /  \     Integration Tests (10%)
      /____\    "Pura app ek sath kaam kar raha hai na?"
     /      \
    /  Widget \  Widget Tests (20%)
   / Tests    \ "UI components properly render ho rahe hain?"
  /____________\
 /              \
/  Unit Tests    \ Unit Tests (70%)
/  (Logic, BLoCs) \ "Business logic sahi kaam kar raha hai?"
/__________________\
```

**Pyramid ka logic:**
- **Unit Tests** (70%) — fastest, cheapest to write, BLoCs/providers/functions test karte ho
- **Widget Tests** (20%) — medium speed, UI components verify karte ho without full app
- **Integration Tests** (10%) — slowest, pura app real scenario mein test karte ho

Ye pyramid ka order important hai. Zyada unit tests likho (fast feedback), phir widget tests, phir thoda integration tests.

---

## Unit Tests: BLoCs, Riverpod, Providers

### Kya Hota Hai?

Unit tests pure business logic ko test karte hain — no BuildContext, no widgets, no UI rendering. Sirf functions, classes, state management ko.

### Setup: pubspec.yaml

```yaml
dev_dependencies:
  flutter_test:
    sdk: flutter
  mockito: ^5.4.0
  bloc_test: ^9.1.0  # if using BLoC
```

### Example 1: Simple Function Test

```dart
// lib/calculators/tip_calculator.dart
double calculateTip(double billAmount, double tipPercent) {
  return billAmount * (tipPercent / 100);
}

// test/calculators/tip_calculator_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:my_app/calculators/tip_calculator.dart';

void main() {
  group('TipCalculator', () {
    test('calculate 20% tip on 500 rupees', () {
      final result = calculateTip(500, 20);
      expect(result, 100); // 500 * 0.20 = 100
    });

    test('calculate 15% tip on 1000 rupees', () {
      final result = calculateTip(1000, 15);
      expect(result, 150);
    });

    test('0% tip returns 0', () {
      final result = calculateTip(500, 0);
      expect(result, 0);
    });
  });
}
```

Run: `flutter test test/calculators/tip_calculator_test.dart`

### Example 2: BLoC Testing (No Mocking)

Jab BLoC hota hai, poora state management test karna padta hai. `bloc_test` package use karte hain.

```dart
// lib/features/counter/bloc/counter_bloc.dart
import 'package:flutter_bloc/flutter_bloc.dart';

abstract class CounterEvent {}

class IncrementEvent extends CounterEvent {}
class DecrementEvent extends CounterEvent {}

class CounterState {
  final int count;
  CounterState(this.count);
}

class CounterBloc extends Bloc<CounterEvent, CounterState> {
  CounterBloc() : super(CounterState(0)) {
    on<IncrementEvent>((event, emit) {
      emit(CounterState(state.count + 1));
    });

    on<DecrementEvent>((event, emit) {
      emit(CounterState(state.count - 1));
    });
  }
}

// test/features/counter/bloc/counter_bloc_test.dart
import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:my_app/features/counter/bloc/counter_bloc.dart';

void main() {
  group('CounterBloc', () {
    late CounterBloc counterBloc;

    setUp(() {
      counterBloc = CounterBloc();
    });

    tearDown(() {
      counterBloc.close();
    });

    blocTest<CounterBloc, CounterState>(
      'emits [CounterState(1)] when IncrementEvent is added',
      build: () => counterBloc,
      act: (bloc) => bloc.add(IncrementEvent()),
      expect: () => [
        CounterState(1),
      ],
    );

    blocTest<CounterBloc, CounterState>(
      'emits [CounterState(-1)] when DecrementEvent is added',
      build: () => counterBloc,
      act: (bloc) => bloc.add(DecrementEvent()),
      expect: () => [
        CounterState(-1),
      ],
    );

    blocTest<CounterBloc, CounterState>(
      'multiple events: +1, +1, -1 = 1',
      build: () => counterBloc,
      act: (bloc) {
        bloc.add(IncrementEvent());
        bloc.add(IncrementEvent());
        bloc.add(DecrementEvent());
      },
      expect: () => [
        CounterState(1),
        CounterState(2),
        CounterState(1),
      ],
    );
  });
}
```

**Kya ho raha hai:**
- `setUp()` — har test se pehle new BLoC create karte ho
- `tearDown()` — har test ke baad BLoC close karte ho (cleanup)
- `blocTest()` — build (BLoC create), act (event add), expect (states verify)

### Example 3: Riverpod Provider Testing

```dart
// lib/providers/user_provider.dart
import 'package:flutter_riverpod/flutter_riverpod.dart';

class User {
  final String name;
  final int age;
  User({required this.name, required this.age});
}

final userProvider = StateNotifierProvider<UserNotifier, User>((ref) {
  return UserNotifier();
});

class UserNotifier extends StateNotifier<User> {
  UserNotifier() : super(User(name: 'Guest', age: 0));

  void setUser(String name, int age) {
    state = User(name: name, age: age);
  }

  void incrementAge() {
    state = User(name: state.name, age: state.age + 1);
  }
}

// test/providers/user_provider_test.dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:my_app/providers/user_provider.dart';

void main() {
  group('UserProvider', () {
    test('initial state is Guest with age 0', () {
      final container = ProviderContainer();
      final user = container.read(userProvider);
      expect(user.name, 'Guest');
      expect(user.age, 0);
    });

    test('setUser updates state', () {
      final container = ProviderContainer();
      container.read(userProvider.notifier).setUser('Siddesh', 25);
      final user = container.read(userProvider);
      expect(user.name, 'Siddesh');
      expect(user.age, 25);
    });

    test('incrementAge increases age by 1', () {
      final container = ProviderContainer();
      container.read(userProvider.notifier).setUser('Siddesh', 25);
      container.read(userProvider.notifier).incrementAge();
      final user = container.read(userProvider);
      expect(user.age, 26);
    });
  });
}
```

> [!tip] **ProviderContainer kya hai?** 
> Ye ek isolated environment hai Riverpod providers ko test karne ke liye. Real app mein tum `ConsumerWidget` ya `ProviderListener` use karte ho, tests mein `ProviderContainer` standalone provide karta hai.

---

## Widget Tests: UI Components Ko Verify Karo

### Kya Hota Hai?

Widget tests render Flutter UI components (without full app), interact with them (tap, type, scroll), aur verify karte ho ki UI sahi dikhi rahi hai.

### Setup: Test Environment

```dart
// test/widgets/counter_widget_test.dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:my_app/features/counter/counter_screen.dart';

void main() {
  // Isse pehle har test ke liye widget tree setup hota hai
  group('CounterScreen Widget Tests', () {
    testWidgets('CounterScreen renders correctly', (WidgetTester tester) async {
      // Step 1: Widget tree mein CounterScreen render karo
      await tester.pumpWidget(
        MaterialApp(
          home: CounterScreen(),
        ),
      );

      // Step 2: Verify karo ki widgets render hue
      expect(find.text('Counter'), findsOneWidget);
      expect(find.text('0'), findsWidgets); // Initial count
      expect(find.byIcon(Icons.add), findsOneWidget);
    });
  });
}
```

### Finding Widgets

Widget tree mein elements find karne ke ways:

```dart
testWidgets('finding widgets demo', (WidgetTester tester) async {
  await tester.pumpWidget(
    MaterialApp(
      home: Scaffold(
        body: Column(
          children: [
            Text('Hello'),
            ElevatedButton(
              onPressed: () {},
              child: Text('Tap Me'),
            ),
          ],
        ),
      ),
    ),
  );

  // Text ke through
  expect(find.text('Hello'), findsOneWidget);
  expect(find.text('NonExistent'), findsNothing);

  // Widget type ke through
  expect(find.byType(ElevatedButton), findsOneWidget);
  expect(find.byType(Text), findsWidgets); // Multiple
  expect(find.byType(Scaffold), findsOneWidget);

  // Icon ke through
  expect(find.byIcon(Icons.add), findsOneWidget);

  // Matcher ke through (more powerful)
  expect(
    find.byWidgetPredicate(
      (widget) => widget is Text && widget.data == 'Hello',
    ),
    findsOneWidget,
  );

  // Key ke through
  expect(find.byKey(ValueKey('submit-button')), findsOneWidget);
});
```

### Interaction: Tap, Type, Scroll

```dart
testWidgets('CounterScreen increment on tap', (WidgetTester tester) async {
  await tester.pumpWidget(
    MaterialApp(
      home: CounterScreen(), // Mein ElevatedButton hai '+' icon ke sath
    ),
  );

  // Initial count check
  expect(find.text('0'), findsOneWidget);

  // '+' button tap karo
  await tester.tap(find.byIcon(Icons.add));
  await tester.pump(); // Re-render after tap

  // Count 1 ho gaya check karo
  expect(find.text('1'), findsOneWidget);
  expect(find.text('0'), findsNothing);
});
```

**`pump()` vs `pumpAndSettle()`:**
- `pump()` — single frame re-render
- `pumpAndSettle()` — animations complete hone tak wait karo

```dart
testWidgets('TextField input test', (WidgetTester tester) async {
  await tester.pumpWidget(
    MaterialApp(
      home: Scaffold(
        body: TextField(
          decoration: InputDecoration(hintText: 'Enter name'),
        ),
      ),
    ),
  );

  // TextField find karo
  final textFieldFinder = find.byType(TextField);

  // "Siddesh" type karo
  await tester.enterText(textFieldFinder, 'Siddesh');
  await tester.pump();

  // Typed text verify karo
  expect(find.text('Siddesh'), findsOneWidget);
});
```

### Widget Test: Complete Example

```dart
// lib/screens/login_screen.dart
import 'package:flutter/material.dart';

class LoginScreen extends StatefulWidget {
  final Function(String email, String password) onLoginPressed;

  const LoginScreen({required this.onLoginPressed});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLoading = false;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _handleLogin() {
    setState(() => _isLoading = true);
    widget.onLoginPressed(
      _emailController.text,
      _passwordController.text,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Login')),
      body: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          children: [
            TextField(
              controller: _emailController,
              decoration: InputDecoration(hintText: 'Email'),
              key: ValueKey('email-field'),
            ),
            SizedBox(height: 16),
            TextField(
              controller: _passwordController,
              obscureText: true,
              decoration: InputDecoration(hintText: 'Password'),
              key: ValueKey('password-field'),
            ),
            SizedBox(height: 24),
            ElevatedButton(
              onPressed: _isLoading ? null : _handleLogin,
              child: _isLoading ? CircularProgressIndicator() : Text('Login'),
              key: ValueKey('login-button'),
            ),
          ],
        ),
      ),
    );
  }
}

// test/screens/login_screen_test.dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:my_app/screens/login_screen.dart';

void main() {
  group('LoginScreen Widget Tests', () {
    testWidgets('renders email and password fields', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: LoginScreen(onLoginPressed: (_, __) {}),
        ),
      );

      expect(find.byKey(ValueKey('email-field')), findsOneWidget);
      expect(find.byKey(ValueKey('password-field')), findsOneWidget);
      expect(find.byKey(ValueKey('login-button')), findsOneWidget);
    });

    testWidgets('login button disabled when loading', (WidgetTester tester) async {
      bool loginPressed = false;

      await tester.pumpWidget(
        MaterialApp(
          home: LoginScreen(
            onLoginPressed: (email, password) {
              loginPressed = true;
            },
          ),
        ),
      );

      // Email and password enter karo
      await tester.enterText(
        find.byKey(ValueKey('email-field')),
        'test@example.com',
      );
      await tester.enterText(
        find.byKey(ValueKey('password-field')),
        'password123',
      );
      await tester.pump();

      // Login button tap karo
      await tester.tap(find.byKey(ValueKey('login-button')));
      await tester.pump(); // State update ke liye

      // Loading indicator visible hona chahiye
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      expect(loginPressed, true);
    });

    testWidgets('form validation: empty email shows error', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: LoginScreen(onLoginPressed: (_, __) {}),
        ),
      );

      // Sirf password enter karo, email empty raho
      await tester.enterText(
        find.byKey(ValueKey('password-field')),
        'password123',
      );
      await tester.tap(find.byKey(ValueKey('login-button')));
      await tester.pump();

      // Callback called hoga even with empty email
      // (Real app mein tum validation add kar sakte ho)
    });
  });
}
```

---

## Integration Tests: Full App Flow

### Kya Hota Hai?

Integration tests poora app launch karte hain (real device ya emulator par) aur end-to-end user scenarios test karte hain. E.g., "user login → home screen → add todo → verify in list".

### Setup: integration_test Package

```yaml
dev_dependencies:
  integration_test:
    sdk: flutter
  flutter_test:
    sdk: flutter
```

Create test file: `test_driver/integration_test.dart` (optional, manual setup ke liye)

Simpler: `integration_test/app_test.dart`

### Example: E2E Todo App Test

```dart
// lib/main.dart
import 'package:flutter/material.dart';

void main() {
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Todo App',
      home: TodoListScreen(),
    );
  }
}

class TodoListScreen extends StatefulWidget {
  @override
  State<TodoListScreen> createState() => _TodoListScreenState();
}

class _TodoListScreenState extends State<TodoListScreen> {
  final List<String> _todos = [];
  final _controller = TextEditingController();

  void _addTodo() {
    if (_controller.text.isNotEmpty) {
      setState(() {
        _todos.add(_controller.text);
        _controller.clear();
      });
    }
  }

  void _removeTodo(int index) {
    setState(() => _todos.removeAt(index));
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('My Todos')),
      body: Column(
        children: [
          Padding(
            padding: EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _controller,
                    decoration: InputDecoration(hintText: 'Add a todo'),
                    key: ValueKey('todo-input'),
                  ),
                ),
                SizedBox(width: 8),
                ElevatedButton(
                  onPressed: _addTodo,
                  child: Text('Add'),
                  key: ValueKey('add-button'),
                ),
              ],
            ),
          ),
          Expanded(
            child: _todos.isEmpty
                ? Center(child: Text('No todos yet'))
                : ListView.builder(
                    itemCount: _todos.length,
                    itemBuilder: (context, index) {
                      return ListTile(
                        title: Text(_todos[index]),
                        trailing: IconButton(
                          icon: Icon(Icons.delete),
                          onPressed: () => _removeTodo(index),
                          key: ValueKey('delete-$index'),
                        ),
                        key: ValueKey('todo-$index'),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}

// integration_test/app_test.dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:my_app/main.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  group('Todo App E2E Tests', () {
    testWidgets('add and delete todo', (WidgetTester tester) async {
      // App launch karo
      await tester.binding.window.physicalSizeTestValue = Size(1080, 1920);
      addTearDown(tester.binding.window.clearPhysicalSizeTestValue);

      app.main();
      await tester.pumpAndSettle();

      // Initially "No todos yet" message dikhe
      expect(find.text('No todos yet'), findsOneWidget);

      // First todo add karo
      await tester.enterText(
        find.byKey(ValueKey('todo-input')),
        'Buy milk',
      );
      await tester.tap(find.byKey(ValueKey('add-button')));
      await tester.pumpAndSettle();

      // Todo list mein dikhe
      expect(find.text('Buy milk'), findsOneWidget);
      expect(find.byKey(ValueKey('todo-0')), findsOneWidget);

      // Second todo add karo
      await tester.enterText(
        find.byKey(ValueKey('todo-input')),
        'Code review',
      );
      await tester.tap(find.byKey(ValueKey('add-button')));
      await tester.pumpAndSettle();

      expect(find.text('Code review'), findsOneWidget);

      // First todo delete karo
      await tester.tap(find.byKey(ValueKey('delete-0')));
      await tester.pumpAndSettle();

      // "Buy milk" gone hona chahiye
      expect(find.text('Buy milk'), findsNothing);
      // "Code review" still there
      expect(find.text('Code review'), findsOneWidget);
    });

    testWidgets('empty input does not add todo', (WidgetTester tester) async {
      app.main();
      await tester.pumpAndSettle();

      // Add button tap karo without input
      await tester.tap(find.byKey(ValueKey('add-button')));
      await tester.pumpAndSettle();

      // No todo added
      expect(find.text('No todos yet'), findsOneWidget);
    });
  });
}
```

**Run integration tests:**
```bash
# Device/emulator pe
flutter test integration_test/app_test.dart

# Ya web par
flutter test integration_test/app_test.dart -d web-server
```

---

## Golden Tests: Screenshot Comparisons

### Kya Hota Hai?

Golden tests ek widget ka screenshot le karte hain, baseline image save karte hain, phir har run mein compare karte hain. Agar UI change hota hai, test fail hota hai aur tum compare kar sakte ho.

**Use cases:** Design consistency (branding, responsive layouts), regression detection.

### Setup

```yaml
dev_dependencies:
  golden_toolkit: ^0.14.0  # Optional, advanced features ke liye
```

### Simple Golden Test

```dart
// test/widgets/card_widget_golden_test.dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:my_app/widgets/product_card.dart';

void main() {
  group('Golden Tests - ProductCard', () {
    testWidgets('ProductCard renders correctly', (WidgetTester tester) async {
      // Screen size set karo (important!)
      tester.binding.window.physicalSizeTestValue = Size(400, 600);
      addTearDown(tester.binding.window.clearPhysicalSizeTestValue);

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Padding(
              padding: EdgeInsets.all(16),
              child: ProductCard(
                title: 'Biryani',
                price: 350,
                imageUrl: 'https://via.placeholder.com/300',
              ),
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Ye screenshot save/compare karta hai
      await expectLater(
        find.byType(ProductCard),
        matchesGoldenFile('goldens/product_card.png'),
      );
    });

    testWidgets('ProductCard in dark mode', (WidgetTester tester) async {
      tester.binding.window.physicalSizeTestValue = Size(400, 600);
      addTearDown(tester.binding.window.clearPhysicalSizeTestValue);

      await tester.pumpWidget(
        MaterialApp(
          theme: ThemeData.dark(),
          home: Scaffold(
            body: Padding(
              padding: EdgeInsets.all(16),
              child: ProductCard(
                title: 'Biryani',
                price: 350,
                imageUrl: 'https://via.placeholder.com/300',
              ),
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();

      await expectLater(
        find.byType(ProductCard),
        matchesGoldenFile('goldens/product_card_dark.png'),
      );
    });
  });
}
```

**File structure:**
```
project/
  test/
    widgets/
      card_widget_golden_test.dart
  test/goldens/  # Golden files stored here
    product_card.png
    product_card_dark.png
```

### Generate Golden Files (First Run)

```bash
# Update all golden files (create if not exist)
flutter test test/widgets/card_widget_golden_test.dart --update-goldens
```

Phir normal test run:
```bash
flutter test test/widgets/card_widget_golden_test.dart
```

### Advanced: Multiple Screen Sizes

```dart
testWidgets('ProductCard responsive', (WidgetTester tester) async {
  final sizes = [
    Size(375, 812),   // iPhone
    Size(412, 915),   // Pixel
    Size(600, 900),   // Tablet small
  ];

  for (final size in sizes) {
    tester.binding.window.physicalSizeTestValue = size;
    addTearDown(tester.binding.window.clearPhysicalSizeTestValue);

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: ProductCard(title: 'Biryani', price: 350),
        ),
      ),
    );

    await tester.pumpAndSettle();

    await expectLater(
      find.byType(ProductCard),
      matchesGoldenFile('goldens/product_card_${size.width.toInt()}.png'),
    );

    await tester.binding.window.clearPhysicalSizeTestValue();
  }
});
```

> [!warning] **Golden Tests Care:**
> - `matchesGoldenFile()` screen size dependent hai — har size ke liye alag golden file save karo
> - Fonts, animations, timing sabkuch exact match hona chahiye
> - Font variations hote to different systems par different screenshots aa sakte hain (use `skipGoldenAssertion` in CI for debugging)

---

## Real Example: Comprehensive Test Suite (Todo App)

Ek complete, production-ready project banate hain with all test types.

### Project Structure

```
my_todo_app/
  lib/
    main.dart
    models/
      todo.dart
    repositories/
      todo_repository.dart
    blocs/
      todo_bloc.dart
    screens/
      home_screen.dart
    widgets/
      todo_item.dart
  test/
    unit/
      models/
        todo_test.dart
      repositories/
        todo_repository_test.dart
      blocs/
        todo_bloc_test.dart
    widget/
      widgets/
        todo_item_test.dart
      screens/
        home_screen_test.dart
    goldens/
      (golden images)
  integration_test/
    app_test.dart
```

### Models & Repository

```dart
// lib/models/todo.dart
class Todo {
  final String id;
  final String title;
  final bool isCompleted;

  Todo({
    required this.id,
    required this.title,
    required this.isCompleted,
  });

  Todo copyWith({String? id, String? title, bool? isCompleted}) {
    return Todo(
      id: id ?? this.id,
      title: title ?? this.title,
      isCompleted: isCompleted ?? this.isCompleted,
    );
  }
}

// lib/repositories/todo_repository.dart
import 'package:my_app/models/todo.dart';

abstract class TodoRepository {
  Future<List<Todo>> getTodos();
  Future<void> addTodo(Todo todo);
  Future<void> updateTodo(Todo todo);
  Future<void> deleteTodo(String id);
}

class InMemoryTodoRepository implements TodoRepository {
  final List<Todo> _todos = [];

  @override
  Future<List<Todo>> getTodos() async => _todos;

  @override
  Future<void> addTodo(Todo todo) async => _todos.add(todo);

  @override
  Future<void> updateTodo(Todo todo) async {
    final index = _todos.indexWhere((t) => t.id == todo.id);
    if (index != -1) _todos[index] = todo;
  }

  @override
  Future<void> deleteTodo(String id) async {
    _todos.removeWhere((t) => t.id == id);
  }
}
```

### BLoC

```dart
// lib/blocs/todo_bloc.dart
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:uuid/uuid.dart';
import 'package:my_app/models/todo.dart';
import 'package:my_app/repositories/todo_repository.dart';

abstract class TodoEvent {}
class LoadTodos extends TodoEvent {}
class AddTodo extends TodoEvent {
  final String title;
  AddTodo(this.title);
}
class ToggleTodo extends TodoEvent {
  final String id;
  ToggleTodo(this.id);
}
class DeleteTodo extends TodoEvent {
  final String id;
  DeleteTodo(this.id);
}

class TodoState {
  final List<Todo> todos;
  final bool isLoading;
  final String? error;

  TodoState({
    required this.todos,
    required this.isLoading,
    this.error,
  });

  TodoState copyWith({List<Todo>? todos, bool? isLoading, String? error}) {
    return TodoState(
      todos: todos ?? this.todos,
      isLoading: isLoading ?? this.isLoading,
      error: error ?? this.error,
    );
  }
}

class TodoBloc extends Bloc<TodoEvent, TodoState> {
  final TodoRepository repository;
  static const _uuid = Uuid();

  TodoBloc({required this.repository})
      : super(TodoState(todos: [], isLoading: false)) {
    on<LoadTodos>(_onLoadTodos);
    on<AddTodo>(_onAddTodo);
    on<ToggleTodo>(_onToggleTodo);
    on<DeleteTodo>(_onDeleteTodo);
  }

  Future<void> _onLoadTodos(LoadTodos event, Emitter<TodoState> emit) async {
    emit(state.copyWith(isLoading: true));
    try {
      final todos = await repository.getTodos();
      emit(state.copyWith(todos: todos, isLoading: false));
    } catch (e) {
      emit(state.copyWith(isLoading: false, error: e.toString()));
    }
  }

  Future<void> _onAddTodo(AddTodo event, Emitter<TodoState> emit) async {
    final newTodo = Todo(
      id: _uuid.v4(),
      title: event.title,
      isCompleted: false,
    );
    await repository.addTodo(newTodo);
    final todos = await repository.getTodos();
    emit(state.copyWith(todos: todos));
  }

  Future<void> _onToggleTodo(ToggleTodo event, Emitter<TodoState> emit) async {
    final todo = state.todos.firstWhere((t) => t.id == event.id);
    await repository.updateTodo(todo.copyWith(isCompleted: !todo.isCompleted));
    final todos = await repository.getTodos();
    emit(state.copyWith(todos: todos));
  }

  Future<void> _onDeleteTodo(DeleteTodo event, Emitter<TodoState> emit) async {
    await repository.deleteTodo(event.id);
    final todos = await repository.getTodos();
    emit(state.copyWith(todos: todos));
  }
}
```

### Unit Tests

```dart
// test/unit/models/todo_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:my_app/models/todo.dart';

void main() {
  group('Todo Model', () {
    test('copyWith updates only specified fields', () {
      final original = Todo(id: '1', title: 'Buy milk', isCompleted: false);
      final updated = original.copyWith(isCompleted: true);

      expect(updated.id, '1');
      expect(updated.title, 'Buy milk');
      expect(updated.isCompleted, true);
    });

    test('two todos with same data are not equal (no equality override)', () {
      final todo1 = Todo(id: '1', title: 'Buy milk', isCompleted: false);
      final todo2 = Todo(id: '1', title: 'Buy milk', isCompleted: false);
      // Without @override equatable, these are different objects
      expect(todo1, isNot(todo2));
    });
  });
}

// test/unit/repositories/todo_repository_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:my_app/models/todo.dart';
import 'package:my_app/repositories/todo_repository.dart';

void main() {
  late TodoRepository repository;

  setUp(() {
    repository = InMemoryTodoRepository();
  });

  group('InMemoryTodoRepository', () {
    test('addTodo and getTodos', () async {
      final todo = Todo(id: '1', title: 'Test', isCompleted: false);
      await repository.addTodo(todo);
      final todos = await repository.getTodos();
      expect(todos.length, 1);
      expect(todos[0].title, 'Test');
    });

    test('updateTodo changes existing todo', () async {
      final todo = Todo(id: '1', title: 'Original', isCompleted: false);
      await repository.addTodo(todo);
      await repository.updateTodo(todo.copyWith(isCompleted: true));
      final todos = await repository.getTodos();
      expect(todos[0].isCompleted, true);
    });

    test('deleteTodo removes from list', () async {
      final todo = Todo(id: '1', title: 'To delete', isCompleted: false);
      await repository.addTodo(todo);
      await repository.deleteTodo('1');
      final todos = await repository.getTodos();
      expect(todos.isEmpty, true);
    });
  });
}

// test/unit/blocs/todo_bloc_test.dart
import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:my_app/blocs/todo_bloc.dart';
import 'package:my_app/models/todo.dart';
import 'package:my_app/repositories/todo_repository.dart';

void main() {
  late TodoBloc todoBloc;
  late TodoRepository mockRepository;

  setUp(() {
    mockRepository = InMemoryTodoRepository();
    todoBloc = TodoBloc(repository: mockRepository);
  });

  tearDown(() {
    todoBloc.close();
  });

  group('TodoBloc', () {
    blocTest<TodoBloc, TodoState>(
      'LoadTodos emits [loading, success]',
      build: () => todoBloc,
      act: (bloc) => bloc.add(LoadTodos()),
      expect: () => [
        isA<TodoState>().having((s) => s.isLoading, 'isLoading', true),
        isA<TodoState>().having((s) => s.isLoading, 'isLoading', false),
      ],
    );

    blocTest<TodoBloc, TodoState>(
      'AddTodo adds new todo to list',
      build: () => todoBloc,
      act: (bloc) {
        bloc.add(AddTodo('Buy groceries'));
      },
      verify: (bloc) async {
        expect(bloc.state.todos.length, 1);
        expect(bloc.state.todos[0].title, 'Buy groceries');
      },
    );

    blocTest<TodoBloc, TodoState>(
      'ToggleTodo changes isCompleted',
      setUp: () async {
        mockRepository.addTodo(
          Todo(id: '1', title: 'Test', isCompleted: false),
        );
      },
      build: () => TodoBloc(repository: mockRepository),
      act: (bloc) {
        bloc.add(LoadTodos());
      },
      verify: (bloc) async {
        bloc.add(ToggleTodo('1'));
        await Future.delayed(Duration(milliseconds: 100));
        expect(bloc.state.todos[0].isCompleted, true);
      },
    );
  });
}
```

### Widget Tests

```dart
// test/widget/screens/home_screen_test.dart
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:my_app/blocs/todo_bloc.dart';
import 'package:my_app/models/todo.dart';
import 'package:my_app/repositories/todo_repository.dart';
import 'package:my_app/screens/home_screen.dart';

void main() {
  late TodoRepository repository;
  late TodoBloc todoBloc;

  setUp(() {
    repository = InMemoryTodoRepository();
    todoBloc = TodoBloc(repository: repository);
  });

  tearDown(() {
    todoBloc.close();
  });

  testWidgets('HomeScreen renders empty state', (WidgetTester tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: BlocProvider<TodoBloc>.value(
          value: todoBloc,
          child: HomeScreen(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('No todos yet'), findsOneWidget);
  });

  testWidgets('HomeScreen displays added todos', (WidgetTester tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: BlocProvider<TodoBloc>.value(
          value: todoBloc,
          child: HomeScreen(),
        ),
      ),
    );

    // Add todo
    await tester.enterText(find.byType(TextField), 'Buy milk');
    await tester.tap(find.byIcon(Icons.add));
    await tester.pumpAndSettle();

    expect(find.text('Buy milk'), findsOneWidget);
  });

  testWidgets('HomeScreen toggle todo completion', (WidgetTester tester) async {
    await repository.addTodo(
      Todo(id: '1', title: 'Buy milk', isCompleted: false),
    );
    todoBloc.add(LoadTodos());
    await tester.pumpAndSettle();

    await tester.pumpWidget(
      MaterialApp(
        home: BlocProvider<TodoBloc>.value(
          value: todoBloc,
          child: HomeScreen(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    // Checkbox tap karo
    await tester.tap(find.byType(Checkbox).first);
    await tester.pumpAndSettle();

    // Verify checked state
    expect(find.byType(Checkbox), findsOneWidget);
  });
}
```

### Integration Test

```dart
// integration_test/app_test.dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:my_app/main.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  group('Todo App E2E', () {
    testWidgets('Complete user journey', (WidgetTester tester) async {
      app.main();
      await tester.pumpAndSettle();

      // Empty state dikhe
      expect(find.text('No todos yet'), findsOneWidget);

      // Todo 1 add karo
      await tester.enterText(
        find.byType(TextField),
        'Learn Flutter',
      );
      await tester.tap(find.byIcon(Icons.add));
      await tester.pumpAndSettle();

      expect(find.text('Learn Flutter'), findsOneWidget);

      // Todo 2 add karo
      await tester.enterText(
        find.byType(TextField),
        'Write tests',
      );
      await tester.tap(find.byIcon(Icons.add));
      await tester.pumpAndSettle();

      expect(find.text('Write tests'), findsOneWidget);

      // First todo mark complete
      final checkboxes = find.byType(Checkbox);
      await tester.tap(checkboxes.first);
      await tester.pumpAndSettle();

      // Delete second todo
      final deleteButtons = find.byIcon(Icons.delete);
      await tester.tap(deleteButtons.last);
      await tester.pumpAndSettle();

      // "Write tests" gone
      expect(find.text('Write tests'), findsNothing);
      // "Learn Flutter" still there
      expect(find.text('Learn Flutter'), findsOneWidget);
    });
  });
}
```

---

## CI/CD Integration: GitHub Actions

Testing ko automated banate hain CI/CD mein.

### .github/workflows/test.yml

```yaml
name: Flutter Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Flutter
        uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.13.0'
      
      - name: Get dependencies
        run: flutter pub get
      
      - name: Run unit & widget tests
        run: flutter test
      
      - name: Run integration tests
        run: flutter test integration_test/app_test.dart
      
      - name: Generate coverage report
        run: flutter test --coverage
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

### Run Tests Locally

```bash
# Sabhi tests
flutter test

# Sirf unit tests
flutter test test/unit/

# Sirf widget tests
flutter test test/widget/

# Sirf integration tests (emulator/device required)
flutter test integration_test/

# Coverage ke sath
flutter test --coverage

# Check coverage file
cat coverage/lcov.info
```

---

## Test Coverage: Know Your Coverage

Coverage track karte ho `--coverage` flag ke sath.

```bash
flutter test --coverage
# Creates coverage/lcov.info
```

Install `lcov` (macOS/Linux):
```bash
# macOS
brew install lcov

# Linux
sudo apt-get install lcov
```

Generate HTML report:
```bash
genhtml coverage/lcov.info -o coverage/html
open coverage/html/index.html  # macOS
```

### Coverage Guidelines

**Target percentages:**
- Business logic (BLoCs, models, repos): 80%+
- UI widgets: 60%+ (UI changes fast, pero key interactions covered)
- Utils: 100% if practical

**pubspec.yaml mein add karo:**
```yaml
scripts:
  test:coverage:
    run: flutter test --coverage && genhtml coverage/lcov.info -o coverage/html
```

Phir: `flutter pub run test:coverage`

---

## Testing Best Practices

### Do's ✅

1. **Fast = More tests** — unit tests 1-5ms mein run ho jayein, zyada likho
2. **Arrange-Act-Assert pattern** — setup → action → verify
3. **Descriptive test names** — `testWidgets('incrementButton tap increases count by 1', ...)`
4. **Test one thing per test** — ek scenario, ek expect
5. **Mock externals** — APIs, databases; don't mock business logic
6. **Use test fixtures** — setUp/tearDown reuse, data builders
7. **CI/CD integration** — tests run on every push
8. **Coverage monitoring** — track trends

### Don'ts ❌

1. **Test implementation details** — test behavior, nahi internal state (unless public)
2. **Shared state between tests** — har test independent hona chahiye
3. **Hardcoded delays** — `await Future.delayed(...)` bad; use `pumpAndSettle()`
4. **Large snapshots/goldens** — version control nightmare
5. **Mocking everything** — sirf externals mock karo, business logic test karo
6. **Flaky tests** — timing issues resolve karo, retry logic mat likho

---

## Debugging Failed Tests

### Test Failure Kaise Debug Karo?

```dart
testWidgets('debug example', (WidgetTester tester) async {
  await tester.pumpWidget(MyApp());

  // Print widget tree
  addTearDown(tester.printToConsole);

  // Find something
  final finder = find.byType(Text);
  
  // Inspect
  if (finder.evaluate().isEmpty) {
    print('❌ Text widget not found!');
    // Print all widgets
    debugPrintBeginFrame = true;
  }

  // Take screenshot for debugging
  await tester.binding.takeScreenshot('debug_screenshot.png');

  expect(finder, findsOneWidget);
});
```

Run with verbose:
```bash
flutter test -v test/my_test.dart
```

### Widget Tree Inspection

```dart
testWidgets('inspect widget tree', (WidgetTester tester) async {
  await tester.pumpWidget(MyApp());

  // Print entire tree
  print(tester.getSemantics(find.byType(Scaffold)));

  // Find by predicate
  final textWidgets = find.byWidgetPredicate(
    (widget) => widget is Text && widget.data?.contains('Hello') == true,
  );
  
  expect(textWidgets, findsOneWidget);
});
```

---

## Key Takeaways

- **Testing Pyramid:** 70% unit (fast), 20% widget (medium), 10% integration (slow) — pyramid follow karo
- **Unit Tests:** Business logic test karte ho — BLoCs, Riverpod providers, functions — no UI rendering
- **Widget Tests:** UI components check karte ho — finding (text, type, icon), interactions (tap, type), verification
- **Integration Tests:** Full app flow test karte ho — real device/emulator, end-to-end scenarios
- **Golden Tests:** Screenshot regression detection — baseline image save → compare on every run
- **BLoC Testing:** `blocTest()` use karo — build → act (event) → expect (states)
- **Riverpod Testing:** `ProviderContainer` isolated environment deta hai
- **No Mocking Business Logic:** Mocking sirf externals (APIs, DBs); actual business logic test karo
- **CI/CD:** GitHub Actions mein tests automate karo — every push par run
- **Coverage:** 80%+ business logic, 60%+ UI; trends track karo
- **Debugging:** `-v` flag, `printToConsole`, widget tree inspection use karo
- **Best Practice:** Fast tests likho (unit), descriptive names rakho, one thing per test
