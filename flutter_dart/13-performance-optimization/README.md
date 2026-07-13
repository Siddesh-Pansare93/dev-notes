# Performance Optimization — Profiling, Reducing Jank, Memory Management

Socho ek second ke liye — jab tum Zomato app use karte ho aur restaurants ka list scroll karte ho, sab smooth chalta hai na? Lekin agar koi outdated device pe chalega to food photos load hone mein thoda time lagega, aur scroll kaarte hue "stuttering" hone lagta hai. Usse kehte hain **jank**.

Performance optimization Flutter mein sirf "fast app banana" nahi hai — ye ekdum **crucial** hai mobile devices pe jahan resources limited hote hain. Aaj ke notes mein seekhenge:

1. Jank ka matlab kya hai aur kyu hota hai
2. DevTools profiler use karke bottlenecks identify karna
3. Common jank patterns aur unhe fix karna
4. Memory leaks detect karna aur prevent karna
5. Image caching aur optimization
6. Real app example ke saath profiling aur fixing

---

## What is Jank? — Jank ka Philosophy

Jank hota hai jab app **frame time target miss karta hai**.

Mobile phones typically 60 FPS mein render karte hain. Matlab:
- **Per frame budget**: 16.67 ms (1000 ms ÷ 60 frames)
- Agar koi frame 16.67 ms se zyada time lete, agle frame skip hota hai → stuttering

Flagship phones aaj 90 FPS, 120 FPS support karte hain:
- 90 FPS: **11.11 ms** per frame
- 120 FPS: **8.33 ms** per frame

```
60 FPS (Smooth):
Frame 1  Frame 2  Frame 3  Frame 4  Frame 5
|---16ms---|---16ms---|---16ms---|---16ms---|

Jank (Frame 3 exceeds budget):
Frame 1  Frame 2  Frame 3      Frame 4  Frame 5
|---16ms---|---25ms---| SKIP |---16ms---|
                      ↑ User sees stutter!
```

> [!tip]
> **Jank visibility**: 1-2 skipped frames user ko notice nahi hote. Lekin continuous jank (especially scrolling mein) bilkul annoying hai — jaise Swiggy app par "laggy delivery status" watch karte hue.

---

## Why Jank Happens — Common Culprits

### 1. **Heavy Computation on UI Thread**
Dart single-threaded hai UI thread pe. Agar expensive work (parsing, calculations) UI mein karte ho:

```dart
// ❌ JANK — Heavy work on UI thread
class ProductListScreen extends StatefulWidget {
  @override
  State<ProductListScreen> createState() => _ProductListScreenState();
}

class _ProductListScreenState extends State<ProductListScreen> {
  List<Product> products = [];

  @override
  void initState() {
    super.initState();
    // ❌ Blocking computation in initState
    products = _parseJson(largeJsonFile); // Could take 500ms!
  }

  List<Product> _parseJson(String json) {
    // Expensive deserialization
    return jsonDecode(json).map((e) => Product.fromJson(e)).toList();
  }

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      itemCount: products.length,
      itemBuilder: (context, index) => ProductTile(products[index]),
    );
  }
}
```

**Impact**: App freeze karte hue data load hota hai.

### 2. **Excessive Widget Rebuilds**
Jab parent rebuild hote, pure child tree rebuild hota hai — even agar unhe naya data nahi milraha:

```dart
// ❌ JANK — Unnecessary rebuilds
class Parent extends StatefulWidget {
  @override
  State<Parent> createState() => _ParentState();
}

class _ParentState extends State<Parent> {
  int counter = 0;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text('Counter: $counter'),
        // ❌ HeavyChild rebuild hote even jab counter nahi badle
        HeavyChild(), // Calls expensive build() every time parent rebuilds
        AnotherExpensiveWidget(),
      ],
    );
  }
}

class HeavyChild extends StatelessWidget {
  const HeavyChild(); // Not const — rebuild har bar

  @override
  Widget build(BuildContext context) {
    print('HeavyChild.build() called'); // Prints every time parent rebuilds
    return Container(
      child: _buildComplexUI(), // Expensive operation
    );
  }

  Widget _buildComplexUI() {
    // 100ms computation
    return SizedBox(height: 100);
  }
}
```

