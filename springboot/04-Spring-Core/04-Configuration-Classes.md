# Configuration Classes — @Configuration aur @Bean

## Ye cheez kya hai aur kyun padni chahiye?

Socho tum Swiggy ka backend bana rahe ho. Tumhare paas kuch cheezein hain jo **tumne khud likhi hain** — jaise `OrderService`, `RestaurantService`, `UserService`. Inpe tum directly `@Component` ya `@Service` laga sakte ho aur Spring automatically inhe manage kar lega.

Lekin ab socho — tumhe **ObjectMapper** chahiye (JSON serialization ke liye), **HikariCP DataSource** chahiye (database connections ke liye), **RedisClient** chahiye (caching ke liye). Ye saari third-party libraries hain. Tum inke andar jaake `@Component` nahi laga sakte — woh tumhara code nahi hai!

**Yahan aata hai `@Configuration` aur `@Bean` ka combo.**

Tum ek special class banate ho jisme factory methods hoti hain — "bhai, is tarah se ObjectMapper banao, is tarah se DataSource banao" — aur Spring us class ko padhke sab kuch Spring container mein register kar leta hai.

> [!info] Node.js/Express dev ke liye comparison
> Agar tumne `awilix` ya `tsyringe` use kiya hai, toh `@Configuration` bilkul waise hi hai jaise tum manually container mein cheezein register karte the:
> ```ts
> // awilix mein
> container.register({
>   objectMapper: asValue(new ObjectMapper()),
>   dataSource: asFunction(createDataSource).singleton(),
> });
> ```
> Spring mein yahi kaam `@Configuration` class karta hai — bas Java methods ke form mein.

---

## @Component vs @Bean — Kab kya use karein?

Ye ek common confusion hai beginners mein. Simple table dekho:

| Style | Kab use karo | Example |
|---|---|---|
| `@Component` / `@Service` / `@Repository` | **Tumhari apni** classes ke liye | `UserService`, `OrderRepository` |
| `@Bean` inside `@Configuration` | **Third-party** classes ya complex construction wale beans | `ObjectMapper`, `RestTemplate`, `DataSource`, `RedisClient` |

**Rule of thumb:** Agar class tumhari hai → `@Component`. Agar class kisi library ki hai → `@Bean`.

---

## Basic Syntax — Pehli baar dekh lo

```java
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;
import org.springframework.beans.factory.annotation.Value;

@Configuration  // <-- Spring ko batata hai: "bhai, is class mein bean definitions hain"
public class AppConfig {

    // Bean ka naam = method ka naam ("objectMapper")
    @Bean
    public ObjectMapper objectMapper() {
        // Hum manually ObjectMapper configure kar rahe hain
        // Dates ko timestamps ki jagah ISO format mein serialize karo
        return new ObjectMapper()
            .registerModule(new JavaTimeModule())  // Java 8 date/time support
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    }

    // @Value se application.properties se value inject kar rahe hain
    @Bean
    public RestClient restClient(@Value("${api.base-url}") String baseUrl) {
        // Swiggy ke bahar kisi payment gateway ya SMS service ko call karne ke liye
        return RestClient.builder()
            .baseUrl(baseUrl)
            .build();
    }
}
```

**Key points:**
- `@Configuration` class level pe lagta hai
- `@Bean` method level pe lagta hai
- Method ka naam hi bean ka naam ban jaata hai by default
- Custom naam dena ho toh: `@Bean(name = "myCustomObjectMapper")`

---

## @Configuration kyun, sirf @Component kyun nahi? — CGLIB Proxying ka Raaz

Ye ek **bahut important** concept hai jo beginners miss karte hain. Dhyan se padho.

Agar tumhare paas do beans hain jahan ek doosre pe depend karta hai:

```java
@Configuration
public class AppConfig {

    @Bean
    public A beanA() {
        return new A(beanB()); // beanB() ko direct call kar rahe hain
    }

    @Bean
    public B beanB() {
        return new B(); // yeh singleton bean hai
    }
}
```

