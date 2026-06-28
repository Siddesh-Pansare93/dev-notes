---
tags: [faq, start-here, express, typescript, comparison]
aliases: [FAQ, Express FAQ, Quick FAQ]
stage: foundation
---

# FAQ for Express/TypeScript Developers

> [!info] Read this first
> Punchy answers to "where the hell is X?" Each answer links to a deep-dive. Skim the whole thing in 5 minutes — you'll feel oriented.

## Project & dependencies

### Where's my `package.json`?

It's `pom.xml` (Maven) or `build.gradle.kts` (Gradle). See [[01-Maven-Basics]], [[02-Gradle-Basics]].

### Where's `node_modules/`?

Dependencies live in `~/.m2/repository/` (Maven) or `~/.gradle/caches/` (Gradle). Shared across all projects. No more 500 MB per repo.

### What replaces `npm install`?

Nothing — Maven/Gradle resolve and download deps automatically when you build. Run `./mvnw verify` or `./gradlew build`.

### What replaces `npm scripts`?

Maven/Gradle **goals** and **tasks**. Examples:
- `./mvnw spring-boot:run` ≈ `npm start`
- `./mvnw test` ≈ `npm test`
- `./mvnw package` ≈ `npm run build`
- `./mvnw verify` ≈ `npm run check` (compile + test + lint)

See [[01-Maven-Basics]].

### What's the equivalent of `package-lock.json`?

Maven doesn't lock by default — it pins versions in the pom directly + uses [BOM](#) imports. Gradle has `gradle.lockfile`. In practice, fixed versions in `pom.xml` + a Maven Wrapper give reproducible builds.

### Where's `.nvmrc`?

`.sdkmanrc` (with SDKMAN!) or `.tool-versions` (asdf/jenv). See [[05-Common-CLI-Tools]].

### How do I run it?

```bash
./mvnw spring-boot:run
# or build & run the JAR
./mvnw package && java -jar target/*.jar
```

See [[01-Packaging-Fat-JAR]].

## Language & runtime

### Is there a REPL?

Yes — `jshell` (built into JDK 9+). Run `jshell` and start typing. See [[05-Common-CLI-Tools]].

### What about TypeScript-style types?

Java is **statically typed and compiled** — no separate type system. Types are part of the language; the compiler enforces them. Generics give you `List<User>`. See [[01-Generics]] and [[02-Type-System-Differences]].

### Is `null` a thing?

Sadly yes. Use `Optional<T>` for "may be absent" returns. JPA columns use `@Column(nullable = false)`. See [[04-Optional-and-Null-Safety]].

### Where's `async`/`await`?

Three options:
1. **Virtual threads (JDK 21+)** — write blocking code, scales like async. Set `spring.threads.virtual.enabled=true`. See [[05-Virtual-Threads]].
2. **`CompletableFuture`** — promise-style composition. See [[03-CompletableFuture]].
3. **Reactive (`Mono`/`Flux`)** — Spring WebFlux. Higher learning curve, fewer apps need it now. See [[03-MOC-Spring]].

For new apps on JDK 21+: virtual threads first.

### Hot reload?

Yes — **Spring Boot DevTools** restarts on classpath changes. IntelliJ Ultimate's "HotSwap" updates method bodies without restart. See [[07-DevTools-and-Live-Reload]].

```xml
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-devtools</artifactId>
  <scope>runtime</scope>
  <optional>true</optional>
</dependency>
```

### What's `var`? Is it like `let`?

Local type inference: `var users = repo.findAll();` infers `List<User>`. Method-local only. See [[05-var-and-Local-Type-Inference]].

### Why do classes go in their own files?

Java's compiler requires public top-level classes to live in a file matching the class name (`User.java` for `class User`). It feels rigid; it's actually nice for navigation.

## Spring & framework

### Is Spring Boot like Express or like Nest.js?

