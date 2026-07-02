# MockMvc and WebTestClient

> [!info] Express/TS dev ke liye
> `MockMvc` basically Spring MVC ka `supertest` hai — ye ek fake HTTP request tumhare controllers ke through bhejta hai, bina koi real server boot kiye. `WebTestClient` iska reactive wala cousin hai (aur real server ke against bhi chal sakta hai). Dono ke paas fluent assertion DSL hai — matlab test likhna chain-of-thought jaisa lagta hai.

## Concept

Kya hota hai? Spring do HTTP-testing clients deta hai out of the box:

| Client | Stack | Real HTTP? |
|--------|-------|-----------|
| `MockMvc` | Servlet (Spring MVC) | Nahi — fake `HttpServletRequest` |
| `WebTestClient` | Reactive (WebFlux) ya kuch bhi | Optional — fake ya real port |

Socho `MockMvc` ko ek "shortcut delivery boy" jaisa — woh Zomato app khole bina, seedha restaurant (controller) ke paas jaake order deta hai aur order chain (filters, dispatcher, handler) test karta hai, lekin actual bike pe road pe nahi jaata. `WebTestClient` chaahe to real bike leke real road (port) pe bhi ja sakta hai — isliye ye dono stacks (MVC aur WebFlux) mein slowly-slowly recommended client banta ja raha hai.

## Code example

### MockMvc — servlet style

Kyun zaruri hai? Ye tumhara bread-and-butter tool hai jab tumhe controller ko boot-poora-app kiye bina test karna ho — fast aur focused.

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

Dekho ye kitna clean hai — `mvc.perform(...)` ek request bhejta hai, aur `.andExpect(...)` chain se tum assertions lagate jaate ho. Bilkul `request(app).get('/x').expect(200)` jaisa feel, bas Java-flavoured.

### Static imports jo hamesha lagenge

Ye ek gotcha hai jo naye log miss karte hain — MockMvc ke saare helper methods (`get()`, `post()`, `status()`, `jsonPath()` etc.) static methods hain, aur unhe import kiye bina compile hi nahi hoga:

```java
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
```

IDE (IntelliJ) ye auto-suggest kar dega jab tum `get(` type karoge — bas sahi wala import pick karna, warna galat static method uthega.

### Response ko capture karna

Kabhi kabhi tumhe sirf status check nahi karna, poora response body nikal ke usse deserialize bhi karna hota hai — jaise tum Postman mein response dekh ke JSON parse karte ho:

```java
String body = mvc.perform(get("/api/users/1"))
    .andExpect(status().isOk())
    .andReturn()
    .getResponse()
    .getContentAsString();

User user = objectMapper.readValue(body, User.class);
```

### File upload

Multipart form-data test karna ho (jaise koi profile photo upload endpoint), to `MockMultipartFile` use karo:

```java
mvc.perform(multipart("/api/upload")
        .file(new MockMultipartFile("file", "x.txt",
            MediaType.TEXT_PLAIN_VALUE, "hello".getBytes())))
   .andExpect(status().isOk());
```

### WebTestClient — reactive / unified

Kya hota hai? Ye WebFlux ka native test client hai, lekin MVC apps ke saath bhi kaam karta hai jab real port bind ho. Isse imagine karo ek "universal remote" ki tarah jo Sony TV aur LG TV — dono chala le.

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

`WebTestClient` wahi client hai jo tum WebFlux apps mein external services call karne ke liye bhi use karte ho — `WebTestClient.bindToServer().baseUrl("https://api.example.com")` bhi chalta hai. Matlab ek hi tool test aur real dono jagah reuse hota hai.

### RestAssured (third option, E2E ke liye popular)

Agar tumhe full end-to-end HTTP test chahiye (jaise CI mein poora Tomcat boot karke real socket pe hit karna), RestAssured bhi ek popular choice hai:

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

Tumhe ye pattern already familiar lagega — bas syntax Java flavour ka hai:

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
> Agar Spring Security on hai, to POST/PUT/DELETE requests ko `.with(csrf())` chahiye hi hoga, warna 403 khaoge. Ya phir test ke liye CSRF disable kar do (`@AutoConfigureMockMvc(addFilters = false)`). Ye bilkul waise hi hai jaise Paytm/UPI transaction mein OTP/token miss ho jaaye — request bounce ho jaayegi.

> [!warning] `andDo(print())` tumhara dost hai
> Jab test mysteriously fail ho jaaye aur samajh na aaye kyun, `andDo(print())` laga do — ye poora request/response/handler print karta hai. Debugging mein bahut kaam aata hai, Postman ke "response" tab jaisa.

> [!warning] JSONPath `$.x` vs `$['x']`
> Field names mein special characters hain to bracket notation use karo. Numeric indices ke liye: `$.items[0].name`.

> [!tip] Woh controller mat load karo jo tumne manga hi nahi
> `@WebMvcTest(FooController.class)` sirf `FooController` load karega. Argument diye bina ye saare controllers load kar dega — slower ho jaata hai aur extra dependencies bhi khinch laata hai. Zomato app mein sirf "order tracking" module test karna hai to poora app boot karne ki zarurat nahi.

> [!warning] MockMvc actually HTTP marshal nahi karta
> Koi real bytes socket pe nahi jaate. Filters chalte hain, dispatcher chalta hai, lekin `Content-Length` header jaisa behavior real Tomcat se differ kar sakta hai. Full HTTP fidelity chahiye to `WebTestClient` ko `RANDOM_PORT` ke saath use karo.

## Key Takeaways

- `MockMvc` = fake HTTP request Spring MVC controllers ke through, bina server boot kiye — fast, `@WebMvcTest` ke saath best combo.
- `WebTestClient` = reactive-native client jo MVC aur WebFlux dono ke saath chalta hai, aur real port ke against bhi test kar sakta hai.
- RestAssured teesra option hai — full E2E, real port, framework-agnostic assertions.
- Static imports (`MockMvcRequestBuilders`, `MockMvcResultMatchers`, etc.) bina in sab kuch compile nahi hoga.
- CSRF ka dhyan rakho jab Spring Security on ho — `.with(csrf())` ya test ke liye filters disable karo.
- `andDo(print())` debugging ka sabse bada dost hai.
- `MockMvc` real socket pe bytes nahi bhejta — agar tumhe true HTTP-level fidelity chahiye (headers, real Content-Length, etc.), `WebTestClient` + `RANDOM_PORT` use karo.
- Node/Express se aane wale ke liye: `MockMvc` = `supertest`, `WebTestClient` = `supertest` real listening server ke against.

## Related
- [[04-Spring-Boot-Test]]
- [[06-Testcontainers]]
- [[07-Integration-Testing]]
- [[../06-Web-REST/01-Controllers-and-Routing|Controllers]]
- [[../08-Security/01-Spring-Security-Overview|Security in tests]]