Yahan `beanA()` ke andar `beanB()` call ho raha hai. Agar yeh normal Java hota, toh har baar call pe **naya `B` object** banta. Lekin Spring ke saath aisa nahi hota.

**Kyun? CGLIB Proxying ki wajah se.**

`@Configuration` class ko Spring runtime pe **subclass** karta hai (CGLIB use karke). Is subclass mein `beanB()` method ko override kiya jaata hai taaki:
1. Pehli baar call ho → Spring container se naya `B` banao, store karo
2. Doosri baar call ho → container se **wahi purana `B` wapas do**

Matlab `beanA()` aur koi bhi aur consumer sab **ek hi `B` object** share karte hain. Singleton guarantee intact rehti hai.

**Ab agar `@Component` use karte?**

```java
@Component  // @Configuration ki jagah @Component
public class AppConfig {

    @Bean
    public A beanA() {
        return new A(beanB()); // Yahan beanB() directly call hoga — naya B banega!
    }

    @Bean
    public B beanB() {
        return new B(); // Spring ne alag se B register kiya hai
    }
}
```

Yahan `beanA()` ke andar `beanB()` call hoga toh **brand new `B` banega** — woh singleton `B` nahi jo Spring ne register kiya. Bug aa gaya!

> [!warning] Ye galti mat karna
> `@Component` ke saath `@Bean` methods kaam karte hain, lekin **sirf tab jab unke beech cross-method calls nahi hain**. Jaise hi ek bean method doosre bean method ko call kare, tum `@Configuration` chahiye. Safe rehna ho toh hamesha `@Configuration` use karo bean classes ke liye.

---

## Beans ke Beech Dependencies — Do Tarike

Socho Zomato ke liye ek infrastructure config class bana rahe ho:

```java
@Configuration
public class ZomatoInfraConfig {

    // ==========================================
    // TARIKA 1: Direct method call (CGLIB magic)
    // Sirf @Configuration mein kaam karta hai
    // ==========================================

    @Bean
    public OrderProcessor orderProcessor() {
        // paymentService() ko direct call kar rahe hain
        // CGLIB ensure karega ki singleton hi milega
        return new OrderProcessor(paymentService());
    }

    @Bean
    public PaymentService paymentService() {
        return new RazorpayPaymentService();
    }

    // ==========================================
    // TARIKA 2: Method parameter injection
    // (PREFERRED — sabse safe aur clear)
    // ==========================================

    @Bean
    public NotificationService notificationService() {
        return new FCMNotificationService();
    }

    @Bean
    public DeliveryTracker deliveryTracker(
            PaymentService paymentService,       // Spring inject karega
            NotificationService notificationService  // Spring inject karega
    ) {
        return new DeliveryTracker(paymentService, notificationService);
    }
}
```

> [!tip] Parameter wala style prefer karo
> - Clearly dikhta hai ki kya depend karta hai kya pe
> - CGLIB pe depend nahi karta
> - `@Component` configs mein bhi kaam karta hai
> - Unit testing mein easily mock kar sakte ho parameters
>
> Jaise Express mein tum clearly function arguments mein dependencies pass karte the — same philosophy.

---

## Bean Lifecycle Hooks — Initialization aur Cleanup

Kabhi kabhi bean ek baar ban jaane ke baad kuch setup karna hota hai (jaise database connection pool warm up karna), aur application band hone pe kuch cleanup karna hota hai (jaise connections close karna).

```java
@Configuration
public class ServerConfig {

    // initMethod: bean ban jaane ke baad "start" method call hoga
    // destroyMethod: application band hone pe "stop" method call hoga
    @Bean(initMethod = "start", destroyMethod = "stop")
    public EmbeddedServer embeddedServer() {
        EmbeddedServer server = new EmbeddedServer();
        server.setPort(8080);
        server.setMaxConnections(1000);
        return server;
    }
}
```

Iska Node.js equivalent socho:
```js
// Node.js mein hum manually karte the
const server = createServer();
server.on('ready', () => console.log('started'));
process.on('SIGTERM', () => server.close());
```

