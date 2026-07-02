# Content Negotiation & Jackson

Socho ek second ke liye — tumhara Zomato order app hai. Customer ka mobile app JSON expect karta hai, ek legacy partner system XML expect karta hai, aur ek internal dashboard YAML. Ek hi API endpoint pe teen alag formats? Yahi hai **Content Negotiation** — client kehta hai "mujhe is format mein data chahiye" aur Spring smartly woh format return karta hai.

Aur JSON ko read/write karna? Woh kaam karta hai **Jackson** — Spring Boot ka default JSON engine. Node.js mein tum `JSON.stringify()` + `class-transformer` use karte the, yahan Jackson woh sab automatically handle karta hai — aur kaafi zyada powerful hai.

> [!info] Node.js/TS Developer ke liye quick context
> Express mein tum manually `res.json(obj)` karte the, aur `class-transformer` se field rename/exclude karte the. Spring mein Jackson **everywhere** hai — `@RequestBody` deserialize karna, return value serialize karna, `RestTemplate`/`WebClient` se HTTP calls karna. Ek baar configure karo, poore project mein kaam karta hai. Reflection + annotations use karta hai decide karne ke liye ki kaunse fields include karne hain, kya naam dena hai, kaunsa format use karna hai.

---

## Content Negotiation — Kya Hota Hai Exactly?

Jab client tera API call karta hai, woh `Accept` header mein bata sakta hai — "bhai, mujhe JSON chahiye" ya "mujhe XML chahiye". Spring Boot is header ko read karke automatically decide karta hai ki response kaunse format mein bhejni hai.

**Priority order mein Spring yeh check karta hai:**

1. `Accept` header — `application/json`, `application/xml`, etc.
2. URL suffix ya query param — `?format=json` (agar configured ho)
3. Controller ka `produces` attribute — `@GetMapping(produces = "application/json")`
4. Default — Spring Boot ka default JSON hai (Jackson via `MappingJackson2HttpMessageConverter`)

`spring-boot-starter-web` include karo, `jackson-databind` automatically aa jaata hai. Kuch alag install nahi karna — yeh Spring Boot ka magic hai.

---

## Jackson Annotations — Tera Toolkit

Jackson ke saath kaam karna annotations ke through hota hai. Yeh annotations decide karte hain ki JSON kaisa dikhega — field ka naam kya hoga, kaunse fields skip karne hain, date format kya hoga, etc.

### Sabse Common Annotations

```java
public class UserDto {

    // JSON mein "id" ki jagah "user_id" aayega
    // Node.js mein: @Expose({ name: 'user_id' }) ya transform manually
    @JsonProperty("user_id")
    private Long id;

    @JsonProperty("email_address")
    private String email;

    // Yeh field JSON mein kabhi nahi aayega — password hash expose mat karo!
    // Node.js mein: @Exclude()
    @JsonIgnore
    private String passwordHash;

    // Agar middleName null hai, toh JSON mein field aayegi hi nahi
    // Swiggy ke response dekhte ho? Null fields nahi hote — clean output
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private String middleName;

    // Date format specify karo — ISO 8601 standard format
    // Warna Jackson timestamp (milliseconds) bhejta hai — frontend confused ho jaata hai
    @JsonFormat(shape = JsonFormat.Shape.STRING,
                pattern = "yyyy-MM-dd'T'HH:mm:ssXXX")
    private Instant createdAt;

    // BigDecimal ko number nahi, string ke roop mein bhejo
    // JavaScript ka Number (IEEE-754) precise decimals handle nahi kar sakta
    // UPI transactions mein precision critical hai — "100.50" string safe hai
    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private BigDecimal balance;

    // Input JSON mein "tel" ya "phone_number" dono accept karega
    // Useful jab multiple clients alag field names use karte hain
    @JsonAlias({ "tel", "phone_number" })
    private String phone;
}

// Class level pe — agar JSON mein extra/unknown fields hain, silently ignore karo
// Default Spring Boot behavior yahi hai
@JsonIgnoreProperties(ignoreUnknown = true)
// Poori class ke liye — null fields include mat karo JSON mein
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {
    private T data;
    private String message;
    private String errorCode; // null hua toh JSON mein nahi aayega
}
```

