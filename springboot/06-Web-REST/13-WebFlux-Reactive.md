# Spring WebFlux — Reactive Programming ka Duniya

## Yeh Kyun Chahiye? Pehle Problem Samjho

Socho Zomato ka backend — Diwali ki raat hai, ek saath 5 lakh log apna khana order kar rahe hain. Ek banda payment gateway pe wait kar raha hai, doosra restaurant confirm kar raha hai, teesra delivery boy dhundh raha hai. Har ek request ke liye ek OS thread block ho jaaye — toh 5 lakh requests ke liye 5 lakh threads? Bhai, ek normal server mein 200-500 threads hote hain, uske baad memory khatam. Server down.

Yahi problem thi jab Spring sirf MVC pe tha.

**Spring WebFlux** is the answer to that problem. Yeh Node.js ki tarah kaam karta hai — chhoti si event loop thread pool hoti hai (mostly Netty server), aur woh thousands of concurrent connections handle kar sakti hai bina har ek ke liye alag thread banaye. Kaise? **Non-blocking I/O** se — jab koi database call ya HTTP call hoti hai, thread wahan ruk ke wait nahi karta, woh free ho jaata hai doosre kaam ke liye. Jab response aata hai, callback/reactive pipeline ko fire kar deta hai.

Tum Node.js/TypeScript se aaye ho, toh yeh concept already familiar hai. `async/await`, `Promise`, `Observable` — sab reactive programming ke hi forms hain. WebFlux mein sirf naaye types hain: `Mono` aur `Flux`.

---

## Spring MVC vs WebFlux — Side by Side

| | Spring MVC | Spring WebFlux |
|---|---|---|
| Server | Tomcat (blocking servlet) | Netty (non-blocking, default) |
| Threading model | Thread-per-request | Small event-loop pool |
| Return types | `User`, `List<User>`, `ResponseEntity` | `Mono<User>`, `Flux<User>` |
| Database driver | JDBC (blocking) | R2DBC (non-blocking) |
| HTTP client | RestClient / RestTemplate | WebClient |
| Best for | CRUD APIs, simple flows | High-fanout I/O, streaming, SSE, proxies |
| Complexity | Low | Medium-High |

**Node.js analogy yad rakho:**
- Express mein tumhara har handler `async function` hota hai jo `Promise` return karta hai
- WebFlux mein har handler `Mono` ya `Flux` return karta hai
- Concept wahi, sirf JVM ka tarika alag

> [!warning] Galti mat karna — WebFlux "faster" nahi hai by default. Woh tabhi win karta hai jab tumhara workload I/O-bound ho aur bahut saari concurrent connections hon. Normal CRUD API ke liye Spring MVC simpler aur equally fast hai. "Async = faster" yeh myth hai.

---

## Dependencies — Kya Add Karna Hai

```xml
<!-- pom.xml mein sirf yeh dependency chahiye -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-webflux</artifactId>
</dependency>
```

> [!warning] **Badi galti:** `spring-boot-starter-web` aur `spring-boot-starter-webflux` dono ek saath mat daalo. Spring Boot dono dekh ke MVC choose kar leta hai aur WebFlux config quietly ignore ho jaata hai. Koi error nahi aayega, bas WebFlux kaam nahi karega. Isliye sirf ek choose karo.

---

## Reactor ka Alphabet — Mono aur Flux

Tumhe do naaye types sikhne hain. Ye hi WebFlux ka core hai.

### `Mono<T>` — Ek Item Ya Kuch Nahi

`Mono` ek `Promise<T>` ki tarah hai. Ya toh ek value milegi, ya empty (`Mono.empty()`), ya error.

```java
// Ye teen teeno valid hain
Mono<String> hello = Mono.just("Namaste");
Mono<String> empty = Mono.empty();
Mono<String> error = Mono.error(new RuntimeException("Server ne mana kar diya"));
```

### `Flux<T>` — 0 se N Items

`Flux` ek `Observable<T>` ya async iterable ki tarah hai. Ek stream of data — kitne bhi elements aa sakte hain.

```java
// Flux static data se
Flux<String> cities = Flux.just("Delhi", "Mumbai", "Bangalore", "Hyderabad");

// Flux ek List se
Flux<Integer> numbers = Flux.fromIterable(List.of(1, 2, 3, 4, 5));

// Flux interval pe — har second ek item
Flux<Long> ticker = Flux.interval(Duration.ofSeconds(1));
```

### TypeScript se Comparison — Ek Baar Mein Samjho

