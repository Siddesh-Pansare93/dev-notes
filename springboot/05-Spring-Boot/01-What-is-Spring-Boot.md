---
tags:
  - spring-boot
  - introduction
aliases:
  - Spring Boot
  - Boot vs Spring
stage: intermediate
---

# What is Spring Boot?

> [!info] For the Express/TS dev
> Plain Spring is like Express with NO defaults — you wire the HTTP server, JSON parser, error handlers, DB pool, security, logging, metrics by hand. **Spring Boot** is what `create-next-app` is to React: an **opinionated wrapper** around Spring that picks reasonable defaults, embeds a server, and lets you `mvn spring-boot:run` to a running web app in seconds.

## Spring vs Spring Boot

| Concern | Plain Spring | Spring Boot |
|---|---|---|
| HTTP server | Deploy WAR to Tomcat/Jetty manually | Embedded Tomcat by default |
| Configuration | XML or large `@Configuration` files | [[03-Auto-Configuration\|Auto-config]] + `application.yml` |
| Dependencies | Pick versions for every Spring module | [[04-Starters\|Starters]] bundle compatible versions |
| JSON | Configure Jackson manually | Wired automatically |
| Health/metrics | Build it | `spring-boot-starter-actuator` |
| Run | `mvn package` → deploy WAR | `mvn spring-boot:run` or `java -jar app.jar` |
| Bootstrap class | Manual `ApplicationContext` setup | `@SpringBootApplication` + `main()` |

> [!note] Spring Boot is not a fork
> It's Spring + auto-configuration + sensible defaults + an executable-JAR build plugin. Every Spring concept ([[../04-Spring-Core/01-IoC-DI-Concepts|IoC]], [[../04-Spring-Core/02-Beans-and-Application-Context|beans]], [[../04-Spring-Core/08-AOP-Basics|AOP]]) still applies.

## The four Spring Boot superpowers

1. **[[03-Auto-Configuration|Auto-configuration]]** — detects libraries on the classpath and configures them. H2 on classpath? You get a DataSource. Jackson on classpath? You get an `ObjectMapper`.
2. **[[04-Starters|Starters]]** — `spring-boot-starter-web` brings web MVC + Tomcat + Jackson + validation, all version-compatible.
3. **Embedded server** — fat JAR with Tomcat/Jetty/Undertow inside. No deploy step.
4. **Production-ready** — Actuator endpoints, externalized config, profiles, health checks out of the box.

## "Opinionated defaults" in practice

You add this to `pom.xml`:

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>
```

You write this:

```java
@SpringBootApplication
public class App {
    public static void main(String[] args) {
        SpringApplication.run(App.class, args);
    }
}

@RestController
class Hello {
    @GetMapping("/")
    String hi() { return "Hello"; }
}
```

You get, automatically:
- Tomcat on port 8080
- Jackson JSON serialization
- Sensible error pages (`/error`)
- Logback console logging
- A graceful shutdown hook
- `application.properties` / `application.yml` loading
- Profile support
- Banner on startup

Compare to a similar Express setup where you'd `npm install express morgan helmet pino dotenv` and wire them yourself.

## When to override defaults

> [!tip] Convention over configuration
> Spring Boot's auto-config follows the [[../04-Spring-Core/07-Profiles-and-Conditionals|`@ConditionalOnMissingBean`]] pattern: it gives you a default *only if you haven't provided one*. Want to swap Jackson for a different JSON lib? Define your own `ObjectMapper` `@Bean` and the default disappears.

## What versions exist?

- **Spring Boot 3.x** (current) — requires Java 17+, Jakarta EE 9+ namespace (`jakarta.*` not `javax.*`)
- **Spring Boot 2.x** — Java 8/11, `javax.*` namespace, end-of-life

This vault assumes **3.x**. If you see `javax.persistence` in tutorials, it's old.

## Code example: full minimal app

`pom.xml`:

```xml
<project>
    <modelVersion>4.0.0</modelVersion>
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.3.0</version>
    </parent>
    <groupId>com.example</groupId>
    <artifactId>demo</artifactId>
    <version>0.0.1</version>

    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
        </plugins>
    </build>
</project>
```

`src/main/java/com/example/demo/DemoApplication.java`:

```java
package com.example.demo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.*;

@SpringBootApplication
public class DemoApplication {
    public static void main(String[] args) {
        SpringApplication.run(DemoApplication.class, args);
    }
}

@RestController
class Greet {
    @GetMapping("/hello/{name}")
    String hi(@PathVariable String name) { return "Hello, " + name; }
}
```

Run:

```bash
mvn spring-boot:run
curl http://localhost:8080/hello/world
```

## Gotchas

> [!warning] Common pitfalls
> - **Boot version drift** — when adding non-starter Spring deps, don't override their versions; let the Boot parent BOM pick compatible ones.
> - **Mixing Boot 2 and Boot 3 examples** — `javax.*` ↔ `jakarta.*` will not compile. Always check the import.
> - **Forgetting the build plugin** → no fat JAR, app won't run via `java -jar`.
> - **Putting `main` outside the root package** — [[../04-Spring-Core/03-Component-Scanning|component scan]] won't see your code.

## Related
- [[02-Project-Structure]]
- [[03-Auto-Configuration]]
- [[04-Starters]]
- [[06-SpringApplication-Bootstrap]]
- [[../04-Spring-Core/01-IoC-DI-Concepts]]
- [[../03-Build-Tools/Maven-Basics]]
