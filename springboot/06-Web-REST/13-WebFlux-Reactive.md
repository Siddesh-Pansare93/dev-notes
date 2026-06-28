---
tags: [web, webflux, reactive, reactor, mono, flux, scalability]
aliases: [WebFlux, Spring WebFlux, Reactive Spring]
stage: advanced
---

# Spring WebFlux (Reactive Stack)

> [!info] For the Express/TS dev
> Express is already non-blocking by default — every `async` handler returns a promise and the event loop scales naturally. The JVM's classic Spring MVC is the opposite: one OS thread per request. **WebFlux** brings the Node-style model to Spring: a small event-loop thread pool (Netty) handles thousands of concurrent requests via `Mono`/`Flux` (≈ `Promise` / `Observable`).

## Concept — MVC vs WebFlux

| | Spring MVC | Spring WebFlux |
|---|---|---|
| Server | Tomcat (servlet) | Netty (default) |
| Threading | Thread-per-request | Small event-loop pool |
| Return types | `User`, `ResponseEntity<User>` | `Mono<User>`, `Flux<User>` |
| DB driver | JDBC (blocking) | R2DBC (non-blocking) |
| HTTP client | RestClient/RestTemplate | WebClient |
| Best for | CRUD APIs, simple flows | High-fanout I/O, streaming, SSE, proxies |

**Rule of thumb**: don't reach for WebFlux just because "async = faster". You only win when you're I/O-bound and have many concurrent connections. For CPU-bound or low-traffic services, MVC is simpler and equally fast.

## Dependencies

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-webflux</artifactId>
</dependency>
```

> [!warning] Don't mix `spring-boot-starter-web` and `spring-boot-starter-webflux` — Boot picks MVC and silently ignores WebFlux config.

## Annotated controller (looks familiar)

```java
@RestController
@RequestMapping("/api/users")
public class UserController {
    private final UserService service;

    @GetMapping("/{id}")
    public Mono<User> get(@PathVariable Long id) {
        return service.findById(id);
    }

    @GetMapping
    public Flux<User> list() {
        return service.findAll();
    }

    @PostMapping
    public Mono<ResponseEntity<User>> create(@RequestBody @Valid Mono<UserDto> body) {
        return body.flatMap(service::create)
                   .map(u -> ResponseEntity.created(URI.create("/api/users/" + u.id())).body(u));
    }
}
```

## Functional router (alternative style)

```java
@Bean
public RouterFunction<ServerResponse> routes(UserHandler h) {
    return route(GET("/api/users/{id}"), h::get)
        .andRoute(GET("/api/users"), h::list);
}
```

Closer to Express `app.get(...)` — pick whichever style your team prefers.

## Reactor cheat sheet

| Reactor | TypeScript / RxJS |
|---|---|
| `Mono<T>` | `Promise<T>` |
| `Flux<T>` | `Observable<T>` / async iterable |
| `.map(fn)` | `.then(fn)` / `array.map` |
| `.flatMap(fn)` | chained `.then` returning a promise |
| `.filter(p)` | `.filter` |
| `.zip(a, b)` | `Promise.all([a, b])` |
| `.subscribeOn(scheduler)` | thread/executor choice |
| `.block()` | `await` (use sparingly!) |

> [!danger] Never call `.block()` inside a WebFlux handler — it pins the event-loop thread and crashes throughput. Reserve it for tests and `CommandLineRunner`.

## WebClient (the reactive HTTP client)

```java
WebClient client = WebClient.builder()
    .baseUrl("https://api.example.com")
    .build();

Mono<Order> order = client.get()
    .uri("/orders/{id}", id)
    .retrieve()
    .bodyToMono(Order.class);
```

See [[11-WebClient-RestTemplate]].

## Persistence — R2DBC, not JPA

JPA/Hibernate is blocking; using it in WebFlux silently destroys your throughput. Use **Spring Data R2DBC** for reactive SQL:

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-r2dbc</artifactId>
</dependency>
<dependency>
    <groupId>io.r2dbc</groupId>
    <artifactId>r2dbc-postgresql</artifactId>
</dependency>
```

```java
public interface UserRepository extends ReactiveCrudRepository<User, Long> {
    Flux<User> findByActive(boolean active);
}
```

If you must use JPA from WebFlux, isolate the blocking calls on a bounded scheduler:

```java
Mono.fromCallable(() -> jpaRepo.findById(id))
    .subscribeOn(Schedulers.boundedElastic());
```

## Server-Sent Events / streaming

```java
@GetMapping(value = "/prices", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
public Flux<Price> stream() {
    return priceService.stream()       // Flux<Price>
                       .delayElements(Duration.ofSeconds(1));
}
```

This is where WebFlux really shines vs MVC.

## Testing — WebTestClient

```java
@WebFluxTest(UserController.class)
class UserControllerTest {
    @Autowired WebTestClient client;
    @MockBean UserService service;

    @Test void getsUser() {
        when(service.findById(1L)).thenReturn(Mono.just(new User(1L, "Ada")));
        client.get().uri("/api/users/1")
              .exchange()
              .expectStatus().isOk()
              .expectBody(User.class).value(u -> assertThat(u.name()).isEqualTo("Ada"));
    }
}
```

See [[../09-Testing/05-MockMvc-and-WebTestClient]].

## When to choose WebFlux

✅ Good fit
- Gateway/proxy services aggregating many downstream calls
- Streaming endpoints (SSE, WebSocket, long-poll)
- High-concurrency, low-CPU workloads
- You're already invested in Reactor (e.g. Spring Cloud Gateway)

❌ Bad fit
- Standard CRUD over JPA — you'd just wrap blocking calls
- Small team unfamiliar with reactive — debugging stack traces is painful
- Heavy CPU work — reactive doesn't help, threads aren't the bottleneck

## Related
- [[11-WebClient-RestTemplate]] — reactive HTTP client
- [[../10-Microservices/04-API-Gateway-Spring-Cloud-Gateway]] — built on WebFlux
- [[../09-Testing/05-MockMvc-and-WebTestClient]]
- [[../14-Ecosystem/01-Library-Cheatsheet]] — Project Reactor entry
- [[../02-Java-vs-TypeScript/03-Async-Concurrency]]
