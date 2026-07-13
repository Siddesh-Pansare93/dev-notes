# Dart Basics — Variables, Types, Functions

## Intro: Dart Kya Hai?

Socho ek second ke liye — jab tum Zomato app kholt ho, kya soch te ho? Probably nahi. UI smooth hai, orders fast process hote hain, notifications on time aate hain. Ye sab kuch kaise possible hua?

**Dart** woh language hai jis par Flutter (Google ka mobile framework) built hai. Flutter app Flutter-ke-through Dart code likha jaata hai. Agar tum Node.js mein server likh sakte ho Express-ke-through, tab soch lo Dart as Flutter-ki-Express.

**Kya special hai Dart?**

- **Just-in-time (JIT) compilation** — code compile hota hai runtime par, so development mein hot reload possible hai (code change → instant app update, no full restart)
- **Strong type system with type inference** — TypeScript jaise safe, par JavaScript jaise flexible
- **Null safety by default** — `null` ke errors zyada nahi hoga (JavaScript ka dard nahi)
- **Single-threaded event loop** — Node.js ki tarah, async-first design
- **Garbage collection** — memory automatically clean up hota hai

**Tum kyu sikhoge?**

Because Flutter builds on Dart. Agar Flutter sikhna hai (aur sikhna chahiye — cross-platform mobile dev ka best option), Dart avoidable nahi.

---

## Part 1: Variables aur Types

### Variables Declare Karna

JavaScript mein `var` / `let` / `const` use karte ho. Dart mein bhi similar concept hai par **type-aware** hai.

Dart mein variables declare karne ke 4 tarike:

```dart
// 1. `var` — type inference (compiler figure out karega)
var name = 'Siddesh'; // String assume hoga
var count = 42;       // int assume hoga

// 2. `dynamic` — runtime par type decide hota hai (risky, avoid karo)
dynamic something = 'Hello';
something = 42; // ye allowed hai, but compiler warning dega

// 3. `final` — ek baar assign, phir immutable (const ki tarah, par runtime par decide ho sakta hai)
final age = 25;
age = 26; // ERROR ❌

// 4. `const` — compile-time constant (value fixed hona chahiye)
const pi = 3.14159;
pi = 3.14; // ERROR ❌
```

**Kya farq hai `final` aur `const` mein?**

| Aspect | `final` | `const` |
|--------|--------|--------|
| Value set hota hai | Runtime par (variable ho sakta hai) | Compile-time par (fixed hona chahiye) |
| Memory | Har instance ka apna memory | Shared memory (optimized) |
| Use case | "ye value change nahi hona" | "ye value KABHI change nahi ho sakta" |

**Example:**

```dart
final now = DateTime.now(); // Runtime par decide ✅
const birthday = DateTime(1999, 5, 15); // Compile-time constant ✅

// const time = DateTime.now(); // ERROR ❌ (DateTime.now() runtime hai)
```

> [!tip]
> Default use karo `var` ya `final`. `dynamic` aur `const` carefully use karo.

### Type System: Dart Ka "Strong Typing"

Dart statically typed hai, but type inference ke sath smart. JavaScript se zyada safe, TypeScript jaise.

**Built-in types:**

```dart
// Numbers
int age = 25;                    // 64-bit integer
double price = 99.99;            // 64-bit floating-point

// String
String name = 'Siddesh';
String email = "hello@example.com";
String multiline = '''
Line 1
Line 2
Line 3
''';

// Boolean
bool isLoggedIn = true;
bool isEmpty = false;

// Collections (arrays, hashmaps, sets)
List<int> numbers = [1, 2, 3, 4, 5];
Map<String, dynamic> user = {'name': 'Siddesh', 'age': 25};
Set<String> tags = {'flutter', 'dart', 'mobile'};

// Dynamic (last resort)
dynamic anything = 'Hello';
anything = 42;  // runtime par type change hota hai
```

### Null Safety: Dart Ka Superpowers

JavaScript mein `undefined` aur `null` ke runtime errors common hote hain. Dart mein **null safety by default** — compiler guarantee deta hai ki `null` handle kiya gaya hai.

**Without null safety (old Dart, risky):**

```dart
String name = null; // Runtime error possible ❌
print(name.length); // Crash! 💥
```

**With null safety (modern Dart):**