Closer to **Nest.js** — opinionated, dependency-injected, decorator-driven (annotations). But far older and far bigger. See [[02-Spring-Boot-Auto-Configuration]].

### What's a "bean"?

Any object the Spring container manages. Like a Nest "provider" or an Angular service. See [[01-IoC-DI-Concepts]].

### What's `@Autowired` doing?

Injecting a bean. Modern style: don't use `@Autowired` — use **constructor injection**:

```java
@Service
@RequiredArgsConstructor   // Lombok generates ctor
public class OrderService {
    private final OrderRepository repo;
}
```

See [[01-IoC-DI-Concepts]].

### Where do I configure middleware?

It's called a **filter** (Servlet) or **interceptor** (Spring MVC) or a **`@ControllerAdvice`** for cross-cutting controller behavior. See [[01-Spring-Security-Basics]] and [[05-Exception-Handlers-and-ProblemDetail]].

### How do I read env vars?

`application.yml` placeholders + `@ConfigurationProperties`:

```yaml
db:
  url: ${DATABASE_URL}
```

```java
@ConfigurationProperties(prefix = "db")
public record DbConfig(URI url, String username) {}
```

See [[04-Configuration-Properties]].

### How do I do `process.env.NODE_ENV`?

Set `SPRING_PROFILES_ACTIVE=prod` and have an `application-prod.yml`. See [[06-Profiles-Per-Environment]].

### What about `dotenv`?

Spring Boot doesn't auto-load `.env`. Either use plain env vars (Docker/k8s) or use the `spring-dotenv` community library. In dev, IntelliJ's run config takes env vars directly.

## HTTP

### What's `app.use(express.json())`?

Built-in. Spring auto-deserializes JSON bodies via Jackson. Just declare:

```java
@PostMapping("/orders")
public Order create(@RequestBody @Valid OrderDto dto) { ... }
```

See [[01-REST-Controllers]] and [[04-Jackson-Deep-Dive]].

### What's `req.params.id`?

```java
@GetMapping("/orders/{id}")
public Order get(@PathVariable Long id) { ... }
```

See [[02-Request-Mapping-and-Path-Variables]].

### How do I call other APIs?

Use **`RestClient`** (Spring 6.1+):

```java
String body = restClient.get().uri("/users/{id}", id).retrieve().body(String.class);
```

See [[10-WebClient-and-RestClient]].

### Where's my `cors` middleware?

Configured per-controller (`@CrossOrigin`) or globally via `WebMvcConfigurer`. See [[08-CORS-Configuration]].

### How do I do error handling?

`@RestControllerAdvice` + `@ExceptionHandler`. Spring 6 has `ProblemDetail` (RFC 7807) built in. See [[05-Exception-Handlers-and-ProblemDetail]].

## Database

### What's the Java equivalent of Prisma / TypeORM?

**Spring Data JPA** (with Hibernate as the ORM). Define an `@Entity`, write a `JpaRepository<Order, Long>` interface, get CRUD for free. See [[01-JPA-Hibernate-Basics]].

### What about a query builder, like Knex?

**jOOQ** is the type-safe SQL DSL of choice. Or use Spring Data + JPA Specifications for dynamic queries. See [[10-Specifications-and-Criteria-API]].

### Migrations?

**Flyway** or **Liquibase**. Flyway = `V1__create_users.sql` files. Auto-runs on app startup. See [[08-Migrations-Flyway-Liquibase]].

### Connection pool?

**HikariCP**, default in Spring Boot. You don't have to configure it.

## Testing

### What's the JUnit version?

JUnit 5 (Jupiter). Don't use JUnit 4 in new projects. See [[02-JUnit-5-Basics]].

### What replaces Jest?

JUnit 5 + Mockito + AssertJ. Spring Boot's test slices (`@WebMvcTest`, `@DataJpaTest`) give you focused integration tests. See [[04-Spring-Boot-Test-Slices]].

### What replaces `supertest`?

