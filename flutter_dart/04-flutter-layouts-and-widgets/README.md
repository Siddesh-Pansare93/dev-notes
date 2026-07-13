# Layouts and Widgets — BuildContext, Scaffold, Lists, Navigation

Toh socho ek second ke liye — jab tum Zomato app open karte ho, toh kya dikhता है? Upar ek AppBar, beech mein restaurant ki list, aur bottom mein kuch actions. Yeh sab kuch **widgets** hain, jo ek **BuildContext** mein organize hote hain. Flutter mein UI banane ka matlab — widgets ke beech ek proper structure rakhna, aur navigation handle karna.

Backend developer keหत़े, tum Node.js/Express mein routes aur middleware use karte ho. Flutter mein **Scaffold** ek container hai (Express mein app.js jaise), **BuildContext** ek environment hai (dependency injection), aur **Navigator** routing ka kaam karta hai. Chalte hain deep dive mein.

---

## BuildContext — Foundation of Everything

BuildContext kya hota hai? Think of it ek **reference to a location in the widget tree** — jaise Node.js mein `this` context hota hai, yaa SQL mein transaction scope. Har widget keबिना BuildContext complete nahi ho sakता.

### BuildContext kya solve karta hai?

```
Widget Tree:
  └─ MyApp (BuildContext A)
      └─ MaterialApp (BuildContext B)
          └─ Scaffold (BuildContext C)
              └─ Column (BuildContext D)
                  └─ Text (BuildContext E)
```

Agar tum **Text widget ke andar** kisi action ko trigger karna ho, toh usko apne parent elements tak access chahiye (theme, navigation, state, etc.). BuildContext wohi **path** provide karta है।

### Real-world analogy

Imagine tum Zomato order place kar rahe ho:
- **Text** widget = "Add to Cart" button
- **Button का click** = order place karna
- **BuildContext** = order karte waqt jo context chahiye (user location, delivery address, payment method)

Agar BuildContext nahi ho, toh button ko kaise pata chal jaayega ki order kahan place करना है?

### BuildContext ke core operations

```dart
// BuildContext से common operations
BuildContext context;

// 1. Theme access करना
ThemeData theme = Theme.of(context);
Color primaryColor = theme.primaryColor;

// 2. Navigation करना (isko detailed section mein cover करेंगे)
Navigator.push(context, MaterialPageRoute(...));

// 3. Screen size पता करना
Size screenSize = MediaQuery.of(context).size;
double height = MediaQuery.of(context).size.height;
double width = MediaQuery.of(context).size.width;

// 4. Orientation check करना
Orientation orientation = MediaQuery.of(context).orientation;
bool isPortrait = orientation == Orientation.portrait;

// 5. Device padding (notch को handle करना)
EdgeInsets padding = MediaQuery.of(context).padding;

// 6. Text direction check करना (RTL/LTR)
TextDirection direction = Directionality.of(context);
```

### Widget.build() method में हमेशा BuildContext मिलता है

```dart
class MyWidget extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    // यहाँ 'context' automatic मिल जाता है
    return Scaffold(
      appBar: AppBar(
        title: Text('Context Example'),
      ),
      body: Center(
        child: ElevatedButton(
          onPressed: () {
            // इसी context को use करके navigation
            Navigator.push(context, MaterialPageRoute(
              builder: (context) => SecondPage(),
            ));
          },
          child: Text('Go to Next Page'),
        ),
      ),
    );
  }
}
```

---

## Scaffold — The Container (Express App.js की तरह)

Scaffold Flutter का सबसे important container है। Yeh **Material Design structure** provide करता है — AppBar, FloatingActionButton, drawer, bottom navigation, snackbar space, etc.

### Scaffold का anatomy

```
┌─────────────────────────────┐
│        AppBar (header)      │
├─────────────────────────────┤
│                             │
│       Body (main content)   │
│                             │
├─────────────────────────────┤
│  FAB  │   Bottom Nav Bar    │ (floating & bottom widgets)
└─────────────────────────────┘
```

### Basic Scaffold example

