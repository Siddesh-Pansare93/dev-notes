# @RestController Basics — Spring Boot ka HTTP Gateway

Socho ek second ke liye — Zomato ka backend. Jab tum apne phone mein "Chicken Biryani" search karo, ek HTTP request jaati hai kisi server pe. Woh server decide karta hai: "Yeh `/api/v1/restaurants/search?q=biryani` request hai, isko `RestaurantController` ke `search()` method se handle karo." Phir result JSON mein wapas aata hai, app usse render karta hai.

Yahi kaam karta hai `@RestController` — woh HTTP requests ko Java methods se connect karta hai, aur return value ko automatically JSON mein convert karta hai.

Agar tum Node.js/Express background se aa rahe ho, toh seedha baat karte hain:

> **Express mein**: `const router = express.Router(); router.get('/users', handler); app.use('/api', router);`
>
> **Spring mein**: Ek class likhao, `@RestController` lagao, methods pe `@GetMapping`/`@PostMapping` lagao — Spring baaki sab khud kar leta hai. Koi `app.use()` nahi, koi `express()` nahi. Bas annotations.

Yeh "magic" kaise hoti hai? Component Scanning — Spring startup pe poore codebase ko scan karta hai, `@RestController` wali classes dhundhta hai, unhe beans banaata hai, aur DispatcherServlet se wire kar deta hai. Sab automatic.

---

## @Controller vs @RestController — Confusion Door Karo

Pehle yeh clear kar lete hain kyunki bahut log yahan gadbad karte hain.

Spring MVC originally web applications ke liye bana tha jahan server HTML pages return karta tha (jaise Thymeleaf templates). Usme `@Controller` use hota tha.

| Annotation | Kya karta hai | Kab use karo |
| --- | --- | --- |
| `@Controller` | Method ka return value ek **view name** maana jaata hai (e.g., `"home"` → `home.html` template) | Thymeleaf/JSP wali traditional web apps mein |
| `@RestController` | `@Controller` + `@ResponseBody` ka combination — return value directly **JSON** mein serialize hota hai Jackson ke through | REST APIs ke liye — **yehi tumhara use case hai** |
| `@ResponseBody` | Sirf ek specific method ke liye JSON serialization on karo | Rare case — jab `@Controller` class ho but ek method JSON return kare |

`@RestController` internally yahi hai:

```java
// Spring ke andar yahi likha hua hai:
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Documented
@Controller        // <-- yeh bhi hai
@ResponseBody      // <-- yeh bhi hai
public @interface RestController {
    ...
}
```

Isliye ek annotation se dono kaam ho jaata hai.

> [!warning] Sabse common beginner mistake
> `@RestController` ki jagah sirf `@Controller` likh diya. Ab jab method `UserDto` object return karega, Spring usse view name samjhega — `"UserDto"` naam ka template dhundhega, nahi milega, **500 Internal Server Error** aa jaayega. Hamesha REST APIs ke liye `@RestController` use karo.

---

## DispatcherServlet — Requests ka Traffic Inspector

Express mein ek central `app` object hota hai jisme saare routes register hote hain. Spring mein yeh kaam karta hai **DispatcherServlet**.

Jab bhi koi HTTP request aati hai (chahe `/api/v1/orders` ho ya `/health`), sabse pehle DispatcherServlet pe aati hai. Woh dekhta hai:
1. URL kya hai?
2. HTTP method kya hai (GET/POST/PUT/DELETE)?
3. Kaunsa controller class aur method is request ko handle karta hai?

Phir woh us method ko call karta hai, return value leta hai, aur Jackson (JSON library) se serialize karke response bhej deta hai.

Tomcat (embedded web server) → DispatcherServlet → Handler Mapping → Tumhara `@RestController` method

Yeh sab ek single Maven dependency se milta hai:

```xml
<!-- pom.xml mein bas yeh ek line -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>
```

Is ek starter ke andar kya kya aata hai:
- **Spring MVC** — routing, controllers, request binding
- **Jackson** — Java objects ko JSON mein convert karna
- **Tomcat** — embedded web server (alag se install nahi karna)
- **Validation** — `@Valid` annotation support
- **DispatcherServlet auto-configuration** — khud register ho jaata hai

Express mein tum manually `express()`, `body-parser`, port listen — sab karte the. Yahan `spring-boot-starter-web` sab kuch le aata hai.

