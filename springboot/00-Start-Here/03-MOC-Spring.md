# MOC: Spring (Core, Boot, Web, Data, Security)

> [!info] Yeh file kya hai?
> Spring bahut bada ecosystem hai — sirf ek library nahi, poora ek universe hai. Yeh MOC (Map of Content) tumhara curated entry point hai. Iske bina tum Spring ke jungle mein kho jaoge. Isko bookmark karo — baar baar yahan aana padega.

Socho Zomato ka backend. Har second lakho orders, restaurant listings, delivery tracking, payments, user auth — yeh sab ek saath chal raha hai. Node.js mein tum shayad Express + Fastify use karo, lekin enterprise Java world mein yeh sab Spring ke saath hota hai. Infosys, TCS, Wipro, Flipkart, Paytm, CRED — sab jagah Spring Boot milega. Isliye Spring seekhna ek career investment hai, ek cool side project nahi.

---

## Spring ka Big Picture — Pehle Samjho, Phir Karo

Agar Node.js se aa rahe ho, toh Spring pehli baar confusing lagega. Kyun? Kyunki Node mein tum manually sab wire karte ho — `const db = new Database(config)`, `const router = express.Router()`, sab kuch tumhare haath mein hota hai. Spring mein ulta hota hai — **framework khud decide karta hai ki kya kaise wire hoga**, aur tum sirf annotations lagate ho.

Yeh "magic" pehle scary lagta hai. Lekin yeh magic nahi — yeh **IoC (Inversion of Control)** hai, aur ek baar samjhne ke baad tum sochoge "yaar, Express mein yeh manually kyun karna padta tha?"

### Spring ka architecture ek building ki tarah hai:

```
┌─────────────────────────────────────────────────────┐
│                   SPRING SECURITY                    │  ← Darwaza (Authentication/Authorization)
├─────────────────────────────────────────────────────┤
│              SPRING WEB (MVC / WebFlux)              │  ← Reception (HTTP layer, REST APIs)
├─────────────────────────────────────────────────────┤
│               SPRING DATA (JPA etc.)                 │  ← Storage room (Database layer)
├─────────────────────────────────────────────────────┤
│                  SPRING BOOT                         │  ← Building manager (auto-configuration)
├─────────────────────────────────────────────────────┤
│                  SPRING CORE                         │  ← Foundation (IoC container, DI, AOP)
└─────────────────────────────────────────────────────┘
```

**Neev (Core) ke bina upar kuch nahi tik sakta.** Isliye reading order matter karta hai.

> [!tip] Reading Order — Isko Follow Karo
> **Core → Boot → Web → Data → Security**
>
> Bahut log Boot se shuru karte hain kyunki woh exciting lagta hai. Galat. Jab kuch break hoga — aur hoga zarur — tum Core concepts ke bina debug nahi kar paoge. Core samajho, phir baaki sab easy ho jaata hai.

---

## Spring Core — IoC Container (Yeh Sab Ki Jad Hai)

**Kya problem solve karta hai?**

Node.js mein tumhara code kuch aisa hota hai:

```typescript
// Node.js mein tum yeh manually karte ho
const userRepository = new UserRepository(dbConnection);
const emailService = new EmailService(smtpConfig);
const userService = new UserService(userRepository, emailService);
const userController = new UserController(userService);
```

Yeh theek hai jab app chhoti ho. Lekin Flipkart ka backend socho — hazaron classes, lakho dependencies. Manually wire karo toh life barbad. Spring ka IoC Container yeh sab automatically karta hai. Tum sirf bata do "mujhe UserService chahiye" aur container deta hai.

### Core ke topics:

- [[01-IoC-DI-Concepts]] — Inversion of Control aur Dependency Injection ka asli matlab. **Yeh pehle padho, seriously.** Bina iske Spring sirf copy-paste technology lagegi.

- [[02-Bean-Lifecycle]] — Jab Spring ek object (Bean) banata hai toh kya hota hai? `instantiation → dependency injection → @PostConstruct → ready → @PreDestroy → destroy`. Database connections, caches — lifecycle samajhna zaruri hai.

