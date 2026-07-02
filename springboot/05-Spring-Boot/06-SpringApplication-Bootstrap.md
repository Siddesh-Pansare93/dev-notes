# SpringApplication aur Bootstrap — App Kaise Shuru Hoti Hai

Socho Zomato ka pura backend ek din subah 6 baje restart hota hai. Kitne services honge? Kitna kuch initialize hoga? Database connections, caches, scheduled jobs, health checks — sab kuch ek sequence mein ready hona chahiye tab jaake pehla order accept ho. Spring Boot ka bootstrap mechanism exactly yahi karta hai — aur is file mein hum samjhenge ki woh **kaise** karta hai, **kyun** karta hai, aur tum usse **apne hisaab se** kaise configure kar sakte ho.

> [!info] Node.js/Express walon ke liye quick context
> Express mein tumhara entry point hota hai `index.ts` ya `server.ts` jisme `app.listen(3000)` hota hai. Spring Boot mein entry point hota hai `main()` method jisme `SpringApplication.run(...)` hota hai. Difference sirf itna nahi hai — `run()` call sirf server start nahi karta. Woh **pura application context banata hai**, auto-configuration run karta hai, beans inject karta hai, database pool banata hai — aur jab sab kuch ready ho jaata hai **tab** embedded Tomcat server shuru hota hai. Ek line, hazaar kaam.

---

## The Classic Main Class — Shuruwaat Yahan Se Hoti Hai

Ye hai ek standard Spring Boot app ka entry point:

```java
package com.example.app;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

// @SpringBootApplication — ye ek powerful annotation hai
// teen alag annotations ka combo hai (neeche detail mein samjhenge)
@SpringBootApplication
public class App {

    public static void main(String[] args) {
        // Bas yahi ek line — aur poora application chal jaata hai
        // args woh command-line arguments hain jo tum pass karte ho:
        // java -jar app.jar --server.port=8080 --spring.profiles.active=prod
        SpringApplication.run(App.class, args);
    }
}
```

Sirf itna. Ek class, ek annotation, ek method call. Lekin is ek call ke andar jo hota hai woh bahut kuch hai.

---

## Boot Sequence — Ek Order ka Safar Jaise IRCTC Ticket Booking

Jab `SpringApplication.run(App.class, args)` execute hota hai, Spring Boot internally ek fixed sequence follow karta hai. Samajhlo jaise IRCTC pe ticket book karte waqt steps hote hain — pehle login, phir train search, phir seat selection, phir payment. Ek step skip hua toh booking fail. Bootstrap bhi aise hi kaam karta hai:

**Step 1: Banner print karta hai**
Woh ASCII art jo tumne terminal mein dekha hoga — `Spring Boot :: (v3.x.x)`. Ye sirf dikhaawa hai, koi kaam nahi karta. Disable bhi kar sakte ho.

**Step 2: ApplicationContext create karta hai**
Ye Spring ka core container hai. Samajhlo ek bada warehouse jisme saare beans (objects) stored hain. Context ke bina kuch bhi nahi hoga.

**Step 3: `application.yml` / `application.properties` load karta hai**
Ye tumhari app ki settings hain — database URL, port number, secret keys, etc.

**Step 4: Profiles activate karta hai**
`dev` profile alag settings, `prod` profile alag. Jaise Swiggy ka staging environment alag hota hai aur production alag.

**Step 5: Auto-Configuration run karta hai**
Ye Spring Boot ka jaadu hai — automatically detect karta hai ki tumne kya dependency add ki hai aur ussi ke hisaab se beans configure karta hai. H2 database jar hai? In-memory DB ready. Jackson hai? JSON serialization ready.

**Step 6: Component Scanning**
Tumhari package aur sub-packages mein `@Component`, `@Service`, `@Repository`, `@Controller` annotations dhundta hai aur unhe beans bana deta hai.

**Step 7: Beans instantiate aur inject karta hai**
Sabhi beans banata hai, unke dependencies inject karta hai (constructor injection, field injection, etc.).

**Step 8: Embedded Server start karta hai (agar web app hai)**
Tomcat (default) ya Jetty ya Undertow — jo bhi tumne configure kiya hai. Default port 8080.