Spring mein yeh lifecycle Spring khud manage karta hai.

Agar tum apni class ke andar lifecycle hooks chahte ho toh `@PostConstruct` aur `@PreDestroy` annotations use karo (covered in Bean Scopes & Lifecycle chapter).

---

## Conditional Beans — "Agar Ye Setting Ho Toh Hi Banao"

Ye feature bahut powerful hai. Swiggy production pe Redis cache use karta hai, lekin local development mein in-memory cache. Alag alag environments ke liye alag beans.

```java
@Configuration
public class CacheConfig {

    // Sirf tab bean banega jab application.properties mein
    // cache.type=redis ho
    @Bean
    @ConditionalOnProperty(name = "cache.type", havingValue = "redis")
    public CacheManager redisCacheManager(
            @Value("${redis.host}") String host,
            @Value("${redis.port}") int port
    ) {
        // Production: Actual Redis connection
        RedisConnectionFactory factory = new LettuceConnectionFactory(host, port);
        return RedisCacheManager.builder(factory).build();
    }

    // Default: jab Redis nahi chahiye (local dev)
    @Bean
    @ConditionalOnMissingBean(CacheManager.class)
    public CacheManager inMemoryCacheManager() {
        // Local dev: Simple in-memory cache
        return new ConcurrentMapCacheManager("orders", "restaurants", "users");
    }
}
```

Properties file mein:
```yaml
# application-prod.yml
cache:
  type: redis

# application-dev.yml (ya nothing — fallback in-memory)
```

> [!info] Yahi Spring Boot Auto-Configuration ka raaz hai
> Jab tum `spring-boot-starter-data-redis` dependency add karte ho, toh Spring Boot ki auto-configuration classes exactly yahi kaam karti hain — conditionally beans banati hain. `@ConditionalOnClass`, `@ConditionalOnMissingBean`, `@ConditionalOnProperty` — yahi saare tools hain.

---

## Real-World Example — Ek Poori Infrastructure Config

Yeh dekho ek production-level config class kaise dikhti hai. Maano hum Paytm jaisi app ka backend bana rahe hain:

```java
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import io.lettuce.core.RedisClient;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Conditional;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;

import javax.sql.DataSource;
import java.time.Clock;

// ===== Configuration Properties Record =====
// Yeh application.yml se values map karta hai:
// app:
//   db:
//     url: jdbc:postgresql://...
//     user: paytm_user
//     password: secret
//     pool-size: 20

@ConfigurationProperties("app")  // "app" prefix ke properties yahan map hongi
public record AppProps(DbProps db) {
    public record DbProps(
        String url,
        String user,
        String password,
        int poolSize
    ) {}
}

// ===== Main Infrastructure Config =====

@Configuration
@EnableConfigurationProperties(AppProps.class)  // AppProps ko bean banao
public class PaytmInfraConfig {

    // ---- Database Connection Pool ----
    @Bean
    public DataSource dataSource(AppProps props) {
        // HikariCP — Java ka sabse fast connection pool
        // Node.js mein pg-pool ya knex use karte the, yahan HikariCP
        var hikariConfig = new HikariConfig();
        hikariConfig.setJdbcUrl(props.db().url());
        hikariConfig.setUsername(props.db().user());
        hikariConfig.setPassword(props.db().password());
        hikariConfig.setMaximumPoolSize(props.db().poolSize());   // max connections
        hikariConfig.setMinimumIdle(5);                           // min idle connections
        hikariConfig.setConnectionTimeout(30_000);                // 30 seconds timeout
        hikariConfig.setIdleTimeout(600_000);                     // 10 min idle timeout

        return new HikariDataSource(hikariConfig);
    }

    // ---- Redis Client (sirf tab banao jab redis.url set ho) ----
    @Bean
    @ConditionalOnProperty("redis.url")  // redis.url property exist kare tabhi
    public RedisClient redisClient(@Value("${redis.url}") String url) {
        // UPI transactions ke baad session cache karne ke liye Redis
        return RedisClient.create(url);
    }

    // ---- System Clock (testing ke liye mock-friendly) ----
    @Bean
    public Clock clock() {
        // UTC clock — server hamesha UTC mein kaam kare
        // Test mein is bean ko mock karke fixed time set kar sakte ho
        return Clock.systemUTC();
    }

    // ---- JSON Mapper ----
    @Bean
    public ObjectMapper objectMapper() {
        return new ObjectMapper()
            .registerModule(new JavaTimeModule())
            // Dates ISO format mein: "2024-01-15T10:30:00Z"
            // Node.js devs ke liye familiar format!
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
            // Unknown fields ignore karo (backward compatibility ke liye)
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
    }
}
```

