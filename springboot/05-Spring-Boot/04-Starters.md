# Spring Boot Starters

Socho ek second ke liye — tu ek nayi Node.js project start karta hai. Kya hota hai? `npm install express cors morgan helmet body-parser dotenv` — aur phir bhi kuch toh reh jaata hai. Version conflicts, peer dependency warnings, "oh yaar yeh package toh us package ke saath nahi chalega" wali problems. Sound familiar?

Spring Boot ne is problem ka ek behtareen solution nikala hai: **Starters**.

Ek Starter basically ek pre-packaged bundle hai dependencies ka. Tu sirf ek line likhta hai — aur poori stack aa jaati hai, sahi versions ke saath, sab kuch ek doosre ke saath compatible. Yeh Spring Boot ka ek sabse bada selling point hai, aur jab tak tu yeh nahi samjha, tujhe lagega Java ecosystem zyada complex hai. Actually nahi hai — bas thoda alag hai.

---

## Starter Hai Kya Cheez?

Technically baat karo toh ek Starter sirf ek Maven/Gradle artifact hai jisme **koi code nahi hota**. Seriously — kholo usko, sirf ek `pom.xml` milegi jisme dependencies listed hain. Bas itna. Koi Java class nahi, koi configuration nahi.

Lekin jab tu apne project mein woh starter add karta hai, toh Maven/Gradle uske andar ki saari dependencies bhi automatically pull kar leta hai. Yahi hai "transitive dependencies" ka concept.

> [!info] Node.js wale ke liye samjhao
> Jaise `npm install express` karne par `accepts`, `array-flatten`, `body-parser`, `content-disposition` etc. sab aa jaate hain — waise hi ek Spring Boot Starter sab kuch kheench leta hai. Fark sirf yeh hai ki Spring Boot ka BOM (Bill of Materials) ensure karta hai ki har library ka version ek doosre ke saath 100% compatible ho. Node mein yeh guarantee nahi hoti.

### Example: `spring-boot-starter-web`

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
    <!-- version nahi likhte — parent BOM se aata hai -->
</dependency>
```

Yeh ek line likhne ke baad tujhe milega:

- **`spring-web` + `spring-webmvc`** — Spring ka actual web framework, REST controllers likhne ke liye
- **Embedded Tomcat** (`tomcat-embed-core`) — ek poora HTTP server, alag se install karne ki zarurat nahi
- **Jackson** (`jackson-databind`, `jackson-datatype-jsr310`) — JSON serialization/deserialization, TypeScript ke `JSON.parse()` jaisa lekin steroids pe
- **Bean Validation** (`hibernate-validator`) — `@NotNull`, `@Email`, `@Min` jaise annotations ke liye
- **Logback** — production-grade logging, `console.log` se kaafi zyada powerful

Aur sirf dependencies hi nahi — saath mein **Auto-Configuration** bhi kick in ho jaati hai automatically. Matlab Tomcat configure ho jaata hai, Jackson register ho jaata hai, sab kuch ready to go.

Zomato analogy lo: Jaise Zomato pe "Combo Meal" order karte ho — burger + fries + drink — sab sahi proportions mein, ek price pe. Ek ek item order karne ki zarurat nahi. Starter wahi combo meal hai.

---

## BOM aur Parent — Versions Kaise Consistent Rehte Hain?

Yeh Spring Boot ka sabse underrated feature hai. Samjho.

Tera `pom.xml` usually ek "parent" inherit karta hai:

```xml
<parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.3.0</version>
    <!-- relativePath khali — Maven central se lega -->
    <relativePath/>
</parent>
```

Yeh parent ek **BOM (Bill of Materials)** import karta hai. BOM basically ek bada spreadsheet hai jisme ~200+ popular libraries ke versions listed hain — aur Spring Boot team ne yeh ensure kiya hai ki yeh sab ek saath kaam karte hain.

Iska matlab: **tu versions likhna band kar de.**

```xml
<dependencies>
    <!-- Version nahi — BOM handle karega -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>

    <!-- Jackson ka module — version nahi likhna -->
    <dependency>
        <groupId>com.fasterxml.jackson.module</groupId>
        <artifactId>jackson-module-kotlin</artifactId>
    </dependency>

    <!-- Yeh bhi — Spring Boot sahi version jaanta hai -->
    <dependency>
        <groupId>org.flywaydb</groupId>
        <artifactId>flyway-core</artifactId>
    </dependency>