```dart
class HomeScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      // 1. AppBar - iska ek section बनेगा
      appBar: AppBar(
        title: Text('Zomato'),
        backgroundColor: Colors.red,
        elevation: 4,
      ),

      // 2. Body - main content
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text('Welcome to Flutter!'),
            SizedBox(height: 20),
            // Content yahan आएगा
          ],
        ),
      ),

      // 3. Floating Action Button
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          print('FAB pressed');
        },
        child: Icon(Icons.add),
      ),

      // 4. Drawer - side menu
      drawer: Drawer(
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            DrawerHeader(
              decoration: BoxDecoration(color: Colors.red),
              child: Text('Menu', style: TextStyle(color: Colors.white)),
            ),
            ListTile(
              title: Text('Home'),
              onTap: () => Navigator.pop(context),
            ),
            ListTile(
              title: Text('Favorites'),
              onTap: () => Navigator.pop(context),
            ),
          ],
        ),
      ),

      // 5. Bottom Navigation Bar
      bottomNavigationBar: BottomNavigationBar(
        items: [
          BottomNavigationBarItem(icon: Icon(Icons.home), label: 'Home'),
          BottomNavigationBarItem(icon: Icon(Icons.search), label: 'Search'),
          BottomNavigationBarItem(icon: Icon(Icons.person), label: 'Profile'),
        ],
        onTap: (index) {
          print('Tapped: $index');
        },
      ),
    );
  }
}
```

### AppBar के features

```dart
AppBar(
  // Title
  title: Text('My App'),

  // Center title (iOS style)
  centerTitle: true,

  // Leading widget (back button by default)
  leading: IconButton(
    icon: Icon(Icons.menu),
    onPressed: () {},
  ),

  // Actions - buttons on the right
  actions: [
    IconButton(
      icon: Icon(Icons.search),
      onPressed: () {},
    ),
    IconButton(
      icon: Icon(Icons.settings),
      onPressed: () {},
    ),
  ],

  // Elevation (shadow)
  elevation: 4,

  // Background color
  backgroundColor: Colors.blue,

  // Foreground color (icons/text)
  foregroundColor: Colors.white,

  // Size control
  toolbarHeight: 60,
)
```

---

## Layout Widgets — Building UI Structure

Ab tak hum ne container discuss किया। Ab मुख्य **layout widgets** सीखेंगे जो actual UI बनाते हैं।

### 1. Column — Vertical Layout (React के `flex-direction: column` जैसा)

```dart
Column(
  mainAxisAlignment: MainAxisAlignment.start,  // top alignment
  crossAxisAlignment: CrossAxisAlignment.center, // horizontal center
  children: [
    Text('Header'),
    SizedBox(height: 16), // spacing
    Text('Body'),
    Text('Footer'),
  ],
)
```

**mainAxisAlignment options:**
- `start` — top
- `center` — middle
- `end` — bottom
- `spaceEvenly` — equal space everywhere
- `spaceBetween` — space between items only
- `spaceAround` — equal space around each item

**crossAxisAlignment options:**
- `start` — left
- `center` — center
- `end` — right
- `stretch` — full width

### 2. Row — Horizontal Layout

```dart
Row(
  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
  crossAxisAlignment: CrossAxisAlignment.center,
  children: [
    Icon(Icons.home),
    Icon(Icons.search),
    Icon(Icons.person),
  ],
)
```

### 3. Stack — Overlapping Widgets (z-index की तरह)

Imagine Flipkart का product image card — image के upar star rating, discount badge, और "New" label सब overlap में हैं।

```dart
Stack(
  children: [
    // Background
    Container(
      width: 200,
      height: 200,
      color: Colors.grey[200],
      child: Image.network('product.jpg'),
    ),

    // Discount badge (positioned over image)
    Positioned(
      top: 8,
      right: 8,
      child: Container(
        padding: EdgeInsets.all(4),
        decoration: BoxDecoration(
          color: Colors.red,
          borderRadius: BorderRadius.circular(4),
        ),
        child: Text('50%', style: TextStyle(color: Colors.white)),
      ),
    ),

    // Star rating (bottom-left)
    Positioned(
      bottom: 8,
      left: 8,
      child: Row(
        children: [
          Icon(Icons.star, color: Colors.yellow),
          Text('4.5', style: TextStyle(color: Colors.black)),
        ],
      ),
    ),
  ],
)
```

### 4. Expanded और Flexible — Share करो remaining space

Jab tum چاहते हो कि बाकी space equal divide हो सभी widgets में, तो `Expanded` use करो।

