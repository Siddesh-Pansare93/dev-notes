# State Management Foundations — setState, InheritedWidget, Provider Intro

Socho ek second ke liye. Jab tum Zomato app khol rahe ho aur restaurant ka order place karte ho, phir tracking dekh rahe ho, to har ek update — order accepted, rider assigned, delivery in progress — UI automatically update ho jaata hai. Woh update automatically nahi hoti. Piche state management ka khel hai.

Flutter mein **state management = UI ko update karna jab data change ho**. Isse pehle ke liye, samajhte hain — problem kya hai aur solutions kya hain.

---

## Why State Management Matters — The Fundamental Problem

### Pehla samajho: UI = fn(state)

```
State (data)
    ↓
    fn() (UI builder)
    ↓
Screen (what user dekh raha hai)
```

Jab state change hoti hai, **puura UI re-build hona padta hai**. Arre har bar? Haan. Lekin smartly.

### React se analogy (tum Node.js dev ho, samajh jayega)

Node.js/React mein:
```javascript
const [count, setCount] = useState(0);
<button onClick={() => setCount(count + 1)}>
  Count: {count}
</button>
```

Jab `setCount(count + 1)` call karte ho:
1. State update hoti hai
2. Component re-render hota hai
3. UI update hota hai

**Flutter mein bilkul same pattern hai**. Lekin Dart mein implementation alag hai.

### Problem without state management

Maan lo ek counter app — 3 nested widgets mein. Ek parent, ek middle child, ek deep nested child. Deep child mein counter increase karna hai.

```
Parent (isme counter state hai)
  └─ Middle (kuch kaam kare)
       └─ Deep Child (yaha increment button hai)
```

Deep Child ko parent ka state update karna hai. Kaise?

**Option 1: Pass function as callback** — Middle child ko pass karo, phir Deep Child ko pass karo. Multi-level drilling (prop drilling). Matlab Middle widget ko counter ke bare mein kuch nahi pata, phir bhi pass karna padta hai. Yeh messy hai.

**Option 2: Pucha problem ek ek line mein solve karna** — StateManagement pattern use karo.

---

## setState — The Built-in Solution

### Kya hai setState?

`setState()` ek method hai jo StatefulWidget mein available hai. Ye bolti hai Flutter ko: "Arre, mera state change hua. Widget ko rebuild kar."

### Real Example: Counter App

```dart
import 'package:flutter/material.dart';

class CounterApp extends StatefulWidget {
  @override
  State<CounterApp> createState() => _CounterAppState();
}

class _CounterAppState extends State<CounterApp> {
  int counter = 0;

  void incrementCounter() {
    setState(() {
      counter++;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Counter: $counter')),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              'Count: $counter',
              style: Theme.of(context).textTheme.headlineMedium,
            ),
            SizedBox(height: 20),
            ElevatedButton(
              onPressed: incrementCounter,
              child: Text('Increment'),
            ),
          ],
        ),
      ),
    );
  }
}
```

**Ye kya hota hai:**

1. `incrementCounter()` call hota hai (button press par)
2. `setState(() { counter++; })` call hota hai
3. Flutter ko signal milta: "State changed"
4. `build()` method phir se call hota hai
5. `Text('Count: $counter')` updated value ke saath render hota hai

### setState ka lifecycle

```
User button press kare
         ↓
incrementCounter() call ho
         ↓
setState(() { counter++; })
         ↓
Flutter: "Arre, ye widget mein state change hua?"
         ↓
Old widget ko discard karo, naya build() call karo
         ↓
UI update (Text aur AppBar dono update)
```

---

## setState ke Limits — Kab Problem Aata Hai

### Problem 1: Single Widget Limited

setState **sirf usi StatefulWidget ko update karte hai** jisme state rakhta hai. Agar dusre widget ko update karna hai, to callback pass karna padega aur prop drilling start ho jaati hai.

**Example: Multiple Widgets Ko Update Karna**