</dependencies>
```

Spring Boot automatically woh version pick karega jo uske saath tested hai. No more "version XYZ is not compatible with ABC" nightmares.

> [!warning] Kabhi mat karo yeh galti
> Agar tune manually kisi starter ya uski transitive dependency ka version force kiya — `<version>2.15.2</version>` likh diya — toh BOM ki compatibility guarantees break ho sakti hain. Ek library update hogi, doosri nahi, aur tujhe mysterious runtime errors milenge. **Trust the parent. Trust the BOM.**

### Gradle Users Ke Liye

Maven use nahi karta? Gradle mein yeh kuch aisa lagta hai:

```groovy
plugins {
    id 'org.springframework.boot' version '3.3.0'
    // Yeh plugin BOM ko Gradle mein laata hai
    id 'io.spring.dependency-management' version '1.1.5'
    id 'java'
}

dependencies {
    // Version nahi likhna — plugin handle karega
    implementation 'org.springframework.boot:spring-boot-starter-web'
    implementation 'org.springframework.boot:spring-boot-starter-data-jpa'
    runtimeOnly 'org.postgresql:postgresql'
    testImplementation 'org.springframework.boot:spring-boot-starter-test'
}
```

---

## Common Starters — Tera Toolkit

Yeh sabse zyada use hone wale Starters hain. Inhe yaad kar le — baar baar kaam aayenge:

| Starter | Kya karta hai | Node.js equivalent |
|---|---|---|
| `spring-boot-starter-web` | REST APIs, MVC, embedded Tomcat | `express` + `body-parser` + `cors` |
| `spring-boot-starter-webflux` | Reactive/non-blocking HTTP (Netty) | `fastify` ya RxJS-based stack |
| `spring-boot-starter-data-jpa` | JPA + Hibernate ORM | `typeorm` ya `sequelize` |
| `spring-boot-starter-data-mongodb` | MongoDB driver + repositories | `mongoose` |
| `spring-boot-starter-data-redis` | Redis client + caching | `ioredis` ya `redis` npm |
| `spring-boot-starter-jdbc` | Plain JDBC + JdbcTemplate | `pg` ya `mysql2` |
| `spring-boot-starter-security` | Authentication + authorization | `passport` + `express-jwt` |
| `spring-boot-starter-oauth2-client` | OAuth2/OIDC as a client | `passport-google-oauth20` etc. |
| `spring-boot-starter-oauth2-resource-server` | JWT validation for APIs | `express-jwt` |
| `spring-boot-starter-validation` | `@Valid`, `@NotNull`, `@Email` etc. | `joi` ya `zod` |
| `spring-boot-starter-actuator` | Health checks, metrics, /health endpoint | custom middleware ya `express-status-monitor` |
| `spring-boot-starter-cache` | `@Cacheable` annotation | `node-cache` ya custom Redis caching |
| `spring-boot-starter-aop` | Aspect-Oriented Programming | custom middleware chain |
| `spring-boot-starter-mail` | Email bhejne ke liye JavaMail | `nodemailer` |
| `spring-boot-starter-thymeleaf` | Server-side HTML templates | `ejs` ya `handlebars` |
| `spring-boot-starter-test` | JUnit 5, Mockito, AssertJ, Spring Test | `jest` + `supertest` |
| `spring-boot-starter-quartz` | Cron jobs / schedulers | `node-cron` ya `bull` |
| `spring-boot-starter-amqp` | RabbitMQ messaging | `amqplib` |
| `spring-boot-devtools` | Hot reload dev ke liye | `nodemon` |

---

## Real-World Example: Ek Poora Production Stack

Maan le tu Zomato jaisi ek food delivery app ka backend bana raha hai. Kya chahiye?

- REST API endpoints (orders, restaurants, users)
- Database (PostgreSQL)
- Input validation (order amount valid hai? phone number sahi hai?)
- Health check endpoint (DevOps team ko chahiye)
- Security (JWT tokens)
- Testing

Pehle Node.js mein kya karta? `npm install express typeorm pg passport passport-jwt joi jest supertest` — aur phir sab kuch manually glue karta.

Spring Boot mein? Sirf yeh `pom.xml`:

```xml
<dependencies>
    <!-- REST API layer — Tomcat embedded, Jackson, Spring MVC -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>

    <!-- Database layer — JPA + Hibernate ORM -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>

    <!-- Input validation — @NotNull, @Email, @Size etc. -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-validation</artifactId>
    </dependency>

    <!-- Health endpoints — /actuator/health, /actuator/metrics -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-actuator</artifactId>
    </dependency>

    <!-- Security — JWT, authentication, authorization -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-security</artifactId>
    </dependency>

    <!-- OAuth2 Resource Server — JWT token validate karne ke liye -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-oauth2-resource-server</artifactId>
    </dependency>

    <!-- PostgreSQL driver — runtime pe hi chahiye, compile time nahi -->
    <dependency>
        <groupId>org.postgresql</groupId>
        <artifactId>postgresql</artifactId>
        <scope>runtime</scope>
    </dependency>

    <!-- Testing — JUnit 5, Mockito, MockMvc, AssertJ sab included -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-test</artifactId>
        <scope>test</scope>
    </dependency>
