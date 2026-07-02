# Optional — Null ka Dushman, Developer ka Dost

Socho ek scenario — tum Swiggy ka backend likh rahe ho. User ne search kiya "Pizza near me", aur tumhara code database mein user ka address dhundh raha hai. Ab kya hoga agar woh user ne address save hi nahi kiya? Tum `null` return karoge. Aur jo code us address ko use karega, woh `NullPointerException` throw karega. Server crash. Order fail. User angry. Reviews kharab.

Yahi hai **The Billion Dollar Mistake** — `null` ka invention. Tony Hoare ne 1965 mein `null` introduce kiya tha aur baad mein khud bola "I call it my billion-dollar mistake." Kyunki null reference ka ek hi matlab hota hai — kuch hai hi nahi — lekin compiler tumhe kabhi nahi batata ki koi value null ho sakti hai. Tumhe runtime pe pata chalta hai, jab `NullPointerException` aata hai aur production down ho jaata hai.

Java ne is problem ka solution Java 8 mein diya — `Optional<T>`.

> [!info] TypeScript wale bhai, sun!
> TypeScript mein tumhare paas `string | undefined` jaisi union types hain, aur optional chaining `?.` aur nullish coalescing `??` bhi hai. Java mein koi union types nahi hain. Isliye `Optional<T>` aaya — yeh basically ek wrapper class hai jo kehti hai "ho sakta hai value ho, ho sakta hai na ho." Soch lo Rust ka `Option<T>` ya Haskell ka `Maybe` — bilkul wohi concept hai. TypeScript mein jo kaam `?.` karta hai, woh Java mein `Optional.map()` karta hai.

---

## Null kyun problem hai?

Pehle samajhte hain ki null actually kya issue create karta hai.

```java
// Purana style — null wala
public User findUser(long id) {
    return database.get(id); // null return ho sakta hai
}

// Calling code
User user = findUser(99L);
String name = user.getName(); // BOOM — NullPointerException agar user null hai
```

Yahan problem yeh hai — `findUser` ka signature dekh ke kaise pata chalega ki woh kabhi `null` return kar sakta hai? Return type sirf `User` hai. Javadoc padhna padega, ya code trace karna padega. Aur agar bhool gaye check karna — production mein NPE. 

**`Optional<T>` yahi problem solve karta hai** — woh *type signature mein hi* bata deta hai ki "yaar, yeh value absent ho sakti hai." Compiler-level contract.

```java
// Optional style — honest return type
public Optional<User> findUser(long id) {
    return Optional.ofNullable(database.get(id));
}

// Calling code — compiler tumhe force karta hai handle karne ke liye
Optional<User> maybeUser = findUser(99L);
// Ab tum directly .getName() nahi kar sakte — pehle handle karo
```

---

## Optional Banana — Tin Tarike

```java
// Tarika 1: Optional.of() — jab tumhe 100% pata hai value null nahi hai
// Agar null pass kiya toh turant NullPointerException — production mein mat karo yeh galti
Optional<String> a = Optional.of("hello");

// Tarika 2: Optional.ofNullable() — jab uncertain ho, yeh sabse safe hai
// Agar value null hai toh empty Optional return hoga, NPE nahi
String maybeNull = database.get("key"); // null ho sakta hai
Optional<String> b = Optional.ofNullable(maybeNull);

// Tarika 3: Optional.empty() — explicitly empty Optional banana
// Useful jab tum clearly signal karna chahte ho ki kuch nahi mila
Optional<String> c = Optional.empty();
```

> [!tip] Real project mein
> Repository methods mein hamesha `Optional.ofNullable()` use karo. `Optional.of()` sirf tab use karo jab tumhe absolute certainty ho (jaise kisi hardcoded value ke liye).

---

## Optional se Value Nikalna — Safe Tarike

```java
Optional<String> opt = Optional.ofNullable(someValue);

// Cheking methods
opt.isPresent();   // true agar value hai
opt.isEmpty();     // true agar empty hai (Java 11+)

// Value nikalna — SAFE TARIKE
opt.orElse("default");              // value hai toh woh, nahi toh "default"
opt.orElseGet(() -> compute());     // lazy — sirf tab compute() call hota hai jab empty ho
opt.orElseThrow();                  // value nahi toh NoSuchElementException
opt.orElseThrow(() -> new NotFoundException("User nahi mila!")); // custom exception

// UNSAFE — avoid karo
opt.get(); // value nahi toh NoSuchElementException — .isPresent() check kiye bina mat karo
```