---

## Annotations Ki Poori Dictionary

### @RequestMapping — Base URL Define Karo

Class level pe lagaao toh saare methods us prefix se shuru hote hain:

```java
@RestController
@RequestMapping("/api/v1/restaurants")  // Swiggy jaisa restaurant API
public class RestaurantController {
    // Saare methods automatically /api/v1/restaurants/... pe honge
}
```

Method level pe bhi use kar sakte ho specific path ke liye, plus HTTP method specify karna hoga:

```java
@RequestMapping(path = "/menu", method = RequestMethod.GET)
public List<MenuItem> getMenu() { ... }
```

### @GetMapping, @PostMapping, etc. — Shortcut Annotations

`@RequestMapping(method = RequestMethod.GET)` likhna thoda verbose hai. Isliye shortcuts hain:

| Annotation | Equivalent | Use Case |
| --- | --- | --- |
| `@GetMapping("/path")` | `@RequestMapping(path="/path", method=GET)` | Data fetch karna |
| `@PostMapping("/path")` | `@RequestMapping(path="/path", method=POST)` | Naya resource create karna |
| `@PutMapping("/path")` | `@RequestMapping(path="/path", method=PUT)` | Poora resource replace karna |
| `@PatchMapping("/path")` | `@RequestMapping(path="/path", method=PATCH)` | Partial update |
| `@DeleteMapping("/path")` | `@RequestMapping(path="/path", method=DELETE)` | Resource delete karna |

### @PathVariable — URL ke andar se value nikalo

Jaise Express mein `req.params.id`, Spring mein `@PathVariable`:

```java
// Express: router.get('/orders/:orderId', (req, res) => req.params.orderId)
// Spring:
@GetMapping("/{orderId}")
public OrderDto getOrder(@PathVariable Long orderId) {
    return orderService.findById(orderId);
}
```

URL `/api/v1/orders/42` → `orderId = 42L` automatically bind ho jaata hai.

### @RequestParam — Query Parameters

Jaise Express mein `req.query.status`, Spring mein `@RequestParam`:

```java
// GET /api/v1/restaurants?city=mumbai&cuisine=indian&page=1
@GetMapping
public List<RestaurantDto> search(
    @RequestParam String city,
    @RequestParam(required = false) String cuisine,   // optional param
    @RequestParam(defaultValue = "0") int page        // default value
) {
    return restaurantService.search(city, cuisine, page);
}
```

### @RequestBody — Request Body Parse Karo

Jaise Express mein `req.body` (body-parser ke baad), Spring mein `@RequestBody`:

```java
// POST /api/v1/orders
// Body: { "restaurantId": 5, "items": [...], "address": "..." }
@PostMapping
public ResponseEntity<OrderDto> placeOrder(@RequestBody @Valid PlaceOrderRequest req) {
    OrderDto order = orderService.place(req);
    return ResponseEntity
            .created(URI.create("/api/v1/orders/" + order.id()))
            .body(order);
}
```

`@Valid` annotation automatic validation trigger karta hai — agar `PlaceOrderRequest` class mein `@NotNull`, `@Size` jaisi constraints hain toh invalid request pe 400 aa jaayega automatically.

---

## Complete Working Example — Swiggy Order API

Yeh ek realistic example hai jo sabhi concepts cover karta hai:

```java
package com.swiggy.api.order;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;

// Yeh annotation class ko Spring REST controller banaata hai
// Jackson automatically return values ko JSON mein convert karega
@RestController
// Saare methods is base path se start honge
@RequestMapping("/api/v1/orders")
public class OrderController {

    // Constructor injection — field injection se behtar hai
    // Spring automatically OrderService bean inject karega
    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    // GET /api/v1/orders
    // Saare orders fetch karo (paginated hona chahiye real app mein)
    @GetMapping
    public List<OrderDto> getAllOrders() {
        return orderService.findAll();
    }

    // GET /api/v1/orders/42
    // Ek specific order fetch karo ID se
    @GetMapping("/{id}")
    public OrderDto getOrderById(@PathVariable Long id) {
        // Agar order nahi mila toh service ResourceNotFoundException throw karega
        // jo @ControllerAdvice se 404 mein convert hoga
        return orderService.findById(id);
    }

    // GET /api/v1/orders?status=DELIVERED&userId=101
    // Status aur userId se orders filter karo
    @GetMapping("/search")
    public List<OrderDto> searchOrders(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return orderService.search(status, userId, page, size);
    }

    // POST /api/v1/orders
    // Naya order place karo
    // @Valid — PlaceOrderRequest class ki constraints validate karega
    // @RequestBody — JSON body ko PlaceOrderRequest object mein convert karega
    @PostMapping
    public ResponseEntity<OrderDto> placeOrder(@RequestBody @Valid PlaceOrderRequest req) {
        OrderDto created = orderService.place(req);
        // 201 Created + Location header with new resource URL
        return ResponseEntity
                .created(URI.create("/api/v1/orders/" + created.id()))
                .body(created);
    }

    // PUT /api/v1/orders/42
    // Order update karo (jaise delivery address change)
    @PutMapping("/{id}")
    public OrderDto updateOrder(
            @PathVariable Long id,
            @RequestBody @Valid UpdateOrderRequest req
    ) {
        return orderService.update(id, req);
    }

    // DELETE /api/v1/orders/42
    // Order cancel karo
    // @ResponseStatus — method void return karta hai, 204 No Content status bhejo
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void cancelOrder(@PathVariable Long id) {
        orderService.cancel(id);
    }

    // PATCH /api/v1/orders/42/status
    // Sirf status update karo (partial update)
    @PatchMapping("/{id}/status")
    public OrderDto updateStatus(
            @PathVariable Long id,
            @RequestBody UpdateStatusRequest req
    ) {
        return orderService.updateStatus(id, req.status());
    }
}
```

### Request/Response Classes (DTOs)

```java
// Yeh record Java 16+ feature hai — TypeScript interface jaisa
// Immutable data carrier, getters automatic
public record PlaceOrderRequest(
    @NotNull Long restaurantId,              // null nahi ho sakta
    @NotBlank String deliveryAddress,        // empty string nahi ho sakta
    @NotEmpty List<OrderItemRequest> items,  // empty list nahi ho sakta
    Long couponId                            // optional hai — null ho sakta hai
) {}

public record OrderItemRequest(
    @NotNull Long menuItemId,
    @Min(1) int quantity               // minimum 1 hona chahiye
) {}

public record OrderDto(
    Long id,
    String status,
    String restaurantName,
    List<OrderItemDto> items,
    Double totalAmount,
    String estimatedDelivery
) {}
```

---

## application.yml Configuration

```yaml
server:
  port: 8080                    # Default port (Express ka default 3000 hota hai)
  servlet:
    context-path: /             # Base path — /api lagaate toh /api/api/v1/orders ban jaata

spring:
  mvc:
    log-resolved-exception: true   # Exceptions ki detailed logging
  jackson:
    default-property-inclusion: non_null   # null fields JSON mein mat dikhao
    property-naming-strategy: SNAKE_CASE   # camelCase → snake_case conversion
```

---

## Express vs Spring — Side by Side Comparison

Pehle Express wala code dekho:

```typescript
// Express/TypeScript version
import express from 'express';

const router = express.Router();

// GET /orders
router.get('/', async (req, res) => {
  const orders = await orderService.findAll();
  res.json(orders);  // manually JSON convert karo
});

// GET /orders/:id
router.get('/:id', async (req, res) => {
  const order = await orderService.findById(Number(req.params.id));
  res.json(order);
});

// POST /orders
router.post('/', async (req, res) => {
  const order = await orderService.place(req.body);
  res.status(201)
     .location(`/orders/${order.id}`)
     .json(order);
});

// Register router
app.use('/api/v1/orders', router);
```

Ab Spring equivalent:

```java
// Spring Boot version
@RestController
@RequestMapping("/api/v1/orders")
public class OrderController {

    // GET /api/v1/orders
    @GetMapping
    public List<OrderDto> findAll() {
        return orderService.findAll();  // return karo, Jackson JSON banata hai
    }

    // GET /api/v1/orders/{id}
    @GetMapping("/{id}")
    public OrderDto findById(@PathVariable Long id) {
        // String to Long conversion automatic — no Number() call needed
        return orderService.findById(id);
    }

    // POST /api/v1/orders
    @PostMapping
    public ResponseEntity<OrderDto> place(@RequestBody PlaceOrderRequest req) {
        var order = orderService.place(req);
        return ResponseEntity.created(URI.create("/api/v1/orders/" + order.id())).body(order);
    }
}
```