| Reactor (Java) | TypeScript / RxJS |
|---|---|
| `Mono<T>` | `Promise<T>` |
| `Flux<T>` | `Observable<T>` ya `AsyncIterable<T>` |
| `.map(fn)` | `.then(fn)` ya `array.map()` |
| `.flatMap(fn)` | Chained `.then()` jo promise return kare |
| `.filter(predicate)` | `.filter()` |
| `.zip(monoA, monoB)` | `Promise.all([a, b])` |
| `.switchIfEmpty(fallback)` | `?? fallback` ya optional chaining |
| `.onErrorReturn(default)` | `.catch(() => default)` |
| `.subscribeOn(scheduler)` | Thread pool choice (Node mein nahi hota) |
| `.block()` | `await` — lekin mat karo production mein! |

---

## Annotated Controller — Jaana Pehchaana Chehra

Tumhe sab kuch naya nahi sikhna. WebFlux annotations wahi hain — `@RestController`, `@GetMapping`, `@PostMapping` — sirf return types change hote hain.

```java
@RestController
@RequestMapping("/api/restaurants")
public class RestaurantController {

    private final RestaurantService service;

    // Constructor injection — always prefer this
    public RestaurantController(RestaurantService service) {
        this.service = service;
    }

    // Ek restaurant fetch karo — Mono kyunki single item
    @GetMapping("/{id}")
    public Mono<Restaurant> getById(@PathVariable Long id) {
        return service.findById(id);
        // Node mein: return restaurantService.findById(id); (Promise return karte the)
    }

    // Saare restaurants — Flux kyunki multiple items
    @GetMapping
    public Flux<Restaurant> getAll() {
        return service.findAll();
    }

    // Query params ke saath — city ke restaurants
    @GetMapping("/search")
    public Flux<Restaurant> searchByCity(@RequestParam String city) {
        return service.findByCity(city);
    }

    // Naya restaurant create karo
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<ResponseEntity<Restaurant>> create(
            @RequestBody @Valid Mono<CreateRestaurantDto> bodyMono) {

        return bodyMono
            .flatMap(service::create)
            // .flatMap kyunki service.create() bhi Mono return karta hai
            // Node mein: .then(dto => service.create(dto))
            .map(saved -> ResponseEntity
                .created(URI.create("/api/restaurants/" + saved.id()))
                .body(saved));
    }

    // Update karo
    @PutMapping("/{id}")
    public Mono<ResponseEntity<Restaurant>> update(
            @PathVariable Long id,
            @RequestBody @Valid Mono<UpdateRestaurantDto> bodyMono) {

        return bodyMono
            .flatMap(dto -> service.update(id, dto))
            .map(ResponseEntity::ok)
            // Agar restaurant nahi mila toh 404
            .defaultIfEmpty(ResponseEntity.notFound().build());
    }

    // Delete karo
    @DeleteMapping("/{id}")
    public Mono<ResponseEntity<Void>> delete(@PathVariable Long id) {
        return service.deleteById(id)
            .thenReturn(ResponseEntity.<Void>noContent().build());
    }
}
```

> [!tip] **`map` vs `flatMap` — Yeh Confusion Sabko Hoti Hai**
> - `.map(fn)` use karo jab `fn` ek normal value return kare (Mono nahi)
> - `.flatMap(fn)` use karo jab `fn` ek `Mono` ya `Flux` return kare
>
> Node.js analogy: `.then(x => x + 1)` is map, `.then(x => fetchSomething(x))` is flatMap.

---

## Functional Router Style — Express Wala Feel

Agar tum MVC annotations se bore ho gaye ho ya team Express-style prefer karti hai, WebFlux mein **functional routing** bhi hai. Yeh bilkul Express ke `app.get(...)` jaisa lagta hai.

```java
// Handler class — controller ki jagah
@Component
public class RestaurantHandler {

    private final RestaurantService service;

    public RestaurantHandler(RestaurantService service) {
        this.service = service;
    }

    // Handler method — request aur response dono milte hain
    public Mono<ServerResponse> getById(ServerRequest request) {
        Long id = Long.parseLong(request.pathVariable("id"));
        return service.findById(id)
            .flatMap(restaurant -> ServerResponse.ok().bodyValue(restaurant))
            .switchIfEmpty(ServerResponse.notFound().build());
        // switchIfEmpty = agar Mono empty ho toh yeh do
    }

    public Mono<ServerResponse> getAll(ServerRequest request) {
        return ServerResponse.ok().body(service.findAll(), Restaurant.class);
    }

    public Mono<ServerResponse> create(ServerRequest request) {
        return request.bodyToMono(CreateRestaurantDto.class)
            .flatMap(service::create)
            .flatMap(saved -> ServerResponse
                .created(URI.create("/api/restaurants/" + saved.id()))
                .bodyValue(saved));
    }
}

// Router — routes define karo (Express ke app.get() jaisa)
@Configuration
public class RestaurantRouter {

    @Bean
    public RouterFunction<ServerResponse> restaurantRoutes(RestaurantHandler handler) {
        return RouterFunctions.route()
            .GET("/api/restaurants/{id}", handler::getById)
            .GET("/api/restaurants", handler::getAll)
            .POST("/api/restaurants", handler::create)
            .build();
    }
}
```