### Java Records ke Saath Jackson — Clean aur Simple

Java 16+ mein Records aayi hain aur Jackson inke saath seamlessly kaam karta hai. Node.js mein `interface` + `class` alag hota tha — yahan record ek clean alternative hai:

```java
// Record — immutable, concise, Jackson-friendly
public record UserDto(
        @JsonProperty("user_id") Long id,       // JSON: "user_id"
        String email,                            // JSON: "email" (same name)
        @JsonFormat(pattern = "yyyy-MM-dd") LocalDate birthDate  // formatted date
) {}
```

> [!tip] Records prefer karo DTOs ke liye
> Records immutable hote hain aur boilerplate zero hota hai — no getters, no setters, no constructors likhne pade. Jackson Boot mein automatically inhe handle karta hai `jackson-module-parameter-names` ki wajah se (already included in starter).

---

## Custom Serializer / Deserializer — Jab Annotations Kaafi Nahi

Kabhi kabhi tumhara domain object kaafi complex hota hai — jaise `Money` class jo amount aur currency dono hold karta hai. Uske liye Jackson ke standard annotations kaafi nahi — custom serializer/deserializer likhna padega.

Socho — Paytm ya PhonePe internally Money ek special object ke roop mein represent karte hain. JSON mein aate waqt: `{ "amount": "99.99", "currency": "INR" }` — yeh mapping automatic nahi hogi.

```java
// Custom Serializer — Java object → JSON
public class MoneySerializer extends JsonSerializer<Money> {
    @Override
    public void serialize(Money value, JsonGenerator gen, SerializerProvider sp)
            throws IOException {
        gen.writeStartObject();
        // BigDecimal ko plain string mein convert karo — precision preserve karo
        gen.writeStringField("amount", value.amount().toPlainString());
        gen.writeStringField("currency", value.currency().getCurrencyCode()); // "INR", "USD"
        gen.writeEndObject();
    }
}

// Custom Deserializer — JSON → Java object
public class MoneyDeserializer extends JsonDeserializer<Money> {
    @Override
    public Money deserialize(JsonParser p, DeserializationContext ctxt) throws IOException {
        JsonNode node = p.getCodec().readTree(p);
        return new Money(
                new BigDecimal(node.get("amount").asText()),   // "99.99" → BigDecimal
                Currency.getInstance(node.get("currency").asText())  // "INR" → Currency object
        );
    }
}

// Record pe annotations laga do — ab automatically use hoga
@JsonSerialize(using = MoneySerializer.class)
@JsonDeserialize(using = MoneyDeserializer.class)
public record Money(BigDecimal amount, Currency currency) {}
```

Ab jab bhi koi `Money` field tera DTO mein hoga, Jackson automatically yeh custom logic use karega. Koi alag code nahi likhna.

---

## Global ObjectMapper Configuration — Poore App Ke Liye Ek Setting

Project mein har DTO pe same annotations repeat karna tedious hai. `@JsonInclude(NON_NULL)` har class pe likhoge? Nahi — global config banao ek baar, sab jagah apply hoga.

### Java Config (More Flexible)

```java
@Configuration
public class JacksonConfig {

    @Bean
    public Jackson2ObjectMapperBuilderCustomizer customizer() {
        return builder -> builder
                // Poore app mein null fields JSON mein nahi aayenge
                .serializationInclusion(JsonInclude.Include.NON_NULL)

                // Dates as timestamps nahi — "2024-01-15T10:30:00Z" format mein
                // Frontend developers yahi expect karte hain
                .featuresToDisable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)

                // Unknown JSON fields pe exception mat throw karo — silently ignore karo
                // Useful jab client nayi fields bheje jo backend abhi nahi jaanta
                .featuresToDisable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)

                // Java 8+ date/time (LocalDate, LocalDateTime, Instant) support ke liye
                .modulesToInstall(new JavaTimeModule());
    }
}
```

