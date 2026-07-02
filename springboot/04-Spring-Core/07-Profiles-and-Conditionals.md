# Profiles and Conditional Beans

Ek real scenario socho — Zomato ka backend hai. Dev environment mein tum chahte ho ki order place hone pe fake SMS jaaye (taaki testing mein real SMS na bheje aur paise waste na hon). Production mein real Twilio API call hona chahiye. Testing mein kuch bhi nahi chahiye — bus log statements.

Node.js/Express mein hum yeh kuch aisa karte the:

```javascript
// Node.js wala style — scattered if-else hell
if (process.env.NODE_ENV === 'production') {
  smsService = new TwilioService();
} else if (process.env.NODE_ENV === 'test') {
  smsService = new NoOpService();
} else {
  smsService = new FakeSmsService();
}
```

Yeh code har jagah phail jaata hai — service file mein, config file mein, middleware mein. Spring Boot ne iska ek elegant solution diya hai: **Profiles aur Conditional Beans**. Poori cheez declarative ho jaati hai — tum annotation lagao, Spring khud decide karta hai ki kaunsa bean register karna hai.

---

## Profiles — Named Environment Slices

### Yeh kya hota hai aur kyun chahiye?

**Profile** basically ek naam hai jo tum apne environment ko dete ho — `dev`, `prod`, `staging`, `test`, `local`, `kafka-enabled`, kuch bhi. Jab tum ek profile activate karte ho, sirf usi profile ke beans Spring container mein register hote hain.

Socho yeh Swiggy ke kitchen stations jaisi cheez hai — ek station sirf breakfast ke waqt kaam karta hai, doosra lunch pe, teesra dinner pe. Tune "breakfast" activate kiya toh sirf breakfast station on hoga. Spring profiles exactly aisa hi kaam karte hain.

### Beans ko Profile se Tag Karna

```java
// EmailSender — ek interface
public interface EmailSender {
    void send(String to, String subject, String body);
}

// Dev environment ke liye — real email mat bhejo, bus console pe print karo
@Service
@Profile("dev")
public class FakeEmailSender implements EmailSender {
    
    @Override
    public void send(String to, String subject, String body) {
        // Sirf console pe dikhao, AWS SES ko call mat karo
        System.out.println("=== [FAKE EMAIL] ===");
        System.out.println("To: " + to);
        System.out.println("Subject: " + subject);
        System.out.println("Body: " + body);
    }
}

// Production ke liye — real AWS SES
@Service
@Profile("prod")
public class SesEmailSender implements EmailSender {
    
    private final AmazonSES sesClient;
    
    public SesEmailSender(AmazonSES sesClient) {
        this.sesClient = sesClient;
    }
    
    @Override
    public void send(String to, String subject, String body) {
        // Real AWS SES call
        SendEmailRequest request = new SendEmailRequest()
            .withDestination(new Destination().withToAddresses(to))
            .withMessage(new Message()
                .withSubject(new Content(subject))
                .withBody(new Body().withText(new Content(body))));
        sesClient.sendEmail(request);
    }
}
```

Koi bhi class jo `EmailSender` inject karti hai — usse koi farak nahi padta ki `Fake` hai ya `Ses`. Spring active profile ke basis pe sahi implementation inject kar deta hai. Tumhara business logic bilkul clean rehta hai.

### Profile Expressions — Aur Zyada Control

Sirf simple profile naam nahi, tum expressions bhi use kar sakte ho:

```java
// Dev ya Test — dono mein kaam kare
@Service
@Profile("dev | test")
public class FakeSmsSender implements SmsSender { ... }

// Production chhod ke baaki sab — staging, dev, test sab mein
@Service
@Profile("!prod")
public class MockPaymentGateway implements PaymentGateway { ... }

// Array form — prod ya staging dono mein
@Service
@Profile({"prod", "staging"})
public class RealPaymentGateway implements PaymentGateway { ... }

// Compound condition — prod AND kafka-enabled dono hona chahiye
@Service
@Profile("prod & kafka-enabled")
public class KafkaOrderPublisher implements OrderPublisher { ... }
```

> [!info] Node.js Comparison
> Node mein `process.env.NODE_ENV === 'dev' || process.env.NODE_ENV === 'test'` likhte the. Spring mein yeh `@Profile("dev | test")` ho gaya — ek line, zyada readable.