- [[03-Component-Scanning]] — `@Component`, `@Service`, `@Repository`, `@Controller` — yeh sirf labels nahi hain. Spring inhe scan karke automatically beans banata hai. Node mein yeh manually `require` karte the.

- [[04-Configuration-Classes]] — Jab annotation se kaam nahi chalta, `@Configuration` + `@Bean` use karo. Third-party libraries (jo Spring aware nahi hain) ko integrate karne ke liye.

- [[05-Bean-Scopes]] — Default mein Spring ek hi object banata hai poori application ke liye (Singleton). Lekin kabhi kabhi har request ke liye alag object chahiye. Yeh scopes samjho — production bugs yahan se aate hain.

- [[06-Profiles]] — Dev, staging, production — alag alag config. Swiggy ka dev environment production data pe nahi chalta. Profiles isi ke liye hain.

- [[07-AOP-and-Proxies]] — **Yeh samjho toh `@Transactional` samjhoge.** AOP yaani Aspect Oriented Programming — cross-cutting concerns (logging, transactions, caching) ko business logic se alag karna. Spring yeh proxy objects ke through karta hai. Bahut log `@Transactional` use karte hain bina yeh jaane ki woh actually kaise kaam karta hai — yahi production mein silent data corruption ka reason banta hai.

- [[08-ApplicationContext-and-Events]] — Spring ka event system. Ek part doosre part ko directly call kiye bina communicate kar sakta hai. `@EventListener` se loosely coupled architecture.

> [!warning] Sabse Bada Beginner Mistake
> Core skip karke seedha Boot pe jaana. Phir jab `@Autowired` kaam nahi karta, ya circular dependency aati hai, ya `@Transactional` silently fail hoti hai — tum clueless khade rehte ho. **Core padho. Core padho. Core padho.**

---

## Spring Boot — Convention Over Configuration (Magic Ka Asli Raaz)

**Kya hota hai Spring Boot ke bina?**

Plain Spring mein ek REST API banana ke liye tumhe XML files likhni padti thi, `web.xml` configure karna padta tha, Tomcat manually setup karna padta tha — ghante lag jaate the sirf "Hello World" ke liye. Spring Boot ne yeh sab khatam kar diya.

Node.js analogy: Spring Boot waisa hai jaise `create-react-app` ya `nest new my-app` — ek command mein poora structure ready. Lekin isse bhi zyada — woh automatically guess karta hai tumhara configuration. Database driver classpath mein hai? Automatically DataSource configure ho jaata hai. Spring Security add kiya? Authentication automatically on.

Yeh "magic" `@EnableAutoConfiguration` hai — ek massive list of `@Conditional` checks jo decide karti hain ki kya configure karna hai.

### Boot ke topics:

- [[01-Spring-Boot-Project-Layout]] — Standard directory structure. `src/main/java`, `src/main/resources`, `src/test`. Maven/Gradle build. Pehle din ka confusion khatam.

- [[02-Spring-Boot-Auto-Configuration]] — **Yeh topic Spring Boot ka dil hai.** `spring.factories` file mein 100+ auto-configurations hain. Samjho ki woh kaise decide karta hai kya configure karna hai aur kaise override karo.

- [[03-Application-Properties-and-YAML]] — `application.properties` ya `application.yml` — yahan sab configure hota hai. Port, database URL, logging level. Node mein `.env` file jaisi baat hai, lekin bahut zyada powerful.

- [[04-Configuration-Properties]] — Typed config with `@ConfigurationProperties`. Plain `@Value` se better — type-safe, IDE support milta hai, validation bhi.

- [[05-Starters-Explained]] — `spring-boot-starter-web` ek dependency hai jo 15 transitive dependencies leke aati hai. Kya kya aata hai? Tomcat, Spring MVC, Jackson, Validation — sab. Samjho taaki conflicts debug kar sako.

