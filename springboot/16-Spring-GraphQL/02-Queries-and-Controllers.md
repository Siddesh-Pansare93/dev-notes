# Queries and Controllers in Spring GraphQL

> [!info] Spring Boot Starter
> Spring for GraphQL use karne ke liye `spring-boot-starter-graphql` dependency add karo. Isko usually kisi web starter ke saath pair karte hain — `spring-boot-starter-web` (Spring MVC) ya `spring-boot-starter-webflux`.

## Controller Annotations

Kya hota hai? Spring for GraphQL ek annotation-based programming model deta hai jo bilkul Spring MVC jaisa feel hota hai. Matlab tumhe naya paradigm seekhne ki tension nahi — bas annotations badal jaate hain.

### `@Controller` aur `@QueryMapping`

Socho Zomato ka backend hai — jab user "restaurant by ID" maangta hai, REST mein tum `@GetMapping("/restaurants/{id}")` likhte ho. GraphQL mein wahi kaam `@QueryMapping` karta hai. Isse Spring ko pata chal jaata hai ki "yeh method GraphQL schema ke kisi Query field ko serve karega."

```java
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;

@Controller
public class BookController {

    private final BookRepository bookRepository;

    public BookController(BookRepository bookRepository) {
        this.bookRepository = bookRepository;
    }

    @QueryMapping
    public Book bookById(@Argument String id) {
        return bookRepository.findById(id).orElse(null);
    }
}
```

Yahan `@Argument String id` GraphQL query mein aaye `id` argument ko method parameter mein bind kar deta hai — bilkul waise jaise Express mein `req.params.id` ya NestJS mein `@Args('id')` karte ho.

> [!tip] Naming Convention
> Agar method ka naam schema mein diye gaye query ke naam se match ho jaaye (jaise upar `bookById` schema ke `bookById` query se match kar raha hai), toh `@QueryMapping` mein `name` attribute dene ki zaroorat hi nahi. Spring khud figure out kar leta hai. Convention over configuration — Spring Boot ka favorite mantra.

### `@SchemaMapping`

Kya hota hai? `@SchemaMapping` ek zyada generic annotation hai. Yeh kisi bhi handler method ko GraphQL schema ke kisi field se map kar deta hai — chahe woh Query ho, Mutation ho, ya kisi custom type (jaise `Book`) ka field ho. Actually, `@QueryMapping` khud ek "shortcut" hai `@SchemaMapping(typeName = "Query")` ke liye — bas syntactic sugar hai.

Kyun zaruri hai? Yeh especially nested fields resolve karne ke liye kamaal ka hai. Socho Swiggy ke app mein tumne ek "Order" fetch kiya, lekin us Order ke andar "Restaurant" ka poora detail alag se, lazily fetch karna hai (kyunki har baar poora restaurant data laana wasteful hoga). GraphQL mein bilkul yehi pattern hai — `Book` fetch hua, lekin uska `author` field ek alag resolver se aayega, tabhi jab client ne query mein actually maanga ho.

```java
import org.springframework.graphql.data.method.annotation.SchemaMapping;

@Controller
public class BookController {
    
    // ... bookById mapping

    @SchemaMapping(typeName = "Book", field = "author")
    public Author getAuthor(Book book) {
        // Source object (yaani Book), method mein parameter ke roop mein pass hota hai.
        return authorRepository.findById(book.getAuthorId()).orElse(null);
    }
}
```

Isme important cheez samjho: `Book book` parameter — Spring automatically parent object (jo abhi resolve hua tha) ko is method mein inject kar deta hai. Isko "source object" kehte hain. Node.js ke Apollo Server se aa rahe ho toh yeh bilkul GraphQL resolver ke `parent` argument jaisa hai:

```js
// Apollo Server ka resolver — for comparison
const resolvers = {
  Book: {
    author: (parent, args, context) => {
      return authorRepository.findById(parent.authorId);
    }
  }
};
```

Dono jagah concept same hai — bas Spring mein type-safe Java object milta hai, plain JS object nahi.

> [!warning] N+1 Problem
> Agar tum `getAuthor` ko naive tareeke se likhoge (jaise upar), toh 100 books ki list fetch karne pe 100 alag-alag database calls lag jaayengi authors ke liye — yeh classic "N+1 query problem" hai. Iska solution `DataLoader` pattern hota hai (batch + cache), jise Spring GraphQL bhi support karta hai. Abhi ke liye bas dhyan rakho — yeh gotcha aage aayega.

## Key Takeaways

- `@QueryMapping` GraphQL ke Query type ke fields ko Java methods se jodta hai — REST ke `@GetMapping` jaisa role hai.
- `@Argument` GraphQL query arguments ko method parameters mein bind karta hai.
- Agar method name aur schema field name match karein, `name` attribute dena optional hai.
- `@SchemaMapping` zyada generic hai — kisi bhi type ke kisi bhi field ko resolve kar sakta hai, aur `@QueryMapping` uska hi ek special case hai.
- Nested fields (jaise `Book.author`) ko lazily resolve karne ke liye `@SchemaMapping` use hota hai, jahan parent object method parameter ke roop mein milta hai.
- Naive nested resolvers N+1 query problem create kar sakte hain — DataLoader batching iska fix hai (aage detail mein aayega).

**Previous:** [[01-GraphQL-Concepts]]
**Next:** [[03-Mutations-and-Inputs]]
