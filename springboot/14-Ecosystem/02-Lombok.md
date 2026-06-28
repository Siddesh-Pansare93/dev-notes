---
tags: [ecosystem, lombok, boilerplate]
aliases: [Lombok, @Data, @Builder]
stage: foundation
---

# Lombok

> [!info] For the Express/TS dev
> Java classes are verbose — getters, setters, equals, hashCode, constructors are 80% of POJO LOC. Lombok is an **annotation processor** that generates this boilerplate at compile time. The source file stays clean; the `.class` file gets the generated methods.

## Install

```xml
<dependency>
    <groupId>org.projectlombok</groupId>
    <artifactId>lombok</artifactId>
    <scope>provided</scope>
</dependency>
```

Configure annotation processing in Maven:

```xml
<plugin>
    <artifactId>maven-compiler-plugin</artifactId>
    <configuration>
        <annotationProcessorPaths>
            <path>
                <groupId>org.projectlombok</groupId>
                <artifactId>lombok</artifactId>
                <version>${lombok.version}</version>
            </path>
        </annotationProcessorPaths>
    </configuration>
</plugin>
```

## IDE setup

> [!warning] You MUST install the IDE plugin
> Without it, your IDE shows red errors on `entity.getName()` even though it compiles fine.
>
> - **IntelliJ IDEA**: Settings → Plugins → search "Lombok" → install. Also enable "Annotation Processing": Build → Compiler → Annotation Processors.
> - **VS Code**: Install "Lombok Annotations Support for VS Code" (or the bundled Java extension pack handles it).
> - **Eclipse**: Run `java -jar lombok.jar` to install into Eclipse.

## The big four

### `@Getter` / `@Setter`

```java
@Getter @Setter
public class User {
    private Long id;
    private String name;
}
// Generates getId(), setId(Long), getName(), setName(String)
```

Field-level too: `@Getter private final String email;` (no setter for `final`).

### `@ToString`

```java
@ToString(exclude = "password")
public class User { ... }
// User(id=1, name=Rita)
```

### `@EqualsAndHashCode`

```java
@EqualsAndHashCode(of = "id")
public class User { ... }
```

### `@NoArgsConstructor` / `@AllArgsConstructor` / `@RequiredArgsConstructor`

```java
@NoArgsConstructor              // public User()
@AllArgsConstructor             // public User(Long, String, String)
@RequiredArgsConstructor        // generates ctor for `final` fields only
public class User {
    private final Long id;
    private String name;
}
```

`@RequiredArgsConstructor` is the constructor injection pattern in Spring:

```java
@Service
@RequiredArgsConstructor
public class OrderService {
    private final OrderRepository orders;       // injected via generated ctor
    private final PaymentClient payments;
    // no need to write the constructor!
}
```

## `@Data` — the kitchen sink

```java
@Data
public class User {
    private Long id;
    private String name;
}
```

Equivalent to: `@Getter @Setter @ToString @EqualsAndHashCode @RequiredArgsConstructor`.

> [!warning] @Data on JPA entities is risky
> Generated `equals/hashCode` over all fields includes lazy-loaded associations → can trigger LazyInitializationException or infinite recursion. Use `@EqualsAndHashCode(of = "id")` and `@ToString(exclude = {"orders"})` explicitly.

## `@Builder`

```java
@Builder
public class User {
    private Long id;
    private String name;
    private String email;
}

User u = User.builder()
    .id(1L)
    .name("Rita")
    .email("rita@example.com")
    .build();
```

Common variants:
- `@Builder.Default` — provide a default value for a field
- `@Builder(toBuilder = true)` — generates `toBuilder()` for copy-with-modify
- `@SuperBuilder` — for inheritance

## `@Slf4j` — logger field

```java
@Slf4j
public class OrderService {
    public void place() {
        log.info("placing order");   // log field generated as: private static final Logger log = ...
    }
}
```

Variants: `@Log4j2`, `@CommonsLog`, `@JBossLog`.

## `@Value` — immutable POJO

```java
@Value
public class Money {
    String currency;
    BigDecimal amount;
}
```

Equivalent to `@Data` but: all fields `final`, class `final`, no setters. Pre-`record` immutability.

> [!tip] Records vs @Value
> JDK 16+ has `record`s — built-in language feature, no Lombok needed:
> ```java
> public record Money(String currency, BigDecimal amount) {}
> ```
> Prefer `record` for value types. Use Lombok `@Value` only if you can't be on JDK 16+.

## `@SneakyThrows`

Bypasses the checked-exception requirement:

```java
@SneakyThrows
public byte[] read() {
    return Files.readAllBytes(Paths.get("file.txt"));   // IOException not declared
}
```

> [!warning] Use sparingly
> Hides errors; use only for genuinely unrecoverable cases (lambdas in stream pipelines).

## `@Cleanup`

```java
public void copy() throws IOException {
    @Cleanup InputStream in = new FileInputStream("a");
    @Cleanup OutputStream out = new FileOutputStream("b");
    // close() called automatically at end of scope
}
```

Try-with-resources is usually clearer.

## `lombok.config`

Project root config file:

```
config.stopBubbling = true
lombok.addLombokGeneratedAnnotation = true
lombok.anyConstructor.addConstructorProperties = true
lombok.equalsAndHashCode.callSuper = call
```

## Should you use Lombok?

Pros:
- Massive reduction in boilerplate
- Used in most Spring Boot projects in the wild

Cons:
- Build/IDE tooling dependency
- Records make `@Value` largely obsolete
- Some teams prefer explicit code

**Pragmatic rule**: use `@Slf4j`, `@RequiredArgsConstructor`, `@Getter`/`@Setter`, `@Builder`. Skip `@Data` on entities. Prefer `record` over `@Value` on JDK 16+.

## Related
- [[01-Library-Cheatsheet]]
- [[01-Records-and-Pattern-Matching]]
- [[01-IoC-DI-Concepts]]
- [[03-Logging-Best-Practices]]