- [[06-Profiles-Per-Environment]] — `application-dev.yml`, `application-prod.yml`. Paytm ka production database URL dev environment mein nahi jaana chahiye. Profiles isko handle karte hain.

- [[07-DevTools-and-Live-Reload]] — Development speed ke liye. Code change karo, automatic restart. Node mein `nodemon` jaisi baat.

- [[08-Conditional-Auto-Configuration]] — `@ConditionalOnClass`, `@ConditionalOnProperty`, `@ConditionalOnMissingBean`. Apni custom auto-configuration likhna — advanced but powerful.

> [!info] Virtual Threads aur WebFlux
> Spring reactive stack (`spring-boot-starter-webflux`) bhi hai. Lekin JDK 21+ ke virtual threads ke saath, zyada cases mein reactive nahi chahiye. Pehle [[05-Virtual-Threads]] padho before adopting reactive — warna unnecessary complexity le loge.

---

## Web Layer — REST APIs (Yeh Woh Hissa Hai Jo User Dekhta Hai)

**Tum yahan bahut time bitaoge.** Zomato ka `/api/restaurants`, Swiggy ka `/api/orders`, IRCTC ka `/api/trains` — yeh sab web layer hai.

Node/Express analogy:
```typescript
// Express mein
app.get('/users/:id', async (req, res) => {
  const user = await userService.findById(req.params.id);
  res.json(user);
});
```

Spring mein yeh kuch aisa dikhta hai:
```java
// Spring mein — zyada annotations, lekin bahut zyada features built-in
@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserService userService;

    @GetMapping("/{id}")
    public ResponseEntity<UserDto> getUser(@PathVariable Long id) {
        return ResponseEntity.ok(userService.findById(id));
    }
}
```

### Web layer ke topics:

- [[01-REST-Controllers]] — `@RestController`, `@RequestMapping`. `@Controller` vs `@RestController` ka fark. Request handling ka basic setup.

- [[02-Request-Mapping-and-Path-Variables]] — `@PathVariable` (URL se), `@RequestParam` (query string se), `@RequestBody` (JSON body se), `@RequestHeader` (headers se). Sab milake poori HTTP request map hoti hai.

- [[03-DTOs-and-Serialization]] — **Data Transfer Objects — production mein critical.** Apni Entity class directly expose mat karo API response mein. Kyun? Infinite loops (circular references), security leaks (password fields expose ho jaate hain), tight coupling. DTO alag rakho. Jackson serialization/deserialization ka deep dive.

- [[04-Bean-Validation]] — `@Valid`, `@NotBlank`, `@Size`, `@Email`, `@Min`, `@Max`, custom validators. UPI payment amount validate karna? IRCTC passenger age validate karna? Yahan hota hai. Node mein Zod ya Joi use karte the — yeh Spring ka equivalent.

- [[05-Exception-Handlers-and-ProblemDetail]] — **Yeh bahut zaruri hai.** `@ControllerAdvice` + `@ExceptionHandler` se centralized error handling. RFC 7807 standard ke `ProblemDetail` response format. Har controller mein try-catch likhna band karo.

- [[06-Content-Negotiation]] — Same endpoint JSON bhi return kar sakta hai, XML bhi. `Accept` header ke basis pe. Enterprise applications mein useful.

- [[07-File-Uploads]] — Multipart file upload. BigBasket pe product image upload, Ola pe document upload — yeh sab yahan se aata hai.

- [[08-CORS-Configuration]] — React frontend alag domain pe hai, Spring backend alag pe — CORS errors. Isko configure karna mandatory hai.

- [[09-OpenAPI-Swagger]] — Springdoc se automatic API documentation. `/swagger-ui.html` pe interactive docs. Frontend developers ke saath kaam karte waqt lifesaver.

- [[10-WebClient-and-RestClient]] — Tumhara Spring app doosri APIs bhi call karta hoga — payment gateway, SMS service, maps API. `WebClient` (reactive) ya naya `RestClient` iske liye. Node mein `axios` ya `fetch` use karte the.