```dart
// Example: 3 buttons जो एक समान space लें
Row(
  children: [
    Expanded(
      flex: 1,
      child: ElevatedButton(onPressed: () {}, child: Text('Button 1')),
    ),
    SizedBox(width: 8),
    Expanded(
      flex: 1,
      child: ElevatedButton(onPressed: () {}, child: Text('Button 2')),
    ),
    SizedBox(width: 8),
    Expanded(
      flex: 2,  // यह दोगुना space लेगा
      child: ElevatedButton(onPressed: () {}, child: Text('Button 3')),
    ),
  ],
)
```

**Expanded vs Flexible:**
- `Expanded` — सारा available space ले लेता है (grow करता है)
- `Flexible` — सिर्फ जरूरत भर space लेता है

### 5. GridView — Grid Layout

Zomato restaurant list या Instagram grid की तरह।

```dart
// Simple grid - 2 columns
GridView.count(
  crossAxisCount: 2,
  childAspectRatio: 1.0,
  children: List.generate(
    10,
    (index) => Container(
      color: Colors.blue,
      child: Center(child: Text('Item $index')),
    ),
  ),
)

// Advanced grid with builder
GridView.builder(
  gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
    crossAxisCount: 2,
    mainAxisSpacing: 8,
    crossAxisSpacing: 8,
    childAspectRatio: 0.8,
  ),
  itemCount: 20,
  itemBuilder: (context, index) {
    return Card(
      child: Column(
        children: [
          Image.network('restaurant$index.jpg'),
          Text('Restaurant $index'),
          Text('⭐ 4.5'),
        ],
      ),
    );
  },
)
```

### 6. ListView — Scrollable List

```dart
// Simple list
ListView(
  children: [
    ListTile(
      leading: Icon(Icons.home),
      title: Text('Home'),
      trailing: Icon(Icons.arrow_right),
    ),
    ListTile(
      leading: Icon(Icons.favorite),
      title: Text('Favorites'),
      trailing: Icon(Icons.arrow_right),
    ),
  ],
)

// Builder pattern (better for large lists - भीड़ नहीं होगा memory में)
ListView.builder(
  itemCount: 100,
  itemBuilder: (context, index) {
    return ListTile(
      title: Text('Item $index'),
      subtitle: Text('Subtitle $index'),
    );
  },
)

// Horizontal list
ListView.builder(
  scrollDirection: Axis.horizontal,
  itemCount: 10,
  itemBuilder: (context, index) {
    return Container(
      width: 150,
      margin: EdgeInsets.all(8),
      color: Colors.blue,
      child: Center(child: Text('Item $index')),
    );
  },
)
```

### Layout Performance Tip

```dart
// ❌ BAD - सभी items memory में load होंगे
ListView(
  children: List.generate(1000, (i) => ListTile(title: Text('Item $i'))),
)

// ✅ GOOD - visible items ही load होंगे
ListView.builder(
  itemCount: 1000,
  itemBuilder: (context, index) => ListTile(title: Text('Item $index')),
)
```

---

## Navigation — Multi-Screen Apps

Ab tak हमने एक screen बनाया। अब दूसरे screen पर कैसे जाएं? Navigator का काम हैयह करना।

### Navigator.push — नया screen add करो stack पर

Imagine भीड़ में एक queue लगी है:
```
Queue (Stack):
[HomeScreen]
[DetailScreen]  <- user यहाँ है अब
```

जब back button दबो, तो DetailScreen हटेगा।

```dart
// HomeScreen से DetailScreen पर जाना
class HomeScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: ElevatedButton(
          onPressed: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => DetailScreen(itemId: 123),
              ),
            );
          },
          child: Text('Go to Detail'),
        ),
      ),
    );
  }
}

class DetailScreen extends StatelessWidget {
  final int itemId;
  
  DetailScreen({required this.itemId});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Detail - Item $itemId'),
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text('Details for item $itemId'),
            SizedBox(height: 20),
            ElevatedButton(
              onPressed: () {
                // Back जाना
                Navigator.pop(context);
              },
              child: Text('Go Back'),
            ),
          ],
        ),
      ),
    );
  }
}
```

### Navigator.pushReplacement — Screen को replace करो

