# Spring Boot Test (Context & Slices)

> [!info] Express/TS dev ke liye
> Node mein tumhare paas do hi options hote hain — ya to unit test likho (sab kuch mock kar do), ya poora `app.listen()` boot karke integration test chalao. Spring Boot ek teesra option deta hai: **slices**. Matlab poora application context load karne ke bajaye sirf woh layer load karo jiski zaroorat hai — sirf web layer, sirf JPA layer, sirf JSON serializers. Isse test suite bohot fast chalta hai, kyunki poora context boot karna mehenga (slow) operation hai.

## Concept

Kya hota hai jab test ko Spring chahiye hota hai? Jaise DI (dependency injection), `@Value` se config values, ya autoconfigured beans — in sab ke liye ek `ApplicationContext` load karna padta hai. Ab yeh context kitna "bhara-pura" hoga, yeh depend karta hai kaunsa annotation use kar rahe ho:

| Annotation | Kya load hota hai | Kab use karo |
|------------|-----------|---------|
| `@SpringBootTest` | Poora app context (saare beans, autoconfig) | End-to-end integration tests |
| `@WebMvcTest(FooController.class)` | Sirf MVC layer (controllers, filters, MockMvc). JPA nahi, service beans by default nahi. | Controller tests |
| `@DataJpaTest` | JPA + embedded DB + repos. Har test ke baad rollback. | Repository tests |
| `@JsonTest` | Jackson + JSON serializers | (De)serialization tests |
| `@WebFluxTest` | Reactive web layer | Reactive controller tests |
| `@RestClientTest` | `RestTemplate`/`WebClient` test support | Outbound HTTP client tests |
| `@DataMongoTest`, `@DataR2dbcTest`, etc. | Tech-specific data slices | Mongo, R2DBC, waghera |

Socho ek Zomato jaisa bada backend hai — usme controllers, services, repositories, notification senders, sab kuch hai. Agar tumhe sirf yeh test karna hai ki "order create hone par sahi JSON response aata hai ya nahi", to poora backend (payment gateway, SMS service, sab) boot karne ki zarurat nahi. `@WebMvcTest` bas controller layer load karega, baaki sab mock kar doge. Yehi slicing ka fayda hai — sirf zaroori tukda load karo, test fast chalega.

### `@MockBean` aur `@SpyBean`

Spring test ke andar, `@MockBean` context mein maujood ek real bean ko Mockito ke mock se replace kar deta hai. `@SpyBean` real bean ko wrap karke spy bana deta hai — matlab asli implementation chalti rahegi, lekin tum verify bhi kar sakte ho ki kaunse methods call hue.

> [!warning] Spring Boot 3.4 se `@MockBean` **deprecated** ho chuka hai, iski jagah `@MockitoBean`/`@MockitoSpyBean` use karo. Naye code mein hamesha naye wale hi likho.

## Code example

### Full context test

Yeh sabse "heavy" test hai — poora Spring context boot hota hai, jaise production mein app start hoti hai:

```java
@SpringBootTest
@AutoConfigureMockMvc
class ApplicationIT {

    @Autowired MockMvc mvc;
    @Autowired UserRepository repo;

    @MockitoBean EmailService email;  // replace real bean with mock

    @Test
    void registerUser_persistsAndEmails() throws Exception {
        mvc.perform(post("/api/users")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    { "email":"a@b.com", "name":"Alice" }
                """))
            .andExpect(status().isCreated());

        assertThat(repo.findByEmail("a@b.com")).isPresent();
        verify(email).sendWelcome("a@b.com");
    }
}
```

Yahan pe email service ko real nahi rakha — kyun? Kyunki test mein actual email bhejna nahi chahte (na koi real inbox spam karna hai, na SMTP server pe depend karna hai). Isliye `@MockitoBean` se replace kar diya, aur baad mein `verify()` se check kiya ki `sendWelcome` call hua ya nahi.

`@SpringBootTest(webEnvironment = ...)` ke options samajh lo:
- `MOCK` (default) — koi real server nahi chalta; `MockMvc` use hota hai (fake HTTP requests, bina actual port khole).
- `RANDOM_PORT` — real Tomcat ek random port pe chalu hota hai; `TestRestTemplate` / `WebTestClient` se real HTTP calls karte ho.
- `DEFINED_PORT` — real Tomcat configured (fixed) port pe.
- `NONE` — koi web environment hi nahi (jaise sirf background job test karna ho).

> [!tip] Jab tak zarurat na ho, `RANDOM_PORT` avoid karo — real server start hona matlab slower tests. `MOCK` mostly kaafi hota hai.

### `@WebMvcTest` — controller slice

Ab yeh sabse common slice hai. Socho tumhe sirf yeh check karna hai ki controller sahi status code aur JSON de raha hai — service layer ka real logic test karne ki zarurat nahi (uska apna alag unit test hoga):

```java
@WebMvcTest(UserController.class)
class UserControllerTest {

    @Autowired MockMvc mvc;

    @MockitoBean UserService userService;  // service is NOT in this slice; mock it

    @Test
    void getUser_returnsJson() throws Exception {
        when(userService.find(1L)).thenReturn(new User(1L, "Alice"));

        mvc.perform(get("/api/users/1"))
           .andExpect(status().isOk())
           .andExpect(jsonPath("$.name").value("Alice"));
    }

    @Test
    void getUser_notFound() throws Exception {
        when(userService.find(99L)).thenThrow(new NotFoundException());

        mvc.perform(get("/api/users/99"))
           .andExpect(status().isNotFound());
    }
}
```

Kya load hota hai: `@Controller`, `@ControllerAdvice`, `Filter`, `WebMvcConfigurer`, Jackson, MockMvc.
Kya **nahi** load hota: `@Service`, `@Repository`, `@Component`. Inko mock karna hi padega, warna `ApplicationContext` fail ho jayega (bean not found).

