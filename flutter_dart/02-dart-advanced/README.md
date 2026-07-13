# Dart Advanced — Async, Streams, Extensions

Namaste! Ab tak tune Dart ke basics dekhe hain — variables, functions, classes. Ab hum dekhenge jo cheezein production mein actually use hote hain: **async programming, Streams, aur advanced language features**. 

Socho Zomato app ko — jab tu order place karta hai, app ko:
- API call karni padti hai (async)
- Real-time updates dekne hote hain (Streams)
- Built-in types ko extend karna padta hai (extensions)

Yahi sab is chapter mein cover karenge.

---

## 1. Futures & Async/Await — Promises ki Dart Variant

### The Problem: Blocking Code Doesn't Work in Mobile

Dart single-threaded hai. Agar tu blocking code likhe (jaise Node.js mein synchronous operation), app freeze ho jayega. Isliye **Futures** aur **async/await** jaruri hain.

```dart
// ❌ Blocking — app hang ho jayega!
String fetchUserSync() {
  // Ye simulate karta hai 2 second network request
  sleep(Duration(seconds: 2));
  return 'User data from server';
}

void main() {
  print('Fetching...');
  String user = fetchUserSync(); // Pura app rok jayega
  print(user);
  print('Done');
}
// Output:
// Fetching...
// (2 second freeze)
// User data from server
// Done
```

### Future — Dart ka Promise

```dart
// ✅ Non-blocking — Future return karo
Future<String> fetchUser() {
  // Simulating API call
  return Future.delayed(
    Duration(seconds: 2),
    () => 'User: Raj Kumar',
  );
}

void main() {
  print('Fetching...');
  Future<String> userFuture = fetchUser();
  print('User Future created, app continues...');
  
  // .then() se result handle karo
  userFuture.then((user) {
    print('Got: $user');
  });
  
  print('Done with setup');
}

// Output (immediate):
// Fetching...
// User Future created, app continues...
// Done with setup
// (2 seconds later)
// Got: User: Raj Kumar
```

Dekho — print statements immediately chalti hain, 2 seconds rukti nahi. Yeh power hai async programming ki.

### async/await — Readable Async Code

`async/await` basically **syntactic sugar** hai `.then()` ke liye. Python ya JavaScript jaise hi lagta hai.

```dart
Future<String> fetchUser(String id) async {
  // Simulating network request
  await Future.delayed(Duration(seconds: 1));
  return 'User: $id';
}

Future<String> fetchPosts(String userId) async {
  // Pehle user fetch karo
  String user = await fetchUser(userId);
  print('Fetched: $user');
  
  // Phir posts fetch karo
  await Future.delayed(Duration(seconds: 1));
  return '$user - Posts: [post1, post2]';
}

void main() async {
  print('Starting...');
  String result = await fetchPosts('123');
  print(result);
  print('Done');
}

// Output:
// Starting...
// (1 second)
// Fetched: User: 123
// (1 second)
// User: 123 - Posts: [post1, post2]
// Done
```

**Key Points:**
- `async` keyword function ko async bana deta hai
- `await` expression blocking nahi karta — sirf wait karta hai
- `main()` bhi `async` ho sakta hai Dart mein!

### Error Handling in Futures

```dart
Future<String> fetchUser() async {
  await Future.delayed(Duration(seconds: 1));
  throw Exception('Network error: Server down');
}

// Method 1: Try-Catch
void main() async {
  try {
    String user = await fetchUser();
    print('Got: $user');
  } catch (e) {
    print('Error: $e');
  } finally {
    print('Cleanup done');
  }
}

// Method 2: .catchError() — bina try-catch ke
void example2() {
  fetchUser()
    .then((user) => print('Got: $user'))
    .catchError((error) => print('Error: $error'))
    .whenComplete(() => print('Cleanup done'));
}
```

### Future.wait() — Multiple Parallel Requests

