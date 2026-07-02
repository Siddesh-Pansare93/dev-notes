# Request Mapping aur Path Variables — HTTP Request ka Data Kaise Pakdo

Socho Zomato ka backend. Koi user apna order status check karna chahta hai — URL kuch aisa hoga:

```
GET /api/v1/orders/42
```

Us `42` ko URL se nikaalna, usse `Long` mein convert karna, aur phir orderService ko dena — yeh sab kaam tumhara hai. Express mein tum likhte the `Number(req.params.orderId)`, phir check karte `if (isNaN(...))`, phir 400 return karte agar galat value aayi.

Spring mein? Sirf likhdo:

```java
@GetMapping("/{orderId}")
public OrderDto getOrder(@PathVariable Long orderId) { ... }
```

Bas. Type conversion automatic. Agar `orderId` mein koi string aa gayi jo number nahi hai — Spring khud 400 Bad Request throw kar deta hai. Tumhara kaam sirf business logic likhna hai.

Yahi hai is chapter ka core idea — **declarative binding**. Tum bata do "yeh parameter URL se aayega" ya "yeh query string se aayega", aur Spring sab handle kar leta hai.

---

## Ek Baar Samjho — Data Aata Kahan Kahan Se?

Koi bhi HTTP request mein data kaafi jagahon se aa sakta hai:

| Annotation | Data Kahan Se Aata Hai | Express Wala Tarika |
|---|---|---|
| `@PathVariable` | URL ka ek hissa — `/orders/42` mein `42` | `req.params.orderId` |
| `@RequestParam` | Query string — `?status=PAID&page=0` | `req.query.status` |
| `@RequestBody` | Request ka JSON body | `req.body` (express.json() ke baad) |
| `@RequestHeader` | HTTP header — `X-Tenant-Id`, `Authorization` | `req.headers['x-tenant-id']` |
| `@CookieValue` | Browser cookie | `req.cookies.sessionId` |
| `@ModelAttribute` | HTML form ka data (urlencoded) | `req.body` multer/urlencoded ke saath |
| `@RequestPart` | Multipart form — file upload wali cheezein | `req.files`, `req.body` |

Spring ke andar ek system hota hai — `HandlerMethodArgumentResolver` — jo har method parameter ko inspect karta hai, uski annotation dekhta hai, aur appropriate jagah se value utha ke deta hai. Saath mein type conversion bhi hoti hai `ConversionService` ke through. Tumhe kuch parse nahi karna.

---

## Poora Controller Ek Saath Dekho

Ek proper example — Swiggy jaisi app ka Order Controller:

```java
@RestController
@RequestMapping("/api/v1/orders")  // Saare routes is prefix se shuru honge
public class OrderController {

    private final OrderService orderService;

    // Constructor injection — Spring khud orderService inject karega
    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    // =====================================================================
    // @PathVariable — URL ke segment se value nikaalte hain
    // =====================================================================

    // GET /api/v1/orders/42
    // URL mein "42" hai — Spring isko Long mein convert karega
    @GetMapping("/{orderId}")
    public OrderDto getOrder(@PathVariable Long orderId) {
        return orderService.findById(orderId);
    }

    // GET /api/v1/orders/42/items/9
    // Do path variables ek saath — orderId aur itemId dono
    @GetMapping("/{orderId}/items/{itemId}")
    public OrderItemDto getItem(
            @PathVariable Long orderId,
            @PathVariable Long itemId) {
        return orderService.findItem(orderId, itemId);
    }

    // =====================================================================
    // @RequestParam — Query string se value nikaalte hain
    // =====================================================================

    // GET /api/v1/orders?status=PAID&page=0&size=20&q=pizza
    // Sab optional hai — required=false ya defaultValue diya hai
    @GetMapping
    public Page<OrderDto> list(
            @RequestParam(required = false) OrderStatus status,        // ?status=PAID
            @RequestParam(defaultValue = "0") int page,                 // ?page=0
            @RequestParam(defaultValue = "20") int size,                // ?size=20
            @RequestParam(name = "q", required = false) String query    // ?q=pizza
    ) {
        return orderService.search(status, query, PageRequest.of(page, size));
    }

    // =====================================================================
    // @RequestBody — JSON body se object banana
    // =====================================================================

    // POST /api/v1/orders
    // Body: { "customerId": 1, "items": [...] }
    // Jackson JSON ko CreateOrderRequest object mein convert karega
    // @Valid se validation bhi chalegi (Bean Validation)
    @PostMapping
    public OrderDto create(@RequestBody @Valid CreateOrderRequest req) {
        return orderService.create(req);
    }

    // =====================================================================
    // @RequestHeader — HTTP header se value nikaalte hain
    // =====================================================================

    // Tenant-based architecture mein common pattern hai yeh
    // X-Tenant-Id required hai — agar nahi aaya toh 400
    // User-Agent optional rakha hai
    @GetMapping("/me")
    public OrderDto myLatest(
            @RequestHeader("X-Tenant-Id") String tenantId,
            @RequestHeader(value = "User-Agent", required = false) String ua) {
        return orderService.latestForTenant(tenantId);
    }

    // =====================================================================
    // Saare query params ek Map mein — rare use case
    // =====================================================================

    // GET /api/v1/orders/dump?foo=bar&x=y
    // Mostly debugging ke liye — production mein avoid karo
    @GetMapping("/dump")
    public Map<String, String> dumpParams(@RequestParam Map<String, String> all) {
        return all;
    }

    // =====================================================================
    // Direct POJO binding — bina @RequestParam ke
    // =====================================================================

    // GET /api/v1/orders/search?status=PAID&from=2024-01-01
    // OrderSearchCriteria ke fields query params se directly bind ho jaate hain
    @GetMapping("/search")
    public List<OrderDto> search(OrderSearchCriteria criteria) {
        // criteria.getStatus() = "PAID"
        // criteria.getFrom() = parsed LocalDate
        return orderService.search(criteria);
    }
}
```