```dart
class CounterApp extends StatefulWidget {
  @override
  State<CounterApp> createState() => _CounterAppState();
}

class _CounterAppState extends State<CounterApp> {
  int counter = 0;

  void incrementCounter() {
    setState(() {
      counter++;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Counter: $counter')),
      body: Column(
        children: [
          // Level 1
          CounterDisplay(counter: counter),
          // Level 2 - Middle child
          SizedBox(height: 20),
          CounterButton(
            onPressed: incrementCounter,
          ),
        ],
      ),
    );
  }
}

class CounterDisplay extends StatelessWidget {
  final int counter;
  CounterDisplay({required this.counter});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Text('Count: $counter'),
    );
  }
}

class CounterButton extends StatelessWidget {
  final VoidCallback onPressed;
  CounterButton({required this.onPressed});

  @override
  Widget build(BuildContext context) {
    return ElevatedButton(
      onPressed: onPressed,
      child: Text('Increment'),
    );
  }
}
```

Yeh abhi theek hai. Lekin agar 5 widgets ko counter chahiye? 10 widgets? Sab ko pass karna padega. Nightmare hai.

### Problem 2: Performance — Unnecessary Rebuilds

```dart
class _CounterAppState extends State<CounterApp> {
  int counter = 0;
  String userName = "Siddesh";
  List<Product> products = [...]; // Expensive list

  void incrementCounter() {
    setState(() {
      counter++;
      // NOTE: userName aur products bhi re-build honge,
      // bhle unhe counter se kuch care nahi
    });
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text('User: $userName'), // Re-builds hoga
        ProductList(products: products), // Re-builds hoga (expensive!)
        Text('Count: $counter'), // Re-builds hoga
      ],
    );
  }
}
```

Jab counter increment hota hai, **puura state re-build hota hai**. ProductList maybe ek expensive widget hai jisme 1000 products render hote hain. Unnecessary rebuilds = performance drains.

### Problem 3: Complex State Logic

```dart
class _CounterAppState extends State<CounterApp> {
  int counter = 0;
  bool isLoading = false;
  String error = '';
  List<String> history = [];

  void incrementCounter() async {
    setState(() {
      isLoading = true;
      error = '';
    });

    try {
      await Future.delayed(Duration(seconds: 1));
      setState(() {
        counter++;
        history.add('Incremented at ${DateTime.now()}');
        isLoading = false;
      });
    } catch (e) {
      setState(() {
        error = e.toString();
        isLoading = false;
      });
    }
  }

  // ... multiple setState calls across multiple methods
}
```

Dekhta hai? setState ke calls phail gaye har jaga. State logic ko track karna mushkil. Testing bhi complex.

> [!warning]
> **setState ka golden rule:** Agar tere app mein 2-3 से ज्यादा setState calls ek saath chal rahe hain ya nesting deep hai, to time hai state management pattern use karne ka.

---

## InheritedWidget — Ancestor Data Passing Pattern

### Kya hai InheritedWidget?

`InheritedWidget` ek special widget hai jo apne **children ko data pass kar sakta hai** **without explicitly passing parameters**.

React/Vue mein iska equivalent `Context API` hai. Backend Node.js mein `dependency injection` jaise soch.

### Architecture — Kaise Kaam Karte Hai

```
InheritedWidget (data rakhta hai)
        ↓
   Child 1
   Child 2
   Child 3
         ↓
  Deep Nested Child (Child 3 -> Grandchild -> Great-grandchild)

Deep Nested Child:
  `InheritedWidget.of(context)` call kare
       ↓
  Puree widget tree traverse ho
       ↓
  InheritedWidget ka data mil gaya
```

### Real Example: Theme App (Light/Dark Mode)

