# What is Spring Boot?

Socho ek second ke liye — tum Node.js mein kaam karte ho. Ek naya Express server banana hai. Kya karte ho?

```bash
npm install express
```

Aur phir ek `index.ts` likhte ho, aur server chal jaata hai. Simple hai. Ab agar main tumhe boluun ki Java mein bhi same kaam karo — "Ek REST API banao jo port 8080 pe chale" — toh bina Spring Boot ke, Plain Spring se, kya karna padega?

- `web.xml` configure karo
- ApplicationContext manually setup karo
- Tomcat server alag se install karo aur deploy karo
- WAR file banao, server pe dalo
- Jackson (JSON library) manually wire karo
- Logging configure karo
- Error handling setup karo

Bahut zyada kaam, hai na? Yahi problem thi Java enterprise development mein. Aur **Spring Boot** isi problem ka solution hai.

> [!info] Node.js wale ke liye simple analogy
> Plain Spring = Express bina kisi default ke. Tumhe khud hi HTTP server attach karna padega, JSON parser lagana padega, error handlers likhne padenge, DB pool configure karna padega — sab kuch manually.
> **Spring Boot** = `create-next-app` jo React ke liye hai, waisa hi Spring Boot Spring ke liye hai. Ek **opinionated wrapper** jo reasonable defaults pick karta hai, server embed karta hai, aur tumhe `mvn spring-boot:run` se seedha running web app deta hai — seconds mein.

---

## Spring aur Spring Boot mein kya farak hai?

Imagine karo — Zomato app banana hai. Tum chef ho. Plain Spring mein kaam karna matlab — khud hi restaurant dhundho, khud hi kitchen setup karo, khud hi plates kharido, phir khana banao. Spring Boot mein kaam karna matlab — Zomato pe list ho jao, aur sirf khana banane pe focus karo — baaki sab Zomato handle karega.

| Kya cheez | Plain Spring | Spring Boot |
|---|---|---|
| HTTP server | Khud Tomcat/Jetty install karo aur WAR deploy karo | Tomcat already andar embedded hai |
| Configuration | XML ya badi `@Configuration` files likhni padti thi | Auto-config + simple `application.yml` |
| Dependencies | Har Spring module ka version manually pick karo | Starters compatible versions ka bundle dete hain |
| JSON (Jackson) | Manually configure karo | Automatically wire ho jaata hai |
| Health/metrics | Khud banao | `spring-boot-starter-actuator` se milta hai |
| Run karna | `mvn package` → WAR file → server deploy | `mvn spring-boot:run` ya `java -jar app.jar` |
| Bootstrap | Manual `ApplicationContext` setup | `@SpringBootApplication` + `main()` — bas itna kaafi |

> [!note] Spring Boot koi alag cheez nahi hai
> Spring Boot koi fork ya replacement nahi hai Spring ka. Yeh hai: Spring + auto-configuration + sensible defaults + executable-JAR build plugin. Saare Spring concepts — IoC, Beans, AOP — sab waise hi kaam karte hain. Spring Boot sirf un cheezein ko automate karta hai jo boring aur repetitive thi.

---

## Spring Boot ke Chaar Superpowers

Yeh Spring Boot ke woh chaar features hain jo isko itna powerful banate hain. Har ek ko samjho.

### 1. Auto-Configuration — "Main Samajh Jaata Hoon"

Auto-configuration Spring Boot ki sabse badi jaadugarni hai.

Basically kya hota hai: Spring Boot dekhta hai ki tumhare classpath (project ke dependencies) mein kya-kya libraries hain, aur automatically unhe configure kar deta hai — tum bole bina.

- H2 database (in-memory DB) dependency add ki? Spring Boot automatically ek `DataSource` bean bana dega aur use configure karega.
- Jackson (JSON library) classpath pe hai? Automatically `ObjectMapper` configure ho jaayega.
- Spring Data JPA dependency hai? Automatically JPA repositories setup ho jaayenge.

Yeh exactly waisa hi hai jaisa Swiggy delivery partner ko pata hota hai ki order kahan deliver karna hai — tum baar baar nahi bolte, woh khud samajh leta hai context se.