> [!warning] Common Gotcha — DTO Use Nahi Karna
> Seedha Entity ko `@ResponseBody` se return karne ki galti bahut log karte hain. Jab `@OneToMany` relationships hain, Jackson infinite loop mein ghus jaata hai aur `StackOverflowError`. Ya password field user ko dikhta hai. DTOs use karo — hamesha.

---

## Persistence — Spring Data JPA (Database Ki Duniya)

**Kya hota hai yahan?**

Har production app ko data store karna padta hai — PostgreSQL, MySQL, ya kuch aur. JPA (Java Persistence API) ek specification hai, Hibernate uska implementation. Spring Data JPA iske upar ek aur layer lagata hai jo boilerplate khatam karta hai.

Node.js analogy: Prisma ya TypeORM jaise hai, lekin bahut zyada mature aur feature-rich. Aur bahut zyada gotchas bhi.

```java
// Spring Data mein yeh method automatically implement ho jaata hai
// Koi SQL likhni nahi — method name se query derive hoti hai
List<User> findByEmailAndActiveTrue(String email);

// Ya JPQL
@Query("SELECT u FROM User u WHERE u.createdAt > :date")
List<User> findUsersCreatedAfter(@Param("date") LocalDateTime date);
```

### Data ke topics:

- [[01-JPA-Hibernate-Basics]] — JPA specification kya hai, Hibernate kaise implement karta hai. `EntityManager`, persistence context — yeh concepts samjho toh bugs zyada nahi aate.

- [[02-Entity-Basics]] — `@Entity`, `@Id`, `@GeneratedValue`, `@Column`, `@Table`. Database table ko Java class se map karna. Ek Zomato `Restaurant` entity kaise likhi jaayegi?

- [[03-Spring-Data-Repositories]] — `JpaRepository` extend karo aur 20+ methods free mein milti hain — `findById`, `save`, `delete`, `findAll`. Derived query methods se bina SQL likhe complex queries.

- [[04-Query-Methods-and-JPQL]] — Jab derived queries kafi nahi hoti, `@Query` use karo. JPQL (Java objects pe query), native SQL bhi possible. Named queries, pagination, sorting.

- [[05-Transactions]] — `@Transactional` ka sahi use. Propagation levels (REQUIRED, REQUIRES_NEW, NESTED). Isolation levels. **Yeh galat use karo toh data inconsistency aayegi production mein.**

- [[06-Relationships-and-Lazy-Loading]] — `@OneToMany`, `@ManyToOne`, `@ManyToMany`, `@OneToOne`. **Aur sabse important — LAZY vs EAGER loading.** Galat choice karo toh ya N+1 problem aayega ya poora database ek request mein load ho jaayega.

- [[07-N-Plus-1-and-Fetch-Strategies]] — **Yeh Spring Data ka #1 performance trap hai.** 100 restaurants fetch karo, phir har restaurant ke liye alag query — 101 queries total instead of 1. CRED ka backend agar yeh galti kare toh server crash. `JOIN FETCH`, `@EntityGraph`, batch fetching — solutions yahan hain.

- [[08-Migrations-Flyway-Liquibase]] — Database schema kaise evolve hoti hai over time. Flyway ya Liquibase se version-controlled migrations. "Production pe kisi ne table alter kar li manually" — yeh disaster avoid karna hai toh migrations use karo.

- [[09-Auditing]] — `@CreatedDate`, `@LastModifiedDate`, `@CreatedBy`, `@LastModifiedBy`. Automatically track karo ki kab create hua, kab update hua. Har enterprise app mein chahiye.

- [[10-Specifications-and-Criteria-API]] — Dynamic queries — filter karo multiple optional params pe. Flipkart product search — category bhi filter ho sakti hai, price range bhi, brand bhi — runtime pe decide hota hai kaunse filters apply karne hain.

- [[11-Projections-and-DTOs]] — Poori entity fetch mat karo jab sirf 2-3 fields chahiye. Interface projections, class-based projections se specific fields fetch karo. Performance ka bada farak padta hai.