### `application.yml` Shortcut (Simple Cases Ke Liye)

Agar fancy customization nahi chahiye, YAML mein directly configure kar sakte ho:

```yaml
spring:
  jackson:
    # Null fields JSON mein include mat karo
    default-property-inclusion: non_null

    serialization:
      # Dates readable format mein — "2024-01-15T10:30:00Z" nahi ki 1705312200000
      write-dates-as-timestamps: false
      # Dev mein pretty print helpful hota hai, prod mein false rakho (bandwidth)
      indent-output: false

    deserialization:
      # Extra JSON fields pe 400 mat throw karo — silently ignore karo
      fail-on-unknown-properties: false

    # camelCase Java fields ↔ snake_case JSON — API convention ke liye
    # "userId" → "user_id", "createdAt" → "created_at"
    property-naming-strategy: SNAKE_CASE

    time-zone: UTC
```

> [!tip] Java Config vs YAML — Kab Kya Use Karein?
> YAML convenient hai simple settings ke liye — koi extra class nahi likhni. Java Config use karo jab custom modules register karne hoon ya conditional logic chahiye ho. Dono ek saath use ho sakte hain — Java Config zyada specific hota hai isliye YAML settings override kar sakta hai.

---

## Content Negotiation In Action — Ek Endpoint, Multiple Formats

Ab dekho kaise ek controller method JSON aur XML dono support kar sakti hai:

```java
@RestController
@RequestMapping("/api/users")
public class UserController {

    // Yeh endpoint JSON aur XML dono return kar sakta hai
    // Client ke Accept header pe depend karta hai
    @GetMapping(
        value = "/{id}",
        produces = {
            MediaType.APPLICATION_JSON_VALUE,   // "application/json"
            MediaType.APPLICATION_XML_VALUE     // "application/xml"
        }
    )
    public UserDto getUser(@PathVariable Long id) {
        return userService.findById(id);
    }
}
```

**Request with `Accept: application/json`** → Jackson JSON response dega
**Request with `Accept: application/xml`** → Jackson XML module (agar classpath mein hai) XML dega

XML support ke liye `jackson-dataformat-xml` dependency add karni padegi:

```xml
<dependency>
    <groupId>com.fasterxml.jackson.dataformat</groupId>
    <artifactId>jackson-dataformat-xml</artifactId>
</dependency>
```

> [!info] Real World Mein XML Kaun Use Karta Hai?
> Banking systems, government APIs (GST, IRCTC), aur legacy enterprise systems XML use karte hain. Modern mobile apps JSON prefer karti hain. Agar tumhara app dono se baat karta hai — content negotiation lifesaver hai.

---

## Polymorphic Types — Ek Field, Multiple Subtypes

Socho Swiggy ka notification system — order ka notification, delivery update, promotional offer — sab alag types hain but ek hi field `notifications[]` array mein aate hain. Jackson ko bataana padega ki kaunsa JSON object kaunsi class ka instance hai.

```java
// Base interface — sealed hai Java 17+ mein
// @JsonTypeInfo bataata hai ki "type" field dekhke decide karo kaunsi class banana hai
@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "type")
@JsonSubTypes({
    @JsonSubTypes.Type(value = EmailNotification.class, name = "email"),
    @JsonSubTypes.Type(value = SmsNotification.class,   name = "sms"),
    @JsonSubTypes.Type(value = PushNotification.class,  name = "push")
})
public sealed interface Notification permits EmailNotification, SmsNotification, PushNotification {}

// Concrete implementations
public record EmailNotification(
    String type,        // "email"
    String recipient,
    String subject,
    String body
) implements Notification {}

public record SmsNotification(
    String type,        // "sms"
    String phoneNumber,
    String message
) implements Notification {}
```

Ab agar JSON aata hai:
```json
{ "type": "email", "recipient": "user@example.com", "subject": "Order Confirmed!" }
```

Jackson automatically `EmailNotification` instance create karega. Node.js mein yeh manually discriminated union type check karna padta tha — yahan annotation se ho jaata hai.

---

## `@JsonView` — Different Endpoints, Different Fields (Bina Alag DTO Ke)