---

## @PathVariable — Deep Dive

### Simple Case

```java
// GET /products/123
@GetMapping("/{productId}")
public ProductDto getProduct(@PathVariable Long productId) {
    // Spring ne "123" ko Long mein convert kar diya
    return productService.findById(productId);
}
```

### Name Mismatch — Ek Common Gotcha

```java
// Yeh kaam NAHI karega — variable name alag hai
@GetMapping("/{userId}")
public UserDto getUser(@PathVariable Long id) {  // "id" != "userId"
    // ...
}

// Sahi tarika — explicitly bolo kaunsa segment chahiye
@GetMapping("/{userId}")
public UserDto getUser(@PathVariable("userId") Long id) {
    // ...
}
```

> [!warning] Spring Boot Maven plugin `-parameters` flag enable karta hai by default, isliye mostly naam match hone se kaam ho jaata hai. Lekin agar koi custom build setup hai toh explicitly naam dena safe hai.

### Optional Path Variable

```java
// Do routes ek saath handle karo
// GET /items       — list sab
// GET /items/42    — ek specific item
@GetMapping({"/items", "/items/{id}"})
public Object items(@PathVariable(required = false) Long id) {
    if (id == null) {
        return itemService.findAll();
    }
    return itemService.findById(id);
}
```

> [!tip] Yeh pattern thoda confusing lagta hai. Better hai do alag methods likhna — ek list ke liye, ek single item ke liye. Code readable rehta hai.

### Regex se Path Variable Validate Karo

```java
// Sirf numeric IDs accept karo — letters aa gaye toh 404
@GetMapping("/users/{id:\\d+}")
public UserDto byId(@PathVariable Long id) {
    return userService.findById(id);
}

// File name mein dots allow karo — default mein Spring dots ke baad truncate karta hai
// GET /files/profile.png — bina `.+` ke sirf "profile" milega
@GetMapping("/files/{name:.+}")
public FileDto file(@PathVariable String name) {
    // name = "profile.png" — poora naam milega
    return fileService.findByName(name);
}
```

---

## @RequestParam — Sab Options

### Required vs Optional

```java
// required = true by default
// Agar ?page nahi aaya toh MissingServletRequestParameterException — 400 Bad Request
@GetMapping("/products")
public List<ProductDto> list(@RequestParam int page) { ... }

// Optional — value na aaye toh null milega
@GetMapping("/products")
public List<ProductDto> list(@RequestParam(required = false) Integer page) { ... }

// Default value — na aaye toh "0" use hoga
@GetMapping("/products")
public List<ProductDto> list(@RequestParam(defaultValue = "0") int page) { ... }
```

### List of Values

```java
// GET /products?tags=electronics&tags=mobile
// Multiple values ek hi param mein — List mein aa jaayenge
@GetMapping("/products")
public List<ProductDto> byTags(@RequestParam List<String> tags) {
    return productService.findByTags(tags);
}
```

### Direct POJO Binding (bina @RequestParam ke)

```java
// Yeh class banao
public class ProductSearchCriteria {
    private String name;
    private String category;
    private Double minPrice;
    private Double maxPrice;
    // getters and setters
}

// Controller mein directly use karo
// GET /products/search?name=iPhone&category=electronics&minPrice=50000
@GetMapping("/search")
public List<ProductDto> search(ProductSearchCriteria criteria) {
    // Spring ne query params ko criteria ke fields mein bind kar diya
    return productService.search(criteria);
}
```

Yeh pattern bahut clean lagta hai jab 4-5 se zyada filters ho. Node.js mein tum likhte `const { name, category, minPrice } = req.query` — yahan Spring khud karta hai.

---

## @RequestBody — JSON Body ka Kaam

