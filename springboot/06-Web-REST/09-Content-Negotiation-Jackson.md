---
tags: [web-rest, jackson, json, serialization, content-negotiation]
aliases: [Jackson, JSON, Content Negotiation]
stage: intermediate
---

# Content Negotiation & Jackson

> [!info] For the Express/TS dev
> Express + `JSON.stringify` + class-transformer is what Jackson is to Spring — except Jackson is **everywhere**: deserializing `@RequestBody`, serializing return values, working with `RestTemplate`/`WebClient`. Jackson uses reflection + annotations to decide field names, formats, and which fields to include.

## Concept / How it works

`spring-boot-starter-web` includes `jackson-databind`. The `MappingJackson2HttpMessageConverter` is auto-registered.

**Content negotiation** picks a converter based on:
1. The `Accept` header (`application/json`, `application/xml`)
2. The path/query suffix (`?format=json` if configured)
3. The `produces` attribute on `@RequestMapping`
4. The default (JSON for Spring Boot)

## Code example

### Common Jackson annotations

```java
public class UserDto {

    @JsonProperty("user_id")           // rename in JSON
    private Long id;

    @JsonProperty("email_address")
    private String email;

    @JsonIgnore                         // never serialize
    private String passwordHash;

    @JsonInclude(JsonInclude.Include.NON_NULL)  // omit if null
    private String middleName;

    @JsonFormat(shape = JsonFormat.Shape.STRING,
                pattern = "yyyy-MM-dd'T'HH:mm:ssXXX")
    private Instant createdAt;

    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private BigDecimal balance;         // serialize as "100.50" not 100.5

    @JsonAlias({ "tel", "phone_number" })  // accept any of these on input
    private String phone;

    // ignore unknown JSON fields on deserialization (default in Boot)
}

@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> { ... }
```

### Records work seamlessly

```java
public record UserDto(
        @JsonProperty("user_id") Long id,
        String email,
        @JsonFormat(pattern = "yyyy-MM-dd") LocalDate birthDate
) {}
```

### Custom serializer / deserializer

```java
public class MoneySerializer extends JsonSerializer<Money> {
    @Override
    public void serialize(Money value, JsonGenerator gen, SerializerProvider sp)
            throws IOException {
        gen.writeStartObject();
        gen.writeStringField("amount", value.amount().toPlainString());
        gen.writeStringField("currency", value.currency().getCurrencyCode());
        gen.writeEndObject();
    }
}

public class MoneyDeserializer extends JsonDeserializer<Money> {
    @Override
    public Money deserialize(JsonParser p, DeserializationContext ctxt) throws IOException {
        JsonNode node = p.getCodec().readTree(p);
        return new Money(
                new BigDecimal(node.get("amount").asText()),
                Currency.getInstance(node.get("currency").asText())
        );
    }
}

@JsonSerialize(using = MoneySerializer.class)
@JsonDeserialize(using = MoneyDeserializer.class)
public record Money(BigDecimal amount, Currency currency) {}
```

### Global ObjectMapper customization

```java
@Configuration
public class JacksonConfig {

    @Bean
    public Jackson2ObjectMapperBuilderCustomizer customizer() {
        return builder -> builder
                .serializationInclusion(JsonInclude.Include.NON_NULL)
                .featuresToDisable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
                .featuresToDisable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
                .modulesToInstall(new JavaTimeModule());
    }
}
```

`application.yml` shortcuts:

```yaml
spring:
  jackson:
    default-property-inclusion: non_null
    serialization:
      write-dates-as-timestamps: false
      indent-output: false
    deserialization:
      fail-on-unknown-properties: false
    property-naming-strategy: SNAKE_CASE   # camelCase ↔ snake_case
    time-zone: UTC
```

### Content negotiation in action

```java
@GetMapping(value = "/users/{id}",
            produces = { MediaType.APPLICATION_JSON_VALUE,
                         MediaType.APPLICATION_XML_VALUE })
public UserDto get(@PathVariable Long id) { ... }
```

With `Accept: application/xml`, Spring uses Jackson's XML module (if on the classpath).

### Polymorphic types

```java
@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "type")
@JsonSubTypes({
    @JsonSubTypes.Type(value = EmailNotification.class, name = "email"),
    @JsonSubTypes.Type(value = SmsNotification.class,   name = "sms")
})
public sealed interface Notification permits EmailNotification, SmsNotification {}
```

## Express/TS comparison

```ts
// class-transformer + class-validator
import { Expose, Exclude, Transform } from 'class-transformer';

export class UserDto {
  @Expose({ name: 'user_id' }) id!: number;
  @Exclude() passwordHash!: string;
  @Transform(({ value }) => value?.toISOString()) createdAt!: Date;
}
```

| TS / class-transformer | Jackson |
| --- | --- |
| `@Expose({ name })` | `@JsonProperty("name")` |
| `@Exclude()` | `@JsonIgnore` |
| `@Type(() => Sub)` | `@JsonDeserialize(as = Sub.class)` |
| `instanceToPlain` | `objectMapper.writeValueAsString(...)` |
| `plainToInstance` | `objectMapper.readValue(...)` |
| Discriminated union by `type` field | `@JsonTypeInfo` + `@JsonSubTypes` |

## Gotchas

> [!warning] `JavaTimeModule` is auto-registered in Boot
> If you start mixing dates/times in a non-Boot Spring app, register it manually or you'll get cryptic `InvalidDefinitionException`.

> [!warning] `@JsonIgnore` doesn't stop input
> If a field is `@JsonIgnore`, an input JSON `{ "passwordHash": "x" }` is silently dropped — but it doesn't 400. If you want to reject unknown fields, set `FAIL_ON_UNKNOWN_PROPERTIES = true` (or `@JsonIgnoreProperties(ignoreUnknown = false)` per class).

> [!warning] Records and Jackson
> Java 16+ records work with Jackson out of the box but you need `jackson-module-parameter-names` (auto-included in Boot). For older Jackson versions, you may need explicit `@JsonCreator` on the canonical constructor.

> [!warning] Cyclic references blow up
> JPA bidirectional relations (`Order ↔ Customer`) cause infinite recursion. Use `@JsonManagedReference` / `@JsonBackReference`, or just **don't serialize entities** — return DTOs ([[04-DTOs-and-Mapping]]).

> [!warning] `BigDecimal` as JSON number loses precision in JS clients
> JS uses `Number` (IEEE-754). For precise decimals, serialize as a string: `@JsonFormat(shape = STRING)`.

> [!tip] `@JsonView` for projection
> Output different field sets per endpoint without separate DTOs:
> ```java
> public class Views { public interface Public {} public interface Admin extends Public {} }
> @JsonView(Views.Public.class) String email;
> @JsonView(Views.Admin.class) String internalNote;
> ```
> Use `@JsonView(Views.Public.class)` on the controller method.

## Related

- [[03-Response-Handling]]
- [[04-DTOs-and-Mapping]]
- [[02-Entity-Basics]]
- [[06-N-Plus-One-and-Fetching]]
