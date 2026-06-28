---
tags: [spring, core, beans, container]
aliases: [Beans, ApplicationContext, Spring Container]
stage: intermediate
---

# Beans and the ApplicationContext

> [!info] For the Express/TS dev
> The **ApplicationContext** is Spring's DI container — think of it as a giant `Map<Type, Instance>` that holds every singleton in your app. A **bean** is just any object the container manages. In Express terms: it's like having a single registry that owns your `db`, `redisClient`, every service, every controller — and hands them out by type.

## What is a bean?

A **bean** is an object whose lifecycle is managed by the Spring container. That's it. No special interface, no parent class. The class becomes a bean when:

1. It's annotated with `@Component` (or stereotype: `@Service`, `@Repository`, `@Controller`) and picked up by [[03-Component-Scanning]], **or**
2. It's returned by an `@Bean` method in a [[04-Configuration-Classes|@Configuration]] class.

```java
@Component                    // Bean #1
public class Clock { /* ... */ }

@Configuration
public class AppConfig {
    @Bean                     // Bean #2
    public ObjectMapper objectMapper() {
        return new ObjectMapper();
    }
}
```

## What is the ApplicationContext?

The `ApplicationContext` is the Spring IoC container. It:

- **Discovers** classes (component scan, config classes, imports).
- **Instantiates** beans, in dependency order.
- **Injects** dependencies (see [[01-IoC-DI-Concepts]]).
- **Manages lifecycle** ([[06-Bean-Scopes-Lifecycle]]) — `@PostConstruct`, `@PreDestroy`.
- **Publishes events** (`ApplicationEventPublisher`).
- **Resolves environment** (properties, profiles).

> [!note] BeanFactory vs ApplicationContext
> `BeanFactory` is the bare DI primitive. `ApplicationContext` is the superset you actually use — it adds events, i18n, environment, and eager singleton instantiation.

## Code example

### Inspecting the context

```java
@SpringBootApplication
public class App implements CommandLineRunner {
    private final ApplicationContext ctx;

    public App(ApplicationContext ctx) { this.ctx = ctx; }

    public static void main(String[] args) {
        SpringApplication.run(App.class, args);
    }

    @Override
    public void run(String... args) {
        System.out.println("Total beans: " + ctx.getBeanDefinitionCount());

        for (String name : ctx.getBeanDefinitionNames()) {
            System.out.println(name);
        }

        // Look up by type
        var mapper = ctx.getBean(ObjectMapper.class);

        // Look up by name
        var clock = (Clock) ctx.getBean("clock");
    }
}
```

### Manual context (no Spring Boot)

```java
public class Main {
    public static void main(String[] args) {
        var ctx = new AnnotationConfigApplicationContext(AppConfig.class);
        var svc = ctx.getBean(UserService.class);
        svc.doWork();
        ctx.close();   // triggers @PreDestroy
    }
}
```

## Bean naming

By default the bean name is the **class name with the first letter lowercased**:

| Class | Bean name |
|---|---|
| `UserService` | `userService` |
| `JSONParser`  | `JSONParser` (special-case: 2 caps in a row) |

Override with `@Component("myName")` or `@Bean(name = "myName")`.

> [!tip] Multiple beans of the same type
> ```java
> @Bean public DataSource primaryDs() { ... }
> @Bean public DataSource auditDs() { ... }
>
> // Inject by qualifier:
> public Repo(@Qualifier("auditDs") DataSource ds) { ... }
> // Or mark one @Primary
> ```

## How the context boots (mental model)

```
1. Read @Configuration classes & @ComponentScan paths
2. Build BeanDefinitions (metadata: class, scope, deps)
3. Order them topologically by constructor deps
4. Instantiate each singleton
5. Inject dependencies
6. Call @PostConstruct
7. Publish ContextRefreshedEvent
8. Application is "ready"
```

If step 3 detects a cycle with all-constructor injection → **startup fails**. That's intentional.

## Code example: events

```java
// Publish
@Component
public class OrderService {
    private final ApplicationEventPublisher publisher;
    public OrderService(ApplicationEventPublisher p) { this.publisher = p; }

    public void place(Order o) {
        // ...persist...
        publisher.publishEvent(new OrderPlacedEvent(o.getId()));
    }
}

// Listen
@Component
public class EmailListener {
    @EventListener
    public void onOrder(OrderPlacedEvent e) {
        System.out.println("Send confirmation for " + e.orderId());
    }
}

public record OrderPlacedEvent(Long orderId) {}
```

> [!info] Express analogy
> Like `EventEmitter`, but type-safe and bean-aware. Combine with `@Async` ([[08-AOP-Basics]]) for non-blocking listeners.

## Gotchas

> [!warning] Common pitfalls
> - **Asking the context for a bean inside another bean's constructor** — at that point the context isn't fully built; use injection instead.
> - **`getBean()` everywhere** is a service-locator anti-pattern. See [[01-IoC-DI-Concepts]].
> - **Closing the context manually** in tests can hide leaks; use `@SpringBootTest` which manages lifecycle.
> - **Two `@Bean` methods returning the same type with the same name** → silent override or startup failure depending on `spring.main.allow-bean-definition-overriding`.

## Related
- [[01-IoC-DI-Concepts]]
- [[03-Component-Scanning]]
- [[04-Configuration-Classes]]
- [[06-Bean-Scopes-Lifecycle]]
- [[../05-Spring-Boot/06-SpringApplication-Bootstrap]]
- [[../05-Spring-Boot/03-Auto-Configuration]]
