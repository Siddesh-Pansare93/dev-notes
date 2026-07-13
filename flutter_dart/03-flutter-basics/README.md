# Flutter Basics — Setup, Your First App, Widget Tree

Socho ek second ke liye — jab tum Zomato app chalate ho aur kisi restaurant ko tap karte ho, kya hota hai? Screen instantly refresh ho jaata hai, animation smooth chal jaati hai, sab kuch responsive rehta hai — **aur yeh sab iOS, Android, Web par same ho**. Yeh Flutter ka magic hai.

Flutter ek **cross-platform framework** hai jisne mobile development ko completely revolutionize kiya. Node.js/Express backend devs ke liye, Flutter basically ek reactive UI framework hai — socho **React ki mental model + Dart ki power = mobile apps jo blazingly fast hain aur ship karne mein easy hain**.

Isse pehle, "why Flutter?" samajhte hain. Phir setup karte hain, pehla app likha aur deep-dive karenge widget tree aur state management mein.

---

## Section 1: Why Flutter? The React of Mobile

### The Problem: Write Once, Ship Everywhere

Before Flutter, tere paas do options the:
1. **Native apps** — iOS (Swift), Android (Kotlin) — fast, perfect, par code duplicate. Ek button iPhone mein likha, dobara Android mein.
2. **Cross-platform (React Native, Cordova, Xamarin)** — one codebase, par performance issues, JS bridge overhead, third-party library problems.

Flutter ne **directly compile kiya Dart code native ARM machine code mein** — no interpreter, no bridge. Result? **60-120 FPS animations, native performance, single codebase**.

### Why Dart?

Dart ek "boring but brilliant" language hai. Isse samajho:
- **Null safety** — `String?` vs `String` — compile time par null errors catch ho jaate hain (Node mein runtime pe RuntimeError aata)
- **JIT + AOT compilation** — development mein fast (hot reload), production mein blazing fast
- **Garbage collection + generational** — memory efficient
- **Everything is an object** — Python/Ruby jaisa, but typed aur fast
- **Async/await built-in** — Futures aur Streams (RxJS jaise)

```dart
// Dart ka syntax Node dev ko familiar lagega
String greet(String name) => 'Hello, $name!'; // arrow functions

// Null safety
String? maybeNull; // can be null
String notNull = 'always'; // cannot be null

// Type inference
var message = 'This is a String'; // compiler infers type

// Async/await
Future<void> fetchData() async {
  final response = await http.get(uri);
  print(response.body);
}

// Streams (like RxJS)
Stream<int> countStream() async* {
  for (int i = 0; i < 5; i++) {
    yield i;
  }
}
```

> [!info]
> **Key difference from Node.js**: Dart compile-time type checking + null safety = fewer runtime surprises. TypeScript ki dhun par chalta hai, par production code automatically type-safe hota hai.

---

## Section 2: Installing Flutter SDK

### Step 1: Download & Extract

Go to **https://flutter.dev/docs/get-started/install** (aur apne OS select kar):

**Windows par:**
```bash
# Download flutter-windows-x.x.x-stable.zip (latest)
# C:\src\ mein extract kar (ya apna preferred path)
```

**macOS par:**
```bash
# Download flutter-macos-x.x.x-stable.zip
# ~/development/ mein extract kar
```

**Linux par:**
```bash
# tar xf flutter_linux_x.x.x-stable.tar.xz
# ~/development/ mein move kar
```

### Step 2: Add to PATH

Terminal mein `flutter doctor` chalana hai, par pehle PATH set kar.

**Windows (PowerShell):**
```powershell
# Check current PATH
echo $env:Path

# Add Flutter to PATH (permanently)
[Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\src\flutter\bin", "User")
```

**macOS/Linux (bash/zsh):**
```bash
# Add to ~/.zshrc or ~/.bashrc
export PATH="$PATH:$HOME/development/flutter/bin"
```

Phir **naya terminal khol** aur:
```bash
flutter --version
# Flutter 3.x.x • channel stable
```

### Step 3: Run Flutter Doctor

```bash
flutter doctor
```

Output dekhe — **green checkmarks aur red X's**. Red X's ke liye troubleshooting:

```
✓ Flutter SDK
✓ Android toolchain
✓ Xcode (macOS/iOS)
✗ Visual Studio Code
  → VSCode install kar ya `flutter config --no-analytics` kar
```

**Important issues:**
- **Android Studio / Xcode missing** → download kar (iOS/Android dev ke liye)
- **Connected devices nahi** → `flutter devices` check kar; USB debugging enable kar

