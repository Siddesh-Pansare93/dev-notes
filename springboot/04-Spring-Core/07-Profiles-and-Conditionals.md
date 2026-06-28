---
tags: [spring, core, profiles, conditional]
aliases: ["@Profile", "@ConditionalOnProperty", Profiles]
stage: intermediate
---

# Profiles and Conditional Beans

> [!info] For the Express/TS dev
> In Express you usually do `if (process.env.NODE_ENV === 'production')`-style branching scattered across the code. Spring lets you tag *whole beans* with `@Profile("prod")` or `@ConditionalOnProperty(...)`. The container only registers them when the condition is met. Configuration becomes **declarative** rather than imperative.

## Profiles

A **profile** is a named environment slice — `dev`, `staging`, `prod`, `test`, `kafka`, anything you like. You activate one or more, and beans tagged with that profile come alive.

### Tagging beans

```java
@Service
@Profile("dev")
public class FakeEmailSender implements EmailSender {
    public void send(String to, String body) {
        System.out.println("[FAKE] " + to + ": " + body);
    }
}

@Service
@Profile("prod")
public class SesEmailSender implements EmailSender { /* real AWS SES */ }
```

Only one is registered, depending on the active profile.

### Profile expressions

```java
@Profile("dev | test")     // dev OR test
@Profile("!prod")          // anything except prod
@Profile({"prod", "staging"})  // prod OR staging (array form)
```

### Activating profiles

Pick any one of:

```yaml
# application.yml
spring:
  profiles:
    active: dev
```

```bash
# Command line
java -jar app.jar --spring.profiles.active=prod

# Env var
SPRING_PROFILES_ACTIVE=prod java -jar app.jar
```

```java
// Programmatic (rare)
new SpringApplicationBuilder(App.class).profiles("prod").run(args);
```

> [!tip] Default profile
> If no profile is active, beans tagged `@Profile("default")` are registered. Useful for "no-config dev mode" defaults.

### Profile-specific property files

Spring Boot loads these automatically:

```
application.yml         # always loaded
application-dev.yml     # loaded when 'dev' profile active
application-prod.yml    # loaded when 'prod' profile active
```

See [[../05-Spring-Boot/05-Application-Properties]].

## @Conditional family

Spring Boot adds a rich set of conditional annotations — these are the engine behind [[../05-Spring-Boot/03-Auto-Configuration|auto-configuration]].

| Annotation | Triggers when |
|---|---|
| `@ConditionalOnProperty(name=…, havingValue=…)` | Property is set (and matches) |
| `@ConditionalOnMissingProperty` | Property is absent |
| `@ConditionalOnClass(X.class)` | Class is on classpath |
| `@ConditionalOnMissingClass` | Class is NOT on classpath |
| `@ConditionalOnBean(X.class)` | A bean of type X exists |
| `@ConditionalOnMissingBean(X.class)` | No bean of type X yet |
| `@ConditionalOnExpression("#{...}")` | SpEL expression is true |
| `@ConditionalOnWebApplication` | Running as a web app |

### Examples

```java
@Configuration
public class CacheConfig {

    @Bean
    @ConditionalOnProperty(name = "cache.type", havingValue = "redis")
    public Cache redisCache() { return new RedisCache(); }

    @Bean
    @ConditionalOnProperty(name = "cache.type", havingValue = "memory", matchIfMissing = true)
    public Cache memoryCache() { return new InMemoryCache(); }
}
```

> [!example] The "user override" pattern
> Spring Boot's auto-config uses this pattern everywhere:
> ```java
> @Bean
> @ConditionalOnMissingBean(ObjectMapper.class)
> public ObjectMapper objectMapper() { return new ObjectMapper(); }
> ```
> "Provide a default — but only if the user hasn't already." That's how Spring Boot lets you opt out of any default by declaring your own bean.

## Code example: feature-flagged services

```yaml
# application.yml
features:
  metrics: true
  audit-log: false
```

```java
@Configuration
public class FeatureConfig {

    @Bean
    @ConditionalOnProperty(name = "features.metrics", havingValue = "true")
    public MetricsCollector metrics() {
        return new PrometheusMetricsCollector();
    }

    @Bean
    @ConditionalOnProperty(name = "features.audit-log", havingValue = "true")
    public AuditLog auditLog(DataSource ds) {
        return new DbAuditLog(ds);
    }
}
```

If `features.metrics` is false (or unset), `MetricsCollector` is **not** in the context — anything that needs it must use `Optional<MetricsCollector>` or be conditional itself.

## Combining @Profile and @Conditional

```java
@Service
@Profile("prod")
@ConditionalOnProperty(name = "kafka.enabled", havingValue = "true")
public class KafkaPublisher { ... }
```

Active in prod **AND** when the property is on. AND, not OR.

## Custom @Conditional

```java
public class OnLinuxCondition implements Condition {
    public boolean matches(ConditionContext ctx, AnnotatedTypeMetadata md) {
        return System.getProperty("os.name").toLowerCase().contains("linux");
    }
}

@Bean
@Conditional(OnLinuxCondition.class)
public PathWatcher linuxWatcher() { return new InotifyWatcher(); }
```

## Gotchas

> [!warning] Common pitfalls
> - **Forgetting to set `matchIfMissing = true`** when you want a default-on feature — bean disappears when the property isn't in `application.yml`.
> - **Profile typos** — `@Profile("prd")` while activating `prod` silently registers nothing.
> - **Profiles in tests** — by default, `@SpringBootTest` does NOT activate `dev`. Use `@ActiveProfiles("test")` and create `application-test.yml`.
> - **Conditional on a bean that's also conditional** can lead to ordering issues. Spring evaluates them in `@AutoConfiguration`-aware order, but plain `@Configuration` classes may not be ordered correctly — use `@AutoConfigureAfter`/`Before` if you write your own auto-config.
> - **`@Profile` does not stack with OR semantics across multiple annotations** — you can't put two `@Profile` annotations on one class.

> [!tip] Inspect what's active
> Spring Boot Actuator's `/actuator/conditions` endpoint shows every `@Conditional` evaluation result — invaluable for "why isn't my bean registered?" debugging.

## Related
- [[01-IoC-DI-Concepts]]
- [[04-Configuration-Classes]]
- [[06-Bean-Scopes-Lifecycle]]
- [[09-Spring-Expression-Language]]
- [[../05-Spring-Boot/03-Auto-Configuration]]
- [[../05-Spring-Boot/05-Application-Properties]]