```dart
String name = 'Siddesh'; // Non-nullable (can't be null)
String? nickname = null;  // Nullable (can be null, `?` mark zaruri)

print(name.length);     // Safe ✅
print(nickname.length); // ERROR ❌ (compiler rokta hai)

// Null-check karna padta hai:
if (nickname != null) {
  print(nickname.length); // Ab safe hai ✅
}

// Shorthand: null-coalescing operator
int age = userAge ?? 0; // Agar userAge null hai to 0 use karo
```

**Null-aware operators:**

```dart
String? email = null;

// Null-coalescing: ?? (agar null ho to default value)
String finalEmail = email ?? 'noemail@example.com';

// Null-coalescing assignment: ??= (agar null ho to assign karo)
email ??= 'default@example.com';

// Safe navigation: ?. (agar object null ho to expression null return karo)
int? len = email?.length; // Agar email null hai to null return, else length

// Null assertion: ! (forcefully non-nullable banao — risky!)
int forcedLen = email!.length; // "Main janta hoon ye null nahi hai" — use carefully
```

> [!warning]
> `!` (null assertion) sirf tab use karo jab 100% sure ho ki value non-null hai. Agar galat use ho to crash hoga.

---

## Part 2: Collections — Lists, Maps, Sets

### Lists (Arrays Ki Tarah)

```dart
// Declare
List<int> scores = [85, 90, 78, 92];
var fruits = ['Apple', 'Mango', 'Banana']; // Type inferred

// Access
print(scores[0]); // 85
print(scores.length); // 4

// Modify
scores.add(88);
scores.removeAt(1); // Index 1 remove karo
scores[2] = 100;    // Index 2 par naya value

// List literals mein spread operator
List<int> combined = [0, ...scores, 99]; // ...scores ke elements add hoge

// Conditional elements
List<String> items = [
  'Item 1',
  if (userLoggedIn) 'User Panel',
  'Item 2',
];
```

**List operations (functional, array.map() jaisa):**

```dart
List<int> numbers = [1, 2, 3, 4, 5];

// Map: har element par function apply karo
List<int> doubled = numbers.map((n) => n * 2).toList();
// Result: [2, 4, 6, 8, 10]

// Filter: condition match karne wale elements
List<int> evens = numbers.where((n) => n % 2 == 0).toList();
// Result: [2, 4]

// Reduce: ek value mein combine karo
int sum = numbers.reduce((a, b) => a + b);
// Result: 15

// Fold: reduce with initial value
int product = numbers.fold(1, (acc, n) => acc * n);
// Result: 120

// Any / Every: boolean checks
bool hasEven = numbers.any((n) => n % 2 == 0); // true
bool allPositive = numbers.every((n) => n > 0); // true

// Find first
int? firstEven = numbers.firstWhere((n) => n % 2 == 0, orElse: () => -1);
```

### Maps (Dictionaries/Objects)

```dart
// Declare
Map<String, dynamic> user = {
  'name': 'Siddesh',
  'age': 25,
  'email': 'siddesh@example.com',
  'tags': ['flutter', 'dart'],
};

// Access
print(user['name']); // 'Siddesh'
print(user['age']);  // 25

// Safe access (null-safe)
String? city = user['city']; // null (key doesn't exist)

// Modify
user['age'] = 26;
user['github'] = 'siddesharella';
user.remove('email');

// Map literals with spread
Map<String, dynamic> merged = {
  ...user,
  'github': 'siddesharella',
  'website': 'example.com',
};

// Map operations
Map<String, int> prices = {'apple': 50, 'mango': 80, 'banana': 30};

// Get keys / values
List<String> fruits = prices.keys.toList();
List<int> costs = prices.values.toList();

// Map transformation
Map<String, int> discounted = prices.map(
  (key, value) => MapEntry(key, (value * 0.9).toInt())
);

// Filter entries
Map<String, int> expensive = Map.fromEntries(
  prices.entries.where((e) => e.value > 50)
);
```

### Sets (Unique Elements Wali Lists)

```dart
// Declare
Set<String> colors = {'red', 'green', 'blue'};
var numbers = {1, 2, 3, 3, 3}; // {1, 2, 3} (duplicates auto-remove)

// Operations
colors.add('yellow');
colors.remove('blue');

// Set theory (union, intersection, difference)
Set<int> a = {1, 2, 3, 4};
Set<int> b = {3, 4, 5, 6};

Set<int> union = a.union(b);          // {1, 2, 3, 4, 5, 6}
Set<int> intersection = a.intersection(b); // {3, 4}
Set<int> difference = a.difference(b);    // {1, 2}

// Check membership
bool hasRed = colors.contains('red'); // true
```

---

## Part 3: Functions — Dart Ka Sabse Powerful Feature