```java
// Tum bas yeh likhte ho:
@SpringBootApplication
public class App {
    public static void main(String[] args) {
        SpringApplication.run(App.class, args);
    }
}

// Spring Boot peeche se yeh sab kar deta hai automatically:
// ✅ Tomcat server start
// ✅ Jackson JSON configure
// ✅ Error pages setup
// ✅ Logging configure
// ✅ application.properties/yml load
// ✅ DataSource configure (agar DB dependency hai toh)
```

### 2. Starters — "Ek Dependency, Poora Setup"

Starters Spring Boot ke "combo meals" hain — jaise Zomato pe "Thali" order karo, sabzi, dal, roti, chawal sab aata hai.

`spring-boot-starter-web` ek dependency add karo, aur tum paaoge:
- Spring MVC (web framework)
- Embedded Tomcat (server)
- Jackson (JSON)
- Validation
- Sab version-compatible

```xml
<!-- Sirf yeh ek dependency — aur poora web setup ready -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>
```

Node.js mein compare karo:
```bash
# Node.js mein tum yeh sab alag-alag install karte ho:
npm install express
npm install body-parser
npm install morgan
npm install helmet
npm install pino
npm install dotenv
# ... aur phir sab manually wire karte ho
```

Vs Spring Boot mein sirf ek starter — aur sab ready.

Popular starters:
| Starter | Kya milta hai |
|---|---|
| `spring-boot-starter-web` | REST APIs, MVC, Tomcat, Jackson |
| `spring-boot-starter-data-jpa` | JPA, Hibernate, Database access |
| `spring-boot-starter-security` | Authentication, Authorization |
| `spring-boot-starter-test` | JUnit, Mockito, testing tools |
| `spring-boot-starter-actuator` | Health checks, metrics, monitoring |
| `spring-boot-starter-validation` | Bean validation (@NotNull, @Email, etc.) |

### 3. Embedded Server — "JAR File = Poora App"

Yeh concept Node.js walon ko naturally samajh aayega. Node.js mein jab tum `node app.js` karte ho, server already andar hota hai — Express server port pe listen karta hai. Koi external Nginx ya Apache ki zaroorat nahi basic setup ke liye.

Spring Boot bhi same kaam karta hai. Traditionally Java mein:
1. WAR file banao
2. Tomcat/JBoss/WebLogic server alag se install karo
3. WAR file ko server mein deploy karo
4. Server start karo

Spring Boot mein:
```bash
# Bas itna:
java -jar myapp.jar
# Server chal gaya! Tomcat already app ke andar hai.
```

Fat JAR (Uber JAR) concept — tumhara poora application — Tomcat server, saare dependencies, tumhara code — sab kuch ek single `.jar` file mein packed hota hai. Yahi cheez deployment itni aasaan banati hai. AWS pe deploy karo, Docker mein daalo, kuch bhi karo — bas ek file.

### 4. Production-Ready Out of the Box

Spring Boot ka `actuator` starter add karo aur tumhe milta hai:

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```

- `/actuator/health` — app healthy hai ya nahi
- `/actuator/metrics` — performance metrics
- `/actuator/info` — app information
- `/actuator/env` — environment variables
- Aur kaafi kuch

Yeh features production mein bahut kaam aate hain — DevOps team ko pata chalta hai ki app theek se chal raha hai ya nahi.

---

## "Opinionated Defaults" ka Matlab Kya Hai?

"Opinionated" ka matlab — Spring Boot ne kuch decisions pehle se le liye hain tumhare liye. Jaise ek accha senior developer bolega "yaar, logging ke liye Logback use karo, JSON ke liye Jackson, server ke liye Tomcat" — Spring Boot ne yahi decisions pehle se le liye hain.

Aur agar tumhe Spring Boot ki choice pasand nahi? Koi baat nahi — override karo.

> [!tip] Convention over Configuration
> Spring Boot ka auto-config `@ConditionalOnMissingBean` pattern follow karta hai — matlab, woh default **sirf tab dega jab tumne khud kuch provide nahi kiya**. Tumne apna `ObjectMapper` `@Bean` define kiya? Spring Boot ka default Jackson config hataa deta hai. Tumhara bean priority pe aata hai.

Example — custom ObjectMapper banana:
```java
@Configuration
public class JacksonConfig {
    