### Step 4: Editor Setup

VSCode recommended hai (lightweight, fast):
```bash
# Install extensions
# 1. "Flutter" (Dart Code)
# 2. "Dart" (Dart Code)
# 3. "Thunder Client" or "REST Client" (optional)
```

Android Studio bhi setup kar sakte ho (heavier, par IntelliSense better):
```bash
android studio
# → SDK Manager → Android SDK, Virtual Device
```

---

## Section 3: Your First App — Hello World

### Create the Project

```bash
flutter create hello_world
cd hello_world
```

**Project structure:**

```
hello_world/
├── android/          # Android native code
├── ios/              # iOS native code
├── lib/
│   └── main.dart     # Entry point (socho JavaScript ka index.js)
├── pubspec.yaml      # Dependencies (socho package.json)
├── pubspec.lock      # Lock file
├── test/             # Unit tests
└── ...
```

### Open `lib/main.dart`

Flutter create kar deta hai template code. Pehle usse dekh, phir samajh:

```dart
import 'package:flutter/material.dart';

void main() {
  runApp(const MyApp());
  // Entry point — issi se app start hota hai
  // const MyApp() = app root widget
}

class MyApp extends StatelessWidget {
  const MyApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Hello World',
      theme: ThemeData(
        primarySwatch: Colors.blue,
      ),
      home: const MyHomePage(title: 'Flutter Demo'),
      // home = landing screen
    );
  }
}

class MyHomePage extends StatefulWidget {
  const MyHomePage({Key? key, required this.title}) : super(key: key);
  final String title;

  @override
  State<MyHomePage> createState() => _MyHomePageState();
}

class _MyHomePageState extends State<MyHomePage> {
  int _counter = 0;

  void _incrementCounter() {
    setState(() {
      _counter++;
    });
    // setState = re-render trigger (React ke useState jaise)
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.title),
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: <Widget>[
            const Text('You have pushed the button this many times:'),
            Text(
              '$_counter',
              style: Theme.of(context).textTheme.headline4,
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _incrementCounter,
        tooltip: 'Increment',
        child: const Icon(Icons.add),
      ),
    );
  }
}
```

### Run It

```bash
flutter run
```

Android/iOS device ya emulator connect kar. Emulator nahi hai?

**Android Emulator bana:**
```bash
flutter emulators
flutter emulators create --name "Pixel_5"
flutter emulators launch Pixel_5
# Phir flutter run karte ho
```

**macOS/iOS:**
```bash
open -a Simulator
flutter run
```

---

## Section 4: Understanding Widgets — The Mental Model

Ek bar phir socho Zomato par. Jab tu app kholte ho:
- Header bar (AppBar)
- Search box (TextField)
- Food cards list (ListView)
- Rating stars (Row + Icon)
- Price text (Text)

**Har chiz ek widget hai.** Aur ye sab nested hote hain — ek large widget mein chhote widgets hote hain.

### Widget Hierarchy (Tree)

```
MaterialApp
  └─ Scaffold
      ├─ AppBar
      │   └─ Text
      ├─ Center
      │   └─ Column
      │       ├─ Text
      │       └─ Text
      └─ FloatingActionButton
          └─ Icon
```

**Key insight**: Ye tree structure React components jaisa hai. But Flutter mein **"render karte ho lagatar"** — har frame (60 FPS) par build() call hota hai.

### Widget Categories

**1. Layout widgets** — spacing aur positioning
```dart
Row, Column, Stack, Center, Padding, Align, SizedBox
```

**2. Visual widgets** — UI elements
```dart
Text, Image, Icon, Container, Card, Divider
```

**3. Input widgets** — user interaction
```dart
TextField, Button, GestureDetector, Checkbox, RadioButton
```

**4. Scroll widgets** — infinite lists
```dart
ListView, GridView, SingleChildScrollView, PageView
```

**5. Composition widgets** — app structure
```dart
MaterialApp, Scaffold, Drawer, BottomNavigationBar
```

### Stateless vs Stateful — Critical Difference

**StatelessWidget**: Data nahi change hota, bas render hota hai. Socho ek poster jispe likha hai "Welcome!"
```dart
class Greeting extends StatelessWidget {
  final String name;

  const Greeting({required this.name});

  @override
  Widget build(BuildContext context) {
    return Text('Hello, $name!');
    // bas output — koi internal state nahi
  }
}
```