### Basic Function Syntax

```dart
// Simplest function
void greet(String name) {
  print('Hello, $name!');
}

// Function with return type
int add(int a, int b) {
  return a + b;
}

// Arrow function (expression body)
int multiply(int a, int b) => a * b;

// Call
greet('Siddesh');     // Hello, Siddesh!
print(add(5, 3));     // 8
print(multiply(4, 5)); // 20
```

### Named Parameters — "Keyword Arguments"

JavaScript/Node.js mein destructuring use karte ho objects ka. Dart mein named parameters:

```dart
// Named parameters mein `{}` use karo
void createUser({
  required String name,
  required String email,
  String? phone,
  bool isAdmin = false,
}) {
  print('Name: $name, Email: $email, Admin: $isAdmin');
}

// Call karte waqt naam se specify karo
createUser(
  name: 'Siddesh',
  email: 'siddesh@example.com',
  phone: '9876543210',
  isAdmin: true,
);

// `required` keyword matlab ye parameter mandatory hai
```

**Positional vs Named:**

```dart
// Positional parameters (order matters)
void posFunc(int a, String b, bool c) {}
posFunc(1, 'hello', true);

// Named parameters (order nahi matters)
void namedFunc({required int a, required String b, required bool c}) {}
namedFunc(b: 'hello', c: true, a: 1);

// Mixed (positional + named)
void mixedFunc(int a, String b, {bool c = false}) {}
mixedFunc(1, 'hello', c: true);
```

### Default Values

```dart
String greet(String name, [String greeting = 'Hello']) {
  return '$greeting, $name!';
}

print(greet('Siddesh'));        // Hello, Siddesh!
print(greet('Siddesh', 'Hi'));  // Hi, Siddesh!
```

### Higher-Order Functions — Functions Accepting Functions

Dart mein functions first-class citizens hain. Function ko parameter ya return value ke taur par use kar sakte ho (JavaScript jaise).

```dart
// Function type: (int) -> int
typedef IntFunction = int Function(int);

// Function accept karna
int apply(int a, int b, IntFunction operation) {
  return operation(a + b);
}

// Lambda / anonymous function pass karna
print(apply(5, 3, (x) => x * 2)); // (5+3)*2 = 16

// Named function pass karna
int square(int n) => n * n;
print(apply(5, 3, square)); // (5+3)^2 = 64
```

### Closures — "Lexical Scope" (Important!)

Ek closure woh function hai jo apne surrounding scope ke variables ko "capture" karta hai.

```dart
Function makeCounter() {
  int count = 0;
  
  // Inner function apna surrounding scope ko capture karti hai
  return () {
    count++;
    return count;
  };
}

// Create counter
var counter = makeCounter();
print(counter()); // 1
print(counter()); // 2
print(counter()); // 3
// `count` variable persist karti hai har call ke beech!

// Har counter ka apna state hota hai
var counter2 = makeCounter();
print(counter2()); // 1 (alag counter)
```

**Real-world example (Callback functions):**

```dart
// Socho Zomato-like app ka "order processing" flow
void processOrder(
  Order order,
  Function(String) onSuccess,
  Function(String) onError,
) {
  // Simulate API call
  Future.delayed(Duration(seconds: 2), () {
    if (order.items.isNotEmpty) {
      onSuccess('Order placed: ${order.id}');
    } else {
      onError('Cart is empty');
    }
  });
}

// Closure: local variables ko capture karte hue callback define karo
String orderId = 'ORD-12345';
processOrder(
  order,
  (message) => print('✅ $message (Order: $orderId)'), // Closure — orderId capture
  (error) => print('❌ Error: $error'),
);
```

> [!tip]
> Closures Dart mein powerful hote hain state management aur async operations ke liye. Flutter mein StateNotifier, ChangeNotifier patterns closures par built hote hain.

---

## Part 4: String Interpolation — The "Nice-to-Have"

JavaScript mein template literals backticks use karte ho:

```javascript
// JavaScript
const name = 'Siddesh';
const age = 25;
console.log(`Hello, ${name}! You are ${age} years old.`);
```

Dart mein single quotes ya double quotes mein:

```dart
// Dart
String name = 'Siddesh';
int age = 25;

// String interpolation with `$variable`
print('Hello, $name! You are $age years old.');
// Output: Hello, Siddesh! You are 25 years old.

// Expression mein `${...}` use karo
print('Next year: ${age + 1}'); // Next year: 26

// Method call
print('Name length: ${name.length}'); // Name length: 7

// Multiline strings
String bio = '''
Name: $name
Age: $age
Skills: Dart, Flutter, Node.js
''';
print(bio);
```