> [!warning] N+1 Problem — Production Ka Sabse Bada Dushman
> Naya developer `findAll()` karta hai, phir loop mein har entity ke related data access karta hai. 1000 rows hain? 1001 database queries. Swiggy ka server slow ho jaayega. **Pehle din se `@EntityGraph` ya `JOIN FETCH` seekho.**

---

## Security — Ek Bhi Endpoint Unsecured Mat Chhodo

**Kyun critical hai?**

UPI transaction bina authentication ke ho jaaye? Kisi ka Paytm wallet zero ho jaaye unauthorized request se? Security sirf "feature" nahi — yeh existential requirement hai.

Spring Security ek powerful (aur initially confusing) framework hai. Node mein tum manually JWT verify karte the middleware mein — Spring Security mein ek declarative approach hai.

```java
// Spring Security ka filter chain — har request isse guzarti hai
@Bean
public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    return http
        .authorizeHttpRequests(auth -> auth
            .requestMatchers("/api/public/**").permitAll()          // Public endpoints
            .requestMatchers("/api/admin/**").hasRole("ADMIN")      // Admin only
            .anyRequest().authenticated()                           // Baaki sab authenticated
        )
        .oauth2ResourceServer(oauth2 -> oauth2.jwt(Customizer.withDefaults()))  // JWT validation
        .sessionManagement(session -> session
            .sessionCreationPolicy(SessionCreationPolicy.STATELESS) // REST APIs stateless hoti hain
        )
        .build();
}
```

### Security ke topics:

- [[01-Spring-Security-Basics]] — Filter chain kya hota hai. Har HTTP request Spring Security ke filters se guzarti hai. Yeh architecture samjho pehle — phir configuration easy lagegi.

- [[02-Authentication-vs-Authorization]] — Authentication: "Tum kaun ho?" (Login). Authorization: "Tumhe yeh karne ka haq hai?" (Permissions). Dono alag cheezein hain, dono zaruri hain.

- [[03-Password-Encoding]] — `BCryptPasswordEncoder`, `Argon2PasswordEncoder`. **Plain text password kabhi nahi store karna** — yeh basic hai lekin bahut log bhool jaate hain shuruat mein. Salt, work factor, one-way hashing.

- [[04-JWT-with-Spring-Security]] — JSON Web Tokens — stateless authentication ke liye. Token generate karo, validate karo, claims extract karo. `spring-security-oauth2-resource-server` ka use. CRED jaisi apps mein JWT hi use hota hai.

- [[05-OAuth2-OIDC-with-Spring]] — "Google se login karo", "GitHub se login karo" — yeh OAuth2 hai. Resource Server (token validate karna) aur Client (token obtain karna) — dono sides.

- [[06-Method-Level-Security]] — Controller level pe nahi, service method pe security. `@PreAuthorize("hasRole('ADMIN')")`, `@PostAuthorize`. SpEL expressions se fine-grained access control.

- [[07-CSRF-Sessions-and-Stateless-APIs]] — CSRF attacks kya hain, stateless REST APIs mein CSRF ki zarurat kyun nahi. Session management — cookies vs JWT. Yeh concept clear karo warna production mein security holes rahenge.

- [[08-CORS-and-Security]] — Spring Security aur CORS configuration ek saath kaise kaam karte hain. Dono jagah configure karna padta hai — sirf `@CrossOrigin` se kaam nahi chalta jab Security enabled ho.

> [!warning] Spring Security Ki Sabse Badi Gotcha
> Bahut log security filter chain configure karte hain lekin method-level security enable karna bhool jaate hain. `@EnableMethodSecurity` annotation add karo — tabhi `@PreAuthorize` kaam karega. Bina iske woh silently ignore hoti hai.

---

## Testing — Production Mein Jaane Se Pehle

**Kyun test likhna padta hai?**