### Profiles Kaise Activate Kare?

Teen tarike hain — project ke hisaab se choose karo:

**1. application.yml mein (local dev ke liye):**

```yaml
# application.yml
spring:
  profiles:
    active: dev
```

**2. Command line se (production deployment ke liye):**

```bash
# Jar run karte waqt
java -jar zomato-backend.jar --spring.profiles.active=prod

# Ya multiple profiles
java -jar zomato-backend.jar --spring.profiles.active=prod,kafka-enabled
```

**3. Environment variable se (Docker/Kubernetes/Vercel ke liye best):**

```bash
# Docker compose ya K8s manifest mein
SPRING_PROFILES_ACTIVE=prod java -jar app.jar

# Docker run
docker run -e SPRING_PROFILES_ACTIVE=prod my-app:latest
```

**4. Programmatic (rare cases):**

```java
// Agar tumhe code se control karna ho — bahut kam use hota hai
new SpringApplicationBuilder(App.class)
    .profiles("prod", "kafka-enabled")
    .run(args);
```

> [!tip] Default Profile
> Agar koi profile active nahi hai toh `@Profile("default")` wale beans register hote hain. Yeh "no config" local dev ke liye useful hai — jab koi newcomer pehli baar project clone kare aur koi profile set na kare, phir bhi cheez chalti rahe.

---

## Profile-Specific Property Files

Yeh Spring Boot ka ek killer feature hai. Sirf beans nahi — configurations bhi profile-specific ho sakti hain.

```
src/main/resources/
├── application.yml          # Hamesha load hota hai (common config)
├── application-dev.yml      # Sirf 'dev' profile active hone pe
├── application-prod.yml     # Sirf 'prod' profile active hone pe
├── application-test.yml     # Sirf 'test' profile active hone pe
└── application-staging.yml  # Sirf 'staging' profile active hone pe
```

Practical example — Swiggy-style app:

```yaml
# application.yml — common across all environments
app:
  name: SwiggyClone
  version: 2.1.0

spring:
  jpa:
    show-sql: false    # default off
```

```yaml
# application-dev.yml — local development
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/swiggy_dev
    username: dev_user
    password: dev_pass
  jpa:
    show-sql: true      # dev mein SQL dikhao
    hibernate:
      ddl-auto: create-drop  # har restart pe fresh schema

logging:
  level:
    com.swiggy: DEBUG   # debug logs chahiye development mein
```

```yaml
# application-prod.yml — production
spring:
  datasource:
    url: ${DATABASE_URL}         # env variable se lo
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}
  jpa:
    hibernate:
      ddl-auto: validate   # schema auto-change nahi — dangerous in prod!

logging:
  level:
    com.swiggy: WARN    # prod mein sirf warnings aur errors
```

Spring pehle `application.yml` load karta hai, phir active profile ka file — aur profile-specific values override kar deti hain common values ko.

---

## @Conditional Family — Aur Zyada Granular Control

Profiles bahut kaam ki cheez hai, lekin kabhi kabhi profile se bhi fine-grained control chahiye hoti hai. Yahan aata hai `@Conditional` annotations ka family.

### Saare Important Conditionals

| Annotation | Kab trigger hota hai |
|---|---|
| `@ConditionalOnProperty(name=…, havingValue=…)` | Koi property set hai aur specific value hai |
| `@ConditionalOnMissingProperty` | Property absent hai |
| `@ConditionalOnClass(X.class)` | Class classpath pe available hai |
| `@ConditionalOnMissingClass` | Class classpath pe nahi hai |
| `@ConditionalOnBean(X.class)` | Context mein X type ka bean already hai |
| `@ConditionalOnMissingBean(X.class)` | Context mein X type ka koi bean nahi hai abhi tak |
| `@ConditionalOnExpression("#{...}")` | SpEL expression true hai |
| `@ConditionalOnWebApplication` | Web application context mein chal raha hai |
| `@ConditionalOnNotWebApplication` | Web context mein nahi chal raha |
| `@ConditionalOnResource` | Koi specific resource/file present hai |

### @ConditionalOnProperty — Sabse Common

