---
tags: [testing, spring-boot, slices, integration]
aliases: [SpringBootTest, Test Slices]
stage: advanced
---

# Spring Boot Test (Context & Slices)

> [!info] For the Express/TS dev
> In Node, you either unit-test (mock everything) or boot the entire `app.listen()` for integration. Spring Boot offers a third option: **slices** — load just the web layer, just the JPA layer, just the JSON serializers, etc. This dramatically speeds up tests vs. a full context boot.

## Concept

When a test needs Spring (DI, `@Value`, autoconfigured beans), you load an `ApplicationContext`. There are several flavors:

| Annotation | What loads | Use for |
|------------|-----------|---------|
| `@SpringBootTest` | Full app context (all beans, autoconfig) | End-to-end integration tests |
| `@WebMvcTest(FooController.class)` | MVC layer only (controllers, filters, MockMvc). No JPA, no service beans by default. | Controller tests |
| `@DataJpaTest` | JPA + embedded DB + repos. Rolls back per test. | Repository tests |
| `@JsonTest` | Jackson + JSON serializers | (De)serialization tests |
| `@WebFluxTest` | Reactive web layer | Reactive controller tests |
| `@RestClientTest` | `RestTemplate`/`WebClient` test support | Outbound HTTP client tests |
| `@DataMongoTest`, `@DataR2dbcTest`, etc. | Tech-specific data slices | Mongo, R2DBC, etc. |

### `@MockBean` and `@SpyBean`

Inside a Spring test, `@MockBean` replaces a bean in the context with a Mockito mock. `@SpyBean` wraps the real bean as a spy.

> [!warning] As of Spring Boot 3.4, `@MockBean` is **deprecated** in favor of `@MockitoBean`/`@MockitoSpyBean`. Use the new ones in new code.

## Code example

### Full context test

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

`@SpringBootTest(webEnvironment = ...)`:
- `MOCK` (default) — no real server; use MockMvc.
- `RANDOM_PORT` — real Tomcat on a random port; use `TestRestTemplate` / `WebTestClient`.
- `DEFINED_PORT` — real Tomcat on configured port.
- `NONE` — no web environment.

### `@WebMvcTest` — controller slice

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

What's loaded: `@Controller`, `@ControllerAdvice`, `Filter`, `WebMvcConfigurer`, Jackson, MockMvc.
What's **not** loaded: `@Service`, `@Repository`, `@Component`. Mock them.

### `@DataJpaTest` — repo slice

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

By default `@DataJpaTest`:
- Uses an **embedded DB** (H2 if on classpath) — see [[06-Testcontainers]] to use real Postgres.
- Wraps each test in a **rollback transaction**.
- Configures Hibernate, repositories, `TestEntityManager`.
- Disables full autoconfig (no controllers, services, etc.).

To use the real configured DB instead of H2:

```java
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class UserRepositoryTest { ... }
```

### `@JsonTest`

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
| `@WebMvcTest` | (no equivalent — Node loads everything or you mock manually) |
| `@DataJpaTest` | spinning up a test DB and your `prisma/typeorm` |
| `@MockitoBean` | overriding a registered DI binding (NestJS `overrideProvider`) |
| Context caching across tests | (manual — not built-in) |

NestJS is the closest analog: `Test.createTestingModule()` builds a partial DI container, much like Spring slices.

## Gotchas

> [!warning] Slow context = slow suite
> Each unique combination of `@SpringBootTest` + `@MockitoBean` + `@TestPropertySource` creates a **separate** cached context. Hundreds of contexts will OOM your CI. Standardize your test config.

> [!warning] `@WebMvcTest` doesn't load security
> It DOES load Spring Security if `spring-boot-starter-security` is on the classpath, which surprises everyone. Either disable it (`@AutoConfigureMockMvc(addFilters = false)`) or test with `@WithMockUser`.

> [!warning] `@DataJpaTest` rolls back transactions
> So `repo.save()` won't actually flush to the DB unless you call `em.flush()` or use `TestEntityManager`. Hibernate may not even execute the SQL until flush time.

> [!tip] Use `@Import` for extra config
> Need a `@Configuration` class in a slice test? Add `@Import(MyConfig.class)`.

> [!tip] `@TestConfiguration` for test-only beans
> A nested `@TestConfiguration` class lets you provide test-specific beans without polluting prod config.

## Related
- [[01-Testing-Pyramid-and-Tools]]
- [[05-MockMvc-and-WebTestClient]]
- [[06-Testcontainers]]
- [[07-Integration-Testing]]
- [[08-Test-Profiles-and-Properties]]
- [[../05-Spring-Boot/03-Auto-Configuration|Auto-configuration]]