### `orElse` vs `orElseGet` — Fark Samajhna Zaruri Hai

Yeh ek subtle lekin important difference hai:

```java
// orElse — hamesha evaluate hota hai, chahe Optional empty ho ya nahi
Optional<User> user = findUser(id);
User result = user.orElse(createExpensiveDefaultUser()); 
// createExpensiveDefaultUser() call HO GAYA — chahe user mila ho ya nahi!

// orElseGet — sirf tab evaluate hota hai jab Optional empty ho
User result = user.orElseGet(() -> createExpensiveDefaultUser());
// createExpensiveDefaultUser() sirf tab call hoga jab user nahi milega
```

> [!warning] Performance Gotcha
> Agar tumhara fallback expensive operation hai (database call, network request, complex calculation), **hamesha `orElseGet()` use karo**. `orElse()` mein argument hamesha evaluate hota hai — unnecessary DB calls ho sakte hain.

---

## Functional Style — Yahi Sahi Tarika Hai

Yahan Optional ki asli power hai. Yeh `map`, `flatMap`, `filter` sab support karta hai — bilkul Streams ki tarah.

### map() — Value Transform Karo

```java
Optional<User> user = repo.findById(id);

// TypeScript mein: user?.name
// Java mein:
Optional<String> name = user.map(User::getName);

// Chain karo — har step pe Optional safe rehta hai
Optional<String> upperName = user
    .map(User::getName)           // Optional<String>
    .map(String::toUpperCase);    // Optional<String>

// Agar koi bhi step empty return kare, chain rukk jaati hai — NPE nahi aata
```

### flatMap() — Jab Function Khud Optional Return Kare

```java
// User ke andar optional email hai
Optional<User> user = repo.findById(id);

// GALAT — yeh Optional<Optional<String>> dega
Optional<Optional<String>> wrong = user.map(User::getEmail);

// SAHI — flatMap flatten kar deta hai
// TypeScript mein: user?.address?.zip
// Java mein:
Optional<String> email = user.flatMap(User::getEmail);

// Deep nesting bhi handle hota hai
Optional<String> zip = user
    .flatMap(User::getAddress)    // Optional<Address>
    .map(Address::getZip);        // Optional<String>
```

### ifPresent() aur ifPresentOrElse() — Side Effects ke Liye

```java
Optional<User> user = repo.findById(id);

// Sirf kuch karo agar value hai
// TypeScript mein: if (user) { log(user) }
user.ifPresent(u -> log.info("User mila: {}", u.getName()));

// Java 9+ — do kaam karo: ek agar hai, ek agar nahi
user.ifPresentOrElse(
    u -> log.info("User mila: {}", u.getName()),
    () -> log.warn("Koi user nahi mila!")
);
```

### filter() — Condition Check Karo

```java
Optional<User> user = repo.findById(id);

// Sirf active users chahiye
Optional<User> activeUser = user.filter(User::isActive);

// Agar user hai lekin active nahi — empty Optional milega
// Agar user hai aur active hai — wahi user milega
// Agar user hi nahi — empty Optional milega
```

### or() — Fallback Optional (Java 9+)

```java
// Agar primary source mein nahi mila, backup se try karo
Optional<User> user = primaryRepo.findById(id)
    .or(() -> backupRepo.findById(id));

// Yeh Zomato jaisa hai — preferred restaurant mein nahi mila dish, 
// toh nearby restaurant try karo
```

---

## Streams ke Saath — Real Power

Optional aur Streams saath mein ekdum mast kaam karte hain:

```java
List<Long> userIds = List.of(1L, 2L, 99L, 3L); // 99L exist nahi karta

// Stream<Optional<User>> — awkward
List<Optional<User>> optionals = userIds.stream()
    .map(repo::findById)
    .toList();

// Optional.stream() use karo — Java 9+
// Empty Optionals automatically drop ho jaate hain
List<User> users = userIds.stream()
    .map(repo::findById)        // Stream<Optional<User>>
    .flatMap(Optional::stream)  // Stream<User> — empties gone
    .toList();

// Iska use case: Swiggy pe multiple restaurant IDs se sirf valid restaurants nikalna
List<Restaurant> activeRestaurants = restaurantIds.stream()
    .map(restaurantRepo::findById)
    .flatMap(Optional::stream)
    .filter(Restaurant::isOpen)
    .toList();
```

---

## TypeScript vs Java — Side by Side