Node/Express se compare karo — yeh waise hi hai jaise tum Express route handler ko test karte waqt service layer ko `jest.mock()` se mock kar dete ho, aur sirf route ka behavior check karte ho.

### `@DataJpaTest` — repo slice

Yeh slice sirf database/JPA layer test karne ke liye hai:

```java
@DataJpaTest
class UserRepositoryTest {

    @Autowired UserRepository repo;
    @Autowired TestEntityManager em;

    @Test
    void findByEmail_returnsUser() {
        em.persist(new User("a@b.com", "Alice"));
        em.flush();

        assertThat(repo.findByEmail("a@b.com")).isPresent();
    }
}
```

Default behavior samajh lo `@DataJpaTest` ka:
- Ek **embedded DB** use karta hai (H2, agar classpath pe available hai) — real Postgres chahiye to [[06-Testcontainers]] dekho.
- Har test ko ek **rollback transaction** mein wrap kar deta hai — matlab test khatam hote hi saara data wapas gayab, agla test bilkul fresh state se shuru hota hai. IRCTC ki booking test karte waqt agar har baar seat book ho jaaye aur wapas na ho, to system garbage se bhar jaayega — rollback isi problem se bachata hai.
- Hibernate, repositories, `TestEntityManager` — sab configure kar deta hai.
- Poora autoconfig disable rehta hai (controllers, services waghera load nahi hote).

Agar tumhe H2 ke bajaye asli configured DB use karna hai:

```java
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class UserRepositoryTest { ... }
```

### `@JsonTest`

Sirf yeh check karna hai ki tumhara object sahi JSON mein serialize ho raha hai ya nahi — poora context boot karne ki zarurat nahi:

```java
@JsonTest
class UserJsonTest {

    @Autowired JacksonTester<User> json;

    @Test
    void serializes() throws Exception {
        var user = new User(1L, "Alice");
        assertThat(json.write(user))
            .hasJsonPathStringValue("$.name")
            .extractingJsonPathStringValue("$.name").isEqualTo("Alice");
    }
}
```

### Configuration

Test-specific config alag file mein rakhna best practice hai:

```yaml
# src/test/resources/application.yml
spring:
  datasource:
    url: jdbc:h2:mem:testdb
  jpa:
    hibernate:
      ddl-auto: create-drop
logging:
  level:
    org.hibernate.SQL: debug
```

## Express/Node comparison

| Spring | Node |
|--------|------|
| `@SpringBootTest` (MOCK) | `request(app)` with `supertest` (no listen) |
| `@SpringBootTest(RANDOM_PORT)` | `app.listen(0)` then test against URL |
| `@WebMvcTest` | (koi seedha equivalent nahi — Node ya to sab load karta hai ya manually mock karna padta hai) |
| `@DataJpaTest` | test DB spin up karna aur tumhara `prisma`/`typeorm` |
| `@MockitoBean` | ek registered DI binding ko override karna (NestJS ka `overrideProvider`) |
| Context caching across tests | (manual — built-in nahi hai) |

NestJS sabse close analog hai — `Test.createTestingModule()` ek partial DI container banata hai, bilkul Spring slices jaisa. Agar tumne kabhi NestJS mein testing module banaya hai, to Spring slices ka concept turant click ho jayega.

## Gotchas

> [!warning] Slow context = slow suite
> `@SpringBootTest` + `@MockitoBean` + `@TestPropertySource` ka har unique combination ek **alag** cached context banata hai. Socho tumhare paas 200 test classes hain aur har ek thoda alag config use kar raha hai — CI mein saare contexts ke liye memory chahiye, aur woh OOM (out of memory) crash ho sakta hai. Isliye apna test config standardize karo, taaki jyada se jyada tests ek hi cached context reuse karein.

> [!warning] `@WebMvcTest` security nahi load karta — yeh galat sochna hai!
> Sach yeh hai ki agar `spring-boot-starter-security` classpath pe hai, to `@WebMvcTest` Spring Security ko bhi load kar deta hai — aur yeh baat sabko surprise karti hai. Iska matlab tumhare protected endpoints test mein `401`/`403` de sakte hain jab tumne security expect hi nahi ki thi. Isse handle karne ke do tareeke: ya to security disable kar do (`@AutoConfigureMockMvc(addFilters = false)`), ya `@WithMockUser` ke saath authenticated user simulate karo.

> [!warning] `@DataJpaTest` transactions rollback karta hai
> Isliye `repo.save()` call karne se turant DB mein flush nahi hota — jab tak tum khud `em.flush()` call na karo ya `TestEntityManager` use na karo. Hibernate kabhi-kabhi SQL tab tak execute hi nahi karta jab tak flush na ho. Agar tumhara test "save karke phir raw SQL query se check karo" jaisa pattern follow kar raha hai, to yeh gotcha tumhe confuse kar sakta hai.

> [!tip] Extra config ke liye `@Import` use karo
> Agar slice test mein ek `@Configuration` class chahiye, to `@Import(MyConfig.class)` laga do.

> [!tip] Test-only beans ke liye `@TestConfiguration`
> Ek nested `@TestConfiguration` class tumhe test-specific beans dene deti hai, bina prod config ko pollute kiye. Jaise ek fake `Clock` bean jo fixed time return kare, taaki time-dependent logic reliably test ho sake.

## Related
- [[01-Testing-Pyramid-and-Tools]]
- [[05-MockMvc-and-WebTestClient]]
- [[06-Testcontainers]]
- [[07-Integration-Testing]]
- [[08-Test-Profiles-and-Properties]]
- [[../05-Spring-Boot/03-Auto-Configuration|Auto-configuration]]