Jab tum **splash screen से home screen** पर जाना चाहते हो, तो back न दे सकें उपयोगकर्ता (splash वापस न आए)।

```dart
Navigator.pushReplacement(
  context,
  MaterialPageRoute(
    builder: (context) => HomeScreen(),
  ),
);

// वही navigation लेकिन replacement के साथ
// HomeScreen के बाद अगर back दें, तो app close हो जाएगा
```

### Named Routes — Better routing pattern

Node.js में `app.get('/home', handler)` लिखते हो। Flutter में भी ऐसा कर सकते हो।

```dart
// MaterialApp में routes define करो
MaterialApp(
  home: HomeScreen(),
  routes: {
    '/home': (context) => HomeScreen(),
    '/detail': (context) => DetailScreen(itemId: 0),
    '/profile': (context) => ProfileScreen(),
    '/settings': (context) => SettingsScreen(),
  },
)

// किसी भी जगह से navigate करो
Navigator.pushNamed(context, '/detail');

// Arguments के साथ
Navigator.pushNamed(
  context,
  '/detail',
  arguments: {'itemId': 123, 'name': 'Restaurant'},
);

// Arguments receive करो
class DetailScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final args = ModalRoute.of(context)!.settings.arguments as Map<String, dynamic>;
    final itemId = args['itemId'];
    final name = args['name'];
    
    return Scaffold(
      body: Center(child: Text('Item: $name ($itemId)')),
    );
  }
}
```

### go_router — Modern way (Package-based)

Production apps में `go_router` use करते हैं। यह बेहतर है क्योंकि:
- Cleaner API
- Deep linking support
- Nested routing
- Type-safe

```dart
// pubspec.yaml में add करो
dependencies:
  go_router: ^13.0.0

// main.dart
import 'package:go_router/go_router.dart';

final appRouter = GoRouter(
  routes: [
    GoRoute(
      path: '/',
      name: 'home',
      builder: (context, state) => HomeScreen(),
      routes: [
        GoRoute(
          path: 'detail/:id',
          name: 'detail',
          builder: (context, state) {
            final id = state.pathParameters['id']!;
            return DetailScreen(itemId: int.parse(id));
          },
        ),
        GoRoute(
          path: 'profile',
          name: 'profile',
          builder: (context, state) => ProfileScreen(),
        ),
      ],
    ),
    GoRoute(
      path: '/login',
      name: 'login',
      builder: (context, state) => LoginScreen(),
    ),
  ],
);

void main() {
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      routerConfig: appRouter,
    );
  }
}

// Navigation करना
class HomeScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: ElevatedButton(
          onPressed: () {
            // Named route से navigate करो
            context.goNamed('detail', pathParameters: {'id': '123'});
            
            // या direct path से
            context.go('/detail/456');
          },
          child: Text('Go to Detail'),
        ),
      ),
    );
  }
}
```

---

## Common Widgets — Building Blocks

### Text Widget

```dart
Text(
  'Hello Zomato!',
  style: TextStyle(
    fontSize: 18,
    fontWeight: FontWeight.bold,
    color: Colors.black,
    letterSpacing: 1.5,
    height: 1.5,
  ),
  textAlign: TextAlign.center,
  maxLines: 2,
  overflow: TextOverflow.ellipsis, // ... दिखाएगा ज्यादा text के लिए
)
```

### Button Widgets

```dart
// ElevatedButton (modern style)
ElevatedButton(
  onPressed: () {},
  style: ElevatedButton.styleFrom(
    backgroundColor: Colors.blue,
    foregroundColor: Colors.white,
    padding: EdgeInsets.symmetric(horizontal: 32, vertical: 12),
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
  ),
  child: Text('Click Me'),
)

// TextButton (flat)
TextButton(
  onPressed: () {},
  child: Text('Flat Button'),
)

// OutlinedButton (border)
OutlinedButton(
  onPressed: () {},
  child: Text('Outlined'),
)

// IconButton (just icon)
IconButton(
  icon: Icon(Icons.favorite),
  onPressed: () {},
  tooltip: 'Like this',
)

// FloatingActionButton
FloatingActionButton(
  onPressed: () {},
  child: Icon(Icons.add),
)
```

### TextField — Input लेना

