---
tags:
  - spring
  - core
  - spel
  - configuration
aliases:
  - SpEL
  - Spring Expression Language
  - "@Value"
stage: intermediate
---

# Spring Expression Language (SpEL)

> [!info] For the Express/TS dev
> SpEL is a tiny expression language baked into Spring's annotations. It lets you embed dynamic logic — property lookups, math, method calls, conditionals — *inside string literals* on annotations. Closest TS analog: template literals, but evaluated by the framework against beans, properties, and the environment. Most often you'll meet it via `@Value("${...}")` for config injection.

## Two delimiter syntaxes — get them right

| Syntax | Meaning |
|---|---|
| `${property.name}` | **Property placeholder** — looked up in the [[../05-Spring-Boot/05-Application-Properties\|Environment]] |
| `#{ expression }` | **SpEL expression** — evaluated as code |

You can nest them: `#{ '${app.mode}' == 'prod' ? 100 : 10 }`.

## @Value: injecting properties

```java
@Service
public class S {

    @Value("${server.port}")
    private int port;

    @Value("${app.name:Default App}")        // default after the colon
    private String appName;

    @Value("${app.tags:#{T(java.util.Collections).emptyList()}}")
    private List<String> tags;

    @Value("#{systemProperties['user.home']}")
    private String homeDir;

    @Value("#{ 2 + 2 }")
    private int four;

    @Value("#{ T(java.time.LocalDate).now() }")
    private LocalDate today;
}
```

> [!tip] Prefer @ConfigurationProperties over @Value sprinkles
> For grouped config, use `@ConfigurationProperties` ([[../05-Spring-Boot/05-Application-Properties]]). `@Value` is fine for one-offs.

## SpEL essentials

```java
// Literals
#{ 'hello' }
#{ 42 }
#{ true }
#{ {1, 2, 3} }                  // List literal
#{ {name: 'alice', age: 30} }   // Map literal

// Operators
#{ 1 + 2 * 3 }
#{ 'foo' + 'bar' }
#{ a > b ? 'big' : 'small' }
#{ list?.size() ?: 0 }          // Elvis (null-safe)

// Bean references
#{ userService }                 // the bean
#{ userService.findById(1) }     // call a method
#{ @userService.count() }        // explicit @beanName form

// Type references
#{ T(java.lang.Math).PI }
#{ T(java.time.Instant).now() }

// Collection projection / selection
#{ users.![name] }               // map: list of names
#{ users.?[age > 18] }           // filter: adults only
```

## Common annotation uses

### @Cacheable key

```java
@Cacheable(value = "users", key = "#id")
public User get(Long id) { ... }

@Cacheable(value = "users", key = "#user.email", condition = "#user.active")
public User store(User user) { ... }
```

### @PreAuthorize (Spring Security)

```java
@PreAuthorize("hasRole('ADMIN') or #userId == authentication.name")
public User get(String userId) { ... }
```

### @Scheduled

```java
@Scheduled(cron = "${jobs.cleanup.cron}")
public void cleanup() { ... }
```

### @ConditionalOnExpression

```java
@Bean
@ConditionalOnExpression("'${cache.type}' == 'redis' && ${cache.enabled}")
public Cache redisCache() { ... }
```

## Code example: dynamic config

```yaml
# application.yml
app:
  retry-count: 3
  enabled-features: payments,notifications,reporting
  fee-rate: 0.025
  admin-emails:
    - alice@example.com
    - bob@example.com
```

```java
@Service
public class FeatureService {

    @Value("${app.retry-count}")
    private int retryCount;

    @Value("${app.enabled-features}")
    private List<String> features;          // auto-split on commas

    @Value("${app.fee-rate}")
    private BigDecimal feeRate;

    @Value("${app.admin-emails}")
    private List<String> adminEmails;       // YAML list

    @Value("#{ '${app.enabled-features}'.split(',') }")
    private String[] featuresArr;

    @Value("#{ ${app.fee-rate} * 100 }")
    private BigDecimal feePercent;
}
```

## Programmatic evaluation

Rare in app code, but useful in libraries / dynamic rules:

```java
ExpressionParser parser = new SpelExpressionParser();
Expression exp = parser.parseExpression("name.toUpperCase()");

StandardEvaluationContext ctx = new StandardEvaluationContext();
ctx.setVariable("name", "alice");

String result = exp.getValue(ctx, String.class);   // "ALICE"
```

## Gotchas

> [!warning] Common pitfalls
> - **Mixing `${}` and `#{}` randomly** — `${}` resolves first, then SpEL evaluates. To use a property *inside* SpEL, quote-wrap: `#{ '${prop}' == 'x' }`.
> - **Missing property with no default** → `IllegalArgumentException` at startup. Always either set the property or provide a default: `${foo:bar}`.
> - **SpEL on private fields injected too early** — `@Value` runs after construction. Don't use the value in the constructor; use `@PostConstruct` or constructor parameter injection: `public S(@Value("${x}") int x)`.
> - **Type mismatches** — `@Value("${count}")` injecting into `int` when `count: "abc"` → conversion error.
> - **SpEL is powerful → security risk** if you evaluate user input. Never `parser.parseExpression(userInput)` on untrusted data.
> - **`@Value` on static fields** doesn't work.

> [!example] Quick reference card
> | Need | Use |
> |---|---|
> | Inject a config string | `@Value("${...}")` |
> | Inject a config string with default | `@Value("${...:default}")` |
> | Inject a list/array | `@Value("${...}")` (Spring splits) |
> | Compute at startup | `@Value("#{...}")` |
> | Reference another bean | `@Value("#{beanName.method()}")` |
> | Conditional bean | `@ConditionalOnExpression("#{...}")` |

## Related
- [[01-IoC-DI-Concepts]]
- [[04-Configuration-Classes]]
- [[07-Profiles-and-Conditionals]]
- [[../05-Spring-Boot/05-Application-Properties]]
- [[../08-Security/Method-Security]]