```dart
Future<String> fetchUser() async {
  await Future.delayed(Duration(seconds: 1));
  return 'User: Raj';
}

Future<String> fetchPosts() async {
  await Future.delayed(Duration(seconds: 1));
  return 'Posts: [p1, p2, p3]';
}

Future<String> fetchNotifications() async {
  await Future.delayed(Duration(seconds: 1));
  return 'Notifications: 5';
}

void main() async {
  print('Fetching all data in parallel...');
  
  List<String> results = await Future.wait([
    fetchUser(),
    fetchPosts(),
    fetchNotifications(),
  ]);
  
  print(results);
  // Output (3 seconds later, not 9):
  // [User: Raj, Posts: [p1, p2, p3], Notifications: 5]
}
```

Dekho — sab kuch ek saath run hota hai! Agar serial hota to 3 seconds lagti, parallel se 1 second lag raha hai.

---

## 2. Streams — Real-Time Data Flow

### What is a Stream?

Stream ek **sequence of asynchronous events** hai. Think of it like Zomato order tracking:
- Jab order confirm hota → event
- Jab restaurant accept karta → event
- Jab rider aata → event
- Jab deliver hota → event

```
Order Placed
     ↓
Restaurant Accept
     ↓
Rider Picked Up
     ↓
In Transit
     ↓
Delivered
```

```dart
// Single Future — ek baar data milta hai
Future<int> getOneNumber() async {
  await Future.delayed(Duration(seconds: 1));
  return 42;
}

// Stream — kaafi events aate hain over time
Stream<int> getNumbers() async* {
  for (int i = 0; i < 5; i++) {
    await Future.delayed(Duration(seconds: 1));
    yield i; // emit karo
  }
}

void main() async {
  print('Future example:');
  int num = await getOneNumber();
  print('Got: $num'); // Ek baar print hota hai
  
  print('\nStream example:');
  Stream<int> stream = getNumbers();
  stream.listen((num) {
    print('Got: $num'); // 5 baar print hota hai
  });
}

// Output:
// Future example:
// Got: 42
//
// Stream example:
// Got: 0
// Got: 1
// Got: 2
// Got: 3
// Got: 4
```

> [!info]
> `async*` syntax se generator function banota hai jo Stream return karta hai. `yield` se values emit karte hain.

### Listen to Streams

```dart
Stream<String> locationUpdates() async* {
  final locations = ['Mumbai', 'Pune', 'Bangalore', 'Hyderabad'];
  for (String loc in locations) {
    await Future.delayed(Duration(seconds: 1));
    yield loc;
  }
}

void main() {
  final stream = locationUpdates();
  
  // Listener 1
  final subscription = stream.listen(
    (location) {
      print('Rider at: $location');
    },
    onError: (error) {
      print('Error: $error');
    },
    onDone: () {
      print('Delivery complete!');
    },
  );
  
  // Cancel subscription agar chahiye to
  // subscription.cancel();
}

// Output:
// Rider at: Mumbai
// Rider at: Pune
// Rider at: Bangalore
// Rider at: Hyderabad
// Delivery complete!
```

### Broadcasting Streams

By default, Stream ek single listener support karta hai. Agar multiple listeners chahiye, **broadcast** karo:

```dart
// Stream jo only 1 listener support karta hai
Stream<int> singleListenerStream() async* {
  for (int i = 0; i < 3; i++) {
    await Future.delayed(Duration(milliseconds: 500));
    yield i;
  }
}

void main() async {
  var stream = singleListenerStream();
  
  // Listener 1
  stream.listen((num) => print('L1: $num'));
  
  // ❌ Error! Second listener impossible
  // stream.listen((num) => print('L2: $num'));
  
  // ✅ Broadcast karo
  var broadcastStream = stream.asBroadcastStream();
  broadcastStream.listen((num) => print('L1: $num'));
  broadcastStream.listen((num) => print('L2: $num'));
  broadcastStream.listen((num) => print('L3: $num'));
}

// Output:
// L1: 0
// L2: 0
// L3: 0
// L1: 1
// L2: 1
// L3: 1
// ...
```

### Transform Streams

Streams ko transform kar sakte ho — mapping, filtering, etc.

