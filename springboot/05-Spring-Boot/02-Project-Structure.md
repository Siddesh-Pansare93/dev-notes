# Project Structure — Spring Boot Mein Ghar Kaise Banate Hain

Socho ek second ke liye — jab Zomato jaisi company apna backend banati hai, toh woh blindly files kahin bhi nahi daalte. Har cheez ki ek jagah hoti hai. Restaurant service alag folder mein, payment service alag, delivery tracking alag. Agar sab kuch ek hi drawer mein daal do toh jab bug fix karna ho raat 2 baje on-call pe, toh dhundhoge kahaan?

Spring Boot bhi same philosophy follow karta hai — **convention over configuration**. Framework tumhare liye ek standard layout define karta hai. Isko follow karo, sab kuch automagically kaam karta hai. Isko ignore karo, aur Spring Boot tumse daily fight karta rahega.

Node.js mein tum apna `src/` folder kahin bhi rakh sakte the — koi rok nahi tha. Spring Boot mein bhi technically koi rok nahi hai, lekin agar tum standard nahi follow karte, toh component scanning, auto-configuration, aur build tools sab break ho jaate hain. Isliye yeh note seriously lo.

---

## Maven/Gradle Directory Layout — Ye Kyun Aisa Hai?

> [!info] Node.js se comparison
> Node mein tumhara project root mein `package.json` hota hai, `src/` folder hota hai, aur `node_modules/` hoti hai. Spring Boot mein `pom.xml` (ya `build.gradle`) root mein hota hai — yeh tumhara `package.json` hai. Lekin folder structure zyada opinionated hai.

Spring Boot project ka standard layout kuch aisa dikhta hai:

```
my-app/
├── pom.xml                     # Maven build file — tumhara package.json equivalent
├── mvnw                        # Maven wrapper script (Linux/Mac ke liye)
├── mvnw.cmd                    # Maven wrapper script (Windows ke liye)
├── .mvn/                       # Wrapper configuration files
│   └── wrapper/
│       └── maven-wrapper.properties
├── src/
│   ├── main/
│   │   ├── java/
│   │   │   └── com/example/app/
│   │   │       ├── App.java                  # @SpringBootApplication — entry point
│   │   │       ├── user/
│   │   │       │   ├── UserController.java   # REST endpoints
│   │   │       │   ├── UserService.java      # Business logic
│   │   │       │   └── UserRepository.java   # Database layer
│   │   │       └── order/
│   │   │           ├── OrderController.java
│   │   │           ├── OrderService.java
│   │   │           └── OrderRepository.java
│   │   └── resources/
│   │       ├── application.yml               # Main config file
│   │       ├── application-dev.yml           # Dev environment ka config
│   │       ├── application-prod.yml          # Production ka config
│   │       ├── static/                       # CSS, JS, images — /static/ pe serve hote hain
│   │       ├── templates/                    # Thymeleaf HTML templates (agar use karo)
│   │       └── db/migration/                 # Flyway SQL migration scripts
│   └── test/
│       ├── java/
│       │   └── com/example/app/
│       │       ├── AppTests.java             # Integration tests
│       │       └── user/
│       │           └── UserServiceTest.java  # Unit tests
│       └── resources/
│           └── application-test.yml          # Test environment ka config
└── target/                     # Build output — .gitignore mein daal do
```

Yeh dikhne mein complicated lagta hai pehli baar, lekin ek baar samajh aaya toh sab logical hai.

**`src/main/java/`** — yahan tumhara actual Java code rehta hai. Sab kuch jo production mein jaata hai.

**`src/main/resources/`** — configuration files, database migrations, static assets, HTML templates — sab yahan aata hai.

**`src/test/java/`** — test code. Yeh `target/` JAR mein nahi jaata.

**`target/`** — Maven ka output folder. `.class` files, final JAR, sab yahan compile hota hai. Isko git mein commit mat karo.

