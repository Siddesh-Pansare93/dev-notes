---
tags: [spring, core, di, injection, best-practices]
aliases: [Constructor Injection, Field Injection, Setter Injection]
stage: intermediate
---

# Dependency Injection Types

> [!info] For the Express/TS dev
> Three ways to receive a dependency: through the constructor (preferred), through a setter, or magically jammed into a field. The first is what you'd write in idiomatic TypeScript with `readonly` constructor params — and it's what Spring recommends too.

## The three types

### 1. Constructor injection (RECOMMENDED)

```java
@Service
public class OrderService {
    private final PaymentGateway gateway;
    private final OrderRepository repo;

    public OrderService(PaymentGateway gateway, OrderRepository repo) {
        this.gateway = gateway;
        this.repo = repo;
    }
}
```

> [!tip] Single-constructor classes don't need @Autowired
> Since Spring 4.3, if a class has one constructor, Spring uses it automatically. With Lombok:
> ```java
> @Service
> @RequiredArgsConstructor
> public class OrderService {
>     private final PaymentGateway gateway;
>     private final OrderRepository repo;
> }
> ```

### 2. Setter injection

```java
@Service
public class OrderService {
    private PaymentGateway gateway;

    @Autowired
    public void setGateway(PaymentGateway gateway) {
        this.gateway = gateway;
    }
}
```

Use for **optional** dependencies or to break circular cycles.

### 3. Field injection (AVOID)

```java
@Service
public class OrderService {
    @Autowired private PaymentGateway gateway;   // DON'T
    @Autowired private OrderRepository repo;
}
```

Looks clean, but it's the worst option. Reasons below.

## Why constructor injection wins

> [!example] Side-by-side comparison
>
> | Concern | Constructor | Setter | Field |
> |---|---|---|---|
> | `final` fields possible? | Yes | No | No |
> | Immutable object? | Yes | No | No |
> | Required deps enforced at compile time? | Yes | No | No |
> | Works without Spring (plain `new` in tests)? | Yes | Yes | **No** — needs reflection |
> | Hides dependencies? | No (visible in signature) | Slightly | Yes |
> | Detects circular deps at startup? | Yes (fast fail) | No (lazy) | No (lazy) |

```java
// Constructor: trivially testable without Spring
var svc = new OrderService(new MockGateway(), new InMemoryOrderRepo());

// Field-injected: must use reflection or @SpringBootTest
```

> [!warning] Field injection is a smell
> If a class has 8 `@Autowired` fields, the constructor would be ugly — and that's the point. The pain pushes you to refactor. Field injection hides the bloat. **Single Responsibility violation alarm**, muffled.

## @Autowired vs @Inject vs @Resource

| Annotation | Source | By |
|---|---|---|
| `@Autowired` | Spring | type, then name |
| `@Inject` | JSR-330 (`jakarta.inject`) | type |
| `@Resource` | JSR-250 | name first, then type |

Stick to constructor injection without any annotation in modern Spring. No annotation needed.

## Disambiguating multiple beans

When there are multiple candidates of the same type:

```java
public interface Notifier { void send(String msg); }

@Component public class EmailNotifier implements Notifier { ... }
@Component public class SmsNotifier   implements Notifier { ... }
```

### Option 1: `@Primary`

```java
@Component
@Primary
public class EmailNotifier implements Notifier { ... }
```

`EmailNotifier` is now the default. Other beans can still ask for `SmsNotifier` explicitly.

### Option 2: `@Qualifier`

```java
@Service
public class AlertService {
    public AlertService(@Qualifier("smsNotifier") Notifier notifier) { ... }
}
```

### Option 3: inject all of them

```java
public AlertService(List<Notifier> notifiers) {
    this.notifiers = notifiers;   // both EmailNotifier and SmsNotifier, in @Order
}

public AlertService(Map<String, Notifier> byName) {
    // { "emailNotifier": ..., "smsNotifier": ... }
}
```

> [!tip] Pattern: pluggable strategies
> Inject `Map<String, Strategy>` keyed by bean name to dispatch dynamically. Excellent for routing logic.

## Optional dependencies

```java
public OrderService(PaymentGateway gateway, Optional<AuditLog> audit) {
    this.gateway = gateway;
    this.audit = audit.orElseGet(NoopAuditLog::new);
}

// or
public OrderService(PaymentGateway gateway, @Autowired(required = false) AuditLog audit)
```

## Circular dependencies

```
A → B → A    // A needs B, B needs A
```

With **constructor injection on both sides**, Spring **fails at startup** with a clear error. This is good — it forces you to fix the design.

> [!warning] Setter/field injection hides cycles
> They allow Spring to construct A first (without B), then inject B later. The cycle exists silently at runtime. Don't use this as an excuse to switch to field injection — refactor instead:
> - Extract a third bean both depend on.
> - Use `ApplicationEventPublisher` to decouple ([[02-Beans-and-Application-Context]]).
> - Mark one side `@Lazy`.

## Code example: idiomatic modern Spring

```java
@Service
@RequiredArgsConstructor       // Lombok generates the constructor
@Slf4j
public class CheckoutService {

    private final OrderRepository orderRepo;
    private final PaymentGateway gateway;
    private final ApplicationEventPublisher events;

    public Order checkout(CartId cartId) {
        log.info("Checking out {}", cartId);
        var order = orderRepo.createFrom(cartId);
        gateway.charge(order.total());
        events.publishEvent(new OrderPlacedEvent(order.id()));
        return order;
    }
}
```

## Gotchas

> [!warning] Common pitfalls
> - **`@Autowired` on a static field** — never works.
> - **`@Autowired` on a constructor parameter when there are multiple constructors** without indicating which → ambiguity error.
> - **Self-injection** (`A` injecting `A`) — only works to invoke proxied methods (e.g., to make `@Transactional` apply to internal calls). Usually a sign of bad design.
> - **`new` inside a service** bypasses DI. Don't do it for collaborators.
> - **Mocking field-injected classes in tests** requires `@InjectMocks` reflection — annoying and brittle.

## Related
- [[01-IoC-DI-Concepts]]
- [[02-Beans-and-Application-Context]]
- [[03-Component-Scanning]]
- [[06-Bean-Scopes-Lifecycle]]
- [[../09-Testing/Unit-Testing-Services]]