```java
@Configuration
public class CacheConfig {

    // Agar application.yml mein cache.type=redis set hai toh Redis cache use karo
    @Bean
    @ConditionalOnProperty(name = "cache.type", havingValue = "redis")
    public CacheManager redisCache() {
        return new RedisCacheManager();
    }

    // Agar property missing hai ya memory hai — in-memory cache use karo
    // matchIfMissing = true matlab "agar property define hi nahi hai toh bhi yeh bean banaao"
    @Bean
    @ConditionalOnProperty(name = "cache.type", havingValue = "memory", matchIfMissing = true)
    public CacheManager inMemoryCache() {
        return new ConcurrentMapCacheManager();
    }
}
```

```yaml
# application.yml
cache:
  type: redis   # yeh change karo "memory" pe aur Redis bean nahi banega
```

### @ConditionalOnMissingBean — "User Override" Pattern

Yeh Spring Boot auto-configuration ka core secret hai. Samajhlo Swiggy ke JSON library wala example:

```java
@Configuration
public class JacksonAutoConfig {

    @Bean
    @ConditionalOnMissingBean(ObjectMapper.class)
    public ObjectMapper objectMapper() {
        // Default ObjectMapper banao
        return new ObjectMapper()
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
    }
}
```

Matlab: "Agar developer ne khud apna `ObjectMapper` bean nahi banaya, toh mera default use karo."

Tum apne project mein yeh likhoge:

```java
@Configuration
public class MyConfig {
    
    @Bean
    public ObjectMapper objectMapper() {
        // Mera custom ObjectMapper — camelCase to snake_case auto-convert karo
        return new ObjectMapper()
            .setPropertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE)
            .configure(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS, false)
            .registerModule(new JavaTimeModule());
    }
}
```

Spring dekhega ki `ObjectMapper` bean already hai — toh auto-config wala nahi banega. Tumhara custom wala use hoga. Yahi pattern Spring Boot ke har auto-configuration mein hai — isliye tum default behavior ko override kar sakte ho bina framework ko hack kiye.

### @ConditionalOnClass — Optional Dependencies

```java
@Configuration
public class MonitoringConfig {

    // Agar Micrometer classpath pe hai tabhie metrics register karo
    @Bean
    @ConditionalOnClass(name = "io.micrometer.core.instrument.MeterRegistry")
    public MetricsService metricsService() {
        return new MicrometerMetricsService();
    }
}
```

Yeh useful hai jab tumhari library optional dependency ke saath kaam kar sakti hai — Micrometer hai toh use karo, nahi hai toh gracefully skip karo.

---

## Practical Example: Feature Flags

UPI apps mein often features A/B test kiye jaate hain. Kuch users ko naya UI dikhao, kuch ko purana. Yahi Feature Flags ka concept hai. Spring mein kuch aisa karo:

```yaml
# application.yml
features:
  new-checkout-flow: true
  ai-recommendations: false
  fraud-detection: true
  audit-logging: true
```

```java
@Configuration
public class FeatureFlagConfig {

    // Naya checkout flow — property true hone pe hi register karo
    @Bean
    @ConditionalOnProperty(name = "features.new-checkout-flow", havingValue = "true")
    public CheckoutService newCheckoutService() {
        return new NewCheckoutService(); // React-style multi-step checkout
    }

    // Purana checkout — naya nahi hone pe ya property missing pe
    @Bean
    @ConditionalOnProperty(
        name = "features.new-checkout-flow",
        havingValue = "false",
        matchIfMissing = true  // property missing hai toh bhi purana use karo
    )
    public CheckoutService legacyCheckoutService() {
        return new LegacyCheckoutService();
    }

    // AI Recommendations — optional, sirf property true hone pe
    @Bean
    @ConditionalOnProperty(name = "features.ai-recommendations", havingValue = "true")
    public RecommendationEngine aiRecommendations(MLModelClient mlClient) {
        return new AiRecommendationEngine(mlClient);
    }

    // Fraud Detection
    @Bean
    @ConditionalOnProperty(name = "features.fraud-detection", havingValue = "true")
    public FraudDetector fraudDetector(DataSource ds) {
        return new MLFraudDetector(ds);
    }

    // Audit logging
    @Bean
    @ConditionalOnProperty(name = "features.audit-logging", havingValue = "true")
    public AuditLog auditLog(DataSource ds) {
        return new DatabaseAuditLog(ds);
    }
}
```