Kabhi kabhi same data ko different endpoints pe differently expose karna hota hai. Zomato socho — public menu API mein price aur name dikhao, admin API mein cost price aur vendor details bhi. Do alag DTOs banana wasteful lagta hai.

`@JsonView` se ek hi class mein multiple "views" define kar sakte ho:

```java
// Views define karo — hierarchy mein
public class Views {
    public interface Public {}                  // Basic info sabke liye
    public interface Admin extends Public {}    // Public + extra admin fields
}

public class MenuItemDto {
    @JsonView(Views.Public.class)
    private String name;           // "Butter Chicken" — public

    @JsonView(Views.Public.class)
    private BigDecimal price;      // 350.00 — public

    @JsonView(Views.Admin.class)
    private BigDecimal costPrice;  // 120.00 — sirf admin ko dikhao

    @JsonView(Views.Admin.class)
    private String vendorId;       // Internal vendor ID — admin only
}

@RestController
public class MenuController {

    // Public endpoint — sirf Public fields
    @JsonView(Views.Public.class)
    @GetMapping("/menu/{id}")
    public MenuItemDto getPublicItem(@PathVariable Long id) {
        return menuService.findById(id);
    }

    // Admin endpoint — Public + Admin fields dono
    @JsonView(Views.Admin.class)
    @GetMapping("/admin/menu/{id}")
    public MenuItemDto getAdminItem(@PathVariable Long id) {
        return menuService.findById(id);
    }
}
```

---

## Node.js / TypeScript Comparison — Side by Side

Tum Express + class-transformer use karte the — yeh dekho kaisa match hota hai:

```typescript
// class-transformer (Node.js/TS way)
import { Expose, Exclude, Transform } from 'class-transformer';

export class UserDto {
  @Expose({ name: 'user_id' }) id!: number;     // rename field
  @Exclude() passwordHash!: string;              // hide field
  @Transform(({ value }) => value?.toISOString()) createdAt!: Date; // format
}

// Manually convert:
// instanceToPlain(userDto)  → JS object (for response)
// plainToInstance(UserDto, json) → class instance (from request)
```

| TypeScript / class-transformer | Jackson (Java/Spring) |
|---|---|
| `@Expose({ name: 'user_id' })` | `@JsonProperty("user_id")` |
| `@Exclude()` | `@JsonIgnore` |
| `@Type(() => SubClass)` | `@JsonDeserialize(as = SubClass.class)` |
| `instanceToPlain(obj)` | `objectMapper.writeValueAsString(obj)` |
| `plainToInstance(Cls, json)` | `objectMapper.readValue(json, Cls.class)` |
| Discriminated union via `type` field | `@JsonTypeInfo` + `@JsonSubTypes` |
| `@Transform(fn)` | Custom `JsonSerializer` / `JsonDeserializer` |
| Global config in `plainToClass` options | `Jackson2ObjectMapperBuilderCustomizer` |

**Key difference**: Node.js mein explicitly `instanceToPlain()` call karna padta tha. Spring mein yeh automatic hai — controller ka return value automatically serialize hota hai. "It just works."

---

## Gotchas — Yeh Mistakes Mat Karo

> [!warning] `JavaTimeModule` — Non-Boot Apps Mein Manually Register Karo
> Spring Boot mein `JavaTimeModule` auto-registered hai. Agar tum plain Spring (non-Boot) use kar rahe ho aur `LocalDate`, `LocalDateTime`, `Instant` use karte ho, toh manually register karo:
> ```java
> objectMapper.registerModule(new JavaTimeModule());
> ```
> Warna `InvalidDefinitionException` milegi — debugging mein time waste hoga.

> [!warning] `@JsonIgnore` Input Reject Nahi Karta
> Yeh common misconception hai. Agar `passwordHash` pe `@JsonIgnore` laga hai aur client JSON mein `{ "passwordHash": "abc123" }` bhejta hai — Spring 400 error nahi dega. Woh field silently drop ho jaayegi. Agar tum strictly reject karna chahte ho unknown/ignored fields, toh:
> ```java
> @JsonIgnoreProperties(ignoreUnknown = false) // or
> DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES = true
> ```

