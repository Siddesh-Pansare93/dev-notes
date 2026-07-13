# SOLID Principles — Applied to Flutter with Real Examples

Socho ek second ke liye — jab tum Zomato app use karte ho aur restaurant scroll kar rahe ho, to code ke peeche kya hota hai? Ek bada monolithic chunk nahi, balance hai. Same principles Flutter mein apply hote hain. SOLID principles Flutter development ko clean, maintainable, aur scalable banate hain.

Agar tum Node.js/Express se aate ho, toh SOLID ek familiar concept hai — lekin Flutter/Dart mein implementation alag hota hai because of widgets, state, aur build context. Ye chapter tумhe dikhaएगा ki kaise bad code ko good code mein convert करते हैं.

## Kya Hoga Aaj

Har ek SOLID principle ko dekheंगे:
- **S**ingle Responsibility Principle (SRP)
- **O**pen/Closed Principle (OCP)
- **L**iskov Substitution Principle (LSP)
- **I**nterface Segregation Principle (ISP)
- **D**ependency Inversion Principle (DIP)

Har principle ke liye: **violation → fix → production-ready code**.

---

## 1. Single Responsibility Principle (SRP)

**SRP का मतलब**: एक class का एक ही काम होना चाहिए, एक ही reason to change.

मान लो तुम Zomato के लिए एक restaurant details screen बना रहे हो. Photo, rating, menu, delivery info — सब display करना है. लेकिन अगर सब कुछ एक class मे करो तो क्या होगा?

### ❌ SRP Violation — Fat God Class

```dart
class RestaurantDetailsScreen extends StatefulWidget {
  final String restaurantId;
  
  const RestaurantDetailsScreen({required this.restaurantId});
  
  @override
  State<RestaurantDetailsScreen> createState() => _RestaurantDetailsScreenState();
}

class _RestaurantDetailsScreenState extends State<RestaurantDetailsScreen> {
  late RestaurantData _restaurant;
  late List<MenuItem> _menu;
  late UserReview _userReview;
  bool _isLoading = true;
  String? _errorMessage;
  
  @override
  void initState() {
    super.initState();
    _fetchRestaurantData();
    _fetchMenu();
    _fetchUserReview();
    _trackAnalytics();
    _validateBusinessHours();
  }
  
  // API call करता है
  Future<void> _fetchRestaurantData() async {
    try {
      final response = await http.get(
        Uri.parse('https://api.zomato.com/restaurant/${widget.restaurantId}'),
        headers: {'Authorization': 'Bearer token'},
      );
      // ... parsing
    } catch (e) {
      setState(() => _errorMessage = e.toString());
    }
  }
  
  // Menu fetch करता है
  Future<void> _fetchMenu() async {
    // ... API call
  }
  
  // Reviews fetch करता है
  Future<void> _fetchUserReview() async {
    // ... API call
  }
  
  // Analytics भेजता है
  void _trackAnalytics() {
    // ... Firebase, Mixpanel calls
  }
  
  // Business hours validate करता है
  bool _validateBusinessHours() {
    // ... timezone logic
  }
  
  // Database save करता है
  Future<void> _saveFavorite() async {
    // ... Hive/SQLite
  }
  
  // JSON parse करता है
  Map<String, dynamic> _parseRestaurantJSON(String json) {
    // ... json.decode logic
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Restaurant Details')),
      body: _isLoading
          ? Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              child: Column(
                children: [
                  _buildHeader(_restaurant),
                  _buildRatingSection(_restaurant),
                  _buildMenuSection(_menu),
                  _buildReviewSection(_userReview),
                ],
              ),
            ),
    );
  }
  
  Widget _buildHeader(RestaurantData restaurant) {
    // ... UI
    return Container();
  }
  
  // ... 10 more build methods
}
```

**समस्या क्या है?**
- एक class के पास 10+ responsibilities हैं (data fetching, parsing, validation, analytics, UI, persistence)
- Test करना मुश्किल (सब कुछ mock करना पड़े)
- Change करना डरावना (एक जगह change करो, 5 जगह break हो सकता है)
- Reusability zero है

### ✅ SRP Fix — Separation of Concerns

चलो इसे अलग-अलग classes मे तोड़ते हैं:

**1) Data Models** — सिर्फ data, कोई logic नहीं:

```dart
class RestaurantData {
  final String id;
  final String name;
  final double rating;
  final String address;
  final List<String> cuisines;
  
  const RestaurantData({
    required this.id,
    required this.name,
    required this.rating,
    required this.address,
    required this.cuisines,
  });
}

class MenuItem {
  final String id;
  final String name;
  final double price;
  final String category;
  
  const MenuItem({
    required this.id,
    required this.name,
    required this.price,
    required this.category,
  });
}
```

**2) Repository** — सिर्फ data fetching (API + local storage):

```dart
abstract class IRestaurantRepository {
  Future<RestaurantData> getRestaurantDetails(String restaurantId);
  Future<List<MenuItem>> getMenu(String restaurantId);
  Future<void> saveFavorite(String restaurantId);
  Future<bool> isFavorited(String restaurantId);
}

class RestaurantRepository implements IRestaurantRepository {
  final HttpClient _httpClient;
  final LocalStorageService _localStorage;
  
  RestaurantRepository({
    required HttpClient httpClient,
    required LocalStorageService localStorage,
  })  : _httpClient = httpClient,
        _localStorage = localStorage;
  
  @override
  Future<RestaurantData> getRestaurantDetails(String restaurantId) async {
    try {
      final response = await _httpClient.get(
        'https://api.zomato.com/restaurant/$restaurantId',
      );
      return RestaurantData.fromJson(response);
    } catch (e) {
      rethrow;
    }
  }
  
  @override
  Future<List<MenuItem>> getMenu(String restaurantId) async {
    final response = await _httpClient.get(
      'https://api.zomato.com/restaurant/$restaurantId/menu',
    );
    return (response as List)
        .map((item) => MenuItem.fromJson(item))
        .toList();
  }
  
  @override
  Future<void> saveFavorite(String restaurantId) async {
    await _localStorage.saveFavorite(restaurantId);
  }
  
  @override
  Future<bool> isFavorited(String restaurantId) async {
    return _localStorage.isFavorited(restaurantId);
  }
}
```

**3) Business Logic / Use Case** — सिर्फ logic, UI नहीं:

```dart
class RestaurantDetailsUseCase {
  final IRestaurantRepository _repository;
  final AnalyticsService _analytics;
  
  RestaurantDetailsUseCase({
    required IRestaurantRepository repository,
    required AnalyticsService analytics,
  })  : _repository = repository,
        _analytics = analytics;
  
  Future<RestaurantDetailsVM> loadRestaurantDetails(String restaurantId) async {
    try {
      final restaurantFuture = _repository.getRestaurantDetails(restaurantId);
      final menuFuture = _repository.getMenu(restaurantId);
      final favoritedFuture = _repository.isFavorited(restaurantId);
      
      final results = await Future.wait([
        restaurantFuture,
        menuFuture,
        favoritedFuture,
      ]);
      
      final restaurant = results[0] as RestaurantData;
      final menu = results[1] as List<MenuItem>;
      final isFavorited = results[2] as bool;
      
      _analytics.logEvent(
        'restaurant_viewed',
        {'restaurant_id': restaurantId},
      );
      
      return RestaurantDetailsVM(
        restaurant: restaurant,
        menu: menu,
        isFavorited: isFavorited,
      );
    } catch (e) {
      rethrow;
    }
  }
}
```