**StatefulWidget**: Data change hota hai, UI re-render hota hai. Socho Zomato ka delivery timer — time badal raha hai, timer UI bhi update ho raha hai.
```dart
class Timer extends StatefulWidget {
  @override
  State<Timer> createState() => _TimerState();
  // State class mein actual data aur setState ho
}

class _TimerState extends State<Timer> {
  int seconds = 0;

  void _start() {
    Timer.periodic(Duration(seconds: 1), (_) {
      setState(() {
        seconds++;
        // setState = "re-render ho, aur naya data display kar"
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    return Text('Time: $seconds seconds');
  }
}
```

> [!warning]
> **Common mistake**: setState ka abuse. Har setState call par pura widget rebuild hota hai. Large apps mein ye performance issue ban jaata hai (BLoC/Provider se solve hota hai, later chapters mein).

---

## Section 5: Deep Dive — Widget Lifecycle & BuildContext

### StatefulWidget Lifecycle

Jab tum ek StatefulWidget create karte ho, ye sequence hota hai:

```
1. Constructor call
   └─> MyStatefulWidget(...)

2. createState() call
   └─> _MyStateClass instance banata hai

3. initState() — ek baar chalata hai
   └─> API call, listener setup, animation start
   └─> initState ke baad pehla build() hota hai

4. build() — lagatar
   └─> setState() hone par phir se build()
   └─> parent rebuild ho tab bhi build()

5. didUpdateWidget() — optional
   └─> parent ne apna data change kiya aur state pass kiya

6. dispose() — ek baar, cleanup
   └─> subscriptions close, timers cancel, listeners remove
```

**Real example:**

```dart
class CounterApp extends StatefulWidget {
  @override
  State<CounterApp> createState() => _CounterAppState();
}

class _CounterAppState extends State<CounterApp> {
  int count = 0;
  late StreamSubscription<int> subscription;

  @override
  void initState() {
    super.initState();
    print('initState called');
    
    // API call ya listener setup kar
    subscription = someStream.listen((value) {
      setState(() {
        count = value;
      });
    });
  }

  @override
  void didUpdateWidget(CounterApp oldWidget) {
    super.didUpdateWidget(oldWidget);
    print('didUpdateWidget called');
    // Parent ne widget properties change ki
  }

  @override
  Widget build(BuildContext context) {
    print('build called'); // har setState() par chalega
    return Scaffold(
      body: Center(
        child: Text('Count: $count'),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          setState(() => count++);
        },
      ),
    );
  }

  @override
  void dispose() {
    super.dispose();
    print('dispose called');
    subscription.cancel(); // cleanup!
  }
}
```

**Output (pehli baar run karte ho):**
```
initState called
build called
[user taps button]
build called
[user navigates back]
dispose called
```

### BuildContext — The Magic Object

`BuildContext` ek reference hai current widget ka position ke liye widget tree mein. Isse tum:

1. **Parent widgets access kar** — `Theme.of(context)`, `MediaQuery.of(context)`
2. **Navigation karte ho** — `Navigator.push(context, ...)`
3. **Theme data le sakte ho** — colors, text styles

```dart
class MyWidget extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    // context = yeh widget ka location in tree
    
    // Theme data get kar
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    // Screen size pata kar
    final size = MediaQuery.of(context).size;
    final isSmallScreen = size.width < 600;

    // Navigation
    void goToHome() {
      Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => HomePage()),
      );
    }

    return Scaffold(
      body: Container(
        width: size.width,
        color: isDark ? Colors.black : Colors.white,
        child: Text('Hello!'),
      ),
    );
  }
}
```

> [!tip]
> **Pro tip**: `context` ko child widgets mein pass mat kar unnecessarily. Instead, `of(context)` methods use kar — ye automatically find kar dete hain.

---

## Section 6: Real App — Tap Counter (Stateful Widget Showcase)

Ab ek proper app likha jo sab concepts cover kare:

```dart
import 'package:flutter/material.dart';

void main() {
  runApp(const CounterApp());
}

class CounterApp extends StatelessWidget {
  const CounterApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Tap Counter',
      theme: ThemeData(
        primarySwatch: Colors.indigo,
        useMaterial3: true, // latest Material design
      ),
      home: const CounterPage(),
    );
  }
}

class CounterPage extends StatefulWidget {
  const CounterPage({Key? key}) : super(key: key);

  @override
  State<CounterPage> createState() => _CounterPageState();
}

class _CounterPageState extends State<CounterPage> {
  int _count = 0;
  int _maxTaps = 10;
  late List<int> _taps; // last 5 tap times (ms)

  @override
  void initState() {
    super.initState();
    print('Initializing counter...');
    _taps = [];
  }

  void _recordTap() {
    if (_count < _maxTaps) {
      setState(() {
        _count++;
        _taps.add(DateTime.now().millisecondsSinceEpoch);
        if (_taps.length > 5) _taps.removeAt(0);
      });
    } else {
      // Max reached — show snackbar
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Max $_maxTaps taps reached!'),
          duration: const Duration(seconds: 1),
        ),
      );
    }
  }

  void _reset() {
    setState(() {
      _count = 0;
      _taps.clear();
    });
  }

  double _getProgress() => _count / _maxTaps;

  @override
  Widget build(BuildContext context) {
    final screenSize = MediaQuery.of(context).size;
    final isPortrait = screenSize.height > screenSize.width;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Tap Counter'),
        elevation: 0,
      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            children: [
              // Progress indicator
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: LinearProgressIndicator(
                  value: _getProgress(),
                  minHeight: 8,
                  backgroundColor: Colors.grey[300],
                  valueColor: AlwaysStoppedAnimation<Color>(
                    _getProgress() > 0.8 ? Colors.red : Colors.indigo,
                  ),
                ),
              ),
              const SizedBox(height: 32),

              // Main counter display
              Container(
                padding: const EdgeInsets.all(32),
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: Colors.indigo[100],
                  boxShadow: [
                    BoxShadow(
                      color: Colors.indigo.withOpacity(0.3),
                      spreadRadius: 8,
                      blurRadius: 16,
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    Text(
                      '$_count',
                      style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                        fontSize: 64,
                        fontWeight: FontWeight.bold,
                        color: Colors.indigo,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'of $_maxTaps',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: Colors.indigo[600],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 32),

              // Stats
              if (_taps.isNotEmpty)
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Last ${_taps.length} taps:',
                          style: Theme.of(context).textTheme.labelLarge,
                        ),
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 8,
                          children: [
                            for (int i = 0; i < _taps.length; i++)
                              Chip(
                                label: Text('Tap ${i + 1}'),
                                avatar: CircleAvatar(
                                  child: Text('${i + 1}'),
                                ),
                              ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              const SizedBox(height: 24),

              // Buttons
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: _reset,
                      icon: const Icon(Icons.refresh),
                      label: const Text('Reset'),
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _recordTap,
        tooltip: 'Tap me!',
        child: const Icon(Icons.add),
      ),
    );
  }

  @override
  void dispose() {
    print('Disposing counter...');
    super.dispose();
  }
}
```

**Widget tree samajhte hain isko:**

```
MaterialApp
├─ Scaffold
│   ├─ AppBar
│   │   └─ Text('Tap Counter')
│   ├─ SingleChildScrollView
│   │   └─ Padding
│   │       └─ Column
│   │           ├─ LinearProgressIndicator
│   │           ├─ Container (circle display)
│   │           │   └─ Column
│   │           │       ├─ Text(_count)
│   │           │       └─ Text('of $_maxTaps')
│   │           ├─ Card (stats)
│   │           │   └─ Column
│   │           │       └─ Wrap (chips)
│   │           └─ Row (buttons)
│   │               └─ ElevatedButton
│   └─ FloatingActionButton
```

---

## Section 7: Hot Reload — Development Superpower

Ek tum Flutter mein karte ho jo Node.js/React mein nahi kar sakte:

```bash
flutter run
# App running...
# Aab code change kar

# Terminal mein 'r' press kar
r   # Hot Reload — sirf code changes apply hota hai, state rakhta hai
R   # Hot Restart — full restart, state reset
```

**Demo:**

```dart
// Original
Text('Hello World')

// File save kar + 'r' press kar
Text('Hello Flutter!') // App mein instantly change dikhega

// State change nahi hota — counter jaisa kuch 5 pe ho to 5 hi rahega
```

Ye **development speed 10x badha deta hai**. Imagine: CSS change karke instantly dekh lo, widget properties tweak kar lo, API response mock kar lo — sab instant feedback.

> [!warning]
> **When hot reload fails**: Complex state changes, native code edit, pubspec.yaml change — inse pehle hot restart karna padta hai. Flutter automatically detect karega aur suggest karega.

---

## Section 8: The Widget Tree — Mental Model Deep Dive

### Why Tree Matters?

Har widget ek function jaisa hai jo returns `Widget`. Build mein `build()` method recursively call hota hai:

```
MyApp.build()
  └─ MaterialApp.build()
      └─ Scaffold.build()
          └─ Column.build()
              ├─ Text.build()
              ├─ Icon.build()
              └─ Button.build()
```