```dart
import 'package:flutter/material.dart';

// Step 1: InheritedWidget define karo
class ThemeConfig extends InheritedWidget {
  final String theme; // 'light' ya 'dark'
  final Color primaryColor;
  final VoidCallback toggleTheme;

  const ThemeConfig({
    required this.theme,
    required this.primaryColor,
    required this.toggleTheme,
    required Widget child,
  }) : super(child: child);

  // Step 2: Static method se access karo
  static ThemeConfig of(BuildContext context) {
    // updateShouldNotify ke base par, ye method dependents ko notify karega
    return context.dependOnInheritedWidgetOfExactType<ThemeConfig>()!;
  }

  @override
  bool updateShouldNotify(ThemeConfig oldWidget) {
    // Agar ye true return kare, to dependent widgets rebuild honge
    return oldWidget.theme != theme || oldWidget.primaryColor != primaryColor;
  }
}

// Step 3: Root mein wrap karo
class MyApp extends StatefulWidget {
  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  String currentTheme = 'light';
  Color primaryColor = Colors.blue;

  void toggleTheme() {
    setState(() {
      currentTheme = currentTheme == 'light' ? 'dark' : 'light';
      primaryColor = currentTheme == 'light' ? Colors.blue : Colors.purple;
    });
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      home: ThemeConfig(
        theme: currentTheme,
        primaryColor: primaryColor,
        toggleTheme: toggleTheme,
        child: HomePage(),
      ),
    );
  }
}

// Step 4: Deep nested widget se access karo
class HomePage extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Column(
        children: [
          SettingsButton(),
          UserProfile(),
        ],
      ),
    );
  }
}

// Ye deep nested ho sakta hai
class SettingsButton extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return DeeplyNestedWidget();
  }
}

class DeeplyNestedWidget extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final config = ThemeConfig.of(context);

    return Column(
      children: [
        Container(
          color: config.primaryColor,
          child: Text('Theme: ${config.theme}'),
        ),
        ElevatedButton(
          onPressed: config.toggleTheme,
          child: Text('Toggle Theme'),
        ),
      ],
    );
  }
}

class UserProfile extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final config = ThemeConfig.of(context);

    return Container(
      color: config.primaryColor.withOpacity(0.2),
      child: Text('User Profile (Theme: ${config.theme})'),
    );
  }
}
```

### Key Points: InheritedWidget

```
┌─────────────────────────────────────┐
│  ThemeConfig (InheritedWidget)      │
│  - theme: 'light' / 'dark'          │
│  - primaryColor                     │
│  - toggleTheme()                    │
└────────────────┬────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
    HomePage         OtherPage
        │                 │
        ├─ SettingsButton │
        │     │           │
        │  DeepNested ← Can access ThemeConfig.of(context)
        │
    UserProfile ← Can access ThemeConfig.of(context)
```

### updateShouldNotify — Performance Control

```dart
@override
bool updateShouldNotify(ThemeConfig oldWidget) {
  // True = rebuild dependents
  // False = don't rebuild
  
  return oldWidget.theme != theme || oldWidget.primaryColor != primaryColor;
}
```

Isme tum control kar sakta hai: **kis change par widgets rebuild honge**. Agar sirf theme change kiya, color nahi, to `color` wale widgets rebuild na hon.

### InheritedWidget ke Fayde

✅ **Prop drilling nahi** — Deep nested widgets ko directly access kar sakta hai
✅ **Targeted rebuilds** — `updateShouldNotify` se control karo
✅ **Flutter built-in** — External package nahi chahiye

### InheritedWidget ke Nuksan

❌ **Boilerplate code** — `updateShouldNotify`, static method, `dependOnInheritedWidgetOfExactType` — sab likhna padta hai
❌ **Complex state logic nahi handle kar sakta** — Multi-step operations, transactions, side effects mushkil
❌ **Testing complex** — Context pass karna padta hai
❌ **Large apps mein messy** — Multiple InheritedWidgets, nesting, conflicts

---

## Provider Package — Industrial Strength Solution

### Kya Hai Provider?

Provider ek **state management package** hai jo `InheritedWidget` ko wrap karta hai aur **boilerplate कम करता है**. Ye basically `InheritedWidget` + **convenience features**.