| TypeScript | Java (Optional) |
|---|---|
| `string \| undefined` | `Optional<String>` |
| `user?.name` | `user.map(User::getName)` |
| `user?.address?.zip` | `user.flatMap(User::getAddress).map(Address::getZip)` |
| `user ?? defaultUser` | `user.orElse(defaultUser)` |
| `user ?? makeDefault()` | `user.orElseGet(() -> makeDefault())` |
| `if (user) { ... }` | `user.ifPresent(u -> ...)` |
| `user!` (non-null assertion) | `opt.get()` — dono avoid karo |
| `as NonNullable<User>` | `opt.orElseThrow()` |

---

## Complete Code Example — UserService

```java
package com.example.opt;

import java.util.*;

// Record — Java 16+ mein concise data class
// Email Optional hai kyunki user ne email save nahi kiya hoga
public record User(long id, String name, Optional<String> email) {
    
    // Factory method — bahar se zyada clean API
    public static User of(long id, String name, String email) {
        return new User(id, name, Optional.ofNullable(email));
    }
}

public class UserService {
    private final Map<Long, User> store = new HashMap<>();

    // Return type Optional<User> — caller ko pata hai ki user nahi milega kabhi kabhi
    public Optional<User> findById(long id) {
        return Optional.ofNullable(store.get(id));
    }

    // Agar nahi mila toh exception — jaise IRCTC ticket nahi mila toh error page
    public User getOrThrow(long id) {
        return findById(id)
            .orElseThrow(() -> new NoSuchElementException("User " + id + " nahi mila!"));
    }

    // Name display karo — nahi mila toh "UNKNOWN"
    // Zomato pe user ka naam nahi diya toh "Guest" dikhao
    public String displayName(long id) {
        return findById(id)
            .map(User::name)              // Optional<String>
            .map(String::toUpperCase)     // Optional<String>
            .orElse("UNKNOWN");           // String
    }

    // Email nikalo — nahi mila toh default no-reply address
    // Jaise Flipkart order confirmation ke liye fallback email
    public String emailFor(long id) {
        return findById(id)
            .flatMap(User::email)         // Optional<Optional<String>> -> Optional<String>
            .orElse("no-reply@example.com");
    }

    // Active users ki list nikalo from IDs
    public List<User> findActiveUsers(List<Long> ids) {
        return ids.stream()
            .map(this::findById)           // Stream<Optional<User>>
            .flatMap(Optional::stream)     // Stream<User> — missing users drop
            .filter(u -> u.name() != null) // sirf valid users
            .toList();
    }

    public static void main(String[] args) {
        var svc = new UserService();
        
        // Alice ke paas email hai
        svc.store.put(1L, User.of(1, "Alice", "alice@example.com"));
        
        // Bob ne email nahi diya — Paytm jaisa — optional fields
        svc.store.put(2L, User.of(2, "Bob", null));

        System.out.println(svc.displayName(1));   // ALICE
        System.out.println(svc.displayName(99));  // UNKNOWN — user exist hi nahi karta
        System.out.println(svc.emailFor(2));      // no-reply@example.com — Bob ka email nahi
        System.out.println(svc.emailFor(1));      // alice@example.com
    }
}
```

---

## Spring Data JPA ke Saath Optional

Spring Data mein `findById()` automatically `Optional<T>` return karta hai. Yeh ek acha pattern hai:

```java
@Service
public class OrderService {
    
    @Autowired
    private OrderRepository orderRepository;
    
    // GALAT — turant unwrap karna
    public Order getOrder(Long id) {
        Optional<Order> order = orderRepository.findById(id);
        return order.get(); // Khatarnak! Empty ho toh exception
    }
    
    // SAHI — meaningful exception throw karo
    public Order getOrder(Long id) {
        return orderRepository.findById(id)
            .orElseThrow(() -> new OrderNotFoundException("Order #" + id + " nahi mila"));
    }
    
    // SAHI — functional chain — Zomato order status check
    public String getOrderStatus(Long id) {
        return orderRepository.findById(id)
            .filter(order -> order.getStatus() != null)
            .map(Order::getStatus)
            .map(Enum::name)
            .orElse("ORDER_NOT_FOUND");
    }
    
    // SAHI — side effect only karo agar exists
    public void notifyIfDelivered(Long id) {
        orderRepository.findById(id)
            .filter(order -> order.getStatus() == Status.DELIVERED)
            .ifPresent(order -> notificationService.sendDeliveryConfirmation(order));
    }
}
```

---

## Gotchas — Beginners Yahi Galtiyan Karte Hain