```dart
TextField(
  decoration: InputDecoration(
    hintText: 'Enter username',
    labelText: 'Username',
    border: OutlineInputBorder(),
    prefixIcon: Icon(Icons.person),
    suffixIcon: Icon(Icons.close),
    errorText: 'Username is required',
  ),
  onChanged: (value) {
    print('User typed: $value');
  },
  onSubmitted: (value) {
    print('Submitted: $value');
  },
)
```

### Image Widget

```dart
// Network image
Image.network(
  'https://example.com/image.jpg',
  width: 200,
  height: 200,
  fit: BoxFit.cover, // crop करेगा
  errorBuilder: (context, error, stackTrace) {
    return Text('Image load नहीं हुई');
  },
)

// Asset image
Image.asset(
  'assets/images/logo.png',
  width: 100,
  height: 100,
)

// Memory से image
Image.memory(imageBytes)
```

### Card Widget

Zomato का restaurant card जैसा। Shadow और rounded corners दे देता है।

```dart
Card(
  elevation: 4,
  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
  child: Padding(
    padding: EdgeInsets.all(16),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Image.network('restaurant.jpg', fit: BoxFit.cover),
        SizedBox(height: 12),
        Text('Restaurant Name', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        Text('⭐ 4.5 (1200 reviews)', style: TextStyle(color: Colors.grey)),
        SizedBox(height: 8),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('₹300 for 2', style: TextStyle(fontSize: 14)),
            ElevatedButton(
              onPressed: () {},
              child: Text('Order'),
            ),
          ],
        ),
      ],
    ),
  ),
)
```

### Container — Styling wrapper

```dart
Container(
  width: 200,
  height: 200,
  padding: EdgeInsets.all(16),
  margin: EdgeInsets.all(8),
  decoration: BoxDecoration(
    color: Colors.blue,
    borderRadius: BorderRadius.circular(8),
    border: Border.all(color: Colors.black, width: 2),
    boxShadow: [
      BoxShadow(
        color: Colors.grey,
        blurRadius: 4,
        offset: Offset(2, 2),
      ),
    ],
  ),
  child: Center(child: Text('Hello')),
)
```

---

## Real App Structure — Multi-Screen Example

अब एक पूरा app बनाते हैं Zomato जैसा (simplified):

