# Exception Handling

Socho ek second ke liye — tum Zomato ke backend pe ho. Ek user ne order place kiya, lekin restaurant already closed hai. Ya phir user ne ek invalid restaurant ID bheja jo exist hi nahi karta. Ya DB down hai. Kya karoge? "500 Internal Server Error" de ke chhod doge? Ya ek proper, meaningful error response doge jo frontend ko actually bataye kya galat hua?

Yahi hai Exception Handling ka kaam. Aur agar tumne yeh sahi se implement nahi kiya, toh:
- Frontend wale dark mein reh jaate hain — kya hua, kaise fix karein, kuch pata nahi
- Users frustrated ho jaate hain
- Debug karna nightmare ban jaata hai
- Worst case — stack traces leak ho jaate hain jo security vulnerability create karte hain

Node.js/Express mein tumhare paas `(err, req, res, next) => {}` wala error middleware hota tha. Ek jagah pe sab errors handle karo. Spring Boot mein same concept hai — lekin zyada powerful, type-safe, aur RFC 7807 standard ke saath. Naam hai: `@ControllerAdvice`.

---

## Problem: Bina Exception Handling ke kya hota hai?

Agar tum Spring Boot mein kuch throw karte ho aur catch nahi karte, toh Spring apna default error response deta hai. Kuch aisa:

```json
{
  "timestamp": "2024-01-15T10:30:00.000+00:00",
  "status": 500,
  "error": "Internal Server Error",
  "path": "/api/users/999"
}
```

Yeh bahut hi useless hai. Frontend developer ko pata hi nahi chala kya hua — user not found? DB error? Validation failed? Sab ek hi generic 500 mein dab gaya.

Proper exception handling ke baad same error kuch aisa dikhna chahiye:

```json
{
  "type": "https://api.zomato.com/errors/not-found",
  "title": "Resource Not Found",
  "status": 404,
  "detail": "Restaurant with ID 999 does not exist",
  "instance": "/api/restaurants/999"
}
```

Ab frontend wale exactly jaante hain kya hua, aur appropriate message user ko dikhaa sakte hain.

---

## Spring Boot Ka Exception Handling Architecture

Teen layers hain, preference order mein:

### Layer 1: `@ExceptionHandler` — Sirf Ek Controller Ke Liye

Agar tumhe kisi specific controller ke liye exception handle karni hai, toh directly usi class mein method likh do:

```java
@RestController
@RequestMapping("/api/restaurants")
public class RestaurantController {

    @GetMapping("/{id}")
    public RestaurantResponse getById(@PathVariable Long id) {
        // yeh throw karega agar restaurant nahi mila
        return restaurantService.findById(id);
    }

    // Sirf is controller ke liye kaam karega
    @ExceptionHandler(ResourceNotFoundException.class)
    public ProblemDetail handleNotFound(ResourceNotFoundException ex) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
    }
}
```

> [!warning] Yeh approach avoid karo
> Agar har controller mein alag-alag exception handlers likhe, toh code duplicate hoga. Prefer `@ControllerAdvice` for global handling.

### Layer 2: `@ControllerAdvice` / `@RestControllerAdvice` — Global Handler

Yeh Express ke `app.use(errorMiddleware)` ke jaisa hai — ek jagah, sab controllers ke liye. Yahi tumhara primary approach hona chahiye.

- `@ControllerAdvice` — returns `ModelAndView` (for server-side rendered apps)
- `@RestControllerAdvice` — `@ControllerAdvice + @ResponseBody` — returns JSON directly (REST APIs ke liye yahi use karo)

### Layer 3: `ResponseEntityExceptionHandler` — Spring's Built-in Exceptions

Spring khud bhi bahut saari exceptions throw karta hai — `MethodArgumentNotValidException` (validation fail), `HttpMessageNotReadableException` (invalid JSON), etc. `ResponseEntityExceptionHandler` ek base class hai jo inhe already handle karta hai. Isse extend karo aur override karo jo customize karna hai.

---

## RFC 7807 — ProblemDetail: Standard Error Format

