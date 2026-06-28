---
tags:
  - spring
  - core
  - aop
  - cross-cutting
aliases:
  - AOP
  - Aspect-Oriented Programming
  - "@Aspect"
stage: intermediate
---

# AOP Basics

> [!info] For the Express/TS dev
> AOP is the engine that makes `@Transactional`, `@Async`, `@Cacheable`, and Spring Security work. In Express, you'd wrap a route in `transactional(handler)` middleware. AOP lets you achieve the same effect by **annotating a method**, with the framework wrapping it transparently in a proxy. Closest TS analogs: NestJS interceptors, or method decorators with `reflect-metadata`.

## What problem does AOP solve?

**Cross-cutting concerns** — logging, transactions, security checks, retries, caching, metrics — pollute every method if you write them inline. AOP lets you define them **once**, then apply them via annotation or pattern matching.

```java
// WITHOUT AOP — boilerplate everywhere
public Order place(Cart c) {
    log.info("place start");
    long t = System.nanoTime();
    var tx = txManager.begin();
    try {
        var o = doPlace(c);
        tx.commit();
        return o;
    } catch (Exception e) {
        tx.rollback();
        throw e;
    } finally {
        log.info("place took {}ns", System.nanoTime() - t);
    }
}

// WITH AOP — declarative
@Transactional
@Timed
public Order place(Cart c) {
    return doPlace(c);
}
```

## Vocabulary

| Term | Meaning |
|---|---|
| **Aspect** | A class containing cross-cutting code (`@Aspect`) |
| **Advice** | The actual logic to run (`@Before`, `@After`, `@Around`, etc.) |
| **Pointcut** | An expression matching where to apply advice |
| **Join point** | A specific point in execution (e.g. a method call) where advice may run |
| **Weaving** | Wiring aspects into target objects (Spring uses **runtime proxies**) |

## Advice types

| Annotation | Runs |
|---|---|
| `@Before` | Before the method |
| `@After` | After (regardless of outcome) |
| `@AfterReturning` | After successful return |
| `@AfterThrowing` | After an exception |
| `@Around` | Wraps the method (can short-circuit, modify args/return) |

## Code example: a timing aspect

```java
@Aspect
@Component
@Slf4j
public class TimingAspect {

    @Around("@annotation(Timed)")
    public Object time(ProceedingJoinPoint pjp) throws Throwable {
        long start = System.nanoTime();
        try {
            return pjp.proceed();         // call the real method
        } finally {
            long us = (System.nanoTime() - start) / 1_000;
            log.info("{} took {}us", pjp.getSignature().toShortString(), us);
        }
    }
}

@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface Timed {}
```

```java
@Service
public class OrderService {
    @Timed
    public Order place(Cart c) { ... }
}
```

Enable AOP (Spring Boot does this automatically when `spring-boot-starter-aop` is on the classpath):

```java
@Configuration
@EnableAspectJAutoProxy
public class AopConfig {}
```

## Pointcut expressions

```java
// Any public method in the service package
@Before("execution(public * com.example.app.service..*(..))")

// Any method annotated with @Transactional
@Around("@annotation(org.springframework.transaction.annotation.Transactional)")

// Any method on a @RestController
@Before("within(@org.springframework.web.bind.annotation.RestController *)")

// Combining
@Around("execution(* com.example..*Service.*(..)) && !@annotation(SkipAudit)")
```

## How proxying works (and its big gotcha)

> [!warning] Self-invocation does NOT trigger advice
> Spring AOP is **proxy-based**. The proxy wraps your bean. When code *outside* calls `service.foo()`, the proxy intercepts and applies advice. But when `foo()` internally calls `this.bar()`, that's a direct call on the underlying object — the proxy is bypassed.
>
> ```java
> @Service
> public class S {
>     @Transactional public void foo() { bar(); }   // bar runs WITHOUT a transaction!
>     @Transactional public void bar() { ... }
> }
> ```
>
> Workarounds:
> - Inject the bean into itself: `@Autowired S self;` then `self.bar();`
> - Use `AopContext.currentProxy()` (requires `exposeProxy = true`)
> - Refactor: move `bar` to another bean

## Spring's built-in aspects

These all leverage AOP under the hood:

| Annotation | What it does |
|---|---|
| `@Transactional` | Wraps method in a DB transaction |
| `@Async` | Runs method on a different thread, returns `CompletableFuture` |
| `@Cacheable` / `@CacheEvict` | Caches return values |
| `@Retryable` (Spring Retry) | Retries on exception |
| `@PreAuthorize` (Spring Security) | Authorization checks |
| `@Validated` | Triggers method-parameter validation |

## Code example: a custom security aspect

```java
@Aspect
@Component
public class TenantGuardAspect {

    private final CurrentTenant currentTenant;

    public TenantGuardAspect(CurrentTenant t) { this.currentTenant = t; }

    @Around("@annotation(TenantScoped)")
    public Object check(ProceedingJoinPoint pjp) throws Throwable {
        if (currentTenant.id() == null) {
            throw new AccessDeniedException("No tenant in context");
        }
        return pjp.proceed();
    }
}
```

## Gotchas

> [!warning] Common pitfalls
> - **Self-invocation bypass** (above) — most common gotcha by far.
> - **Final classes/methods** can't be proxied (CGLIB). Either don't make them final or use interfaces.
> - **Private methods** are never advised — proxies only intercept public/protected.
> - **`@Async` returning `void`** loses the exception. Use `CompletableFuture<T>`.
> - **Pointcut typos** silently match nothing. Test that advice actually fires.
> - **Order of multiple aspects** is undefined unless you use `@Order(n)`.

> [!tip] When NOT to use AOP
> If a concern only appears in 2–3 places, just call a helper directly. AOP shines when the concern is *systemic* (transactions across all services) or *infrastructural* (metrics on every controller).

## Related
- [[01-IoC-DI-Concepts]]
- [[02-Beans-and-Application-Context]]
- [[04-Configuration-Classes]]
- [[../05-Spring-Boot/04-Starters]]
- [[../07-Data-JPA/Transactions]]
- [[../08-Security/Method-Security]]
- [[../12-Observability/Metrics]]