> [!tip] mvnw ko zaroor commit karo
> `mvnw` aur `mvnw.cmd` files — inhe git mein commit karo. Yeh Maven Wrapper hain. Inka kaam hai ki jo bhi tumhara project clone kare, use apni machine pe Maven install nahi karna padega — wrapper automatically sahi version download kar lega. Node ka `engines` field `package.json` mein yaad hai? Same concept, but better — Maven khud hi install ho jaata hai.
>
> `.mvn/wrapper/maven-wrapper.properties` mein exact Maven version pinned hoti hai. CI/CD pe bhi same version use hogi, local pe bhi same. Koi "mere machine pe toh kaam karta tha" wali problem nahi.

---

## Root Package — Ek Chhoti Si Galti, Bada Nuksaan

Yeh Spring Boot ka ek quirk hai jo beginners ko confuse karta hai. Samajhna zaroori hai.

`@SpringBootApplication` annotation — yeh teen kaam karta hai ek saath:
1. `@Configuration` — yeh class configuration provide kar sakti hai
2. `@EnableAutoConfiguration` — Spring Boot ki auto-configuration enable karo
3. `@ComponentScan` — beans dhundho

Lekin **ComponentScan kahan dhundha?** Default behavior: **jis package mein `@SpringBootApplication` class hai, ussi package aur uske neeche ke saare sub-packages mein**.

```
com.example.app          ← App.java yahan hai (root package)
com.example.app.user     ← Automatically scan hoga
com.example.app.order    ← Automatically scan hoga
com.example.app.payment  ← Automatically scan hoga
com.example.shared       ← NAHI scan hoga (yeh sibling package hai)
com.example              ← NAHI scan hoga (parent package hai)
```

Agar tumhara `App.java` galat package mein hai:

```java
// GALAT — App.java ko com.example.app.boot mein daala
package com.example.app.boot;

@SpringBootApplication
public class App { ... }
```

Toh `com.example.app.user.UserService` scan nahi hogi. Spring Boot exception dega:

```
NoSuchBeanDefinitionException: No qualifying bean of type 'UserService' available
```

Aur tum 2 ghante debugg karte rahoge ki "kyu nahi chal raha?"

```java
// SAHI — App.java root package mein
package com.example.app;

@SpringBootApplication
public class App {
    public static void main(String[] args) {
        SpringApplication.run(App.class, args);
    }
}
```

> [!warning] Main class ko root package mein rakho — hamesha
> Yeh rule tod ke koi genius mat bano. `App.java` ya `Application.java` — jo bhi naam do — usse sabse upar wale package mein rakho. Baaki sab neeche nested rahenge.

---

## Package-by-Layer — Purana Tarika

Jab Spring Boot tutorials dekhe pehli baar, toh yeh structure dikhta hai:

```
com.example.app/
├── App.java
├── controller/
│   ├── UserController.java
│   └── OrderController.java
├── service/
│   ├── UserService.java
│   └── OrderService.java
├── repository/
│   ├── UserRepository.java
│   └── OrderRepository.java
└── model/
    ├── User.java
    └── Order.java
```

**Node.js equivalent** — yeh waisi hi hai jaise Node mein `routes/`, `controllers/`, `services/`, `models/` folders banate hain. Familiar lagta hai.

**Pros:**
- Tutorials mein yahi dikhta hai — seekhne mein asaan
- "Saare controllers kahan hain?" — bas `controller/` folder kholo

**Cons — aur yeh serious cons hain:**

Socho Swiggy ka backend consider karo. Ek naya feature add karna hai — "Order Tracking." Tumhe touch karne padenge:
- `controller/OrderTrackingController.java` (controller layer)
- `service/OrderTrackingService.java` (service layer)
- `repository/OrderTrackingRepository.java` (repository layer)
- `model/OrderTracking.java` (model layer)

Chaar alag folders mein jaana padega. Aur agar yeh feature delete karna ho? Chaar jagah se files dhundhni padegi.

