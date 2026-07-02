# MapStruct

> [!info] Express/TS wale dev ke liye
> Java codebases mein DTO ↔ Entity ka boundary bahut sacred hota hai — kabhi bhi apna Entity (jo DB table represent karta hai) directly API response mein nahi bhejte. Isliye har jagah `entityToDto(...)` jaisi mapping functions likhni padti hain. Ab socho, agar tumhare paas 30 fields wala `Order` object hai aur tumhe use `OrderDto` mein convert karna hai — hath se likhna bore karne wala kaam hai, aur ek field miss ho gaya to bug production mein jayega. MapStruct ye kaam **compile time** pe generate kar deta hai ek interface se — na koi reflection, na runtime overhead. Aur best part: jo code generate hota hai wo plain, readable Java hai, jaise tumne khud likha ho.

Node.js mein tum shayad `class-transformer` (NestJS mein `plainToInstance`) use karte ho, jo runtime pe reflection/decorators ke through mapping karta hai. MapStruct ka approach bilkul opposite hai — sab kuch **build time** pe hi decide ho jata hai.

## Kyun zaruri hai?

Socho tumhare paas ek `Order` entity hai aur usse `OrderDto` mein convert karna hai. Manual tarika kuch aisa dikhega:

```java
// Without MapStruct — manual mapping
public OrderDto toDto(Order o) {
    OrderDto d = new OrderDto();
    d.setId(o.getId());
    d.setStatus(o.getStatus().name());
    d.setTotal(o.getTotal());
    d.setUserName(o.getUser().getName());
    // ... 30 fields, easy to forget one
    return d;
}
```

Ye dekho kitna repetitive hai — har naya field add hote hi ye method bhi update karna padega, aur agar bhool gaye to koi error bhi nahi milega, bas field silently `null` reh jayega.

Ab yehi kaam MapStruct ke saath:

```java
@Mapper(componentModel = "spring")
public interface OrderMapper {
    @Mapping(source = "user.name", target = "userName")
    OrderDto toDto(Order order);

    Order toEntity(OrderCreateDto dto);

    List<OrderDto> toDtoList(List<Order> orders);
}
```

Bas itna hi! Tumne sirf ek **interface** likha — method body kahin nahi hai. Compile karne pe annotation processor iska pura implementation generate kar dega. Zomato ke order flow jaisa socho — tumhe bas ye batana hai "Order se OrderDto banana hai, aur `user.name` ko `userName` mein daal dena" — baaki ka wiring MapStruct khud kar leta hai.

## Install kaise karein

Maven mein ye setup karna hota hai — do dependencies chahiye: khud `mapstruct` library, aur ek annotation processor jo build ke time chalta hai.

```xml
<properties>
    <mapstruct.version>1.6.3</mapstruct.version>
    <lombok.version>1.18.34</lombok.version>
</properties>

<dependencies>
    <dependency>
        <groupId>org.mapstruct</groupId>
        <artifactId>mapstruct</artifactId>
        <version>${mapstruct.version}</version>
    </dependency>
</dependencies>

<build>
    <plugins>
        <plugin>
            <artifactId>maven-compiler-plugin</artifactId>
            <configuration>
                <annotationProcessorPaths>
                    <path>
                        <groupId>org.mapstruct</groupId>
                        <artifactId>mapstruct-processor</artifactId>
                        <version>${mapstruct.version}</version>
                    </path>
                    <!-- Lombok must come BEFORE MapStruct if used together -->
                    <path>
                        <groupId>org.projectlombok</groupId>
                        <artifactId>lombok</artifactId>
                        <version>${lombok.version}</version>
                    </path>
                    <path>
                        <groupId>org.projectlombok</groupId>
                        <artifactId>lombok-mapstruct-binding</artifactId>
                        <version>0.2.0</version>
                    </path>
                </annotationProcessorPaths>
            </configuration>
        </plugin>
    </plugins>
</build>
```

> [!warning] Order matters
> Agar Lombok bhi use kar rahe ho, to `annotationProcessorPaths` mein Lombok ka path MapStruct se **pehle** aana chahiye. Kyun? Kyunki Lombok pehle getters/setters generate karta hai, tabhi jaake MapStruct un methods ko "dekh" pata hai. Order galat hua to MapStruct ko empty class dikhegi aur compile error aayega.

## Spring bean ki tarah use karna

`componentModel = "spring"` likhne se generated class automatically `@Component` ban jaati hai — matlab tum use kisi bhi jagah `@Autowired` ya constructor injection se le sakte ho, bilkul apne normal services ki tarah.