```java
// Request body ka DTO
// Java 17+ record use karo — concise aur immutable
public record CreateOrderRequest(
    Long customerId,
    String deliveryAddress,
    List<OrderItemRequest> items
) {}

public record OrderItemRequest(
    Long productId,
    int quantity
) {}

// Controller
// POST /api/v1/orders
// Body: { "customerId": 1, "deliveryAddress": "Mumbai", "items": [...] }
@PostMapping
@ResponseStatus(HttpStatus.CREATED)  // 201 return karega
public OrderDto create(@RequestBody @Valid CreateOrderRequest req) {
    return orderService.create(req);
}
```

> [!info] `@RequestBody` aur `@RequestParam` ek saath ek hi endpoint pe use nahi karte. JSON body alag hoti hai, form fields alag hote hain. Ek choose karo.

---

## @RequestHeader — Headers Kaise Padte Hain

```java
// Authorization header se JWT token nikaalte hain
// (Normally yeh Security filter mein hota hai, but example ke liye)
@GetMapping("/profile")
public UserDto myProfile(
        @RequestHeader("Authorization") String authHeader,
        @RequestHeader(value = "X-Request-ID", required = false) String requestId) {
    // authHeader = "Bearer eyJhbGci..."
    String token = authHeader.replace("Bearer ", "");
    return userService.findByToken(token);
}

// Saare headers ek Map mein
@GetMapping("/debug/headers")
public Map<String, String> allHeaders(@RequestHeader Map<String, String> headers) {
    return headers;
}
```

---

## Custom Enum Binding — Ek Real Surprise

Zomato pe order status filter karo — `?status=PAID`. By default Spring uppercase string expect karta hai — `PAID` kaam karega, `paid` nahi.

Agar lowercase bhi support karna hai:

```java
// Enum define karo
public enum OrderStatus {
    PENDING, PAID, SHIPPED, DELIVERED, CANCELLED
}
```

By default `?status=PAID` — works.
By default `?status=paid` — **fails with 400**.

Isko fix karo ek Converter register karke:

```java
@Component
public class StringToOrderStatusConverter implements Converter<String, OrderStatus> {
    @Override
    public OrderStatus convert(String source) {
        try {
            // lowercase, UPPERCASE, dono accept karo
            return OrderStatus.valueOf(source.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException(
                "Invalid order status: " + source +
                ". Valid values: " + Arrays.toString(OrderStatus.values())
            );
        }
    }
}
```

Spring is Converter ko automatically detect kar leta hai kyunki `@Component` lagaya hai. Ab `?status=paid` bhi `?status=PAID` jaisa kaam karega.

---

## Node.js/Express se Compare Karo

Express mein tum manually sab kuch karte ho:

```typescript
// Express — manual parsing, manual validation
router.get('/orders/:orderId/items/:itemId', (req, res) => {
    const orderId = Number(req.params.orderId);  // manual convert
    const itemId  = Number(req.params.itemId);   // manual convert

    if (isNaN(orderId) || isNaN(itemId)) {       // manual validation
        return res.status(400).json({ error: 'Invalid ID' });
    }

    const status = req.query.status as string | undefined;  // manual extract
    const page   = Number(req.query.page ?? 0);             // manual convert

    // ...
});
```

Spring mein yeh sab automatically hota hai:

```java
// Spring — declarative, sab automatic
@GetMapping("/{orderId}/items/{itemId}")
public OrderItemDto getItem(
        @PathVariable Long orderId,    // auto convert, auto validate
        @PathVariable Long itemId,     // agar string aaye — 400 auto
        @RequestParam(required = false) OrderStatus status,  // enum conversion auto
        @RequestParam(defaultValue = "0") int page) {        // default auto
    // ...
}
```

Express mein Zod use karte ho validation ke liye. Spring mein `@Valid` + Bean Validation annotations use hote hain (`@NotNull`, `@Min`, `@Max`, etc.) — yeh अगले chapter mein cover hoga.

---

## Gotchas — Jo Galtiyan Beginners Karte Hain

> [!warning] Trailing Slash — Boot 3 mein Breaking Change
> Spring Boot 3 mein `/orders` aur `/orders/` **alag routes** hain. Boot 2 mein dono same the. Agar tumhara frontend `/orders/` call kar raha hai aur backend pe sirf `/orders` mapped hai — **404 milega**. Ya toh frontend fix karo, ya dono routes map karo.

> [!warning] @RequestParam Default mein Required Hai
> Yeh bahut common mistake hai. Agar `@RequestParam int page` likha aur request mein `?page` nahi aaya — **400 Bad Request** milega, `0` nahi milega. Hamesha `required = false` ya `defaultValue` use karo optional params ke liye.

