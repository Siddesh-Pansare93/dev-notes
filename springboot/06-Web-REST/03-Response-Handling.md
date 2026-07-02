# Response Handling — HTTP Response Control in Spring Boot

Socho ek second ke liye — jab Zomato ka app tumhare phone pe order place karta hai, toh backend sirf data nahi bhejta. Woh clearly batata hai: "201 Created — tera order ban gaya", ya "404 Not Found — yeh restaurant exist nahi karta", ya "429 Too Many Requests — bhai itni jaldi order mat kar". Yeh sab **HTTP response** hai — status code, headers, aur body ka ek combined package.

Node.js/Express mein tum `res.status(201).json(body)` likhte the — seedha, simple. Spring Boot mein bhi yahi concept hai, bas syntax alag hai aur options zyada hain. Is file mein hum sikhenge ki Spring Boot mein HTTP response ko **kitne tarike se control** kar sakte ho, kab kaunsa use karna chahiye, aur kaunsi galtiyan beginners typically karte hain.

---

## Teen Tarike Response Control Karne Ke

Spring Boot mein HTTP response control karne ke **teen main approaches** hain. Inhe samajhna zaroori hai kyunki teen alag situations ke liye teen alag tools hain.

### 1. Direct Object Return — Sabse Simple Case

Agar tumhara endpoint hamesha `200 OK` return karta hai aur sirf JSON body chahiye, toh seedha domain object ya DTO return karo. Spring automatically usse JSON mein serialize karega (via Jackson) aur `200 OK` status set karega.

```java
@GetMapping("/{id}")
public ArticleDto get(@PathVariable Long id) {
    // Bas DTO return karo — Spring baaki sab handle karega
    // Response: 200 OK + JSON body
    return articleService.find(id);
}
```

Yeh Express mein aisa tha:
```typescript
// Express
app.get('/articles/:id', (req, res) => {
  const article = articleService.find(req.params.id);
  res.json(article); // manually json() call karna padta tha
});
```

Spring mein `@RestController` annotation yeh kaam automatically karta hai — woh samajh jaata hai ki return value ko JSON mein convert karke response body mein daalna hai.

### 2. `@ResponseStatus` Annotation — Fixed Status Code

Jab tumhe status code change karna hai but woh hamesha same rahega (conditional nahi), toh `@ResponseStatus` use karo method pe.

```java
// POST endpoint — 201 Created return karna chahiye, 200 nahi
@PostMapping
@ResponseStatus(HttpStatus.CREATED)  // <-- yeh fixed karega status
public ArticleDto create(@RequestBody @Valid CreateArticleRequest req) {
    return articleService.create(req);
}

// DELETE — 204 No Content return karna chahiye (body nahi hoti)
@DeleteMapping("/{id}")
@ResponseStatus(HttpStatus.NO_CONTENT)  // <-- 204, 200 nahi
public void delete(@PathVariable Long id) {
    articleService.delete(id);
}
```

> [!info] Node.js se aa rahe ho toh yeh samjho
> Express mein `res.status(201).json(body)` likhte the — manually status set karna padta tha. Spring mein `@ResponseStatus` woh annotation se declare karne deta hai, code se alag. Cleaner hai jab status conditional nahi ho.

### 3. `ResponseEntity<T>` — Full Control

Yeh sabse powerful option hai. Jab status code runtime pe decide hona chahiye (logic ke basis pe), ya custom headers add karne hain, ya `Location` header set karna hai — tab `ResponseEntity` use karo.

Express mein tumne yeh kiya hoga:
```typescript
res.status(201)
   .location('/api/articles/123')
   .set('X-Resource-Version', '1')
   .json(createdArticle);
```

Spring mein same cheez `ResponseEntity` se hoti hai:
```java
return ResponseEntity
    .created(locationUri)           // 201 + Location header
    .header("X-Resource-Version", "1")
    .body(createdArticle);
```

---

## Complete Code Example — ArticleController

Yeh ek real-world jaisa controller hai jo teenon approaches demonstrate karta hai:

```java
@RestController
@RequestMapping("/api/v1/articles")
public class ArticleController {

    private final ArticleService articleService;

    // Constructor injection — Spring automatically inject karega
    public ArticleController(ArticleService articleService) {
        this.articleService = articleService;
    }

    // =====================================================
    // APPROACH 1: Plain return — 200 OK, JSON body
    // =====================================================

    @GetMapping("/{id}")
    public ArticleDto get(@PathVariable Long id) {
        // articleService.find() DTO return karta hai
        // Spring isko JSON mein convert karke 200 OK ke saath bhejta hai
        return articleService.find(id);
    }

    // =====================================================
    // APPROACH 2: @ResponseStatus — fixed status code
    // =====================================================

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)  // 201, 200 nahi — REST convention hai
    public ArticleDto create(@RequestBody @Valid CreateArticleRequest req) {
        return articleService.create(req);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)  // 204 — body nahi hoti DELETE mein
    public void delete(@PathVariable Long id) {
        articleService.delete(id);
        // void return — Spring kuch nahi bhejega body mein
    }

    // =====================================================
    // APPROACH 3: ResponseEntity — full control
    // =====================================================

    // Location header ke saath POST — proper REST hai yeh
    @PostMapping("/with-location")
    public ResponseEntity<ArticleDto> createWithLocation(
            @RequestBody @Valid CreateArticleRequest req) {

        ArticleDto created = articleService.create(req);

        // Location header build karo — newly created resource ka URL
        // e.g., /api/v1/articles/42
        URI location = ServletUriComponentsBuilder
                .fromCurrentRequest()  // current request URL se start karo
                .path("/{id}")         // /{id} append karo
                .buildAndExpand(created.id())  // {id} ko actual id se replace karo
                .toUri();

        return ResponseEntity
                .created(location)                     // 201 + Location header set
                .header("X-Resource-Version", "1")     // custom header
                .body(created);                        // response body
    }

    // ETag-based caching — 304 Not Modified jab data change nahi hua
    @GetMapping("/{id}/cacheable")
    public ResponseEntity<ArticleDto> getCacheable(
            @PathVariable Long id,
            WebRequest request) {  // WebRequest se If-None-Match header milta hai

        ArticleDto dto = articleService.find(id);
        String etag = "\"" + dto.version() + "\"";  // ETag format: "version"

        // Agar client ke paas same ETag hai, toh 304 bhejo
        // Client apna cached copy use karega — bandwidth bachegi
        if (request.checkNotModified(etag)) {
            return ResponseEntity.status(HttpStatus.NOT_MODIFIED).build();
        }

        // Naya data hai — 200 OK + ETag header ke saath bhejo
        return ResponseEntity.ok()
                .eTag(etag)
                .body(dto);
    }

    // Optional se 404 handle karna — clean pattern hai yeh
    @GetMapping("/maybe/{id}")
    public ResponseEntity<ArticleDto> maybe(@PathVariable Long id) {
        return articleService.findOptional(id)  // Optional<ArticleDto> return karta hai
                .map(ResponseEntity::ok)          // agar present hai toh 200
                .orElse(ResponseEntity.notFound().build());  // absent hai toh 404
    }

    // Large file streaming — memory mein puri file load kiye bina
    // Socho Flipkart pe invoice download — woh stream karta hai
    @GetMapping("/{id}/export")
    public ResponseEntity<StreamingResponseBody> export(@PathVariable Long id) {
        // StreamingResponseBody ek lambda hai jo OutputStream mein data likhta hai
        StreamingResponseBody body = out -> articleService.streamExport(id, out);

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_OCTET_STREAM)  // binary file
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=article-" + id + ".csv")  // download prompt
                .body(body);
    }
}
```

---

## `ResponseEntity` Ke Static Factory Methods — Quick Reference

Spring ne common HTTP statuses ke liye shortcut methods diye hain. Yeh builders use karo — `new ResponseEntity<>(body, headers, status)` se zyada readable hain:

```java
// 200 OK — sabse common
ResponseEntity.ok(body);

// 201 Created — naya resource create hua
// Location header bhi automatically set hota hai
ResponseEntity.created(uri).body(body);

// 202 Accepted — async processing shuru ho gayi
// Jaise Swiggy order place kiya, processing background mein chal rahi hai
ResponseEntity.accepted().body(body);

// 204 No Content — success, but body nahi
// DELETE, logout, etc.
ResponseEntity.noContent().build();

// 400 Bad Request — client ne galat data bheja
ResponseEntity.badRequest().body(errorDetails);

// 404 Not Found — resource nahi mila
ResponseEntity.notFound().build();

// 422 Unprocessable Entity — syntax sahi hai but validation fail
// Jaise UPI mein valid amount format but negative value
ResponseEntity.unprocessableEntity().body(errorDetails);

// Custom status — koi bhi number de sakte ho
ResponseEntity.status(503).body(errorDetails);  // Service Unavailable
ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(rateLimitInfo);
```

---

## Underlying Magic — Jackson aur HttpMessageConverter