Backend devs ke liye: Provider = dependency injection container + reactivity + listener pattern.

### Installation

```bash
flutter pub add provider
```

### Simple Example: Counter App with Provider

```dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

// Step 1: ChangeNotifier extend karo
class CounterModel extends ChangeNotifier {
  int _counter = 0;

  int get counter => _counter;

  void increment() {
    _counter++;
    notifyListeners(); // Ab listeners ko batao ke state change hua
  }

  void decrement() {
    _counter--;
    notifyListeners();
  }

  void reset() {
    _counter = 0;
    notifyListeners();
  }
}

// Step 2: Root mein provide karo
void main() {
  runApp(
    ChangeNotifierProvider(
      create: (context) => CounterModel(),
      child: MyApp(),
    ),
  );
}

// Step 3: Deep widget se consume karo
class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      home: HomePage(),
    );
  }
}

class HomePage extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Counter App')),
      body: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          CounterDisplay(),
          SizedBox(height: 20),
          CounterButtons(),
        ],
      ),
    );
  }
}

// Watch करो — ye widget rebuild hoga jab counter change ho
class CounterDisplay extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final counter = context.watch<CounterModel>().counter;

    return Text(
      'Count: $counter',
      style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold),
    );
  }
}

// Ye sirf read करना hai, rebuild nahi hona
class CounterButtons extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final model = context.read<CounterModel>();

    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        ElevatedButton(
          onPressed: model.decrement,
          child: Text('−'),
        ),
        SizedBox(width: 20),
        ElevatedButton(
          onPressed: model.reset,
          child: Text('Reset'),
        ),
        SizedBox(width: 20),
        ElevatedButton(
          onPressed: model.increment,
          child: Text('+'),
        ),
      ],
    );
  }
}
```

### context.watch() vs context.read()

Yeh important difference samajh lo:

| Method | Kya Karte Hai | Rebuild? | Use Case |
|--------|--------------|----------|----------|
| `context.watch()` | Read करो + listen करो | ✅ Yes | Display करना, data dikhana |
| `context.read()` | Sirf read करो | ❌ No | Action perform करना (button, callback) |

**Example:**
```dart
// Display करना → watch()
class UserNameDisplay extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final userName = context.watch<UserModel>().name;
    return Text(userName); // Name change par rebuild
  }
}

// Action करना → read()
class LogoutButton extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final userModel = context.read<UserModel>();
    return ElevatedButton(
      onPressed: userModel.logout, // Logout करो
      child: Text('Logout'),
    );
  }
}
```

### Real World: Shopping Cart (Zomato Style)