RFC 7807 ek web standard hai jo define karta hai ki API error responses kaisi dikhni chahiye. Spring 6+ isme `ProblemDetail` class provide karta hai.

Structure kuch aisa hai:

```json
{
  "type": "https://api.example.com/errors/not-found",
  "title": "Not Found",
  "status": 404,
  "detail": "User 42 not found",
  "instance": "/api/v1/users/42"
}
```

- **`type`** — Error ka URI — documentation link bhi ho sakta hai
- **`title`** — Short, human-readable error name (ek baar define karo, baar baar same)
- **`status`** — HTTP status code
- **`detail`** — Is specific request ke liye kya hua — user-readable message
- **`instance`** — Exact endpoint jo fail hua

Zomato analogy: `title` = "Order Failed", `detail` = "Restaurant ID 999 is currently closed and not accepting orders", `instance` = `/api/orders` (jahan request gayi thi).

---

## Custom Exceptions Define Karo

Pehle meaningful exception classes banao. Generic `RuntimeException` throw karna bahut bura practice hai:

```java
// User, Restaurant, Order — koi bhi resource nahi mila toh yeh throw karo
public class ResourceNotFoundException extends RuntimeException {

    // resource = "User", "Restaurant", "Order", etc.
    // id = jo ID search ki thi
    public ResourceNotFoundException(String resource, Object id) {
        super("%s with ID %s does not exist".formatted(resource, id));
    }

    // Alternative: custom message ke saath
    public ResourceNotFoundException(String message) {
        super(message);
    }
}
```

```java
// Duplicate data — jaise same phone number se do accounts banana
public class ConflictException extends RuntimeException {
    public ConflictException(String message) {
        super(message);
    }
}
```

```java
// Jab user ke paas permission nahi hai
public class ForbiddenException extends RuntimeException {
    public ForbiddenException(String message) {
        super(message);
    }
}
```

```java
// Business rule violation — jaise closed restaurant pe order karna
public class BusinessRuleException extends RuntimeException {
    private final String errorCode;

    public BusinessRuleException(String errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }

    public String getErrorCode() {
        return errorCode;
    }
}
```

> [!tip] Typed exceptions kyun?
> `throw new ResourceNotFoundException("Restaurant", 999)` padhne mein bahut clear hai vs `throw new RuntimeException("not found")`. Aur type-specific handlers likh sakte ho — har exception type ke liye alag response.

---

## Global Exception Handler — Complete Implementation

