# Lombok

> [!info] Express/TS wale dev ke liye
> Java classes bahut verbose hoti hain — getters, setters, equals, hashCode, constructors hi ek POJO class ke 80% lines bana dete hain. Node/TS mein tum bas `interface User { id: number; name: string }` likh ke chill karte ho, lekin Java mein har field ke liye getter-setter manually likhna padta tha... jab tak Lombok nahi aaya.
>
> Lombok ek **annotation processor** hai — matlab ek tool jo compile-time pe tumhare liye ye saara boilerplate generate kar deta hai. Tumhari `.java` source file clean rehti hai (bas annotations dikhte hain), lekin jo `.class` file banti hai usme saare getters/setters/constructors already generated hote hain. Ye kuch aisa hai jaise TypeScript ka `type` ya `interface` compile hoke JS mein gayab ho jaata hai — bas ulta, yahan cheezein add hoti hain, remove nahi.

## Install kaise karein?

Maven mein dependency daalo:

```xml
<dependency>
    <groupId>org.projectlombok</groupId>
    <artifactId>lombok</artifactId>
    <scope>provided</scope>
</dependency>
```

`scope=provided` isliye kyunki Lombok sirf compile-time pe chahiye — runtime pe jaake `.class` file mein already plain Java code baith chuka hota hai. Ye thoda `devDependencies` jaisa concept hai npm mein — build-time tool, production bundle mein iski zarurat nahi.

Maven compiler plugin mein bhi annotation processing configure karo:

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

## IDE setup — ye step skip mat karna

> [!warning] IDE plugin install karna COMPULSORY hai
> Agar IDE plugin install nahi kiya, toh tumhara code compile toh fine hoga, lekin IDE mein `entity.getName()` jaisi lines pe red squiggly error dikhega — kyunki IDE ko lagega `getName()` method exist hi nahi karta (usne toh source file mein sirf `@Getter` dekha, actual method generate hote hue nahi dekha). Bahut confusing lagta hai jab pehli baar dikhta hai — "bhai compile toh ho raha hai, red kyun hai?"
>
> - **IntelliJ IDEA**: Settings → Plugins → "Lombok" search karo → install karo. Fir "Annotation Processing" enable karo: Build → Compiler → Annotation Processors.
> - **VS Code**: "Lombok Annotations Support for VS Code" install karo (ya Java extension pack already isse handle karta hai).
> - **Eclipse**: `java -jar lombok.jar` run karke Eclipse mein install karo.

## The big four — sabse zyada use hone wale annotations

### `@Getter` / `@Setter`

```java
@Getter @Setter
public class User {
    private Long id;
    private String name;
}
// Generates: getId(), setId(Long), getName(), setName(String)
```

Ye TypeScript ke `get`/`set` accessors jaisa hi hai, bas yahan Lombok manually likhne se bachata hai.

Field-level pe bhi laga sakte ho: `@Getter private final String email;` (final field pe setter nahi banega, kyunki final field reassign nahi ho sakta — ye Java ka rule hai, `const` jaisa).

### `@ToString`

```java
@ToString(exclude = "password")
public class User { ... }
// User(id=1, name=Rita)
```

Console.log jaisa hi hai — object print karo toh readable string mile, sensitive fields (password) exclude kar do.

### `@EqualsAndHashCode`

```java
@EqualsAndHashCode(of = "id")
public class User { ... }
```

`equals()` aur `hashCode()` generate karta hai — JS mein `===` reference compare karta hai, but Java mein agar tumhe do `User` objects ko "same" bolna hai jab unka `id` match kare (chahe alag objects hon), toh ye annotation kaam aata hai. `of = "id"` bolta hai — sirf `id` field compare karo, baaki fields ignore karo.

### `@NoArgsConstructor` / `@AllArgsConstructor` / `@RequiredArgsConstructor`

```java
@NoArgsConstructor              // public User()
@AllArgsConstructor             // public User(Long, String, String)
@RequiredArgsConstructor        // sirf `final` fields ke liye constructor generate karega
public class User {
    private final Long id;
    private String name;
}
```

`@RequiredArgsConstructor` Spring mein **constructor injection** ka bread-and-butter hai:

```java
@Service
@RequiredArgsConstructor
public class OrderService {
    private final OrderRepository orders;       // generated constructor se inject hoga
    private final PaymentClient payments;
    // constructor manually likhne ki zaroorat hi nahi!
}
```

Socho isko Express ke dependency injection jaisa — agar tum kabhi NestJS use kiya ho toh wahan `constructor(private ordersService: OrdersService)` likhte ho. Yahan Spring bhi same kaam karta hai, bas Lombok us boring constructor ko khud likh deta hai jisme tum sirf `final` fields assign kar rahe hote.

## `@Data` — poora kitchen sink ek hi annotation mein

```java
@Data
public class User {
    private Long id;
    private String name;
}
```

Ye equivalent hai: `@Getter @Setter @ToString @EqualsAndHashCode @RequiredArgsConstructor` — sab ek saath.