    @Bean
    public ObjectMapper objectMapper() {
        // Tum apna custom ObjectMapper define karo
        // Spring Boot ka default ab nahi lagega
        ObjectMapper mapper = new ObjectMapper();
        mapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
        mapper.setSerializationInclusion(JsonInclude.Include.NON_NULL);
        return mapper;
    }
}
```

---

## Versions — 2.x vs 3.x

Yeh important hai jaanna — kyunki internet pe kaafi purane tutorials hain aur confuse kar sakte hain.

| Cheez | Spring Boot 2.x | Spring Boot 3.x |
|---|---|---|
| Java version | 8 aur 11 support karta tha | **Java 17+ mandatory** |
| Namespace | `javax.*` (purana) | **`jakarta.*`** (naya) |
| Status | End-of-life ho gaya | Current, actively maintained |

Agar tum koi tutorial dekh rahe ho aur usme `javax.persistence.Entity` dikh raha hai — woh purana Spring Boot 2.x wala tutorial hai. Spring Boot 3.x mein yeh `jakarta.persistence.Entity` hoga.

**Hamesha Spring Boot 3.x use karo. Yeh notes 3.x assume karte hain.**

---

## Pehla Working App — Step by Step

Chalo ek complete minimal Spring Boot app banate hain. Isse dekho — kitna kam code hai.

### pom.xml

```xml
<project>
    <modelVersion>4.0.0</modelVersion>
    
    <!-- Spring Boot parent — yeh sab dependency versions manage karta hai -->
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.3.0</version>
    </parent>
    
    <groupId>com.example</groupId>
    <artifactId>demo</artifactId>
    <version>0.0.1</version>

    <dependencies>
        <!-- Yeh ek dependency = web server + JSON + MVC sab ready -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <!-- Yeh plugin fat JAR banata hai — zaruri hai java -jar ke liye -->
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
        </plugins>
    </build>
</project>
```

### Main Application Class

`src/main/java/com/example/demo/DemoApplication.java`:

```java
package com.example.demo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.*;

// @SpringBootApplication = @Configuration + @EnableAutoConfiguration + @ComponentScan
// Teen annotations ka kaam ek annotation mein
@SpringBootApplication
public class DemoApplication {
    
    public static void main(String[] args) {
        // Yeh line poora Spring application start karta hai
        // ApplicationContext banata hai, saare beans initialize karta hai,
        // Tomcat start karta hai — sab kuch
        SpringApplication.run(DemoApplication.class, args);
    }
}

// @RestController = @Controller + @ResponseBody
// Matlab — yeh class HTTP requests handle karegi
// aur return value directly response body mein jaayega (JSON/String)
@RestController
class Greet {
    
    // GET /hello/{name} — path variable ke saath
    @GetMapping("/hello/{name}")
    String hi(@PathVariable String name) {
        return "Hello, " + name + "! Spring Boot mein swagat hai.";
    }
    
    // GET /status — simple health-check style endpoint
    @GetMapping("/status")
    String status() {
        return "App chal raha hai!";
    }
}
```

### Run Karo

```bash
# Development mein run karo
mvn spring-boot:run

# Ya pehle build karo, phir run karo
mvn package
java -jar target/demo-0.0.1.jar
```

### Test Karo

```bash
curl http://localhost:8080/hello/Siddesh
# Output: Hello, Siddesh! Spring Boot mein swagat hai.

curl http://localhost:8080/status
# Output: App chal raha hai!
```

Bas itna! Koi XML nahi, koi external server setup nahi, koi manual configuration nahi.

---

## Spring Boot automatically kya-kya deta hai?

Sirf `spring-boot-starter-web` add karke tumhe yeh sab milta hai — bina ek line likhe:

| Feature | Kya milta hai |
|---|---|
| Tomcat server | Port 8080 pe automatically start |
| Jackson JSON | Objects automatically JSON mein convert |
| Error pages | `/error` pe sensible error response |
| Logging | Logback ke saath colored console logs |
| Graceful shutdown | SIGTERM pe properly close hota hai |
| Config loading | `application.properties` / `application.yml` auto-load |
| Profile support | `dev`, `prod` profiles switch karo |
| Startup banner | Cool ASCII art banner on start (customize bhi kar sakte ho) |

Compare karo Node.js se — same features ke liye:
```bash
npm install express         # web framework
npm install morgan          # HTTP logging
npm install helmet          # security headers
npm install pino            # structured logging
npm install dotenv          # env var loading
npm install express-async-errors  # async error handling
```

Aur phir `app.use(morgan())`, `app.use(helmet())` sab manually wire karo.

---

## @SpringBootApplication Ke Andar Kya Hai?

Yeh annotation actually teen annotations ka combination hai:

```java
// Yeh teen annotations ka shortcut hai:
@SpringBootApplication