---

## Part 5: Functions as Objects — Advanced Patterns

### Function Types aur Typedef

```dart
// Define ek function type
typedef Operation = int Function(int, int);

// Use it
Operation add = (a, b) => a + b;
Operation multiply = (a, b) => a * b;

int result1 = add(5, 3);      // 8
int result2 = multiply(5, 3); // 15

// Function returning function
Operation getOperation(String op) {
  if (op == 'add') return (a, b) => a + b;
  if (op == 'multiply') return (a, b) => a * b;
  return (a, b) => 0;
}

var op = getOperation('add');
print(op(10, 20)); // 30
```

### Currying — "Partially Applied Functions"

```dart
// Curried function
Function multiply(int a) {
  return (int b) {
    return (int c) => a * b * c;
  };
}

var times2 = multiply(2);
var times2and3 = times2(3);
print(times2and3(5)); // 2 * 3 * 5 = 30

// Shorter syntax
Function add = (int a) => (int b) => (int c) => a + b + c;
print(add(1)(2)(3)); // 6
```

---

## Part 6: Practical Examples — Collections + Functions

### Scenario 1: User Data Processing (like Swiggy)

```dart
class Restaurant {
  final String name;
  final double rating;
  final List<String> cuisines;
  final int deliveryTime;
  final int deliveryCharge;

  Restaurant({
    required this.name,
    required this.rating,
    required this.cuisines,
    required this.deliveryTime,
    required this.deliveryCharge,
  });
}

void main() {
  List<Restaurant> restaurants = [
    Restaurant(
      name: 'Butter Chicken Corner',
      rating: 4.5,
      cuisines: ['North Indian', 'Mughlai'],
      deliveryTime: 30,
      deliveryCharge: 50,
    ),
    Restaurant(
      name: 'South Express',
      rating: 4.8,
      cuisines: ['South Indian', 'Vegetarian'],
      deliveryTime: 25,
      deliveryCharge: 30,
    ),
    Restaurant(
      name: 'Pizza Palace',
      rating: 4.2,
      cuisines: ['Italian', 'Pizzas'],
      deliveryTime: 35,
      deliveryCharge: 40,
    ),
  ];

  // Filter: high-rated restaurants
  var topRated = restaurants
    .where((r) => r.rating >= 4.5)
    .toList();
  print('Top rated: ${topRated.map((r) => r.name).toList()}');
  // Output: [Butter Chicken Corner, South Express]

  // Filter: fast delivery (< 30 min)
  var fastDelivery = restaurants
    .where((r) => r.deliveryTime < 30)
    .toList();

  // Map: extract names
  var names = restaurants.map((r) => r.name).toList();
  print(names);

  // Combine filters
  var bestDeal = restaurants
    .where((r) => r.rating >= 4.5 && r.deliveryCharge < 50)
    .toList();

  // Sort by rating (descending)
  restaurants.sort((a, b) => b.rating.compareTo(a.rating));

  // Group by cuisine (Map ke sath)
  Map<String, List<Restaurant>> byCuisine = {};
  for (var r in restaurants) {
    for (var cuisine in r.cuisines) {
      byCuisine.putIfAbsent(cuisine, () => []);
      byCuisine[cuisine]!.add(r);
    }
  }
  print(byCuisine);
}
```

### Scenario 2: Order Calculation (like BigBasket)

```dart
class Item {
  final String name;
  final double price;
  final int quantity;

  Item({
    required this.name,
    required this.price,
    required this.quantity,
  });

  double get subtotal => price * quantity;
}

void main() {
  List<Item> cart = [
    Item(name: 'Milk', price: 60, quantity: 2),
    Item(name: 'Bread', price: 40, quantity: 1),
    Item(name: 'Eggs', price: 80, quantity: 1),
  ];

  // Total using reduce
  double subtotal = cart
    .map((item) => item.subtotal)
    .reduce((a, b) => a + b);
  print('Subtotal: ₹$subtotal'); // ₹260

  // Apply discount function
  double applyDiscount(double amount, double discountPercent) {
    return amount * (1 - discountPercent / 100);
  }

  double discountedTotal = applyDiscount(subtotal, 10); // 10% discount
  print('After discount: ₹$discountedTotal'); // ₹234

  // Calculate with delivery charge
  double delivery = 50;
  double finalAmount = discountedTotal + delivery;
  print('Final: ₹$finalAmount'); // ₹284

  // Summary using Map
  Map<String, dynamic> orderSummary = {
    'items': cart.length,
    'subtotal': subtotal,
    'discount': subtotal - discountedTotal,
    'delivery': delivery,
    'total': finalAmount,
    'itemNames': cart.map((item) => item.name).toList(),
  };
  
  print('\n=== ORDER SUMMARY ===');
  orderSummary.forEach((key, value) {
    print('$key: $value');
  });
}
```