> [!warning] @RequestBody aur @ModelAttribute Ek Saath Mat Lagao
> `@RequestBody` JSON body padhta hai. `@ModelAttribute` form fields padhta hai. Ek endpoint pe dono nahi lagta. Decide karo — JSON API bana rahe ho ya HTML form handle kar rahe ho.

> [!warning] Path Variable Name Match Karo
> `@GetMapping("/{userId}")` mein variable `userId` hai. Agar method parameter pe `@PathVariable Long id` likha bina `@PathVariable("userId")` ke — Spring startup pe error de sakta hai (depending on compilation settings). Safe rehne ke liye explicitly naam likho: `@PathVariable("userId") Long id`.

> [!warning] File Extensions aur Dots in Path Variables
> By default Spring path variable mein trailing dot ke baad sab kuch truncate karta hai. `/files/photo.png` se `name` = `photo` milega, `photo.png` nahi. Isko fix karte hain `{name:.+}` se — `.+` regex dots ko bhi allow karta hai.

> [!tip] Request DTO ke liye Java Records Use Karo
> Java 17+ `record` perfect hai `@RequestBody` ke liye. Concise, immutable, automatically getters/equals/toString. Alag class likhne ki zarurat nahi:
> ```java
> public record CreateOrderRequest(Long customerId, List<ItemReq> items) {}
> ```

> [!tip] Controller Methods Ko Thin Rakhna
> Controller ka kaam sirf data extract karna aur service call karna hai. Business logic controller mein mat daalo. `@PathVariable Long id` liya, `orderService.findById(id)` call kiya, return kar diya — bas yahi.

---

## Ek Real-World Scenario — Swiggy Order API

Socho Swiggy ka order flow:

```java
@RestController
@RequestMapping("/api/v2/orders")
public class SwiggyOrderController {

    // Kisi restaurant ke orders list karo
    // GET /api/v2/orders?restaurantId=101&status=PREPARING&page=0&size=10
    @GetMapping
    public Page<OrderSummaryDto> listOrders(
            @RequestParam Long restaurantId,
            @RequestParam(required = false) OrderStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return orderService.findByRestaurant(restaurantId, status, PageRequest.of(page, size));
    }

    // Specific order ka detail
    // GET /api/v2/orders/ORD-2024-789456
    @GetMapping("/{orderId}")
    public OrderDetailDto getOrder(@PathVariable String orderId) {
        return orderService.findByOrderId(orderId);
    }

    // Order ka specific item check karo — refund/replacement ke liye
    // GET /api/v2/orders/ORD-2024-789456/items/3
    @GetMapping("/{orderId}/items/{itemIndex}")
    public OrderItemDto getOrderItem(
            @PathVariable String orderId,
            @PathVariable int itemIndex) {
        return orderService.findItem(orderId, itemIndex);
    }

    // Naya order place karo
    // POST /api/v2/orders
    // Header: X-User-Id: 12345, X-Delivery-Zone: MUM-ANDHERI
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OrderConfirmationDto placeOrder(
            @RequestBody @Valid PlaceOrderRequest request,
            @RequestHeader("X-User-Id") Long userId,
            @RequestHeader("X-Delivery-Zone") String deliveryZone) {
        return orderService.place(request, userId, deliveryZone);
    }

    // Order cancel karo — body mein reason dena hoga
    // PATCH /api/v2/orders/ORD-2024-789456/cancel
    @PatchMapping("/{orderId}/cancel")
    public OrderStatusDto cancelOrder(
            @PathVariable String orderId,
            @RequestBody @Valid CancelOrderRequest request) {
        return orderService.cancel(orderId, request.reason());
    }
}
```

Yeh dekho — controller clean hai, concise hai. Koi manual parsing nahi, koi null checks nahi, koi type conversion nahi. Sab annotations handle kar rahi hain.

---

## Key Takeaways

- **`@PathVariable`** URL segment se value nikaalti hai — `/{id}` mein `id` ko. Spring automatically String se Long/Integer/etc. convert karta hai.
- **`@RequestParam`** query string se value nikaalti hai — default mein **required** hoti hai, optional ke liye `required = false` ya `defaultValue` chahiye.
- **`@RequestBody`** JSON request body ko Java object mein convert karta hai — Jackson use hoti hai internally.
- **`@RequestHeader`** HTTP header se value nikaalti hai — `required = false` optional headers ke liye.
- Type conversion automatic hai — `"42"` ko `Long 42` mein Spring khud convert karta hai, galat value pe auto 400.
- Path variable name aur method parameter name **same hona chahiye**, ya explicitly `@PathVariable("name")` likho.
- Trailing slash Boot 3 mein matter karta hai — `/orders` != `/orders/`.
- Enum binding case-sensitive hai by default — `Converter` register karo lowercase support ke liye.
- Node.js mein jo `req.params`, `req.query`, `req.body` manually parse karte the — woh sab Spring annotations ne replace kar diya, cleanly aur type-safely.