```java
@RestControllerAdvice  // @ControllerAdvice + @ResponseBody = JSON responses
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    // Logging ke liye — stack trace kabhi client ko mat bhejo, sirf log karo
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    // ----------------------------------------------------------------
    // 404 Not Found — Resource nahi mila
    // ----------------------------------------------------------------
    @ExceptionHandler(ResourceNotFoundException.class)
    public ProblemDetail handleNotFound(ResourceNotFoundException ex,
                                        HttpServletRequest req) {
        log.debug("Resource not found: {}", ex.getMessage());

        ProblemDetail pd = ProblemDetail.forStatusAndDetail(
                HttpStatus.NOT_FOUND, ex.getMessage());

        pd.setTitle("Resource Not Found");
        // Documentation link — ek proper REST API mein yeh page actually exist karna chahiye
        pd.setType(URI.create("https://api.yourapp.com/errors/not-found"));
        // Kaunsa endpoint pe request aayi thi
        pd.setInstance(URI.create(req.getRequestURI()));

        return pd;
    }

    // ----------------------------------------------------------------
    // 409 Conflict — Duplicate data ya conflicting state
    // ----------------------------------------------------------------
    @ExceptionHandler(ConflictException.class)
    public ProblemDetail handleConflict(ConflictException ex,
                                        HttpServletRequest req) {
        log.debug("Conflict: {}", ex.getMessage());

        ProblemDetail pd = ProblemDetail.forStatusAndDetail(
                HttpStatus.CONFLICT, ex.getMessage());

        pd.setTitle("Conflict");
        pd.setType(URI.create("https://api.yourapp.com/errors/conflict"));
        pd.setInstance(URI.create(req.getRequestURI()));

        return pd;
    }

    // ----------------------------------------------------------------
    // 403 Forbidden — Permission nahi hai
    // ----------------------------------------------------------------
    @ExceptionHandler(ForbiddenException.class)
    public ProblemDetail handleForbidden(ForbiddenException ex,
                                         HttpServletRequest req) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(
                HttpStatus.FORBIDDEN, ex.getMessage());

        pd.setTitle("Access Denied");
        pd.setInstance(URI.create(req.getRequestURI()));

        return pd;
    }

    // ----------------------------------------------------------------
    // 422 Unprocessable Entity — Business rule violation
    // Zomato example: order place kiya, restaurant closed hai
    // ----------------------------------------------------------------
    @ExceptionHandler(BusinessRuleException.class)
    public ProblemDetail handleBusinessRule(BusinessRuleException ex,
                                             HttpServletRequest req) {
        log.debug("Business rule violation [{}]: {}", ex.getErrorCode(), ex.getMessage());

        ProblemDetail pd = ProblemDetail.forStatusAndDetail(
                HttpStatus.UNPROCESSABLE_ENTITY, ex.getMessage());

        pd.setTitle("Business Rule Violation");
        // Custom property add kar sakte ho ProblemDetail mein
        pd.setProperty("errorCode", ex.getErrorCode());
        pd.setInstance(URI.create(req.getRequestURI()));

        return pd;
    }

    // ----------------------------------------------------------------
    // 400 Bad Request — Validation fail (Bean Validation: @NotNull, @Size, etc.)
    // ResponseEntityExceptionHandler ko override karna padega
    // ----------------------------------------------------------------
    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(
            MethodArgumentNotValidException ex,
            HttpHeaders headers,
            HttpStatusCode status,
            WebRequest request) {

        // Saare validation errors collect karo
        List<Map<String, String>> fieldErrors = ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .map(fe -> Map.of(
                        "field", fe.getField(),
                        "rejectedValue", Objects.toString(fe.getRejectedValue(), "null"),
                        "message", Objects.toString(fe.getDefaultMessage(), "Validation failed")
                ))
                .toList();

        ProblemDetail pd = ProblemDetail.forStatus(HttpStatus.BAD_REQUEST);
        pd.setTitle("Validation Failed");
        pd.setDetail("Request contains invalid fields");
        // Custom property — saare errors ek list mein
        pd.setProperty("errors", fieldErrors);

        return ResponseEntity.badRequest().body(pd);
    }

    // ----------------------------------------------------------------
    // 400 Bad Request — Invalid JSON body
    // Jaise koi invalid JSON bhej de body mein
    // ----------------------------------------------------------------
    @Override
    protected ResponseEntity<Object> handleHttpMessageNotReadable(
            HttpMessageNotReadableException ex,
            HttpHeaders headers,
            HttpStatusCode status,
            WebRequest request) {

        ProblemDetail pd = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST,
                "Request body is malformed or cannot be read");
        pd.setTitle("Invalid Request Body");

        return ResponseEntity.badRequest().body(pd);
    }

    // ----------------------------------------------------------------
    // 409 Conflict — DB unique constraint violation
    // Jaise same email se do users banana
    // ----------------------------------------------------------------
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ProblemDetail handleDataIntegrity(DataIntegrityViolationException ex,
                                              HttpServletRequest req) {
        // DB error internally log karo — client ko mat batao raw DB error
        log.warn("DB integrity violation on {}: {}", req.getRequestURI(), ex.getMessage());

        ProblemDetail pd = ProblemDetail.forStatusAndDetail(
                HttpStatus.CONFLICT,
                "This operation violates a data integrity constraint");
        pd.setTitle("Data Conflict");
        pd.setInstance(URI.create(req.getRequestURI()));

        return pd;
    }

    // ----------------------------------------------------------------
    // 500 Internal Server Error — Catch-all, last resort
    // Jo koi bhi exception upar handle nahi hui, woh yahan aayegi
    // ----------------------------------------------------------------
    @ExceptionHandler(Exception.class)
    public ProblemDetail handleAny(Exception ex, HttpServletRequest req) {
        // Yahan ZAROOR log karo — production debugging ke liye zaroori hai
        log.error("Unhandled exception on {}", req.getRequestURI(), ex);

        ProblemDetail pd = ProblemDetail.forStatusAndDetail(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "An unexpected error occurred. Please try again later.");
        pd.setTitle("Internal Server Error");
        // Stack trace KABHI client ko mat bhejo — security risk hai
        pd.setInstance(URI.create(req.getRequestURI()));

        return pd;
    }
}
```

