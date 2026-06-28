---
tags: [spring, core, configuration, bean]
aliases: ["@Configuration", "@Bean", Java Config]
stage: intermediate
---

# Configuration Classes (@Configuration / @Bean)

> [!info] For the Express/TS dev
> When a class **isn't yours** (a third-party library) and you can't slap `@Component` on it, you write a factory method that returns it. That's `@Bean`. The class containing those methods is `@Configuration`. Like a manual DI module in `awilix.register({...})`, but expressed as plain Java methods.

## When to use which

| Style | Use for | Example |
|---|---|---|
| `@Component` / stereotype | **Your** classes | `UserService` |
| `@Bean` in `@Configuration` | **Third-party** classes, or beans needing custom construction | `ObjectMapper`, `RestTemplate`, `DataSource` |

## The basics

```java
@Configuration
public class AppConfig {

    @Bean
    public ObjectMapper objectMapper() {
        return new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    }

    @Bean
    public RestClient restClient(@Value("${api.base-url}") String base) {
        return RestClient.builder().baseUrl(base).build();
    }
}
```

Bean name = method name (`objectMapper`, `restClient`). Override with `@Bean(name = "...")`.

## Why @Configuration (not @Component) for bean classes?

> [!note] CGLIB proxying
> `@Configuration` classes are subclassed at runtime so that calls between `@Bean` methods return the **same singleton instance**. With plain `@Component`, calling another bean method just runs the method again — you'd get a new object each time.

```java
@Configuration
public class Cfg {
    @Bean public A a() { return new A(b()); }
    @Bean public B b() { return new B(); }   // a() and any other consumer share THIS B
}
```

If `Cfg` were `@Component`, `b()` inside `a()` would create a fresh `B`, separate from the one Spring registered.

## Dependencies between @Bean methods

Two equivalent styles:

```java
// Style 1: call other bean method directly (only works in @Configuration, see above)
@Bean public A a() { return new A(b()); }
@Bean public B b() { return new B(); }

// Style 2: declare as method parameter (works everywhere, preferred)
@Bean public A a(B b) { return new A(b); }
@Bean public B b()    { return new B(); }
```

> [!tip] Prefer the parameter style
> It's clearer, doesn't rely on CGLIB proxying, and works in `@Component` configs too.

## Lifecycle hooks on beans

```java
@Bean(initMethod = "start", destroyMethod = "stop")
public Server server() { return new Server(); }
```

Or annotate the class with `@PostConstruct` / `@PreDestroy` (see [[06-Bean-Scopes-Lifecycle]]).

## Conditional beans

`@Bean` plays nicely with `@ConditionalOn*` (covered in [[07-Profiles-and-Conditionals]]):

```java
@Configuration
public class CacheConfig {
    @Bean
    @ConditionalOnProperty(name = "cache.enabled", havingValue = "true")
    public Cache cache() {
        return new InMemoryCache();
    }
}
```

This is exactly how Spring Boot's [[../05-Spring-Boot/03-Auto-Configuration|auto-configuration]] is built.

## Code example: full config class

```java
@Configuration
@EnableConfigurationProperties(AppProps.class)
public class InfraConfig {

    @Bean
    public DataSource dataSource(AppProps props) {
        var cfg = new HikariConfig();
        cfg.setJdbcUrl(props.db().url());
        cfg.setUsername(props.db().user());
        cfg.setPassword(props.db().password());
        cfg.setMaximumPoolSize(props.db().poolSize());
        return new HikariDataSource(cfg);
    }

    @Bean
    @ConditionalOnProperty("redis.url")
    public RedisClient redisClient(@Value("${redis.url}") String url) {
        return RedisClient.create(url);
    }

    @Bean
    public Clock clock() {
        return Clock.systemUTC();
    }
}

@ConfigurationProperties("app")
public record AppProps(DbProps db) {
    public record DbProps(String url, String user, String password, int poolSize) {}
}
```

## @Import: composing configs

```java
@Configuration
@Import({ InfraConfig.class, SecurityConfig.class, WebConfig.class })
public class AppConfig { }
```

Equivalent to including each. Useful when you want to keep the main config slim.

## Gotchas

> [!warning] Common pitfalls
> - **Forgetting `@Configuration`** and using `@Component` → `@Bean` methods still work, but cross-method calls create new objects (see "Why @Configuration").
> - **Returning `final` types** is fine, but `@Configuration` proxying requires the class itself to be non-final and have a non-private constructor.
> - **`@Bean` on a `private` method** → ignored. Must be at least package-private.
> - **Two `@Bean` methods returning the same type** → ambiguity. Use `@Primary` or `@Qualifier`.
> - **Calling `new` inside a `@Bean` method**: that object is fine — but its dependencies are not auto-injected. Pass them as method parameters or inject them.

> [!example] When NOT to use @Configuration
> If you're configuring beans Spring Boot already configures (e.g., `DataSource`, `ObjectMapper`), prefer using **properties** in `application.yml` ([[../05-Spring-Boot/05-Application-Properties]]) and let auto-config do the work. Only override with `@Bean` when defaults don't fit.

## Related
- [[01-IoC-DI-Concepts]]
- [[02-Beans-and-Application-Context]]
- [[03-Component-Scanning]]
- [[06-Bean-Scopes-Lifecycle]]
- [[07-Profiles-and-Conditionals]]
- [[09-Spring-Expression-Language]]
- [[../05-Spring-Boot/03-Auto-Configuration]]
- [[../05-Spring-Boot/05-Application-Properties]]