```dart
// Step 1: Cart model
class CartModel extends ChangeNotifier {
  List<CartItem> _items = [];

  List<CartItem> get items => _items;

  double get total => _items.fold(0, (sum, item) => sum + item.totalPrice);

  void addItem(CartItem item) {
    _items.add(item);
    notifyListeners();
  }

  void removeItem(int index) {
    _items.removeAt(index);
    notifyListeners();
  }

  void clearCart() {
    _items.clear();
    notifyListeners();
  }

  void updateQuantity(int index, int quantity) {
    _items[index].quantity = quantity;
    notifyListeners();
  }
}

class CartItem {
  String name;
  double price;
  int quantity;

  CartItem({
    required this.name,
    required this.price,
    required this.quantity,
  });

  double get totalPrice => price * quantity;
}

// Step 2: Provide करो
void main() {
  runApp(
    ChangeNotifierProvider(
      create: (context) => CartModel(),
      child: ZomatoApp(),
    ),
  );
}

// Step 3: Use करो
class RestaurantPage extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final cart = context.read<CartModel>();

    return Scaffold(
      appBar: AppBar(
        title: Text('Restaurant Menu'),
        actions: [
          Padding(
            padding: EdgeInsets.all(16),
            child: Center(
              child: context.watch<CartModel>().items.isEmpty
                  ? Text('Cart: 0')
                  : Text('Cart: ${context.watch<CartModel>().items.length}'),
            ),
          ),
        ],
      ),
      body: ListView(
        children: [
          MenuItem(
            name: 'Butter Chicken',
            price: 250,
            onAdd: () => cart.addItem(
              CartItem(
                name: 'Butter Chicken',
                price: 250,
                quantity: 1,
              ),
            ),
          ),
          MenuItem(
            name: 'Biryani',
            price: 180,
            onAdd: () => cart.addItem(
              CartItem(
                name: 'Biryani',
                price: 180,
                quantity: 1,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class MenuItem extends StatelessWidget {
  final String name;
  final double price;
  final VoidCallback onAdd;

  MenuItem({
    required this.name,
    required this.price,
    required this.onAdd,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: EdgeInsets.all(8),
      child: ListTile(
        title: Text(name),
        subtitle: Text('₹$price'),
        trailing: ElevatedButton(
          onPressed: onAdd,
          child: Text('Add'),
        ),
      ),
    );
  }
}

class CartPage extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final cart = context.watch<CartModel>();

    if (cart.items.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: Text('Cart')),
        body: Center(child: Text('Cart is empty')),
      );
    }

    return Scaffold(
      appBar: AppBar(title: Text('Cart')),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              itemCount: cart.items.length,
              itemBuilder: (context, index) {
                final item = cart.items[index];
                return ListTile(
                  title: Text(item.name),
                  subtitle: Text('₹${item.price} x ${item.quantity}'),
                  trailing: IconButton(
                    icon: Icon(Icons.delete),
                    onPressed: () => cart.removeItem(index),
                  ),
                );
              },
            ),
          ),
          Divider(),
          Padding(
            padding: EdgeInsets.all(16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Total: ₹${cart.total.toStringAsFixed(2)}',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                ElevatedButton(
                  onPressed: () => cart.clearCart(),
                  child: Text('Clear'),
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

### Provider Variations

Provider ke multiple flavors hain:

```dart
// ChangeNotifierProvider — Reactive state
ChangeNotifierProvider(
  create: (context) => CounterModel(),
  child: MyApp(),
)

// StreamProvider — Stream से data
StreamProvider<int>(
  create: (context) => countStream(),
  initialData: 0,
  child: MyApp(),
)

// FutureProvider — Async data (API call, database)
FutureProvider<User>(
  create: (context) => fetchUser(),
  initialData: null,
  child: MyApp(),
)

// ValueNotifierProvider — Simple value updates
ValueNotifierProvider(
  create: (context) => ValueNotifier<int>(0),
  child: MyApp(),
)
```

---

## setState vs InheritedWidget vs Provider — Comparison

| Feature | setState | InheritedWidget | Provider |
|---------|----------|-----------------|----------|
| **Complexity** | Simple | Medium | Medium |
| **Boilerplate** | Minimal | High | Low |
| **Performance** | All widgets rebuild | Selective (updateShouldNotify) | Selective |
| **Prop drilling** | Yes | No | No |
| **Easy testing** | ✅ | ❌ | ✅ |
| **Works without package** | ✅ | ✅ | ❌ (needs pub.dev) |
| **Scalability** | Low (< 5 setState calls) | Medium | High |
| **Best for** | Simple counters, toggles | Theme/config data | Complex apps, Zomato-like |

---

## When to Use What

### Use setState jab:
- ✅ **Single simple widget** — Counter, form, toggle
- ✅ **State local widget ke liye** — Kisi aur widget ko nahi chahiye
- ✅ **Quick prototyping** — Fast aur simple

### Use InheritedWidget jab:
- ✅ **Read-only data pass करना** — Theme, config, constants
- ✅ **Deep nesting में simple data access** — Settings, preferences
- ✅ **No external dependencies** — Pure Flutter

### Use Provider jab:
- ✅ **Complex state logic** — Multiple actions, async operations
- ✅ **Multiple widgets को same state** — Cart, user profile, filters
- ✅ **Production app** — Scaling, maintainability important
- ✅ **Testing important** — Mocking और testing easy

---

## Common Mistakes & Anti-Patterns

### Mistake 1: setState में heavy computation

```dart
// ❌ BAD
setState(() {
  // Isme 1 second lag raha hai
  largeList.sort();
  largeList.removeWhere(...);
  expensiveCalculation();
});