// Equivalent hai:
@SpringBootConfiguration   // = @Configuration — yeh class beans define kar sakti hai
@EnableAutoConfiguration   // — Auto-config enable karo classpath dekh ke
@ComponentScan             // — Is package aur sub-packages mein @Component, @Service, @Controller dhundho
```

> [!info] ComponentScan ka scope
> `@SpringBootApplication` jis package mein hoga, woh us package aur uske **saare sub-packages** scan karega Spring beans ke liye. Isliye convention yeh hai ki main class ko root package mein rakho — `com.example.demo` mein — taaki `com.example.demo.controller`, `com.example.demo.service` sab automatically scan ho jaayein.

---

## Real Project mein Spring Boot kaisa lagta hai?

Imagine karo tum Zomato jaise food delivery app ka backend bana rahe ho:

```
com.zomato
├── ZomatoApplication.java          ← @SpringBootApplication yahan
├── controller/
│   ├── RestaurantController.java   ← HTTP requests handle karo
│   └── OrderController.java
├── service/
│   ├── RestaurantService.java      ← Business logic yahan
│   └── OrderService.java
├── repository/
│   ├── RestaurantRepository.java   ← Database operations
│   └── OrderRepository.java
├── model/
│   ├── Restaurant.java             ← Data classes
│   └── Order.java
└── config/
    └── SecurityConfig.java         ← Custom configurations
```

```java
// Controller — Node.js ke route handler jaisa
@RestController
@RequestMapping("/api/restaurants")
public class RestaurantController {
    
    @Autowired  // Spring automatically inject karega
    private RestaurantService restaurantService;
    
    @GetMapping
    public List<Restaurant> getAllRestaurants() {
        return restaurantService.findAll();
    }
    
    @GetMapping("/{id}")
    public Restaurant getRestaurant(@PathVariable Long id) {
        return restaurantService.findById(id);
    }
    
    @PostMapping
    public Restaurant addRestaurant(@RequestBody Restaurant restaurant) {
        return restaurantService.save(restaurant);
    }
}
```

Node.js Express mein same kaam:
```typescript
// Express router — concept same hai, syntax alag
router.get('/restaurants', async (req, res) => {
    const restaurants = await restaurantService.findAll();
    res.json(restaurants);
});

router.get('/restaurants/:id', async (req, res) => {
    const restaurant = await restaurantService.findById(req.params.id);
    res.json(restaurant);
});
```

Concept same hai — implementation Spring Boot mein zyada structured aur type-safe hai.

---

## Gotchas — Common Mistakes Jo Beginners Karte Hain

> [!warning] Yeh mistakes mat karna

**1. Boot Version Drift — Dependency Version Manually Override Karna**

Bahut common mistake hai. Spring Boot parent BOM (Bill of Materials) already compatible versions manage karta hai. Agar tum manually version specify karo, conflict ho sakta hai.

```xml
<!-- GALAT — version manually mat likho agar Spring Boot manage kar raha hai -->
<dependency>
    <groupId>com.fasterxml.jackson.core</groupId>
    <artifactId>jackson-databind</artifactId>
    <version>2.14.0</version>  <!-- ← YEH MAT KARO -->
</dependency>

<!-- SAHI — version chhodo, Boot parent manage karega -->
<dependency>
    <groupId>com.fasterxml.jackson.core</groupId>
    <artifactId>jackson-databind</artifactId>
</dependency>
```

**2. Boot 2.x aur Boot 3.x Tutorials Mix Karna**

`javax.*` aur `jakarta.*` namespace switch ek major breaking change tha. Dono mix karo — compile hi nahi hoga.

```java
// PURANA Boot 2.x — YEH KAAM NAHI KAREGA Boot 3.x mein
import javax.persistence.Entity;
import javax.persistence.Id;