```dart
Stream<int> numbers() async* {
  for (int i = 1; i <= 5; i++) {
    await Future.delayed(Duration(milliseconds: 300));
    yield i;
  }
}

void main() {
  numbers()
    // Double karo
    .map((n) => n * 2)
    // Only even numbers
    .where((n) => n > 4)
    // Listen karo
    .listen((n) => print(n));
}

// Output:
// 4
// 6
// 8
// 10
```

**Chaining multiple transformations:**

```dart
Stream<String> userSearch(String query) async* {
  for (int i = 0; i < 3; i++) {
    await Future.delayed(Duration(milliseconds: 200));
    yield '$query Result $i';
  }
}

void main() {
  userSearch('pizza')
    // Results ko uppercase karo
    .map((result) => result.toUpperCase())
    // Empty strings filter karo
    .where((result) => result.isNotEmpty)
    // "PIZZA" wale results only
    .where((result) => result.contains('PIZZA'))
    // Top 2 results
    .take(2)
    // Listen
    .forEach((result) => print(result));
}
```

### Real-World Example: API Polling with Streams

```dart
Stream<Map<String, dynamic>> trackOrderStatus(String orderId) async* {
  // Har 2 seconds mein API hit karo
  for (int i = 0; i < 5; i++) {
    await Future.delayed(Duration(seconds: 2));
    
    // Simulating API response
    final status = [
      {'status': 'confirmed', 'message': 'Order Confirmed'},
      {'status': 'preparing', 'message': 'Restaurant Preparing'},
      {'status': 'ready', 'message': 'Ready for Pickup'},
      {'status': 'in_transit', 'message': 'Rider In Transit'},
      {'status': 'delivered', 'message': 'Delivered Successfully'},
    ][i];
    
    yield status;
  }
}

void main() {
  trackOrderStatus('ORD123')
    .takeWhile((status) => status['status'] != 'delivered')
    .listen(
      (status) => print('${status['message']}'),
      onDone: () => print('Order Tracking Complete!'),
    );
}
```

> [!warning]
> Zyada frequent polling server ke liye heavy ho sakta hai. Real-time updates ke liye **WebSockets** use karo.

---

## 3. Extension Methods — Extend Built-in Types

### What Are Extensions?

Dart mein existing classes ko extend kar sakte ho without inheritance. Socho jaise Zomato ko Swiggy features add karne hain apne app mein.

```dart
// String ko extend karo
extension StringExtension on String {
  // Custom method add karo
  String toTitleCase() {
    return split(' ')
      .map((word) => word[0].toUpperCase() + word.substring(1))
      .join(' ');
  }
  
  // Property add karo
  bool get isValidEmail => contains('@') && contains('.');
}

void main() {
  String name = 'raj kumar';
  print(name.toTitleCase()); // Output: Raj Kumar
  
  String email = 'raj@gmail.com';
  print(email.isValidEmail); // Output: true
}
```

### Practical Extension Examples

**Integer extension for API requests:**

```dart
extension DurationExtension on int {
  // seconds se Duration banana
  Duration get seconds => Duration(seconds: this);
  Duration get milliseconds => Duration(milliseconds: this);
  
  // Repeat karo
  Future<void> repeat(Future<void> Function() callback) async {
    for (int i = 0; i < this; i++) {
      await callback();
    }
  }
}

void main() async {
  // 500 milliseconds wait karo
  await Future.delayed(500.milliseconds);
  print('Done waiting');
  
  // 3 baar API call karo
  await 3.repeat(() async {
    print('Calling API...');
    await Future.delayed(1.seconds);
  });
}
```

**List extension for common operations:**

```dart
extension ListExtension<T> on List<T> {
  // Random element
  T randomElement() {
    return this[(DateTime.now().millisecond % length)];
  }
  
  // Chunked (khilaaf groups mein divide karo)
  List<List<T>> chunk(int size) {
    List<List<T>> result = [];
    for (int i = 0; i < length; i += size) {
      result.add(sublist(i, (i + size > length) ? length : i + size));
    }
    return result;
  }
}

void main() {
  List<int> numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  
  print(numbers.randomElement()); // Random number
  print(numbers.chunk(3)); // [[1,2,3], [4,5,6], [7,8,9]]
}
```