**Step 9: ApplicationRunner aur CommandLineRunner beans run karta hai**
Ye woh code hai jo app fully ready hone ke baad ek baar run hota hai — jaise startup pe cache warm up karna ya DB migration check karna.

**Step 10: Shutdown signal ka wait karta hai**
App block ho jaati hai, aur har incoming request handle karna shuru kar deti hai.

> [!tip] Node.js se comparison
> Node mein `app.listen()` ke baad seedha requests aane lagte hain. Spring Boot mein pehle **sab kuch ready** hota hai, phir traffic accept hoti hai. Iska fayda? Agar koi bean fail ho gayi initialization mein, app start hi nahi hogi — production pe half-broken state mein nahi jayegi. Fail fast principle.

---

## @SpringBootApplication — Teen Annotations Ka Combo Pack

Ye annotation actually ek meta-annotation hai — teen alag annotations ko wrap karta hai:

```java
// @SpringBootApplication internally yahi hai:

@SpringBootConfiguration       // = @Configuration, ye class ek config class hai
@EnableAutoConfiguration       // auto-config on karo
@ComponentScan                 // is package aur sub-packages scan karo
public @interface SpringBootApplication {
    // ...
}
```

Iska matlab ye hai ki jab tum `@SpringBootApplication` likhte ho, tumne teen cheezein ek saath kar di:

**1. `@SpringBootConfiguration` (extends `@Configuration`)**
Is class ko Spring ek configuration source maanta hai. Iska matlab hai tum isme `@Bean` methods define kar sakte ho.

```java
@SpringBootApplication
public class App {

    public static void main(String[] args) {
        SpringApplication.run(App.class, args);
    }

    // Ye perfectly valid hai — App class mein directly beans define kar sakte ho
    @Bean
    public ObjectMapper customObjectMapper() {
        return new ObjectMapper()
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
    }
}
```

**2. `@EnableAutoConfiguration`**
Spring Boot ka sabse powerful feature. Classpath scan karta hai aur automatically beans configure karta hai. Tumne `spring-boot-starter-data-jpa` add kiya? Automatically `EntityManagerFactory`, `TransactionManager` sab ban jaata hai.

**3. `@ComponentScan`**
By default, **App class jis package mein hai us package aur uske saare sub-packages** ko scan karta hai.

```
com.example.app/
├── App.java                    ← @SpringBootApplication yahan hai
├── controller/
│   └── OrderController.java    ← SCAN HOGA ✓
├── service/
│   └── OrderService.java       ← SCAN HOGA ✓
└── repository/
    └── OrderRepository.java    ← SCAN HOGA ✓

com.example.utils/              ← SCAN NAHI HOGA ✗ (sibling package)
```

> [!warning] Sabse common mistake — Main class ka location
> App class ko **root package** mein rakho hamesha. Agar `com.example.app.main.App` rakha aur tumhari services `com.example.app.service` mein hain, toh component scan fail ho sakta hai ya kuch beans miss ho sakti hain. Rule of thumb: Main class ka package wo highest-level package hona chahiye jo tumhari codebase mein hai.

Long form (rarely use karte hain, but samajhna zaroori hai):

```java
// @SpringBootApplication ki jagah teen alag annotations
// Kabhi kabhi specific customization ke liye ye approach use hoti hai
@Configuration
@EnableAutoConfiguration
@ComponentScan(basePackages = "com.example.app")  // explicitly specify kar sakte ho
public class App {
    public static void main(String[] args) {
        SpringApplication.run(App.class, args);
    }
}
```

---

## Customizing the Bootstrap — Zyada Control Chahiye Toh

Mostly `SpringApplication.run(App.class, args)` kaafi hai. Lekin kabhi kabhi — especially large enterprise apps ya specific testing scenarios mein — tumhe zyada control chahiye. Do tarike hain:

### Tarika 1: SpringApplicationBuilder (Fluent API)