```dart
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

void main() {
  runApp(const ZomatoApp());
}

// Router configuration
final appRouter = GoRouter(
  initialLocation: '/',
  routes: [
    GoRoute(
      path: '/',
      name: 'home',
      builder: (context, state) => const HomeScreen(),
      routes: [
        GoRoute(
          path: 'restaurant/:id',
          name: 'restaurant',
          builder: (context, state) {
            final id = state.pathParameters['id']!;
            return RestaurantDetailScreen(restaurantId: id);
          },
        ),
      ],
    ),
    GoRoute(
      path: '/search',
      name: 'search',
      builder: (context, state) => const SearchScreen(),
    ),
    GoRoute(
      path: '/profile',
      name: 'profile',
      builder: (context, state) => const ProfileScreen(),
    ),
  ],
);

class ZomatoApp extends StatelessWidget {
  const ZomatoApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      routerConfig: appRouter,
      title: 'Zomato',
      theme: ThemeData(
        primarySwatch: Colors.red,
        useMaterial3: true,
      ),
    );
  }
}

// =============== HomeScreen ===============
class HomeScreen extends StatefulWidget {
  const HomeScreen({Key? key}) : super(key: key);

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;

  final List<Map<String, dynamic>> restaurants = [
    {
      'id': '1',
      'name': 'Raj Indian Restaurant',
      'rating': 4.5,
      'reviews': 1200,
      'image': 'https://via.placeholder.com/300x200',
      'costFor2': 300,
    },
    {
      'id': '2',
      'name': 'Burger King',
      'rating': 4.2,
      'reviews': 800,
      'image': 'https://via.placeholder.com/300x200',
      'costFor2': 400,
    },
    {
      'id': '3',
      'name': 'Dominos Pizza',
      'rating': 4.8,
      'reviews': 2000,
      'image': 'https://via.placeholder.com/300x200',
      'costFor2': 500,
    },
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Zomato'),
        backgroundColor: Colors.red,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications),
            onPressed: () {},
          ),
        ],
      ),
      body: _currentIndex == 0 ? _buildHomeTab() : _buildOtherTabs(),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) {
          setState(() {
            _currentIndex = index;
          });
        },
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.home),
            label: 'Home',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.search),
            label: 'Search',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.person),
            label: 'Profile',
          ),
        ],
      ),
      drawer: _buildDrawer(),
    );
  }

  Widget _buildHomeTab() {
    return ListView(
      children: [
        // Search bar
        Padding(
          padding: const EdgeInsets.all(16.0),
          child: TextField(
            decoration: InputDecoration(
              hintText: 'Search restaurants...',
              prefixIcon: const Icon(Icons.search),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
          ),
        ),

        // Featured restaurants grid
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Trending Now',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 12),
              GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  mainAxisSpacing: 16,
                  crossAxisSpacing: 16,
                  childAspectRatio: 0.75,
                ),
                itemCount: restaurants.length,
                itemBuilder: (context, index) {
                  final restaurant = restaurants[index];
                  return _buildRestaurantCard(context, restaurant);
                },
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildRestaurantCard(BuildContext context, Map<String, dynamic> restaurant) {
    return GestureDetector(
      onTap: () {
        context.goNamed(
          'restaurant',
          pathParameters: {'id': restaurant['id']},
        );
      },
      child: Card(
        elevation: 4,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image
            Stack(
              children: [
                Image.network(
                  restaurant['image'],
                  height: 120,
                  width: double.infinity,
                  fit: BoxFit.cover,
                ),
                Positioned(
                  top: 8,
                  right: 8,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.black87,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      '⭐ ${restaurant['rating']}',
                      style: const TextStyle(color: Colors.white, fontSize: 12),
                    ),
                  ),
                ),
              ],
            ),

            // Details
            Padding(
              padding: const EdgeInsets.all(8.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    restaurant['name'],
                    style: const TextStyle(fontWeight: FontWeight.bold),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  Text(
                    '${restaurant['reviews']} reviews',
                    style: TextStyle(color: Colors.grey[600], fontSize: 12),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '₹${restaurant['costFor2']} for 2',
                    style: const TextStyle(fontSize: 12),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildOtherTabs() {
    return Center(
      child: Text('Tab ${_currentIndex + 1}'),
    );
  }

  Widget _buildDrawer() {
    return Drawer(
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          DrawerHeader(
            decoration: const BoxDecoration(color: Colors.red),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const CircleAvatar(
                  backgroundColor: Colors.white,
                  child: Icon(Icons.person, color: Colors.red),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Siddesh',
                  style: TextStyle(color: Colors.white, fontSize: 18),
                ),
                Text(
                  'siddesh@example.com',
                  style: TextStyle(color: Colors.white70, fontSize: 12),
                ),
              ],
            ),
          ),
          ListTile(
            leading: const Icon(Icons.favorite),
            title: const Text('Saved'),
            onTap: () {},
          ),
          ListTile(
            leading: const Icon(Icons.history),
            title: const Text('Order History'),
            onTap: () {},
          ),
          ListTile(
            leading: const Icon(Icons.settings),
            title: const Text('Settings'),
            onTap: () {},
          ),
          const Divider(),
          ListTile(
            leading: const Icon(Icons.logout),
            title: const Text('Logout'),
            onTap: () {},
          ),
        ],
      ),
    );
  }
}

// =============== RestaurantDetailScreen ===============
class RestaurantDetailScreen extends StatelessWidget {
  final String restaurantId;

  const RestaurantDetailScreen({
    Key? key,
    required this.restaurantId,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Restaurant Details'),
        backgroundColor: Colors.red,
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Hero image
            Image.network(
              'https://via.placeholder.com/500x300',
              width: double.infinity,
              height: 250,
              fit: BoxFit.cover,
            ),

            // Info section
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Raj Indian Restaurant',
                            style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                          ),
                          Text(
                            'Indian • North Indian • Chinese',
                            style: TextStyle(color: Colors.grey[600]),
                          ),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: Colors.red,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Text(
                          '⭐ 4.5',
                          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Offers',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.green),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Text('50% off on orders above ₹250'),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {},
        label: const Text('Order Now'),
        icon: const Icon(Icons.shopping_cart),
      ),
    );
  }
}

// =============== SearchScreen ===============
class SearchScreen extends StatelessWidget {
  const SearchScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Search'),
        backgroundColor: Colors.red,
      ),
      body: const Center(
        child: Text('Search Screen'),
      ),
    );
  }
}

// =============== ProfileScreen ===============
class ProfileScreen extends StatelessWidget {
  const ProfileScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile'),
        backgroundColor: Colors.red,
      ),
      body: const Center(
        child: Text('Profile Screen'),
      ),
    );
  }
}
```