> [!warning] Records aur Jackson — Version Compatibility
> Java 16+ records Jackson 2.12+ ke saath out of the box kaam karte hain (Boot already include karta hai). Agar purana Jackson hai, explicit `@JsonCreator` constructor pe laganaa pad sakta hai:
> ```java
> public record UserDto(
>     @JsonCreator
>     @JsonProperty("user_id") Long id,
>     String email
> ) {}
> ```

> [!warning] JPA Entities + Jackson = Infinite Recursion Ka Danger
> Yeh ek real trap hai. Bidirectional JPA relations mein `Order` entity ke andar `Customer` hai, `Customer` ke andar `List<Order>` hai — serialize karo toh infinite loop. Stack overflow. Solutions:
> 1. **Best approach**: Entities kabhi directly serialize mat karo — DTOs return karo (refer: `04-DTOs-and-Mapping`)
> 2. Agar entities serialize karne hi ho: `@JsonManagedReference` (parent side) + `@JsonBackReference` (child side)
> ```java
> // Order entity
> @JsonManagedReference
> @ManyToOne
> private Customer customer;
>
> // Customer entity
> @JsonBackReference
> @OneToMany(mappedBy = "customer")
> private List<Order> orders;
> ```

> [!warning] `BigDecimal` aur JavaScript Precision Problem
> JavaScript ka `Number` type IEEE-754 double precision hai. Matlab `100.50` accurately store ho sakta hai, but larger decimals ya specific fractions mein precision loss hoti hai. Financial calculations mein (UPI transactions, banking) yeh dangerous hai.
>
> **Solution**: Always string ke roop mein serialize karo:
> ```java
> @JsonFormat(shape = JsonFormat.Shape.STRING)
> private BigDecimal amount;  // JSON mein: "100.50" (string, not number)
> ```
> Frontend pe `parseFloat("100.50")` ya `Decimal.js` library use karo.

> [!warning] `SNAKE_CASE` Property Strategy — All Or Nothing
> Agar `property-naming-strategy: SNAKE_CASE` set kiya hai, toh **poori app** mein snake_case apply hogi — custom `@JsonProperty` names ko bhi override kar sakti hai sometimes. Mixed strategy tricky hoti hai. Consistent raho — ya sab camelCase ya sab snake_case.

---

## Key Takeaways

- **Jackson Spring Boot mein auto-configured hai** — `spring-boot-starter-web` include karo, bas. Kuch alag karne ki zarurat nahi.

- **Content Negotiation** client ko power deta hai format choose karne ki — `Accept: application/json` ya `Accept: application/xml`. Spring automatically sahi converter use karta hai.

- **`@JsonProperty`** field rename karta hai JSON mein, **`@JsonIgnore`** field hide karta hai, **`@JsonInclude(NON_NULL)`** null fields skip karta hai — teen most-used annotations.

- **`@JsonFormat`** dates aur BigDecimal ke liye critical hai — warna timestamps milenge aur JS clients precision khoyenge. Financial apps mein BigDecimal always `STRING` shape mein serialize karo.

- **Custom Serializer/Deserializer** use karo complex domain objects ke liye jahan standard annotations kaafi nahi hote.

- **Global config** `application.yml` mein ya `Jackson2ObjectMapperBuilderCustomizer` bean se karo — har class pe repeat mat karo same annotations.

- **Entities directly serialize mat karo** — DTOs use karo. Warna JPA bidirectional relations mein infinite recursion ki guarantee hai.

- **`@JsonView`** se multiple "projections" ek hi DTO se nikalo — public API aur admin API ke alag fields bina alag classes ke.

- **`@JsonTypeInfo` + `@JsonSubTypes`** polymorphic JSON handle karta hai — jaise discriminated unions TypeScript mein hote hain.

- Node.js mein jo kaam class-transformer + manual `instanceToPlain()` karta tha, woh Spring mein Jackson automatically karta hai — zero boilerplate.
