---
tags: [spring, core, component-scan, stereotypes]
aliases: [Component Scanning, Stereotypes, "@Component", "@Service", "@Repository"]
stage: intermediate
---

# Component Scanning and Stereotypes

> [!info] For the Express/TS dev
> Instead of importing each class into a central wiring file, Spring **walks your classpath at startup** and registers anything tagged with a stereotype annotation as a [[02-Beans-and-Application-Context|bean]]. Closest Node analog: file-based routing in Next.js — convention over manual registration.

## What is component scanning?

`@ComponentScan` tells Spring: "look in these packages, find any class annotated with `@Component` (or a stereotype), and register it as a bean."

```java
@Configuration
@ComponentScan(basePackages = "com.example.app")
public class AppConfig { }
```

> [!tip] You rarely write `@ComponentScan` yourself
> `@SpringBootApplication` includes it implicitly, scanning **the package of the main class and all sub-packages**.
> ```java
> @SpringBootApplication       // = @Configuration + @EnableAutoConfiguration + @ComponentScan
> public class App { ... }
> ```

## The stereotype annotations

All four are essentially `@Component` with semantic meaning. Spring treats them identically for scanning, but they communicate intent and may add behavior.

| Annotation | Use for | Extra behavior |
|---|---|---|
| `@Component` | Generic bean | none |
| `@Service` | Business logic / domain services | none (semantic only) |
| `@Repository` | Data access (DAO/JPA) | translates persistence exceptions → Spring's `DataAccessException` |
| `@Controller` | Web MVC controller | scanned for `@RequestMapping` handlers |
| `@RestController` | REST API controller | `@Controller` + `@ResponseBody` |
| `@Configuration` | Bean-definition class | also a bean; `@Bean` methods inside are proxied — see [[04-Configuration-Classes]] |

> [!note] Pick the most specific one
> Always prefer `@Service` over `@Component` for a service class. It's a documentation aid for your team, even though it functionally identical.

## Code example

```java
package com.example.app;

@SpringBootApplication        // scans com.example.app.**
public class App {
    public static void main(String[] args) {
        SpringApplication.run(App.class, args);
    }
}
```

```java
package com.example.app.user;

@Repository
public class UserRepository {
    public Optional<User> findById(Long id) { /* ... */ }
}

@Service
public class UserService {
    private final UserRepository repo;
    public UserService(UserRepository repo) { this.repo = repo; }
    public User get(Long id) { return repo.findById(id).orElseThrow(); }
}

@RestController
@RequestMapping("/users")
public class UserController {
    private final UserService service;
    public UserController(UserService s) { this.service = s; }

    @GetMapping("/{id}")
    public User get(@PathVariable Long id) { return service.get(id); }
}
```

All three classes become beans automatically because they live under `com.example.app`.

## Custom scan paths

```java
@SpringBootApplication
@ComponentScan(basePackages = {
    "com.example.app",
    "com.example.shared"
})
public class App { }
```

### Filtering

```java
@ComponentScan(
    basePackages = "com.example",
    includeFilters = @Filter(type = FilterType.REGEX, pattern = ".*Bot"),
    excludeFilters = @Filter(type = FilterType.ANNOTATION, classes = Deprecated.class)
)
```

## Stereotype meta-annotations

You can build your own stereotype:

```java
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Service
public @interface DomainService { }

// Usage
@DomainService
public class PricingEngine { ... }   // still scanned as a bean
```

## Gotchas

> [!warning] Common pitfalls
> - **Class is in a package above the main class** → not scanned. Move it under, or add explicit `basePackages`.
> - **Forgot the annotation entirely** → mysterious `NoSuchBeanDefinitionException` at injection time. See [[01-IoC-DI-Concepts#Gotchas]].
> - **Two scans overlapping** (e.g. test config + main config) can register the same bean twice. Use `@TestConfiguration` to scope test beans.
> - **`@Component` on an `interface`** does nothing — only concrete classes are instantiated.
> - **Stereotype on an inner class** requires the inner class to be `static`, otherwise it can't be instantiated by the container.

> [!example] Quick debug recipe
> Print every registered bean to confirm scanning works:
> ```java
> @Bean
> CommandLineRunner debug(ApplicationContext ctx) {
>     return args -> Arrays.stream(ctx.getBeanDefinitionNames())
>                          .sorted().forEach(System.out::println);
> }
> ```

## Related
- [[01-IoC-DI-Concepts]]
- [[02-Beans-and-Application-Context]]
- [[04-Configuration-Classes]]
- [[../05-Spring-Boot/06-SpringApplication-Bootstrap]]
- [[../06-Web-REST/REST-Controllers]]
- [[../07-Data-JPA/JPA-Repositories]]