### Scenario 3: Filtering aur Transforming (like IRCTC Trains)

```dart
class Train {
  final String name;
  final String source;
  final String destination;
  final int duration; // hours
  final double basePrice;
  final List<String> classes; // 'AC', 'Sleeper', 'General'

  Train({
    required this.name,
    required this.source,
    required this.destination,
    required this.duration,
    required this.basePrice,
    required this.classes,
  });
}

void main() {
  List<Train> trains = [
    Train(
      name: 'Rajdhani Express',
      source: 'Mumbai',
      destination: 'Delhi',
      duration: 16,
      basePrice: 3500,
      classes: ['AC'],
    ),
    Train(
      name: 'Local Express',
      source: 'Mumbai',
      destination: 'Pune',
      duration: 3,
      basePrice: 500,
      classes: ['General', 'Sleeper'],
    ),
    Train(
      name: 'Shatabdi Express',
      source: 'Delhi',
      destination: 'Agra',
      duration: 2,
      basePrice: 2000,
      classes: ['AC'],
    ),
  ];

  // Filter: short journeys (< 5 hours)
  var shortJourneys = trains
    .where((t) => t.duration < 5)
    .toList();

  // Filter: affordable (< 1000)
  var affordable = trains
    .where((t) => t.basePrice < 1000)
    .toList();

  // Map: create ticket info
  List<Map<String, dynamic>> ticketInfo = trains
    .map((t) => {
      'train': t.name,
      'route': '${t.source} → ${t.destination}',
      'duration': '${t.duration}h',
      'price': '₹${t.basePrice}',
    })
    .toList();

  // Find train with cheapest ticket
  Train? cheapest = trains.isNotEmpty
    ? trains.reduce((a, b) => a.basePrice < b.basePrice ? a : b)
    : null;
  
  if (cheapest != null) {
    print('Cheapest: ${cheapest.name} (₹${cheapest.basePrice})');
  }

  // Check if all trains have AC
  bool allHaveAC = trains.every((t) => t.classes.contains('AC')); // false

  // Check if any train is very cheap
  bool hasUltraCheap = trains.any((t) => t.basePrice < 1000); // true

  // Group by source
  Map<String, List<Train>> bySource = {};
  for (var train in trains) {
    bySource.putIfAbsent(train.source, () => []);
    bySource[train.source]!.add(train);
  }
}
```

---

## Part 7: Why This Matters for Flutter

Dart ka foundation strong rakho, kyuki Flutter pura Dart par built hai:

1. **State Management** — closures aur higher-order functions samajhna zauri hai (StatefulWidget, ChangeNotifier patterns mein heavily use hota hai)

2. **Collections ke operations** — `.map()`, `.where()`, `.reduce()` Flutter code mein constantly use hota hai (UI lists render karte waqt, state transformations mein)

3. **Null safety** — Flutter apps mein null-related crashes common hote hain agar null safety samajh nahi aate

4. **Type safety** — TypeScript ke level ka type safety Dart mein hota hai, jo production apps mein crashes prevent karta hai

5. **Async functions** — `Future` aur `async/await` samajhna flutter mein essential hai (networks calls, file operations ke liye)

---

## Key Takeaways

- **Dart is the language Flutter runs on** — null-safe, strongly typed, with type inference for convenience
- **Variables: `var` (inferred), `final` (immutable at runtime), `const` (compile-time constant), `dynamic` (avoid)**
- **Null safety by default** — use `?` for nullable types, `??` for null coalescing, `?.` for safe navigation
- **Collections**: Lists (`.map()`, `.where()`, `.reduce()`), Maps (key-value storage), Sets (unique elements)
- **Functions are first-class** — pass them as parameters, return them, store them in variables
- **Named parameters** use `{required Type name}` — cleaner API design than positional args
- **Closures capture surrounding scope** — powerful for callbacks, state capture, and higher-order functions
- **String interpolation** with `$variable` or `${expression}` — no need for template literals
- **Collection operations** (map, filter, reduce) are Dart idioms — use them instead of loops
- **Type inference + strong typing** = safe code with less boilerplate