Worse — jab project bade ho jaata hai:
- `service/` folder mein 30 files
- `controller/` mein 30 files
- Koi ek service pe kaam kar raha hai, toh chaaron folders mein scroll karo

Real problem: **layer se pata nahi chalta ki yeh code kis feature ka hai**. Scale nahi karta 20-25 entities ke baad.

---

## Package-by-Feature — Sahi Tarika (RECOMMENDED)

Yahi approach Zomato, Swiggy jaise companies apne monolith mein use karti hain. Agar future mein microservices nikalne ho, toh yeh structure seedha kaam aata hai.

```
com.example.app/
├── App.java
│
├── common/                     # Shared infrastructure — across features use hone wali cheezein
│   ├── config/
│   │   ├── SecurityConfig.java
│   │   └── CacheConfig.java
│   ├── exception/
│   │   ├── GlobalExceptionHandler.java
│   │   └── ApiException.java
│   └── util/
│       └── DateUtils.java
│
├── user/                       # Sab kuch jo user ke baare mein hai
│   ├── UserController.java     # REST endpoints
│   ├── UserService.java        # Business logic
│   ├── UserRepository.java     # Database operations
│   ├── User.java               # Entity (database table)
│   └── dto/
│       ├── CreateUserRequest.java   # Request body
│       └── UserResponse.java        # Response body
│
├── order/                      # Sab kuch jo orders ke baare mein hai
│   ├── OrderController.java
│   ├── OrderService.java
│   ├── OrderRepository.java
│   ├── Order.java
│   └── dto/
│       ├── PlaceOrderRequest.java
│       └── OrderResponse.java
│
└── payment/                    # Payment feature
    ├── PaymentController.java
    ├── PaymentService.java
    ├── PaymentRepository.java
    ├── Payment.java
    └── dto/
        ├── PaymentRequest.java
        └── PaymentResponse.java
```

**Kya fayda hai is approach ka?**

1. **Feature deletable hai folder ki tarah** — "order" feature hatana hai? `order/` folder delete karo. Done. Node ke `modules/order/` approach jaisa.

2. **Coupling visible hoti hai** — agar `payment/PaymentService.java` ko `order/OrderService.java` ki zarurat pad rahi hai, toh cross-package import dikhega clearly. Ek seedha warning sign ki yeh features tightly coupled ho rahe hain.

3. **Java visibility (`package-private`) enforce ho sakti hai** — yeh Node.js mein nahi hota. Java mein agar `public` keyword nahi lagaya, toh class sirf apne package ke andar accessible hai. Matlab `UserService` ko sirf `UserController` call kar sakta hai (same package), koi aur feature directly access nahi kar sakta.

4. **Microservice extraction easy** — aaj ka `user/` package kal ka `user-service` microservice ban sakta hai. Saari files ek jagah hain already.

> [!tip] Package-by-feature vs Node modules
> Node/TypeScript mein `modules/user/` approach similar hai — `user.module.ts`, `user.controller.ts`, `user.service.ts` sab ek folder mein. Spring Boot mein same concept, bas Java ka syntax alag hai. Tumhare liye mentally shift karna easy hoga.

---

## Ek Feature Module Ka Complete Code

Chalo dekhte hain ek complete `user/` feature module kaise dikhta hai — theek waise jaise Swiggy ke user management module hoga:

```
src/main/java/com/example/app/user/
├── UserController.java       ← public (REST surface — bahar se accessible)
├── UserService.java          ← package-private (internal, sirf UserController use kare)
├── UserRepository.java       ← package-private (internal database access)
├── User.java                 ← package-private entity (database table ka representation)
├── dto/
│   ├── CreateUserRequest.java  ← public (API contract — request body)
│   └── UserResponse.java       ← public (API contract — response body)
└── exception/
    └── UserNotFoundException.java  ← public (global handler pakad sake)
```