---

## Service Layer Se Exception Throw Karna

Service layer mein exceptions throw karo — controller mein nahi. Controller ka kaam sirf request/response handle karna hai:

```java
@Service
@Transactional
public class RestaurantService {

    private final RestaurantRepository restaurantRepo;
    private final OrderRepository orderRepo;

    // Constructor injection
    public RestaurantService(RestaurantRepository restaurantRepo,
                              OrderRepository orderRepo) {
        this.restaurantRepo = restaurantRepo;
        this.orderRepo = orderRepo;
    }

    // Restaurant dhundo — nahi mila toh 404
    public RestaurantResponse findById(Long id) {
        return restaurantRepo.findById(id)
                .map(this::toResponse)
                // orElseThrow — Optional se exception nikalna ka idiomatic tarika
                .orElseThrow(() -> new ResourceNotFoundException("Restaurant", id));
    }

    // Order place karo — business rules check karo
    public OrderResponse placeOrder(Long restaurantId, OrderRequest request) {
        Restaurant restaurant = restaurantRepo.findById(restaurantId)
                .orElseThrow(() -> new ResourceNotFoundException("Restaurant", restaurantId));

        // Business rule: restaurant open hona chahiye
        if (!restaurant.isOpen()) {
            throw new BusinessRuleException(
                    "RESTAURANT_CLOSED",
                    "Restaurant '%s' is currently closed".formatted(restaurant.getName())
            );
        }

        // Business rule: minimum order amount
        if (request.getTotalAmount().compareTo(restaurant.getMinOrderAmount()) < 0) {
            throw new BusinessRuleException(
                    "BELOW_MIN_ORDER",
                    "Minimum order amount is ₹" + restaurant.getMinOrderAmount()
            );
        }

        // Yahan order create karo...
        Order order = new Order(/* ... */);
        return toResponse(orderRepo.save(order));
    }

    // User already exist karta hai — ConflictException
    public void registerUser(UserRequest request) {
        if (userRepo.existsByEmail(request.getEmail())) {
            throw new ConflictException(
                    "Account with email '%s' already exists".formatted(request.getEmail())
            );
        }
        // ... create user
    }

    private RestaurantResponse toResponse(Restaurant r) {
        // ... mapping logic
        return new RestaurantResponse(r.getId(), r.getName(), r.isOpen());
    }
}
```

---

## `application.yml` Configuration

ProblemDetail globally enable karo — taaki Spring ke built-in exceptions bhi RFC 7807 format mein return hon:

```yaml
spring:
  mvc:
    problemdetails:
      enabled: true   # Spring ke default handlers bhi ProblemDetail return karenge
```

Yeh enable karne ke baad, jab bhi Spring internally exception throw karta hai (jaise `NoHandlerFoundException` for 404 routes), woh bhi standardized ProblemDetail format mein aayega.

---

## Simpler Alternative: `@ResponseStatus` Annotation

Agar tumhe sirf ek specific HTTP status code chahiye aur complex response body nahi, toh exception class pe hi `@ResponseStatus` laga sakte ho:

```java
@ResponseStatus(HttpStatus.NOT_FOUND)  // Automatically 404 return karega
public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String resource, Object id) {
        super("%s with ID %s not found".formatted(resource, id));
    }
}
```

Spring isko automatically catch karega aur 404 response dega. **Lekin** response body generic hogi — ProblemDetail nahi milega, aur custom fields add nahi kar sakte. Sirf trivial cases ke liye theek hai.

> [!info] `@ResponseStatus` vs `@ControllerAdvice`
> `@ResponseStatus` = quick and dirty. `@ControllerAdvice` = production-ready, customizable. Real projects mein `@ControllerAdvice` use karo.

---