</dependencies>
```

Bas. Yeh ek complete production-ready backend stack hai. Consistent versions, sab configured, sab tested by Spring team. Ek ek cheez manually glue karne ki zarurat nahi.

---

## Transitive Dependencies Ko Exclude Karna

Kabhi kabhi ek Starter aise dependencies laata hai jo tujhe nahi chahiye. Classic example: `spring-boot-starter-web` by default **Logback** laata hai logging ke liye. Lekin agar tu **Log4j2** use karna chahta hai (jo faster hai aur zyada features deta hai), toh tujhe default ko hatana hoga.

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
    <exclusions>
        <!-- Yeh hata do — Logback nahi chahiye -->
        <exclusion>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-logging</artifactId>
        </exclusion>
    </exclusions>
</dependency>

<!-- Ab apna preferred logger add karo -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-log4j2</artifactId>
</dependency>
```

Gradle mein:

```groovy
configurations {
    // Logback ko globally exclude karo
    all {
        exclude group: 'org.springframework.boot', module: 'spring-boot-starter-logging'
    }
}

dependencies {
    implementation 'org.springframework.boot:spring-boot-starter-web'
    implementation 'org.springframework.boot:spring-boot-starter-log4j2'
}
```

> [!tip] Kaise pata chalega kya kya aa raha hai?
> Maven mein yeh command run kar: `mvn dependency:tree`
> Gradle mein: `./gradlew dependencies`
> 
> Poora dependency tree dikhega — exactly kya kya pull ho raha hai, kahan se aa raha hai. Jab koi conflict aaye ya unexpected cheez aa rahi ho, pehle yahi dekho.

---

## Custom Starter Banana — Organization Ke Liye

Yeh advanced topic hai lekin bahut kaam aata hai jab tu kisi company mein kaam karta hai.

Socho Swiggy ke backend team ne ek common "auth + tracing + audit logging" setup banaya hai jo har microservice mein use hona chahiye. Har team ko manually woh sab configure karna padega? Nahi — ek custom Starter banao.

Custom Starter ka structure:

```
swiggy-common-starter/
├── swiggy-common-starter-autoconfigure/
│   ├── src/main/java/
│   │   └── in/swiggy/starter/
│   │       ├── SwiggyAuthAutoConfiguration.java    ← @AutoConfiguration class
│   │       └── SwiggyTracingAutoConfiguration.java
│   ├── src/main/resources/META-INF/spring/
│   │   └── org.springframework.boot.autoconfigure.AutoConfiguration.imports
│   │                         ↑ yahan apni AutoConfig classes register karo
│   └── pom.xml
│
└── swiggy-common-starter/
    ├── pom.xml   ← sirf dependencies declare karta hai, koi code nahi
    └── (empty src)
```

`org.springframework.boot.autoconfigure.AutoConfiguration.imports` file mein:

```
in.swiggy.starter.SwiggyAuthAutoConfiguration
in.swiggy.starter.SwiggyTracingAutoConfiguration
```

Phir koi bhi team apne project mein add kare:

```xml
<dependency>
    <groupId>in.swiggy</groupId>
    <artifactId>swiggy-common-starter</artifactId>
    <version>1.0.0</version>
</dependency>
```

Aur bam — auth, tracing, audit logging sab configure ho gaya. Zero manual setup.

> [!info] Do module kyun?
> `autoconfigure` module mein actual `@AutoConfiguration` classes hoti hain. `starter` module sirf `autoconfigure` + baaki transitive dependencies declare karta hai. Yeh separation allow karta hai ki koi sirf autoconfigure module use kare bina poore starter ke — useful for testing ya custom setups.

---

## Starter vs. Direct Dependency — Kya Farak Hai?

Yeh ek common confusion hai naye logon mein.