> [!warning] Optional Injection
> Agar `features.ai-recommendations=false` hai, toh `RecommendationEngine` bean context mein nahi hoga. Koi bhi class jo isse directly `@Autowired` karti hai — woh fail ho jaayegi. Is case mein `Optional<RecommendationEngine>` use karo:
>
> ```java
> @Service
> public class ProductService {
>     
>     private final Optional<RecommendationEngine> recommendationEngine;
>     
>     public ProductService(Optional<RecommendationEngine> recommendationEngine) {
>         this.recommendationEngine = recommendationEngine;
>     }
>     
>     public List<Product> getRecommendations(String userId) {
>         return recommendationEngine
>             .map(engine -> engine.recommend(userId))
>             .orElse(Collections.emptyList()); // feature off hai toh empty list
>     }
> }
> ```

---

## @Profile aur @Conditional Combine Karna

Dono annotations ek saath use kar sakte ho — AND logic lagti hai:

```java
// Sirf tab register hoga jab:
// 1. 'prod' profile active ho AND
// 2. 'kafka.enabled=true' property set ho
@Service
@Profile("prod")
@ConditionalOnProperty(name = "kafka.enabled", havingValue = "true")
public class KafkaOrderPublisher implements OrderPublisher {
    
    private final KafkaTemplate<String, OrderEvent> kafkaTemplate;
    
    public KafkaOrderPublisher(KafkaTemplate<String, OrderEvent> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }
    
    @Override
    public void publish(Order order) {
        OrderEvent event = new OrderEvent(order.getId(), order.getStatus());
        kafkaTemplate.send("order-events", event);
    }
}
```

Staging pe kafka disabled rakh sakte ho even though prod profile hai — flexibility milti hai.

---

## Custom @Conditional — Apni Logic Likho

Kabhi kabhi built-in conditionals kaafi nahi hote. Apna custom condition banao:

```java
// Custom condition — check karo ki production database URL configured hai
public class ProductionDatabaseCondition implements Condition {
    
    @Override
    public boolean matches(ConditionContext context, AnnotatedTypeMetadata metadata) {
        // Environment se property lo
        Environment env = context.getEnvironment();
        String dbUrl = env.getProperty("spring.datasource.url");
        
        // Agar RDS ya Cloud DB URL hai toh production consider karo
        return dbUrl != null && 
               (dbUrl.contains("rds.amazonaws.com") || 
                dbUrl.contains("cloudsql.googleapis.com"));
    }
}

// Custom condition use karo
@Bean
@Conditional(ProductionDatabaseCondition.class)
public DatabaseMigrationRunner migrationRunner(DataSource ds) {
    // Sirf production DB pe migration runner banao
    return new FlywayMigrationRunner(ds);
}
```

Another example — OS-specific beans:

```java
public class OnLinuxCondition implements Condition {
    
    @Override
    public boolean matches(ConditionContext ctx, AnnotatedTypeMetadata md) {
        String osName = System.getProperty("os.name").toLowerCase();
        return osName.contains("linux");
    }
}

@Bean
@Conditional(OnLinuxCondition.class)
public FileWatcher linuxFileWatcher() {
    // Linux ka inotify-based watcher — efficient
    return new InotifyFileWatcher();
}
```

---

## Testing ke Saath Profiles

Yeh ek area hai jahan beginners sabse zyada galti karte hain.

```java
// Test class mein active profile specify karo
@SpringBootTest
@ActiveProfiles("test")
class OrderServiceTest {
    
    @Autowired
    private OrderService orderService;
    
    // Ab 'test' profile active hai — FakeEmailSender inject hoga SesEmailSender nahi
    
    @Test
    void whenOrderPlaced_thenConfirmationEmailSent() {
        // test code...
    }
}
```

```yaml
# application-test.yml — test-specific config
spring:
  datasource:
    url: jdbc:h2:mem:testdb;DB_CLOSE_DELAY=-1  # In-memory H2 database
    driver-class-name: org.h2.Driver
  jpa:
    hibernate:
      ddl-auto: create-drop

# Test mein Kafka disabled rakho
kafka:
  enabled: false

# Feature flags test ke liye
features:
  new-checkout-flow: true
  ai-recommendations: false  # AI ka mock nahi chahiye har test mein
```

---

## Debugging — "Mera Bean Register Kyun Nahi Hua?"