## Express/TypeScript se Comparison

Tumhari Express background hai, toh direct comparison dekho:

```typescript
// Express mein custom error class
class NotFoundError extends Error {
  status = 404;
  constructor(msg: string) {
    super(msg);
    this.name = 'NotFoundError';
  }
}

class BusinessRuleError extends Error {
  status = 422;
  errorCode: string;
  constructor(errorCode: string, msg: string) {
    super(msg);
    this.errorCode = errorCode;
  }
}

// Route handler
router.get('/restaurants/:id', async (req, res, next) => {
  try {
    const restaurant = await db.restaurants.findUnique({
      where: { id: parseInt(req.params.id) }
    });

    if (!restaurant) {
      throw new NotFoundError(`Restaurant ${req.params.id} not found`);
    }

    res.json(restaurant);
  } catch (e) {
    next(e); // Error middleware ko pass karo
  }
});

// Global error middleware — app.use ke end mein register karo
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  const status = err.status ?? 500;

  if (status === 500) {
    console.error('Unhandled error:', err);
  }

  res.status(status).json({
    type: 'about:blank',
    title: err.name,
    status,
    detail: err.message,
    instance: req.originalUrl,
    ...(err.errorCode && { errorCode: err.errorCode }),
  });
});
```

Ab same cheez Spring mein:

```java
// Spring mein — koi try/catch nahi, koi next(e) nahi
@GetMapping("/{id}")
public RestaurantResponse getById(@PathVariable Long id) {
    return restaurantService.findById(id); // Throw karega, Spring handle karega
}
```

Spring automatically exceptions catch karta hai aur `@ControllerAdvice` ko route karta hai. No manual `try/catch`, no `next(e)`.

| Express/TypeScript | Spring Boot |
|---|---|
| Error subclass with `status` field | Custom exception + `@ResponseStatus` ya handler |
| `next(err)` se propagation | Throw karo — Spring automatically catch karta hai |
| `(err, req, res, next) => {}` middleware | `@ControllerAdvice` + `@ExceptionHandler` |
| `app.use(errorHandler)` manually register | `@RestControllerAdvice` — auto-register via component scan |
| Manual JSON shape banao | Built-in `ProblemDetail` (RFC 7807) |
| Checked/unchecked distinction nahi | `RuntimeException` (unchecked) vs checked — rollback behavior affect karta hai |

---

## Custom ProblemDetail Properties — Extra Information Add Karna

Kabhi kabhi standard fields se zyada information chahiye. `setProperty()` se custom fields add kar sakte ho:

```java
@ExceptionHandler(ValidationException.class)
public ProblemDetail handleValidation(ValidationException ex) {
    ProblemDetail pd = ProblemDetail.forStatus(HttpStatus.BAD_REQUEST);
    pd.setTitle("Validation Failed");

    // Custom fields — frontend ko zyada context dene ke liye
    pd.setProperty("errorCode", ex.getErrorCode());
    pd.setProperty("fieldName", ex.getFieldName());
    pd.setProperty("timestamp", Instant.now().toString());
    pd.setProperty("traceId", MDC.get("traceId")); // Distributed tracing ke liye

    return pd;
}
```

Response mein extra fields mil jaayenge:

```json
{
  "type": "about:blank",
  "title": "Validation Failed",
  "status": 400,
  "detail": null,
  "errorCode": "INVALID_PHONE",
  "fieldName": "phoneNumber",
  "timestamp": "2024-01-15T10:30:00Z",
  "traceId": "abc123"
}
```

---

## Specific `@ControllerAdvice` — Sabko Nahi, Sirf Kuch Controllers Ko

Agar multiple modules hain aur chahte ho ki different handlers different controllers ko handle karein:

```java
// Sirf "com.yourapp.api.payment" package ke controllers handle karega
@RestControllerAdvice(basePackages = "com.yourapp.api.payment")
public class PaymentExceptionHandler {

    @ExceptionHandler(PaymentFailedException.class)
    public ProblemDetail handlePaymentFailed(PaymentFailedException ex) {
        // Payment-specific error handling
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(
                HttpStatus.PAYMENT_REQUIRED, ex.getMessage());
        pd.setProperty("paymentGateway", ex.getGateway());
        pd.setProperty("failureCode", ex.getFailureCode());
        return pd;
    }
}

// Sirf specific controller classes ke liye
@RestControllerAdvice(assignableTypes = {
        OrderController.class,
        CartController.class
})
public class OrderExceptionHandler {
    // ...
}
```