**Key**: Jab bottom-most widget re-build hota hai (setState), parent bhi rebuild hota hai.

### Optimization — const Keyword

Ab samajhega why `const` important hai:

```dart
// Without const — har build par new object
FloatingActionButton(
  onPressed: () {},
  child: Icon(Icons.add), // new Icon() object created
)

// With const — object reuse hota hai
const FloatingActionButton(
  tooltip: 'Add',
  child: Icon(Icons.add), // same Icon() object
)
```

`const` use karte ho to Flutter know karti hai "yeh widget nahi badla" — rebuild skip kar deti hai. **Performance boost.**

### Widget Key — Advanced Concept

Jab tum ListView mein items add/remove karte ho, Flutter confused ho jaata hai. `Key` se uniqueness batao:

```dart
ListView(
  children: [
    for (var item in items)
      ListTile(
        key: ValueKey(item.id), // unique ID
        title: Text(item.name),
      ),
  ],
)
```

---

## Section 9: Common Patterns & Gotchas

### Pattern 1: Dialog & Navigation

```dart
// Dialog dikha
showDialog(
  context: context,
  builder: (_) => AlertDialog(
    title: const Text('Confirm?'),
    actions: [
      TextButton(
        onPressed: () => Navigator.pop(context), // back
        child: const Text('Cancel'),
      ),
      TextButton(
        onPressed: () => Navigator.pop(context, true), // with value
        child: const Text('OK'),
      ),
    ],
  ),
);
```

### Pattern 2: Text Input

```dart
class LoginForm extends StatefulWidget {
  @override
  State<LoginForm> createState() => _LoginFormState();
}

class _LoginFormState extends State<LoginForm> {
  final emailController = TextEditingController();

  @override
  void dispose() {
    emailController.dispose(); // Important! cleanup
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: emailController,
      decoration: InputDecoration(
        hintText: 'Enter email',
        prefixIcon: const Icon(Icons.email),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
        ),
      ),
      onChanged: (value) {
        setState(() {
          // update UI based on input
        });
      },
    );
  }
}
```

### Gotcha 1: Uninitialized Variables

```dart
// WRONG — compile error
String text = null; // String cannot be null by default

// RIGHT — null safety
String? text = null; // nullable
String text = 'default'; // non-nullable, must have value
```

### Gotcha 2: setState in dispose()

```dart
@override
void dispose() {
  setState(() {}); // ERROR! widget already disposed
  super.dispose();
}

// RIGHT
@override
void dispose() {
  // direct cleanup, no setState
  subscription.cancel();
  controller.dispose();
  super.dispose();
}
```

### Gotcha 3: Context in async

```dart
// WRONG — context invalid jab async complete ho
Future<void> fetchData() async {
  final data = await api.fetch();
  setState(() { // ERROR if widget disposed!
    this.data = data;
  });
}

// RIGHT
if (mounted) { // check widget still in tree
  setState(() {
    this.data = data;
  });
}
```

---

## Section 10: Debugging & DevTools

Flutter has official DevTools:

```bash
flutter pub global activate devtools
devtools
# Browser pe http://localhost:9100 khulega
```

Ya directly:
```bash
flutter run --profile
# Phir debug menu mein DevTools option
```

**Useful debugging:**

```dart
// Print with timestamps
debugPrint('Counter: $_count'); // ignores verbose logs

// Assert in development
assert(() {
  debugPrint('Debug only');
  return true;
}());

// Performance monitor
flutter run --profile
# DevTools → Performance tab
```

---

## Key Takeaways

- **Flutter ek UI framework hai Dart mein, cross-platform apps ke liye** — write once, ship iOS/Android/Web
- **Widget tree ek React component tree jaisa hai** — nested widgets, composition-based
- **StatelessWidget static hai (pure), StatefulWidget mutable data rakhte hain** — setState() se re-render hota hai
- **Lifecycle critical hai — initState() mein setup, dispose() mein cleanup** — memory leaks se bachne ke liye
- **BuildContext widget ka tree position batata hai** — Theme, size, navigation get karte ho
- **Hot reload development speed badha deta hai** — code change → instant feedback
- **const keyword use kar performance optimize karne ke liye** — widget rebuild skip hota hai
- **Null safety built-in — String? vs String — compile time par errors catch ho**
- **Key use kar ListView/dynamic lists mein** — Flutter ko uniqueness malum ho
- **Async/await + Streams reactive programming ke liye** — RxJS jaisa Dart mein
