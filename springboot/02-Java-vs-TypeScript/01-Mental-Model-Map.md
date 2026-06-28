---
tags: [java, typescript, comparison, mental-model, foundation]
aliases: [TS to Java Map, Mental Model, Concept Bridge]
stage: foundation
---

# Mental Model Map: TypeScript → Java

> [!info] For the Express/TS dev
> This note is your Rosetta Stone. Every concept you reach for in Node/Express has a Java/Spring counterpart — the names differ, the philosophy sometimes differs more, but the *shape* of the problem is the same. Skim this once, then come back whenever a Java term feels alien.

## The 30-second elevator pitch

Java is to TypeScript what a freight train is to a sports car. TypeScript ships fast, infers types, and tolerates a lot of shape-shifting. Java is verbose, nominal, statically compiled to bytecode, and runs on a JVM that has been ruthlessly optimized for 30 years. Spring Boot is "Express + Nest + Prisma + dotenv + PM2 + a DI container, all wired up before you wrote your first line."

You will write more code per feature in Java. You will also catch more bugs at compile time and ship something that runs predictably for years.

## High-level concept map

| Concept                   | TypeScript / Node                   | Java / Spring Boot                                    |
| ------------------------- | ----------------------------------- | ----------------------------------------------------- |
| Package manager           | `npm` / `pnpm` / `yarn`             | `Maven` / `Gradle` (see [[01-Maven-Basics]])          |
| Manifest                  | `package.json`                      | `pom.xml` or `build.gradle(.kts)`                     |
| Lockfile                  | `package-lock.json`                 | `pom.xml` is itself reproducible (versions are pinned) |
| Registry                  | npmjs.com                           | Maven Central, Gradle Plugin Portal                   |
| Module                    | ESM `import` / CJS `require`        | `package` declaration + `import`                      |
| Runtime                   | Node.js (V8)                        | JVM (HotSpot, GraalVM)                                |
| Entry point               | `node dist/index.js`                | `public static void main(String[] args)`              |
| HTTP framework            | Express / Fastify / Nest            | Spring MVC / Spring WebFlux                           |
| Routing                   | `app.get('/users', handler)`        | `@GetMapping("/users")` on a `@RestController`        |
| Middleware                | `app.use(fn)`                       | `Filter`, `HandlerInterceptor`, `@Aspect`             |
| Validation                | Zod / Joi / class-validator         | Bean Validation (`@NotNull`, `@Valid`, Hibernate Validator) |
| ORM                       | Prisma / TypeORM / Drizzle          | JPA + Hibernate / Spring Data JPA / jOOQ              |
| Migrations                | Prisma Migrate / Knex               | Flyway / Liquibase                                    |
| DI container              | tsyringe / Nest DI / InversifyJS    | Spring `ApplicationContext` (built in)                |
| Async primitive           | `Promise<T>` + `async/await`        | `CompletableFuture<T>`, `Mono<T>`/`Flux<T>` (Reactor) |
| Concurrency unit          | Single-threaded event loop          | OS threads + virtual threads (Project Loom, JDK 21+)  |
| Logging                   | pino / winston                      | SLF4J + Logback (default in Spring Boot)              |
| Env config                | `dotenv` + `process.env`            | `application.yml` + Spring profiles                   |
| Testing                   | Jest / Vitest                       | JUnit 5 + Mockito + AssertJ                           |
| HTTP client               | `fetch` / axios                     | `RestClient` / `WebClient` / OpenFeign                |
| Hot reload                | `nodemon` / `tsx watch`             | `spring-boot-devtools`                                |
| Build artifact            | `dist/` folder of JS                | A single fat `.jar` (or `.war`)                       |
| Process manager           | PM2 / systemd                       | `java -jar app.jar` + systemd / Docker                |
| Type checker              | `tsc --noEmit`                      | `javac` (always — there is no separate type-check)    |
| Linter                    | ESLint                              | Checkstyle / PMD / SpotBugs / ErrorProne              |
| Formatter                 | Prettier                            | Spotless / google-java-format                         |
| REPL                      | `node` / `ts-node`                  | `jshell`                                              |
| Monorepo                  | turborepo / nx / pnpm workspaces    | Maven multi-module / Gradle composite builds          |

## Mental shifts you must make