**DateTime extension:**

```dart
extension DateTimeExtension on DateTime {
  bool get isToday {
    final now = DateTime.now();
    return year == now.year && month == now.month && day == now.day;
  }
  
  bool get isYesterday {
    final yesterday = DateTime.now().subtract(Duration(days: 1));
    return year == yesterday.year && 
           month == yesterday.month && 
           day == yesterday.day;
  }
  
  String get humanReadable {
    if (isToday) return 'Today at ${hour}:${minute.toString().padLeft(2, '0')}';
    if (isYesterday) return 'Yesterday at ${hour}:${minute.toString().padLeft(2, '0')}';
    return 'on ${day}/${month}/${year}';
  }
}

void main() {
  DateTime now = DateTime.now();
  print(now.humanReadable); // "Today at 14:30"
  
  DateTime yesterday = DateTime.now().subtract(Duration(days: 1));
  print(yesterday.humanReadable); // "Yesterday at 14:30"
}
```

---

## 4. Mixins — Code Reuse Without Inheritance

### What is a Mixin?

Mixin ek **reusable set of methods** hai jo kisi class ko add kar sakte ho without inheritance chain. JavaScript mixin jaise, but Dart more structured.

### Basic Mixin Example

```dart
// Mixin: Timestamp functionality
mixin Timestamped {
  late DateTime createdAt;
  late DateTime updatedAt;
  
  void markAsCreated() {
    createdAt = DateTime.now();
  }
  
  void markAsUpdated() {
    updatedAt = DateTime.now();
  }
}

// Mixin: Printable
mixin Printable {
  String toReadableString();
  
  void printMe() {
    print(toReadableString());
  }
}

// Use mixins with 'with' keyword
class Post with Timestamped, Printable {
  String title;
  String content;
  
  Post({required this.title, required this.content});
  
  @override
  String toReadableString() {
    return 'Post: $title\nCreated: $createdAt\nUpdated: $updatedAt';
  }
}

void main() {
  Post post = Post(title: 'Dart Advanced', content: '...');
  post.markAsCreated();
  post.markAsUpdated();
  post.printMe();
  
  // Output:
  // Post: Dart Advanced
  // Created: 2024-07-14 14:30:00.000
  // Updated: 2024-07-14 14:30:05.000
}
```

### Real-World Mixin: API Client Capabilities

```dart
// Mixin: Caching behavior
mixin Cacheable {
  Map<String, dynamic> cache = {};
  
  void cacheSet(String key, dynamic value) {
    cache[key] = value;
  }
  
  dynamic cacheGet(String key) {
    return cache[key];
  }
  
  void cacheClear() {
    cache.clear();
  }
}

// Mixin: Retry logic
mixin Retryable {
  Future<T> retryOperation<T>(
    Future<T> Function() operation, {
    int maxRetries = 3,
    Duration delay = const Duration(seconds: 1),
  }) async {
    for (int i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (e) {
        if (i == maxRetries - 1) rethrow;
        await Future.delayed(delay);
      }
    }
    throw Exception('All retries failed');
  }
}

// API Client with both mixins
class ApiClient with Cacheable, Retryable {
  Future<String> fetchUser(String id) async {
    // Check cache pehle
    if (cacheGet('user_$id') != null) {
      return cacheGet('user_$id');
    }
    
    // API call with retry
    String result = await retryOperation(() async {
      await Future.delayed(Duration(milliseconds: 500));
      if (DateTime.now().millisecond < 300) {
        throw Exception('Random failure');
      }
      return 'User: $id Data';
    });
    
    // Cache karo
    cacheSet('user_$id', result);
    return result;
  }
}

void main() async {
  ApiClient client = ApiClient();
  
  String user1 = await client.fetchUser('123');
  print('First call: $user1');
  
  // Second call — cache se ayega
  String user2 = await client.fetchUser('123');
  print('Second call (cached): $user2');
}
```

---