> [!warning] Gotcha 1: Optional ko Field mat banao
> ```java
> // GALAT — Optional field as class member
> public class User {
>     private Optional<String> middleName; // NO! Yeh anti-pattern hai
> }
>
> // SAHI — null internally, Optional sirf return type ke liye
> public class User {
>     private String middleName; // null internally — theek hai
>
>     // Getter Optional return kare — caller ko signal do
>     public Optional<String> getMiddleName() {
>         return Optional.ofNullable(middleName);
>     }
> }
> ```
> Optional `Serializable` nahi hai (technically implement karta hai ab, but design intent yahi nahi tha). JDK team ne explicitly kaha — sirf return types ke liye.

> [!warning] Gotcha 2: Optional ko Collection mein mat daalo
> ```java
> // GALAT — List of Optionals
> List<Optional<User>> users = ids.stream()
>     .map(repo::findById)
>     .toList(); // Useless! List mein empties kyun rakhoge?
>
> // SAHI — flatMap se empties drop karo
> List<User> users = ids.stream()
>     .map(repo::findById)
>     .flatMap(Optional::stream)
>     .toList();
> ```

> [!warning] Gotcha 3: `.get()` use mat karo
> ```java
> // GALAT — aur isPresent() ke baad bhi bad practice hai
> if (opt.isPresent()) {
>     User user = opt.get(); // Technically safe yahan, but ugly
> }
>
> // SAHI — functional style
> opt.ifPresent(user -> doSomething(user));
> // ya
> User user = opt.orElseThrow();
> ```
> `.get()` ek code smell hai — reviewer instantly samjh jaata hai ki kuch galat hai. Hamesha `orElse`, `orElseThrow`, `map`, `ifPresent` prefer karo.

> [!warning] Gotcha 4: Method Parameter mein Optional mat lo
> ```java
> // GALAT — Optional as parameter
> public void processUser(Optional<User> user) { ... }
>
> // SAHI — caller ko Optional return type se deal karne do
> public void processUser(User user) { ... } // caller Optional.ifPresent se call kare
> ```
> Optional sirf **return type** ke liye hai. Parameters mein null check ya method overloading use karo.

> [!warning] Gotcha 5: Optional.of() se null pass karna
> ```java
> String value = null;
>
> // GALAT — NullPointerException turant
> Optional<String> opt = Optional.of(value); // BOOM!
>
> // SAHI
> Optional<String> opt = Optional.ofNullable(value); // Safe, empty Optional milega
> ```

> [!tip] Spring Data Tip
> Spring Data JPA ka `findById()` already `Optional<T>` return karta hai. Isse turant unwrap mat karo — iske `orElseThrow()` ya `map()` chain use karo directly. Yahi idiomatic Spring code hai.

---

## Real Project Pattern — Swiggy Order Flow Example

```java
@Service
public class DeliveryService {

    public DeliveryEstimate getDeliveryEstimate(Long userId, Long restaurantId) {
        // User dhundho
        Optional<User> user = userRepo.findById(userId);
        
        // User ka address nikalo
        Optional<Address> address = user.flatMap(User::getDeliveryAddress);
        
        // Restaurant dhundho
        Optional<Restaurant> restaurant = restaurantRepo.findById(restaurantId);
        
        // Dono hain toh estimate calculate karo, nahi toh default
        return address.flatMap(addr -> 
            restaurant.map(rest -> 
                calculateEstimate(addr, rest)
            )
        ).orElse(DeliveryEstimate.unavailable());
        
        // Agar user nahi — unavailable
        // Agar user hai par address nahi — unavailable  
        // Agar restaurant nahi — unavailable
        // Sab hai toh actual estimate
    }
}
```

---

## Key Takeaways

- **Optional sirf return type ke liye hai** — field, parameter, ya collection mein nahi

- **`Optional.ofNullable()` sabse safe hai** — null value pe NPE nahi deta, empty Optional deta hai

- **`orElseGet()` prefer karo `orElse()` ke upar** jab fallback expensive ho — lazy evaluation ke liye

- **`.get()` ek code smell hai** — `orElse`, `orElseThrow`, `map`, `ifPresent` use karo

- **`map()` vs `flatMap()`** — agar transformation function Optional return karta hai toh `flatMap()`, warna `map()`

- **`Optional::stream`** use karo Streams ke saath — empty values automatically drop ho jaati hain

- **TypeScript background se aa rahe ho?** `?.` wala kaam `map()` karta hai, `??` wala kaam `orElse()` karta hai

- **Spring Data** mein `findById()` already Optional return karta hai — isse embrace karo, turant unwrap mat karo