Aur `application.yml` mein:
```yaml
app:
  db:
    url: jdbc:postgresql://localhost:5432/paytm_db
    user: paytm_user
    password: ${DB_PASSWORD}  # environment variable se
    pool-size: 20

redis:
  url: redis://localhost:6379
```

---

## @Import — Multiple Config Classes Ko Combine Karo

Jab tumhari application badi ho jaati hai, ek config class mein saari beans daalna messy lag sakta hai. Tum config ko modular bana sakte ho:

```java
// ---- Alag alag config files ----

@Configuration
public class DatabaseConfig {
    @Bean public DataSource dataSource(...) { ... }
    @Bean public JdbcTemplate jdbcTemplate(DataSource ds) { ... }
}

@Configuration
public class SecurityConfig {
    @Bean public PasswordEncoder passwordEncoder() { ... }
    @Bean public JwtTokenProvider jwtTokenProvider() { ... }
}

@Configuration
public class MessagingConfig {
    @Bean public KafkaTemplate<String, String> kafkaTemplate() { ... }
    @Bean public RabbitTemplate rabbitTemplate() { ... }
}

// ---- Main config jo sab import kare ----
@Configuration
@Import({
    DatabaseConfig.class,
    SecurityConfig.class,
    MessagingConfig.class
})
public class AppConfig {
    // Yahan sirf app-level beans jo kisi category mein fit nahi hote
    @Bean
    public Clock clock() { return Clock.systemUTC(); }
}
```

> [!info] Node.js analogy
> Yeh bilkul waise hai jaise tum `index.ts` mein multiple modules import karte the:
> ```ts
> // Node.js
> import { databaseModule } from './config/database';
> import { securityModule } from './config/security';
> container.register(databaseModule, securityModule);
> ```

---

## @Bean Ka Scope Set Karna

Default mein sab beans **singleton** hote hain. Agar har request pe naya object chahiye:

```java
@Configuration
public class ScopeConfig {

    // Default: Singleton — ek hi instance, baar baar reuse hoga
    @Bean
    public DatabaseConnectionPool connectionPool() {
        return new DatabaseConnectionPool(20);
    }

    // Prototype: Har baar jab inject hoga, naya object banega
    @Bean
    @Scope("prototype")
    public OTPGenerator otpGenerator() {
        // Har UPI transaction ke liye fresh OTP generator
        return new OTPGenerator();
    }

    // Request scope: Ek HTTP request ke liye ek instance
    @Bean
    @Scope(value = "request", proxyMode = ScopedProxyMode.TARGET_CLASS)
    public RequestContext requestContext() {
        // Current user ka context — har request ke liye alag
        return new RequestContext();
    }
}
```

---

## Common Gotchas — Beginners Ki Galtiyan

> [!warning] Galti 1: @Configuration ki jagah @Component laga dena
> ```java
> @Component  // GALAT! @Configuration hona chahiye tha
> public class AppConfig {
>     @Bean public A a() { return new A(b()); }  // naya B banega, singleton nahi!
>     @Bean public B b() { return new B(); }
> }
> ```
> Fix: `@Component` ko `@Configuration` se replace karo.

> [!warning] Galti 2: @Bean method ko private banana
> ```java
> @Configuration
> public class AppConfig {
>     @Bean
>     private ObjectMapper objectMapper() {  // GALAT! private method ignore ho jaata hai
>         return new ObjectMapper();
>     }
> }
> ```
> Fix: `private` hatao — method kam se kam package-private honi chahiye.