## 5. Generics — Type-Safe Collections

### Basic Generics

```dart
// Generic class — T ek type parameter hai
class Box<T> {
  T? value;
  
  void put(T item) {
    value = item;
  }
  
  T? get() {
    return value;
  }
}

void main() {
  // String box
  Box<String> stringBox = Box();
  stringBox.put('Hello');
  print(stringBox.get()); // Hello
  
  // Integer box
  Box<int> intBox = Box();
  intBox.put(42);
  print(intBox.get()); // 42
  
  // ❌ Type mismatch — compile error
  // intBox.put('Not an int');
}
```

### Generic Functions

```dart
// Generic function — kahin bhi use kar sakte ho
T findMax<T extends Comparable>(List<T> items) {
  if (items.isEmpty) throw Exception('Empty list');
  return items.reduce((a, b) => a.compareTo(b) > 0 ? a : b);
}

void main() {
  print(findMax([1, 5, 3])); // 5
  print(findMax(['apple', 'zebra', 'banana'])); // zebra
}
```

### Real-World: Generic API Response Handler

```dart
// Generic response model
class ApiResponse<T> {
  final bool success;
  final T? data;
  final String? error;
  
  ApiResponse.success(this.data) 
    : success = true, 
      error = null;
  
  ApiResponse.error(this.error) 
    : success = false, 
      data = null;
}

// Generic API client
class RestClient<T> {
  Future<ApiResponse<T>> get(String url) async {
    try {
      await Future.delayed(Duration(seconds: 1));
      // Simulating API call
      if (url.contains('error')) {
        return ApiResponse.error('Network error');
      }
      
      // In real app, parse JSON to T here
      return ApiResponse.success(null as T);
    } catch (e) {
      return ApiResponse.error(e.toString());
    }
  }
}

// Models
class User {
  String name;
  String email;
  User(this.name, this.email);
}

class Post {
  String title;
  String content;
  Post(this.title, this.content);
}

void main() async {
  // User client
  RestClient<User> userClient = RestClient();
  ApiResponse<User> userResp = await userClient.get('/users/1');
  if (userResp.success) {
    print('Got user: ${userResp.data}');
  }
  
  // Post client — same logic, different type
  RestClient<Post> postClient = RestClient();
  ApiResponse<Post> postResp = await postClient.get('/posts/1');
  if (postResp.success) {
    print('Got post: ${postResp.data}');
  }
}
```

---

## 6. Higher-Order Functions & Closures

### Functions as First-Class Objects

```dart
// Function type definition
typedef Validator = bool Function(String);

class Form {
  Map<String, Validator> validators = {};
  
  // Higher-order function — function accept karta hai
  void addValidator(String field, Validator validator) {
    validators[field] = validator;
  }
  
  bool validate(String field, String value) {
    final validator = validators[field];
    if (validator == null) return true;
    return validator(value);
  }
}

void main() {
  Form form = Form();
  
  // Pass different validators
  form.addValidator('email', (email) => email.contains('@'));
  form.addValidator('phone', (phone) => phone.length == 10);
  form.addValidator('age', (age) => int.parse(age) >= 18);
  
  print(form.validate('email', 'raj@gmail.com')); // true
  print(form.validate('phone', '9876543210')); // true
  print(form.validate('age', '25')); // true
  print(form.validate('email', 'invalid')); // false
}
```

### Closures — Functions that Capture Context

```dart
// Factory function — function banata hai jab call ho
Function makeAdder(int x) {
  // Inner function x ko "remember" karta hai
  return (int y) {
    return x + y;
  };
}

void main() {
  var add5 = makeAdder(5);
  print(add5(3)); // 8
  print(add5(10)); // 15
  
  var add100 = makeAdder(100);
  print(add100(50)); // 150
}
```

**Practical: Event Handlers with Closures**