**Kaun sa style choose karo?**
- Team badi hai, annotations se comfortable hai → Annotated Controller
- Team Express/Koa se aayi hai ya functional style prefer karti hai → Functional Router
- Dono technically equivalent hain, performance same

---

## WebClient — Reactive HTTP Client

`RestTemplate` blocking tha. `WebClient` non-blocking hai — WebFlux ka proper HTTP client.

```java
@Service
public class PaymentGatewayClient {

    private final WebClient webClient;

    // WebClient ko @Bean bana do ya constructor mein banao
    public PaymentGatewayClient(WebClient.Builder builder) {
        this.webClient = builder
            .baseUrl("https://api.razorpay.com/v1")
            .defaultHeader("Authorization", "Basic " + encodedKey)
            .build();
    }

    // UPI payment initiate karo
    public Mono<PaymentResponse> initiateUpiPayment(PaymentRequest request) {
        return webClient.post()
            .uri("/payments")
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(request)
            .retrieve()
            // 4xx aur 5xx errors handle karo
            .onStatus(
                HttpStatusCode::is4xxClientError,
                response -> response.bodyToMono(String.class)
                    .flatMap(body -> Mono.error(new PaymentException("Client error: " + body)))
            )
            .onStatus(
                HttpStatusCode::is5xxServerError,
                response -> Mono.error(new PaymentException("Razorpay server error"))
            )
            .bodyToMono(PaymentResponse.class)
            // Retry karo agar transient error aaye — 3 baar try karo
            .retryWhen(Retry.backoff(3, Duration.ofSeconds(1)));
    }

    // Multiple payment statuses ek saath check karo
    // (Zomato ke liye — multiple orders ki payment verify karo)
    public Flux<PaymentStatus> checkMultiplePayments(List<String> paymentIds) {
        return Flux.fromIterable(paymentIds)
            .flatMap(id -> webClient.get()
                .uri("/payments/{id}", id)
                .retrieve()
                .bodyToMono(PaymentStatus.class)
            )
            // Concurrency control — ek saath max 5 requests
            .flatMap(mono -> mono, 5);
    }
}
```

> [!info] `WebClient` sirf WebFlux projects mein nahi, MVC projects mein bhi use karo. Yeh `RestTemplate` ka modern replacement hai. Par agar project Spring MVC hai, toh `RestClient` (Spring 6.1+) bhi ek option hai.

---

## Persistence — R2DBC Use Karo, JPA Nahi

Yeh bahut important point hai. JPA/Hibernate blocking hai — database query karte waqt thread block ho jaati hai. Agar tum WebFlux use kar rahe ho aur JPA bhi use kar rahe ho, toh tumne apna saara reactive benefit waste kar diya.

**R2DBC** (Reactive Relational Database Connectivity) — yeh JDBC ka reactive version hai.

### Dependencies

```xml
<!-- Spring Data R2DBC -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-r2dbc</artifactId>
</dependency>

<!-- PostgreSQL R2DBC driver -->
<dependency>
    <groupId>org.postgresql</groupId>
    <artifactId>r2dbc-postgresql</artifactId>
    <scope>runtime</scope>
</dependency>

<!-- Testing ke liye H2 R2DBC -->
<dependency>
    <groupId>com.h2database</groupId>
    <artifactId>h2</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>io.r2dbc</groupId>
    <artifactId>r2dbc-h2</artifactId>
    <scope>test</scope>
</dependency>
```

### application.yml Configuration

```yaml
spring:
  r2dbc:
    url: r2dbc:postgresql://localhost:5432/zomato_db
    username: postgres
    password: password
  sql:
    init:
      mode: always  # schema.sql automatically run karega
```

### Entity aur Repository

```java
// Entity — @Entity nahi, @Table use hoti hai R2DBC mein
@Table("restaurants")
public class Restaurant {

    @Id
    private Long id;

    private String name;

    private String city;

    @Column("cuisine_type")
    private String cuisineType;

    private boolean active;

    // Getters, setters, constructors...
}

// Repository — ReactiveCrudRepository extend karo (JpaRepository nahi)
public interface RestaurantRepository extends ReactiveCrudRepository<Restaurant, Long> {

    // Custom queries — method names se generate hoti hain (JPA jaisi)
    Flux<Restaurant> findByCity(String city);

    Flux<Restaurant> findByCityAndActive(String city, boolean active);

    Mono<Long> countByCity(String city);

    // Custom SQL query bhi likh sakte ho
    @Query("SELECT * FROM restaurants WHERE city = :city AND cuisine_type = :type LIMIT :limit")
    Flux<Restaurant> findByCityAndCuisine(String city, String type, int limit);
}
```

### Service Layer

