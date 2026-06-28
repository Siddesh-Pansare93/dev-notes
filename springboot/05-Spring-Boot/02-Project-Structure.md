---
tags:
  - spring-boot
  - structure
  - conventions
aliases:
  - Project Layout
  - Package Structure
stage: intermediate
---

# Project Structure

> [!info] For the Express/TS dev
> Spring Boot doesn't enforce a layout, but there's a strong convention: source under `src/main/java`, tests under `src/test/java`, config under `src/main/resources`. Within Java, you choose between **package-by-layer** (controllers/, services/) or **package-by-feature** (user/, order/) — same debate as `routes/controllers/services` vs `modules/user/*` in Node.

## Maven/Gradle directory layout

```
my-app/
├── pom.xml                     # or build.gradle
├── mvnw, mvnw.cmd              # Maven wrapper (commit these)
├── .mvn/                       # wrapper config
├── src/
│   ├── main/
│   │   ├── java/
│   │   │   └── com/example/app/
│   │   │       ├── App.java                  # @SpringBootApplication
│   │   │       ├── user/
│   │   │       │   ├── UserController.java
│   │   │       │   ├── UserService.java
│   │   │       │   └── UserRepository.java
│   │   │       └── order/
│   │   │           └── ...
│   │   └── resources/
│   │       ├── application.yml               # main config
│   │       ├── application-dev.yml           # profile-specific
│   │       ├── application-prod.yml
│   │       ├── static/                       # served at /
│   │       ├── templates/                    # Thymeleaf, etc.
│   │       └── db/migration/                 # Flyway SQL
│   └── test/
│       ├── java/
│       │   └── com/example/app/
│       │       ├── AppTests.java
│       │       └── user/UserServiceTests.java
│       └── resources/
│           └── application-test.yml
└── target/                     # build output (gitignored)
```

> [!tip] Always commit the Maven/Gradle wrapper
> `mvnw` / `gradlew` and the `.mvn/` or `gradle/` folder pin the build tool version. Anyone cloning the repo gets the right Maven/Gradle without installing it. See [[../03-Build-Tools/Maven-Basics]].

## The root package matters

`@SpringBootApplication` enables [[../04-Spring-Core/03-Component-Scanning|component scanning]] starting from **its own package**.

```
com.example.app          ← App.java lives here (root package)
com.example.app.user     ← scanned automatically
com.example.app.order    ← scanned automatically
com.example.shared       ← NOT scanned (sibling package)
```

> [!warning] Place your main class at the root of your package tree
> If `App.java` is in `com.example.app.boot`, then `com.example.app.user` won't be scanned and you'll get `NoSuchBeanDefinitionException` errors.

## Package-by-layer

```
com.example.app/
├── controller/
│   ├── UserController.java
│   └── OrderController.java
├── service/
│   ├── UserService.java
│   └── OrderService.java
├── repository/
│   ├── UserRepository.java
│   └── OrderRepository.java
└── model/
    ├── User.java
    └── Order.java
```

Pros: familiar from tutorials; easy to find "all controllers."
Cons: a feature touches every layer's package; coupling shows up as cross-package imports; doesn't scale past ~20 entities.

## Package-by-feature (RECOMMENDED)

```
com.example.app/
├── App.java
├── common/                   # shared infra (config, exceptions, utils)
│   ├── config/
│   ├── exception/
│   └── util/
├── user/
│   ├── UserController.java
│   ├── UserService.java
│   ├── UserRepository.java
│   ├── User.java
│   └── dto/
│       ├── UserCreateRequest.java
│       └── UserResponse.java
└── order/
    ├── OrderController.java
    ├── OrderService.java
    ├── OrderRepository.java
    ├── Order.java
    └── dto/
```

> [!tip] Why package-by-feature wins
> - A feature is **deletable** as a folder.
> - Coupling between features is visible (cross-package imports).
> - You can apply Java's `package-private` visibility to enforce module boundaries: only the controller is `public`, helpers are package-private.
> - Mirrors microservice extraction: today's package = tomorrow's service.

## Tests should mirror main

```
src/main/java/com/example/app/user/UserService.java
src/test/java/com/example/app/user/UserServiceTest.java
```

Tests in the same package can access package-private helpers. Stick to this — it pays off when [[../09-Testing/Unit-Testing-Services|unit testing]].

## Resources directory

```
src/main/resources/
├── application.yml          # main config (see 05-Application-Properties)
├── application-{profile}.yml
├── logback-spring.xml       # custom logging config (08-Logging)
├── messages.properties      # i18n
├── static/                  # served at /, e.g. /index.html
├── templates/               # server-rendered (Thymeleaf, FreeMarker)
└── db/migration/            # Flyway: V1__init.sql, V2__add_orders.sql
```

## Code example: a feature module

```
src/main/java/com/example/app/user/
├── UserController.java       (public — REST entry point)
├── UserService.java          (package-private — business logic)
├── UserRepository.java       (package-private — JPA)
├── User.java                 (package-private entity)
├── dto/
│   ├── CreateUserRequest.java
│   └── UserResponse.java
└── exception/
    └── UserNotFoundException.java
```

```java
package com.example.app.user;

@RestController
@RequestMapping("/users")
public class UserController {              // public: REST surface

    private final UserService service;

    public UserController(UserService s) { this.service = s; }

    @PostMapping
    public UserResponse create(@RequestBody @Valid CreateUserRequest req) {
        return service.create(req);
    }
}

@Service
class UserService {                         // package-private: internal
    private final UserRepository repo;
    UserService(UserRepository r) { this.repo = r; }
    UserResponse create(CreateUserRequest req) { ... }
}
```

Other features can't depend on `UserService` directly — only `UserController` is reachable. Excellent for enforcing boundaries.

## Multi-module projects

For larger apps, split into Maven modules:

```
parent/
├── pom.xml                    # <packaging>pom</packaging>
├── core/                      # domain
├── infra/                     # persistence, messaging
├── web/                       # controllers
└── app/                       # bootstrap (depends on web, infra, core)
```

Beyond the scope of this note — covered later in [[../10-Microservices/Module-Boundaries]].

## Gotchas

> [!warning] Common pitfalls
> - **Default package** (no `package` declaration) — Spring Boot refuses to scan it. Always use a package.
> - **Splitting the main class away from your code** — see "Root package matters" above.
> - **Two `application.yml` files** (e.g. one in jar, one outside) — outside takes precedence; can be confusing in deploys.
> - **Mixing test and main resources** — anything in `src/main/resources` ships in the JAR. Put fixtures in `src/test/resources`.

## Related
- [[01-What-is-Spring-Boot]]
- [[03-Auto-Configuration]]
- [[05-Application-Properties]]
- [[06-SpringApplication-Bootstrap]]
- [[../03-Build-Tools/Maven-Basics]]
- [[../04-Spring-Core/03-Component-Scanning]]
- [[../09-Testing/Unit-Testing-Services]]
