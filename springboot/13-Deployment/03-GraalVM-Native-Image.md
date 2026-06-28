---
tags: [deployment, graalvm, native-image, aot, spring-native]
aliases: [GraalVM, Native Image, Spring Native, AOT]
stage: advanced
---

# GraalVM Native Image

> [!info] For the Express/TS dev
> Imagine compiling your Node app into a single static binary that boots in **40ms** with **80MB RAM**. That's GraalVM Native Image. The trade-off: build time is slow (minutes), reflection requires hints, and peak throughput can be lower than warm JVM.

## Why bother

| Metric | JVM Mode | Native Image |
|--------|----------|--------------|
| Cold start | 2-10s | 40-100ms |
| Idle memory | 200-400MB | 50-100MB |
| Peak throughput | Higher (JIT-optimized) | Lower (AOT) |
| Build time | 10-30s | 2-5 min |
| Image size | 250MB+ | 70-100MB |

Best fit:
- Serverless / FaaS (Lambda, Cloud Run)
- Short-lived CLI tools
- Heavy autoscaling (frequent cold starts)
- Memory-constrained edge

## How it works (mental model)

GraalVM's `native-image` does **AOT (ahead-of-time) compilation**:
1. Static analysis from `main()` reachable code
2. Closed-world assumption — code not reachable at build time **cannot** be loaded at runtime
3. Initializes safe classes at **build time** (baked into the binary)
4. Produces a single ELF/Mach-O binary

Implications:
- **Reflection** must be declared (Spring's AOT processor handles most)
- **Dynamic class loading** is restricted
- **Resources** must be registered to be readable
- **JNI** needs registration

## Spring Boot 3 setup

```xml
<plugins>
    <plugin>
        <groupId>org.graalvm.buildtools</groupId>
        <artifactId>native-maven-plugin</artifactId>
    </plugin>
    <plugin>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-maven-plugin</artifactId>
    </plugin>
</plugins>
```

Add the `native` profile (Spring Initializr does this for you).

Build & run:

```bash
# Requires GraalVM 21+ installed
./mvnw -Pnative native:compile
./target/orders-api
```

Or build a native container (no GraalVM needed locally — Buildpacks bring it):

```bash
./mvnw -Pnative spring-boot:build-image
```

## AOT processing

Spring 6 / Boot 3 added an AOT pipeline that:
- Pre-computes bean definitions
- Generates reflection/proxy/resource hints
- Replaces dynamic proxies with generated classes

Run AOT alone (still on JVM):

```bash
./mvnw spring-boot:process-aot
```

## Hints — when auto-detection fails

Use `RuntimeHintsRegistrar`:

```java
public class MyHints implements RuntimeHintsRegistrar {
    @Override
    public void registerHints(RuntimeHints hints, ClassLoader cl) {
        hints.reflection().registerType(MyDto.class, MemberCategory.values());
        hints.resources().registerPattern("data/*.json");
        hints.serialization().registerType(SerializableThing.class);
    }
}
```

Register via `@ImportRuntimeHints(MyHints.class)`.

## What breaks?

> [!warning] Known limitations
> - Libraries using runtime bytecode generation (CGLIB, certain mocking libs)
> - Runtime classpath scanning (rare in well-written code)
> - Some serialization frameworks without hints
> - JDK Flight Recorder is limited
> - Spring Cloud Function works; some Spring Cloud components require hints

## Testing native

```bash
./mvnw -PnativeTest test     # runs tests as native image
```

## When NOT to use native

- Long-running, throughput-heavy services where JIT pays off
- Apps with heavy reflection / dynamic proxies you can't fully hint
- Teams that can't absorb 5-min build times in CI

## Tracing agent (advanced)

If a third-party lib needs hints, run with the **agent** to generate them:

```bash
java -agentlib:native-image-agent=config-output-dir=src/main/resources/META-INF/native-image \
     -jar target/app.jar
```

Exercise the app, then commit the generated config.

## Related
- [[02-Docker-for-Spring-Boot]]
- [[01-Packaging-Fat-JAR]]
- [[01-JVM-Memory-and-GC]]
- [[02-Spring-Boot-Auto-Configuration]]