### Comparison Table

| Express / TypeScript | Spring Boot |
| --- | --- |
| `express.Router()` | `@RestController` class |
| `router.get('/x', fn)` | `@GetMapping("/x")` method |
| `app.use('/api/v1', router)` | `@RequestMapping("/api/v1/orders")` class level |
| `req.params.id` (string) | `@PathVariable Long id` (auto-converted) |
| `req.query.status` | `@RequestParam String status` |
| `req.body` | `@RequestBody OrderRequest req` |
| `res.json(x)` | `return x;` (Jackson automatically serialize) |
| `res.status(201).json(x)` | `ResponseEntity.status(201).body(x)` |
| `res.status(204).send()` | `@ResponseStatus(HttpStatus.NO_CONTENT)` + `void` |
| Manual `Number(req.params.id)` | Type casting automatic (`String` → `Long`) |
| `body-parser` middleware | Built-in — `spring-boot-starter-web` mein hai |
| `new UserService()` | Constructor-injected singleton bean |
| Async/await | Synchronous (Reactive ke liye WebFlux use karo) |

---

## Singleton Controllers — Ek Important Concept

> [!warning] Field mein per-request state mat rakhna
> Controllers Spring mein **singletons** hote hain — ek hi instance poori application ke liye. Iska matlab hai ek hi controller object hazaro concurrent requests handle karta hai.

Yeh galat hai:

```java
@RestController
@RequestMapping("/api/v1/cart")
public class CartController {

    // GALAT! Yeh field sab requests ke beech share hoga
    private User currentUser;  // Concurrent requests ise overwrite karenge — race condition!
    private List<CartItem> tempItems = new ArrayList<>();  // Ek user ka data doosre ko dikhega

    @GetMapping
    public CartDto getCart() {
        // currentUser kisi aur request ka ho sakta hai!
        return cartService.getCart(currentUser.id());
    }
}
```

Yeh sahi hai:

```java
@RestController
@RequestMapping("/api/v1/cart")
public class CartController {

    private final CartService cartService;
    private final AuthService authService;

    // Yeh beans inject hain — thread-safe hain (agar properly written hain)
    public CartController(CartService cartService, AuthService authService) {
        this.cartService = cartService;
        this.authService = authService;
    }

    @GetMapping
    public CartDto getCart(@RequestHeader("Authorization") String token) {
        // Method-local variable — har request ka apna scope hai
        Long userId = authService.extractUserId(token);
        return cartService.getCart(userId);
    }
}
```

Express mein yeh problem nahi hoti kyunki wahan usually per-request closures mein kaam karte ho. Spring mein consciously dhyan rakhna padta hai.

---

## ResponseEntity — Response Ko Control Karo

Jab sirf `return data;` nahi karna, specific status codes aur headers set karne hain, toh `ResponseEntity` use karo:

```java
@GetMapping("/{id}")
public ResponseEntity<OrderDto> getOrder(@PathVariable Long id) {
    Optional<OrderDto> order = orderService.findByIdOptional(id);

    if (order.isEmpty()) {
        // 404 Not Found — body nahi bhejni
        return ResponseEntity.notFound().build();
    }

    // 200 OK with body
    return ResponseEntity.ok(order.get());
}

@PostMapping
public ResponseEntity<OrderDto> createOrder(@RequestBody @Valid PlaceOrderRequest req) {
    OrderDto created = orderService.place(req);

    // 201 Created + Location header + body — yeh REST best practice hai
    return ResponseEntity
            .created(URI.create("/api/v1/orders/" + created.id()))
            .header("X-Order-Id", created.id().toString())  // custom header
            .body(created);
}

@GetMapping("/export")
public ResponseEntity<byte[]> exportOrders() {
    byte[] csvData = orderService.exportToCsv();

    // PDF/CSV jaisi binary response
    return ResponseEntity.ok()
            .contentType(MediaType.TEXT_CSV)
            .header("Content-Disposition", "attachment; filename=orders.csv")
            .body(csvData);
}
```

---

## Common Gotchas — Beginners Yahan Gadbad Karte Hain

