---
tags: [java, typescript, async, concurrency, threads, virtual-threads, foundation]
aliases: [Async Java, Virtual Threads, CompletableFuture, Concurrency Model]
stage: foundation
---

# Async & Concurrency: Node Event Loop vs Java Threads

> [!info] For the Express/TS dev
> Node.js is single-threaded with an event loop and a thread pool for I/O. Java is multi-threaded by default — every request gets its own OS thread. Since JDK 21, Java also has **virtual threads** (Project Loom), which give you the ergonomics of `async/await` *without* writing `async` anywhere. This is the single most important thing to understand for backend Java.

## The two execution models

```
Node.js:                    Java (traditional):
┌──────────────┐            ┌────────┐ ┌────────┐ ┌────────┐
│  Event loop  │            │Thread 1│ │Thread 2│ │Thread N│
│   (1 core)   │            │  req A │ │  req B │ │  req C │
└──────┬───────┘            └────┬───┘ └───┬────┘ └───┬────┘
       │ libuv thread pool        └──── shared heap ───┘
       │ for fs/dns/crypto
       ▼
   ┌──────┐
   │ pool │ (4 by default)
   └──────┘
```

In Node, blocking the loop blocks *everything*. In Java, blocking a thread blocks only that one — but threads cost ~1 MB of stack each, so you cap out around 5,000–10,000 threads per JVM.

## Virtual threads (JDK 21+) — the game changer

Virtual threads are **JVM-managed lightweight threads** mounted on top of a small pool of OS threads. They behave like regular threads but cost ~1 KB instead of ~1 MB. Millions can exist simultaneously.

```java
// Spring Boot 3.2+ with JDK 21 — flip ONE flag in application.yml:
spring:
  threads:
    virtual:
      enabled: true
```

Now every HTTP request runs on a virtual thread. You write **plain blocking code** — `jdbcTemplate.query(...)`, `restClient.get(...)` — and the JVM unmounts the virtual thread when it hits a blocking syscall, freeing the carrier thread for other work. **This is async/await without the colour.**

```java
// Looks synchronous, behaves async — virtual thread suspends transparently
@GetMapping("/orders/{id}")
public Order getOrder(@PathVariable Long id) {
    User user = userClient.fetch(id);          // blocks virtual thread, not OS thread
    List<Item> items = itemRepo.findByUser(id); // ditto
    return new Order(user, items);
}
```

> [!tip] If you start a Spring Boot project today, target JDK 21 and turn on virtual threads.
> You get the simplicity of synchronous code and the throughput of reactive code. Reactor / WebFlux is still useful for streaming and backpressure, but for typical REST APIs, virtual threads have made it largely optional.

## CompletableFuture vs Promise

`CompletableFuture<T>` is Java's `Promise<T>`. The shape is the same — values arrive later, you chain transforms, you handle errors. The API is more verbose.

```ts
// TypeScript
async function getUserOrder(userId: string) {
    const [user, orders] = await Promise.all([
        fetchUser(userId),
        fetchOrders(userId),
    ]);
    return { user, orders };
}
```

```java
// Java
public CompletableFuture<UserOrder> getUserOrder(String userId) {
    CompletableFuture<User>       userF   = fetchUser(userId);
    CompletableFuture<List<Order>> orderF = fetchOrders(userId);
    return userF.thenCombine(orderF, UserOrder::new);
}

// Or with allOf for N futures:
CompletableFuture.allOf(userF, orderF)
    .thenApply(v -> new UserOrder(userF.join(), orderF.join()));
```

### The Promise ↔ CompletableFuture method map

| TypeScript                      | CompletableFuture                              |
| ------------------------------- | ---------------------------------------------- |
| `new Promise((res, rej) => …)`  | `new CompletableFuture<>()` + `complete()` / `completeExceptionally()` |
| `Promise.resolve(x)`            | `CompletableFuture.completedFuture(x)`         |
| `Promise.reject(e)`             | `CompletableFuture.failedFuture(e)`            |
| `.then(f)` (sync transform)     | `.thenApply(f)`                                |
| `.then(f)` (returns promise)    | `.thenCompose(f)`                              |
| `.then(undefined, f)` / `.catch`| `.exceptionally(f)` / `.handle((v, e) -> …)`   |
| `.finally(f)`                   | `.whenComplete((v, e) -> f())`                 |
| `Promise.all([a, b])`           | `CompletableFuture.allOf(a, b)`                |
| `Promise.race([a, b])`          | `CompletableFuture.anyOf(a, b)`                |
| `Promise.allSettled`            | Manually with `handle` then `allOf`            |
| `await p`                       | `p.get()` (checked) / `p.join()` (unchecked)   |

> [!warning] `.get()` and `.join()` BLOCK the calling thread.
> Never call them on the request thread of a non-virtual-thread app — you'll defeat the point. Inside a virtual thread, blocking is fine.

## Reactor: `Mono` and `Flux`

Spring WebFlux uses Project Reactor. `Mono<T>` ≈ a `Promise<T>` that emits 0 or 1 value. `Flux<T>` ≈ a typed observable that emits 0..N values with backpressure (no JS equivalent — RxJS is closest).

```java
@GetMapping("/users/{id}")
public Mono<User> getUser(@PathVariable String id) {
    return userRepo.findById(id)             // Mono<User>
        .flatMap(u -> enrich(u))             // chain
        .switchIfEmpty(Mono.error(new NotFound()));
}
```

