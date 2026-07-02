# Mutations and Inputs

Ab tak humne sirf data padha hai — queries se. Lekin real duniya mein sirf padhna kaafi nahi hota. Zomato pe tumhe order bhi place karna padta hai, address bhi update karna padta hai, cart se item bhi remove karna padta hai. Yeh sab "likhne" wale operations hain, aur GraphQL mein inke liye alag hi cheez hai — **Mutations**.

> [!info] Mutations kya hain?
> Queries data **read** karne ke liye hoti hain, mutations data **modify** karne ke liye — create, update, delete. Interesting baat yeh hai ki mutations bhi data return karti hain, generally woh object jo tumne abhi create/update kiya. Yeh REST se thoda alag hai — REST mein POST/PUT request ke response mein kya milega yeh fix nahi hota, lekin GraphQL mutation mein client khud decide karta hai ki response mein kaunse fields chahiye.

Socho Zomato ka "Place Order" button. Jab tum click karte ho, tumhe sirf "order placed" nahi chahiye — tumhe order ID, estimated delivery time, total amount bhi turant dikhna chahiye. GraphQL mutation exactly yehi karta hai: ek hi request mein change bhi karo, aur updated data bhi wapas le lo.

## Schema Definition

Kyun zaruri hai? Kyunki GraphQL strongly typed hai — server ko exactly pata hona chahiye ki mutation kaunsa data accept karega aur kya return karega. Iske liye pehle apni SDL (Schema Definition Language) mein `Mutation` type aur `input` type define karte hain:

```graphql
type Mutation {
  addBook(input: BookInput!): Book!
}

input BookInput {
  title: String!
  authorId: ID!
}
```

Yahan do naye concepts hain:

1. **`type Mutation`** — yeh queries ke `type Query` jaisa hi hai, bas yeh batata hai ki kaunse-kaunse "write" operations available hain.
2. **`input BookInput`** — GraphQL mein tum normal `type` ko argument ke roop mein pass nahi kar sakte, iske liye specifically `input` type banana padta hai. Isko socho jaise Express mein tumhara request body ka TypeScript interface hota hai — `type CreateBookDto = { title: string; authorId: string }`. Farak sirf itna hai ki yahan GraphQL khud validate karta hai ki required fields (`!` wale) missing na hon.

> [!tip] `input` vs `type`
> `type` output ke liye hota hai (server se client ko kya milega), `input` sirf input arguments ke liye. Dono ko mix nahi kar sakte — yeh Java mein alag-alag DTO classes banane jaisa hai, request ke liye alag, response ke liye alag.

## `@MutationMapping`

Ab jaise `@QueryMapping` queries ko handle karta tha, waise hi `@MutationMapping` annotation mutations ko controller method se jodta hai. Spring Boot khud match kar leta hai method name ko schema ke mutation name se (yahan `addBook` method `addBook` mutation ko handle karega).

```java
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.stereotype.Controller;

@Controller
public class BookController {

    private final BookService bookService;

    // constructor...

    @MutationMapping
    public Book addBook(@Argument BookInput input) {
        return bookService.createBook(input.title(), input.authorId());
    }
}
```

`@Argument` yahan poore `input` object ko `BookInput` type mein bind kar deta hai — bilkul waise jaise Express mein `req.body` ko ek DTO class mein map karte ho, ya NestJS mein `@Body() dto: CreateBookDto`.

> [!note] Java Records for Inputs — yeh combo bana hi isi ke liye hai
> Java 14+ ke `record`s GraphQL input types ke liye perfect fit hain. Record ek immutable data holder hai — bas fields define karo, constructor/getters/equals/hashCode sab free mein milta hai.
> ```java
> public record BookInput(String title, String authorId) {}
> ```
> Node.js background se aaye ho toh isko samjho jaise ek plain TypeScript `interface` ya `type` — bas yeh runtime pe bhi exist karta hai aur immutable hai. `input.title()` call karoge toh title milega (Lombok ke `getTitle()` jaisa nahi, record ka apna style hai — bina "get" prefix ke).

## Validation

Ab yahan asli maza hai. Socho koi Zomato pe order place kar raha hai lekin address field khali chhod diya, ya phone number invalid hai. Tumhe server-side pe yeh check karna hi padega — client-side validation pe bharosa nahi kar sakte, koi Postman se seedha bhi hit kar sakta hai.

Spring for GraphQL, Bean Validation (JSR-380 — wahi `@NotNull`, `@NotBlank`, `@Size` wagera annotations jo tumne shayad REST controllers mein bhi use kiye honge) ke saath seamlessly kaam karta hai. Steps simple hain:

1. `spring-boot-starter-validation` dependency add karo.
2. Apne input record mein constraints likho.
3. Controller method mein `@Argument` ke saath `@Valid` lagao.

```java
public record BookInput(
    @NotBlank(message = "Title is required") String title,
    @NotNull(message = "Author ID is required") String authorId
) {}

// In controller:
@MutationMapping
public Book addBook(@Valid @Argument BookInput input) { ... }
```

Agar validation fail ho jaaye, toh Spring for GraphQL automatically ek proper GraphQL error response bhej deta hai (with `INVALID` extension code) — tumhe manually try-catch likh ke error format karne ki zarurat nahi. Yeh REST ke `@Valid` + `MethodArgumentNotValidException` handling se kaafi milta-julta hai, bas response GraphQL ke error array format mein aata hai, HTTP 400 ke bajaye.

> [!warning] Validation sirf input record pe kaam karta hai
> `@Valid` sirf us object ko validate karega jispe `@Argument` laga hai. Agar tumhare paas nested objects hain (jaise `BookInput` ke andar ek `AddressInput`), toh nested field pe `@Valid` annotation lagana mat bhoolna, warna woh silently skip ho jayega — bilkul waise jaise Java Bean Validation normal REST DTOs mein bhi cascade validation ke liye `@Valid` chahiye hota hai.

**Previous:** [[02-Queries-and-Controllers]]
**Next:** [[04-Data-Fetching-N-Plus-One]]