```java
@Service
public class RestaurantService {

    private final RestaurantRepository repository;

    public RestaurantService(RestaurantRepository repository) {
        this.repository = repository;
    }

    public Mono<Restaurant> findById(Long id) {
        return repository.findById(id)
            .switchIfEmpty(Mono.error(
                new RestaurantNotFoundException("Restaurant " + id + " nahi mila")
            ));
    }

    public Flux<Restaurant> findAll() {
        return repository.findAll();
    }

    public Flux<Restaurant> findByCity(String city) {
        return repository.findByCity(city)
            .filter(Restaurant::isActive); // sirf active restaurants
    }

    public Mono<Restaurant> create(CreateRestaurantDto dto) {
        Restaurant restaurant = new Restaurant();
        restaurant.setName(dto.name());
        restaurant.setCity(dto.city());
        restaurant.setCuisineType(dto.cuisineType());
        restaurant.setActive(true);
        return repository.save(restaurant);
    }

    // Do restaurants ke details ek saath fetch karo — zip use karo
    public Mono<RestaurantPair> fetchBothRestaurants(Long id1, Long id2) {
        return Mono.zip(
            findById(id1),
            findById(id2),
            RestaurantPair::new  // constructor reference
        );
        // Node mein: Promise.all([findById(id1), findById(id2)])
    }
}
```

### Schedulers — Konsa Thread Pool Kab Use Karo

Reactor mein har operation kisi na kisi thread pe chalta hai. Default mein sab kuch event loop thread (Netty ka) pe hi chalta hai — jab tak tum explicitly bolo "isse doosre thread pe bhej do". Yahi kaam `Schedulers` karta hai. Node.js mein tumhe yeh decision kabhi nahi lena padta kyunki wahan sirf ek hi event loop hota hai — Java mein tumhe khud choose karna padta hai kaunsa kaam kis thread pool pe jaaye.

| Scheduler | Kab Use Karo | Zomato Analogy |
|---|---|---|
| `Schedulers.parallel()` | CPU-bound kaam (calculation, image resize) — jitne CPU cores utne threads | Bill calculate karna, discount apply karna |
| `Schedulers.boundedElastic()` | Blocking I/O jise reactive bana nahi sakte (legacy JDBC, file I/O) | Purana POS machine jo sync hai, usse alag counter pe bhej do |
| `Schedulers.immediate()` | Current thread pe hi chalao, koi switch nahi | Jab kaam itna chhota hai ki thread switch ka overhead bhi zyada hai |
| `Schedulers.single()` | Ek hi dedicated thread, sequential kaam | Ek hi cashier jo order-by-order process kare |

```java
// publishOn vs subscribeOn — dono alag kaam karte hain, confuse mat ho
Mono.fromCallable(() -> heavyComputation())
    .subscribeOn(Schedulers.parallel())   // upstream (source) kis thread pe chale
    .map(result -> result * 2)
    .publishOn(Schedulers.boundedElastic()) // isse aage ka chain kis thread pe chale
    .subscribe();
```

> [!info] `subscribeOn` poore chain ka starting point decide karta hai (kahin bhi lagao, source affect hota hai). `publishOn` sirf usse neeche wale operators ka thread badalta hai. Node mein yeh concept hi nahi hai kyunki single-threaded hai — yeh purely JVM ki multi-threaded duniya ka overhead hai jo WebFlux manage karta hai.

### JPA + WebFlux — Agar Majboori Ho

Agar tumhare project mein JPA pehle se hai aur migrate nahi kar sakte, toh blocking calls ko ek alag thread pool pe isolate karo:

```java
// boundedElastic scheduler — blocking I/O ke liye dedicated thread pool
public Mono<Restaurant> findByIdJpa(Long id) {
    return Mono.fromCallable(() -> jpaRepository.findById(id).orElseThrow())
        .subscribeOn(Schedulers.boundedElastic());
        // boundedElastic = elastic thread pool, blocking kaam ke liye
}
```

> [!warning] Yeh workaround hai, solution nahi. Isse event loop block nahi hoga, lekin tum reactive ka full benefit nahi le rahe. Proper solution R2DBC migrate karna hai.

---

## Operator Cheat Sheet — Common Patterns

Yeh operators roz kaam aate hain. Inhe yaad kar lo.

