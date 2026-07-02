# Tooling Map: Node Dev Tools → Java Equivalents

Socho ek second ke liye — tum Zomato ka backend TypeScript mein bana rahe the, aur suddenly team ne decide kiya: "Bhai, ab Spring Boot pe shift kar rahe hain." Pehla reaction kya hoga? "Yaar, mera `nodemon`, mera `jest`, mera `eslint`, `prettier` — sab kahan gaya?"

Tension mat lo. Java ka ecosystem bhi utna hi mature hai — bas tools ke naam alag hain, concepts wahi hain. Ye note ek **lookup table + deep explanation** hai jise tum apne pehle Spring Boot project setup karte waqt khula rakh sakte ho. Har familiar Node tool ka Java equivalent samjhao — sirf naam nahi, kaam bhi.

---

## At-a-Glance Master Table

| Purpose              | Node / TS                        | Java / Spring Boot                                        |
| -------------------- | -------------------------------- | --------------------------------------------------------- |
| Hot reload           | `nodemon`, `tsx watch`           | `spring-boot-devtools`                                    |
| Test runner          | `jest`, `vitest`                 | `JUnit 5` (Jupiter)                                       |
| Mocking              | `jest.mock`                      | `Mockito`                                                 |
| Assertions           | `expect`                         | `AssertJ`                                                 |
| Snapshot tests       | `toMatchSnapshot`                | `JsonAssert`, `approvaltests-java`                        |
| API/contract test    | `supertest`                      | Spring `MockMvc`, `WebTestClient`, `RestAssured`          |
| Linter               | `eslint`                         | `Checkstyle`, `PMD`, `SpotBugs`, `ErrorProne`             |
| Formatter            | `prettier`                       | `Spotless` (with `google-java-format` ya Palantir)        |
| Type-check (CI)      | `tsc --noEmit`                   | `javac` — compile ka part hi hai, alag se nahi            |
| REPL                 | `node`, `ts-node`                | `jshell`                                                  |
| Env config           | `dotenv` + `process.env`         | `application.yml` + Spring Profiles                       |
| Logger               | `pino`, `winston`                | `SLF4J` + `Logback`                                       |
| Debugger             | Node `--inspect`                 | JDWP (`-agentlib:jdwp=…`); IDE automatically handle karta |
| Process manager      | `pm2`                            | systemd / Docker (`java -jar`)                            |
| Bundler              | `esbuild`, `webpack`             | Kuch nahi — Maven/Gradle fat JAR banata hai               |
| Package manager      | `npm`, `pnpm`, `yarn`            | `Maven`, `Gradle`                                         |
| Monorepo tool        | `turborepo`, `nx`                | Maven multi-module / Gradle composite                     |
| Migration runner     | `prisma migrate`, `knex`         | `Flyway`, `Liquibase`                                     |
| API docs             | `swagger-jsdoc`, `tsoa`          | `springdoc-openapi`                                       |
| HTTP client (test)   | `undici`, `nock`                 | `WireMock`, `MockServer`                                  |
| Container hot reload | Docker volumes + nodemon         | Docker + `Spring Boot DevTools` + remote debug            |
| Docs generator       | TypeDoc                          | Javadoc                                                   |
| Coverage             | `c8`, `nyc`                      | `JaCoCo`                                                  |
| Mutation testing     | `stryker`                        | `Pitest`                                                  |
| Property tests       | `fast-check`                     | `jqwik`                                                   |
| BDD                  | `cucumber-js`                    | `Cucumber-JVM`                                            |
| Static analysis      | `sonarqube` (via TS plugin)      | `SonarQube` (Java iska native turf hai)                   |
| Dependency scanner   | `npm audit`, `snyk`              | `dependency-check` (OWASP), `snyk`                        |
| Live reload (browser)| HMR                              | `LiveReload` server in `spring-boot-devtools`             |

---

## Hot Reload: `nodemon` ka Java Version — `spring-boot-devtools`

Node mein tumhara flow kuch aisa tha:

```bash
nodemon src/index.ts
# File save karo → process restart → done
```

Spring Boot mein iska equivalent hai **`spring-boot-devtools`**. Lekin samajhna zaroori hai ki yeh internally kaise kaam karta hai — sirf "add kar do" wali mentality se nahi chalega.

### Setup kaise karo

