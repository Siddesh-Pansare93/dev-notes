# Riverpod — Modern Reactive State, Family, AsyncNotifier, Integration Testing

Socho ek second ke liye — jab tum Node.js mein dependency injection (DI) aur reactive streams dono use karte ho, aur dono ko ek jagah standardized, testable, zero-boilerplate way mein manage karte ho... vo shakl ho gaya Riverpod!

Riverpod (Riverpod = "Provider" read backwards, clever naming, na?) Flutter ka **modern reactive state management solution** hai jo Provider ko improve karte hue nayi generation ka approach introduce karta hai. Agar tum backend se aa rahe ho to socho — **state management = dependency injection + reactive data flow + automatic reactivity**.

## Why Riverpod Over Provider?

Pehle samajhte hain ke kya problem Provider mein thi:

| Aspect | Provider | Riverpod |
|--------|----------|----------|
| **Scoping** | String-based, error-prone | Type-safe, compile-time checked |
| **Testing** | Complex override logic | Built-in `ProviderContainer`, ref-based overrides |
| **Boilerplate** | StateNotifier classes, manual | @riverpod macro, auto-generated |
| **Family params** | Manual logic, nested providers | First-class `.family` modifier |
| **Async** | FutureProvider (basic) | AsyncNotifier (richer patterns) |
| **Performance** | Partial rebuilds | Smart invalidation, selective watch |
| **DevTools** | None | Official Riverpod DevTools |

**Real-world analogy**: Provider jaise tum Zomato ka old version use kar rahe ho jisme manually har cheez specify karna padta tha. Riverpod jaise naya Zomato hai jo automatically suggestions deta hai, cache manage karta hai, aur error handling built-in hai.

---

## Core Concepts — Riverpod ki Terminology

### 1. **Provider** — The Building Block

Provider hai Riverpod ka "data source". Ye ek immutable, reusable, testable container hai jo:
- **Lazy compute** karta hai (jab pehli baar access ho tab evaluate hota hai)
- **Cache karta hai** computed value ko
- **Reactivity handle karta hai** — jab dependency change ho to dependent providers automatically re-run hote hain

```dart
// Simplest provider — ek constant value
final greetingProvider = Provider((ref) {
  return 'Namaste, Siddesh!';
});

// Access karte hain:
// - UI mein: Consumer widget ke through
// - Code mein: ref.watch() se
```

### 2. **ref** — The Magic Parameter

Har provider ka first parameter hota hai `ProviderRef ref`. Ye hota hai Riverpod ka "context" — jisme:
- **`ref.watch(otherProvider)`** — dependency create karo aur subscribe karo (reactive)
- **`ref.listen(otherProvider, (prev, next) {})`** — side-effects ke liye
- **`ref.onDispose(() {})`** — cleanup logic
- **`ref.invalidate(provider)`** — provider ko invalidate karo (cache clear ho)

```dart
final countProvider = StateProvider((ref) => 0);

final doubleCountProvider = Provider((ref) {
  final count = ref.watch(countProvider);
  print('doubleCountProvider re-computed');
  return count * 2;
});

// doubleCountProvider depend karta hai countProvider par
// Jab count change ho, doubleCountProvider automatically re-evaluate hota hai
```

### 3. **StateProvider vs StateNotifierProvider**

**StateProvider** — simple, mutable value ke liye (like `useState` in React):
```dart
// Counter ka state: ek integer
final counterProvider = StateProvider((ref) => 0);

// Read karte hain:
// ref.watch(counterProvider)  → 0

// Modify karte hain:
// ref.read(counterProvider.notifier).state = 1;
```

**StateNotifierProvider** — complex state logic ke liye (like Redux reducer):
```dart
class TodosNotifier extends StateNotifier<List<Todo>> {
  TodosNotifier() : super([]);
  
  void addTodo(String title) {
    state = [...state, Todo(id: DateTime.now().toString(), title: title)];
  }
  
  void removeTodo(String id) {
    state = state.where((t) => t.id != id).toList();
  }
}

final todosProvider = StateNotifierProvider<TodosNotifier, List<Todo>>((ref) {
  return TodosNotifier();
});

// Use:
// ref.read(todosProvider.notifier).addTodo('Buy milk');
```