Jab tum koi object return karte ho ya `.body(someObject)` call karte ho, Spring automatically woh object ko JSON mein convert karta hai. Yeh kaam karta hai **Jackson** library ke through, jo ek `HttpMessageConverter` implement karta hai.

Flow kuch aisa hai:

```
Controller method return karta hai object
    ↓
Spring ko pata chalata hai ki response JSON hona chahiye
(Accept header se ya default config se)
    ↓
Jackson ka ObjectMapper object ko JSON string mein convert karta hai
    ↓
Response body mein likh deta hai
```

Tum is behavior ko customize kar sakte ho — field naming strategy, date format, null values ignore karna — `application.properties` ya `@JsonProperty` annotations se.

---

## Express vs Spring — Side-by-Side Comparison

| Express/TypeScript | Spring Boot |
|---|---|
| `res.status(201).json(x)` | `ResponseEntity.status(201).body(x)` |
| `res.location(url)` | `.created(uri)` ya `.header("Location", url)` |
| `res.set('X-Foo', 'bar')` | `.header("X-Foo", "bar")` |
| `res.sendStatus(204)` | `ResponseEntity.noContent().build()` |
| `res.json({ error })` with middleware | `@ControllerAdvice` + `@ExceptionHandler` |
| `res.write(...); res.end()` (streams) | `StreamingResponseBody` |
| Manual `If-None-Match` check | `WebRequest.checkNotModified(etag)` |
| Method annotation nahi hoti | `@ResponseStatus(HttpStatus.CREATED)` |