---

## `@Order` — Jab Multiple `@ControllerAdvice` Hain

Agar tumhare paas multiple `@ControllerAdvice` classes hain aur same exception type handle kar rahi hain, toh `@Order` se priority set karo:

```java
@RestControllerAdvice
@Order(1)  // Pehle try hoga — lower number = higher priority
public class PaymentExceptionHandler {
    @ExceptionHandler(RuntimeException.class)
    public ProblemDetail handle(RuntimeException ex) { /* ... */ }
}

@RestControllerAdvice
@Order(2)  // Baad mein try hoga
public class GlobalExceptionHandler {
    @ExceptionHandler(RuntimeException.class)
    public ProblemDetail handle(RuntimeException ex) { /* ... */ }
}
```

---

## Gotchas — Common Mistakes Jo Beginners Karte Hain

> [!warning] `@Transactional` sirf `RuntimeException` pe rollback karta hai
> Yeh ek bahut common bug hai. Agar tumhara service method `@Transactional` hai aur tum ek checked exception throw karte ho (jaise `IOException`), toh transaction rollback NAHI hoga by default. Sirf `RuntimeException` aur uske subclasses pe rollback hota hai.
>
> ```java
> @Transactional
> public void processPayment() throws IOException {
>     // IOException throw hua toh transaction rollback NAHI hoga!
>     // Data partial save ho sakta hai — bahut dangerous
> }
>
> // Fix:
> @Transactional(rollbackFor = Exception.class)
> public void processPayment() throws IOException {
>     // Ab rollback hoga
> }
> ```

> [!warning] Stack trace kabhi client ko mat bhejo
> Yeh security vulnerability hai. Internal error details se attackers ko tumhare system ke baare mein information milti hai.
>
> ```java
> // WRONG — stack trace client ko expose kar raha hai
> @ExceptionHandler(Exception.class)
> public Map<String, Object> handle(Exception ex) {
>     return Map.of(
>         "error", ex.getMessage(),
>         "trace", Arrays.toString(ex.getStackTrace()) // KABHI MAT KARO
>     );
> }
>
> // CORRECT — log internally, generic message client ko
> @ExceptionHandler(Exception.class)
> public ProblemDetail handle(Exception ex, HttpServletRequest req) {
>     log.error("Unhandled error", ex); // Internal log mein full details
>     return ProblemDetail.forStatusAndDetail(
>         HttpStatus.INTERNAL_SERVER_ERROR,
>         "An unexpected error occurred" // Client ko sirf yeh
>     );
> }
> ```

> [!warning] `ResponseStatusException` service layer mein use mat karo
> ```java
> // WRONG — service layer mein web concern aa gayi
> @Service
> public class UserService {
>     public User findById(Long id) {
>         return repo.findById(id)
>             .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
>             // ^^ Yeh HTTP concern hai — service mein nahi aani chahiye
>     }
> }
>
> // CORRECT — typed exception, web se decoupled
> @Service
> public class UserService {
>     public User findById(Long id) {
>         return repo.findById(id)
>             .orElseThrow(() -> new ResourceNotFoundException("User", id));
>     }
> }
> ```
> `ResponseStatusException` convenience ke liye hai — quick prototyping mein theek hai, production code mein avoid karo.

> [!warning] Exception handler method ki ordering — type hierarchy samjho
> Spring `@ExceptionHandler` methods ko most-specific first match karta hai. Iska matlab:
>
> ```java
> @ExceptionHandler(Exception.class)           // Yeh catch-all hai
> @ExceptionHandler(ResourceNotFoundException.class) // Yeh specific hai
> ```
>
> Dono same class mein hon ya alag — Spring hierarchy check karta hai. `ResourceNotFoundException` agar `RuntimeException` extends karta hai, toh `RuntimeException.class` handler bhi isko catch karega. Specific handler hamesha prefer hota hai.
>
> Agar same specificity ke do handlers hain **alag `@ControllerAdvice` classes mein**, toh `@Order` use karo.