Use Reactor when you need backpressure-aware streaming (server-sent events, large result sets, message pipelines). For typical CRUD APIs on JDK 21+, virtual threads are simpler.

## Threading primitives reference

| TS / Node                 | Java                                              |
| ------------------------- | ------------------------------------------------- |
| `setTimeout(fn, ms)`      | `Executors.newScheduledThreadPool(1).schedule(...)` |
| `setImmediate(fn)`        | `CompletableFuture.runAsync(fn)`                  |
| `worker_threads`          | `Thread`, `ExecutorService`                       |
| `cluster`                 | Multiple JVM processes (fronted by load balancer) |
| Mutex (e.g. `async-mutex`)| `synchronized` block, `ReentrantLock`             |
| Atomics                   | `AtomicInteger`, `AtomicReference`, etc.          |
| `EventTarget` / `EventEmitter` | `ApplicationEvent` + `@EventListener`        |
| Queue                     | `BlockingQueue`, `LinkedBlockingDeque`            |

## ExecutorService — Java's "thread pool, please"

```java
// Old style — fixed pool of platform threads
ExecutorService pool = Executors.newFixedThreadPool(10);
Future<String> f = pool.submit(() -> heavyWork());

// JDK 21 — virtual threads, unlimited
ExecutorService pool = Executors.newVirtualThreadPerTaskExecutor();
```

Wrap in try-with-resources (JDK 19+):

```java
try (var pool = Executors.newVirtualThreadPerTaskExecutor()) {
    pool.submit(() -> task1());
    pool.submit(() -> task2());
} // shuts down + waits for completion
```

## Structured concurrency (preview / JDK 21+)

The `StructuredTaskScope` API lets you fan out tasks and treat them as a unit — like `Promise.all` with cancellation propagation:

```java
try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
    Subtask<User>        userT  = scope.fork(() -> fetchUser(id));
    Subtask<List<Order>> orderT = scope.fork(() -> fetchOrders(id));
    scope.join().throwIfFailed();
    return new UserOrder(userT.get(), orderT.get());
}
```

If either subtask fails, the other is cancelled. This is the Java equivalent of `Promise.all` with proper error semantics.

## TypeScript ↔ Java concurrency comparison

| Concept                | Node.js / TS                          | Java                                                   |
| ---------------------- | ------------------------------------- | ------------------------------------------------------ |
| Default model          | Single-threaded event loop            | Multi-threaded; one OS thread per request              |
| Lightweight tasks      | Promises on the loop                  | Virtual threads (JDK 21+) or `CompletableFuture`       |
| CPU-bound work         | `worker_threads`                      | Just spawn a thread / use `ForkJoinPool`               |
| Blocking I/O           | Don't — wraps to async                | Fine on a virtual thread; bad on a platform thread     |
| Backpressure           | Streams (`pipe`, `pipeline`)          | Reactor `Flux` / Reactive Streams                      |
| Cancellation           | `AbortController`                     | `Thread.interrupt()`, `Future.cancel(true)`            |
| Shared mutable state   | Rare (single thread)                  | Common — needs `synchronized` / `Atomic*` / `Lock`     |
| Thread-local context   | `AsyncLocalStorage`                   | `ThreadLocal<T>`, `ScopedValue<T>` (JDK 21 preview)    |

## Code example — three ways to fan out HTTP calls

```java
record Combined(User user, List<Order> orders) {}

// 1. Plain blocking — fine on virtual threads
public Combined classic(String id) {
    return new Combined(userClient.fetch(id), orderClient.list(id));
}

// 2. CompletableFuture — explicit async
public CompletableFuture<Combined> withFutures(String id) {
    var u = CompletableFuture.supplyAsync(() -> userClient.fetch(id));
    var o = CompletableFuture.supplyAsync(() -> orderClient.list(id));
    return u.thenCombine(o, Combined::new);
}

// 3. Structured concurrency — JDK 21
public Combined structured(String id) throws Exception {
    try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
        var u = scope.fork(() -> userClient.fetch(id));
        var o = scope.fork(() -> orderClient.list(id));
        scope.join().throwIfFailed();
        return new Combined(u.get(), o.get());
    }
}
```

## Gotchas

> [!warning] Concurrency footguns
> - **`synchronized` and virtual threads**: a virtual thread inside `synchronized` *pins* to its carrier — defeats the model. Use `ReentrantLock` instead.
> - **`ThreadLocal` leaks**: long-lived pools + `ThreadLocal` = memory leaks. Always `remove()` in `finally`. Prefer `ScopedValue`.
> - **Shared mutable state**: any field accessed from multiple threads needs `volatile`, atomic, or a lock. There's no "single-threaded by default" safety net.
> - **`Future.get()` without timeout** can deadlock forever. Always pass a timeout.
> - **Don't `Thread.sleep()` on the request thread** — even on virtual threads it works, but use scheduled executors instead.
> - **`@Async` requires `@EnableAsync`** in Spring, and the method must be on a Spring bean called from *outside* the same class (proxy limitation).

## Related

- [[01-Mental-Model-Map]]
- [[02-Type-System-Differences]]
- [[Virtual-Threads]]
- [[Project-Reactor]]
- [[Spring-Async]]