**4) View Model** — सिर्फ UI state:

```dart
class RestaurantDetailsVM {
  final RestaurantData restaurant;
  final List<MenuItem> menu;
  final bool isFavorited;
  
  const RestaurantDetailsVM({
    required this.restaurant,
    required this.menu,
    required this.isFavorited,
  });
}
```

**5) UI Widget** — सिर्फ build करना, logic नहीं:

```dart
class RestaurantDetailsScreen extends StatefulWidget {
  final String restaurantId;
  
  const RestaurantDetailsScreen({required this.restaurantId});
  
  @override
  State<RestaurantDetailsScreen> createState() => _RestaurantDetailsScreenState();
}

class _RestaurantDetailsScreenState extends State<RestaurantDetailsScreen> {
  late final RestaurantDetailsUseCase _useCase;
  RestaurantDetailsVM? _viewModel;
  bool _isLoading = true;
  String? _errorMessage;
  
  @override
  void initState() {
    super.initState();
    // Dependency injection (हम बाद मे देखेंगे)
    _useCase = RestaurantDetailsUseCase(
      repository: getIt<IRestaurantRepository>(),
      analytics: getIt<AnalyticsService>(),
    );
    _loadData();
  }
  
  Future<void> _loadData() async {
    try {
      final vm = await _useCase.loadRestaurantDetails(widget.restaurantId);
      setState(() {
        _viewModel = vm;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = e.toString();
        _isLoading = false;
      });
    }
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Restaurant Details')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _errorMessage != null
              ? Center(child: Text('Error: $_errorMessage'))
              : _viewModel != null
                  ? SingleChildScrollView(
                      child: Column(
                        children: [
                          RestaurantHeader(restaurant: _viewModel!.restaurant),
                          RatingCard(restaurant: _viewModel!.restaurant),
                          MenuSection(menu: _viewModel!.menu),
                        ],
                      ),
                    )
                  : const SizedBox.shrink(),
    );
  }
}

// Separate, reusable UI components
class RestaurantHeader extends StatelessWidget {
  final RestaurantData restaurant;
  
  const RestaurantHeader({required this.restaurant});
  
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            restaurant.name,
            style: Theme.of(context).textTheme.headlineMedium,
          ),
          Text(restaurant.address),
        ],
      ),
    );
  }
}

class MenuSection extends StatelessWidget {
  final List<MenuItem> menu;
  
  const MenuSection({required this.menu});
  
  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: menu.length,
      itemBuilder: (context, index) => MenuItemTile(item: menu[index]),
    );
  }
}
```

**Kya fayde हैं?**

| Pehle | Ab |
|-------|-----|
| 500+ line का एक class | 50-100 lines का हर class |
| Test करना impossible | हर class को independently test कर सकते हो |
| एक change से सब break हो | Isolated changes |
| Reuse नहीं कर सकते | `RestaurantHeader` को कहीं और use कर सकते हो |

---

## 2. Open/Closed Principle (OCP)

**OCP का मतलब**: Classes को extension के लिए open होना चाहिए, लेकिन modification के लिए closed.

अगर Zomato मे naya feature आए (delivery tracking, live chat, में coupon display करना), तो existing code को modify मत करो — *extend* करो.

### ❌ OCP Violation — Modification Hell

```dart
class MenuItemWidget extends StatelessWidget {
  final MenuItem item;
  final String restaurantType; // 'delivery' या 'dineIn'
  
  const MenuItemWidget({
    required this.item,
    required this.restaurantType,
  });
  
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(item.name, style: const TextStyle(fontSize: 16)),
          Text('₹${item.price}'),
          
          // नया requirement आया: delivery restaurants मे delivery time दिखाना है
          if (restaurantType == 'delivery')
            Text('Delivery: 30-45 mins'),
          
          // फिर नया requirement: dineIn मे table reservation दिखाना है
          if (restaurantType == 'dineIn')
            ElevatedButton(onPressed: () {}, child: const Text('Reserve Table')),
          
          // फिर naya requirement: cloud kitchens मे pickup दिखाना है
          if (restaurantType == 'cloudKitchen')
            Text('Ready for pickup in 20 mins'),
          
          // अब discount button चाहिए सब restaurants के लिए
          ElevatedButton(onPressed: () {}, child: const Text('Apply Coupon')),
          
          // फिर loyalty points दिखाना है
          if (restaurantType == 'delivery' || restaurantType == 'dineIn')
            Text('+50 loyalty points'),
        ],
      ),
    );
  }
}
```

**Problem?** हर नये restaurant type के लिए `build()` method modify करना पड़ता है. Code के अंदर जाकर change करना = OCP violation.

### ✅ OCP Fix — Strategy Pattern

Abstract interface बनाओ, different implementations करो. Existing code modify मत करो.

```dart
// Abstract interface
abstract class IMenuItemPresenter {
  Widget buildAdditionalInfo(MenuItem item);
  Widget buildActionButtons(MenuItem item);
  String? getDeliveryInfo(MenuItem item);
}

// Strategy: Delivery restaurants
class DeliveryMenuPresenter implements IMenuItemPresenter {
  @override
  Widget buildAdditionalInfo(MenuItem item) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Delivery: 30-45 mins'),
        Text('+50 loyalty points'),
      ],
    );
  }
  
  @override
  Widget buildActionButtons(MenuItem item) {
    return Row(
      children: [
        ElevatedButton(
          onPressed: () {},
          child: const Text('Add to Cart'),
        ),
        ElevatedButton(
          onPressed: () {},
          child: const Text('Apply Coupon'),
        ),
      ],
    );
  }
  
  @override
  String? getDeliveryInfo(MenuItem item) => 'Delivery: 30-45 mins';
}

// Strategy: Dine-in restaurants
class DineInMenuPresenter implements IMenuItemPresenter {
  @override
  Widget buildAdditionalInfo(MenuItem item) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Available at your table'),
        Text('+75 loyalty points'),
      ],
    );
  }
  
  @override
  Widget buildActionButtons(MenuItem item) {
    return Row(
      children: [
        ElevatedButton(
          onPressed: () {},
          child: const Text('Add to Table Order'),
        ),
        ElevatedButton(
          onPressed: () {},
          child: const Text('Reserve Table'),
        ),
      ],
    );
  }
  
  @override
  String? getDeliveryInfo(MenuItem item) => null;
}

// Strategy: Cloud kitchens (future feature, existing code unchanged!)
class CloudKitchenMenuPresenter implements IMenuItemPresenter {
  @override
  Widget buildAdditionalInfo(MenuItem item) {
    return const Text('Ready for pickup in 20 mins');
  }
  
  @override
  Widget buildActionButtons(MenuItem item) {
    return ElevatedButton(
      onPressed: () {},
      child: const Text('Schedule Pickup'),
    );
  }
  
  @override
  String? getDeliveryInfo(MenuItem item) => 'Pickup ready';
}

// अब UI ये सब को handle करता है, modification के बिना
class MenuItemWidget extends StatelessWidget {
  final MenuItem item;
  final IMenuItemPresenter presenter;
  
  const MenuItemWidget({
    required this.item,
    required this.presenter,
  });
  
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(item.name, style: const TextStyle(fontSize: 16)),
          Text('₹${item.price}'),
          presenter.buildAdditionalInfo(item),
          const SizedBox(height: 8),
          presenter.buildActionButtons(item),
        ],
      ),
    );
  }
}

// Usage
final delivery = MenuItemWidget(
  item: MenuItem(...),
  presenter: DeliveryMenuPresenter(),
);

final dineIn = MenuItemWidget(
  item: MenuItem(...),
  presenter: DineInMenuPresenter(),
);

// Naya cloud kitchen feature add करते हैं — existing code को touch नहीं करना पड़ा!
final cloudKitchen = MenuItemWidget(
  item: MenuItem(...),
  presenter: CloudKitchenMenuPresenter(),
);
```