```java
public static void main(String[] args) {
    new SpringApplicationBuilder(App.class)
        .profiles("dev")                           // profile activate karo
        .bannerMode(Banner.Mode.OFF)               // banner band karo
        .properties("server.port=9000")            // property override karo
        .listeners(new MyStartupListener())        // custom listener add karo
        .web(WebApplicationType.SERVLET)           // web type force karo
        .run(args);
}
```

Builder pattern hai ye — ek ke baad ek methods chain karte jao. Node mein jaise tum express middleware chain karte ho `app.use().use().use()`, waisa hi.

### Tarika 2: SpringApplication Object Directly

```java
public static void main(String[] args) {
    SpringApplication app = new SpringApplication(App.class);
    app.setAdditionalProfiles("dev");              // extra profiles add karo
    app.setLogStartupInfo(false);                  // startup logs band karo
    app.setBannerMode(Banner.Mode.CONSOLE);        // banner console pe show karo
    app.addListeners(new ApplicationPidFileWriter()); // PID file likhega
    app.run(args);
}
```

Ye approach tab useful hai jab conditionally kuch set karna ho — if-else logic easily likh sakte ho.

---

## Application Arguments — Command Line Se Data Lena

Jab tum app run karte ho:

```bash
java -jar app.jar --server.port=9000 --debug input.txt
```

To `args` array mein ye sab aata hai. Spring Boot is string array ko parse karta hai aur properly type-safe `ApplicationArguments` object mein convert karta hai.

### ApplicationArguments use karna

```java
@Component
public class StartupReader implements CommandLineRunner {

    // ApplicationArguments inject kar sakte ho directly
    private final ApplicationArguments args;

    public StartupReader(ApplicationArguments args) {
        this.args = args;
    }

    @Override
    public void run(String... raw) {
        // --debug flag hai ya nahi check karo
        boolean debugMode = args.containsOption("debug");

        // --server.port=9000 ki value lo
        List<String> ports = args.getOptionValues("server.port");  // ["9000"]

        // non-option args (bina -- ke) — jaise "input.txt"
        List<String> files = args.getNonOptionArgs();  // ["input.txt"]

        System.out.println("Debug mode: " + debugMode);
        System.out.println("Port: " + ports);
        System.out.println("Files to process: " + files);
    }
}
```

### Simple CommandLineRunner (Raw Args)

Agar itna complexity nahi chahiye, simple version:

```java
@Component
public class Bootstrap implements CommandLineRunner {

    @Override
    public void run(String... args) throws Exception {
        // args wahi raw strings hain jo command line pe diye
        System.out.println("App started with args: " + Arrays.toString(args));

        // Ye tab useful hai jab startup pe kuch data load karna ho
        // Jaise Swiggy ke restaurant catalog ka initial cache load
    }
}
```

> [!tip] Runner beans ka ordering
> Agar multiple `CommandLineRunner` ya `ApplicationRunner` beans hain, unka execution order `@Order` annotation se control hota hai:
> ```java
> @Component
> @Order(1)  // ye pehle chalega
> public class DatabaseMigrationRunner implements CommandLineRunner { ... }
>
> @Component
> @Order(2)  // ye baad mein chalega
> public class CacheWarmupRunner implements CommandLineRunner { ... }
> ```
> Important: Ye runners **context fully ready hone ke baad** chalte hain lekin **traffic accept karne se pehle**. Isliye startup tasks ke liye perfect hain.

### ApplicationRunner vs CommandLineRunner — Kya Fark Hai?

```java
// CommandLineRunner — raw String[] milta hai
@Component
public class MyRunner implements CommandLineRunner {
    @Override
    public void run(String... args) {
        // args = ["--server.port=9000", "--debug", "input.txt"]
        // Manually parse karna padega
    }
}

// ApplicationRunner — parsed ApplicationArguments milta hai
@Component
public class MyRunner implements ApplicationRunner {
    @Override
    public void run(ApplicationArguments args) {
        // Options aur non-options already separated hain
        // Zyada convenient hai
    }
}
```

Generally `ApplicationRunner` prefer karo — better API hai.

---

## The Banner — Woh ASCII Art

Jab app start hota hai terminal pe kuch aisa dikhta hai:

```
  .   ____          _            __ _ _
 /\\ / ___'_ __ _ _(_)_ __  __ _ \ \ \ \
( ( )\___ | '_ | '_| | '_ \/ _` | \ \ \ \
 \\/  ___)| |_)| | | | | || (_| |  ) ) ) )
  '  |____| .__|_| |_|_| |_\__, | / / / /
 =========|_|==============|___/=/_/_/_/
 :: Spring Boot ::               (v3.2.0)
```

Ye customize kar sakte ho. `src/main/resources/banner.txt` file banao:

```
   ___          _
  / _ \ _ __ __| | ___ _ __
 | | | | '__/ _` |/ _ \ '__|
 | |_| | | | (_| |  __/ |
  \___/|_|  \__,_|\___|_|  Service

 :: ${spring.application.name} ::
 :: Version: ${app.version:dev} ::
 :: Profile(s): ${spring.profiles.active:default} ::
```

Variables use kar sakte ho banner mein — `${spring.application.name}` automatically replace hoga.

Disable karna hai toh:

```yaml
spring:
  main:
    banner-mode: off   # off, console, ya log
```

Ya programmatically:

```java
new SpringApplicationBuilder(App.class)
    .bannerMode(Banner.Mode.OFF)
    .run(args);
```

---

## Web vs Non-Web vs Reactive — Kaunsa Mode Chahiye?

Spring Boot auto-detect karta hai ki tumhara app web hai ya nahi, based on classpath:

| WebApplicationType | Kab activate hota hai |
|---|---|
| `SERVLET` | `spring-webmvc` classpath pe hai (default `starter-web` se) |
| `REACTIVE` | `spring-webflux` classpath pe hai, `webmvc` nahi |
| `NONE` | Dono mein se koi nahi — runs and exits |

Force karna ho:

```java
// CLI tool ya batch job ke liye — koi web server nahi chahiye
new SpringApplicationBuilder(App.class)
    .web(WebApplicationType.NONE)
    .run(args);
```

`NONE` mode mein app start hoga, `CommandLineRunner` beans chalenge, aur jab sab kaam khatam ho jayega, JVM exit kar lega. No blocked thread, no embedded server. Bilkul Node.js script ki tarah.

---

## ApplicationContext Events — App ke Life Events Pe Hook Karna

Spring Boot bootstrap ke dauran kai events fire hote hain. Tum in events ko sun sakte ho:

```java
@Component
public class AppStartupListener implements ApplicationListener<ApplicationReadyEvent> {

    @Override
    public void onApplicationEvent(ApplicationReadyEvent event) {
        // Ye tab fire hota hai jab app fully ready ho aur traffic accept karne laga ho
        System.out.println("App is ready! Swiggy Order Service is live.");

        // Yahan typically: health check ping, startup notification, metrics register
    }
}
```

Important events:

```
ApplicationStartingEvent     → run() call hote hi, kuch bhi hone se pehle
ApplicationEnvironmentPreparedEvent → environment ready, context nahi bana abhi
ApplicationContextInitializedEvent  → context bana but beans load nahi hue
ApplicationPreparedEvent     → beans load ho gaye, refresh nahi hua
ApplicationStartedEvent      → context refresh ho gaya, runners nahi chale
ApplicationReadyEvent        → sab kuch ready — TRAFFIC ACCEPT KARNA SHURU
ApplicationFailedEvent       → kuch gadbad ho gayi startup mein
```

> [!info] Node.js se comparison
> Node mein tum `server.on('listening', callback)` karte ho. Spring mein `ApplicationReadyEvent` exactly wahi hai — iske baad hi samjho app truly "up" hai.

---

## Graceful Shutdown — Zomato Orders Drop Mat Karo

Jab server restart karte ho ya deploy karte ho, in-flight requests ko drop karna achha nahi. Koi Zomato pe order place kar raha tha aur server restart ho gaya? Khana toh gaya, user bhi gayal. Graceful shutdown iska solution hai:

```yaml
server:
  shutdown: graceful   # "immediate" (default) ya "graceful"

spring:
  lifecycle:
    timeout-per-shutdown-phase: 30s   # 30 seconds wait karo in-flight requests ke liye
```

Graceful shutdown ka matlab:
1. Naye connections reject ho jaate hain (`503 Service Unavailable`)
2. In-flight requests complete hone ka wait karo (up to 30s in this case)
3. Phir context close hota hai
4. Beans ka `@PreDestroy` chalega
5. JVM exit

Spring Boot automatically JVM shutdown hook register karta hai. `Ctrl+C` ya `kill -TERM` pe graceful shutdown trigger hoga.

```java
// Bean jo shutdown pe cleanup karta hai
@Component
public class DatabaseConnectionPool {

    @PreDestroy  // Jab bean destroy ho (shutdown pe) tab chalega
    public void cleanup() {
        System.out.println("Closing DB connections gracefully...");
        // connection pool close karo
    }
}
```

---

## Practical Example — CLI Tool Jo Spring Use Karta Hai

Kabhi kabhi tumhe ek script-style tool chahiye hota hai — web server nahi, sirf koi kaam karo aur exit karo. Jaise Flipkart ke liye daily CSV import tool:

```java
@SpringBootApplication
public class CsvImportTool implements CommandLineRunner {

    // Spring DI kaam karta hai yahan bhi — repository inject ho sakti hai
    private final ProductRepository productRepo;
    private final CategoryService categoryService;

    // Constructor injection — recommended approach
    public CsvImportTool(ProductRepository productRepo, CategoryService categoryService) {
        this.productRepo = productRepo;
        this.categoryService = categoryService;
    }

    public static void main(String[] args) {
        new SpringApplicationBuilder(CsvImportTool.class)
            .web(WebApplicationType.NONE)  // web server nahi chahiye
            .run(args);
        // run() complete hone ke baad JVM exit kar lega
    }

    @Override
    public void run(String... args) throws Exception {
        // args[0] = CSV file path
        if (args.length < 1) {
            System.err.println("Usage: java -jar import-tool.jar <products.csv>");
            System.exit(1);
        }

        String csvPath = args[0];
        System.out.println("Importing from: " + csvPath);

        try (var lines = Files.lines(Path.of(csvPath))) {
            lines
                .skip(1)                          // header row skip karo
                .map(this::parseCsvLine)          // CSV line → Product object
                .peek(p -> categoryService.ensureCategoryExists(p.getCategory()))
                .forEach(productRepo::save);      // DB mein save karo
        }

        System.out.println("Import complete!");
        // Method return hoga → CommandLineRunner done → JVM exits
    }

    private Product parseCsvLine(String line) {
        String[] parts = line.split(",");
        Product p = new Product();
        p.setName(parts[0].trim());
        p.setPrice(Double.parseDouble(parts[1].trim()));
        p.setCategory(parts[2].trim());
        return p;
    }
}
```

Ye approach ka fayda: Full Spring DI + JPA + transactions available hain, lekin koi HTTP server nahi. Batch jobs, data migration scripts, one-off utilities — sab ke liye perfect.

---

## Startup Performance — App Slow Start Ho Rahi Hai Toh

Large apps mein startup time badhta jaata hai. Common culprits:

**1. @PostConstruct mein heavy I/O**
```java
// GALAT — startup slow kar deta hai
@PostConstruct
public void init() {
    // Kisi API ko hit karna startup pe — BAD IDEA
    this.externalData = restTemplate.getForObject("https://api.partner.com/data", Data.class);
}

// SAHI — lazy load karo
// Ya ApplicationReadyEvent pe karo
// Ya background thread mein karo
```

**2. Startup analysis karna**

```bash
# Startup metrics enable karo
java -jar app.jar --spring.context.applicationStartup=buffering

# Ya application.properties mein
spring.context.application-startup=buffering
```

Phir Spring Actuator ke `/actuator/startup` endpoint se dekho kaunsa bean zyada time le raha hai.

**3. Lazy initialization**

Agar tumhare beans startup pe use nahi hote, unhe lazy load karo:

```yaml
spring:
  main:
    lazy-initialization: true   # sab beans lazy by default
```

Ya specific bean:
```java
@Bean
@Lazy  // Pehli baar use hone pe hi create hoga
public ExpensiveService expensiveService() {
    return new ExpensiveService();
}
```

> [!warning] Lazy initialization ka gotcha
> Lazy beans ke errors pehli request pe aate hain, startup pe nahi. Production mein iska matlab ek user ko error milega instead of startup fail hone ke. Sochke use karo.

---

## Common Gotchas — Beginners Se Galtiyan

> [!warning] Ye mistakes mat karna

**Gotcha 1: Main class ko default package mein rakha**
```java
// GALAT — koi package nahi
public class App {  // Component scan fail hoga silently
    ...
}

// SAHI
package com.example.myapp;
public class App {
    ...
}
```

**Gotcha 2: Do `@SpringBootApplication` annotations**
```java
// Kabhi mat karo ye — unpredictable behavior
@SpringBootApplication
public class App { ... }

@SpringBootApplication  // DUPLICATE — conflict hoga
public class AnotherConfig { ... }
```

**Gotcha 3: CLI app mein JVM exit nahi karta**
```java
// WebApplicationType.NONE ke bina — Tomcat run hota rahega
// JVM exit nahi karega even after run() completes
public static void main(String[] args) {
    SpringApplication.run(ImportTool.class, args);  // PROBLEM — web type SERVLET hai
}

// FIX
public static void main(String[] args) {
    new SpringApplicationBuilder(ImportTool.class)
        .web(WebApplicationType.NONE)  // Ye zaroori hai CLI apps ke liye
        .run(args);
}
```

**Gotcha 4: Main class ko wrong package mein rakha**
```
com.example.app/
├── config/
│   └── App.java   ← @SpringBootApplication YAHAN rakha (WRONG!)
├── service/
│   └── OrderService.java   ← SCAN NAHI HOGA!

# FIX: App.java ko com.example.app/ mein directly rakho
com.example.app/
├── App.java   ← SAHI JAGAH
├── config/
├── service/
```

**Gotcha 5: Long startup time ka reason samajhna**
Agar app bahut slow start ho rahi hai, check karo:
- `@PostConstruct` mein network calls toh nahi ho rahi
- Too many auto-configuration classes load toh nahi ho rahe (use `--debug` flag to see)
- Bean creation mein circular dependencies toh nahi hain

```bash
# Auto-configuration report dekhne ke liye
java -jar app.jar --debug 2>&1 | grep "AUTO-CONFIGURATION"

# Ya verbose startup info
java -jar app.jar --spring.main.log-startup-info=true
```

**Gotcha 6: Test context reuse nahi ho raha**
Multiple test classes same `@SpringBootApplication` se context load kar rahi hain? Har test class alag context banana expensive hai. Spring test caching ka use karo — same configuration ke saath same context reuse hota hai.

---

## Key Takeaways

- `SpringApplication.run(App.class, args)` sirf ek line hai lekin 10-step process trigger karta hai — context banata hai, auto-config chalata hai, beans inject karta hai, server start karta hai
- `@SpringBootApplication` teen annotations ka shorthand hai: `@SpringBootConfiguration` + `@EnableAutoConfiguration` + `@ComponentScan`
- Main class hamesha **root package** mein rakho — component scan wahan se shuru hoti hai
- `SpringApplicationBuilder` use karo jab bootstrap customize karna ho — profiles, banner, web type, listeners sab set kar sakte ho
- `CommandLineRunner` aur `ApplicationRunner` beans startup-time tasks ke liye hain — context ready hone ke baad, traffic se pehle chalte hain
- `WebApplicationType.NONE` set karo CLI/batch apps mein — tabhi `run()` complete hone pe JVM properly exit karega
- Graceful shutdown ke liye `server.shutdown: graceful` configure karo — production mein in-flight requests drop nahi honge
- `@PreDestroy` ya `DisposableBean` use karo cleanup ke liye — shutdown pe automatically call hoga
- Startup slow ho toh `@PostConstruct` mein heavy I/O mat karo — `ApplicationReadyEvent` ya lazy initialization prefer karo
