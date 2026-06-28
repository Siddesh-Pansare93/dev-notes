---
tags: [deployment, profiles, configuration, spring-boot]
aliases: [Profiles, Spring Profiles, SPRING_PROFILES_ACTIVE]
stage: foundation
---

# Profiles Per Environment

> [!info] For the Express/TS dev
> Spring profiles are like `NODE_ENV` on steroids. They activate different config files, beans, and even property sources. Set `SPRING_PROFILES_ACTIVE=prod` and the `application-prod.yml` overlay loads on top of `application.yml`.

## Profile-specific files

```
src/main/resources/
  application.yml            ← always loaded (base)
  application-local.yml      ← loaded when local profile active
  application-dev.yml
  application-staging.yml
  application-prod.yml
```

Activation precedence (later wins):
1. `application.yml`
2. `application-{profile}.yml` for each active profile
3. External config (mounted file, env vars, command line)

## Activate

```bash
# CLI
java -jar app.jar --spring.profiles.active=prod

# Env var (most common in containers)
SPRING_PROFILES_ACTIVE=prod

# Multiple profiles (comma-separated, applied left-to-right)
SPRING_PROFILES_ACTIVE=prod,us-east

# In application.yml (default fallback)
spring:
  profiles:
    default: local
```

## Example layout

`application.yml`:

```yaml
spring:
  application:
    name: orders-api
  jackson:
    serialization:
      write-dates-as-timestamps: false
server:
  port: 8080
management:
  endpoints:
    web:
      exposure:
        include: health,info,prometheus
```

`application-local.yml`:

```yaml
spring:
  datasource:
    url: jdbc:h2:mem:orders
  jpa:
    show-sql: true
logging:
  level:
    com.example: DEBUG
```

`application-prod.yml`:

```yaml
spring:
  datasource:
    url: ${SPRING_DATASOURCE_URL}
    username: ${SPRING_DATASOURCE_USERNAME}
    password: ${SPRING_DATASOURCE_PASSWORD}
    hikari:
      maximum-pool-size: 20
  jpa:
    show-sql: false
logging:
  level:
    root: INFO
management:
  tracing:
    sampling:
      probability: 0.1
```

## Profile-specific beans

```java
@Configuration
public class ClockConfig {
    @Bean
    @Profile("!test")
    Clock systemClock() { return Clock.systemUTC(); }

    @Bean
    @Profile("test")
    Clock fixedClock() { return Clock.fixed(Instant.parse("2024-01-01T00:00:00Z"), ZoneOffset.UTC); }
}
```

```java
@Service
@Profile({"dev", "local"})
public class StubPaymentService implements PaymentService { ... }

@Service
@Profile("prod")
public class StripePaymentService implements PaymentService { ... }
```

## Profile groups

Group profiles together:

```yaml
spring:
  profiles:
    group:
      production: prod, us-east, monitoring
```

Activating `production` activates all three.

## Conditional config

```java
@ConditionalOnProperty(name = "feature.newCheckout", havingValue = "true")
@Bean
NewCheckoutEngine newCheckout() { ... }
```

## YAML multi-document

Single file with sections per profile:

```yaml
spring:
  application:
    name: orders-api
---
spring:
  config:
    activate:
      on-profile: local
  datasource:
    url: jdbc:h2:mem:orders
---
spring:
  config:
    activate:
      on-profile: prod
  datasource:
    url: ${SPRING_DATASOURCE_URL}
```

## Property override hierarchy (high → low priority)

1. Command-line args (`--server.port=9090`)
2. SPRING_APPLICATION_JSON env var
3. JNDI / system properties
4. OS env vars
5. Profile-specific external `application-{prof}.yml`
6. External `application.yml`
7. Profile-specific packaged `application-{prof}.yml`
8. Packaged `application.yml`
9. `@PropertySource`
10. Defaults

> [!tip] Env var naming
> `spring.datasource.url` becomes `SPRING_DATASOURCE_URL`. Dots → underscores, kebab-case → underscored, ALL CAPS.

## Profile per dev (local overrides)

`application-local.yml` for the team default; each dev can keep an `application-local-rita.yml` (gitignored) and run with `SPRING_PROFILES_ACTIVE=local,local-rita`.

## What NOT to put in profiles

- Secrets (use [[04-Kubernetes-Basics|K8s Secrets]], Vault, or cloud secret managers)
- Anything not specific to an environment (put it in the base `application.yml`)

## Related
- [[02-Spring-Boot-Auto-Configuration]]
- [[04-Kubernetes-Basics]]
- [[07-Twelve-Factor-Spring]]
- [[01-Configuration-Properties]]