> [!warning] `@Async` methods ke exceptions `@ControllerAdvice` tak nahi pahunchte
> Async methods alag thread pe chalaate hain — woh HTTP request se disconnected hain. Isliye:
>
> ```java
> @Configuration
> @EnableAsync
> public class AsyncConfig implements AsyncConfigurer {
>
>     @Override
>     public AsyncUncaughtExceptionHandler getAsyncUncaughtExceptionHandler() {
>         return (throwable, method, params) -> {
>             log.error("Async exception in method {}: {}",
>                     method.getName(), throwable.getMessage(), throwable);
>             // Alert bhejo, retry karo, ya dead-letter queue mein daalo
>         };
>     }
> }
> ```

> [!tip] Validation errors mein field name aur rejected value include karo
> Frontend developer ko sirf "Validation failed" se kuch pata nahi chalta. Unhe batao konsa field fail hua aur kyun:
>
> ```java
> pd.setProperty("errors", List.of(
>     Map.of("field", "phoneNumber", "rejectedValue", "abc", "message", "Must be 10 digits"),
>     Map.of("field", "email", "rejectedValue", "not-an-email", "message", "Invalid email format")
> ));
> ```

> [!tip] Trace ID add karo production debugging ke liye
> Jab user complain kare "mera order fail ho gaya", tum log mein dhundh sako — trace ID se:
>
> ```java
> pd.setProperty("traceId", UUID.randomUUID().toString()); // Ya MDC se lo agar tracing hai
> ```
> Frontend yeh value user ko show kar sakta hai, aur user support team ko de sakta hai.

---

## Complete Flow — Ek Request Ka Journey

```
HTTP Request: GET /api/restaurants/999
       |
       v
RestaurantController.getById(999)
       |
       v
restaurantService.findById(999)
       |
       v
restaurantRepo.findById(999) --> Optional.empty()
       |
       v
orElseThrow --> throw new ResourceNotFoundException("Restaurant", 999)
       |
       v
Spring catches exception
       |
       v
GlobalExceptionHandler.handleNotFound() called
       |
       v
ProblemDetail created: {
  "type": "https://api.yourapp.com/errors/not-found",
  "title": "Resource Not Found",
  "status": 404,
  "detail": "Restaurant with ID 999 does not exist",
  "instance": "/api/restaurants/999"
}
       |
       v
HTTP Response: 404 Not Found + JSON body
```

Controller ya service mein ek bhi `try/catch` nahi likha — Spring ne sab handle kiya.

---

## Key Takeaways

- **`@RestControllerAdvice` ek jagah pe sab exceptions handle karta hai** — Express ke global error middleware ki tarah, lekin type-safe aur zyada powerful
- **Custom exception classes banao** — `ResourceNotFoundException`, `ConflictException`, `BusinessRuleException`, etc. Generic `RuntimeException` throw mat karo
- **`ProblemDetail` (RFC 7807) use karo** — Standard format, frontend developers ko predictable structure milta hai, `spring.mvc.problemdetails.enabled: true` set karo
- **Service layer mein exceptions throw karo** — Controller sirf routing, service business logic aur exceptions
- **Stack trace kabhi client ko mat bhejo** — Log internally, generic message externally — yeh security best practice hai
- **`@Transactional` sirf `RuntimeException` pe rollback karta hai** — Checked exceptions ke liye `rollbackFor = Exception.class` specify karo
- **`ResponseStatusException` production code mein avoid karo** — Quick demos ke liye theek, real apps mein typed exceptions + `@ControllerAdvice`
- **Async exceptions alag handle karo** — `AsyncUncaughtExceptionHandler` se, woh `@ControllerAdvice` tak nahi pahunchte
- **Useful context include karo** — `traceId`, field-level validation errors, `instance` URI — debugging aur user experience dono improve hote hain
- **`@Order` use karo** jab multiple `@ControllerAdvice` classes hain same exception type ke liye