> [!warning] Galti 3: @Configuration class ko final banana
> ```java
> @Configuration
> public final class AppConfig {  // GALAT! CGLIB subclass nahi bana sakta
>     ...
> }
> ```
> Fix: `final` keyword hatao.

> [!warning] Galti 4: Same type ke do @Bean methods — Ambiguity
> ```java
> @Configuration
> public class CacheConfig {
>     @Bean
>     public CacheManager redisCacheManager() { ... }
>
>     @Bean
>     public CacheManager inMemoryCacheManager() { ... }
>     // Spring confuse ho jaayega — kaunsa inject kare?
> }
> ```
> Fix: Ek pe `@Primary` lagao ya inject karte waqt `@Qualifier("redisCacheManager")` use karo.

> [!warning] Galti 5: Bean ke andar new kiya object auto-injected nahi hoga
> ```java
> @Bean
> public OrderService orderService() {
>     PaymentService ps = new PaymentService(); // Yeh Spring container mein nahi hai!
>     // ps ke andar koi @Autowired field inject nahi hogi
>     return new OrderService(ps);
> }
> ```
> Fix: `PaymentService` ko method parameter ke through inject karo:
> ```java
> @Bean
> public OrderService orderService(PaymentService paymentService) {
>     // Ab Spring ka managed instance milega
>     return new OrderService(paymentService);
> }
> ```

> [!info] Kab @Configuration use mat karo
> Agar Spring Boot pehle se koi bean configure karta hai (jaise `DataSource`, `ObjectMapper`), toh pehle try karo `application.yml` mein properties set karke. Sirf tab `@Bean` se override karo jab default behavior tumhare kaam ka na ho. Unnecessary `@Bean` definitions se auto-configuration break ho sakti hai.

---

## Practical Pattern — Test Mein Beans Override Karna

Production mein real Razorpay client use karo, test mein mock:

```java
// Main config
@Configuration
public class PaymentConfig {
    @Bean
    public PaymentGateway paymentGateway(
            @Value("${razorpay.key}") String key,
            @Value("${razorpay.secret}") String secret
    ) {
        return new RazorpayGateway(key, secret);
    }
}

// Test config — production config ko override karta hai
@TestConfiguration  // sirf tests mein active rahega
public class TestPaymentConfig {

    @Bean
    @Primary  // production wale bean ke upar yeh prefer hoga
    public PaymentGateway paymentGateway() {
        // Fake gateway — real API call nahi karega
        return new MockPaymentGateway()
            .alwaysSucceed()
            .withTransactionId("TXN-TEST-123");
    }
}
```

```java
@SpringBootTest
@Import(TestPaymentConfig.class)  // test config import karo
class OrderServiceTest {
    @Autowired PaymentGateway gateway; // MockPaymentGateway milega
    ...
}
```

---

## Key Takeaways

- **`@Configuration` + `@Bean`** — third-party classes ko Spring container mein laane ka tarika hai. Khud ki classes ke liye `@Component` use karo.
- **`@Configuration` is mandatory** agar `@Bean` methods ek doosre ko call karte hain — CGLIB proxying singleton guarantee deta hai.
- **Parameter injection style prefer karo** direct method call ke upar — cleaner, safer, testable.
- **Bean naam = method naam** by default; `@Bean(name = "...")` se override hota hai.
- **`@ConditionalOnProperty`** se environment-specific beans bana sakte ho — local mein mock, production mein real.
- **`@Import`** se multiple config classes ko modular rakho — ek badi file mein saari beans mat thunso.
- **`@Bean(initMethod, destroyMethod)`** se lifecycle hooks set karo third-party classes ke liye.
- **Common bugs:** private @Bean methods, final @Configuration class, same type ke multiple beans without @Primary/@Qualifier.
- **Testing mein** `@TestConfiguration` + `@Primary` se production beans ko easily override kar sakte ho bina main code chhedhe.