### 3. **Image Loading & Rendering**
Jab large/unoptimized images load hote during scroll:

```dart
// ❌ JANK — Unoptimized images in list
ListView.builder(
  itemCount: restaurants.length,
  itemBuilder: (context, index) {
    return RestaurantTile(
      // ❌ No caching, no resolution control, decoding on main thread
      imageUrl: restaurants[index].bannerUrl,
    );
  },
)

class RestaurantTile extends StatelessWidget {
  final String imageUrl;

  const RestaurantTile({required this.imageUrl});

  @override
  Widget build(BuildContext context) {
    return Image.network(
      imageUrl,
      // No size constraints = full resolution decoding
      // No caching = repeated downloads
      // ❌ Blocking scroll
    );
  }
}
```

### 4. **Shader Compilation Jank**
First time ek specific shader render hote, GPU pe compile hota hai — slight jank:

```
First occurrence of ShadowEffect on scroll: [20-30ms spike]
                                             ↑ Frame drop
```

### 5. **GC (Garbage Collection) Pressure**
Zyada allocations → zyada GC pauses → jank:

```dart
// ❌ JANK — Allocating inside build/hot paths
@override
Widget build(BuildContext context) {
  return Scaffold(
    body: ListView.builder(
      itemBuilder: (context, index) {
        // ❌ New list allocation every itemBuild
        List<Widget> children = [];
        for (int i = 0; i < 10; i++) {
          children.add(SomeWidget());
        }
        return Column(children: children);
      },
    ),
  );
}
```

---

## Profiling with DevTools — Jank Detect Karna

### Setup: Enable Profiling

1. **Run app in profile mode** (best representation of release performance):
```bash
flutter run --profile
```

2. **Open DevTools**:
```bash
flutter pub global activate devtools
devtools
# Browser pe http://localhost:9100 khulega
```

3. **Select device/emulator** → tap "open DevTools in browser"

### Frame Timing View — 60 FPS Checker

DevTools ka **Performance tab**:

```
Timeline View:
┌─────────────────────────────────────────┐
│ Frame 1 [Smooth - 12ms]                 │
│ Frame 2 [Smooth - 14ms]                 │
│ Frame 3 [JANK - 45ms] ⚠️               │
│ Frame 4 [Smooth - 13ms]                 │
└─────────────────────────────────────────┘
     ↓ Click Frame 3 to see breakdown
```

**Frame breakdown**:
```
Frame 3 (45ms total):
├─ Build phase: 8ms
│  ├─ _ProductListScreenState.build()
│  ├─ ProductTile.build() × 15 items
│  └─ Image.network() decode pending
│
├─ Layout phase: 22ms ← Bottleneck! Why?
│  └─ Large image size mismatch with constraints
│
└─ Paint phase: 15ms
   └─ Expensive shadow rendering
```

### CPU Flame Graph — "Kaunsa function time le raha hai"

Performance tab mein **flame graph** (CPU chart):

```
Time (ms)
15 ├─ Image.load() ███████████ (60% of frame)
   │  ├─ http.get()
   │  └─ _decodeImageFromList()
   │
10 ├─ ListView.build()
   │  ├─ ProductTile.build() ███ (30%)
   │  └─ Text.build()
   │
5  ├─ Misc ██ (10%)
   │
0  └─────────────────────────
   0      5      10     15ms
```

> [!warning]
> Flame graph mein "build()" dikhega namein lekin actual bottleneck widget tree deep mein ho sakta hai.

### Memory Profiler — Leaks Find Karna

Memory tab kholo:

```
Heap Usage Over Time:

Usage (MB)
100 │                          ┌──────┐
    │                          │      │ App running
 80 │                    ┌─────┘      │
    │ Initial: 45 MB     │            │ After 5 min: 85 MB
 60 │   ┌────┐           │            │ 40 MB growth = LEAK? 
    │   │    │           │            │
 40 │───┘    └───────────┘            │
    │
  0 └──────────────────────────────────
    0    1m    2m    3m    4m    5m
```

**Memory profile details**:
- **Dart heap**: Pure Dart objects
- **External**: Native images, buffers
- **Total**: Dart + External