> [!warning] These will trip you up
> 1. **No top-level code.** Everything lives inside a class. Even `main` is a `static` method on a class.
> 2. **Files and types are coupled.** A `public class Foo` *must* live in `Foo.java`. One public class per file.
> 3. **Compilation is mandatory.** There is no `ts-node`-style "just run the source." Maven/Gradle compile to `.class` files first.
> 4. **No structural typing.** If `Dog` has the same shape as `Cat`, they are still incompatible. You opt in via `interface` and `implements`.
> 5. **No `undefined`.** Only `null`. And modern Java pushes you toward `Optional<T>` instead.
> 6. **Generics are erased at runtime.** `List<String>` and `List<Integer>` are the same class at runtime — no `instanceof List<String>`.
> 7. **`async` is not a keyword.** Async work is a *library* concern (`CompletableFuture`, Reactor, virtual threads).

## The Spring Boot "magic" demystified

Coming from Express, you'll see Spring Boot apps with very little visible wiring and wonder where the routes get registered. The answer: **classpath scanning + annotations + dependency injection**.

```ts
// Express — wiring is explicit
const app = express();
const userService = new UserService(new UserRepo(db));
const userController = new UserController(userService);
app.get('/users/:id', userController.getById);
```

```java
// Spring — wiring is declarative; the container does it
@RestController
@RequestMapping("/users")
public class UserController {
    private final UserService service;
    public UserController(UserService service) { this.service = service; }

    @GetMapping("/{id}")
    public User getById(@PathVariable Long id) { return service.findById(id); }
}
```

The `@RestController` annotation tags the class. At startup, Spring scans the classpath, finds every `@Component`/`@Service`/`@RestController`, instantiates them, resolves their constructor dependencies, and registers the routes with the embedded Tomcat. See [[Spring-Boot-Starters]] and [[Dependency-Injection]] for deeper treatment.

## Idiom-level analogies

> [!example] Patterns you already know, renamed
> - **Express middleware chain** ≈ Servlet `Filter` chain (low-level) or `HandlerInterceptor` (Spring-level). For cross-cutting like auth, often `@Aspect` (AOP).
> - **Express error-handling middleware** ≈ `@ControllerAdvice` + `@ExceptionHandler`.
> - **Zod parse → typed object** ≈ `@Valid @RequestBody Dto dto` — Jackson deserializes JSON into the DTO, Bean Validation enforces constraints.
> - **Prisma `prisma.user.findMany({ where })`** ≈ Spring Data `userRepository.findByEmail(email)` — derived from method name.
> - **`process.env.DATABASE_URL`** ≈ `@Value("${spring.datasource.url}")` or `@ConfigurationProperties`.
> - **`pnpm workspaces`** ≈ Maven multi-module project (parent `pom.xml` aggregating children). See [[05-Multi-Module-Projects]].
> - **Nest's guards/pipes/interceptors** ≈ Spring's filters/validators/AOP — Nest is essentially "Spring for TypeScript."

## What does *not* map cleanly

| TS thing                 | Java reality                                                 |
| ------------------------ | ------------------------------------------------------------ |
| Union types `A \| B`     | No native equivalent. Use sealed interfaces or `Object`. See [[02-Type-System-Differences]]. |
| Mapped/conditional types | Don't exist. You write the types out by hand.                |
| `Partial<T>`             | No. Use the Builder pattern or DTOs.                         |
| `keyof T`                | Reflection (`Class<?>`/`Field`) — runtime only and clunky.   |
| Discriminated unions     | `sealed interface Result permits Ok, Err {}` (Java 17+).     |
| Decorators (proposal)    | Annotations + reflection — but Java has had these since 2004. |

## Recommended learning order

1. Get fundamentals: [[01-Java-Fundamentals]] — types, classes, generics.
2. Internalize the type system: [[02-Type-System-Differences]].
3. Understand concurrency: [[03-Async-Concurrency]].
4. Learn build tooling: [[01-Maven-Basics]].
5. Translate Express idioms: [[06-Idiom-Translation]].
6. Then jump into Spring: [[Spring-Boot-Starters]].

## Gotchas

> [!warning] Common newbie traps
> - Treating `String` like a primitive — it's an immutable object; `==` compares references, use `.equals()`.
> - Expecting `null` checks to feel ergonomic — they don't. Wrap with `Optional<T>` at API boundaries.
> - Reaching for `any` — Java has `Object`, but you'll regret it. Use generics.
> - Looking for `npm install foo` — install nothing globally; declare the dep in `pom.xml`.
> - Assuming hot reload "just works" — you must include `spring-boot-devtools` and your IDE must auto-build.

## Related

- [[02-Type-System-Differences]]
- [[03-Async-Concurrency]]
- [[04-Module-System]]
- [[05-Tooling-Map]]
- [[06-Idiom-Translation]]
- [[01-Maven-Basics]]
- [[Spring-Boot-Starters]]
- [[Dependency-Injection]]