Yeh bahut common frustration hai. Spring Boot Actuator iska solution deta hai:

```yaml
# application.yml mein Actuator enable karo
management:
  endpoints:
    web:
      exposure:
        include: conditions, beans, health
```

Ab yeh endpoint hit karo:
- `GET /actuator/conditions` — har `@Conditional` ka evaluation result dikhata hai
- `GET /actuator/beans` — registered beans ki list

Ya application start hone pe debug logs enable karo:

```bash
java -jar app.jar --debug
```

Yeh `CONDITIONS EVALUATION REPORT` print karega jo batayega ki kaunsa bean kyun match hua ya nahi hua.

---

## Gotchas — Beginners Ki Common Galtiyan

> [!warning] Pitfall #1: matchIfMissing Bhool Gaye
> ```java
> // GALAT — agar property set hi nahi hai, bean nahi banega
> @Bean
> @ConditionalOnProperty(name = "cache.type", havingValue = "memory")
> public CacheManager cache() { return new InMemoryCache(); }
>
> // SAHI — property missing ho tab bhi default memory cache use karo
> @Bean
> @ConditionalOnProperty(name = "cache.type", havingValue = "memory", matchIfMissing = true)
> public CacheManager cache() { return new InMemoryCache(); }
> ```

> [!warning] Pitfall #2: Profile Typo — Silent Failure
> ```java
> @Profile("prd")  // GALAT — "prd" nahi "prod"
> public class RealPaymentService { ... }
> ```
> Koi error nahi aayega — bean bas register nahi hoga. Application start ho jaayegi, aur tum sochte rahoge ki production mein fake service kyun chal rahi hai.

> [!warning] Pitfall #3: Test mein @ActiveProfiles Lagana Bhool Gaye
> ```java
> // GALAT — koi profile nahi, sirf 'default' profile active hai
> @SpringBootTest
> class MyTest { ... }
>
> // SAHI — explicitly test profile activate karo
> @SpringBootTest
> @ActiveProfiles("test")
> class MyTest { ... }
> ```
> Bina `@ActiveProfiles`, `FakeEmailSender` register nahi hoga aur test `SesEmailSender` inject karne ki koshish karega — aur fail ho jaayega.

> [!warning] Pitfall #4: @Profile Stack Nahi Hota
> ```java
> // GALAT — yeh compile hoga lekin kaam nahi karega as expected
> @Profile("dev")
> @Profile("test")  // Yeh previous annotation ko replace karta hai, combine nahi karta
> public class FakeService { ... }
>
> // SAHI — OR expression use karo
> @Profile("dev | test")
> public class FakeService { ... }
> ```

> [!warning] Pitfall #5: Conditional Bean ko Direct Inject Karna
> ```java
> // Agar features.ai-recommendations=false hai, yeh crash karega
> @Service
> public class ProductService {
>     @Autowired
>     private RecommendationEngine engine; // NoSuchBeanDefinitionException!
> }
>
> // SAHI — Optional use karo
> @Service
> public class ProductService {
>     @Autowired(required = false)
>     private RecommendationEngine engine; // null ho sakta hai — null check karo
>     
>     // Ya better:
>     private final Optional<RecommendationEngine> engine;
>     
>     public ProductService(Optional<RecommendationEngine> engine) {
>         this.engine = engine;
>     }
> }
> ```

> [!warning] Pitfall #6: application.yml mein Profile Hardcode Mat Karo (Prod ke liye)
> ```yaml
> # DANGEROUS — prod server pe yeh file commit mat karo with active: prod
> spring:
>   profiles:
>     active: prod
> ```
> Production pe profile environment variable se set karo — CI/CD pipeline mein ya Docker/K8s config mein. Application code mein never hardcode karo.

---

## Real-World Example: Swiggy-Style Notification System

Ek complete example dekhte hain jahan profiles aur conditionals dono use hain:

```java
// Interface — sab implementations isko follow karenge
public interface NotificationService {
    void notifyOrderPlaced(String userId, String orderId);
    void notifyOrderDelivered(String userId, String orderId);
}

// Dev environment — console pe print karo
@Service
@Profile("dev | local")
public class ConsoleNotificationService implements NotificationService {
    
    @Override
    public void notifyOrderPlaced(String userId, String orderId) {
        System.out.printf("[DEV] User %s ka order %s place hua%n", userId, orderId);
    }
    
    @Override
    public void notifyOrderDelivered(String userId, String orderId) {
        System.out.printf("[DEV] User %s ka order %s deliver hua%n", userId, orderId);
    }
}

// Production — real push notification
@Service
@Profile("prod | staging")
public class FirebaseNotificationService implements NotificationService {
    
    private final FirebaseMessaging firebase;
    
    public FirebaseNotificationService(FirebaseMessaging firebase) {
        this.firebase = firebase;
    }
    
    @Override
    public void notifyOrderPlaced(String userId, String orderId) {
        Message message = Message.builder()
            .putData("type", "ORDER_PLACED")
            .putData("orderId", orderId)
            .setToken(getUserFcmToken(userId))
            .build();
        firebase.send(message);
    }
    
    @Override
    public void notifyOrderDelivered(String userId, String orderId) {
        // similar implementation
    }
    
    private String getUserFcmToken(String userId) {
        // DB se FCM token fetch karo
        return "user-fcm-token";
    }
}

// Optional SMS notifications — sirf tab jab explicitly enabled ho
@Configuration
public class SmsConfig {
    
    @Bean
    @ConditionalOnProperty(name = "notifications.sms.enabled", havingValue = "true")
    public SmsNotifier twilioSmsNotifier(
            @Value("${twilio.account-sid}") String accountSid,
            @Value("${twilio.auth-token}") String authToken) {
        return new TwilioSmsNotifier(accountSid, authToken);
    }
}

// OrderService — notifications ka use karo
@Service
public class OrderService {
    
    private final NotificationService notificationService;
    private final Optional<SmsNotifier> smsNotifier; // optional hai
    
    public OrderService(
            NotificationService notificationService,
            Optional<SmsNotifier> smsNotifier) {
        this.notificationService = notificationService;
        this.smsNotifier = smsNotifier;
    }
    
    public Order placeOrder(String userId, OrderRequest request) {
        Order order = createOrder(request);
        
        // Push notification (hamesha)
        notificationService.notifyOrderPlaced(userId, order.getId());
        
        // SMS notification (sirf agar enabled ho)
        smsNotifier.ifPresent(sms -> 
            sms.send(getUserPhone(userId), "Aapka order place ho gaya! Order ID: " + order.getId())
        );
        
        return order;
    }
    
    private Order createOrder(OrderRequest request) {
        // order creation logic
        return new Order();
    }
    
    private String getUserPhone(String userId) {
        return "+91-99999-99999";
    }
}
```

---

## Key Takeaways

- **`@Profile`** poore beans ko environment ke hisaab se on/off karta hai — dev, prod, test, staging, etc.

- **Profile expressions** powerful hain: `"dev | test"` (OR), `"!prod"` (NOT), `"prod & kafka-enabled"` (AND).

- **Profile-specific property files** automatically load hote hain: `application-dev.yml`, `application-prod.yml` — common config `application.yml` mein rakho, environment-specific cheez alag file mein.

- **`@ConditionalOnProperty`** property value ke basis pe beans register karta hai — feature flags implement karne ka best tarika.

- **`matchIfMissing = true`** lagana mat bhulo jab tum default behavior chahte ho (property absent hone pe bhi bean bane).

- **`@ConditionalOnMissingBean`** "user override" pattern hai — Spring Boot ke saare auto-configurations iska use karte hain. Tum apna bean banao, default automatically skip ho jaata hai.

- **Optional injection** use karo conditional beans ke liye — `Optional<SomeBean>` ya `@Autowired(required = false)` — directly inject karne pe `NoSuchBeanDefinitionException` aayega agar bean registered nahi hai.

- **Testing mein `@ActiveProfiles("test")`** hamesha lagao — bina iske "default" profile active hota hai aur tumhare fake/mock beans register nahi honge.

- **Profile typos silent hote hain** — `"prd"` vs `"prod"` — koi error nahi, bas bean register nahi hoga. Actuator ka `/actuator/conditions` endpoint use karo debugging ke liye.

- **`@Profile` stack nahi hota** — ek class pe do `@Profile` lagane se second wala first ko override karta hai. OR ke liye `"dev | test"` use karo.

- **Production pe profile environment variable se set karo** — `SPRING_PROFILES_ACTIVE=prod` — application.yml mein hardcode mat karo.