```java
// 1. MAP — ek value ko doosre mein transform karo
Mono<String> name = findById(1L).map(r -> r.getName());

// 2. FLATMAP — ek Mono se doosra Mono nikalo (chaining)
Mono<Menu> menu = findById(restaurantId)
    .flatMap(r -> menuService.getMenu(r.getId()));
// Node: findById(id).then(r => menuService.getMenu(r.id))

// 3. FILTER — condition pe filter karo
Flux<Restaurant> active = findAll().filter(Restaurant::isActive);

// 4. ZIP — multiple Monos ko combine karo (Promise.all jaisa)
Mono<Tuple2<Restaurant, Menu>> combined = Mono.zip(
    restaurantService.findById(id),
    menuService.findByRestaurantId(id)
);

// 5. SWITCHIFEMPTY — agar empty ho toh fallback
Mono<Restaurant> withFallback = findById(id)
    .switchIfEmpty(Mono.error(new NotFoundException("Nahi mila")));

// 6. ONERRORRETURN — error aaye toh default value do
Mono<Restaurant> safe = findById(id)
    .onErrorReturn(new Restaurant("Default Restaurant"));

// 7. ONERRORRESUME — error aaye toh doosra Mono try karo
Mono<Restaurant> fallback = findById(id)
    .onErrorResume(e -> findFromCache(id));

// 8. DOONEXT — side effects ke liye (logging, metrics)
Mono<Restaurant> withLogging = findById(id)
    .doOnNext(r -> log.info("Restaurant fetch kiya: {}", r.getName()))
    .doOnError(e -> log.error("Error aaya: {}", e.getMessage()));

// 9. COLLECTLIST — Flux ko List mein convert karo
Mono<List<Restaurant>> asList = findAll().collectList();

// 10. TAKE — sirf pehle N items lo
Flux<Restaurant> topFive = findAll().take(5);

// 11. FLATMAPSEQUENTIAL — flatMap ki tarah, par order maintain karo
Flux<Menu> menus = restaurantIds.flatMapSequential(menuService::getMenu);

// 12. MERGE — do Flux ko ek mein combine karo
Flux<Restaurant> merged = Flux.merge(
    restaurantService.findByCity("Delhi"),
    restaurantService.findByCity("Mumbai")
);
```

---

## Server-Sent Events (SSE) — Real-time Streaming

Yeh WebFlux ka asli superpower hai. Zomato ka live order tracking, Swiggy ki delivery updates, UPI payment status — sab SSE se kaam karta hai. Spring MVC mein yeh karna bahut mushkil tha. WebFlux mein ek line hai.

```java
@RestController
@RequestMapping("/api/orders")
public class OrderStreamController {

    private final OrderService orderService;

    public OrderStreamController(OrderService orderService) {
        this.orderService = orderService;
    }

    // Ek order ka live status stream karo
    // Client ko har update milega jab bhi status change ho
    @GetMapping(
        value = "/{orderId}/status-stream",
        produces = MediaType.TEXT_EVENT_STREAM_VALUE  // ye magic annotation hai
    )
    public Flux<OrderStatus> streamOrderStatus(@PathVariable Long orderId) {
        return orderService.getStatusStream(orderId)
            // Sirf jab status change ho tab emit karo
            .distinctUntilChanged()
            // "DELIVERED" aane ke baad stream band karo
            .takeUntil(status -> status == OrderStatus.DELIVERED);
    }

    // Live prices stream — share market ya restaurant menu prices
    @GetMapping(
        value = "/live-feed",
        produces = MediaType.TEXT_EVENT_STREAM_VALUE
    )
    public Flux<OrderUpdate> liveFeed() {
        return orderService.getGlobalFeed()
            .delayElements(Duration.ofMillis(500)); // throttle karo
    }

    // Server-Sent Event object ke saath — ID aur event type bhi bhejo
    @GetMapping(
        value = "/{orderId}/sse",
        produces = MediaType.TEXT_EVENT_STREAM_VALUE
    )
    public Flux<ServerSentEvent<OrderStatus>> streamAsSse(@PathVariable Long orderId) {
        return orderService.getStatusStream(orderId)
            .map(status -> ServerSentEvent.<OrderStatus>builder()
                .id(UUID.randomUUID().toString())
                .event("order-update")  // event type
                .data(status)
                .build()
            );
    }
}
```

**Frontend TypeScript se connect karo:**
```typescript
// Browser side
const eventSource = new EventSource('/api/orders/123/status-stream');

eventSource.addEventListener('order-update', (event) => {
    const status = JSON.parse(event.data);
    console.log('Order status:', status);
});

eventSource.onerror = () => {
    console.log('Connection closed ya error');
};
```

> [!tip] SSE ka ek bada fayda yeh hai ki yeh HTTP ke upar kaam karta hai — no WebSocket handshake needed, firewall-friendly, aur automatic reconnection browser mein built-in hai.

---

## WebSocket Support

SSE one-way tha (server → client). WebSocket two-way hai — Swiggy mein delivery boy ki location update, CRED mein live chat support.