`pom.xml` mein add karo:

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-devtools</artifactId>
    <scope>runtime</scope>
    <!-- optional:true matlab yeh production JAR mein nahi jayega -->
    <optional>true</optional>
</dependency>
```

### Kaam kaise karta hai — andar se

Jab tum Java file save karte ho, IDE us `.java` file ko compile karke `.class` bytecode file banata hai `target/classes/` mein. DevTools usi classpath ko **watch** kar raha hota hai. Jaise hi koi `.class` file change hoti hai, woh **application context restart** karta hai.

Lekin yahan ek smart cheez hai — DevTools do `ClassLoader` use karta hai:
- **Base ClassLoader**: Libraries ke liye (Spring, Hibernate, etc.) — yeh reload nahi hota
- **Restart ClassLoader**: Tumhare code ke liye — sirf yahi reload hota hai

Isliye restart **cold start se bahut faster** hota hai. Zomato ke 500 microservices mein agar har file save pe full JVM restart hota, toh developers pagal ho jaate.

### IntelliJ ke saath setup

> [!tip] IntelliJ mein yeh setting enable karo:
> **Settings → Build, Execution, Deployment → Compiler → "Build project automatically"**
>
> Phir `Ctrl+Shift+F9` se manual build trigger karo ya auto-build on save lagao.
> Ya phir **Advanced Settings → "Allow auto-make to start even if developed application is currently running"** enable karo.

```yaml
# application.yml mein DevTools tweak kar sakte ho
spring:
  devtools:
    restart:
      # Kuch paths exclude karo restart se
      exclude: static/**,public/**,templates/**
    livereload:
      enabled: true  # Browser bhi auto-refresh karega
```

> [!warning] Ek common galti — `mvn spring-boot:run` aur IDE dono simultaneously mat chalao. Ya toh IDE se run karo (DevTools + auto-compile dono active), ya Maven se karo — dono saath hone par conflicts ho sakte hain.

---

## Testing: `jest` ka Java World — JUnit 5 + Mockito + AssertJ

Ye teen tools milke `jest` ka kaam karte hain:
- **JUnit 5**: Test runner (jest ka `describe`/`it` waala role)
- **Mockito**: Mocking (jest.mock ka equivalent)
- **AssertJ**: Assertions (expect ka equivalent, aur kaafi zyada powerful)

### Side-by-Side Comparison

Node mein tum kuch aisa likhte the:

```typescript
// Jest — TypeScript mein UserService test
describe('UserService', () => {
    it('returns user by id', async () => {
        // Mock banao repository ka
        const repo = {
            findById: jest.fn().mockResolvedValue({ id: 1, name: 'Ada' })
        };
        const svc = new UserService(repo as any);

        // Assert karo
        await expect(svc.find(1)).resolves.toEqual({ id: 1, name: 'Ada' });
    });
});
```

Java mein same cheez:

```java
// JUnit 5 + Mockito + AssertJ — bilkul wahi concept, alag syntax
@ExtendWith(MockitoExtension.class)  // jest.config jaisa setup
class UserServiceTest {

    @Mock
    UserRepository repo;  // jest.mock() jaisa — Mockito automatically stub banata hai

    @InjectMocks
    UserService svc;  // Service mein mock inject hoga automatically

    @Test
    void returnsUserById() {
        // when(...).thenReturn(...) = jest.fn().mockReturnValue(...)
        when(repo.findById(1L)).thenReturn(Optional.of(new User(1L, "Ada")));

        // AssertJ chaining — expect().toEqual() jaisi feel
        assertThat(svc.find(1L))
            .isNotNull()
            .isEqualTo(new User(1L, "Ada"));
    }

    @Test
    void throwsWhenUserNotFound() {
        when(repo.findById(99L)).thenReturn(Optional.empty());

        // Exception test karna
        assertThatThrownBy(() -> svc.find(99L))
            .isInstanceOf(UserNotFoundException.class)
            .hasMessage("User 99 not found");
    }
}
```

### HTTP-Level Testing: `supertest` ↔ `MockMvc`

Node mein supertest se tum direct HTTP requests bhejte the bina real server chalaye. Spring Boot mein iska naam hai **MockMvc**:

```typescript
// supertest — TypeScript
import request from 'supertest';
import app from '../app';

test('GET /users/1 returns user', async () => {
    const res = await request(app).get('/users/1');
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Ada');
});
```

```java
// MockMvc — Spring Boot ka supertest
@WebMvcTest(UserController.class)
// @WebMvcTest sirf Controller layer load karta hai, full Spring context nahi
// isliye test fast rehta hai
class UserControllerTest {

    @Autowired
    MockMvc mvc;  // Yahi tumhara "virtual HTTP client" hai

    @MockBean
    UserService svc;  // Service ko mock karo controller mein inject karne ke liye

    @Test
    void getsUser() throws Exception {
        // Given: service kya return karega
        when(svc.find(1L)).thenReturn(new User(1L, "Ada"));

        // When + Then: HTTP request bhejo aur response check karo
        mvc.perform(get("/users/1")
                .contentType(MediaType.APPLICATION_JSON))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("Ada"))
            .andExpect(jsonPath("$.id").value(1));
    }

    @Test
    void returns404WhenUserNotFound() throws Exception {
        when(svc.find(99L)).thenThrow(new UserNotFoundException("User 99 not found"));

        mvc.perform(get("/users/99"))
            .andExpect(status().isNotFound());
    }
}
```

### Full Integration Test — `@SpringBootTest`

Kabhi kabhi MockMvc kaafi nahi hota — poora application context chahiye. Tab `@SpringBootTest` use karo:

```java
// Yeh POORA Spring context load karta hai — real database, real beans sab
// Slow hai, lekin end-to-end confidence deta hai
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class UserIntegrationTest {

    @Autowired
    TestRestTemplate restTemplate;  // Ya WebTestClient for reactive apps

    @Test
    void createAndFetchUser() {
        // Real HTTP call, real DB
        var created = restTemplate.postForObject(
            "/users",
            new CreateUserRequest("Siddesh", "sid@example.com"),
            UserResponse.class
        );

        assertThat(created.name()).isEqualTo("Siddesh");

        var fetched = restTemplate.getForObject("/users/" + created.id(), UserResponse.class);
        assertThat(fetched.name()).isEqualTo("Siddesh");
    }
}
```

> [!tip] Testing pyramid yaad rakho:
> - Zyada **unit tests** (fast, isolated, `@ExtendWith(MockitoExtension.class)`)
> - Kuch **slice tests** (`@WebMvcTest`, `@DataJpaTest` — sirf ek layer)
> - Thode **integration tests** (`@SpringBootTest` — poora flow, slow)
>
> IRCTC pe sochne wali baat: agar har ticket booking ke baad full integration test chalao, toh CI pipeline mein ghanta lag jaata. Unit tests fast hote hain.

---

## Linting & Formatting: `eslint` + `prettier` ↔ Checkstyle + Spotless

Node mein tum `eslint` se bugs/style issues pakad te the aur `prettier` se automatically format karte the. Java mein yeh kaam multiple tools milke karte hain.

### Spotless — Java ka Prettier

`Spotless` closest hai `prettier` ke. Auto-format karta hai, auto-fix bhi karta hai:

```xml
<!-- pom.xml mein plugin add karo -->
<plugin>
    <groupId>com.diffplug.spotless</groupId>
    <artifactId>spotless-maven-plugin</artifactId>
    <version>2.43.0</version>
    <configuration>
        <java>
            <!-- Google Java Format — Google ka official formatter -->
            <googleJavaFormat>
                <version>1.22.0</version>
                <style>AOSP</style>  <!-- Android Open Source style -->
            </googleJavaFormat>
            <!-- Unused imports automatically remove -->
            <removeUnusedImports/>
            <!-- Import order fix -->
            <importOrder/>
        </java>
    </configuration>
</plugin>
```

```bash
mvn spotless:apply   # prettier --write . ke jaisa — format kar do
mvn spotless:check   # CI mein run karo — fail karega agar code unformatted hai
```

### Checkstyle — Java ka ESLint (Style Rules)

```xml
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-checkstyle-plugin</artifactId>
    <version>3.4.0</version>
    <configuration>
        <!-- Google ya Sun style guide use karo -->
        <configLocation>google_checks.xml</configLocation>
        <failsOnError>true</failsOnError>
    </configuration>
</plugin>
```

### ErrorProne — Compile-Time Bug Detection

Yeh Google ka tool hai jo `javac` ke saath integrate hota hai. TypeScript mein tum kuch errors runtime pe pakad te the ya eslint rules se — ErrorProne **compile time pe** hi pakad leta hai:

```xml
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-compiler-plugin</artifactId>
    <configuration>
        <annotationProcessorPaths>
            <path>
                <groupId>com.google.errorprone</groupId>
                <artifactId>error_prone_core</artifactId>
                <version>2.28.0</version>
            </path>
        </annotationProcessorPaths>
    </configuration>
</plugin>
```

Yeh cheezein pakad lega:
- Unused variables/return values
- String format mismatch
- Common null pointer patterns
- Thread safety issues

> [!info] CI mein recommended order:
> `mvn spotless:check` → `mvn checkstyle:check` → `mvn compile` (ErrorProne) → `mvn test`
>
> Ye wahi hai jaise Node CI mein `prettier --check` → `eslint` → `tsc --noEmit` → `jest`

---

## Env Config: `dotenv` ↔ `application.yml` + Spring Profiles

Yeh concept Node se kaafi alag feel karega, lekin actually zyada powerful hai.

### Node mein approach

```typescript
// .env file
DATABASE_URL=postgres://localhost:5432/dev
LOG_LEVEL=debug
JWT_SECRET=supersecret123

// code mein
import 'dotenv/config';
const url = process.env.DATABASE_URL;
const logLevel = process.env.LOG_LEVEL ?? 'info';
```

### Spring Boot mein approach

```yaml
# src/main/resources/application.yml
# Yeh default config hai — sab environments ke liye common settings
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/dev
    username: postgres
    password: password
  jpa:
    hibernate:
      ddl-auto: update  # Dev mein schema auto-update
    show-sql: true  # Dev mein helpful

logging:
  level:
    root: ${LOG_LEVEL:info}  # Env var se lega, default: info
    com.acme: debug  # Tumhara package debug level pe

server:
  port: 8080
```

```yaml
# src/main/resources/application-prod.yml
# Sirf production ke liye overrides — baaki sab application.yml se inherit
spring:
  datasource:
    url: ${DATABASE_URL}  # Production mein env var se aayega
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}
  jpa:
    hibernate:
      ddl-auto: validate  # Production mein schema change mat karo!
    show-sql: false  # Production logs mein SQL mat dikhao

logging:
  level:
    root: warn
    com.acme: info
```

```yaml
# src/main/resources/application-staging.yml
# Staging environment ke liye
spring:
  datasource:
    url: jdbc:postgresql://staging-db:5432/staging
```

### Profiles Activate Kaise Karo

```bash
# Development (default — kuch specify mat karo)
mvn spring-boot:run

# Production
java -jar app.jar --spring.profiles.active=prod

# Staging
SPRING_PROFILES_ACTIVE=staging java -jar app.jar

# Multiple profiles
java -jar app.jar --spring.profiles.active=prod,monitoring
```

### Typed Config — `@ConfigurationProperties` (Killer Feature)

Yeh Node mein nahi hota by default. Tum YAML ko directly typed Java record/class mein bind kar sakte ho — no more `process.env.SOMETHING` scattered everywhere:

```yaml
# application.yml
acme:
  payments:
    api-key: ${PAYMENT_API_KEY}
    timeout: 30s
    retry-count: 3
    base-url: https://payment.gateway.com
```

```java
// Ek jagah sari config type-safe
@ConfigurationProperties("acme.payments")
@Validated  // Bean Validation annotations bhi laga sakte ho
public record PaymentConfig(
    @NotBlank String apiKey,
    @NotNull Duration timeout,
    @Min(1) @Max(10) int retryCount,
    @NotNull URI baseUrl
) {}

// Enable karo main class ya config class pe
@SpringBootApplication
@EnableConfigurationProperties(PaymentConfig.class)
public class MyApp { ... }

// Use karo any service mein
@Service
public class PaymentService {
    private final PaymentConfig config;

    public PaymentService(PaymentConfig config) {
        this.config = config;
    }

    public void processPayment(Order order) {
        // config.apiKey(), config.timeout() — type-safe access
        log.info("Processing via {} with timeout {}", config.baseUrl(), config.timeout());
    }
}
```

> [!tip] Priority Order — Spring Config ka
> Spring properties ko is order mein resolve karta hai (higher = higher priority):
> 1. Command line arguments (`--server.port=9000`)
> 2. Environment variables (`SERVER_PORT=9000`)
> 3. Profile-specific YAML (`application-prod.yml`)
> 4. Default YAML (`application.yml`)
>
> Iska matlab: production pe tum safely env vars se secrets inject kar sakte ho bina code change kiye.

---

## Logging: `pino`/`winston` ↔ SLF4J + Logback

Pino ya Winston Node mein seedha use karte the. Java mein ek **abstraction layer** hai — **SLF4J** (Simple Logging Facade for Java). Yeh waise hi hai jaise tum TypeScript mein ek `logger.ts` file banana jisko real implementation swap kar sako.

```
SLF4J = Interface/Abstraction
Logback = Default Implementation (Spring Boot bundled)
Log4j2 = Alternative Implementation
```

### Basic Usage

```java
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class OrderService {

    // Har class mein yahi pattern use karo
    // `getClass()` ki jagah directly class pass karo — more reliable
    private static final Logger log = LoggerFactory.getLogger(OrderService.class);

    public Order placeOrder(OrderRequest req) {
        // {} placeholder hai — pino ke %o jaisa
        // String concat nahi hota jab tak level enabled nahi
        log.info("Placing order for user={}, items={}", req.userId(), req.items().size());

        try {
            var order = processOrder(req);
            log.info("Order placed successfully orderId={}", order.id());
            return order;
        } catch (PaymentException e) {
            // Exception bhi pass kar sakte ho — stack trace automatically print hoga
            log.error("Payment failed for user={}", req.userId(), e);
            throw e;
        }
    }
}
```

### Logback Configure Karo

```xml
<!-- src/main/resources/logback-spring.xml -->
<!-- IMPORTANT: logback-spring.xml use karo, logback.xml nahi! -->
<!-- -spring variant Spring properties support karta hai -->
<configuration>

    <!-- Console pe structured output -->
    <appender name="STDOUT" class="ch.qos.logback.core.ConsoleAppender">
        <encoder>
            <!-- Timestamp, Level, Thread, Logger, Message -->
            <pattern>%d{HH:mm:ss.SSS} %-5level [%thread] %logger{36} - %msg%n</pattern>
        </encoder>
    </appender>

    <!-- File mein bhi log karo (rolling) -->
    <appender name="FILE" class="ch.qos.logback.core.rolling.RollingFileAppender">
        <file>logs/app.log</file>
        <rollingPolicy class="ch.qos.logback.core.rolling.TimeBasedRollingPolicy">
            <fileNamePattern>logs/app-%d{yyyy-MM-dd}.log</fileNamePattern>
            <maxHistory>30</maxHistory>  <!-- 30 din ka history -->
        </rollingPolicy>
        <encoder>
            <pattern>%d{yyyy-MM-dd HH:mm:ss.SSS} %-5level [%thread] %logger{36} - %msg%n</pattern>
        </encoder>
    </appender>

    <!-- Root level -->
    <root level="info">
        <appender-ref ref="STDOUT"/>
        <appender-ref ref="FILE"/>
    </root>

    <!-- Tumhara package debug pe -->
    <logger name="com.acme" level="debug"/>

    <!-- Spring ka internal logging quiet karo -->
    <logger name="org.springframework" level="warn"/>
    <logger name="org.hibernate" level="warn"/>

</configuration>
```

### JSON Logs Production Ke Liye

Swiggy ya Zomato jaisi companies ELK Stack (Elasticsearch, Logstash, Kibana) use karti hain. JSON logs chahiye. Sirf encoder swap karo:

```xml
<!-- pom.xml mein add karo -->
<dependency>
    <groupId>net.logstash.logback</groupId>
    <artifactId>logstash-logback-encoder</artifactId>
    <version>7.4</version>
</dependency>
```

```xml
<!-- logback-spring.xml mein JSON encoder -->
<appender name="JSON" class="ch.qos.logback.core.ConsoleAppender">
    <encoder class="net.logstash.logback.encoder.LogstashEncoder"/>
</appender>
```

Ab har log line ek JSON object hoga — Kibana directly parse kar sakta hai.

---

## REPL: `ts-node` ↔ `jshell`

Kabhi kabhi bas ek quick experiment karna hota hai. Node mein `node` ya `ts-node` khola, kuch type kiya, done. Java mein hai **`jshell`** — Java 9 se built-in:

```bash
$ jshell
|  Welcome to JShell -- Version 21
|  For an introduction type: /help intro

# Simple expressions
jshell> int x = 21 * 2
x ==> 42

# Java standard library use karo
jshell> import java.time.*
jshell> LocalDate.now()
$3 ==> 2026-07-02

# String operations
jshell> "hello world".toUpperCase()
$4 ==> "HELLO WORLD"

# Method likhke test karo
jshell> int factorial(int n) { return n <= 1 ? 1 : n * factorial(n-1); }
|  created method factorial(int)

jshell> factorial(5)
$6 ==> 120

# File load karo
jshell> /open MyUtil.java

# Exit
jshell> /exit
```

> [!info] Practical tip: jshell Spring beans load nahi karta. Agar Spring context ke saath experiment karna hai, toh ek `@SpringBootTest` test method likho aur sirf woh run karo — IDE mein cursor rakho aur `Ctrl+Shift+F10` (IntelliJ).

---

## Coverage: `c8`/`nyc` ↔ JaCoCo

Code coverage — kitna tumhara code tests se cover ho raha hai. JaCoCo (Java Code Coverage) ka setup Maven mein:

```xml
<!-- pom.xml mein plugin -->
<plugin>
    <groupId>org.jacoco</groupId>
    <artifactId>jacoco-maven-plugin</artifactId>
    <version>0.8.12</version>
    <executions>
        <!-- Tests chalane se pehle JaCoCo agent attach karo -->
        <execution>
            <goals><goal>prepare-agent</goal></goals>
        </execution>
        <!-- Tests ke baad HTML report generate karo -->
        <execution>
            <id>report</id>
            <phase>verify</phase>
            <goals><goal>report</goal></goals>
        </execution>
        <!-- Optional: minimum coverage enforce karo -->
        <execution>
            <id>check</id>
            <goals><goal>check</goal></goals>
            <configuration>
                <rules>
                    <rule>
                        <limits>
                            <!-- 80% line coverage minimum -->
                            <limit>
                                <counter>LINE</counter>
                                <value>COVEREDRATIO</value>
                                <minimum>0.80</minimum>
                            </limit>
                        </limits>
                    </rule>
                </rules>
            </configuration>
        </execution>
    </executions>
</plugin>
```

```bash
mvn verify  # Tests run karo + report generate karo
# Report yahan milega:
open target/site/jacoco/index.html
```

> [!warning] JaCoCo + Lombok Gotcha
> Lombok-generated methods (getters, constructors, builders) coverage mein show hote hain lekin tumhara koi control nahi unhein test karne ka. Inhe exclude karo:
>
> ```xml
> <configuration>
>     <excludes>
>         <exclude>**/*$Builder.class</exclude>
>         <exclude>**/*MapperImpl.class</exclude>
>     </excludes>
> </configuration>
> ```

---

## API Docs: `swagger-jsdoc` ↔ `springdoc-openapi`

Node mein manually JSDoc annotations likhte the ya tsoa use karte the. Spring Boot mein **springdoc-openapi** code se automatically Swagger UI generate karta hai:

```xml
<dependency>
    <groupId>org.springdoc</groupId>
    <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
    <version>2.6.0</version>
</dependency>
```

Bas itna karo — app start karo aur `/swagger-ui.html` pe jaao. Automatically sari APIs list ho jaayengi.

Enrich karna hai toh annotations use karo:

```java
@RestController
@RequestMapping("/orders")
@Tag(name = "Orders", description = "Order management APIs")  // Swagger grouping
public class OrderController {

    @Operation(
        summary = "Place a new order",
        description = "Creates an order for authenticated user. Validates stock before placing."
    )
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "Order created successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid request body"),
        @ApiResponse(responseCode = "402", description = "Payment failed")
    })
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OrderResponse placeOrder(
        @RequestBody @Valid PlaceOrderRequest req,
        @Parameter(hidden = true) @AuthenticationPrincipal User user
    ) {
        return orderService.place(req, user);
    }
}
```

```yaml
# application.yml mein configure karo
springdoc:
  api-docs:
    path: /api-docs  # JSON spec endpoint
  swagger-ui:
    path: /swagger-ui.html
    operations-sorter: alpha  # Alphabetically sort
  show-actuator: false  # Actuator endpoints hide karo
```

---

## Package Manager: `npm` ↔ Maven/Gradle

Yeh concept tum pehle cover kar chuke hoge, lekin workflow comparison useful hai:

### Workflow Side-by-Side

| Stage     | TS Workflow                          | Java Workflow                              |
| --------- | ------------------------------------ | ------------------------------------------ |
| Init      | `npm init`, `tsc --init`             | `start.spring.io` ya `mvn archetype:generate` |
| Install   | `npm install`                        | `pom.xml` edit karo, IDE auto-fetch karta  |
| Run dev   | `nodemon src/index.ts`               | `mvn spring-boot:run` (devtools active)    |
| Test      | `jest` ya `npx vitest`               | `mvn test`                                 |
| Lint      | `eslint .`                           | `mvn checkstyle:check spotless:check`      |
| Format    | `prettier --write .`                 | `mvn spotless:apply`                       |
| Build     | `tsc && esbuild`                     | `mvn package` → `target/app.jar`           |
| Run prod  | `node dist/index.js`                 | `java -jar target/app.jar`                 |
| Add dep   | `npm install express`                | `pom.xml` mein `<dependency>` add karo     |
| Lock file | `package-lock.json`                  | `pom.xml` (exact version already declare)  |

### Minimal `pom.xml` — Production-Ready Starter

```xml
<project xmlns="http://maven.apache.org/POM/4.0.0">
    <modelVersion>4.0.0</modelVersion>

    <!-- Project identity -->
    <groupId>com.acme</groupId>
    <artifactId>my-app</artifactId>
    <version>1.0.0</version>
    <packaging>jar</packaging>

    <!-- Spring Boot parent — version management handle karta hai -->
    <!-- npm ka "engines" field jaisa — sab compatible versions fix karta hai -->
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.3.4</version>
    </parent>

    <properties>
        <java.version>21</java.version>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
    </properties>

    <dependencies>
        <!-- Web REST APIs ke liye -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>

        <!-- Validation (@Valid, @NotBlank etc) -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-validation</artifactId>
        </dependency>

        <!-- Hot reload for development -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-devtools</artifactId>
            <scope>runtime</scope>
            <optional>true</optional>  <!-- Production JAR mein nahi jayega -->
        </dependency>

        <!-- Testing (JUnit5 + Mockito + AssertJ — sab bundled hain) -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <!-- Fat JAR banata hai — sab dependencies included -->
            <!-- npm build + bundler ka kaam yahi karta hai -->
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
                <!-- Lombok use karo toh exclude karo final JAR se -->
                <configuration>
                    <excludes>
                        <exclude>
                            <groupId>org.projectlombok</groupId>
                            <artifactId>lombok</artifactId>
                        </exclude>
                    </excludes>
                </configuration>
            </plugin>

            <!-- Code formatting -->
            <plugin>
                <groupId>com.diffplug.spotless</groupId>
                <artifactId>spotless-maven-plugin</artifactId>
                <version>2.43.0</version>
                <configuration>
                    <java>
                        <googleJavaFormat>
                            <version>1.22.0</version>
                        </googleJavaFormat>
                        <removeUnusedImports/>
                    </java>
                </configuration>
            </plugin>

            <!-- Coverage reporting -->
            <plugin>
                <groupId>org.jacoco</groupId>
                <artifactId>jacoco-maven-plugin</artifactId>
                <version>0.8.12</version>
                <executions>
                    <execution><goals><goal>prepare-agent</goal></goals></execution>
                    <execution>
                        <id>report</id>
                        <phase>verify</phase>
                        <goals><goal>report</goal></goals>
                    </execution>
                </executions>
            </plugin>
        </plugins>
    </build>
</project>
```

---

## Process Management: `pm2` ↔ `java -jar` + systemd/Docker

Node mein `pm2` process ko alive rakhta tha, crash pe restart karta tha, logs manage karta tha. Java mein yeh OS-level tools karte hain:

### Production pe Deploy (systemd)

```ini
# /etc/systemd/system/myapp.service
[Unit]
Description=My Spring Boot App
After=network.target

[Service]
User=appuser
WorkingDirectory=/opt/myapp
# pm2 ke --max-memory-restart jaisa — JVM heap limit
ExecStart=/usr/bin/java -Xmx512m -jar /opt/myapp/app.jar \
    --spring.profiles.active=prod
SuccessExitStatus=143
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
systemctl enable myapp   # Boot pe start karo
systemctl start myapp    # Start karo
systemctl status myapp   # Status dekho
journalctl -u myapp -f   # pm2 logs ke jaisa — real-time logs
```

### Docker mein (Recommended Modern Approach)

```dockerfile
# Multi-stage build — final image small rehti hai
FROM eclipse-temurin:21-jre-alpine AS base
WORKDIR /app

# Build stage
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
# Dependencies cache karo (layer caching — npm ci jaisa)
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn package -DskipTests -B

# Runtime stage — sirf JRE chahiye, Maven nahi
FROM base
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

---

## Gotchas — Common Galtiyan Jo Beginners Karte Hain

> [!warning] Tooling Traps — Dhyan Rakho

**1. DevTools production mein mat jaane do**
`optional: true` aur `scope: runtime` dono lagao. Warna production JAR mein classpath watching active rahegi — memory waste aur security risk.

**2. `mvn spring-boot:run` aur IDE auto-build simultaneously mat chalao**
`mvn spring-boot:run` apna isolated classloader use karta hai. IDE auto-build changes wahan nahi dikhte. Ya toh IDE se run karo (recommended), ya Maven terminal se.

**3. `logback.xml` nahi, `logback-spring.xml` use karo**
`logback.xml` Spring initialize hone se pehle load hota hai — Spring properties (`${spring.application.name}` etc.) available nahi hoti. `-spring.xml` variant Spring ke baad load hota hai.

**4. Profile-specific YAML runtime pe reload nahi hota**
`application-prod.yml` change kiya? App restart karna padega. Node ke `dotenv` ki tarah nahi hai — woh environment se read karta hai. Spring YAML file-based config hai.

**5. JaCoCo + Lombok generated code = fake low coverage**
Lombok `@Data`, `@Builder` se generated classes/methods coverage mein count hoti hain lekin tumhara control nahi. Exclusions configure karo.

**6. `jshell` Spring beans nahi jaanta**
`jshell` ek plain Java REPL hai — Spring context nahi hota. Service ya repository test karna hai? `@SpringBootTest` method likho aur `Ctrl+Shift+F10` karo.

**7. `${ENV_VAR}` vs `${env.ENV_VAR}` — confusion mat lo**
`application.yml` mein: `${DATABASE_URL}` directly OS env var reference karta hai.
`logback-spring.xml` mein: `${DB_URL}` ka syntax alag hota hai — `springProperty` element use karo.

**8. Type Erasure aur Mockito**
Generic types mock karte waqt `@SuppressWarnings("unchecked")` add karna pad sakta hai. Yeh Java ki generics limitation hai, Mockito ki bug nahi.

---

## Key Takeaways

- **Har Node tool ka Java equivalent hai** — ecosystem 20+ saal purana hai, sab kuch exist karta hai
- **DevTools = nodemon** lekin smarter — sirf tumhara code reload karta hai, libraries nahi; IntelliJ auto-build enable karo
- **JUnit 5 + Mockito + AssertJ = jest ka poora toolkit** — alag packages hain lekin saath kaam karte hain; `spring-boot-starter-test` sab bundled deta hai
- **MockMvc = supertest** — bina real server ke HTTP test karo; `@WebMvcTest` fast hai kyunki sirf web layer load hoti hai
- **`application.yml` + profiles = dotenv ka steroids version** — environment-specific overrides, typed config, priority hierarchy sab built-in
- **`@ConfigurationProperties` = type-safe env config** — `process.env.SOMETHING` scatter hone ki jagah ek typed record mein sab
- **SLF4J = logging abstraction** — implementation swap karo bina code change kiye; `{}` placeholders string concat se fast hain
- **`logback-spring.xml` use karo, `logback.xml` nahi** — Spring properties support chahiye toh `-spring` variant zaroori hai
- **JaCoCo = c8/nyc** — `mvn verify` ke baad `target/site/jacoco/index.html` mein HTML report milta hai; Lombok exclusions configure karo
- **Fat JAR = bundler ka kaam** — `mvn package` ek self-contained JAR banata hai jisme sab dependencies hain; `java -jar` se run karo — koi separate bundler nahi chahiye
- **Spotless = prettier** — `mvn spotless:apply` auto-format karta hai; CI mein `spotless:check` fail karega agar code unformatted ho
