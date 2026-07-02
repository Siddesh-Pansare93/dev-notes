# Jackson Deep Dive

> [!info] Express/TS wale dev ke liye
> Jackson basically tumhara `JSON.stringify`/`JSON.parse` hai, plus `class-transformer` plus `class-validator` jaise annotations — sab kuch ek saath mila diya gaya hai. Spring Boot HTTP request/response bodies ke liye by default Jackson hi use karta hai. Iska central object hai `ObjectMapper` — Spring khud ek auto-configured bean bana deta hai jise tum customize kar sakte ho.

## Core API

Socho Jackson ek translator hai — Java objects ko JSON mein badalta hai (serialize) aur JSON ko wapas Java objects mein (deserialize). Node.js mein tum `JSON.stringify(obj)` aur `JSON.parse(str)` likhte the — yahan `ObjectMapper` wahi kaam karta hai, bas thoda zyada powerful hai.

```java
ObjectMapper m = new ObjectMapper();

String json = m.writeValueAsString(user);
User u = m.readValue(json, User.class);
List<User> users = m.readValue(json, new TypeReference<List<User>>() {});
```

Spring mein tum khud kabhi `new ObjectMapper()` nahi likhte — Spring Boot ne pehle se ek bean bana rakha hai, bas inject karo:

```java
@Service
@RequiredArgsConstructor
public class Foo {
    private final ObjectMapper objectMapper;
}
```

> [!tip] Kyun inject karna chahiye?
> Agar tum `new ObjectMapper()` khud banaoge, toh Spring Boot ki saari global config (date format, naming strategy, modules) miss ho jayegi. Wahi mistake hai jo `axios.create()` na karke plain `fetch` use karne jaisi hai — tumhe global defaults nahi milte.

## Common annotations

Yeh annotations batate hain ki field ko JSON mein kaise represent karna hai — bilkul waise hi jaise TypeScript mein `class-transformer` ke `@Expose()`, `@Exclude()` decorators kaam karte hain.

```java
public class User {
    @JsonProperty("user_id")
    private Long id;

    @JsonIgnore
    private String passwordHash;

    @JsonInclude(JsonInclude.Include.NON_NULL)
    private String nickname;            // null hoga toh output mein hi nahi aayega

    @JsonFormat(shape = STRING, pattern = "yyyy-MM-dd")
    private LocalDate dob;

    @JsonAlias({"emailAddress", "mail"})
    private String email;               // multiple input names accept karta hai

    @JsonCreator
    public User(@JsonProperty("user_id") Long id, @JsonProperty("email") String email) {
        this.id = id;
        this.email = email;
    }
}
```

Yahan `@JsonIgnore` bahut zaruri hai — jaise Zomato ka backend kabhi bhi `passwordHash` ya internal `restaurantCommissionRate` jaisa field client ko wapas nahi bhejega, waise hi is annotation se sensitive fields JSON mein leak hone se bach jaate hain.

## Global config (Spring Boot)

Instead of har class mein annotation lagane ke, kuch settings tum ek jagah `application.yml` mein globally set kar sakte ho:

```yaml
spring:
  jackson:
    serialization:
      write-dates-as-timestamps: false   # epoch ms ki jagah ISO-8601
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

`property-naming-strategy: SNAKE_CASE` wala part especially useful hai — Java mein tum `camelCase` likhte ho (`userId`), lekin frontend ya database convention shayad `snake_case` (`user_id`) chahta ho. Yeh setting automatically convert kar deti hai, tumhe har field pe `@JsonProperty` lagane ki zarurat nahi.

## Java Time module

`jackson-datatype-jsr310` classpath pe already hota hai (Spring Boot ke saath by default aata hai), toh yeh auto-include ho jaata hai. Ismein `Instant`, `LocalDate`, `LocalDateTime`, `OffsetDateTime`, `Duration` — sab handle ho jaate hain.

```java
record Event(Instant happenedAt, Duration ttl) {}
// {"happenedAt":"2024-05-10T12:34:56Z","ttl":"PT5M"}
```

Pehle ke Jackson versions mein dates epoch milliseconds mein serialize hote the (jaise `1715343296000`), jo readable nahi hota. Isliye ISO-8601 format use karna best practice hai — jaise CRED ya PhonePe ke APIs mein transaction timestamps human-readable hote hain.

## Modules

Jackson ek "plugin architecture" follow karta hai — jaise npm packages ki tarah, tum apni zarurat ke hisaab se modules add karte ho.

| Module | Kaam |
|--------|---------|
| `jackson-datatype-jsr310` | Java 8 Time support |
| `jackson-datatype-jdk8` | `Optional`, `OptionalInt`, etc. |
| `jackson-module-parameter-names` | Parameter naam discovery (records/constructors pe `@JsonProperty` ki zarurat nahi) |
| `jackson-module-kotlin` | Kotlin data class support |
| `jackson-dataformat-xml` | XML in/out |
| `jackson-dataformat-yaml` | YAML in/out |
| `jackson-dataformat-csv` | CSV |

Module register karna:

```java
@Configuration
public class JacksonConfig {
    @Bean
    Module myModule() { return new MyCustomModule(); }
}
```

Spring Boot automatically koi bhi `Module` type ka bean dhoondh ke register kar deta hai — tumhe manually kahin add karne ki zarurat nahi.

## Custom serializer

Kabhi kabhi default serialization tumhare business logic ke hisaab se sahi nahi hoti — jaise `Money` object ko sirf `{"amount": 500}` nahi, balki `{"currency": "INR", "amount": 500}` format mein bhejna hai. Tab custom serializer likhte ho.

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

Ya phir isko ek Module mein register kar sakte ho:

```java
SimpleModule m = new SimpleModule();
m.addSerializer(Money.class, new MoneySerializer());
m.addDeserializer(Money.class, new MoneyDeserializer());
```

## Polymorphic types

Socho tumhare paas ek `Payment` interface hai jisme "CARD" payment ya "BANK" payment ho sakta hai — bilkul UPI apps ki tarah jahan payment method ke hisaab se alag-alag fields hote hain. Jackson ko batana padta hai ki JSON ke `"type"` field ke basis pe kaunsa concrete class banana hai.

```java
@JsonTypeInfo(use = Id.NAME, property = "type")
@JsonSubTypes({
    @JsonSubTypes.Type(value = CardPayment.class, name = "CARD"),
    @JsonSubTypes.Type(value = BankPayment.class, name = "BANK")
})
public sealed interface Payment permits CardPayment, BankPayment {}
```

Input: `{"type":"CARD","number":"4242..."}` → automatically `CardPayment` instance ban jaayega. Bilkul discriminated unions jaisa concept hai jo TypeScript mein `type: 'card' | 'bank'` ke saath karte the.

## Views (response shaping)

Kya hota hai? Kabhi ek hi entity ke different "views" chahiye hote hain — jaise ek admin ko `User` ka poora data dikhna chahiye (email samet), lekin normal public API pe sirf naam aur id. `@JsonView` isi ke liye hai.

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

Yeh Flipkart ke seller dashboard jaisa hai — seller ko apne product ka poora analytics dikhta hai, lekin customer-facing page pe sirf price aur rating dikhta hai. Same underlying data, different "views."

## Streaming API (large payloads)

Kyun zaruri hai? Agar tumhe ek 500 MB ka JSON file process karna hai (jaise BigBasket ka bulk product catalog), toh usse ek saath memory mein load karna crash karwa dega. Streaming API se ek-ek token parse karke process karte ho, poora JSON tree memory mein nahi rakhte.

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

Yeh Node.js ke streaming JSON parsers (jaise `JSONStream`) jaisa hi concept hai — data chunks mein aata hai, ek saath poora nahi.

## Mixins (decorating classes jo tum modify nahi kar sakte)

Kya problem solve karta hai? Kabhi ek third-party library ki class use karni padti hai jisme tum annotations directly nahi laga sakte (source code tumhare paas hai hi nahi). Mixin se tum "virtually" annotations attach kar dete ho.

```java
abstract class ThirdPartyMixin {
    @JsonIgnore abstract String getInternalId();
}

mapper.addMixIn(ThirdParty.class, ThirdPartyMixin.class);
```

## Records aur constructors

`jackson-module-parameter-names` ke saath (jo Spring Boot mein already included hai), Java records bina kisi extra annotation ke "just work" karte hain:

```java
public record User(Long id, String name) {}
// {"id":1,"name":"Rita"} se seedha deserialize ho jaata hai, koi annotation nahi chahiye
```

Yeh bilkul TypeScript ke `interface User { id: number; name: string }` jitna hi simple lagta hai — bas yahan runtime type-safety bhi milti hai.

## Common pitfalls

> [!warning] Yeh cheezein dhyan mein rakho
> - **Hibernate proxies** — JPA entities ko directly serialize karoge toh infinite recursion ya lazy loading errors aa sakte hain. Hamesha DTOs mein map karo ([[03-MapStruct]]).
> - **Circular references** — `@JsonManagedReference` / `@JsonBackReference` ya `@JsonIdentityInfo` use karo, lekin DTOs usually zyada clean solution hote hain.
> - **`fail-on-unknown-properties`** — Spring Boot mein default `false` hota hai. Tests mein isse tighten kar lena taaki typo ya extra fields turant pakde jaayein.
> - **BigDecimal precision** — money jaisi values ke liye `USE_BIG_DECIMAL_FOR_FLOATS` use karo, warna float rounding errors aa sakte hain (jaise ₹99.99 achanak ₹99.98999999 ban jaaye — payment app mein aisa hua toh customer support ka phone baj jaayega).

## Related
- [[01-Library-Cheatsheet]]
- [[03-DTOs-and-Serialization]]
- [[01-REST-Controllers]]
- [[03-MapStruct]]