**ASCII Diagram — OCP Strategy Pattern:**

```
┌──────────────────────────────────────────┐
│      IMenuItemPresenter (Abstract)       │
│  • buildAdditionalInfo()                 │
│  • buildActionButtons()                  │
│  • getDeliveryInfo()                     │
└──────────────────────────────────────────┘
           △           △           △
           │           │           │
      ┌────┴────┐  ┌───┴────┐  ┌──┴──────────┐
      │ Delivery│  │ DineIn │  │ CloudKitchen│
      │Presenter│  │Presenter│  │ Presenter   │
      └─────────┘  └────────┘  └─────────────┘
           │           │           │
           └───────────┼───────────┘
                       │
              ┌────────▼────────┐
              │ MenuItemWidget  │
              │ (uses presenter)│
              └─────────────────┘
```

**Key insight**: नया implementation जोड़ो, existing code न modify करो.

---

## 3. Liskov Substitution Principle (LSP)

**LSP का मतलब**: Subclasses को parent class की जगह use किया जा सकता है — और सब कुछ same तरीके से काम करे.

Agar तुम एक abstract class define करो, तो सब subclasses को contract honor करना होगा.

### ❌ LSP Violation — Broken Contracts

```dart
abstract class PaymentMethod {
  Future<bool> processPayment(double amount);
  Future<void> refund(double amount);
}

class CreditCardPayment implements PaymentMethod {
  @override
  Future<bool> processPayment(double amount) async {
    // API call, returns true/false
    return true;
  }
  
  @override
  Future<void> refund(double amount) async {
    // Refund करता है
  }
}

class UPIPayment implements PaymentMethod {
  @override
  Future<bool> processPayment(double amount) async {
    // UPI से payment process करता है
    return true;
  }
  
  @override
  Future<void> refund(double amount) async {
    // UPI refund instant होता है, लेकिन...
    // अगर payment 24 घंटे पहले हो गया तो?
    // Code जो refund support नहीं करता — exception throw करता है!
    throw UnsupportedError('UPI refunds are only allowed within 24 hours');
  }
}

class WalletPayment implements PaymentMethod {
  @override
  Future<bool> processPayment(double amount) async {
    return true;
  }
  
  @override
  Future<void> refund(double amount) async {
    // Wallet refunds को instant करने के बजाय delay करता है
    await Future.delayed(Duration(days: 3));
    // 3 days बाद refund देता है
  }
}

// अब code जो payment करता है
class PaymentProcessor {
  Future<void> completeCheckout(
    double amount,
    PaymentMethod payment,
  ) async {
    final success = await payment.processPayment(amount);
    
    if (!success) {
      throw Exception('Payment failed');
    }
    
    // ... order create करो
  }
  
  Future<void> processRefund(
    double amount,
    PaymentMethod payment,
  ) async {
    // Yeh code assume करता है सब payment methods instantly refund करेंगे
    await payment.refund(amount);
    // लेकिन WalletPayment 3 days delay करेगा!
    // UPIPayment error throw करेगा!
  }
}
```

**समस्या?** जब तुम `payment.refund()` call करते हो, तो तुम assume करते हो यह instantly होगा. लेकिन:
- `UPIPayment` exception throw करेगा
- `WalletPayment` 3 days delay करेगा

**Contract broken है!**

### ✅ LSP Fix — Proper Abstractions

Liskov के नियम को follow करो — subclass को parent जैसे ही काम करना चाहिए.

```dart
// पहला contract: सब को refund करना चाहिए, लेकिन अलग तरीके से
abstract class PaymentMethod {
  Future<bool> processPayment(double amount);
}

// Refund को separate interface मे डालो
abstract class IRefundable {
  Future<void> refund(double amount);
}

abstract class IInstantRefundable extends IRefundable {
  @override
  Future<void> refund(double amount) async {
    // Instant refund guarantee
  }
}

abstract class IDelayedRefundable extends IRefundable {
  Future<Duration> getRefundDuration();
  
  @override
  Future<void> refund(double amount) async {
    final duration = await getRefundDuration();
    await Future.delayed(duration);
    // Refund करो
  }
}

// अब implementations clear contracts के साथ
class CreditCardPayment extends PaymentMethod implements IInstantRefundable {
  @override
  Future<bool> processPayment(double amount) async => true;
  
  @override
  Future<void> refund(double amount) async {
    // Instant refund
    print('Credit card refunded instantly');
  }
}

class UPIPayment extends PaymentMethod implements IInstantRefundable {
  @override
  Future<bool> processPayment(double amount) async => true;
  
  @override
  Future<void> refund(double amount) async {
    // UPI instant refund
    print('UPI refunded instantly');
  }
}

class WalletPayment extends PaymentMethod implements IDelayedRefundable {
  @override
  Future<bool> processPayment(double amount) async => true;
  
  @override
  Future<Duration> getRefundDuration() async => const Duration(days: 3);
  
  @override
  Future<void> refund(double amount) async {
    final duration = await getRefundDuration();
    print('Wallet refund will complete in $duration');
    await Future.delayed(duration);
  }
}

// अब code properly handle कर सकता है
class PaymentProcessor {
  Future<void> completeCheckout(
    double amount,
    PaymentMethod payment,
  ) async {
    final success = await payment.processPayment(amount);
    if (!success) throw Exception('Payment failed');
  }
  
  Future<void> processRefund(
    double amount,
    IRefundable refundable,
  ) async {
    // यह सब refundable को handle करेगा
    await refundable.refund(amount);
  }
  
  Future<void> processInstantRefund(
    double amount,
    IInstantRefundable refundable,
  ) async {
    // Instant refund की ज़रूरत है? यह सब को handle करेगा
    await refundable.refund(amount);
    print('Refund completed immediately');
  }
  
  Future<void> processDelayedRefund(
    double amount,
    IDelayedRefundable refundable,
  ) async {
    final duration = await refundable.getRefundDuration();
    print('Refund will be processed in ${duration.inDays} days');
    await refundable.refund(amount);
  }
}

// Usage
final processor = PaymentProcessor();

// Instant refunds
await processor.processInstantRefund(100, CreditCardPayment());
await processor.processInstantRefund(100, UPIPayment());

// Delayed refunds
await processor.processDelayedRefund(100, WalletPayment());
```