Jab scroll karte ho aur UI dismiss karte ho lekin memory na release hote → **leak suspected**.

---

## Optimization Strategies — Jank Ko Marna

### 1. **Const Widgets — Smart Rebuilds**

Const widget har rebuild mein recreate nahi hote:

```dart
// ✅ OPTIMIZED
class ProductTile extends StatelessWidget {
  final String name;
  final double price;

  const ProductTile({
    required this.name,
    required this.price,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(8.0), // ✅ const
      child: Column(
        children: [
          const Divider(), // ✅ const — recreated only if parent explicitly rebuilds
          Text(name),
          Text(price.toString()),
          const SizedBox(height: 8), // ✅ const
        ],
      ),
    );
  }
}

// Usage
final productTile = const ProductTile(name: 'Biryani', price: 299);
// Even agar parent rebuild 100x, yeh widget reuse hote
```

**Why it works**: 
- Const objects == same reference
- Flutter widget tree equality check: "Arre ye same hai?" → skip rebuild
- Massive savings in deep widget trees

> [!tip]
> **Rule**: Har static widget ke liye `const` use karo. Zomato app mein Product cards mostly static — pure const banao.

### 2. **Lazy Loading & Pagination — Data Fetch Smart**

Jab 10,000 products ek saath load karo → frame drop guaranteed. Lazy load:

```dart
class ProductListScreen extends StatefulWidget {
  @override
  State<ProductListScreen> createState() => _ProductListScreenState();
}

class _ProductListScreenState extends State<ProductListScreen> {
  final List<Product> products = [];
  bool isLoading = false;
  int page = 0;

  @override
  void initState() {
    super.initState();
    _loadMoreProducts();
  }

  Future<void> _loadMoreProducts() async {
    if (isLoading) return;
    
    setState(() => isLoading = true);
    
    try {
      final newProducts = await api.fetchProducts(page: page, limit: 20);
      setState(() {
        products.addAll(newProducts);
        page++;
      });
    } finally {
      setState(() => isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return NotificationListener<ScrollNotification>(
      onNotification: (ScrollNotification scrollInfo) {
        // ✅ Jab scroll list ke 80% reach kare, next page load karo
        if (scrollInfo.metrics.pixels >=
            scrollInfo.metrics.maxScrollExtent * 0.8) {
          _loadMoreProducts();
        }
        return false;
      },
      child: ListView.builder(
        itemCount: products.length + (isLoading ? 1 : 0),
        itemBuilder: (context, index) {
          if (index == products.length) {
            return const Padding(
              padding: EdgeInsets.all(16.0),
              child: CircularProgressIndicator(), // Loading indicator
            );
          }
          return ProductTile(products[index]);
        },
      ),
    );
  }
}
```

### 3. **RepaintBoundary — Paint Optimization**

Jab ek widget tree frequently repaint hote (animation, state change), sirf woh part repaint karo:

```dart
// ❌ Without RepaintBoundary — Entire list repaints on animation
class AnimatedProductTile extends StatefulWidget {
  final Product product;

  const AnimatedProductTile({required this.product});

  @override
  State<AnimatedProductTile> createState() => _AnimatedProductTileState();
}

class _AnimatedProductTileState extends State<AnimatedProductTile>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(duration: Duration(seconds: 1), vsync: this);
    _controller.forward();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      // ❌ Entire ListView mein repaint hote jab animation chalte
      child: ScaleTransition(
        scale: Tween<double>(begin: 1.0, end: 1.05).animate(_controller),
        child: const ProductCard(), // Expensive to repaint
      ),
    );
  }
}

// ✅ With RepaintBoundary — Only animated widget repaints
class AnimatedProductTile extends StatefulWidget {
  final Product product;

  const AnimatedProductTile({required this.product});

  @override
  State<AnimatedProductTile> createState() => _AnimatedProductTileState();
}

class _AnimatedProductTileState extends State<AnimatedProductTile>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(duration: Duration(seconds: 1), vsync: this);
    _controller.forward();
  }

  @override
  Widget build(BuildContext context) {
    return RepaintBoundary(
      // ✅ "Arey, sirf mein repaint hoon — rest ko mat touch karo"
      child: ScaleTransition(
        scale: Tween<double>(begin: 1.0, end: 1.05).animate(_controller),
        child: const ProductCard(),
      ),
    );
  }
}
```