```java
@Configuration
@EnableWebFlux
public class WebSocketConfig {

    @Bean
    public HandlerMapping webSocketMapping(ChatHandler handler) {
        Map<String, WebSocketHandler> map = new HashMap<>();
        map.put("/ws/chat/{roomId}", handler);

        SimpleUrlHandlerMapping mapping = new SimpleUrlHandlerMapping();
        mapping.setUrlMap(map);
        mapping.setOrder(-1);
        return mapping;
    }

    @Bean
    public WebSocketHandlerAdapter handlerAdapter() {
        return new WebSocketHandlerAdapter();
    }
}

@Component
public class ChatHandler implements WebSocketHandler {

    @Override
    public Mono<Void> handle(WebSocketSession session) {
        // Client se messages receive karo aur echo karo
        Flux<WebSocketMessage> output = session.receive()
            .map(WebSocketMessage::getPayloadAsText)
            .map(msg -> "Echo: " + msg)
            .map(session::textMessage);

        return session.send(output);
    }
}
```

---

## Error Handling — Production Ready Code

Beginner log sirf happy path likhte hain. Pro log errors properly handle karte hain.

```java
@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService service;

    @GetMapping("/{id}")
    public Mono<ResponseEntity<OrderDto>> getOrder(@PathVariable Long id) {
        return service.findById(id)
            .map(ResponseEntity::ok)
            // 404 handle karo
            .switchIfEmpty(Mono.just(ResponseEntity.<OrderDto>notFound().build()))
            // Unexpected errors ke liye
            .onErrorResume(OrderProcessingException.class, e ->
                Mono.just(ResponseEntity.<OrderDto>status(HttpStatus.UNPROCESSABLE_ENTITY).build())
            );
    }
}

// Global error handler — @ExceptionHandler WebFlux mein bhi kaam karta hai
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(OrderNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public Mono<ErrorResponse> handleNotFound(OrderNotFoundException ex) {
        return Mono.just(new ErrorResponse(
            "ORDER_NOT_FOUND",
            ex.getMessage(),
            LocalDateTime.now()
        ));
    }

    @ExceptionHandler(ValidationException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Mono<ErrorResponse> handleValidation(ValidationException ex) {
        return Mono.just(new ErrorResponse(
            "VALIDATION_FAILED",
            ex.getMessage(),
            LocalDateTime.now()
        ));
    }
}
```

---

## Testing — WebTestClient

JUnit tests likhne ka tarika WebFlux mein thoda alag hai. `MockMvc` ki jagah `WebTestClient` use hota hai.

```java
@WebFluxTest(RestaurantController.class)
class RestaurantControllerTest {

    @Autowired
    private WebTestClient webTestClient;  // auto-configured by @WebFluxTest

    @MockBean
    private RestaurantService service;

    @Test
    void shouldReturnRestaurantById() {
        // Arrange — mock setup
        Restaurant mockRestaurant = new Restaurant(1L, "Barbeque Nation", "Delhi", "BBQ", true);
        when(service.findById(1L)).thenReturn(Mono.just(mockRestaurant));

        // Act + Assert — ek chain mein
        webTestClient.get()
            .uri("/api/restaurants/1")
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk()
            .expectBody(Restaurant.class)
            .value(r -> {
                assertThat(r.getName()).isEqualTo("Barbeque Nation");
                assertThat(r.getCity()).isEqualTo("Delhi");
            });
    }

    @Test
    void shouldReturn404WhenRestaurantNotFound() {
        when(service.findById(999L))
            .thenReturn(Mono.error(new RestaurantNotFoundException("Nahi mila")));

        webTestClient.get()
            .uri("/api/restaurants/999")
            .exchange()
            .expectStatus().isNotFound();
    }

    @Test
    void shouldReturnAllRestaurantsAsFlux() {
        List<Restaurant> restaurants = List.of(
            new Restaurant(1L, "Barbeque Nation", "Delhi", "BBQ", true),
            new Restaurant(2L, "Haldiram's", "Delhi", "Indian", true)
        );
        when(service.findAll()).thenReturn(Flux.fromIterable(restaurants));

        webTestClient.get()
            .uri("/api/restaurants")
            .exchange()
            .expectStatus().isOk()
            .expectBodyList(Restaurant.class)
            .hasSize(2);
    }

    @Test
    void shouldCreateRestaurant() {
        CreateRestaurantDto dto = new CreateRestaurantDto("Dosa Plaza", "Mumbai", "South Indian");
        Restaurant created = new Restaurant(10L, "Dosa Plaza", "Mumbai", "South Indian", true);

        when(service.create(any())).thenReturn(Mono.just(created));

        webTestClient.post()
            .uri("/api/restaurants")
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(dto)
            .exchange()
            .expectStatus().isCreated()
            .expectHeader().exists("Location")
            .expectBody(Restaurant.class)
            .value(r -> assertThat(r.getId()).isEqualTo(10L));
    }

    @Test
    void shouldStreamOrderStatus() {
        // SSE testing
        Flux<OrderStatus> statusStream = Flux.just(
            OrderStatus.PLACED, OrderStatus.PREPARING, OrderStatus.OUT_FOR_DELIVERY
        ).delayElements(Duration.ofMillis(100));

        when(orderService.getStatusStream(1L)).thenReturn(statusStream);

        webTestClient.get()
            .uri("/api/orders/1/status-stream")
            .accept(MediaType.TEXT_EVENT_STREAM)
            .exchange()
            .expectStatus().isOk()
            .expectBodyList(OrderStatus.class)
            .hasSize(3);
    }
}

// StepVerifier — Reactor pipelines ko unit test karo
class RestaurantServiceTest {

    @Test
    void shouldFetchMultipleRestaurants() {
        Flux<String> names = Flux.just("Zomato Cafe", "Swiggy Kitchen", "Blinkit Store");

        // StepVerifier se step by step verify karo
        StepVerifier.create(names)
            .expectNext("Zomato Cafe")
            .expectNext("Swiggy Kitchen")
            .expectNext("Blinkit Store")
            .expectComplete()
            .verify();
    }
}
```

