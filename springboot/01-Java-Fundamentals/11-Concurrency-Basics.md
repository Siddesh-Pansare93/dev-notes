---
tags: [java, fundamentals, concurrency, threads, async]
aliases: [Threads, ExecutorService, CompletableFuture, Concurrency, Virtual Threads]
stage: foundation
---

# Concurrency Basics

> [!info] For the Express/TS dev
> Node is single-threaded with an event loop; you never reach for "threads" because everything is async I/O. Java is the opposite: it has **real OS threads**, a shared mutable heap, and full preemptive multitasking. Async code is built around `CompletableFuture` (~JS `Promise`) plus `ExecutorService` (a thread pool). Java 21 added **virtual threads** — millions of lightweight threads that map onto few OS threads, finally giving Java something close to Node's "just write blocking code, the runtime handles it" experience.

## Concept

### `Thread` (low-level, rarely used directly)

```java
Thread t = new Thread(() -> {
    System.out.println("hello from " + Thread.currentThread().getName());
});
t.start();          // schedules the thread
t.join();           // wait for completion
```

Don't write `new Thread(...)` in production code. Use an `ExecutorService`.

### `ExecutorService` — thread pools

```java
import java.util.concurrent.*;

ExecutorService pool = Executors.newFixedThreadPool(4);

Future<Integer> f = pool.submit(() -> {
    Thread.sleep(100);
    return 42;
});

int result = f.get();        // blocking — waits for completion
pool.shutdown();
```

Common factories:

- `Executors.newFixedThreadPool(n)` — n worker threads
- `Executors.newCachedThreadPool()` — grows on demand
- `Executors.newSingleThreadExecutor()` — serialized
- `Executors.newScheduledThreadPool(n)` — for cron-like delayed tasks
- `Executors.newVirtualThreadPerTaskExecutor()` — Java 21+, virtual threads

### `CompletableFuture` — the `Promise` of Java

```java
CompletableFuture<String> cf = CompletableFuture.supplyAsync(() -> fetchUser(id));

cf.thenApply(User::getName)              // .then(name => ...)
  .thenAccept(System.out::println)       // .then(name => print)
  .exceptionally(ex -> {                 // .catch(...)
      log.error("oops", ex);
      return null;
  });

// Combine
CompletableFuture<User>    u = CompletableFuture.supplyAsync(() -> loadUser(1));
CompletableFuture<Account> a = CompletableFuture.supplyAsync(() -> loadAccount(1));

CompletableFuture<String> combined = u.thenCombine(a,
    (user, acct) -> user.name() + ":" + acct.balance());

// Wait for all (Promise.all)
CompletableFuture.allOf(u, a).join();

// Race (Promise.race)
CompletableFuture.anyOf(u, a);
```

### Virtual threads (Java 21+)

```java
try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
    var future = executor.submit(() -> {
        // blocking I/O is now cheap
        Thread.sleep(1000);
        return "done";
    });
    System.out.println(future.get());
}
```

Spring Boot 3.2+ can be flipped to virtual threads with one property — every request gets its own virtual thread. This is the future of Java server concurrency.

### Synchronization

Shared mutable state needs coordination:

```java
private final Object lock = new Object();
private int counter = 0;

public void increment() {
    synchronized (lock) {            // mutual exclusion
        counter++;
    }
}
```

Better — use atomics or concurrent collections:

```java
AtomicInteger counter = new AtomicInteger();
counter.incrementAndGet();

ConcurrentHashMap<String, Integer> map = new ConcurrentHashMap<>();
```

### `volatile`

Marks a field so writes are visible across threads (no caching). Use only for simple flags:

```java
private volatile boolean running = true;
```

For anything more complex, use `Atomic*` or locks.

## TypeScript ↔ Java comparison

| Node / TypeScript                          | Java                                                |
| ------------------------------------------ | --------------------------------------------------- |
| Single thread + event loop                 | Many threads + shared heap                          |
| `async function() { }`                     | `CompletableFuture.supplyAsync(...)`                |
| `await fn()`                               | `cf.get()` (blocks) / `cf.join()` / `.thenApply`    |
| `Promise.all([...])`                       | `CompletableFuture.allOf(...)`                      |
| `Promise.race([...])`                      | `CompletableFuture.anyOf(...)`                      |
| `setTimeout`                               | `ScheduledExecutorService.schedule`                 |
| Worker threads                             | `ExecutorService`                                   |
| No data races (single thread)              | Must synchronize / use atomics                      |
| `node:async_hooks`                         | `ThreadLocal`, virtual threads                      |
| —                                          | Virtual threads (Java 21) ≈ "free async"            |

## Code example

```java
package com.example.async;

import java.net.URI;
import java.net.http.*;
import java.util.List;
import java.util.concurrent.*;

public class Fetcher {
    private final HttpClient http = HttpClient.newHttpClient();

    public CompletableFuture<String> fetch(String url) {
        return http.sendAsync(
            HttpRequest.newBuilder(URI.create(url)).build(),
            HttpResponse.BodyHandlers.ofString()
        ).thenApply(HttpResponse::body);
    }

    public List<String> fetchAll(List<String> urls) {
        // Kick off all in parallel
        List<CompletableFuture<String>> futures = urls.stream()
            .map(this::fetch)
            .toList();

        // Wait for all, collect results
        return CompletableFuture.allOf(futures.toArray(CompletableFuture[]::new))
            .thenApply(v -> futures.stream().map(CompletableFuture::join).toList())
            .join();
    }

    // Java 21 virtual threads — looks blocking, scales like async
    public List<String> fetchAllVirtual(List<String> urls) throws Exception {
        try (var pool = Executors.newVirtualThreadPerTaskExecutor()) {
            List<Future<String>> tasks = urls.stream()
                .map(u -> pool.submit(() -> http.send(
                    HttpRequest.newBuilder(URI.create(u)).build(),
                    HttpResponse.BodyHandlers.ofString()).body()))
                .toList();

            return tasks.stream().map(f -> {
                try { return f.get(); }
                catch (Exception e) { throw new RuntimeException(e); }
            }).toList();
        }
    }
}
```

## Gotchas

> [!warning] `.get()` is blocking
> Mixing `.get()` inside other futures defeats async. Stay in chains: `thenApply` / `thenCompose` / `thenCombine`.

> [!warning] Always `.shutdown()` your pool
> Otherwise the JVM never exits — non-daemon threads keep it alive. Use try-with-resources (`ExecutorService` is `AutoCloseable` in Java 19+).

> [!warning] `InterruptedException` etiquette
> When you catch it, **either rethrow or restore the interrupt**:
> ```java
> catch (InterruptedException e) {
>     Thread.currentThread().interrupt();
>     throw new RuntimeException(e);
> }
> ```

> [!warning] Don't synchronize on `String` or boxed primitives
> They may be interned/shared, leading to deadlocks. Use a dedicated `private final Object lock = new Object();`.

> [!warning] `parallelStream()` uses the common ForkJoinPool
> Don't run blocking work on it — you starve the whole JVM. Use a dedicated pool, or virtual threads.

> [!tip] In Spring, prefer `@Async` and `WebClient`
> You'll rarely instantiate executors yourself in Spring apps — see [[Spring-Async]] and [[Spring-WebClient]].

## Related

- [[07-Collections-Framework]]
- [[08-Exceptions]]
- [[09-Streams-Lambdas]]
- [[Spring-Async]]
- [[Spring-WebClient]]
- [[Reactive-Spring]]