---

## FutureProvider & AsyncNotifier — Async Data Handling

Jab API call karna hota hai ya database query run karna hota hai, tab `FutureProvider` use karte hain.

### FutureProvider — Simple Async

```dart
// Simple API call
final postsProvider = FutureProvider<List<Post>>((ref) async {
  final response = await http.get(Uri.parse('https://jsonplaceholder.typicode.com/posts'));
  if (response.statusCode == 200) {
    return jsonDecode(response.body)
        .map((p) => Post.fromJson(p))
        .toList();
  }
  throw Exception('Failed to load posts');
});

// Use in widget:
// ref.watch(postsProvider) return karta hai: AsyncValue<List<Post>>
//   → AsyncValue.loading
//   → AsyncValue.data(List<Post>)
//   → AsyncValue.error(Exception)
```

### AsyncNotifier — Richer Patterns

Jab complex async state logic chahiye (like Zomato ka "fetch orders, filter by status, cache locally"), tab `AsyncNotifier` use karte hain:

```dart
class TodosAsyncNotifier extends AsyncNotifier<List<Todo>> {
  TodosAsyncNotifier();
  
  @override
  FutureOr<List<Todo>> build() async {
    // Initial data fetch
    final response = await http.get(
      Uri.parse('https://jsonplaceholder.typicode.com/todos'),
    );
    
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return data.map((t) => Todo.fromJson(t)).toList();
    }
    throw Exception('Failed to load todos');
  }
  
  Future<void> addTodo(String title) async {
    // Optimistic update karte hain
    final previousState = state;
    state = AsyncValue.loading();
    
    try {
      final response = await http.post(
        Uri.parse('https://jsonplaceholder.typicode.com/todos'),
        body: jsonEncode({'title': title, 'completed': false}),
      );
      
      if (response.statusCode == 201) {
        final newTodo = Todo.fromJson(jsonDecode(response.body));
        
        // Recompute: server se latest fetch karo
        state = await AsyncValue.guard(() => build());
      }
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      // Revert to previous state on error
      Future.delayed(Duration(seconds: 2), () {
        state = previousState;
      });
    }
  }
  
  Future<void> removeTodo(String id) async {
    try {
      await http.delete(
        Uri.parse('https://jsonplaceholder.typicode.com/todos/$id'),
      );
      state = await AsyncValue.guard(() => build());
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }
}

final todosAsyncProvider = AsyncNotifierProvider<TodosAsyncNotifier, List<Todo>>(
  () => TodosAsyncNotifier(),
);
```

---

## StreamProvider — Continuous Data Flow

Jab real-time data chahiye (like Firebase updates, WebSockets, or sensor data):

```dart
final chatMessagesProvider = StreamProvider<List<Message>>((ref) {
  // Firestore se real-time updates
  return FirebaseFirestore.instance
      .collection('chats')
      .doc('room1')
      .collection('messages')
      .orderBy('timestamp', descending: true)
      .limit(50)
      .snapshots()
      .map((snapshot) {
        return snapshot.docs
            .map((doc) => Message.fromJson(doc.data()))
            .toList();
      });
});

// Use:
// ref.watch(chatMessagesProvider) → AsyncValue<List<Message>>
```

---

## @riverpod Macro — Zero Boilerplate

Riverpod 2.0+ mein aaya @riverpod annotation jo auto-generates code. Iska matlab:

```dart
// BEFORE (manual StateNotifierProvider)
class CounterNotifier extends StateNotifier<int> {
  CounterNotifier() : super(0);
  void increment() => state++;
}

final counterProvider = StateNotifierProvider<CounterNotifier, int>(
  (ref) => CounterNotifier(),
);

// AFTER (@riverpod macro)
@riverpod
class Counter extends _$Counter {
  @override
  int build() => 0;
  
  void increment() => state++;
}

// Access: ref.read(counterProvider.notifier).increment()
```

More advanced macro examples:

```dart
// Simple provider
@riverpod
String greeting(ref) {
  return 'Namaste!';
}
// Access: ref.watch(greetingProvider)

// Async provider
@riverpod
Future<List<Post>> posts(ref) async {
  final response = await http.get(Uri.parse('https://...'));
  return jsonDecode(response.body)
      .map((p) => Post.fromJson(p))
      .toList();
}
// Access: ref.watch(postsProvider) → AsyncValue<List<Post>>

// Stateful with methods
@riverpod
class ShoppingCart extends _$ShoppingCart {
  @override
  List<Item> build() => [];
  
  void addItem(Item item) => state = [...state, item];
  void removeItem(String itemId) => state = state.where((i) => i.id != itemId).toList();
  double get total => state.fold(0, (sum, item) => sum + item.price);
}
// Access: ref.watch(shoppingCartProvider)
```

**Why @riverpod?**
- Less boilerplate code
- Auto-generates provider instances (`counterProvider` auto-created)
- Type-safe
- DevTools integration out-of-the-box

---

## Family Modifier — Parameterized Providers

Socho Zomato mein — har restaurant ka notifications alag hota hai, par logic same hota hai. Tum har restaurant ke liye alag provider nahin banate, sirf parameters different dete ho.

**Family** modifier tab use hote hain:

```dart
// Ek provider jo restaurant ke liye todos fetch karte hain
@riverpod
Future<List<Todo>> restaurantTodos(ref, String restaurantId) async {
  final response = await http.get(
    Uri.parse('https://api.example.com/restaurants/$restaurantId/todos'),
  );
  return jsonDecode(response.body)
      .map((t) => Todo.fromJson(t))
      .toList();
}

// Use in multiple widgets:
// Widget 1: restaurant "zomato123" ke liye
// ref.watch(restaurantTodosProvider('zomato123'))

// Widget 2: restaurant "swiggy456" ke liye
// ref.watch(restaurantTodosProvider('swiggy456'))

// Dono independently cache hote hain, alag-alag update hote hain
```

With StateNotifierProvider + family:

```dart
@riverpod
class RestaurantNotifier extends _$RestaurantNotifier {
  @override
  Future<Restaurant> build(String restaurantId) async {
    return await fetchRestaurant(restaurantId);
  }
  
  Future<void> updateName(String newName) async {
    state = const AsyncValue.loading();
    try {
      final updated = await updateRestaurantName(restaurantId, newName);
      state = AsyncValue.data(updated);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }
}

// Use:
// ref.watch(restaurantNotifierProvider('zomato123'))
// ref.read(restaurantNotifierProvider('zomato123').notifier).updateName('New Name')
```

---

## Consumer & Consumer Widgets — UI Integration

Riverpod UI mein read karte hain `Consumer` widget ke through:

### Consumer Widget

```dart
class TodoListScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final todosAsync = ref.watch(todosAsyncProvider);
    
    return Scaffold(
      appBar: AppBar(title: const Text('My Todos')),
      body: todosAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(child: Text('Error: $err')),
        data: (todos) {
          return ListView.builder(
            itemCount: todos.length,
            itemBuilder: (context, index) {
              final todo = todos[index];
              return ListTile(
                title: Text(todo.title),
                trailing: IconButton(
                  icon: const Icon(Icons.delete),
                  onPressed: () {
                    ref.read(todosAsyncProvider.notifier).removeTodo(todo.id);
                  },
                ),
              );
            },
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showAddTodoDialog(context, ref),
        child: const Icon(Icons.add),
      ),
    );
  }
  
  void _showAddTodoDialog(BuildContext context, WidgetRef ref) {
    final controller = TextEditingController();
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Add Todo'),
        content: TextField(controller: controller),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          TextButton(
            onPressed: () {
              ref.read(todosAsyncProvider.notifier).addTodo(controller.text);
              Navigator.pop(context);
            },
            child: const Text('Add'),
          ),
        ],
      ),
    );
  }
}
```

### Consumer Hook (with `flutter_hooks`)

Agar tum hooks use karte ho (React developers ko familiar):

```dart
class CounterDisplay extends HookConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Hooks aur Riverpod dono use kar sakte ho
    final count = ref.watch(counterProvider);
    final animationController = useAnimationController(duration: const Duration(milliseconds: 300));
    
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text('Count: $count', style: const TextStyle(fontSize: 24)),
          ElevatedButton(
            onPressed: () => ref.read(counterProvider.notifier).increment(),
            child: const Text('Increment'),
          ),
        ],
      ),
    );
  }
}
```