```dart
class Button {
  late Function() _onPressed;
  
  void onClick(Function() callback) {
    _onPressed = callback;
  }
  
  void press() {
    _onPressed();
  }
}

void main() {
  Button btn = Button();
  
  int clickCount = 0;
  
  // Closure — inner function clickCount access kar raha hai
  btn.onClick(() {
    clickCount++;
    print('Clicked $clickCount times');
  });
  
  btn.press(); // Clicked 1 times
  btn.press(); // Clicked 2 times
  btn.press(); // Clicked 3 times
}
```

---

## 7. Error Handling — Robust Code

### Try-Catch-Finally

```dart
Future<String> fetchUserData(String id) async {
  if (id.isEmpty) {
    throw ArgumentError('User ID cannot be empty');
  }
  
  await Future.delayed(Duration(seconds: 1));
  
  if (int.parse(id) < 0) {
    throw Exception('Invalid user ID');
  }
  
  return 'User: $id';
}

void main() async {
  try {
    String user = await fetchUserData('123');
    print('Success: $user');
  } on ArgumentError catch (e) {
    // Specific exception type
    print('Argument error: $e');
  } on FormatException catch (e) {
    print('Format error: $e');
  } catch (e) {
    // Generic catch-all
    print('Unexpected error: $e');
  } finally {
    // Hamesha run hoga
    print('Cleanup done');
  }
}
```

### Custom Exceptions

```dart
class NetworkException implements Exception {
  final String message;
  final int? statusCode;
  
  NetworkException(this.message, {this.statusCode});
  
  @override
  String toString() => 'NetworkException: $message (Code: $statusCode)';
}

class ValidationException implements Exception {
  final String field;
  final String reason;
  
  ValidationException(this.field, this.reason);
  
  @override
  String toString() => 'ValidationException: $field - $reason';
}

Future<String> fetchUser(String id) async {
  if (id.isEmpty) {
    throw ValidationException('id', 'ID cannot be empty');
  }
  
  await Future.delayed(Duration(milliseconds: 500));
  
  if (DateTime.now().millisecond > 500) {
    throw NetworkException('Server unavailable', statusCode: 503);
  }
  
  return 'User: $id';
}

void main() async {
  try {
    String user = await fetchUser('');
  } on ValidationException catch (e) {
    print(e); // ValidationException: id - ID cannot be empty
  } on NetworkException catch (e) {
    print(e); // NetworkException: Server unavailable (Code: 503)
  }
}
```

### Error Handling in Streams

```dart
Stream<int> dataStream() async* {
  for (int i = 0; i < 5; i++) {
    if (i == 3) {
      throw Exception('Error at i = 3');
    }
    await Future.delayed(Duration(milliseconds: 500));
    yield i;
  }
}

void main() {
  dataStream().listen(
    (data) => print('Data: $data'),
    onError: (error) => print('Error occurred: $error'),
    onDone: () => print('Stream complete'),
  );
}

// Output:
// Data: 0
// Data: 1
// Data: 2
// Error occurred: Exception: Error at i = 3
```

---

## 8. Combining Everything: Real API Integration

Ab sab concepts ko combine karte hain — real-world Zomato-like order tracking app.

