---
tags:
  - spring-boot
  - bootstrap
  - main-class
aliases:
  - "@SpringBootApplication"
  - SpringApplication
  - main class
stage: intermediate
---

# SpringApplication and Bootstrap

> [!info] For the Express/TS dev
> Like `index.ts` containing `app.listen(3000)`, every Spring Boot app has a `main` method that calls `SpringApplication.run(...)`. The difference: the `run` call **builds the entire application context**, runs auto-configuration, starts the embedded server, and returns only when the app is fully ready.

## The classic main class

```java
package com.example.app;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class App {
    public static void main(String[] args) {
        SpringApplication.run(App.class, args);
    }
}
```

That's the entire entry point. It will:

1. Print the banner.
2. Create an `ApplicationContext` ([[../04-Spring-Core/02-Beans-and-Application-Context]]).
3. Load `application.yml` ([[05-Application-Properties]]).
4. Activate profiles.
5. Run [[03-Auto-Configuration|auto-configuration]].
6. Scan components ([[../04-Spring-Core/03-Component-Scanning]]).
7. Instantiate beans, inject dependencies.
8. Start the embedded server (if web).
9. Run any `ApplicationRunner` / `CommandLineRunner` beans.
10. Block until shutdown.

## What @SpringBootApplication actually is

It's a meta-annotation combining three:

```java
@SpringBootConfiguration       // = @Configuration, marks this as a config class
@EnableAutoConfiguration       // turn on auto-config
@ComponentScan                 // scan THIS package + sub-packages
public @interface SpringBootApplication { ... }
```

Equivalent long form (rarely written):

```java
@Configuration
@EnableAutoConfiguration
@ComponentScan
public class App { ... }
```

> [!tip] Where to place the main class
> Put it at the **root of your package tree** (e.g. `com.example.app.App`). Component scan starts here. Anything in a sibling or parent package is invisible. See [[02-Project-Structure]].

## Customizing the bootstrap

For most apps, `SpringApplication.run(App.class, args)` is fine. When you need more control:

```java
public static void main(String[] args) {
    new SpringApplicationBuilder(App.class)
        .profiles("dev")
        .bannerMode(Banner.Mode.OFF)
        .properties("server.port=9000")
        .listeners(new MyStartupListener())
        .web(WebApplicationType.SERVLET)
        .run(args);
}
```

Or:

```java
public static void main(String[] args) {
    SpringApplication app = new SpringApplication(App.class);
    app.setAdditionalProfiles("dev");
    app.setLogStartupInfo(false);
    app.run(args);
}
```

## Application arguments

The `String[] args` is more than a placeholder. Spring parses it:

```bash
java -jar app.jar --server.port=9000 --debug input.txt
```

Inject `ApplicationArguments` to read them properly:

```java
@Component
public class StartupReader implements CommandLineRunner {

    private final ApplicationArguments args;

    public StartupReader(ApplicationArguments args) { this.args = args; }

    @Override
    public void run(String... raw) {
        boolean debug = args.containsOption("debug");
        List<String> ports = args.getOptionValues("server.port");   // [9000]
        List<String> files = args.getNonOptionArgs();               // [input.txt]
    }
}
```

Or simpler `CommandLineRunner` (raw args):

```java
@Component
public class Bootstrap implements CommandLineRunner {
    @Override
    public void run(String... args) {
        System.out.println("Started with: " + Arrays.toString(args));
    }
}
```

> [!note] Runner ordering
> Multiple `Runner` beans run in `@Order` order. They run **after** the context is ready but **before** the application accepts traffic — useful for one-time data fixtures, schema checks, etc.

## The banner

That ASCII art at startup. Customize via:

```
src/main/resources/banner.txt
```

Or disable:

```yaml
spring:
  main:
    banner-mode: off
```

> [!example] Tasteful banner
> ```
>   ___  _ __ ___   ___ _ __
>  / _ \| '__/ _ \ / _ \ '__|
> | (_) | | | (_) |  __/ |
>  \___/|_|  \___/ \___|_|
>
> :: Order Service :: ${spring.application.name} ::
> Profile(s): ${spring.profiles.active:default}
> Build: ${app.version:dev}
> ```

## Web vs non-web vs reactive

Spring Boot auto-detects, but you can force it:

```java
new SpringApplicationBuilder(App.class)
    .web(WebApplicationType.NONE)         // batch / CLI app
    .run(args);
```

| Type | Trigger |
|---|---|
| `SERVLET` | `spring-webmvc` on classpath (default for `starter-web`) |
| `REACTIVE` | `spring-webflux` on classpath, no MVC |
| `NONE` | Neither — runs and exits when context closes |

## Shutdown

Spring Boot registers a JVM shutdown hook automatically. Beans with `@PreDestroy` or `DisposableBean` run on `Ctrl+C` or `kill -TERM`. See [[../04-Spring-Core/06-Bean-Scopes-Lifecycle]].

For graceful HTTP shutdown:

```yaml
server:
  shutdown: graceful
spring:
  lifecycle:
    timeout-per-shutdown-phase: 30s
```

In-flight requests complete; new connections rejected.

## Code example: a CLI tool that uses Spring

```java
@SpringBootApplication
public class ImportTool implements CommandLineRunner {

    private final UserRepository repo;

    public ImportTool(UserRepository repo) { this.repo = repo; }

    public static void main(String[] args) {
        new SpringApplicationBuilder(ImportTool.class)
            .web(WebApplicationType.NONE)
            .run(args);
    }

    @Override
    public void run(String... args) throws Exception {
        if (args.length < 1) {
            System.err.println("Usage: import <file.csv>");
            System.exit(1);
        }
        Files.lines(Path.of(args[0]))
             .map(this::parse)
             .forEach(repo::save);
        System.out.println("Done.");
    }

    private User parse(String line) { /* ... */ }
}
```

A non-web Spring Boot app: full DI + auto-config, but exits when `run()` returns.

## Gotchas

> [!warning] Common pitfalls
> - **Main class in default package** → component scan fails silently. Always use a package.
> - **Two `@SpringBootApplication`-annotated classes** → unpredictable scanning behavior.
> - **`SpringApplication.run` exit code** — the JVM stays up because the embedded server has non-daemon threads. For CLI apps with `WebApplicationType.NONE`, ensure your runner finishes or call `System.exit(...)`.
> - **`@EnableAutoConfiguration` plus a wider `@ComponentScan`** that picks up multiple `@Configuration` classes in different test modules — duplicate context loads in tests.
> - **Long startup** — most often: many `@PostConstruct` doing I/O. Profile with `--spring.context.applicationStartup=...` or use the Actuator `/startup` endpoint.

## Related
- [[01-What-is-Spring-Boot]]
- [[02-Project-Structure]]
- [[03-Auto-Configuration]]
- [[05-Application-Properties]]
- [[09-Building-and-Running]]
- [[../04-Spring-Core/02-Beans-and-Application-Context]]
- [[../04-Spring-Core/03-Component-Scanning]]
- [[../04-Spring-Core/06-Bean-Scopes-Lifecycle]]