### ref.listen() — Side-Effects

Jab API call ke baad koi action karna hota hai (like navigate to new screen, show snackbar):

```dart
class TodoAddButton extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Listen to todosAsyncProvider — jab state change ho to callback run hota hai
    ref.listen<AsyncValue<List<Todo>>>(todosAsyncProvider, (previous, next) {
      next.whenData((todos) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Todos updated! Total: ${todos.length}')),
        );
      });
      
      next.whenError((error, st) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $error')),
        );
      });
    });
    
    return ElevatedButton(
      onPressed: () {
        ref.read(todosAsyncProvider.notifier).addTodo('New task');
      },
      child: const Text('Add Todo'),
    );
  }
}
```

---

## Testing Riverpod — No UI Required

Riverpod ka best feature: **testing UI logic without building UI**. Backend developers ko ye familiar hoga — dependency injection ka exactly fayda!

### Basic Provider Testing

```dart
void main() {
  group('Providers', () {
    test('greetingProvider returns correct greeting', () {
      // ProviderContainer bante hain — ye Riverpod ka "test environment" hai
      final container = ProviderContainer();
      
      // Provider ko read karte hain
      final greeting = container.read(greetingProvider);
      
      expect(greeting, 'Namaste, Siddesh!');
    });
    
    test('doubleCountProvider watches countProvider', () {
      final container = ProviderContainer();
      
      // Initial value
      expect(container.read(doubleCountProvider), 0);
      
      // Modify countProvider
      container.read(countProvider.notifier).state = 5;
      
      // doubleCountProvider automatically updated
      expect(container.read(doubleCountProvider), 10);
    });
  });
}
```

### Testing StateNotifierProvider

```dart
void main() {
  group('TodosNotifier', () {
    test('addTodo adds item to state', () {
      final container = ProviderContainer();
      
      container.read(todosProvider.notifier).addTodo('Buy milk');
      container.read(todosProvider.notifier).addTodo('Buy bread');
      
      final todos = container.read(todosProvider);
      expect(todos.length, 2);
      expect(todos[0].title, 'Buy milk');
      expect(todos[1].title, 'Buy bread');
    });
    
    test('removeTodo removes item from state', () {
      final container = ProviderContainer();
      
      container.read(todosProvider.notifier).addTodo('Task 1');
      final todos = container.read(todosProvider);
      final firstTodo = todos.first;
      
      container.read(todosProvider.notifier).removeTodo(firstTodo.id);
      
      expect(container.read(todosProvider).length, 0);
    });
  });
}
```

### Testing AsyncNotifierProvider with Mocks

```dart
// Mock HTTP client
class MockHttpClient extends Mock implements http.Client {}

void main() {
  group('TodosAsyncNotifier', () {
    test('build() fetches todos from API', () async {
      final mockClient = MockHttpClient();
      
      // Mock API response
      when(mockClient.get(any)).thenAnswer((_) async => http.Response(
        jsonEncode([
          {'id': '1', 'title': 'Todo 1', 'completed': false},
          {'id': '2', 'title': 'Todo 2', 'completed': true},
        ]),
        200,
      ));
      
      // Override httpClientProvider (ya jo bhi DI use karte ho)
      final container = ProviderContainer(
        overrides: [
          httpClientProvider.overrideWithValue(mockClient),
        ],
      );
      
      final todosAsync = await container.read(todosAsyncProvider.future);
      
      expect(todosAsync.length, 2);
      expect(todosAsync[0].title, 'Todo 1');
    });
    
    test('addTodo updates state and refetches', () async {
      final mockClient = MockHttpClient();
      
      // First call: initial fetch
      when(mockClient.get(any)).thenAnswer((_) async => http.Response(
        jsonEncode([{'id': '1', 'title': 'Todo 1', 'completed': false}]),
        200,
      ));
      
      // Second call: add new todo
      when(mockClient.post(any, body: anyNamed('body'))).thenAnswer((_) async => http.Response(
        jsonEncode({'id': '2', 'title': 'New Todo', 'completed': false}),
        201,
      ));
      
      final container = ProviderContainer(
        overrides: [httpClientProvider.overrideWithValue(mockClient)],
      );
      
      // Initial state
      var todosAsync = await container.read(todosAsyncProvider.future);
      expect(todosAsync.length, 1);
      
      // Add todo
      await container.read(todosAsyncProvider.notifier).addTodo('New Todo');
      
      // Verify refetch happened (in real scenario, you'd verify post was called)
      verify(mockClient.post(any, body: anyNamed('body'))).called(1);
    });
  });
}
```