```dart
// Models
class Order {
  String id;
  String status;
  String message;
  DateTime timestamp;
  
  Order({
    required this.id,
    required this.status,
    required this.message,
    required this.timestamp,
  });
}

// Custom exception
class OrderException implements Exception {
  final String message;
  OrderException(this.message);
  
  @override
  String toString() => message;
}

// Extension — human-readable status
extension OrderStatusExtension on String {
  String toHumanReadable() {
    switch (this) {
      case 'confirmed':
        return '✓ Order Confirmed';
      case 'preparing':
        return '👨‍🍳 Restaurant Preparing';
      case 'ready':
        return '📦 Ready for Pickup';
      case 'in_transit':
        return '🚗 Rider In Transit';
      case 'delivered':
        return '✅ Delivered';
      default:
        return 'Unknown';
    }
  }
}

// Mixin — retry logic
mixin RetryLogic {
  Future<T> withRetry<T>(
    Future<T> Function() operation, {
    int maxRetries = 3,
  }) async {
    for (int i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (e) {
        if (i == maxRetries - 1) rethrow;
        await Future.delayed(Duration(seconds: 1));
      }
    }
    throw Exception('All retries failed');
  }
}

// API Client with multiple features
class OrderClient with RetryLogic {
  // Cache
  Map<String, Order> orderCache = {};
  
  // Simulate API
  Future<Order> _fetchOrderFromAPI(String orderId) async {
    await Future.delayed(Duration(milliseconds: 500));
    
    if (orderId.isEmpty) {
      throw OrderException('Order ID cannot be empty');
    }
    
    // Simulate occasional failures
    if (DateTime.now().millisecond < 100) {
      throw OrderException('Network error');
    }
    
    final statuses = [
      'confirmed',
      'preparing',
      'ready',
      'in_transit',
      'delivered'
    ];
    final messages = [
      'Your order has been confirmed',
      'Restaurant is preparing your order',
      'Order is ready',
      'Your order is on the way',
      'Order delivered successfully',
    ];
    
    final statusIndex = DateTime.now().millisecond % statuses.length;
    
    return Order(
      id: orderId,
      status: statuses[statusIndex],
      message: messages[statusIndex],
      timestamp: DateTime.now(),
    );
  }
  
  // Public method with retry
  Future<Order> getOrder(String orderId) async {
    // Check cache
    if (orderCache.containsKey(orderId)) {
      print('✨ Served from cache');
      return orderCache[orderId]!;
    }
    
    // Fetch with retry
    Order order = await withRetry(
      () => _fetchOrderFromAPI(orderId),
      maxRetries: 3,
    );
    
    // Cache karo
    orderCache[orderId] = order;
    return order;
  }
  
  // Stream order status updates
  Stream<Order> trackOrder(String orderId) async* {
    for (int i = 0; i < 5; i++) {
      try {
        Order order = await getOrder(orderId);
        yield order;
        await Future.delayed(Duration(seconds: 2));
      } catch (e) {
        throw OrderException('Failed to track order: $e');
      }
    }
  }
}

void main() async {
  OrderClient client = OrderClient();
  
  print('=== Single Order Fetch ===');
  try {
    Order order = await client.getOrder('ORD123');
    print('Status: ${order.status.toHumanReadable()}');
    print('Message: ${order.message}');
  } on OrderException catch (e) {
    print('Error: $e');
  }
  
  print('\n=== Real-Time Tracking ===');
  try {
    client.trackOrder('ORD456')
      .map((order) => order.status.toHumanReadable())
      .listen(
        (status) => print(status),
        onError: (error) => print('Tracking error: $error'),
        onDone: () => print('Tracking complete!'),
      );
    
    // Wait for stream to complete
    await Future.delayed(Duration(seconds: 12));
  } catch (e) {
    print('Error: $e');
  }
}
```

Output:
```
=== Single Order Fetch ===
✨ Served from cache
Status: 🚗 Rider In Transit
Message: Your order is on the way

=== Real-Time Tracking ===
📦 Ready for Pickup
🚗 Rider In Transit
✅ Delivered
✓ Order Confirmed
👨‍🍳 Restaurant Preparing
Tracking complete!
```

---

## 9. Common Patterns & Best Practices

### Pattern 1: Future-or-Die

```dart
// Agar Future fail ho, automatically retry karo
Future<T> futureOrDie<T>(
  Future<T> Function() operation, {
  int maxRetries = 3,
  Duration delay = const Duration(seconds: 1),
}) async {
  int attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await operation();
    } catch (e) {
      attempt++;
      if (attempt >= maxRetries) rethrow;
      await Future.delayed(delay);
    }
  }
  throw Exception('Exhausted retries');
}

// Usage
void main() async {
  String result = await futureOrDie(
    () => Future.delayed(Duration(seconds: 1), () => 'Success'),
    maxRetries: 5,
  );
  print(result);
}
```

### Pattern 2: Debounce Stream