---

## Common Mistakes और Solutions

### ❌ Mistake 1: BuildContext को late access करना

```dart
// ❌ WRONG - context यहाँ available नहीं है
class MyWidget extends StatelessWidget {
  late BuildContext context;
  
  @override
  Widget build(BuildContext ctx) {
    context = ctx;
    return Text('Wrong');
  }
}

// ✅ CORRECT
class MyWidget extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Text('Correct');
  }
}
```

### ❌ Mistake 2: Unbounded widgets inside Row/Column

```dart
// ❌ WRONG - Image को width नहीं दिया
Row(
  children: [
    Image.network('image.jpg'), // ERROR: unbounded width
  ],
)

// ✅ CORRECT
Row(
  children: [
    SizedBox(
      width: 100,
      height: 100,
      child: Image.network('image.jpg', fit: BoxFit.cover),
    ),
  ],
)
```

### ❌ Mistake 3: Navigation with stale context

```dart
// ❌ RISKY - async के बाद context stale हो सकता है
onPressed: () async {
  await Future.delayed(Duration(seconds: 2));
  Navigator.push(context, ...); // May crash
}

// ✅ SAFE
onPressed: () {
  Navigator.push(context, ...);
}

// ✅ SAFE (if you need async)
onPressed: () async {
  await Future.delayed(Duration(seconds: 2));
  if (mounted) { // यह check करो StatefulWidget में
    Navigator.push(context, ...);
  }
}
```

### ❌ Mistake 4: Large lists without builders

```dart
// ❌ SLOW - सभी 1000 items एक साथ memory में
ListView(
  children: List.generate(1000, (i) => Text('Item $i')),
)

// ✅ FAST - lazy loading
ListView.builder(
  itemCount: 1000,
  itemBuilder: (context, index) => Text('Item $index'),
)
```

---

## Performance Tips

### 1. const constructors use करो

```dart
// ✅ GOOD - Flutter को पता है यह widget never बदलेगा
class MyApp extends StatelessWidget {
  const MyApp({Key? key}) : super(key: key);
  
  @override
  Widget build(BuildContext context) {
    return const MaterialApp(
      home: const Scaffold(
        body: const Center(
          child: const Text('Hello'),
        ),
      ),
    );
  }
}
```

### 2. RepaintBoundary से unnecessary rebuilds रोको

```dart
// कभी-कभी एक बड़े subtree को rebuild होने से बचाना है
RepaintBoundary(
  child: ExpensiveWidget(),
)
```

### 3. SingleChildScrollView vs ListView.builder

```dart
// ✅ GOOD - बड़ी lists के लिए
ListView.builder(itemCount: 1000, itemBuilder: ...)

// ❌ AVOID - छोटे content के लिए ठीक है
SingleChildScrollView(
  child: Column(children: [...]), // सभी items memory में
)
```

---

## Key Takeaways

- **BuildContext** — हर widget के पास एक location होता है widget tree में। BuildContext उसी location का reference है।
- **Scaffold** — Material Design का standard container। AppBar, body, FAB, drawer, bottom nav — सब define करता है।
- **Layout widgets** — Column (vertical), Row (horizontal), Stack (overlap), Expanded/Flexible (space share), GridView (grid), ListView (scrollable list)।
- **Navigation** — `Navigator.push()` नया screen add करता है, `Navigator.pop()` वापस जाता है। Named routes और `go_router` production apps में use करो।
- **Common widgets** — Text, Button varieties, TextField, Image, Card, Container — ये सब fundamentals हैं।
- **Multi-screen apps** — Drawer, BottomNavigationBar, TabBar से tabs manage करो। go_router से clean routing handle करो।
- **Performance** — `const` constructors, `ListView.builder` (large lists), avoid unnecessary rebuilds।
- **BuildContext से access** — Theme, navigation, MediaQuery (screen size), text direction — सब `of(context)` से मिलता है।