// ✅ GOOD
// Computation pehle kar lo, phir setState
final sortedList = largeList.toList()..sort();
final filtered = sortedList.where(...).toList();
final result = expensiveCalculation();

setState(() {
  largeList = sortedList;
  filteredData = filtered;
  data = result;
});
```

### Mistake 2: Provider mein अनावश्यक listeners

```dart
// ❌ BAD - Sab listeners recreate hote hain har rebuild par
context.watch<UserModel>().listen((state) {
  print('User changed');
});

// ✅ GOOD - initState mein listen karo
@override
void initState() {
  super.initState();
  context.read<UserModel>().addListener(() {
    print('User changed');
  });
}

@override
void dispose() {
  context.read<UserModel>().removeListener(...);
  super.dispose();
}
```

### Mistake 3: InheritedWidget में mutable objects

```dart
// ❌ BAD
class Config extends InheritedWidget {
  final List<String> settings; // List mutable है

  @override
  bool updateShouldNotify(Config old) {
    return oldWidget.settings != settings; // Object reference compare
  }
}

// ✅ GOOD
class Config extends InheritedWidget {
  final List<String> settings; // या immutable बनाओ
  final int version; // या version tracking करो

  @override
  bool updateShouldNotify(Config old) {
    return oldWidget.version != version;
  }
}
```

### Mistake 4: Context dependency in wrong places

```dart
// ❌ BAD - Model class mein context use
class CartModel {
  void addItem(item, BuildContext context) { // 🚫 Don't do this
    context.read<UserModel>()...
  }
}

// ✅ GOOD - Model है independent, Provider handle करे
class CartModel extends ChangeNotifier {
  void addItem(item) {
    _items.add(item);
    notifyListeners();
  }
}
```

---

## Advanced Pattern: Multi-level State Management

जब एक app बड़ा हो जाता है, तो state management भी layers में divide करनी पड़ती है:

```dart
// Level 1: App-wide state (User, Auth, Theme)
MultiProvider(
  providers: [
    ChangeNotifierProvider(create: (_) => AuthModel()),
    ChangeNotifierProvider(create: (_) => ThemeModel()),
  ],
  child: MyApp(),
)

// Level 2: Feature-specific state (Cart, Orders)
// किसी specific page/feature मे wrap करो
ChangeNotifierProvider(
  create: (_) => CartModel(),
  child: RestaurantPage(),
)

// Level 3: Local widget state (form validation, UI toggles)
// StatefulWidget + setState use करो
class LoginForm extends StatefulWidget { ... }
```

---

## Key Takeaways

- **State Management = UI ko update करना जब data बदल जाए** — Fundamental concept
- **setState = Simple, local, built-in** — Counters, toggles के लिए काफी
- **setState के limits: Single widget, performance, complex logic** — Scaling नहीं करते
- **InheritedWidget = Context API जैसा** — Data passing, boilerplate ज्यादा
- **Provider = Industrial standard** — Boilerplate कम, features ज्यादा, production-ready
- **context.watch() = Subscribe + rebuild; context.read() = Just read**
- **updateShouldNotify = Performance control** — किस change पर rebuild करें
- **Use setState for simple cases, Provider for complex apps** — Zomato/BigBasket style apps के लिए Provider है
- **Avoid prop drilling at all costs** — 3+ levels deep data हो तो InheritedWidget या Provider use करो
- **Multi-level state = App-wide + Feature + Local** — Architecture scalable रहे

