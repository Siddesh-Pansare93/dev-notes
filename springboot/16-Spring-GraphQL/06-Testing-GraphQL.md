# Testing Spring GraphQL

Socho tumne REST API mein Postman se manually check kiya "chalo dekhte hain response sahi aa raha hai ya nahi" — lekin production mein aisa nahi chalega. Same tarah GraphQL APIs ko bhi proper automated tests chahiye, kyunki agar tumne schema mein koi field change kiya ya resolver mein bug aa gaya, toh tumhe turant pata chalna chahiye — na ki jab Zomato ka customer app crash ho jaaye order fetch karte waqt.

> [!info] Testing Approaches
> Spring ek `GraphQlTester` interface deta hai jisse tum apne GraphQL endpoints ko fluent (chain-style) tareeke se test kar sakte ho — bilkul REST mein `MockMvc` ya `WebTestClient` jaisa feel aayega agar tum Node.js se `supertest` use karte the Express apps test karne ke liye.

## `@GraphQlTest`

**Kya hota hai?** Yeh ek slice testing annotation hai — matlab poora Spring Boot application context load nahi hoga, sirf GraphQL se related components (controllers/resolvers, GraphQL config) load honge. Bilkul waise hi jaise `@WebMvcTest` sirf web layer load karta hai REST controllers ke liye, bina database ya service layer poora boot kiye.

**Kyun zaruri hai?** Agar tum poora `@SpringBootTest` use karoge har chhote resolver ko test karne ke liye, toh:
- Test slow ho jaayenge (poora Spring context, DB connections, beans sab load honge)
- Tumhara test "unit-ish" nahi rahega — bahut saari cheezein involve ho jaayengi jo actually us resolver se related hi nahi hain

Node.js background se socho — jaise tum Express mein sirf ek route handler ko isolate karke test karte ho, bina poore server ko real DB se connect kiye, waise hi `@GraphQlTest` sirf tumhare `BookController` (jo `@Controller` + `@QueryMapping` use karta hai) ko test karta hai.

```java
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.graphql.GraphQlTest;
import org.springframework.graphql.test.tester.GraphQlTester;

@GraphQlTest(BookController.class)
class BookControllerTest {

    @Autowired
    private GraphQlTester graphQlTester;

    @Test
    void shouldReturnBook() {
        String document = """
            query {
                bookById(id: "book-1") {
                    id
                    title
                }
            }
        """;

        graphQlTester.document(document)
            .execute()
            .path("bookById.id").entity(String.class).isEqualTo("book-1")
            .path("bookById.title").hasValue();
    }
}
```

Yahan gaur karo — `document` ek plain GraphQL query string hai (Java 15+ text block `"""..."""` use kiya hai, isse multi-line string likhna clean rehta hai). `.execute()` se query chalti hai, aur `.path("bookById.id")` se response ke andar us specific field tak "drill down" karke assertion lagate hain. Bilkul jaise tum REST test mein `response.body.data.id` check karte ho, bas yahan JSONPath jaisa syntax hai.

> [!tip]
> `@GraphQlTest(BookController.class)` mein controller class specify karna optional hai, lekin agar tumhare paas multiple `@Controller` classes hain schema ke liye, toh specify karna better hai — warna sab load ho jaayenge aur test slow ho jaayega.

## `HttpGraphQlTester`

**Kya hota hai?** Yeh ek real HTTP-level integration test tool hai. Matlab yeh actual server start karega (random port pe) aur tumhari query real HTTP request ke through jaayegi — bilkul waise jaise koi real client (Postman, ya tumhara frontend) call karta.

**Kyun zaruri hai?** `@GraphQlTest` sirf ek slice test karta hai — real HTTP layer, security filters, interceptors, full application wiring involve nahi hota. Lekin production mein jab actual request aayegi, tab poora stack (security, filters, serialization sab) involve hoga. Isliye end-to-end confidence ke liye `HttpGraphQlTester` use karte hain, jo `@SpringBootTest(webEnvironment = RANDOM_PORT)` ke saath kaam karta hai — matlab poora application boot hoga, jaise production mein hota hai, bas real port ki jagah ek random free port pe.

Yeh bilkul waisa hi hai jaise Node.js mein tum `supertest` se apna Express app ek ephemeral port pe boot karke real HTTP calls maarte ho end-to-end test ke liye, instead of directly function call karke.

```java
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.graphql.test.tester.HttpGraphQlTester;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class GraphQLIntegrationTest {

    @Autowired
    private HttpGraphQlTester graphQlTester;

    @Test
    void testEndpoint() {
        // same fluent API as GraphQlTester
        graphQlTester.documentName("bookDetails") // Loads from src/test/resources/graphql-test/
            .variable("id", "book-1")
            .execute()
            .path("bookById.title").entity(String.class).isEqualTo("Effective Java");
    }
}
```

Do interesting cheezein yahan dekho:

1. **`documentName("bookDetails")`** — Isse tum apni query ko ek alag `.graphql` file mein rakh sakte ho (`src/test/resources/graphql-test/bookDetails.graphql`), poore query string ko Java code ke andar hardcode karne ki jagah. Yeh bilkul aisa hai jaise tum Postman collections ko `.json` files mein save karte ho, taaki reuse ho sake aur code clean rahe.

2. **`.variable("id", "book-1")`** — Yahan tum query mein GraphQL variables pass kar rahe ho, dynamically. Matlab tumhari `.graphql` file mein query kuch aisi dikhegi:

```graphql
query GetBookDetails($id: ID!) {
    bookById(id: $id) {
        id
        title
    }
}
```

Aur test runtime pe `$id` variable ki value inject karta hai — bilkul waise jaise REST mein tum query params ya path variables pass karte ho, bas GraphQL ka apna declarative variable system hai.

> [!warning]
> `HttpGraphQlTester` real server boot karta hai, isliye yeh `@GraphQlTest` se dheema hoga. Isko use karo jab tumhe pura request-response cycle (security, interceptors, actual network layer) test karna ho — chhote resolver-level logic ke liye `@GraphQlTest` hi sahi rahega. Dono ka combination best strategy hai: zyada tests fast `@GraphQlTest` se, aur kuch critical end-to-end flows `HttpGraphQlTester` se — jaise ki IRCTC apne booking flow ke liye chhote unit tests bhi rakhega aur kuch critical "seat book ho raha hai ki nahi" wale full flow integration tests bhi.

## Key Takeaways

- `@GraphQlTest` slice testing ke liye hai — sirf GraphQL components load karta hai, fast aur lightweight, `@WebMvcTest` jaisa concept.
- `HttpGraphQlTester` + `@SpringBootTest(RANDOM_PORT)` full integration testing ke liye hai — real HTTP call, real server boot.
- Dono `GraphQlTester` interface ka hi fluent API use karte hain — `.document()` ya `.documentName()` se query do, `.variable()` se params do, `.execute()` se chalao, `.path()` se response verify karo.
- `.documentName()` se query files ko `.graphql` files mein alag rakh sakte ho, jo maintainability ke liye better hai bade projects mein.
- Testing strategy mein balance rakho — zyada fast slice tests, kam par critical end-to-end integration tests.

**Previous:** [[05-Error-Handling]]