`MockMvc` (in-process, fast) or `RestAssured` / `WebTestClient` (over HTTP). See [[06-Integration-Tests]].

### How do I spin up a real DB for tests?

**Testcontainers** — runs real Postgres/Kafka/Redis in Docker, just for the test. See [[05-Testcontainers]].

## Build & deploy

### What's the production artifact?

A **fat JAR** — `target/myapp-1.0.0.jar`. Run with `java -jar`. Embeds Tomcat. See [[01-Packaging-Fat-JAR]].

### Do I need an "app server" like nginx?

For production HTTPS termination, sure (or an Ingress in k8s). Spring Boot embeds Tomcat — no JBoss/Tomcat install needed. See [[02-Docker-for-Spring-Boot]].

### Docker?

Use Buildpacks (`./mvnw spring-boot:build-image`) or Jib — no Dockerfile needed. Or write a layered Dockerfile. See [[02-Docker-for-Spring-Boot]].

### Cold start is slow!

JVM cold start is ~2-5s. For Lambda/edge: GraalVM Native Image cuts to ~50ms. See [[03-GraalVM-Native-Image]].

## Your stack specifically

### What's Eureka and why do we have it?

Eureka is a **service registry** — a phone book where each microservice registers itself ("I'm orders-api, I live at this IP") and looks up others. Spring Cloud Netflix gives you a Eureka server + client. See [[03-Service-Discovery-Eureka]].

> [!tip] Eureka vs k8s DNS
> Kubernetes already does service discovery via DNS. Running Eureka on top is duplicate work but a valid choice (especially if your code is already written against it). See [[09-Stack-Specific-Eureka-Gateway-Feign-on-K8s]] for the tradeoff.

### What's Spring Cloud Gateway?

The single public entry point. Routes `/orders/**` to `orders-api`, `/users/**` to `users-api`. Can do auth, rate limiting, header rewriting. Built on **WebFlux** (reactive) — don't add `spring-boot-starter-web` to it. See [[04-API-Gateway-Spring-Cloud-Gateway]].

### What's Feign?

A declarative HTTP client. Instead of writing `restClient.get().uri(...).retrieve()...`, you declare an interface:

```java
@FeignClient(name = "users-api")
public interface UsersClient {
    @GetMapping("/api/users/{id}")
    UserDto getById(@PathVariable Long id);
}
```

Spring auto-implements it, resolves `users-api` via Eureka, and load-balances. See [[07-OpenFeign]].

### What's Spring Cloud?

An umbrella project of libraries for distributed systems on top of Spring Boot: Eureka client, Gateway, Config Server, OpenFeign, LoadBalancer, Resilience4j integration, etc. Each is a separate dependency. See [[02-Spring-Cloud-Overview]].

### How do all these pieces talk to each other on k8s?

Read [[09-Stack-Specific-Eureka-Gateway-Feign-on-K8s]] — full architecture diagram, manifests, and gotchas.

### Should JWT be validated at the Gateway or each service?

Both is best (defense in depth). At minimum: each service validates as an OAuth2 Resource Server. The Gateway can also enforce coarse rules. See [[09-Stack-Specific-Eureka-Gateway-Feign-on-K8s]] section 5.

### How do I forward a JWT through Feign calls?

Add a `RequestInterceptor` bean that copies `Authorization` from the inbound request. Code in [[09-Stack-Specific-Eureka-Gateway-Feign-on-K8s]] section 4.

## Kubernetes (you know Docker, not k8s)

### Where do I start?

[[08-Kubernetes-From-Scratch]] — written specifically for someone fluent in Docker. Maps every Docker concept to its k8s equivalent.

### Pod vs Deployment vs Service?

- **Pod** — one running container (rarely created directly)
- **Deployment** — "I want N replicas of this image, always" — auto-restart, rolling updates
- **Service** — stable DNS name + load balancing across pods of a Deployment

See [[08-Kubernetes-From-Scratch]] for the full vocabulary map (Docker → k8s).