### Testing with Overrides (Dependency Injection)

```dart
void main() {
  group('Integration tests with overrides', () {
    test('countProvider increments correctly with mock data', () {
      final container = ProviderContainer(
        overrides: [
          // Override providers for testing
          someConfigProvider.overrideWithValue('test-config'),
          counterProvider.overrideWithValue(10), // Start with 10
        ],
      );
      
      expect(container.read(counterProvider), 10);
      container.read(counterProvider.notifier).state = 11;
      expect(container.read(counterProvider), 11);
    });
  });
}
```

---

## Real-World App: Zomato-Style Restaurant Todos

Ab ek complete realistic example — jaha har restaurant ka apna todo list ho, filtering, persistence, aur error handling:

### Data Models

```dart
class Restaurant {
  final String id;
  final String name;
  final String cuisine;
  
  Restaurant({required this.id, required this.name, required this.cuisine});
  
  factory Restaurant.fromJson(Map<String, dynamic> json) {
    return Restaurant(
      id: json['id'],
      name: json['name'],
      cuisine: json['cuisine'],
    );
  }
}

class Todo {
  final String id;
  final String title;
  final bool completed;
  final DateTime createdAt;
  
  Todo({
    required this.id,
    required this.title,
    required this.completed,
    required this.createdAt,
  });
  
  factory Todo.fromJson(Map<String, dynamic> json) {
    return Todo(
      id: json['id'],
      title: json['title'],
      completed: json['completed'] ?? false,
      createdAt: DateTime.parse(json['createdAt']),
    );
  }
  
  Map<String, dynamic> toJson() => {
    'id': id,
    'title': title,
    'completed': completed,
    'createdAt': createdAt.toIso8601String(),
  };
}
```

### Riverpod Providers

```dart
// HttpClient (DI ke liye)
final httpClientProvider = Provider((ref) => http.Client());

// Selected restaurant ID
final selectedRestaurantProvider = StateProvider<String?>((ref) => null);

// Restaurants list
@riverpod
Future<List<Restaurant>> restaurants(ref) async {
  final client = ref.watch(httpClientProvider);
  final response = await client.get(
    Uri.parse('https://api.example.com/restaurants'),
  );
  
  if (response.statusCode == 200) {
    final List data = jsonDecode(response.body);
    return data.map((r) => Restaurant.fromJson(r)).toList();
  }
  throw Exception('Failed to fetch restaurants');
}

// Todos for specific restaurant
@riverpod
class RestaurantTodos extends _$RestaurantTodos {
  @override
  Future<List<Todo>> build(String restaurantId) async {
    final client = ref.watch(httpClientProvider);
    final response = await client.get(
      Uri.parse('https://api.example.com/restaurants/$restaurantId/todos'),
    );
    
    if (response.statusCode == 200) {
      final List data = jsonDecode(response.body);
      return data.map((t) => Todo.fromJson(t)).toList();
    }
    throw Exception('Failed to fetch todos');
  }
  
  Future<void> addTodo(String title) async {
    final client = ref.read(httpClientProvider);
    state = const AsyncValue.loading();
    
    try {
      final response = await client.post(
        Uri.parse('https://api.example.com/restaurants/$restaurantId/todos'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'title': title}),
      );
      
      if (response.statusCode == 201) {
        // Refetch all todos
        state = await AsyncValue.guard(() => build(restaurantId));
      } else {
        throw Exception('Failed to add todo');
      }
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }
  
  Future<void> toggleTodo(String todoId, bool completed) async {
    final client = ref.read(httpClientProvider);
    
    try {
      await client.patch(
        Uri.parse('https://api.example.com/todos/$todoId'),
        body: jsonEncode({'completed': !completed}),
      );
      
      state = await AsyncValue.guard(() => build(restaurantId));
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }
  
  Future<void> removeTodo(String todoId) async {
    final client = ref.read(httpClientProvider);
    
    try {
      await client.delete(
        Uri.parse('https://api.example.com/todos/$todoId'),
      );
      
      state = await AsyncValue.guard(() => build(restaurantId));
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }
}

// Filter provider (completed/pending/all)
final todoFilterProvider = StateProvider<String>((ref) => 'all'); // all, completed, pending

// Filtered todos
@riverpod
List<Todo> filteredTodos(ref, String restaurantId) {
  final filter = ref.watch(todoFilterProvider);
  final todosAsync = ref.watch(restaurantTodosProvider(restaurantId));
  
  return todosAsync.when(
    loading: () => [],
    error: (_, __) => [],
    data: (todos) {
      if (filter == 'completed') {
        return todos.where((t) => t.completed).toList();
      } else if (filter == 'pending') {
        return todos.where((t) => !t.completed).toList();
      }
      return todos;
    },
  );
}
```