> [!warning] `@Controller` vs `@RestController`
> `@Controller` view name return karta hai, `@RestController` JSON. Agar REST API ke liye `@Controller` use kiya aur `User` object return kiya, Spring `"User"` naam ka Thymeleaf template dhundhega — **500 error** aayega. Hamesha `@RestController` use karo REST APIs ke liye.

> [!warning] Singleton mein state mat rakhna
> Controller ek hi instance hai saari application ka. Field mein per-request data rakhoge toh concurrent users ka data mix ho jaayega. Method-local variables ya request-scoped beans use karo.

> [!warning] Ambiguous Mapping
> Ek class mein do `@GetMapping("/orders")` methods nahi ho sakte. Startup pe error aayega:
> ```
> Caused by: java.lang.IllegalStateException: Ambiguous mapping
> ```
> `params`, `headers`, `consumes`, ya `produces` se differentiate karo, ya alag paths use karo.

> [!warning] @PathVariable name mismatch
> ```java
> // URL mein `id` hai...
> @GetMapping("/{id}")
> // ...lekin parameter ka naam `orderId` hai — Spring 6 mein yeh compile-time info
> // nahi milta, runtime mein error aa sakta hai
> public OrderDto get(@PathVariable Long orderId) { ... }
>
> // Fix: explicitly naam specify karo
> public OrderDto get(@PathVariable("id") Long orderId) { ... }
> ```

> [!tip] Spring Boot 3 mein suffix pattern matching off hai
> `/orders.json` ab `/orders` pe route nahi hoga. Yeh achha hai — explicit URLs better hain. Agar kisi purane codebase se aa rahe ho jahan yeh feature tha, yeh dhyan rakho.

> [!tip] @RequestBody required hota hai by default
> `@RequestBody` se mark kiya aur body nahi bheji? 400 Bad Request aayega. Optional body ke liye:
> ```java
> @PostMapping
> public OrderDto create(@RequestBody(required = false) PlaceOrderRequest req) {
>     // req null ho sakta hai
> }
> ```

> [!info] Type Conversion Automatic Hai
> `@PathVariable Long id` — URL mein string hai `"42"`, Spring automatically `Long` mein convert karta hai. Agar invalid value hai (e.g., `"abc"`), Spring 400 Bad Request return karta hai automatically. Express mein yeh `Number(req.params.id)` manually karna padta tha aur `NaN` handle karna padta tha.

---

## Multiple Controllers — Kaise Organize Karo?

Real projects mein ek hi controller nahi hota. Swiggy ke API mein hoga:

```
com.swiggy.api/
  order/
    OrderController.java        → /api/v1/orders
  restaurant/
    RestaurantController.java   → /api/v1/restaurants
  user/
    UserController.java         → /api/v1/users
  payment/
    PaymentController.java      → /api/v1/payments
  delivery/
    DeliveryController.java     → /api/v1/delivery
```

Har controller apne domain ka responsible. Spring sabko automatically scan karta hai — koi registration nahi karni.

> [!tip] Package by Feature
> Package by layer (`controller/`, `service/`, `repository/`) se behtar hai package by feature (`order/`, `restaurant/`). Isse related code ek jagah hota hai aur modular hota hai.

---

## Key Takeaways

- **`@RestController`** = `@Controller` + `@ResponseBody` — return values automatically JSON mein convert hote hain via Jackson
- **`@RequestMapping`** class pe base path define karta hai; `@GetMapping`, `@PostMapping` etc. method-level shortcuts hain
- **`@PathVariable`** URL segment se value leta hai, **`@RequestParam`** query string se, **`@RequestBody`** request body se
- **Constructor injection** use karo — field injection se behtar hai (testability, immutability)
- **Controllers singletons hain** — kabhi bhi per-request state fields mein mat rakhna; method-local variables use karo
- **`ResponseEntity<T>`** return karo jab status code, headers, ya conditional response control karna ho; warna sirf `T` return karo
- **`@Valid`** lagao `@RequestBody` ke saath validation ke liye — invalid request pe automatically 400 aayega
- **Ek dependency** (`spring-boot-starter-web`) se sab milta hai: Tomcat, Jackson, Spring MVC, DispatcherServlet
- Express ke unlike, **koi manual route registration nahi** — component scanning automatically `@RestController` classes dhundhta hai
- **Type conversion automatic** hai — URL string `"42"` ko `Long id` mein Spring khud convert karta hai