// NAYA Boot 3.x — SAHI
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
```

Tutorial dekhte waqt hamesha check karo — `javax` ya `jakarta`?

**3. Maven Build Plugin Bhool Gaye**

Agar pom.xml mein `spring-boot-maven-plugin` nahi hai, `mvn package` se jo JAR banega woh "fat JAR" nahi hoga — usme dependencies nahi hongi. `java -jar` se run nahi hoga.

```xml
<!-- Yeh plugin ZARURI hai — bhoolna mat -->
<build>
    <plugins>
        <plugin>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-maven-plugin</artifactId>
        </plugin>
    </plugins>
</build>
```

**4. Main Class Ko Root Package Se Bahar Rakh Diya**

ComponentScan main class wali package aur uski sub-packages scan karta hai. Agar main class kisi andar ki package mein hai, usse bahar wali packages scan nahi hongi.

```
com/example/
├── SomeController.java         ← SCAN NAHI HOGA
└── demo/
    ├── DemoApplication.java    ← @SpringBootApplication yahan hai
    └── controller/
        └── OtherController.java ← yeh scan hoga
```

```
com/example/demo/               ← SAHI structure
├── DemoApplication.java        ← @SpringBootApplication yahan
├── controller/
│   └── RestaurantController.java
└── service/
    └── RestaurantService.java
```

**5. application.properties vs application.yml dono simultaneously use karna**

Dono files kaam karti hain, lekin ek project mein consistency rakhna better hai. Dono hain toh Spring Boot dono load karta hai, lekin property collision mein unexpected behavior ho sakta hai.

**6. Port 8080 Already Use Mein Hai**

```
***************************
APPLICATION FAILED TO START
***************************
Web server failed to start. Port 8080 was already in use.
```

```yaml
# application.yml mein port change karo
server:
  port: 8081
```

Ya ek-baar check karo kaun use kar raha hai:
```bash
# Windows
netstat -ano | findstr :8080

# Mac/Linux
lsof -i :8080
```

---

## Node.js se Spring Boot — Kya Different Hai?

Tum Node.js se aaye ho, toh direct comparison helpful hoga:

| Concept | Node.js/Express | Spring Boot |
|---|---|---|
| Server start | `app.listen(3000)` | `SpringApplication.run(App.class, args)` |
| Route handler | `router.get('/path', handler)` | `@GetMapping("/path")` method pe |
| Middleware | `app.use(middleware)` | Filters, Interceptors, AOP |
| Dependency injection | Manual ya tsyringe/inversify | Built-in, `@Autowired` |
| Config | `process.env.VAR` ya dotenv | `application.yml` ya `@Value` |
| JSON serialize | Express auto-karta hai `res.json()` se | `@RestController` auto-karta hai |
| Type safety | TypeScript se | Java se natively |
| Hot reload | nodemon | Spring DevTools |
| Package manager | npm/pnpm | Maven/Gradle |

Spring Boot mein ek key difference — sab kuch **beans** ke through hota hai aur **dependency injection** ka use bahut zyada hota hai. Node.js mein tum manually `new Service()` karte the, Spring Boot mein `@Autowired` se Spring inject karega.

---

## Key Takeaways

- **Spring Boot = Spring + Opinionated Defaults + Embedded Server + Auto-Configuration**. Plain Spring ka koi replacement nahi — sirf ek productivity wrapper hai.

- **Auto-configuration** classpath dekhta hai aur automatically libraries configure karta hai — tum explicitly nahi bolte.

- **Starters** compatible dependencies ka bundle hain — ek starter add karo, poora feature set ready.

- **Embedded Tomcat** matlab WAR deploy nahi karna — bas `java -jar app.jar` aur server chal gaya.

- **`@SpringBootApplication`** teen annotations ka shortcut hai — Configuration + EnableAutoConfiguration + ComponentScan.

- **Convention over Configuration** — defaults override karo sirf jab zarurat ho. Khud ka `@Bean` define karo, Spring Boot ka default hat jaata hai.

- **Spring Boot 3.x use karo** — Java 17+ required, `jakarta.*` namespace. Purane `javax.*` tutorials se bachke raho.

- **Main class ko root package mein rakho** — taaki ComponentScan saare beans dhundh sake.

- **`spring-boot-maven-plugin` zaruri hai** fat JAR ke liye — production deploy ke liye essential.

- Node.js/Express background se aaye ho? Spring Boot concepts same hain — routes, middleware, config, dependency injection — sirf syntax aur structure zyada structured aur verbose hai Java hone ki wajah se.