```java
@Service
@RequiredArgsConstructor
public class OrderService {
    private final OrderMapper mapper;     // injected
    private final OrderRepository repo;

    public OrderDto getById(Long id) {
        return mapper.toDto(repo.findById(id).orElseThrow());
    }
}
```

Ye bilkul aisa hai jaise Express mein ek `mapper.js` file banake export karo aur jahan chahiye wahan `require` kar lo — bas yahan Spring ka DI container ye kaam automatically karta hai.

## Common patterns

### Field renaming

Kabhi kabhi source aur target field ka naam alag hota hai, ya nested object se value nikalni hoti hai. `@Mapping` annotation se ye bata sakte ho:

```java
@Mapping(source = "user.id", target = "userId")
@Mapping(source = "createdAt", target = "created")
OrderDto toDto(Order o);
```

`user.id` likhne ka matlab hai — nested object ke andar jaake `id` field utha lo. Bilkul JS mein `order.user.id` jaisa hi hai.

### Constants aur expressions

Kabhi tumhe koi hardcoded value daalni hoti hai, ya do fields ko combine karke ek naya field banana hota hai:

```java
@Mapping(target = "version", constant = "v2")
@Mapping(target = "fullName", expression = "java(o.getFirstName() + \" \" + o.getLastName())")
@Mapping(target = "id", ignore = true)
UserDto toDto(User o);
```

- `constant` — target field mein hamesha ek fixed value daal do (jaise API version).
- `expression` — raw Java code likh do jo evaluate hoga (thoda hacky hai, zyada use mat karo, warna type-safety ka fayda chala jayega).
- `ignore = true` — is field ko chhodo, mat map karo.

### Nested mapping

Agar `User` ke andar `Address` object bhi hai, aur uska bhi apna mapper hai, to `uses` attribute se dono ko jod sakte ho:

```java
@Mapper(componentModel = "spring", uses = AddressMapper.class)
public interface UserMapper {
    UserDto toDto(User u);
}
```

`UserDto.address` ko map karne ke liye MapStruct automatically `AddressMapper` bean use karega. Isse tumhare mappers modular reh jaate hain — bilkul jaise tum Express mein ek chhota utility function ban ke doosre function ke andar reuse karte ho.

### Existing instance update karna (PATCH endpoints ke liye)

REST API mein PATCH request handle karte waqt, tumhe naya object nahi banana — existing object ko **update** karna hota hai:

```java
@Mapping(target = "id", ignore = true)
void updateEntity(@MappingTarget Order target, OrderUpdateDto src);
```

`@MappingTarget` bolta hai — "ye jo object diya hai, usi ko modify karo, naya mat banao."

Aur agar tumhe sirf wahi fields update karne hain jo `null` nahi hain (matlab request mein aaye hain), to:

```java
@BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
void patch(@MappingTarget Order target, OrderPatchDto src);
```

Ye bilkul PATCH ka sahi semantics hai — Swiggy app mein agar tum sirf apna address update karte ho, to naam/phone number wagera untouched rehne chahiye. Ye strategy exactly wahi guarantee deti hai — jo field DTO mein `null` hai, usse target mein overwrite nahi karega.

### Custom converters

Kabhi ek type ko doosre type mein convert karna complex hota hai (jaise `Instant` ko ISO string banana). Tab `@Named` method likh ke use `qualifiedByName` se reference kar sakte ho:

```java
@Named("toIso")
default String toIso(Instant i) {
    return i == null ? null : i.toString();
}

@Mapping(source = "createdAt", target = "createdAt", qualifiedByName = "toIso")
OrderDto toDto(Order o);
```

### Enum mapping

Enums ke naam dono side pe match nahi karte kabhi kabhi (jaise DB ka internal status vs API ka public status). `@ValueMapping` se explicit mapping bana sakte ho:

```java
@ValueMapping(source = "PAID", target = "COMPLETED")
@ValueMapping(source = MappingConstants.ANY_REMAINING, target = MappingConstants.NULL)
PublicStatus map(InternalStatus s);
```

`ANY_REMAINING` ek catch-all hai — jitne enum values explicitly map nahi kiye, unke liye default behavior bata do (yahan `NULL`).

## Generated code (khud dekh sakte ho)

Build karne ke baad `target/generated-sources/annotations/` folder mein jaake dekho — MapStruct ne actual mein kya likha hai:

```java
@Component
public class OrderMapperImpl implements OrderMapper {
    @Override
    public OrderDto toDto(Order order) {
        if (order == null) return null;
        OrderDto dto = new OrderDto();
        dto.setId(order.getId());
        if (order.getUser() != null) {
            dto.setUserName(order.getUser().getName());
        }
        // ...
        return dto;
    }
}
```

