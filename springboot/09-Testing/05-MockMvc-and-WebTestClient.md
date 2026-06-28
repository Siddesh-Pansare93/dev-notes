---
tags: [testing, mockmvc, webtestclient, http]
aliases: [MockMvc, WebTestClient]
stage: advanced
---

# MockMvc and WebTestClient

> [!info] For the Express/TS dev
> `MockMvc` is `supertest` for Spring MVC: it dispatches a fake HTTP request through your controllers without booting a real server. `WebTestClient` is its reactive cousin (also works against a real server). Both have fluent assertion DSLs.

## Concept

Two HTTP-test clients ship with Spring:

| Client | Stack | Real HTTP? |
|--------|-------|-----------|
| `MockMvc` | Servlet (Spring MVC) | No — fake `HttpServletRequest` |
| `WebTestClient` | Reactive (WebFlux) or any | Optional — fake or real port |

`WebTestClient` works against MVC apps too (when a real port is bound) — it's slowly becoming the recommended client for both stacks.

## Code example

### MockMvc — servlet style

```java
@WebMvcTest(UserController.class)
class UserControllerMockMvcTest {

    @Autowired MockMvc mvc;
    @MockitoBean UserService service;

    @Test
    void getUser_ok() throws Exception {
        when(service.find(1L)).thenReturn(new User(1L, "Alice", "a@b.com"));

        mvc.perform(get("/api/users/{id}", 1)
                .accept(MediaType.APPLICATION_JSON))
           .andExpect(status().isOk())
           .andExpect(content().contentType(MediaType.APPLICATION_JSON))
           .andExpect(jsonPath("$.id").value(1))
           .andExpect(jsonPath("$.name").value("Alice"))
           .andExpect(jsonPath("$.email", endsWith("@b.com")))
           .andDo(print());  // prints the exchange — useful while debugging
    }

    @Test
    void createUser_validatesBody() throws Exception {
        mvc.perform(post("/api/users")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    { "email": "not-an-email" }
                """))
           .andExpect(status().isBadRequest())
           .andExpect(jsonPath("$.errors[*].field",
                hasItems("email", "name")));
    }

    @Test
    void deleteUser_requiresAuth() throws Exception {
        mvc.perform(delete("/api/users/1"))
           .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void deleteUser_asAdmin() throws Exception {
        mvc.perform(delete("/api/users/1").with(csrf()))
           .andExpect(status().isNoContent());
        verify(service).delete(1L);
    }
}
```

### Static imports you'll always need

```java
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
```

### Capturing the response

```java
String body = mvc.perform(get("/api/users/1"))
    .andExpect(status().isOk())
    .andReturn()
    .getResponse()
    .getContentAsString();

User user = objectMapper.readValue(body, User.class);
```

### File upload

```java
mvc.perform(multipart("/api/upload")
        .file(new MockMultipartFile("file", "x.txt",
            MediaType.TEXT_PLAIN_VALUE, "hello".getBytes())))
   .andExpect(status().isOk());
```

### WebTestClient — reactive / unified

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureWebTestClient
class UserControllerWebTestClientIT {

    @Autowired WebTestClient client;

    @Test
    void getUsers() {
        client.get().uri("/api/users")
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk()
            .expectHeader().contentType(MediaType.APPLICATION_JSON)
            .expectBodyList(User.class).hasSize(3);
    }

    @Test
    void createUser() {
        client.post().uri("/api/users")
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(new CreateUserDto("Alice", "a@b.com"))
            .exchange()
            .expectStatus().isCreated()
            .expectBody()
                .jsonPath("$.id").isNotEmpty()
                .jsonPath("$.email").isEqualTo("a@b.com");
    }
}
```

`WebTestClient` is the same client you use to call external services in WebFlux apps; `WebTestClient.bindToServer().baseUrl("https://api.example.com")` works too.

### RestAssured (third option, popular for E2E)

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class UserApiE2E {

    @LocalServerPort int port;

    @Test
    void getUsers() {
        given()
            .port(port)
            .accept(ContentType.JSON)
        .when()
            .get("/api/users")
        .then()
            .statusCode(200)
            .body("size()", greaterThan(0));
    }
}
```

## Express/Node comparison

```typescript
// supertest
import request from "supertest";
import { app } from "./app";

it("GET /api/users/1", async () => {
  await request(app)
    .get("/api/users/1")
    .expect(200)
    .expect("Content-Type", /json/)
    .expect(({ body }) => {
      expect(body.name).toBe("Alice");
    });
});

it("POST /api/users — 400 on bad email", async () => {
  await request(app)
    .post("/api/users")
    .send({ email: "not-an-email" })
    .expect(400);
});
```

| MockMvc | supertest |
|---------|-----------|
| `mvc.perform(get("/x"))` | `request(app).get('/x')` |
| `.andExpect(status().isOk())` | `.expect(200)` |
| `.andExpect(jsonPath("$.name").value("Alice"))` | `.expect(({body}) => expect(body.name).toBe("Alice"))` |
| `.with(csrf())` | manually setting CSRF headers |
| `@WithMockUser` | mocking auth middleware |
| `MockMultipartFile` | `.attach("file", buffer, "x.txt")` |
| `WebTestClient` | `supertest` against `app.listen(0)` |

## Gotchas

> [!warning] CSRF in tests
> If Spring Security is on, POST/PUT/DELETE need `.with(csrf())` or you'll get 403. Or disable CSRF for the test (`@AutoConfigureMockMvc(addFilters = false)`).

> [!warning] `andDo(print())` is your friend
> When a test fails mysteriously, this prints the full request/response/handler — invaluable.

> [!warning] JSONPath `$.x` vs `$['x']`
> Field names with special chars need bracket notation. Numeric indices: `$.items[0].name`.

> [!tip] Don't load a controller you didn't ask for
> `@WebMvcTest(FooController.class)` only loads `FooController`. Without the argument it loads all controllers — slower and pulls in more dependencies.

> [!warning] MockMvc doesn't actually marshal HTTP
> No real bytes go over a socket. Filters run, dispatcher runs, but `Content-Length` header behavior etc. can differ from real Tomcat. For full HTTP fidelity use `WebTestClient` with `RANDOM_PORT`.

## Related
- [[04-Spring-Boot-Test]]
- [[06-Testcontainers]]
- [[07-Integration-Testing]]
- [[../06-Web-REST/01-Controllers-and-Routing|Controllers]]
- [[../08-Security/01-Spring-Security-Overview|Security in tests]]