```xml
<!-- GALAT — yeh Spring Boot starter nahi, direct library hai -->
<dependency>
    <groupId>org.springframework</groupId>
    <artifactId>spring-web</artifactId>
    <!-- Version manually specify karna padega -->
    <version>6.1.8</version>
</dependency>

<!-- SAHI — Spring Boot starter use karo -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
    <!-- Version nahi likhna — BOM se aata hai -->
</dependency>
```

Jab tu `spring-web` directly add karta hai (without Boot prefix):
- Auto-configuration trigger **nahi hogi**
- Embedded Tomcat **nahi aayega**
- Jackson auto-registration **nahi hogi**
- Manually sab wire karna padega — basically vanilla Spring, no Boot magic

Starter add karne par sab kuch auto-magic se kaam karta hai.

---

## Gotchas — Beginners Yahan Phaste Hain

> [!warning] Dhyan se — yeh common mistakes hain

**1. Security Starter Add Kiya Aur Sab Kuch Lock Ho Gaya**

`spring-boot-starter-security` add karte hi Auto-Configuration enable ho jaati hai. Default behavior: **har endpoint pe authentication required hai**. Agar tune yeh add kiya aur apni app suddenly 401 dene lagi — yahi reason hai.

Fix: Ya toh Security configure karo properly, ya temporarily test ke liye:
```java
@Configuration
public class SecurityConfig {
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http.authorizeHttpRequests(auth -> auth.anyRequest().permitAll());
        return http.build();
    }
}
```

**2. DevTools Production Mein Chhod Diya**

`spring-boot-devtools` development ke liye hai — hot reload, faster restarts. Production mein yeh nahi hona chahiye. Mark karo:

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-devtools</artifactId>
    <scope>runtime</scope>
    <optional>true</optional>
    <!-- optional=true ensure karta hai ki yeh transitive nahi aata -->
</dependency>
```

**3. `spring-boot-starter` (Base) vs `spring-boot-starter-web` Ka Confusion**

`spring-boot-starter` (without `-web`) sirf ek base starter hai — logging, yaml support, Spring Boot core. Koi web layer nahi. Bahut log Google se purana code copy karte hain aur yeh mistake karte hain.

**4. Version Force Karna**

```xml
<!-- BILKUL MAT KARO — BOM break ho jaayegi -->
<dependency>
    <groupId>com.fasterxml.jackson.core</groupId>
    <artifactId>jackson-databind</artifactId>
    <version>2.15.2</version>  <!-- ← yeh line mat likho -->
</dependency>
```

Agar koi security vulnerability hai aur specific version chahiye — tab Spring Boot parent version hi upgrade karo, individual library nahi.

**5. Starter Hai Lekin Use Nahi — AutoConfig Phir Bhi Chali**

Agar tune `spring-boot-starter-data-redis` add kiya lekin Redis configure nahi kiya (no host, no connection) — app startup pe fail ho sakti hai kyunki Spring Boot Redis connection banana try karega. Har starter jo add karo, uski basic configuration bhi karo `application.properties` mein.

**6. `test` Scope Bhul Gaye**

```xml
<!-- GALAT — test library production bundle mein jaayegi -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-test</artifactId>
    <!-- scope nahi likha = compile scope = production mein bhi jaayega -->
</dependency>

<!-- SAHI -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-test</artifactId>
    <scope>test</scope>
</dependency>
```

---

## Key Takeaways

- **Starter = curated dependency bundle** — koi code nahi, sirf ek `pom.xml` jisme saari zaruri libraries listed hain
- **BOM + Parent = version management** — ek baar Spring Boot version set karo, baaki sab automatically compatible versions milen
- **Node.js se analogy**: `npm install express` jaisa, lekin sab versions guaranteed compatible hain — no peer dependency hell
- **`spring-boot-starter-web`** sabse common hai — REST API ke liye yahi use hota hai; Tomcat, Jackson, Validation sab included
- **Version kabhi manually mat likhna** — BOM pe bharosa rakho; sirf parent ka version upgrade karo jab zaruri ho
- **Exclusions ka use karo** jab koi specific transitive dependency nahi chahiye (e.g., Logback replace with Log4j2)
- **Security Starter add kiya?** Default pe sab lock ho jaata hai — deliberately configure karo
- **Custom Starters** organizations ke liye powerful tool hai — shared concerns (auth, tracing) ko ek jagah package karo, har team ko bas ek dependency add karni hai
- **`mvn dependency:tree`** tera best friend hai — jab bhi confusion ho, yeh run karo aur dekho exactly kya kya aa raha hai