**Use cases**:
- Animations jab rest of UI static hai
- Video/image playback areas
- Charts/graphs updating

### 4. **Image Optimization & Caching**

Images largest memory consumer hote hai. Smart caching:

```dart
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter_cache_manager/flutter_cache_manager.dart';

// ✅ Cached image with custom cache manager
class OptimizedRestaurantTile extends StatelessWidget {
  final String restaurantId;
  final String bannerUrl;

  const OptimizedRestaurantTile({
    required this.restaurantId,
    required this.bannerUrl,
  });

  @override
  Widget build(BuildContext context) {
    return CachedNetworkImage(
      imageUrl: bannerUrl,
      cacheManager: CacheManager(
        Config(
          'customCacheKey_$restaurantId',
          stalePeriod: Duration(days: 7), // Cache 7 din
          maxNrOfCacheObjects: 100, // Max 100 images in cache
        ),
      ),
      placeholder: (context, url) => const ShimmerLoader(), // While loading
      errorWidget: (context, url, error) => const PlaceholderImage(),
      fit: BoxFit.cover,
      // ✅ Ab resolution device ke size pe depend karega
      width: 300,
      height: 200,
    );
  }
}

// ✅ Custom shimmer loader (better UX than grey box)
class ShimmerLoader extends StatelessWidget {
  const ShimmerLoader();

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.grey[300],
      child: const Center(
        child: CircularProgressIndicator(),
      ),
    );
  }
}
```

**Image size matters**:
```
Original: 4000x3000 (12 MB)   → Server PE compress karo!
           ↓
Thumbnail: 300x200 (50 KB)    → ✅ List display mein
           ↓
Full view: 800x600 (300 KB)   → ✅ Detail page mein
```

Server-side responsive images:
```dart
// ✅ Request size-appropriate image from server
String getImageUrl(String baseUrl, double width) {
  // API support करता है: /image?url=...&w=300&h=200
  return '$baseUrl?w=${(width * 2).toInt()}&h=${(width * 1.5).toInt()}';
  // 2x — high DPI devices ke liye
}

// Usage
CachedNetworkImage(
  imageUrl: getImageUrl(bannerUrl, 300),
  width: 300,
  height: 200,
)
```

### 5. **Async Work — Offload to Isolate**

Heavy computation (JSON parsing, database queries) UI thread chhodke isolate mein karo:

```dart
import 'dart:isolate';

class ProductListScreen extends StatefulWidget {
  @override
  State<ProductListScreen> createState() => _ProductListScreenState();
}

class _ProductListScreenState extends State<ProductListScreen> {
  List<Product> products = [];
  bool isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadProductsAsync();
  }

  Future<void> _loadProductsAsync() async {
    try {
      // ✅ Heavy parsing karo separate isolate mein
      final parsed = await compute(_parseProducts, largeJsonString);
      
      setState(() {
        products = parsed;
        isLoading = false;
      });
    } catch (e) {
      print('Error: $e');
      setState(() => isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return Center(child: CircularProgressIndicator());
    }

    return ListView.builder(
      itemCount: products.length,
      itemBuilder: (context, index) => ProductTile(products[index]),
    );
  }
}

// ✅ Top-level function for isolate
List<Product> _parseProducts(String json) {
  // Yeh separate isolate mein chalega — UI thread free!
  final decoded = jsonDecode(json) as List;
  return decoded.map((e) => Product.fromJson(e)).toList();
}
```

**compute() function**:
- Background isolate spawn karte hai
- Function aur parameters pass karte hai
- Result wait karte ho
- Isolate auto-cleanup

### 6. **Smart State Management**

Selective rebuild ke saath `Provider` use karo:

```dart
// ✅ Only relevant widgets rebuild
class ProductListProvider extends ChangeNotifier {
  final List<Product> _products = [];

  List<Product> get products => _products;

  void addProduct(Product p) {
    _products.add(p);
    notifyListeners(); // ✅ Sirf listeners ko notify karo
  }
}

class ProductListScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Consumer<ProductListProvider>(
        builder: (context, provider, child) {
          // ✅ Sirf yeh part rebuild hote jab products change hote
          return ListView.builder(
            itemCount: provider.products.length,
            itemBuilder: (context, index) =>
                ProductTile(provider.products[index]),
          );
        },
        child: FloatingActionButton(
          // ✅ Yeh rebuild nahi hote — child parameter hai
          onPressed: () {},
          child: Icon(Icons.add),
        ),
      ),
    );
  }
}
```