**Key point**: Contract को explicitly define करो. Subclass को अलग behavior दिखाना है? Naya contract बनाओ.

---

## 4. Interface Segregation Principle (ISP)

**ISP का मतलब**: Clients को ऐसे interfaces पर depend नहीं करना चाहिए जिन methods को उन्हें use नहीं करने हैं.

अगर एक restaurant के लिए reservation नहीं है, तो उसे reservation interface implement मत करवाओ.

### ❌ ISP Violation — Fat Interface

```dart
abstract class RestaurantService {
  Future<RestaurantData> getDetails(String id);
  Future<List<MenuItem>> getMenu(String id);
  Future<List<UserReview>> getReviews(String id);
  
  // Reservation features (सब restaurants के पास नहीं है!)
  Future<void> bookTable(String restaurantId, DateTime time, int guests);
  Future<List<TimeSlot>> getAvailableSlots(String restaurantId, DateTime date);
  Future<void> cancelReservation(String reservationId);
  
  // Delivery features (सब के पास नहीं है!)
  Future<List<DeliveryArea>> getDeliveryAreas(String restaurantId);
  Future<double> calculateDeliveryFee(String restaurantId, String address);
  Future<void> trackDelivery(String orderId);
  
  // Loyalty features (सब के पास नहीं है!)
  Future<int> getRefferralPoints(String userId);
  Future<void> redeemPoints(String userId, int points);
  
  // Payment features
  Future<bool> processPayment(String orderId, double amount);
  Future<void> refundPayment(String orderId);
}

// अब एक cloud kitchen (सिर्फ pickup, no delivery) को भी
// ये सब methods implement करने होंगे, भले ही उसे कुछ need नहीं है
class CloudKitchenImpl implements RestaurantService {
  @override
  Future<RestaurantData> getDetails(String id) async => RestaurantData(...);
  
  @override
  Future<List<MenuItem>> getMenu(String id) async => [...];
  
  @override
  Future<List<UserReview>> getReviews(String id) async => [...];
  
  // ये सब इसके लिए irrelevant हैं
  @override
  Future<void> bookTable(String restaurantId, DateTime time, int guests) async {
    throw UnsupportedError('Cloud kitchen does not support table reservations');
  }
  
  @override
  Future<List<TimeSlot>> getAvailableSlots(String restaurantId, DateTime date) async {
    throw UnsupportedError('Not applicable');
  }
  
  @override
  Future<List<DeliveryArea>> getDeliveryAreas(String restaurantId) async {
    throw UnsupportedError('Cloud kitchen only supports pickup');
  }
  
  // ... 8 और methods जो throw करते हैं
}
```

**Problem**: Fat interface जो सब कुछ include करता है. Clients को unused methods दिखते हैं.

### ✅ ISP Fix — Segregated Interfaces

छोटे, focused interfaces बनाओ. Classes को सिर्फ जो चाहिए वो implement करने दो.

```dart
// Basic restaurant interface — सब के पास होना चाहिए
abstract class IRestaurantBasic {
  Future<RestaurantData> getDetails(String id);
  Future<List<MenuItem>> getMenu(String id);
  Future<List<UserReview>> getReviews(String id);
}

// Reservation के लिए अलग interface
abstract class IResevable {
  Future<void> bookTable(String restaurantId, DateTime time, int guests);
  Future<List<TimeSlot>> getAvailableSlots(String restaurantId, DateTime date);
  Future<void> cancelReservation(String reservationId);
}

// Delivery के लिए अलग interface
abstract class IDeliverable {
  Future<List<DeliveryArea>> getDeliveryAreas(String restaurantId);
  Future<double> calculateDeliveryFee(String restaurantId, String address);
  Future<void> trackDelivery(String orderId);
}

// Loyalty के लिए अलग interface
abstract class ILoyaltyProvider {
  Future<int> getReferralPoints(String userId);
  Future<void> redeemPoints(String userId, int points);
}

// Payment के लिए अलग interface
abstract class IPaymentProcessor {
  Future<bool> processPayment(String orderId, double amount);
  Future<void> refundPayment(String orderId);
}

// अब different restaurant types अलग combinations implement कर सकते हैं

// Dine-in restaurant: reservation + loyalty + payment
class DineInRestaurant implements
    IRestaurantBasic,
    IResevable,
    ILoyaltyProvider,
    IPaymentProcessor {
  @override
  Future<RestaurantData> getDetails(String id) async => RestaurantData(...);
  
  @override
  Future<List<MenuItem>> getMenu(String id) async => [...];
  
  @override
  Future<List<UserReview>> getReviews(String id) async => [...];
  
  @override
  Future<void> bookTable(String restaurantId, DateTime time, int guests) async {
    // Actually implement it
  }
  
  @override
  Future<List<TimeSlot>> getAvailableSlots(String restaurantId, DateTime date) async {
    // Actually implement it
  }
  
  // ... loyalty + payment
}

// Delivery restaurant: delivery + loyalty + payment
class DeliveryRestaurant implements
    IRestaurantBasic,
    IDeliverable,
    ILoyaltyProvider,
    IPaymentProcessor {
  // Implements only what it needs
}

// Cloud kitchen: सिर्फ basic + payment
class CloudKitchen implements IRestaurantBasic, IPaymentProcessor {
  @override
  Future<RestaurantData> getDetails(String id) async => RestaurantData(...);
  
  @override
  Future<List<MenuItem>> getMenu(String id) async => [...];
  
  @override
  Future<List<UserReview>> getReviews(String id) async => [...];
  
  @override
  Future<bool> processPayment(String orderId, double amount) async => true;
  
  @override
  Future<void> refundPayment(String orderId) async {
    // Refund logic
  }
  
  // बस! कोई unused methods नहीं!
}

// Clients को पता होता है क्या काम कर सकता है
Future<void> makeReservation(IResevable restaurant) async {
  // अब तुम safely assume कर सकते हो reservation methods हैं
  final slots = await restaurant.getAvailableSlots('rest123', DateTime.now());
  // ...
}

Future<void> trackOrder(IDeliverable restaurant) async {
  // अब तुम safely assume कर सकते हो delivery tracking है
  await restaurant.trackDelivery('order123');
}
```