Dekho kitna simple, readable Java hai — koi reflection nahi, koi magic nahi. Aur agar koi field map hi nahi ho sakta (type mismatch waghera), to ye tumhe **compile time** pe hi error dega, runtime pe nahi. Ye MapStruct ka sabse bada selling point hai.

## Strict mode

Default mein agar koi field accidentally map hone se reh jaaye, MapStruct sirf ek warning deta hai. Production-grade code ke liye ise error bana do:

```java
@Mapper(componentModel = "spring",
        unmappedTargetPolicy = ReportingPolicy.ERROR,
        unmappedSourcePolicy = ReportingPolicy.WARN)
```

Isse jab bhi koi naya field DTO ya Entity mein add hota hai aur mapping bhool jaate ho, **build hi fail ho jayega**. Ye ek bahut valuable safety net hai — jaise TypeScript mein `strict: true` set karna. Entity aur DTO ke beech "drift" (dono alag-alag direction mein evolve ho jaayein) ye catch kar leta hai.

## Lombok ke saath

Lombok pehle chalna chahiye taaki wo getters/setters generate kar de, tabhi MapStruct un methods ko padh sake. Isliye `lombok-mapstruct-binding` dependency add karo (upar install section mein dikhaya hai) — ye MapStruct ko Lombok-generated members dekhne deta hai.

## Records support

Java `record` types (immutable data classes, kinda like TS's `readonly` interfaces) ko bhi MapStruct support karta hai. Canonical constructor use karke mapping ho jaati hai:

```java
public record OrderDto(Long id, String status, BigDecimal total) {}

@Mapper(componentModel = "spring")
public interface OrderMapper {
    OrderDto toDto(Order order);
}
```

Yahan koi setters nahi hain (records immutable hote hain), to MapStruct seedha constructor call karta hai generated code mein.

## Gotchas / common mistakes

- **Lombok + MapStruct ka order galat** — build error ya silently khaali fields. `lombok-mapstruct-binding` add karna mat bhoolo.
- **`componentModel` set karna bhool jaana** — agar `componentModel = "spring"` nahi likha, to generated class `@Component` nahi banegi, aur `@Autowired`/constructor injection fail hoga (tumhe manually `Mappers.getMapper(OrderMapper.class)` call karna padega).
- **Generated code na dekhna** — jab kabhi mapping weird lage, `target/generated-sources` mein jaake actual generated class dekho. Debugging bahut easy ho jaati hai kyunki ye plain Java hai.
- **Circular references** — agar `A` ke andar `B` hai aur `B` ke andar wapas `A` (bidirectional relation), to infinite loop ban sakta hai. Aise cases mein manual `@Mapping(ignore = true)` ya `@Context` use karke break karna padta hai.
- **Expression ka overuse** — `expression = "java(...)"` powerful hai lekin type-safety todta hai aur IDE refactoring tools ko confuse karta hai. Sirf tab use karo jab koi doosra clean option na ho.

## Alternatives

| Tool | Notes |
|------|-------|
| **ModelMapper** | Reflection-based hai, runtime pe kaam karta hai, isliye slower |
| **Dozer** | Purana, slow, avoid karo |
| **Manual mapping** | Chhote projects ke liye theek hai |
| **MapStruct** | Non-trivial codebases ke liye recommended |

## Key Takeaways

- MapStruct compile-time pe DTO ↔ Entity mapper generate karta hai — koi reflection, koi runtime overhead nahi.
- Sirf interface likho, method body nahi — annotation processor pura implementation banata hai jise tum `target/generated-sources` mein dekh sakte ho.
- `componentModel = "spring"` se generated mapper ek Spring `@Component` ban jaata hai, seedha inject kar sakte ho.
- `@Mapping` se field renaming, constants, expressions, aur ignore karna control hota hai.
- `@MappingTarget` + `nullValuePropertyMappingStrategy = IGNORE` PATCH endpoints ke liye perfect combo hai.
- `unmappedTargetPolicy = ReportingPolicy.ERROR` set karke strict mode enable karo — DTO/Entity drift build time pe hi pakad liya jaayega.
- Lombok ke saath use karte waqt order matter karta hai — Lombok pehle, MapStruct baad mein, aur `lombok-mapstruct-binding` add karna mat bhoolo.

## Related
- [[01-Library-Cheatsheet]]
- [[02-Lombok]]
- [[02-Entity-Basics]]
- [[03-DTOs-and-Serialization]]