---

## Memory Management — Leaks Prevent Karna

### 1. **Detect Leaks in DevTools**

Memory tab mein heap snapshot analyze:

```dart
// Leak example — listener cleanup nahi
class ChatScreen extends StatefulWidget {
  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  late StreamSubscription<Message> _subscription;

  @override
  void initState() {
    super.initState();
    // ❌ Listener attached
    _subscription = messageStream.listen((msg) {
      print('New message: ${msg.text}');
    });
  }

  @override
  void dispose() {
    // ❌ LEAK! dispose mein cancel nahi kiya
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(body: Text('Chat'));
  }
}
```

**DevTools memory view**:
- Screen navigate karo aur back karo (repeat 5 times)
- Memory continuously increase?
- Leak hai!

### 2. **Fix Leaks — Cleanup in dispose()**

```dart
class ChatScreen extends StatefulWidget {
  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  late StreamSubscription<Message> _subscription;

  @override
  void initState() {
    super.initState();
    _subscription = messageStream.listen((msg) {
      if (mounted) { // ✅ Check mounted before setState
        print('New message: ${msg.text}');
      }
    });
  }

  @override
  void dispose() {
    _subscription.cancel(); // ✅ Always cancel streams
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(body: Text('Chat'));
  }
}
```

**Cleanup checklist**:
- StreamSubscriptions → `cancel()`
- Timers → `cancel()`
- AnimationControllers → `dispose()`
- ScrollControllers → `dispose()`
- TextEditingControllers → `dispose()`
- Listeners (ChangeNotifier) → `removeListener()`

### 3. **Global Singletons — Careful Use**

```dart
// ❌ Leak risk
class ApiClient {
  static final ApiClient _instance = ApiClient._internal();
  
  factory ApiClient() => _instance;
  
  ApiClient._internal();
  
  // ❌ Global reference — never garbage collected
  final HttpClient _httpClient = HttpClient();
}

// ✅ Better — lifecycle manage karo
class ApiClient {
  static ApiClient? _instance;
  
  factory ApiClient() => _instance ??= ApiClient._internal();
  
  ApiClient._internal();
  
  HttpClient? _httpClient;
  
  void initialize() {
    _httpClient = HttpClient();
  }
  
  void dispose() {
    _httpClient?.close();
    _instance = null;
  }
}

// App main mein:
void main() {
  ApiClient().initialize();
  runApp(MyApp());
}
```

### 4. **WeakReferences — Large Data Hold Karte Time**

```dart
// ❌ Strong reference mein large list
class CacheManager {
  final List<CachedItem> _cache = []; // Leak risk
}

// ✅ Weak reference for optional cache
import 'dart:async';

class CacheManager {
  final Map<String, WeakReference<CachedItem>> _cache = {};
  
  CachedItem? get(String key) {
    return _cache[key]?.target; // null agar GC'd
  }
  
  void put(String key, CachedItem item) {
    _cache[key] = WeakReference(item);
  }
}
```

---

## Real App Example — Profile & Optimize

### Scenario: Slow "Restaurants List" Page

**Initial Performance**: 40 FPS average (🔴 Jank visible)

**Step 1: Profile in DevTools**

Timeline screenshot:
```
Frame timing (20 frames sample):
Frame 1-5:  60 FPS ✅
Frame 6-10: 45-55 FPS ⚠️ (scroll starts)
Frame 11:   15 FPS 🔴 (BIG DROP)
Frame 12-20: 35-40 FPS ⚠️
```

Flame graph:
```
Frame 11 breakdown (67ms):
├─ Image.load() ████████████ (40ms - network image decode)
├─ RestaurantTile.build() ████ (15ms)
├─ Layout ███ (8ms)
└─ Paint ██ (4ms)
```

**Problem**: Image loading blocks scroll