---

## Common Gotchas — Jo Galtiyan Sabse Zyada Hoti Hain

### 1. `.block()` Event Loop Pe Mat Bulao

```java
// GALAT — event loop thread block ho jaayega, throughput crash
@GetMapping("/bad")
public Mono<String> badHandler() {
    String result = someService.getData().block(); // KABHI MAT KARO
    return Mono.just(result);
}

// SAHI — chain karo
@GetMapping("/good")
public Mono<String> goodHandler() {
    return someService.getData();
}
```

> [!danger] `.block()` sirf tests mein aur `CommandLineRunner` / `@PostConstruct` mein use karo. Production handlers mein kabhi nahi.

### 2. Subscribe Mat Karo Manually Handler Mein

```java
// GALAT — tum subscribe kar rahe ho, Spring subscribe nahi kar payega
@GetMapping("/bad")
public void badHandler() {
    service.process().subscribe(); // Yeh wrong hai — response kaun bhejega?
}

// SAHI — Mono/Flux return karo, Spring subscribe karta hai
@GetMapping("/good")
public Mono<Void> goodHandler() {
    return service.process();
}
```

### 3. JPA Aur WebFlux Mix — Invisible Performance Killer

```java
// GALAT — JPA blocking hai, event loop stuck ho jaayega
@GetMapping("/restaurants/{id}")
public Mono<Restaurant> badApproach(@PathVariable Long id) {
    return Mono.just(jpaRepository.findById(id).orElseThrow());
    // Yeh event loop thread ko block karta hai!
}

// ACCEPTABLE (temporary workaround)
@GetMapping("/restaurants/{id}")
public Mono<Restaurant> okApproach(@PathVariable Long id) {
    return Mono.fromCallable(() -> jpaRepository.findById(id).orElseThrow())
        .subscribeOn(Schedulers.boundedElastic()); // alag thread pool pe
}

// BEST — R2DBC use karo
@GetMapping("/restaurants/{id}")
public Mono<Restaurant> bestApproach(@PathVariable Long id) {
    return r2dbcRepository.findById(id)
        .switchIfEmpty(Mono.error(new NotFoundException()));
}
```

### 4. `web` aur `webflux` Dependencies Mix

```xml
<!-- GALAT — Spring MVC jeet jaata hai silently -->
<dependency>spring-boot-starter-web</dependency>
<dependency>spring-boot-starter-webflux</dependency>

<!-- SAHI — sirf ek choose karo -->
<dependency>spring-boot-starter-webflux</dependency>
```

### 5. Error Ko Swallow Karna

```java
// GALAT — error khatam ho gayi, user ko kuch nahi pata
Mono<Restaurant> bad = findById(id)
    .onErrorReturn(null); // null return? REST mein null body badiya nahi hai

// SAHI — proper error propagation
Mono<Restaurant> good = findById(id)
    .onErrorMap(DatabaseException.class,
        e -> new ServiceUnavailableException("DB down hai", e));
```

### 6. Cold vs Hot — Gotcha

```java
// Cold Flux — har subscriber ke liye fresh start
Flux<Integer> cold = Flux.range(1, 5);
// Pehla subscriber: 1,2,3,4,5
// Doosra subscriber: bhi 1,2,3,4,5 (same sequence)

// Hot Flux — sab subscribers ek hi stream share karte hain
// (SSE, WebSocket — sab ko same data milta hai)
Sinks.Many<String> sink = Sinks.many().multicast().onBackpressureBuffer();
Flux<String> hot = sink.asFlux();
sink.tryEmitNext("Zomato order");
```

### 7. `ThreadLocal` / MDC Kaam Nahi Karta Jaisa Sochte Ho

```java
// GALAT — reactive chain multiple threads pe hop karta hai,
// MDC (logging context) ek thread pe set hua tha, doosre thread pe gayab ho jaayega
MDC.put("orderId", orderId);
return service.process(orderId); // yeh callback kisi aur thread pe chal sakta hai — MDC khali milega

// SAHI — Reactor Context use karo, ThreadLocal nahi
return service.process(orderId)
    .contextWrite(Context.of("orderId", orderId));
    // Context har operator ke saath chain hota hai, thread badle toh bhi data saath rehta hai
```

