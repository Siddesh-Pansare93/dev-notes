---
tags: [deployment, twelve-factor, best-practices, architecture]
aliases: [12-Factor, Twelve Factor]
stage: intermediate
---

# Twelve-Factor Spring

> [!info] For the Express/TS dev
> The 12-factor methodology is platform-agnostic. Spring Boot was designed with it in mind: externalized config, stateless processes, log-to-stdout, port binding, etc. This note maps each factor to the Spring idiom.

## I. Codebase

> One codebase tracked in revision control, many deploys.

- One Git repo per deployable service
- Same JAR ships to dev/staging/prod — only config changes
- Multi-module Maven/Gradle for shared libraries within a single deployable

## II. Dependencies

> Explicitly declare and isolate dependencies.

- Maven `pom.xml` / Gradle `build.gradle` lock direct deps
- BOMs (Bill of Materials) like `spring-boot-dependencies` pin transitive versions
- Never rely on system-installed JARs — fat JARs bundle everything ([[01-Packaging-Fat-JAR]])

## III. Config

> Store config in the environment.

- Externalize via `application.yml` + `SPRING_*` env vars
- See [[06-Profiles-Per-Environment]]
- Use `@ConfigurationProperties` for typed config
- Secrets via mounted files or secret managers — never in source

```java
@ConfigurationProperties(prefix = "payments")
public record PaymentsConfig(URI gatewayUrl, Duration timeout, String apiKey) {}
```

## IV. Backing services

> Treat backing services as attached resources.

- DB, Redis, Kafka, S3 are **URIs** in config — swap `localhost:5432` for `db.prod.svc.cluster.local:5432` without code changes
- Use connection pools (HikariCP for JDBC — default in Spring Boot)
- Health-check each backing service ([[05-Health-Checks-and-Readiness]])

## V. Build, release, run

> Strictly separate build and run stages.

- **Build**: `./mvnw package` produces an immutable JAR
- **Release**: JAR + config = an image tagged with version
- **Run**: container runtime executes the image
- A given release is immutable. Rollback = redeploy previous tag.

## VI. Processes

> Execute the app as one or more stateless processes.

- No in-process session state — use Redis / DB / JWT
- No local file writes for persistence (except temp/cache)
- Spring Session for distributed HTTP sessions if needed
- Sticky sessions are an anti-pattern at scale

## VII. Port binding

> Export services via port binding.

- Spring Boot embeds Tomcat/Netty — binds to a port (`server.port`)
- No external app server (Tomcat/JBoss/WebLogic) needed
- Service-to-service via HTTP/gRPC, not shared filesystem

## VIII. Concurrency

> Scale out via the process model.

- Horizontal scaling via more pods/replicas
- Tune thread pools (`server.tomcat.threads.max`)
- Async work via `@Async` + `Executor` beans, or virtual threads (`spring.threads.virtual.enabled=true` in Boot 3.2+)
- Heavy CPU work → separate worker services + queue ([[01-Spring-Kafka]])

## IX. Disposability

> Maximize robustness with fast startup and graceful shutdown.

- **Fast startup**: AOT / GraalVM Native ([[03-GraalVM-Native-Image]]) for sub-second boot
- **Graceful shutdown**:
  ```yaml
  server:
    shutdown: graceful
  spring:
    lifecycle:
      timeout-per-shutdown-phase: 30s
  ```
- Drain in-flight requests, close pools, flush queues

## X. Dev/prod parity

> Keep development, staging, and production as similar as possible.

- Use **Testcontainers** ([[01-Testing-Strategy]]) so devs run real Postgres/Kafka/Redis locally — not H2/embedded mocks
- Same JDK version everywhere (lock via `.sdkmanrc` or `.tool-versions`)
- Same OS family if possible (Linux containers locally too)

## XI. Logs

> Treat logs as event streams.

- Log to **stdout/stderr** (default with Spring Boot)
- Don't manage rotation in-app — let the platform/k8s do it
- Structured JSON in prod ([[03-Logging-Best-Practices]])
- Aggregate via Loki, ELK, Datadog, CloudWatch — never `tail -f`

## XII. Admin processes

> Run admin/management tasks as one-off processes.

- DB migrations: Flyway/Liquibase ([[03-Migrations-Flyway-Liquibase]]) — runs on app startup or as a separate job
- Data backfills: separate `@SpringBootApplication` mode, or a CommandLineRunner with a profile guard
- Don't expose admin endpoints over public HTTP

```java
@Component
@Profile("backfill")
public class BackfillRunner implements CommandLineRunner {
    @Override
    public void run(String... args) {
        // one-off task, then exit
    }
}
```

Run with `SPRING_PROFILES_ACTIVE=backfill` in a Job pod.

## Bonus: cloud-native additions

The 12-factor list predates k8s. Modern additions:
- **API first** — OpenAPI spec as source of truth ([[02-OpenAPI-Swagger]])
- **Telemetry** — metrics, traces, logs as first-class
- **Authentication** — externalized via OIDC/OAuth2 ([[02-OAuth2-OIDC-with-Spring]])

## Related
- [[03-Configuration-Properties]]
- [[06-Profiles-Per-Environment]]
- [[04-Kubernetes-Basics]]
- [[03-Logging-Best-Practices]]
- [[05-Health-Checks-and-Readiness]]