### UI Layer

```dart
class RestaurantTodosScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selectedId = ref.watch(selectedRestaurantProvider);
    
    if (selectedId == null) {
      return const Scaffold(
        body: Center(child: Text('No restaurant selected')),
      );
    }
    
    final todosAsync = ref.watch(restaurantTodosProvider(selectedId));
    final filteredTodos = ref.watch(filteredTodosProvider(selectedId));
    
    return Scaffold(
      appBar: AppBar(
        title: Text('Restaurant: $selectedId'),
        actions: [
          PopupMenuButton(
            onSelected: (value) {
              ref.read(todoFilterProvider.notifier).state = value;
            },
            itemBuilder: (context) => [
              const PopupMenuItem(value: 'all', child: Text('All')),
              const PopupMenuItem(value: 'completed', child: Text('Completed')),
              const PopupMenuItem(value: 'pending', child: Text('Pending')),
            ],
          ),
        ],
      ),
      body: todosAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, st) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text('Error: $err'),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => ref.invalidate(restaurantTodosProvider(selectedId)),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
        data: (_) => filteredTodos.isEmpty
            ? const Center(child: Text('No todos'))
            : ListView.builder(
                itemCount: filteredTodos.length,
                itemBuilder: (context, index) {
                  final todo = filteredTodos[index];
                  return TodoTile(
                    todo: todo,
                    restaurantId: selectedId,
                  );
                },
              ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showAddTodoDialog(context, ref, selectedId),
        child: const Icon(Icons.add),
      ),
    );
  }
  
  void _showAddTodoDialog(BuildContext context, WidgetRef ref, String restaurantId) {
    final controller = TextEditingController();
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Add Todo'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(hintText: 'Task title'),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          Consumer(
            builder: (context, ref, _) {
              return TextButton(
                onPressed: () {
                  if (controller.text.isNotEmpty) {
                    ref
                        .read(restaurantTodosProvider(restaurantId).notifier)
                        .addTodo(controller.text);
                    Navigator.pop(context);
                  }
                },
                child: const Text('Add'),
              );
            },
          ),
        ],
      ),
    );
  }
}

class TodoTile extends ConsumerWidget {
  final Todo todo;
  final String restaurantId;
  
  const TodoTile({
    required this.todo,
    required this.restaurantId,
  });
  
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return ListTile(
      leading: Checkbox(
        value: todo.completed,
        onChanged: (_) {
          ref
              .read(restaurantTodosProvider(restaurantId).notifier)
              .toggleTodo(todo.id, todo.completed);
        },
      ),
      title: Text(
        todo.title,
        style: TextStyle(
          decoration: todo.completed ? TextDecoration.lineThrough : null,
        ),
      ),
      subtitle: Text(
        'Created: ${todo.createdAt.toString().split('.')[0]}',
        style: const TextStyle(fontSize: 12),
      ),
      trailing: IconButton(
        icon: const Icon(Icons.delete, color: Colors.red),
        onPressed: () {
          ref
              .read(restaurantTodosProvider(restaurantId).notifier)
              .removeTodo(todo.id);
        },
      ),
    );
  }
}
```