```java
package com.example.app.user;

import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

// PUBLIC — yeh REST endpoint hai, bahar se call hogi
@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserService service; // UserService inject ho rahi hai

    // Constructor injection — Spring Boot recommend karta hai yahi
    public UserController(UserService service) {
        this.service = service;
    }

    // POST /api/v1/users — naya user create karo
    @PostMapping
    public UserResponse create(@RequestBody @Valid CreateUserRequest request) {
        return service.create(request);
    }

    // GET /api/v1/users/{id} — user dhundho ID se
    @GetMapping("/{id}")
    public UserResponse findById(@PathVariable Long id) {
        return service.findById(id);
    }
}

// PACKAGE-PRIVATE — koi aur feature directly yeh use nahi kar sakta
// 'public' keyword nahi hai — Java ka default visibility = package-private
@Service
class UserService {

    private final UserRepository repository;

    UserService(UserRepository repository) {
        this.repository = repository;
    }

    // Naya user banao
    UserResponse create(CreateUserRequest request) {
        // Business logic yahan — validation, email check, etc.
        User user = new User();
        user.setName(request.getName());
        user.setEmail(request.getEmail());
        User saved = repository.save(user);
        return toResponse(saved);
    }

    // ID se user dhundho
    UserResponse findById(Long id) {
        User user = repository.findById(id)
            .orElseThrow(() -> new UserNotFoundException(id));
        return toResponse(user);
    }

    // Entity ko Response DTO mein convert karo
    private UserResponse toResponse(User user) {
        return new UserResponse(user.getId(), user.getName(), user.getEmail());
    }
}

// PACKAGE-PRIVATE — sirf is package ke andar use hogi
@Repository
interface UserRepository extends JpaRepository<User, Long> {
    // JPA magic — koi implementation nahi likhni
    boolean existsByEmail(String email);
}
```

Is pattern ka fayda: agar `OrderService` galti se `UserService` ko directly inject karne ki koshish kare:

```java
// order/OrderService.java mein
@Service
class OrderService {

    // COMPILE ERROR! UserService package-private hai
    // order package se access nahi ho sakta
    private final UserService userService; // ERROR
}
```

Java compiler hi rok dega. Runtime pe crash nahi hoga — compile time pe hi pata chal jaayega. Yeh enforcement Node.js mein nahi hoti (wahan exports control karte hain, lekin koi hard enforcement nahi hai).

---

## Tests Ko Mirror Karo — Main Structure Ko

Ek simple rule: test file same package structure follow kare jaise main code ka.

```
# Main code:
src/main/java/com/example/app/user/UserService.java

# Uska test:
src/test/java/com/example/app/user/UserServiceTest.java
```

Yeh convention sirf organization ke liye nahi hai — iska ek practical fayda bhi hai.

Jab test class same package mein hoti hai (`com.example.app.user`), toh woh **package-private members access kar sakti hai**. Matlab:

```java
// src/test/java/com/example/app/user/UserServiceTest.java
package com.example.app.user; // SAME package

class UserServiceTest {

    @Test
    void shouldCreateUser() {
        UserService service = new UserService(mockRepository);
        // UserService package-private hai, lekin test SAME package mein hai
        // Toh directly instantiate kar sakte hain — public API expose nahi karna pada
        UserResponse result = service.create(new CreateUserRequest("Siddesh", "s@example.com"));
        assertThat(result.getName()).isEqualTo("Siddesh");
    }
}
```

Agar test alag package mein hoti, toh tumhe ya toh `UserService` ko `public` banana padta (boundary break) ya phir mock framework ke through kaam karna padta.

---

## Resources Directory — Config aur Assets

`src/main/resources/` mein yeh files aati hain:

```
src/main/resources/
├── application.yml              # Main config — database URL, port, etc.
├── application-dev.yml          # Dev profile config (local development)
├── application-prod.yml         # Production config (Vercel/AWS/GCP pe)
├── application-test.yml         # Test profile — in-memory DB, etc.
├── logback-spring.xml           # Custom logging configuration
├── messages.properties          # Internationalization (i18n) strings
├── static/                      # Publicly served static files
│   ├── index.html               # /index.html pe accessible
│   ├── css/
│   └── js/
├── templates/                   # Server-side rendered templates
│   └── index.html               # Thymeleaf HTML (agar use kar rahe ho)
└── db/
    └── migration/               # Flyway database migrations
        ├── V1__create_users_table.sql
        ├── V2__add_orders_table.sql
        └── V3__add_payment_table.sql
```

**`application.yml` profiles ka concept samajhlo:**

Socho IRCTC ka backend — local pe development karte time SQLite ya local PostgreSQL use hoti hogi, production pe AWS RDS. Same app, alag config. Spring Boot profiles issi ke liye hain:

```yaml
# application.yml — base config (sab profiles pe apply hota hai)
server:
  port: 8080

spring:
  application:
    name: my-zomato-backend
```

```yaml
# application-dev.yml — sirf dev profile pe
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/myapp_dev
    username: postgres
    password: localpassword
  jpa:
    show-sql: true  # Dev pe SQL queries print karo
```

```yaml
# application-prod.yml — production pe
spring:
  datasource:
    url: ${DATABASE_URL}      # Environment variable se lo
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}
  jpa:
    show-sql: false  # Prod pe SQL mat print karo
```

Profile activate karne ke liye:
```bash
# Dev pe run karo
java -jar app.jar --spring.profiles.active=dev

# Prod pe
java -jar app.jar --spring.profiles.active=prod

# Environment variable se bhi ho sakta hai
SPRING_PROFILES_ACTIVE=prod java -jar app.jar
```

**Flyway migrations** — yeh Prisma/Sequelize migrations jaisi hain Node mein. SQL files numbered hoti hain:

```sql
-- V1__create_users_table.sql
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- V2__add_orders_table.sql
CREATE TABLE orders (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    total DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT NOW()
);
```

Flyway automatically detect karta hai kaunsi migrations run hui hain, aur sirf new ones run karta hai.

---

## Multi-Module Projects — Large Scale Ke Liye

Agar tumhara app bahut bada ho jaata hai (soch Flipkart level), toh ek single module mein sab maintain karna mushkil hota hai. Tab Maven multi-module project use karte hain:

```
flipkart-backend/
├── pom.xml                    # Parent POM — <packaging>pom</packaging>
│
├── core/                      # Domain models, interfaces, DTOs
│   └── pom.xml
│
├── infra/                     # Database, messaging, external APIs
│   └── pom.xml
│
├── web/                       # Controllers, REST endpoints
│   └── pom.xml
│
└── app/                       # Bootstrap — main application, ties everything together
    └── pom.xml                # depends on: web, infra, core
```

Yeh approach microservices nikalne se pehle ka step hai. Aaj `core/` module kal `product-service` ka domain layer ban sakta hai. Abhi deep dive nahi karte isme — yeh advanced topic hai.

---

## Gotchas — Jo Galtiyan Sab Karte Hain

> [!warning] Yeh galtiyan beginners se hamesha hoti hain — bachna

**1. Default package use karna**

```java
// GALAT — koi package declaration nahi
// File: src/main/java/App.java

@SpringBootApplication
public class App { ... } // Spring Boot isko scan nahi karega!
```

Agar `package` declaration nahi hai, toh Spring Boot component scanning refuse karta hai. Hamesha package declare karo.

**2. Main class galat package mein dalna**

```
com.example.app.config.App  ← GALAT
com.example.app.App         ← SAHI
```

Agar main class `com.example.app.config` mein hai, toh `com.example.app.user` scan nahi hogi. Classic beginner mistake.

**3. Do `application.yml` files ka conflict**