**Benefits:**
- Clients को सिर्फ जो चाहिए वो implement करना पड़ता है
- Unused methods से confusion नहीं
- Clear contracts
- Easy testing

---

## 5. Dependency Inversion Principle (DIP)

**DIP का मतलब**: High-level modules को low-level modules पर depend नहीं करना चाहिए. दोनों को abstractions पर depend करना चाहिए.

अगर UI directly database/API से बात करे, तो coupling बहुत ज़्यादा होगी. Invert करो — एक abstraction के through बात करो.

### ❌ DIP Violation — Tight Coupling

```dart
class FoodOrderScreen extends StatefulWidget {
  // ...
  @override
  State<FoodOrderScreen> createState() => _FoodOrderScreenState();
}

class _FoodOrderScreenState extends State<FoodOrderScreen> {
  // UI directly database reference रखता है
  final _database = HiveDatabaseService();
  
  // UI directly API reference रखता है
  final _api = ZomatoRestApi();
  
  // UI directly payment processor reference रखता है
  final _payment = RazorpayPaymentProcessor();
  
  // UI directly analytics रखता है
  final _analytics = FirebaseAnalytics();
  
  Future<void> _placeOrder(Order order) async {
    try {
      // UI directly सब को call कर रहा है
      // अगर koi service change करो (e.g., Razorpay से Stripe), 
      // यहाँ code modify करना पड़ेगा!
      
      final paymentSuccess = await _payment.processPayment(
        order.totalAmount,
        order.paymentMethod,
      );
      
      if (!paymentSuccess) throw Exception('Payment failed');
      
      // Database directly
      await _database.saveOrder(order);
      
      // API directly
      final response = await _api.submitOrder(order);
      
      // Analytics directly
      _analytics.logEvent('order_placed', {
        'order_id': order.id,
        'amount': order.totalAmount,
      });
      
      // Notification directly (hypothetically)
      // await _notificationService.sendOrderConfirmation(order);
      
      setState(() {
        // Update UI
      });
    } catch (e) {
      // Error handling
    }
  }
}
```

**Problems:**
1. **Testing impossible** — सब को mock करना पड़े
2. **Service बदलना कठिन** — code के अंदर जाकर change करो
3. **Testability zero** — हर method को mock करना पड़े
4. **Tight coupling** — UI concrete classes पर depend करता है

### ✅ DIP Fix — Dependency Injection

Abstractions के through काम करो. Dependencies externally pass करो.

```dart
// Abstract interfaces
abstract class IPaymentService {
  Future<bool> processPayment(double amount, String method);
}

abstract class IOrderRepository {
  Future<void> saveOrder(Order order);
  Future<Order?> getOrder(String orderId);
}

abstract class IOrderApi {
  Future<ApiResponse> submitOrder(Order order);
}

abstract class IAnalyticsService {
  void logEvent(String eventName, Map<String, dynamic> params);
}

// Implementations (concrete classes)
class RazorpayPaymentService implements IPaymentService {
  @override
  Future<bool> processPayment(double amount, String method) async {
    // Razorpay implementation
    print('Processing with Razorpay');
    return true;
  }
}

class StripePaymentService implements IPaymentService {
  @override
  Future<bool> processPayment(double amount, String method) async {
    // Stripe implementation
    print('Processing with Stripe');
    return true;
  }
}

class LocalOrderRepository implements IOrderRepository {
  @override
  Future<void> saveOrder(Order order) async {
    // Hive/SQLite implementation
    print('Order saved locally');
  }
  
  @override
  Future<Order?> getOrder(String orderId) async {
    // Retrieve from local db
    return null;
  }
}

class ZomatoOrderApi implements IOrderApi {
  @override
  Future<ApiResponse> submitOrder(Order order) async {
    // API implementation
    print('Submitting to Zomato API');
    return ApiResponse(success: true);
  }
}

class FirebaseAnalyticsService implements IAnalyticsService {
  @override
  void logEvent(String eventName, Map<String, dynamic> params) {
    print('Firebase: $eventName - $params');
  }
}

// अब UI को dependencies externally pass करो
class FoodOrderScreen extends StatefulWidget {
  final IPaymentService paymentService;
  final IOrderRepository orderRepository;
  final IOrderApi orderApi;
  final IAnalyticsService analyticsService;
  
  const FoodOrderScreen({
    required this.paymentService,
    required this.orderRepository,
    required this.orderApi,
    required this.analyticsService,
  });
  
  @override
  State<FoodOrderScreen> createState() => _FoodOrderScreenState();
}

class _FoodOrderScreenState extends State<FoodOrderScreen> {
  Future<void> _placeOrder(Order order) async {
    try {
      // Abstractions को call कर रहे हैं, concrete implementations को नहीं!
      final paymentSuccess = await widget.paymentService.processPayment(
        order.totalAmount,
        order.paymentMethod,
      );
      
      if (!paymentSuccess) throw Exception('Payment failed');
      
      await widget.orderRepository.saveOrder(order);
      await widget.orderApi.submitOrder(order);
      
      widget.analyticsService.logEvent('order_placed', {
        'order_id': order.id,
        'amount': order.totalAmount,
      });
      
      setState(() {
        // Update UI
      });
    } catch (e) {
      // Error handling
    }
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Place Order')),
      body: Center(
        child: ElevatedButton(
          onPressed: () => _placeOrder(Order(...)),
          child: const Text('Place Order'),
        ),
      ),
    );
  }
}

// Setup करते समय (main.dart या service locator मे)
void main() {
  // Razorpay के साथ:
  runApp(MyApp(
    paymentService: RazorpayPaymentService(),
    orderRepository: LocalOrderRepository(),
    orderApi: ZomatoOrderApi(),
    analyticsService: FirebaseAnalyticsService(),
  ));
  
  // या Stripe के साथ (बिना UI change के!):
  // runApp(MyApp(
  //   paymentService: StripePaymentService(), // बस यह change करो!
  //   orderRepository: LocalOrderRepository(),
  //   orderApi: ZomatoOrderApi(),
  //   analyticsService: FirebaseAnalyticsService(),
  // ));
}

class MyApp extends StatelessWidget {
  final IPaymentService paymentService;
  final IOrderRepository orderRepository;
  final IOrderApi orderApi;
  final IAnalyticsService analyticsService;
  
  const MyApp({
    required this.paymentService,
    required this.orderRepository,
    required this.orderApi,
    required this.analyticsService,
  });
  
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      home: FoodOrderScreen(
        paymentService: paymentService,
        orderRepository: orderRepository,
        orderApi: orderApi,
        analyticsService: analyticsService,
      ),
    );
  }
}
```

### Service Locator Pattern (GetIt)

अगर manual dependency passing complicated हो, तो **service locator** use करो:

```dart
import 'package:get_it/get_it.dart';

final getIt = GetIt.instance;

void setupServiceLocator() {
  // Register abstractions
  getIt.registerSingleton<IPaymentService>(RazorpayPaymentService());
  getIt.registerSingleton<IOrderRepository>(LocalOrderRepository());
  getIt.registerSingleton<IOrderApi>(ZomatoOrderApi());
  getIt.registerSingleton<IAnalyticsService>(FirebaseAnalyticsService());
}

class _FoodOrderScreenState extends State<FoodOrderScreen> {
  Future<void> _placeOrder(Order order) async {
    try {
      // Service locator से resolve करो
      final paymentService = getIt<IPaymentService>();
      final orderRepository = getIt<IOrderRepository>();
      final orderApi = getIt<IOrderApi>();
      final analyticsService = getIt<IAnalyticsService>();
      
      final paymentSuccess = await paymentService.processPayment(
        order.totalAmount,
        order.paymentMethod,
      );
      
      if (!paymentSuccess) throw Exception('Payment failed');
      
      await orderRepository.saveOrder(order);
      await orderApi.submitOrder(order);
      
      analyticsService.logEvent('order_placed', {
        'order_id': order.id,
        'amount': order.totalAmount,
      });
    } catch (e) {
      // Error handling
    }
  }
}

void main() {
  setupServiceLocator();
  runApp(const MyApp());
}
```

**Benefits of DIP:**
- Testing: Mock implementations pass करो
- Flexibility: Implementation बदल सकते हो UI touch किए बिना
- Loose coupling: UI को concrete classes का पता नहीं
- Testability: हर service को independently test कर सकते हो

---

## Real-World Example: पूरे App को SOLID बनाते हैं

एक realistic example देखते हैं — एक food delivery app का order flow.

### Architecture Diagram

```
┌────────────────────────────────────────────────────┐
│                  Presentation Layer                │
│  OrderScreenState → UseCase                        │
└────────────┬───────────────────────────────────────┘
             │ (depends on)
┌────────────▼───────────────────────────────────────┐
│               Application Layer                    │
│  OrderUseCase, CartUseCase (Business Logic)        │
└────────────┬───────────────────────────────────────┘
             │ (depends on)
┌────────────▼───────────────────────────────────────┐
│               Domain Layer                         │
│  IOrderRepository, IPaymentService, INotification  │
└────────────┬───────────────────────────────────────┘
             │ (depends on)
┌────────────▼───────────────────────────────────────┐
│               Data/Infrastructure Layer            │
│  OrderRepository, ApiService, LocalDatabase        │
└────────────────────────────────────────────────────┘
```

### Implementation