IRCTC ka ticketing system bina tests ke deploy ho jaaye aur tatkal booking fail hone lage? Paytm ka payment processing bug nikle production mein? Companies mein tum bina tests ke PR merge nahi kar sakte.

Spring mein testing ka ek layered approach hai — sab kuch `@SpringBootTest` se nahi test karte (bahut slow hota hai). Alag slices hain.

### Testing ke topics:

- [[01-Testing-Strategy]] — Testing pyramid: unit tests (zyada), integration tests (kam), E2E tests (bahut kam). Kab kaun sa Spring slice use karna.

- [[02-JUnit-5-Basics]] — JUnit 5 (Jupiter) — `@Test`, `@BeforeEach`, `@AfterEach`, `@ParameterizedTest`. Node mein Jest use karte the, yeh Spring ka equivalent.

- [[03-Mockito-and-AssertJ]] — Mockito se dependencies mock karo. AssertJ se readable assertions likho. `when(userService.findById(1L)).thenReturn(mockUser)` — yeh pattern production code mein everywhere milega.

- [[04-Spring-Boot-Test-Slices]] — **Yeh bahut important hai performance ke liye.**
  - `@WebMvcTest` — sirf web layer test karo, poora context load mat karo
  - `@DataJpaTest` — sirf JPA/database layer test karo
  - `@JsonTest` — sirf JSON serialization test karo
  - Full context tab load karo jab integration test likho

- [[05-Testcontainers]] — Real database use karo tests mein H2 in-memory ke bajaye. Docker container automatically start hota hai test ke liye. Bugs tab nahi milte jab real database behave differently karta hai.

- [[06-Integration-Tests]] — `@SpringBootTest` se poora application context load karo. `MockMvc` ya `RestAssured` se HTTP requests send karo. Slow but thorough.

```java
// @WebMvcTest example — sirf controller test karo
@WebMvcTest(UserController.class)
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean  // Service ko mock karo — real bean nahi chahiye
    private UserService userService;

    @Test
    void shouldReturn404WhenUserNotFound() throws Exception {
        when(userService.findById(99L)).thenThrow(new UserNotFoundException(99L));

        mockMvc.perform(get("/api/users/99"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.status").value(404));
    }
}
```

---

## Configuration & Operations — Production Ready App

App likh li, lekin deploy hone ke baad kaise pata chalega ki sab theek chal raha hai?

- [[01-Spring-Boot-Actuator]] — Production monitoring ke liye built-in endpoints. `/actuator/health` (app alive hai?), `/actuator/metrics` (performance), `/actuator/info`. Kubernetes health checks ke liye essential.

- [[02-Micrometer-Metrics]] — Prometheus, Datadog, New Relic ke saath metrics export karo. Custom business metrics bhi — "har minute kitne orders place hue?"

- [[03-Application-Properties-and-YAML]] — Config ka source of truth. Environment variables se override karo production mein (12-factor app principle).

- [[04-Configuration-Properties]] — Typed, validated configuration classes. `@ConfigurationProperties(prefix = "app.payment")` — sab config ek jagah, type-safe.

- [[05-Health-Checks-and-Readiness]] — Kubernetes mein liveness aur readiness probes. App start ho rahi hai lekin database connection nahi — readiness probe fail hogi, traffic nahi aayega. Yeh correct behavior hai.

---

## Cross-References — Aur Kahan Jaana Hai

Spring sirf ek starting point hai. Real world mein:

- [[04-MOC-Microservices]] — Jab ek Spring Boot app bahut badi ho jaaye aur multiple services mein todna padhe. Service discovery, API gateway, distributed tracing.

- [[01-Library-Cheatsheet]] — Companion libraries jo har Spring app mein milti hain:
  - **Lombok** — Boilerplate code reduce karo (`@Getter`, `@Setter`, `@Builder`, `@RequiredArgsConstructor`)
  - **MapStruct** — Entity to DTO mapping automatically generate karo
  - **Jackson** — JSON serialization/deserialization (Spring mein default)
  - **Caffeine** — In-memory caching (`@Cacheable`)
  - **Resilience4j** — Circuit breaker, retry, rate limiting (Hystrix ban gaya ab)