Agar tumhare JAR ke andar ek `application.yml` hai aur tumne server pe bahar ek aur rakh diya, toh bahar wala precedence le leta hai. Production debugging mein yeh bahut confusing hota hai:

```bash
# JAR ke andar: application.yml (port: 8080)
# JAR ke bahar: /config/application.yml (port: 9090)
# App port 9090 pe start hoga — confusing!
```

Solution: environment variables use karo sensitive config ke liye, `application.yml` mein defaults rakho.

**4. Test fixtures `src/main/resources/` mein dalna**

```
# GALAT — yeh production JAR mein jaayega!
src/main/resources/test-data.sql

# SAHI — test time hi use hoga
src/test/resources/test-data.sql
```

Jo bhi `src/main/resources/` mein hai, woh final JAR mein package hota hai. Test fixtures, sample data, mock responses — yeh sab `src/test/resources/` mein hone chahiye.

**5. Circular dependencies banana (package-by-layer mein common)**

```java
// PROBLEM — UserService ko OrderService chahiye, OrderService ko UserService chahiye
@Service
public class UserService {
    private final OrderService orderService; // Circular!
}

@Service
public class OrderService {
    private final UserService userService;  // Circular!
}
```

Package-by-feature approach mein yeh problem jaldi visible hoti hai (cross-package imports dikhte hain). Package-by-layer mein yeh same folder ke andar hoti hai aur dhyan nahi aata.

**6. `target/` folder git mein commit karna**

Naya developer hoon, kuch nahi pata — `git add .` kiya aur `target/` folder bhi commit ho gaya. 50MB ki `.jar` file git mein. `.gitignore` mein hamesha yeh daalo:

```gitignore
target/
*.class
*.jar
*.war
```

---

## Node.js vs Spring Boot — Quick Structure Comparison

| Node.js/Express | Spring Boot | Notes |
|---|---|---|
| `package.json` | `pom.xml` / `build.gradle` | Dependencies + build config |
| `node_modules/` | `~/.m2/repository/` | Dependencies cache (local machine) |
| `src/` (custom) | `src/main/java/` | Production source code |
| Test files anywhere | `src/test/java/` | Test code (separate, structured) |
| `.env` | `application.yml` + profiles | Configuration |
| `dist/` or `build/` | `target/` | Compiled output |
| `npm install` | `./mvnw install` | Download dependencies |
| `npm start` | `./mvnw spring-boot:run` | Run the app |
| `modules/user/` | `com.example.app.user/` | Feature-based organization |

---

## Key Takeaways

- **Standard layout follow karo** — `src/main/java/` code ke liye, `src/main/resources/` config ke liye, `src/test/java/` tests ke liye. Convention tod ke koi fayda nahi.

- **`@SpringBootApplication` class ko root package mein rakho** — yeh component scanning ka starting point hai. Galat jagah daala toh beans nahi milenge aur `NoSuchBeanDefinitionException` milega.

- **Package-by-feature prefer karo** — package-by-layer tutorials mein dikhta hai lekin scale nahi karta. Feature-based organization mein har feature deletable aur extractable hai.

- **`mvnw` aur `mvnw.cmd` commit karo** — wrapper pin karta hai Maven version. Team ke saare members aur CI/CD same version use karenge.

- **`application-{profile}.yml` use karo environments ke liye** — dev, prod, test — alag-alag config alag profiles mein. Sensitive values environment variables se lo.

- **Test files same package structure follow karein** — `src/test/java/com/example/app/user/UserServiceTest.java` mirror karta hai `src/main/java/com/example/app/user/UserService.java` ko. Package-private members test mein bhi accessible hote hain.

- **`target/` folder gitignore karo** — build output kabhi commit mat karo. Java-specific `.gitignore` use karo.

- **Package-private visibility ka fayda uthao** — `public` sirf wahi cheez ho jo actually public API hai (Controller, DTOs, Exceptions). Baaki sab package-private rakho — Java compiler boundary enforce karega.
