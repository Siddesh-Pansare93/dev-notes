---
tags: [ecosystem, jackson, json, serialization]
aliases: [Jackson, ObjectMapper, JSON]
stage: intermediate
---

# Jackson Deep Dive

> [!info] For the Express/TS dev
> Jackson is your `JSON.stringify`/`JSON.parse` plus `class-transformer` plus `class-validator`-style annotations rolled into one. Spring Boot uses it by default for HTTP request/response bodies. The central object is `ObjectMapper` — Spring auto-configures one and lets you customize it.

## The core API

```java
ObjectMapper m = new ObjectMapper();

String json = m.writeValueAsString(user);
User u = m.readValue(json, User.class);
List<User> users = m.readValue(json, new TypeReference<List<User>>() {});
```

In Spring you almost never construct one — inject the auto-configured bean:

```java
@Service
@RequiredArgsConstructor
public class Foo {
    private final ObjectMapper objectMapper;
}
```

## Common annotations

```java
public class User {
    @JsonProperty("user_id")
    private Long id;

    @JsonIgnore
    private String passwordHash;

    @JsonInclude(JsonInclude.Include.NON_NULL)
    private String nickname;            // omitted from output if null

    @JsonFormat(shape = STRING, pattern = "yyyy-MM-dd")
    private LocalDate dob;

    @JsonAlias({"emailAddress", "mail"})
    private String email;               // accepts multiple input names

    @JsonCreator
    public User(@JsonProperty("user_id") Long id, @JsonProperty("email") String email) {
        this.id = id;
        this.email = email;
    }
}
```

## Global config (Spring Boot)

```yaml
spring:
  jackson:
    serialization:
      write-dates-as-timestamps: false   # ISO-8601 instead of epoch ms
      indent-output: false
    deserialization:
      fail-on-unknown-properties: false
    default-property-inclusion: non_null
    date-format: yyyy-MM-dd'T'HH:mm:ss.SSSXXX
    time-zone: UTC
    property-naming-strategy: SNAKE_CASE
    mapper:
      accept-case-insensitive-enums: true
```

## Java Time module

Auto-included when `jackson-datatype-jsr310` is on the classpath (it is, with Spring Boot). Handles `Instant`, `LocalDate`, `LocalDateTime`, `OffsetDateTime`, `Duration`.

```java
record Event(Instant happenedAt, Duration ttl) {}
// {"happenedAt":"2024-05-10T12:34:56Z","ttl":"PT5M"}
```

## Modules

Jackson is modular. Common add-ons:

| Module | Purpose |
|--------|---------|
| `jackson-datatype-jsr310` | Java 8 Time |
| `jackson-datatype-jdk8` | `Optional`, `OptionalInt`, etc. |
| `jackson-module-parameter-names` | Parameter name discovery (no need for `@JsonProperty` on records/ctors) |
| `jackson-module-kotlin` | Kotlin data class support |
| `jackson-dataformat-xml` | XML in/out |
| `jackson-dataformat-yaml` | YAML in/out |
| `jackson-dataformat-csv` | CSV |

Register a module:

```java
@Configuration
public class JacksonConfig {
    @Bean
    Module myModule() { return new MyCustomModule(); }
}
```

Spring Boot auto-registers any `Module` bean.

## Custom serializer

```java
public class MoneySerializer extends JsonSerializer<Money> {
    @Override
    public void serialize(Money value, JsonGenerator gen, SerializerProvider sp) throws IOException {
        gen.writeStartObject();
        gen.writeStringField("currency", value.currency());
        gen.writeNumberField("amount", value.amount());
        gen.writeEndObject();
    }
}

@JsonSerialize(using = MoneySerializer.class)
public record Money(String currency, BigDecimal amount) {}
```

Or register in a Module:

```java
SimpleModule m = new SimpleModule();
m.addSerializer(Money.class, new MoneySerializer());
m.addDeserializer(Money.class, new MoneyDeserializer());
```

## Polymorphic types

```java
@JsonTypeInfo(use = Id.NAME, property = "type")
@JsonSubTypes({
    @JsonSubTypes.Type(value = CardPayment.class, name = "CARD"),
    @JsonSubTypes.Type(value = BankPayment.class, name = "BANK")
})
public sealed interface Payment permits CardPayment, BankPayment {}
```

Input: `{"type":"CARD","number":"4242..."}` → `CardPayment` instance.

## Views (response shaping)

```java
public class Views {
    public static class Public {}
    public static class Internal extends Public {}
}

public class User {
    @JsonView(Views.Public.class)   public Long id;
    @JsonView(Views.Public.class)   public String name;
    @JsonView(Views.Internal.class) public String email;
}

@GetMapping("/users/{id}")
@JsonView(Views.Public.class)
public User get(@PathVariable Long id) { ... }
```

## Streaming API (large payloads)

For huge JSON, don't load it all into memory:

```java
try (JsonParser p = mapper.getFactory().createParser(in)) {
    while (p.nextToken() != null) {
        if (p.currentToken() == JsonToken.FIELD_NAME && "items".equals(p.currentName())) {
            p.nextToken(); // START_ARRAY
            while (p.nextToken() != JsonToken.END_ARRAY) {
                Item item = mapper.readValue(p, Item.class);
                process(item);
            }
        }
    }
}
```

## Mixins (decorating classes you can't modify)

```java
abstract class ThirdPartyMixin {
    @JsonIgnore abstract String getInternalId();
}

mapper.addMixIn(ThirdParty.class, ThirdPartyMixin.class);
```

## Records and constructors

With `jackson-module-parameter-names` (auto-included in Spring Boot), records "just work":

```java
public record User(Long id, String name) {}
// Deserializes from {"id":1,"name":"Rita"} without any annotations
```

## Common pitfalls

> [!warning] Watch out for
> - **Hibernate proxies** — serializing JPA entities directly causes infinite recursion / lazy loading. Always map to DTOs ([[03-MapStruct]]).
> - **Circular references** — use `@JsonManagedReference` / `@JsonBackReference` or `@JsonIdentityInfo`, but DTOs are usually cleaner.
> - **`fail-on-unknown-properties`** — defaults to `false` in Spring Boot. Tighten in tests.
> - **BigDecimal precision** — `USE_BIG_DECIMAL_FOR_FLOATS` to avoid float rounding.

## Related
- [[01-Library-Cheatsheet]]
- [[03-DTOs-and-Serialization]]
- [[01-REST-Controllers]]
- [[03-MapStruct]]