Ek important difference — Express mein `res` object globally available hota hai function mein. Spring mein tumhe ya toh annotation use karna hai ya `ResponseEntity` return karna hai. Direct access to response object nahi milta (though `HttpServletResponse` inject karke mil sakta hai, but that's not recommended).

---

## Real-World Patterns — Kab Kya Use Karo

### Pattern 1: Simple CRUD APIs

```java
// GET — seedha return
@GetMapping("/{id}")
public UserDto getUser(@PathVariable Long id) {
    return userService.findById(id);  // 200 OK automatically
}

// POST — @ResponseStatus for 201
@PostMapping
@ResponseStatus(HttpStatus.CREATED)
public UserDto createUser(@RequestBody @Valid CreateUserRequest req) {
    return userService.create(req);
}

// PUT — update kiya, 200 aur updated object
@PutMapping("/{id}")
public UserDto updateUser(@PathVariable Long id,
                          @RequestBody @Valid UpdateUserRequest req) {
    return userService.update(id, req);  // 200 OK
}

// DELETE — 204, kuch return nahi
@DeleteMapping("/{id}")
@ResponseStatus(HttpStatus.NO_CONTENT)
public void deleteUser(@PathVariable Long id) {
    userService.delete(id);
}
```

### Pattern 2: Async Processing (Swiggy order jaisi cheez)

```java
// User ne ek bada report request kiya — time lagega
// Hum immediately 202 Accepted bhejte hain
@PostMapping("/reports")
public ResponseEntity<ReportJobDto> requestReport(
        @RequestBody ReportRequest req) {

    String jobId = reportService.scheduleReport(req);

    return ResponseEntity
            .accepted()  // 202 — processing shuru ho gayi
            .body(new ReportJobDto(jobId, "PROCESSING",
                    "/api/reports/" + jobId));  // status check karne ka URL
}

// Client yeh URL poll karega status ke liye
@GetMapping("/reports/{jobId}")
public ResponseEntity<ReportStatusDto> getReportStatus(
        @PathVariable String jobId) {

    ReportStatusDto status = reportService.getStatus(jobId);

    if (status.isComplete()) {
        return ResponseEntity.ok(status);  // 200 — done!
    } else {
        return ResponseEntity.accepted().body(status);  // 202 — abhi chal raha hai
    }
}
```

### Pattern 3: Conditional Response with Optional

```java
// Optional se elegant 404 handling
@GetMapping("/{orderId}")
public ResponseEntity<OrderDto> getOrder(@PathVariable String orderId,
                                          @RequestHeader("X-User-Id") String userId) {
    return orderService.findByIdAndUserId(orderId, userId)
            .map(order -> ResponseEntity.ok(order))
            .orElse(ResponseEntity.notFound().build());
}
```

### Pattern 4: File Download (Invoice, Report, etc.)

```java
// CRED pe invoice download jaisi functionality
@GetMapping("/invoices/{invoiceId}/download")
public ResponseEntity<StreamingResponseBody> downloadInvoice(
        @PathVariable Long invoiceId) {

    Invoice invoice = invoiceService.findById(invoiceId);
    String filename = "invoice-" + invoice.getNumber() + ".pdf";

    StreamingResponseBody body = outputStream -> {
        invoiceService.generatePdf(invoice, outputStream);
        // Directly stream karo — memory mein puri PDF load mat karo
    };

    return ResponseEntity.ok()
            .contentType(MediaType.APPLICATION_PDF)
            .header(HttpHeaders.CONTENT_DISPOSITION,
                    "attachment; filename=\"" + filename + "\"")
            .body(body);
}
```

---

## Gotchas — Common Mistakes Jo Beginners Karte Hain

> [!warning] `void` return + koi annotation nahi = 200 OK with empty body
> Agar DELETE endpoint pe `@ResponseStatus(HttpStatus.NO_CONTENT)` nahi lagaya, toh Spring 200 OK return karega — empty body ke saath. REST convention kehta hai DELETE should return 204. Client confuse ho sakta hai.
>
> ```java
> // GALAT — 200 OK aayega, 204 nahi
> @DeleteMapping("/{id}")
> public void delete(@PathVariable Long id) {
>     service.delete(id);
> }
>
> // SAHI — explicitly 204 bolo
> @DeleteMapping("/{id}")
> @ResponseStatus(HttpStatus.NO_CONTENT)
> public void delete(@PathVariable Long id) {
>     service.delete(id);
> }
> ```

> [!warning] `null` return karna — almost always wrong
> `null` return karne pe Spring `200 OK` bhejega with literal text `null` as body. Yeh almost kabhi correct nahi hota.
>
> ```java
> // GALAT — null return karna
> @GetMapping("/{id}")
> public ArticleDto get(@PathVariable Long id) {
>     return articleService.findOrNull(id);  // null return ho sakta hai!
>     // Response: 200 OK, body: "null" — WTF moment clients ke liye
> }
>
> // SAHI — Optional use karo
> @GetMapping("/{id}")
> public ResponseEntity<ArticleDto> get(@PathVariable Long id) {
>     return articleService.findOptional(id)
>             .map(ResponseEntity::ok)
>             .orElse(ResponseEntity.notFound().build());
> }
>
> // YA — exception throw karo aur ControllerAdvice handle karne do
> @GetMapping("/{id}")
> public ArticleDto get(@PathVariable Long id) {
>     return articleService.findOrThrow(id);  // NotFoundException throw karta hai
>     // ControllerAdvice usse 404 mein convert kar dega
> }
> ```

> [!warning] `@ResponseStatus` + `ResponseEntity` dono use karna
> Agar dono use kiye, `ResponseEntity` ka status win karega. `@ResponseStatus` ignore ho jaayegi. Ek hi approach pick karo per endpoint.
>
> ```java
> // CONFUSING — dono hai
> @PostMapping
> @ResponseStatus(HttpStatus.CREATED)  // yeh ignore hoga!
> public ResponseEntity<ArticleDto> create(@RequestBody CreateArticleRequest req) {
>     ArticleDto created = service.create(req);
>     return ResponseEntity.ok(created);  // 200 aayega, 201 nahi!
> }
>
> // SAHI — ek hi choose karo
> @PostMapping
> public ResponseEntity<ArticleDto> create(@RequestBody CreateArticleRequest req) {
>     ArticleDto created = service.create(req);
>     return ResponseEntity.created(locationUri).body(created);  // 201
> }
> ```

> [!warning] JPA Entity directly return karna — dangerous hai yaar
> Kabhi bhi JPA `@Entity` objects directly return mat karo controller se. Do bade problems hain:
>
> 1. **Lazy Loading Exception**: Jab Jackson entity serialize karne lagta hai, toh lazy-loaded relations fetch karne ki koshish karta hai. But us waqt Hibernate session close ho chuki hoti hai — `LazyInitializationException` aata hai.
>
> 2. **Data Leakage**: Entity mein sensitive fields ho sakte hain (password hash, internal IDs) jo client ko nahi dikhne chahiye.
>
> ```java
> // GALAT — Entity return kar raha hai
> @GetMapping("/{id}")
> public User getUser(@PathVariable Long id) {
>     return userRepository.findById(id).orElseThrow();
>     // User entity mein passwordHash field bhi hai — client ko dikh jaayega!
>     // Aur agar User ke orders lazy loaded hain — exception aayega
> }
>
> // SAHI — DTO use karo
> @GetMapping("/{id}")
> public UserDto getUser(@PathVariable Long id) {
>     User user = userRepository.findById(id).orElseThrow();
>     return userMapper.toDto(user);  // sirf zaruri fields
> }
> ```

> [!tip] Error responses ke liye apna format mat banao — ProblemDetail use karo
> Spring Boot 3+ mein `ProblemDetail` built-in hai (RFC 7807 standard). Iska use karo instead of custom `{ "error": "...", "message": "..." }` envelopes. Consistency aati hai aur clients ko ek standard format milta hai.
>
> ```java
> // BEKAR — custom error format
> return ResponseEntity.badRequest().body(Map.of("error", "Invalid input"));
>
> // BETTER — ProblemDetail use karo
> ProblemDetail problem = ProblemDetail.forStatusAndDetail(
>     HttpStatus.BAD_REQUEST, "Price cannot be negative");
> problem.setTitle("Validation Failed");
> return ResponseEntity.badRequest().body(problem);
> ```

> [!tip] Location header set karo POST pe — yeh REST ka core principle hai
> Jab koi resource create hota hai (POST), response mein `Location` header hona chahiye jo newly created resource ka URL bataye. Clients usse use karke directly navigate kar sakein.
>
> ```java
> URI location = ServletUriComponentsBuilder
>     .fromCurrentRequest()
>     .path("/{id}")
>     .buildAndExpand(created.getId())
>     .toUri();
>
> return ResponseEntity.created(location).body(created);
> // Response headers mein: Location: /api/users/42
> ```

---

## `ResponseEntity` Builder — Full Method Chaining

`ResponseEntity` ek fluent builder hai. Yeh pattern samajh lo:

```java
// Step 1: Status choose karo (static method)
ResponseEntity.ok()           // BodyBuilder return karta hai
ResponseEntity.created(uri)   // BodyBuilder return karta hai
ResponseEntity.noContent()    // HeadersBuilder return karta hai (body nahi)
ResponseEntity.status(422)    // BodyBuilder return karta hai

// Step 2: Headers add karo (optional, chain hote hain)
.header("X-Custom-Header", "value")
.contentType(MediaType.APPLICATION_JSON)
.eTag("\"v1\"")
.lastModified(ZonedDateTime.now())
.cacheControl(CacheControl.maxAge(60, TimeUnit.SECONDS))

// Step 3: Body set karo (last step)
.body(someObject)   // T type ka object
.build()            // body ke bina (void responses ke liye)
```

Example:
```java
return ResponseEntity
        .ok()
        .contentType(MediaType.APPLICATION_JSON)
        .header("X-Total-Count", String.valueOf(total))
        .header("X-Page", String.valueOf(page))
        .cacheControl(CacheControl.maxAge(30, TimeUnit.SECONDS))
        .body(pageOfResults);
```

---

## Ek Aur Important Thing — Generic Type `<T>` in ResponseEntity

`ResponseEntity<T>` mein `T` woh body ka type hai. Kuch gotchas hain:

```java
// Agar body nahi chahiye — Void use karo
public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
    userService.delete(id);
    return ResponseEntity.noContent().build();
}

// Agar type runtime pe decide hota hai — wildcard use karo
public ResponseEntity<?> flexibleEndpoint() {
    if (someCondition) {
        return ResponseEntity.ok(new SuccessDto());
    } else {
        return ResponseEntity.badRequest().body(new ErrorDto());
    }
}

// List return karna
public ResponseEntity<List<UserDto>> getAllUsers() {
    List<UserDto> users = userService.findAll();
    return ResponseEntity.ok(users);
}
```

---

## Key Takeaways

- **Teen approaches** hain — plain return (200 OK), `@ResponseStatus` (fixed status), `ResponseEntity` (full control). Sabse simple jo kaam kare woh use karo.

- **DELETE = 204**, **POST (create) = 201** — yeh REST conventions hain. Follow karo, clients confused nahi honge.

- **Kabhi `null` return mat karo** — ya `Optional` use karo `ResponseEntity` ke saath, ya exception throw karo aur `@ControllerAdvice` handle karne do.

- **Entity objects directly return mat karo** — hamesha DTOs use karo. Lazy loading exceptions aur data leakage se bacho.

- **`@ResponseStatus` aur `ResponseEntity` dono ek saath mat use karo** — `ResponseEntity` hamesha win karta hai, confusion hota hai.

- **Location header set karo** POST responses mein — REST ka proper way hai newly created resource ka URL batana.

- **`StreamingResponseBody`** use karo bade files ke liye — memory mein puri file load karne ki zarurat nahi.

- **`ProblemDetail`** use karo error responses ke liye — custom format mat banao, standard RFC 7807 follow karo.

- **Express se aaye ho toh** — `ResponseEntity` bilkul `res.status().header().json()` jaisi hai, bas Java syntax mein.