### How do I run k8s locally?

`kind` (Kubernetes-in-Docker) is the lightest. `minikube` is more featureful. Docker Desktop has built-in k8s. See [[08-Kubernetes-From-Scratch]] section "Local k8s for development".

### Why is my pod stuck in `CrashLoopBackOff`?

`kubectl describe pod <name>` first (read the Events section), then `kubectl logs <name> --previous`. 9 times out of 10: bad config, missing env var, or DB unreachable. See the debugging flowchart in [[08-Kubernetes-From-Scratch]].

### Why does my Spring Boot pod keep restarting on startup?

Your **liveness probe** is firing before Spring finishes booting. Add a **startupProbe** with `failureThreshold: 30, periodSeconds: 10` (5 minutes max). See [[05-Health-Checks-and-Readiness]].

### How do I pass config and secrets?

ConfigMap (non-secret) and Secret (sensitive), mounted as env vars. Spring auto-binds env vars to `application.yml` properties (`SPRING_DATASOURCE_PASSWORD` → `spring.datasource.password`). See [[04-Kubernetes-Basics]].

### What replaces `docker-compose.yml`?

Roughly: a **Deployment** + **Service** + **ConfigMap** per `docker-compose` service, plus an **Ingress** for what used to be exposed ports. Use **Helm** or **Kustomize** to template/group them. See [[08-Kubernetes-From-Scratch]].

### What's `kubectl`?

The CLI for k8s. Like `docker` for Docker. The 10 commands you'll use daily are listed in [[08-Kubernetes-From-Scratch]].

## Tooling & DX

### Best IDE?

**IntelliJ IDEA** (Ultimate for Spring work). VS Code with the Java pack works for casual edits. See [[06-IDE-Setup]].

### What's Lombok and why does my IDE complain?

Compile-time annotation processor that generates getters/setters/builders. You **must** install the IDE plugin to silence the red squiggles. See [[02-Lombok]].

### Is there a linter / Prettier?

- **Spotless** — formatter (Google Java Format / Palantir / custom)
- **Checkstyle** — style enforcement
- **PMD / SpotBugs / Error Prone** — bug-pattern detectors
- **SonarLint** — IDE plugin combining many of the above

### What's the Java equivalent of `npx`?

Closest: `./mvnw exec:java -Dexec.mainClass=...` to run a one-off main. Or `jshell` for scripting. Or `jbang` (community tool) to "run" a single Java file.

### Is there a single-file run mode?

JDK 11+: `java HelloWorld.java` runs a single source file directly (no compile step). Useful for scripts.

## Mental model

### Why so many annotations?

Annotations are Java's primary metaprogramming. They're discovered by reflection (Spring) or annotation processors (Lombok, MapStruct). Once you internalize them, they're shorter than the equivalent JS decorators + boilerplate.

### Why does everything take so long to start?

Classpath scanning + bean wiring. Spring 6 + Boot 3's AOT processing helps; native image makes it ~100ms. For dev: keep the app running and use DevTools.

### Why does the JVM feel "heavy"?

Modern JVMs (21+) with G1/ZGC are very efficient. With virtual threads + container-aware sizing, a typical Spring Boot service runs in 300-500MB. See [[03-JVM-Memory-and-GC]].

### Will I miss TypeScript?

Sometimes — the type system is less expressive (no union types, no structural typing). But you gain: a more mature ecosystem, faster runtime, world-class refactoring tools, and `record`s + `sealed` interfaces cover most discriminated-union needs. See [[02-Type-System-Differences]].

## Related
- [[00-README]]
- [[01-Learning-Path]]
- [[05-Glossary]]
- [[01-Java-vs-TypeScript-Quick-Map]]
- [[01-Library-Cheatsheet]]
- [[06-IDE-Setup]]
- [[08-Kubernetes-From-Scratch]]
- [[09-Stack-Specific-Eureka-Gateway-Feign-on-K8s]]