- [[06-FAQ-for-Express-Devs]] — Quick Q&A. "Express ka `app.use()` Spring mein kya hai?" — aise questions ke short answers.

---

## Suggested Study Path — Agar Sirf Panch Cheezein Karni Hain

> [!tip] Priority List — Yeh Panch Pehle Karo
>
> **1. [[01-IoC-DI-Concepts]]** — Spring ka pura framework isi foundation pe khada hai. Bina iske sab magic lagega.
>
> **2. [[02-Spring-Boot-Auto-Configuration]]** — Auto-configuration samjho — phir `@SpringBootApplication` ek rote-learned annotation nahi lagegi.
>
> **3. [[01-REST-Controllers]] + [[05-Exception-Handlers-and-ProblemDetail]]** — REST API banana aur errors properly handle karna — yeh basics hain jo har project mein chahiye.
>
> **4. [[02-Entity-Basics]] + [[07-N-Plus-1-and-Fetch-Strategies]]** — Database layer ka foundation aur sabse common performance bug. Dono ek saath seekho.
>
> **5. [[01-Spring-Security-Basics]] + [[04-JWT-with-Spring-Security]]** — Authentication aur JWT — modern REST APIs mein mandatory.

---

## Node.js Se Spring Boot Shift — Quick Orientation

| Node.js / Express | Spring Boot Equivalent |
|---|---|
| `express()` | `@SpringBootApplication` |
| `app.get('/path', handler)` | `@GetMapping("/path")` in `@RestController` |
| `app.use(middleware)` | Filters, `@ControllerAdvice` |
| `req.params.id` | `@PathVariable Long id` |
| `req.body` | `@RequestBody YourDto dto` |
| `res.json(data)` | `return ResponseEntity.ok(data)` |
| `try/catch` in every route | `@ExceptionHandler` in `@ControllerAdvice` |
| `.env` file | `application.properties` / `application.yml` |
| `process.env.PORT` | `server.port=8080` ya `${PORT:8080}` |
| Passport.js / JWT middleware | Spring Security filter chain |
| Prisma / TypeORM | Spring Data JPA + Hibernate |
| Jest | JUnit 5 + Mockito |
| Zod / Joi validation | Bean Validation (`@Valid`, `@NotBlank`) |
| Nodemon | Spring Boot DevTools |
| `axios` / `fetch` | `WebClient` / `RestClient` |

---

## Key Takeaways

- **Spring Core samjho pehle** — IoC, DI, Bean Lifecycle. Bina iske sab magic lagega aur debug karna impossible hoga.
- **Spring Boot = Spring + Auto-configuration** — Framework khud guess karta hai kya configure karna hai. `@SpringBootApplication` ke andar teen annotations hain.
- **Annotations sirf markers nahi hain** — `@Transactional`, `@Cacheable`, `@PreAuthorize` — yeh sab AOP proxies ke through kaam karte hain. Proxy ke bahar call karo toh kuch nahi hoga.
- **N+1 Problem se daro** — JPA ki sabse common performance trap. `JOIN FETCH` ya `@EntityGraph` seekho day one pe.
- **DTOs mandatory hain** — Entities directly expose mat karo. Security, circular reference, tight coupling — teen alag reasons.
- **Testing slices use karo** — Har test mein `@SpringBootTest` mat lagao, bahut slow hoga. `@WebMvcTest`, `@DataJpaTest` — right tool for right job.
- **Spring Security ka filter chain samjho** — Security sirf annotations lagane se nahi aati. Architecture samjho toh configuration easy ho jaati hai.
- **Reading order follow karo** — Core → Boot → Web → Data → Security. Shortcuts mat lo.

---

## Related

- [[00-README]]
- [[01-Learning-Path]]
- [[02-MOC-Java-Fundamentals]]
- [[04-MOC-Microservices]]
- [[05-Glossary]]