> [!warning] Yeh Node.js developers ke liye sabse bada mental-model shift hai. Node mein ek request = ek continuous execution, toh `AsyncLocalStorage` jaisa kuch simple lagta hai. Java reactive mein ek request literal 5-6 alag threads pe hop kar sakta hai (event loop → boundedElastic → parallel → wapas event loop). Isliye plain `ThreadLocal` reactive code mein bharosemand nahi hai — hamesha `Context` use karo request-scoped data ke liye (jaise traceId, userId logging ke liye).

---

## Kab WebFlux Choose Karo? Kab MVC?

### WebFlux ka Use Karo — Jab

- **API Gateway / Proxy service** — Zomato backend kai services ko aggregate karta hai (restaurant service, menu service, delivery service). Har request mein multiple downstream calls. WebFlux inhe parallel mein karta hai without blocking.
- **SSE / WebSocket** — Live order tracking, real-time notifications, stock prices
- **High concurrency, I/O-bound** — 10,000 concurrent users sab external APIs call kar rahe hain
- **Spring Cloud Gateway** — yeh already WebFlux pe built hai
- **Streaming large data** — report generation, file downloads as stream

### Spring MVC ka Use Karo — Jab

- **Standard CRUD** — User, Product, Order — simple database operations
- **Small team** — Reactive debugging bahut mushkil hai, stack traces confusing hote hain
- **Existing JPA codebase** — Migrate karna risky hai
- **CPU-bound work** — Image processing, PDF generation — threads hi bottleneck nahi hain, async kuch nahi karega

> [!info] **Rule of Thumb**: Agar tumhare service mein ek request ke liye **multiple external I/O calls** hain (3+ DB queries, 2+ HTTP calls) aur concurrency high hai — WebFlux worth it hai. Simple CRUD ke liye MVC simpler hai aur equally fast.

---

## Backpressure — Ek Important Concept

Reactive programming ka ek aur concept hai jo Node.js mein usually implicit hota hai — **backpressure**. Matlab: agar producer (data source) consumer (subscriber) se tez ho, toh kya karo?

```java
// Backpressure strategies
Flux<Order> orders = orderRepository.findAll();

// DROP — overflow hone par naye items drop karo
orders
    .onBackpressureDrop(dropped -> log.warn("Dropped: {}", dropped))
    .subscribe(this::processOrder);

// BUFFER — ek buffer mein rakho
orders
    .onBackpressureBuffer(1000) // max 1000 items buffer karo
    .subscribe(this::processOrder);

// LATEST — sirf latest item rakho
orders
    .onBackpressureLatest()
    .subscribe(this::processOrder);
```

---

## Key Takeaways

- **WebFlux Node.js ka JVM cousin hai** — same non-blocking, event-loop model. Tum `Promise` se `Mono` aur `Observable` se `Flux` samjho.
- **`Mono<T>` = single item** (0 ya 1), **`Flux<T>` = multiple items** (0 to N). Yeh do types hi WebFlux ka foundation hain.
- **Kabhi `.block()` production handler mein mat karo** — event loop crash ho jaata hai. Sirf tests mein use karo.
- **JPA + WebFlux = Anti-pattern** — JPA blocking hai. Proper WebFlux ke liye R2DBC use karo. Workaround chahiye toh `Schedulers.boundedElastic()` pe isolate karo.
- **`subscribeOn` vs `publishOn`** — dono thread switch karte hain, par `subscribeOn` poore chain ka source thread decide karta hai, `publishOn` sirf usse aage ka. Blocking legacy code ko `boundedElastic` pe isolate karne ke liye yeh zaruri hai.
- **`ThreadLocal`/MDC bharosemand nahi hai reactive chains mein** — request multiple threads pe hop karta hai. Request-scoped data (traceId, userId) ke liye Reactor `Context` use karo.
- **`web` aur `webflux` dono mat add karo** — Spring Boot MVC choose karega silently.
- **SSE aur WebSocket** mein WebFlux MVC se kaafi behtar hai — yeh WebFlux ka real sweet spot hai.
- **Annotated controllers aur functional routing** dono available hain — apni team ki preference ke hisaab se choose karo.
- **Testing ke liye `WebTestClient`** use karo, `MockMvc` nahi. Reactive pipelines ke liye `StepVerifier`.
- **WebFlux magical nahi hai** — sirf tab use karo jab I/O-bound high-concurrency workload ho. Simple CRUD ke liye MVC hi better choice hai.
- **Operators sikhne mein time lagta hai** — `map`, `flatMap`, `zip`, `switchIfEmpty`, `onErrorResume` — yeh sab commonly use hote hain, inhe yaad karo.