```dart
// ============ DOMAIN LAYER (Abstractions) ============

// Entities
class Order {
  final String id;
  final String restaurantId;
  final List<CartItem> items;
  final double totalAmount;
  final OrderStatus status;
  final DateTime createdAt;
  
  const Order({
    required this.id,
    required this.restaurantId,
    required this.items,
    required this.totalAmount,
    required this.status,
    required this.createdAt,
  });
}

class CartItem {
  final String menuItemId;
  final String name;
  final double price;
  final int quantity;
  
  const CartItem({
    required this.menuItemId,
    required this.name,
    required this.price,
    required this.quantity,
  });
}

enum OrderStatus { pending, confirmed, preparing, outForDelivery, delivered, cancelled }

// Repository interfaces (SRP, ISP, DIP)
abstract class IOrderRepository {
  Future<void> saveOrder(Order order);
  Future<Order?> getOrder(String orderId);
  Future<List<Order>> getOrderHistory(String userId);
}

abstract class IPaymentService {
  Future<bool> processPayment(double amount, String method);
  Future<bool> refundPayment(String transactionId, double amount);
}

abstract class INotificationService {
  Future<void> sendOrderConfirmation(Order order);
  Future<void> sendDeliveryUpdate(Order order, String message);
  Future<void> sendDeliveryNotification(Order order);
}

abstract class IRestaurantApi {
  Future<Map<String, dynamic>> submitOrder(Order order);
  Future<Map<String, dynamic>> trackOrder(String orderId);
}

// ============ APPLICATION LAYER (Use Cases) ============

class PlaceOrderUseCase {
  final IOrderRepository _orderRepository;
  final IPaymentService _paymentService;
  final INotificationService _notificationService;
  final IRestaurantApi _restaurantApi;
  
  PlaceOrderUseCase({
    required IOrderRepository orderRepository,
    required IPaymentService paymentService,
    required INotificationService notificationService,
    required IRestaurantApi restaurantApi,
  })  : _orderRepository = orderRepository,
        _paymentService = paymentService,
        _notificationService = notificationService,
        _restaurantApi = restaurantApi;
  
  Future<Order> execute({
    required List<CartItem> items,
    required String restaurantId,
    required double totalAmount,
    required String paymentMethod,
  }) async {
    // 1. Validate items (SRP: validation logic)
    if (items.isEmpty) throw Exception('Cart is empty');
    
    // 2. Process payment (ISP: only payment interface, not other services)
    final paymentSuccess = await _paymentService.processPayment(
      totalAmount,
      paymentMethod,
    );
    
    if (!paymentSuccess) throw Exception('Payment processing failed');
    
    // 3. Create order object (SRP: model creation)
    final order = Order(
      id: _generateOrderId(),
      restaurantId: restaurantId,
      items: items,
      totalAmount: totalAmount,
      status: OrderStatus.pending,
      createdAt: DateTime.now(),
    );
    
    // 4. Save locally (IOrderRepository abstraction)
    await _orderRepository.saveOrder(order);
    
    // 5. Submit to restaurant (IRestaurantApi abstraction)
    try {
      await _restaurantApi.submitOrder(order);
      
      // 6. Send confirmation notification (INotificationService abstraction)
      await _notificationService.sendOrderConfirmation(order);
      
      return order;
    } catch (e) {
      // Refund पर payment fail होने पर
      await _paymentService.refundPayment('trans_123', totalAmount);
      rethrow;
    }
  }
  
  String _generateOrderId() => 'ORD_${DateTime.now().millisecondsSinceEpoch}';
}

class TrackOrderUseCase {
  final IOrderRepository _orderRepository;
  final IRestaurantApi _restaurantApi;
  final INotificationService _notificationService;
  
  TrackOrderUseCase({
    required IOrderRepository orderRepository,
    required IRestaurantApi restaurantApi,
    required INotificationService notificationService,
  })  : _orderRepository = orderRepository,
        _restaurantApi = restaurantApi,
        _notificationService = notificationService;
  
  Future<Order> execute(String orderId) async {
    // Fetch from remote
    final trackingData = await _restaurantApi.trackOrder(orderId);
    
    // Update local copy
    // (Assuming we parse and update)
    
    // Send notification if status changed
    if (trackingData['status'] == 'outForDelivery') {
      // Dummy order for notification (in real app, fetch from repository)
      final order = await _orderRepository.getOrder(orderId);
      if (order != null) {
        await _notificationService.sendDeliveryNotification(order);
      }
    }
    
    return await _orderRepository.getOrder(orderId) ?? Order(...);
  }
}

// ============ DATA/INFRASTRUCTURE LAYER (Implementations) ============

// Repositories
class OrderRepository implements IOrderRepository {
  final String _dbPath;
  
  OrderRepository({required String dbPath}) : _dbPath = dbPath;
  
  @override
  Future<void> saveOrder(Order order) async {
    // Save to Hive/SQLite
    print('Saving order ${order.id} to local database');
  }
  
  @override
  Future<Order?> getOrder(String orderId) async {
    // Fetch from Hive/SQLite
    print('Fetching order $orderId from local database');
    return null;
  }
  
  @override
  Future<List<Order>> getOrderHistory(String userId) async {
    // Fetch all orders for user
    return [];
  }
}

// Payment Service
class RazorpayPaymentService implements IPaymentService {
  @override
  Future<bool> processPayment(double amount, String method) async {
    print('Processing payment of ₹$amount via Razorpay ($method)');
    // Call Razorpay API
    return true;
  }
  
  @override
  Future<bool> refundPayment(String transactionId, double amount) async {
    print('Refunding ₹$amount for transaction $transactionId');
    return true;
  }
}

// Notification Service
class PushNotificationService implements INotificationService {
  @override
  Future<void> sendOrderConfirmation(Order order) async {
    print('📱 Order confirmed! #${order.id}');
    // Send FCM notification
  }
  
  @override
  Future<void> sendDeliveryUpdate(Order order, String message) async {
    print('📍 Delivery update: $message');
  }
  
  @override
  Future<void> sendDeliveryNotification(Order order) async {
    print('🏍️ Your order is out for delivery!');
  }
}

// Restaurant API
class ZomatoApiService implements IRestaurantApi {
  final String _baseUrl = 'https://api.zomato.com';
  
  @override
  Future<Map<String, dynamic>> submitOrder(Order order) async {
    print('Submitting order to Zomato API');
    // HTTP call
    return {'success': true, 'orderId': order.id};
  }
  
  @override
  Future<Map<String, dynamic>> trackOrder(String orderId) async {
    print('Tracking order $orderId from Zomato API');
    // HTTP call
    return {'status': 'preparing'};
  }
}

// ============ PRESENTATION LAYER (UI) ============

class OrderScreenViewModel {
  final PlaceOrderUseCase _placeOrderUseCase;
  final TrackOrderUseCase _trackOrderUseCase;
  
  OrderScreenViewModel({
    required PlaceOrderUseCase placeOrderUseCase,
    required TrackOrderUseCase trackOrderUseCase,
  })  : _placeOrderUseCase = placeOrderUseCase,
        _trackOrderUseCase = trackOrderUseCase;
  
  Future<Order> placeOrder({
    required List<CartItem> items,
    required String restaurantId,
    required double totalAmount,
    required String paymentMethod,
  }) async {
    return _placeOrderUseCase.execute(
      items: items,
      restaurantId: restaurantId,
      totalAmount: totalAmount,
      paymentMethod: paymentMethod,
    );
  }
  
  Future<Order> trackOrder(String orderId) async {
    return _trackOrderUseCase.execute(orderId);
  }
}

class OrderScreen extends StatefulWidget {
  const OrderScreen({Key? key}) : super(key: key);
  
  @override
  State<OrderScreen> createState() => _OrderScreenState();
}

class _OrderScreenState extends State<OrderScreen> {
  late OrderScreenViewModel _viewModel;
  Order? _currentOrder;
  bool _isLoading = false;
  String? _errorMessage;
  
  @override
  void initState() {
    super.initState();
    // Setup dependency injection (SOLID DIP in action!)
    _setupDependencies();
  }
  
  void _setupDependencies() {
    final orderRepository = OrderRepository(dbPath: '/local/orders');
    final paymentService = RazorpayPaymentService();
    final notificationService = PushNotificationService();
    final restaurantApi = ZomatoApiService();
    
    final placeOrderUseCase = PlaceOrderUseCase(
      orderRepository: orderRepository,
      paymentService: paymentService,
      notificationService: notificationService,
      restaurantApi: restaurantApi,
    );
    
    final trackOrderUseCase = TrackOrderUseCase(
      orderRepository: orderRepository,
      restaurantApi: restaurantApi,
      notificationService: notificationService,
    );
    
    _viewModel = OrderScreenViewModel(
      placeOrderUseCase: placeOrderUseCase,
      trackOrderUseCase: trackOrderUseCase,
    );
  }
  
  Future<void> _handlePlaceOrder() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });
    
    try {
      final order = await _viewModel.placeOrder(
        items: [
          CartItem(
            menuItemId: '1',
            name: 'Butter Chicken',
            price: 350,
            quantity: 2,
          ),
        ],
        restaurantId: 'rest_123',
        totalAmount: 700,
        paymentMethod: 'upi',
      );
      
      setState(() {
        _currentOrder = order;
        _isLoading = false;
      });
      
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Order #${order.id} placed successfully!')),
      );
    } catch (e) {
      setState(() {
        _errorMessage = e.toString();
        _isLoading = false;
      });
      
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $_errorMessage')),
      );
    }
  }
  
  Future<void> _handleTrackOrder(String orderId) async {
    try {
      final order = await _viewModel.trackOrder(orderId);
      setState(() {
        _currentOrder = order;
      });
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error tracking order: $e')),
      );
    }
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Order')),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (_isLoading)
              const CircularProgressIndicator()
            else if (_errorMessage != null)
              Text('Error: $_errorMessage', style: const TextStyle(color: Colors.red))
            else if (_currentOrder != null)
              Text('Order #${_currentOrder!.id} - ${_currentOrder!.status.name}')
            else
              const Text('No order yet'),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: _handlePlaceOrder,
              child: const Text('Place Order'),
            ),
          ],
        ),
      ),
    );
  }
}

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({Key? key}) : super(key: key);
  
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Food Delivery',
      home: const OrderScreen(),
    );
  }
}
```

### क्या Improve हुआ?

| Aspect | Before | After |
|--------|--------|-------|
| **Testing** | Impossible (सब coupled) | हर layer independently test हो सकता है |
| **Changing payment provider** | UI code modify करना पड़े | सिर्फ `RazorpayPaymentService` को `StripePaymentService` से replace करो |
| **Adding new notification channel** | `OrderScreenState` को modify करो | नया `INotificationService` implementation add करो |
| **Code reusability** | बिल्कुल नहीं | `PlaceOrderUseCase` को कहीं भी use कर सकते हो |
| **Lines of code** | 1 giant class (500+ lines) | Multiple focused classes (~50-100 lines each) |

---

## Testing SOLID Code

SOLID का biggest benefit है कि testing बहुत easy हो जाता है:

```dart
import 'package:flutter_test/flutter_test.dart';

// Mock implementations
class MockOrderRepository implements IOrderRepository {
  List<Order> savedOrders = [];
  
  @override
  Future<void> saveOrder(Order order) async {
    savedOrders.add(order);
  }
  
  @override
  Future<Order?> getOrder(String orderId) async {
    try {
      return savedOrders.firstWhere((o) => o.id == orderId);
    } catch (e) {
      return null;
    }
  }
  
  @override
  Future<List<Order>> getOrderHistory(String userId) async {
    return savedOrders;
  }
}

class MockPaymentService implements IPaymentService {
  bool shouldFail = false;
  
  @override
  Future<bool> processPayment(double amount, String method) async {
    if (shouldFail) return false;
    return true;
  }
  
  @override
  Future<bool> refundPayment(String transactionId, double amount) async {
    return true;
  }
}

class MockNotificationService implements INotificationService {
  List<String> sentNotifications = [];
  
  @override
  Future<void> sendOrderConfirmation(Order order) async {
    sentNotifications.add('confirmation_${order.id}');
  }
  
  @override
  Future<void> sendDeliveryUpdate(Order order, String message) async {
    sentNotifications.add('update_${order.id}');
  }
  
  @override
  Future<void> sendDeliveryNotification(Order order) async {
    sentNotifications.add('delivery_${order.id}');
  }
}

class MockRestaurantApi implements IRestaurantApi {
  @override
  Future<Map<String, dynamic>> submitOrder(Order order) async {
    return {'success': true, 'orderId': order.id};
  }
  
  @override
  Future<Map<String, dynamic>> trackOrder(String orderId) async {
    return {'status': 'preparing'};
  }
}

void main() {
  group('PlaceOrderUseCase', () {
    test('should successfully place order and send confirmation', () async {
      // Arrange
      final mockRepository = MockOrderRepository();
      final mockPaymentService = MockPaymentService();
      final mockNotificationService = MockNotificationService();
      final mockRestaurantApi = MockRestaurantApi();
      
      final useCase = PlaceOrderUseCase(
        orderRepository: mockRepository,
        paymentService: mockPaymentService,
        notificationService: mockNotificationService,
        restaurantApi: mockRestaurantApi,
      );
      
      // Act
      final order = await useCase.execute(
        items: [
          CartItem(
            menuItemId: '1',
            name: 'Test Item',
            price: 100,
            quantity: 1,
          ),
        ],
        restaurantId: 'rest_123',
        totalAmount: 100,
        paymentMethod: 'upi',
      );
      
      // Assert
      expect(order.status, OrderStatus.pending);
      expect(mockRepository.savedOrders.length, 1);
      expect(mockNotificationService.sentNotifications, isNotEmpty);
    });
    
    test('should refund if payment fails', () async {
      // Arrange
      final mockRepository = MockOrderRepository();
      final mockPaymentService = MockPaymentService()..shouldFail = true;
      final mockNotificationService = MockNotificationService();
      final mockRestaurantApi = MockRestaurantApi();
      
      final useCase = PlaceOrderUseCase(
        orderRepository: mockRepository,
        paymentService: mockPaymentService,
        notificationService: mockNotificationService,
        restaurantApi: mockRestaurantApi,
      );
      
      // Act & Assert
      expect(
        () => useCase.execute(
          items: [CartItem(menuItemId: '1', name: 'Item', price: 100, quantity: 1)],
          restaurantId: 'rest_123',
          totalAmount: 100,
          paymentMethod: 'upi',
        ),
        throwsException,
      );
      
      expect(mockRepository.savedOrders.isEmpty, true);
    });
  });
}
```

---

## Common SOLID Mistakes in Flutter

### ❌ Mistake 1: StatefulWidget में सब logic

```dart
class BadExample extends StatefulWidget {
  // ...
}

class _BadExampleState extends State<BadExample> {
  // API calls
  // Database logic
  // Validation
  // UI building
  // Analytics
  // All in one class!
}
```

**Fix**: UseCase, Repository, ViewModel separate करो.

### ❌ Mistake 2: Widget को directly dependency pass न करके service locator में सब

```dart
// बहुत tight coupling
class BadScreen extends StatefulWidget {
  @override
  State<BadScreen> createState() => _BadScreenState();
}

class _BadScreenState extends State<BadScreen> {
  @override
  void initState() {
    super.initState();
    // हर जगह getIt.
    final api = getIt<ApiService>();
    final db = getIt<Database>();
    // ... 10 more getIt calls
  }
}
```

**Fix**: Constructor में pass करो, यah ज़्यादा testable है.

### ❌ Mistake 3: Massive interfaces जो everything define करते हैं

```dart
// Fat interface — ISP violation
abstract class IEverything {
  Future<void> fetchData();
  Future<void> saveData();
  void updateUI();
  void logAnalytics();
  void handlePayment();
  // ... 20 more methods
}
```

**Fix**: Segregated interfaces बनाओ.

### ❌ Mistake 4: Concrete classes पर dependency

```dart
// DIP violation
class MyScreen {
  final FirebaseDatabase _firebaseDb = FirebaseDatabase();
  final FirebaseAnalytics _analytics = FirebaseAnalytics();
  final RazorpayPayment _payment = RazorpayPayment();
  
  // अब Firebase/Razorpay से detach कर ही नहीं सकते
}
```

**Fix**: Abstractions के through depend करो.

---

## Tips for SOLID in Flutter

> [!tip]
> **SOLID को gradually apply करो** — एक बार में सब perfect नहीं होगा. छोटे classes से शुरू करो, जो एक काम अच्छे से करें.

> [!tip]
> **"Tell, don't ask"** — UI को data fetch करने के लिए say मत करो ("go get data"). Instead, tell करो ("I need this data") और abstraction handle करे.

> [!tip]
> **Testing drive करो** — अगर testing मुश्किल है, तो SOLID अभी नहीं है. Refactor करो.

> [!warning]
> **Over-engineering से बचो** — हर छोटी चीज़ के लिए interface न बनाओ. SOLID तब लागू करो जब real benefit हो (reusability, testability, flexibility).

> [!warning]
> **Don't abstract prematurely** — Code पहले लिखो, फिर pattern देखो. फिर abstract करो.

---

## Key Takeaways

- **Single Responsibility**: एक class, एक job. Testing, maintenance, reusability सब आसान हो जाता है.

- **Open/Closed**: Extensions के लिए open, modifications के लिए closed. नये features add करो existing code छुए बिना.

- **Liskov Substitution**: Subclasses को parent की जगह use हो सकना चाहिए. Contracts honor करो.

- **Interface Segregation**: Clients को सिर्फ जो चाहिए वो interface दो. Fat interfaces avoid करो.

- **Dependency Inversion**: Abstractions पर depend करो, concrete classes पर नहीं. Testing aur flexibility के लिए.

- **Together, SOLID**: Architecture clean रहता है. Code reusable, testable, और maintainable होता है. Scale करना आसान होता है.

- **Dart/Flutter में real-world**: Repository pattern, UseCase layer, ViewModel, DI (GetIt). ये सब SOLID follow करता है.

- **Test SOLID code**: Mock implementations बनाओ. हर layer independently test करो. Coverage बढ़ाना आसान हो जाता है.

- **Gradual adoption**: एक बार में perfect architecture न बनाओ. छोटे से शुरू करो, refactor करो, improve करो.