```dart
extension StreamDebounce<T> on Stream<T> {
  Stream<T> debounce(Duration duration) {
    late StreamSubscription<T> subscription;
    StreamController<T> controller = StreamController();
    Future? debounceTimer;
    
    subscription = listen(
      (value) {
        debounceTimer?.timeout(duration);
        debounceTimer = Future.delayed(duration, () {
          controller.add(value);
        });
      },
      onError: controller.addError,
      onDone: controller.close,
    );
    
    controller.onCancel = subscription.cancel;
    return controller.stream;
  }
}

// Usage — search queries
void main() {
  Stream<String> searchQueries = // ... user input
  
  searchQueries
    .debounce(Duration(milliseconds: 500))
    .listen((query) => print('Searching for: $query'));
}
```

### Pattern 3: Throttle Stream

```dart
extension StreamThrottle<T> on Stream<T> {
  Stream<T> throttle(Duration duration) {
    StreamController<T> controller = StreamController();
    DateTime? lastEmit;
    
    listen(
      (value) {
        final now = DateTime.now();
        if (lastEmit == null || 
            now.difference(lastEmit!).inMilliseconds >= duration.inMilliseconds) {
          lastEmit = now;
          controller.add(value);
        }
      },
      onError: controller.addError,
      onDone: controller.close,
    );
    
    return controller.stream;
  }
}
```

---

## 10. Performance Considerations

### Memory Leaks in Streams

```dart
// ❌ Bad — subscription kabhi close nahi ho raha
class MyWidget {
  void initState() {
    myStream.listen((data) => print(data));
    // No unsubscribe!
  }
}

// ✅ Good — subscription properly managed
class MyWidget {
  late StreamSubscription subscription;
  
  void initState() {
    subscription = myStream.listen((data) => print(data));
  }
  
  void dispose() {
    subscription.cancel();
  }
}
```

### Avoid Rebuilding Streams

```dart
// ❌ Bad — har call par naya stream
class MyWidget {
  @override
  Widget build(BuildContext context) {
    return StreamBuilder(
      stream: fetchData(), // Har build par naya stream!
      builder: (context, snapshot) => Text('${snapshot.data}'),
    );
  }
}

// ✅ Good — single stream instance
class MyWidget {
  late final Stream<String> dataStream = fetchData();
  
  @override
  Widget build(BuildContext context) {
    return StreamBuilder(
      stream: dataStream,
      builder: (context, snapshot) => Text('${snapshot.data}'),
    );
  }
}
```

---

## 11. Debugging Async Code

### Print Debugging

```dart
Future<String> debuggedFetch() async {
  print('[START] Fetching data');
  
  try {
    final result = await Future.delayed(
      Duration(seconds: 1),
      () => 'Data',
    );
    print('[SUCCESS] Got: $result');
    return result;
  } catch (e) {
    print('[ERROR] $e');
    rethrow;
  }
}
```

### Using Dart DevTools

```
# Run app with debugging
flutter run

# Open Dart DevTools
flutter pub global run devtools

# Click "Open DevTools" from terminal
```

DevTools se:
- Timeline dekh sakte ho (jab event fire hota hai)
- Memory usage dekh sakte ho
- Breakpoints set kar sakte ho

---

## Key Takeaways

- **Futures & async/await:** Non-blocking code likhne ke liye, `async/await` use karo (`.then()` se better)
- **Streams:** Real-time data flow ke liye — polling, WebSockets, live updates
- **Extensions:** Built-in types ko custom methods add kar sakte ho without inheritance
- **Mixins:** Code reuse ka clean way — multiple behaviors add kar sakte ho
- **Generics:** Type-safe code likhne ke liye — compile-time type checking
- **Higher-order functions:** Functions pass kar sakte ho as parameters (callbacks, validators, transformations)
- **Error handling:** Custom exceptions define karo, try-catch-finally se gracefully handle karo
- **Practical patterns:** Retry logic, debounce, throttle, proper subscription management
- **Performance:** Memory leaks avoid karo (cancel subscriptions), streams ko reuse karo
- **Debugging:** Print statements, DevTools ke timeline inspector, breakpoints
- **Real-world:** API clients, event tracking, state management — sab kuch async+streams se

Next chapter mein Flutter basics dekenge — widgets, layouts, BuildContext ka magic!
