---
tags:
  - spring-boot
  - configuration
  - properties
aliases:
  - application.yml
  - application.properties
  - "@ConfigurationProperties"
stage: intermediate
---

# Application Properties

> [!info] For the Express/TS dev
> `application.yml` is Spring Boot's `.env` + `config/index.ts` rolled into one. Unlike `dotenv` it supports **typed** values, **profiles** (dev/prod), **nesting**, **env-var overrides**, and binding to **strongly-typed POJOs**. You stop scattering `process.env.X || '...'` defaults across the code.

## File locations and order

Spring Boot looks for, in increasing precedence:

1. `src/main/resources/application.properties` (or `.yml`)
2. `src/main/resources/application-{profile}.yml`
3. `./config/application.yml` (next to the JAR)
4. `./application.yml` (next to the JAR)
5. Environment variables
6. Command-line args (`--server.port=9090`)

Later sources **override** earlier ones — so env vars beat the bundled YAML, and CLI args beat everything.

## YAML vs properties

```yaml
# application.yml — preferred
server:
  port: 8080
  compression:
    enabled: true

spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/app
    username: app
    password: secret
```

```properties
# application.properties — equivalent
server.port=8080
server.compression.enabled=true
spring.datasource.url=jdbc:postgresql://localhost:5432/app
spring.datasource.username=app
spring.datasource.password=secret
```

> [!tip] Pick one and stick with it
> Spring Boot supports both, but mixing them in one project is a maintenance hazard. YAML is more readable for nested config; pick YAML.

## Profile-specific files

```
src/main/resources/
├── application.yml           # base (always loaded)
├── application-dev.yml       # loaded when profile=dev
├── application-staging.yml
└── application-prod.yml
```

Activate via `spring.profiles.active`:

```yaml
# application.yml
spring:
  profiles:
    active: dev   # default during local dev
```

```bash
# Override at runtime
SPRING_PROFILES_ACTIVE=prod java -jar app.jar
java -jar app.jar --spring.profiles.active=prod
```

See [[../04-Spring-Core/07-Profiles-and-Conditionals]].

## Multi-document YAML (one file, several profiles)

```yaml
spring:
  application:
    name: my-app
server:
  port: 8080
---
spring:
  config:
    activate:
      on-profile: prod
server:
  port: 80
  compression:
    enabled: true
```

## Environment variable binding

> [!example] dotenv vs Spring Boot
> In Node: `process.env.DATABASE_URL` and you handle parsing, defaults, types.
> In Spring Boot, every property is **automatically bindable** from an env var by uppercasing and replacing `.` and `-` with `_`:
>
> | Property | Env var |
> |---|---|
> | `server.port` | `SERVER_PORT` |
> | `spring.datasource.url` | `SPRING_DATASOURCE_URL` |
> | `app.feature-flags.beta` | `APP_FEATUREFLAGS_BETA` or `APP_FEATURE_FLAGS_BETA` |

This is how 12-factor configuration works in Spring Boot. **Never check secrets into `application.yml`** — leave the key empty and let the env var fill it:

```yaml
spring:
  datasource:
    password: ${DB_PASSWORD}
```

## Reading properties: three ways

### 1. `@Value` (one-offs)

```java
@Service
public class S {
    @Value("${app.name:My App}")     // : provides default
    private String appName;
}
```

See [[../04-Spring-Core/09-Spring-Expression-Language]].

### 2. `Environment` (programmatic)

```java
@Service
public class S {
    private final Environment env;
    public S(Environment env) { this.env = env; }

    public void check() {
        String url = env.getProperty("spring.datasource.url");
        boolean prod = env.acceptsProfiles(Profiles.of("prod"));
    }
}
```

### 3. `@ConfigurationProperties` (RECOMMENDED)

The "typed config" pattern. Map a chunk of YAML to a POJO/record:

```yaml
app:
  base-url: https://api.example.com
  retry:
    max-attempts: 3
    backoff-ms: 200
  admins:
    - alice@example.com
    - bob@example.com
```

```java
@ConfigurationProperties("app")
public record AppProperties(
    String baseUrl,
    Retry retry,
    List<String> admins
) {
    public record Retry(int maxAttempts, int backoffMs) {}
}
```

Enable it (once, anywhere):

```java
@SpringBootApplication
@ConfigurationPropertiesScan
public class App { ... }
```

Inject anywhere:

```java
@Service
public class HttpService {
    private final AppProperties props;
    public HttpService(AppProperties p) { this.props = p; }
}
```

> [!tip] Why @ConfigurationProperties wins
> - **Type-safe** — startup fails if `max-attempts` isn't an int.
> - **IDE autocomplete** — add `spring-boot-configuration-processor` and your YAML gets autocomplete.
> - **Validation** — `@Validated` + `@NotNull`/`@Min` enforces constraints at startup.
> - **Testable** — pass a fake `AppProperties` in unit tests; no Spring needed.

### Validation example

```java
@ConfigurationProperties("app")
@Validated
public record AppProperties(
    @NotBlank String baseUrl,
    @NotNull @Valid Retry retry
) {
    public record Retry(@Min(1) int maxAttempts, @Min(0) int backoffMs) {}
}
```

If `app.base-url` is blank in the YAML, the app refuses to start. Excellent failure mode.

## Code example: full app config

```yaml
# application.yml
spring:
  application:
    name: order-service

server:
  port: ${PORT:8080}        # env var with fallback

app:
  base-url: ${API_BASE_URL}
  retry:
    max-attempts: 3
    backoff-ms: 200
  features:
    new-checkout: false
  admins:
    - admin@example.com

logging:
  level:
    root: INFO
    com.example.app: DEBUG

management:
  endpoints:
    web:
      exposure:
        include: health, info, metrics
```

```yaml
# application-prod.yml
server:
  port: 80
logging:
  level:
    com.example.app: INFO
app:
  features:
    new-checkout: true
```

## Importing additional config files

```yaml
spring:
  config:
    import:
      - optional:file:./local.yml         # for local dev overrides
      - configtree:/etc/secrets/          # mount file-per-secret (k8s)
      - optional:configserver:            # Spring Cloud Config
```

## Gotchas

> [!warning] Common pitfalls
> - **Hyphen vs camelCase** — `app.base-url` in YAML maps to `baseUrl` in Java (relaxed binding). Both work; pick one style and stay consistent.
> - **Wrong profile name** — `dev` activated but YAML has `application-development.yml`. File names must match exactly.
> - **Secrets in YAML committed to git** — use env vars or external secret stores, always. Add `application-local.yml` to `.gitignore`.
> - **`@ConfigurationProperties` not registered** — without `@ConfigurationPropertiesScan` or `@EnableConfigurationProperties(AppProperties.class)`, the class isn't a bean.
> - **`@Value` resolved before construction completes** — don't use the field in the constructor; use a constructor parameter `@Value` instead.
> - **`spring.profiles.include` deprecated in 2.4+** — use `spring.config.activate.on-profile` and `spring.profiles.group`.

## Related
- [[01-What-is-Spring-Boot]]
- [[03-Auto-Configuration]]
- [[06-SpringApplication-Bootstrap]]
- [[../04-Spring-Core/04-Configuration-Classes]]
- [[../04-Spring-Core/07-Profiles-and-Conditionals]]
- [[../04-Spring-Core/09-Spring-Expression-Language]]
- [[../13-Deployment/12-Factor-Config]]