**Step 2: Implement Fixes**

```dart
// ✅ OPTIMIZED RestaurantList
class RestaurantListScreen extends StatefulWidget {
  @override
  State<RestaurantListScreen> createState() => _RestaurantListScreenState();
}

class _RestaurantListScreenState extends State<RestaurantListScreen> {
  final List<Restaurant> restaurants = [];
  bool isLoading = true;
  int page = 0;

  @override
  void initState() {
    super.initState();
    _loadRestaurants();
  }

  Future<void> _loadRestaurants() async {
    try {
      // ✅ Use isolate for parsing
      final newRest = await compute(
        _parseRestaurants,
        await api.fetchRestaurants(page),
      );
      
      if (mounted) {
        setState(() {
          restaurants.addAll(newRest);
          isLoading = false;
          page++;
        });
      }
    } catch (e) {
      print('Error: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Restaurants')),
      body: isLoading && restaurants.isEmpty
          ? const Center(child: CircularProgressIndicator())
          : NotificationListener<ScrollNotification>(
              onNotification: (scrollInfo) {
                if (scrollInfo.metrics.pixels >=
                    scrollInfo.metrics.maxScrollExtent * 0.8) {
                  _loadRestaurants();
                }
                return false;
              },
              child: ListView.builder(
                itemCount: restaurants.length + (isLoading ? 1 : 0),
                itemBuilder: (context, index) {
                  if (index == restaurants.length) {
                    return const Padding(
                      padding: EdgeInsets.all(16.0),
                      child: CircularProgressIndicator(),
                    );
                  }
                  return RestaurantTile(restaurants[index]);
                },
              ),
            ),
    );
  }
}

class RestaurantTile extends StatelessWidget {
  final Restaurant restaurant;

  const RestaurantTile(this.restaurant);

  @override
  Widget build(BuildContext context) {
    return RepaintBoundary(
      // ✅ Isolate repaints
      child: Card(
        margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        child: Padding(
          padding: const EdgeInsets.all(8.0),
          child: Row(
            children: [
              // ✅ Cached image with size constraints
              CachedNetworkImage(
                imageUrl: _getOptimizedImageUrl(restaurant.bannerUrl),
                width: 80,
                height: 80,
                fit: BoxFit.cover,
                placeholder: (context, url) => _buildImagePlaceholder(),
                errorWidget: (context, url, error) =>
                    _buildImagePlaceholder(),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // ✅ const where possible
                    Text(
                      restaurant.name,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${restaurant.cuisines.join(", ")} • ${restaurant.rating}⭐',
                      style: const TextStyle(fontSize: 12, color: Colors.grey),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Delivery: ${restaurant.deliveryTime} mins',
                      style: const TextStyle(fontSize: 12),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _getOptimizedImageUrl(String baseUrl) {
    return '$baseUrl?w=160&h=160'; // 2x 80dp
  }

  Widget _buildImagePlaceholder() {
    return Container(
      width: 80,
      height: 80,
      color: Colors.grey[300],
    );
  }
}

// ✅ Top-level function for isolate
List<Restaurant> _parseRestaurants(List<dynamic> json) {
  return json
      .map((e) => Restaurant.fromJson(e as Map<String, dynamic>))
      .toList();
}

class Restaurant {
  final String name;
  final String bannerUrl;
  final double rating;
  final int deliveryTime;
  final List<String> cuisines;

  Restaurant({
    required this.name,
    required this.bannerUrl,
    required this.rating,
    required this.deliveryTime,
    required this.cuisines,
  });

  factory Restaurant.fromJson(Map<String, dynamic> json) {
    return Restaurant(
      name: json['name'],
      bannerUrl: json['banner_url'],
      rating: json['rating'].toDouble(),
      deliveryTime: json['delivery_time'],
      cuisines: List<String>.from(json['cuisines']),
    );
  }
}
```

**Step 3: Re-Profile**

After fixes:
```
Frame timing (20 frames sample):
Frame 1-20: 58-60 FPS ✅ (Smooth!)

Frame 11 breakdown (16ms):
├─ Image.load() [cached] (0ms)
├─ RestaurantTile.build() ██ (6ms)
├─ Layout ████ (6ms)
└─ Paint ██ (4ms)
```