> [!warning] JPA entities pe `@Data` lagana risky hai
> Generated `equals`/`hashCode` saari fields pe chalta hai, jisme lazy-loaded associations bhi shamil ho jaate hain. Isse `LazyInitializationException` ya infinite recursion trigger ho sakta hai (jaise do entities ek-dusre ko reference kar rahe hon aur `toString()` call karte hi infinite loop ban jaye — bilkul waise jaise circular JSON.stringify() JS mein crash karta hai).
>
> Iski jagah explicitly likho: `@EqualsAndHashCode(of = "id")` aur `@ToString(exclude = {"orders"})`.

## `@Builder` — object banane ka clean tareeka

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

Ye bilkul waisa hi hai jaise JS mein tum object banate ho `{ id: 1, name: "Rita", email: "rita@example.com" }` — bas Java mein constructors ke saath 5-6 optional params handle karna painful hota hai (kaunsa param kis position pe hai yaad rakhna padta), toh Builder pattern chaining ke through readable tareeka deta hai. Zomato ke order-building flow jaisa socho — pehle item add karo, fir address, fir payment method — chain karke final order "build" karte ho.

Common variants:
- `@Builder.Default` — kisi field ka default value provide karna
- `@Builder(toBuilder = true)` — `toBuilder()` generate karta hai, jisse existing object copy karke usme kuch fields modify kar sako (immutable-update pattern, Redux ke spread operator jaisa)
- `@SuperBuilder` — jab inheritance involved ho (parent-child classes dono builder pattern use karna chahte hon)

## `@Slf4j` — logger field free mein

```java
@Slf4j
public class OrderService {
    public void place() {
        log.info("placing order");   // log field generate hota hai: private static final Logger log = ...
    }
}
```

Node mein tum `console.log()` ya `winston`/`pino` logger banate ho aur usko manually import-instantiate karte ho. Yahan `@Slf4j` laga do, aur `log` naam ka logger field automatically class mein aa jaata hai — na import likhna, na instantiate karna.

Variants: `@Log4j2`, `@CommonsLog`, `@JBossLog` — different logging backends ke liye same idea.

## `@Value` — immutable POJO

```java
@Value
public class Money {
    String currency;
    BigDecimal amount;
}
```

Ye `@Data` jaisa hi hai, lekin: saari fields `final` hoti hain, class khud `final` hoti hai (extend nahi ho sakti), aur koi setters nahi hote. Basically ek immutable object — bank balance jaisa, ek baar create ho gaya toh usko modify nahi kar sakte, naya object banana padega.

> [!tip] Records vs `@Value`
> JDK 16+ mein `record` naam ka built-in language feature aa gaya hai — Lombok ki zaroorat hi nahi:
> ```java
> public record Money(String currency, BigDecimal amount) {}
> ```
> Value types ke liye `record` prefer karo. Lombok ka `@Value` sirf tab use karo jab JDK 16+ pe na ho.

## `@SneakyThrows`

Checked-exception ka requirement bypass karta hai:

```java
@SneakyThrows
public byte[] read() {
    return Files.readAllBytes(Paths.get("file.txt"));   // IOException declare nahi karna pada
}
```

Java mein checked exceptions ko `throws` keyword se declare karna padta hai — JS/TS mein aisa kuch nahi hota, wahan koi bhi function kabhi bhi throw kar sakta hai bina warning ke. `@SneakyThrows` Java ke us strict rule ko bypass karke JS jaisa "chup-chaap throw karne do" behavior de deta hai.

> [!warning] Bahut soch samajh ke use karo
> Ye errors ko hide karta hai — sirf genuinely unrecoverable cases mein use karo (jaise stream pipelines ke andar lambdas, jahan checked exceptions declare karna syntactically possible hi nahi hota).

## `@Cleanup`

```java
public void copy() throws IOException {
    @Cleanup InputStream in = new FileInputStream("a");
    @Cleanup OutputStream out = new FileOutputStream("b");
    // scope khatam hote hi close() automatically call hoga
}
```

Try-with-resources (native Java feature) usually isse zyada clear hota hai, isliye modern code mein `@Cleanup` kam hi dikhega.

## `lombok.config`

Project root mein config file:

```
config.stopBubbling = true
lombok.addLombokGeneratedAnnotation = true
lombok.anyConstructor.addConstructorProperties = true
lombok.equalsAndHashCode.callSuper = call
```

Ye ek project-wide settings file hai jo Lombok ke generated code ke behavior ko fine-tune karti hai (jaise ESLint config JS projects mein).

## Lombok use karna chahiye ya nahi?

Pros:
- Boilerplate mein massive kami
- Real-world mein zyada tar Spring Boot projects isko already use kar rahe hain

Cons:
- Build/IDE tooling pe extra dependency (plugin install karna padta hai)
- `record` aane ke baad `@Value` kaafi had tak obsolete ho gaya hai
- Kuch teams explicit code prefer karti hain (debugging mein generated code samajhna thoda tricky ho sakta hai)

**Pragmatic rule**: `@Slf4j`, `@RequiredArgsConstructor`, `@Getter`/`@Setter`, `@Builder` — ye use karo, ye safe aur high-value hain. Entities pe `@Data` avoid karo. JDK 16+ pe `@Value` ki jagah `record` prefer karo.

## Related
- [[01-Library-Cheatsheet]]
- [[01-Records-and-Pattern-Matching]]
- [[01-IoC-DI-Concepts]]
- [[03-Logging-Best-Practices]]