### Main App

```dart
void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp();
  
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Restaurant Todos',
      theme: ThemeData(primarySwatch: Colors.blue),
      home: const RestaurantListScreen(),
    );
  }
}

class RestaurantListScreen extends ConsumerWidget {
  const RestaurantListScreen();
  
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final restaurantsAsync = ref.watch(restaurantsProvider);
    
    return Scaffold(
      appBar: AppBar(title: const Text('Restaurants')),
      body: restaurantsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, st) => Center(child: Text('Error: $err')),
        data: (restaurants) {
          return ListView.builder(
            itemCount: restaurants.length,
            itemBuilder: (context, index) {
              final restaurant = restaurants[index];
              return ListTile(
                title: Text(restaurant.name),
                subtitle: Text(restaurant.cuisine),
                onTap: () {
                  ref.read(selectedRestaurantProvider.notifier).state = restaurant.id;
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => const RestaurantTodosScreen(),
                    ),
                  );
                },
              );
            },
          );
        },
      ),
    );
  }
}
```

---

## Advanced Patterns

### 1. **Invalidation & Refetch**

```dart
// Manually invalidate (cache clear) + refetch
ref.invalidate(todosProvider); // Clear cache
// Next ref.watch() automatically re-runs the provider

// Invalidate multiple providers
ref.invalidateAll(); // Clear all caches

// Listen to invalidation
ref.listen(todosProvider, (previous, next) {
  print('Todos changed!');
});
```

### 2. **Select** — Watch Specific Part

```dart
// Instead of watching entire list (jab koi bhi item change ho to rebuild)
// Just watch count (efficient)
final todosAsync = ref.watch(restaurantTodosProvider(id));
final todoCount = ref.watch(
  restaurantTodosProvider(id).select(
    (async) => async.whenData((todos) => todos.length),
  ),
);

// Rebuild sirf jab count change ho
```

### 3. **onDispose** — Cleanup

```dart
@riverpod
class TimerNotifier extends _$TimerNotifier {
  @override
  int build() {
    ref.onDispose(() {
      print('Timer cleaning up');
      // Close streams, cancel timers, etc.
    });
    
    return 0;
  }
}
```

### 4. **Combining Multiple Providers**

```dart
// Use multiple providers in one
@riverpod
Future<SearchResults> searchResults(ref, String query) async {
  final restaurants = await ref.watch(restaurantsProvider.future);
  final filter = ref.watch(todoFilterProvider);
  
  // Logic combining both
  return SearchResults(
    restaurants: restaurants,
    filter: filter,
  );
}
```

---

## DevTools — Debugging Riverpod

Install official Riverpod DevTools:

```bash
flutter pub add riverpod_devtools
```

```dart
// main.dart
import 'package:riverpod_devtools/riverpod_devtools.dart';

void main() {
  runApp(
    UncontrolledProviderScope(
      container: ProviderContainer(),
      child: const MyApp(),
    ),
  );
}

// Or with DevTools
void main() {
  runApp(
    UncontrolledProviderScope(
      container: ProviderContainer(
        overrides: [
          // DevTools integration (auto-detects in debug mode)
        ],
      ),
      child: const MyApp(),
    ),
  );
}
```

DevTools dikh jayega Flutter DevTools mein — har provider ka state, updates, performance metrics sab dikhai denge.

---

## Riverpod vs Other State Management

| Feature | Riverpod | BLoC | GetX |
|---------|----------|------|------|
| **Learning curve** | Medium (but powerful) | High | Low (magic-heavy) |
| **Type-safe** | Yes | Yes | Partial |
| **Testing** | Excellent | Good | Medium |
| **Boilerplate** | Low (@riverpod) | High | Low |
| **Performance** | Excellent (smart invalidation) | Good | Medium |
| **DevTools** | Official support | Community | Limited |
| **Async handling** | AsyncNotifier (rich) | StreamBuilder | Future/Stream |
| **Production-ready** | Yes | Yes | Yes |