**Results**:
- 40 FPS → 60 FPS ✅
- Image jank gone (caching + sizing)
- Parsing async (UI thread free) ✅
- Lazy loading (memory efficient) ✅

---

## 60 FPS vs 120 FPS — Device Reality Check

Flagship phones (Samsung S24, iPhone 15 Pro) mein 120 FPS support hai. Lekin:

```
Device         Typical FPS   Battery Impact
────────────────────────────────────────
Budget phone    30-40 FPS    Minimal
Mid-range       60 FPS       Normal
Flagship        90-120 FPS   High power draw

Strategy: ✅ Target 60 FPS (universal) + 120 FPS optimization optional
```

120 FPS optimization:
```dart
// ✅ 120 FPS mein smooth animations
class HighRefreshAnimationWidget extends StatefulWidget {
  @override
  State<HighRefreshAnimationWidget> createState() =>
      _HighRefreshAnimationWidgetState();
}

class _HighRefreshAnimationWidgetState
    extends State<HighRefreshAnimationWidget> with TickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: Duration(seconds: 1),
      vsync: this,
    );
  }

  @override
  Widget build(BuildContext context) {
    // Display refresh rate automatically detected
    return Center(
      child: ScaleTransition(
        scale: Tween<double>(begin: 1.0, end: 1.5).animate(_controller),
        child: Container(
          width: 100,
          height: 100,
          color: Colors.blue,
        ),
      ),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }
}
```

---

## Performance Checklist — Production Readiness

```
✅ Frame Rate
  └─ [ ] 60 FPS on average device during scroll
  └─ [ ] No frame drops during network loads
  └─ [ ] Animations smooth (use const + RepaintBoundary)

✅ Memory
  └─ [ ] No memory leaks detected (DevTools heap snapshot)
  └─ [ ] Images cached + sized appropriately
  └─ [ ] Streams/controllers disposed in dispose()

✅ Startup
  └─ [ ] No heavy computations on main thread (use compute())
  └─ [ ] Lazy load data (pagination, lazy initialization)

✅ Profiling
  └─ [ ] Profiled in DevTools (frame timing + flame graph)
  └─ [ ] Identified top 3 bottlenecks
  └─ [ ] Bottlenecks fixed + re-profiled

✅ Images
  └─ [ ] Compressed server-side
  └─ [ ] Cached locally
  └─ [ ] Size-constrained
  └─ [ ] Placeholders during load
```

---

## Common Pitfalls & Solutions

| Problem | Cause | Solution |
|---------|-------|----------|
| Scroll laggy | Heavy build() functions | Use `const`, lazy build |
| Memory grows over time | Listeners not cancelled | Cancel streams/timers in `dispose()` |
| Images cause jank | Full-resolution loading | Cache + size constraints |
| Animations stutter | Repainting entire tree | Use `RepaintBoundary` |
| App slow to start | Parsing JSON on UI thread | Use `compute()` isolate |
| 120 FPS feels choppy on 90 FPS device | Assuming fixed refresh rate | Let Flutter auto-detect |

---

## Key Takeaways

- **Jank hota hai frame budget (16.67 ms @ 60 FPS) miss hone se** — heavy computation, excessive rebuilds, unoptimized images blockers hote hain
- **DevTools profiler must-have tool hai** — frame timing view mein bottlenecks clearly dikhte hain
- **const widgets + lazy loading + caching trinity hai performance ka** — Zomato jaisa app mein inhi techniques ka combination smooth experience deta hai
- **Isolates use karo expensive work (JSON parsing, DB queries) ke liye** — UI thread akela scroll ke liye bach jaata hai
- **Images biggest culprit hote hain mobile mein** — server-side compression + caching + sizing hamara best friend hai
- **RepaintBoundary animations ko isolate karte hain** — animations smooth rehte aur rest UI unaffected
- **Memory leaks real issue hain long sessions mein** — streams/timers/listeners ALWAYS cancel karo `dispose()` mein
- **Target 60 FPS universal devices par, 120 FPS optimization optional** — battery vs smoothness tradeoff samajho
- **Profiling → identify → fix → re-profile cycle follow karo** — guessing nahi, data-driven optimization karo