**TL;DR**: Node.js backend developer ke liye Riverpod sab se natural lagta hai — dependency injection, reactive streams, testable code. GetX "magic" hidden karta hai (risky), BLoC zyada boilerplate. Riverpod sweet spot hai.

---

## Common Gotchas

1. **`ref.read()` in event handlers — Always safe**
   ```dart
   // ❌ DON'T: ref.watch() in build()
   FloatingActionButton(
     onPressed: () => ref.watch(counterProvider), // WRONG
   )
   
   // ✅ DO: ref.read() in event handlers
   FloatingActionButton(
     onPressed: () => ref.read(counterProvider.notifier).increment(), // CORRECT
   )
   ```

2. **Circular dependencies**
   ```dart
   // ❌ DON'T
   final providerA = Provider((ref) => ref.watch(providerB));
   final providerB = Provider((ref) => ref.watch(providerA)); // Infinite loop!
   
   // ✅ DO: Restructure with computed providers
   final baseProvider = Provider((ref) => 0);
   final derivedProvider = Provider((ref) => ref.watch(baseProvider) * 2);
   ```

3. **Mutating state directly** (StateNotifier mein)
   ```dart
   // ❌ DON'T: Direct mutation (Riverpod don't detect changes)
   state.add(newTodo); // No notification!
   
   // ✅ DO: Create new instance
   state = [...state, newTodo]; // Riverpod notifies listeners
   ```

4. **AsyncNotifier build() re-running unnecessarily**
   ```dart
   // ❌ DON'T: Side-effects in build()
   @override
   FutureOr<Data> build() async {
     // This runs every time dependencies change!
     print('Building...'); // Print bahut times
     return fetchData();
   }
   
   // ✅ DO: Use ref.listen() for side-effects
   @override
   FutureOr<Data> build() async {
     ref.listen(someProvider, (prev, next) {
       print('Side effect triggered');
     });
     return fetchData();
   }
   ```

---

## Migration from Provider to Riverpod

Agar tum pehle Provider use kar rahe ho:

```dart
// BEFORE (Provider)
class TodosNotifier extends ChangeNotifier {
  List<Todo> _todos = [];
  List<Todo> get todos => _todos;
  
  void addTodo(String title) {
    _todos.add(Todo(title: title));
    notifyListeners();
  }
}

final todosProvider = ChangeNotifierProvider((ref) => TodosNotifier());

// Use: Consumer(builder: (ctx, ref, _) => ref.watch(todosProvider).todos)

// AFTER (Riverpod)
@riverpod
class Todos extends _$Todos {
  @override
  List<Todo> build() => [];
  
  void addTodo(String title) => state = [...state, Todo(title: title)];
}

// Use: Consumer(builder: (ctx, ref, _) => ref.watch(todosProvider))
```

Sab kuch same hota hai, bas syntax clean hota hai aur testing easier hota hai.

---

## Key Takeaways

- **Riverpod = Provider + Dependency Injection + Testability**: Type-safe, boilerplate-free state management jo backend developers ko immediately familiar lagta hai
- **Lazy evaluation + Smart caching**: Providers sirf evaluate hote hain jab access ho, aur result cache rehta hai. Dependencies change se automatic re-evaluation
- **AsyncNotifier > FutureProvider**: Complex async logic (errors, retries, optimistic updates) ke liye AsyncNotifier use karo
- **@riverpod macro**: Zero boilerplate — builder pattern auto-generated
- **.family modifier**: Parameterized providers — har parameter ke liye independent cache aur lifecycle
- **Consumer widgets + ref.watch()**: UI mein reactive data access. ref.listen() side-effects ke liye
- **Testing without UI**: ProviderContainer se unit tests likho — mocks aur overrides support karte hain
- **ref.read() in events, ref.watch() in build**: Correct pattern following se memory leaks aur infinite loops avoid ho jayenge
- **Invalidation** (`ref.invalidate()`) clarity deta hai — manually refetch kar sakte ho
- **DevTools support**: Official debugging tools — provider state, update history, performance metrics sab visible hote hain

Next chapter: **BLoC Pattern** — jo ziada structured architecture chahiye test-driven development ke liye!
