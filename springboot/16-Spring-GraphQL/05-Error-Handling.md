# Error Handling in Spring GraphQL

Socho tumne Zomato ka order placed kiya, aur restaurant wala item out-of-stock nikla. REST API mein tumhe seedha `404` ya `400` HTTP status mil jaata — client ka error-handling code turant samajh jaata "kuch gadbad hai". Lekin GraphQL mein cheezein thodi different chalti hain.

> [!info] GraphQL Errors
> REST mein errors usually HTTP status codes se represent hote hain (404, 500). GraphQL mein almost hamesha HTTP `200 OK` hi return hota hai — chahe query poori fail ho jaye! Errors instead response ke `errors` array mein populate kiye jaate hain, alag se, JSON ke andar hi.

Isका matlab ye hai ki agar tum Express/Node background se aa rahe ho aur `res.status(404)` check karne ke aadi ho, toh GraphQL mein tumhe apna mindset shift karna padega — status code check karne ke bajaye response body ke andar `errors` key check karni padegi.

```json
{
  "data": {
    "book": null
  },
  "errors": [
    {
      "message": "Book not found with id: 42",
      "locations": [{ "line": 2, "column": 3 }],
      "path": ["book"],
      "extensions": {
        "classification": "NOT_FOUND"
      }
    }
  ]
}
```

Dekho `data` field bhi present hai (`null` ke saath), aur `errors` array bhi. Ye GraphQL ka standard shape hai — dono saath-saath aa sakte hain.

## `DataFetcherExceptionResolver`

Ab sawaal ye hai — jab tumhara resolver (data fetcher) exception throw kare, toh usko is proper `errors` array format mein kaun convert karega? Yahi kaam karta hai **`DataFetcherExceptionResolver`**.

Isko tum Spring MVC ke `@ControllerAdvice` + `@ExceptionHandler` ka GraphQL version samajh sakte ho. Jaise REST mein tum global exception handler banate ho jo `ResourceNotFoundException` ko `404` mein convert kare, waise hi GraphQL mein tum Java exceptions ko `GraphQLError` objects mein map karte ho.

### Kyun zaruri hai?

Agar tum kuch nahi karoge, toh Spring GraphQL default behavior follow karega — jo generic aur less-informative error messages deta hai (security ke liye, kyunki internal exception details expose karna risky hota hai). Production app mein tumhe apne exceptions ko meaningful, client-friendly errors mein convert karna hi padta hai — jaise "Book not found" bolna, na ki raw `NullPointerException` ka stack trace leak karna.

### Custom Resolver Implement Karna

Tum `DataFetcherExceptionResolver` interface implement kar sakte ho, ya usse aasan — `DataFetcherExceptionResolverAdapter` ko extend karke sirf ek method override kar sakte ho.

```java
import graphql.GraphQLError;
import graphql.schema.DataFetchingEnvironment;
import org.springframework.graphql.execution.DataFetcherExceptionResolverAdapter;
import org.springframework.stereotype.Component;

@Component
public class CustomExceptionResolver extends DataFetcherExceptionResolverAdapter {

    @Override
    protected GraphQLError resolveToSingleError(Throwable ex, DataFetchingEnvironment env) {
        if (ex instanceof ResourceNotFoundException) {
            return GraphQLError.newError()
                    .message(ex.getMessage())
                    .path(env.getExecutionStepInfo().getPath())
                    .location(env.getField().getSourceLocation())
                    .errorType(org.springframework.graphql.execution.ErrorType.NOT_FOUND)
                    .build();
        }
        
        return super.resolveToSingleError(ex, env);
    }
}
```

Line-by-line samjho:

- **`@Component`** — Spring isko automatically pick karega aur exception-handling chain mein register kar dega. Tumhe kahin manually wire karne ki zarurat nahi.
- **`resolveToSingleError`** — jab bhi koi resolver/data-fetcher exception throw karta hai, Spring har registered `DataFetcherExceptionResolver` ko call karta hai, ek-ek karke, jab tak koi non-null `GraphQLError` return na kare.
- **`.path(...)`** aur **`.location(...)`** — ye batate hain ki error exactly kaunse field aur query mein kis jagah aaya. Frontend developer ke liye ye debugging mein bahut kaam aata hai — jaise Swiggy app mein agar "restaurant.menu.price" field fail ho toh frontend ko exactly pata chalega kis field mein dikkat hai.
- **`.errorType(NOT_FOUND)`** — GraphQL ka apna error classification system hai (`NOT_FOUND`, `BAD_REQUEST`, `UNAUTHORIZED`, `FORBIDDEN`, `INTERNAL_ERROR`, waghera). Ye client ke `extensions.classification` field mein aata hai, jisse frontend decide kar sakta hai ki error UI mein kaise dikhana hai (retry button dikhana hai ya login page pe redirect karna hai).
- **`super.resolveToSingleError(ex, env)`** — agar exception tumhare custom `if` block mein match nahi hui, toh baaki sab default handling ke liye pass-through kar do. Ye important hai — warna tum accidentally saari exceptions ko silently swallow kar doge.

> [!tip] Multiple Resolvers Chain Mein Chalte Hain
> Tum multiple `DataFetcherExceptionResolver` beans bana sakte ho — jaise ek `ResourceNotFoundException` ke liye, ek `ValidationException` ke liye. Spring inko order mein try karta hai. Agar chaho toh `@Order` annotation se priority set kar sakte ho, bilkul Spring MVC ke multiple `@ExceptionHandler` classes jaisa.

> [!tip] Built-in Resolvers
> Spring automatically validation exceptions (`ConstraintViolationException`, `MethodArgumentNotValidException`) aur security exceptions handle karta hai — agar respective dependencies (Bean Validation, Spring Security) project mein present hain. Matlab basic validation errors ke liye tumhe khud kuch likhne ki zarurat nahi — Spring GraphQL already sensible defaults deta hai.

> [!warning] Internal Errors Leak Mat Karo
> Agar koi unhandled exception aata hai (jaise `NullPointerException` ya `SQLException`), toh Spring by default usko generic `"INTERNAL_ERROR"` message ke saath expose karta hai, actual stack trace ya sensitive data client ko bhejta nahi. Ye production mein bahut zaruri hai — kabhi bhi raw exception message directly client ko mat bhejo agar usme database details, internal paths, ya credentials ho sakte hain. Bilkul waise jaise tum kabhi Express mein `err.stack` seedha response mein nahi bhejte.

## Key Takeaways

- GraphQL mein errors HTTP status codes se nahi, response body ke `errors` array se pata chalte hain — hamesha `200 OK` expect karo.
- `DataFetcherExceptionResolver` (ya `DataFetcherExceptionResolverAdapter`) GraphQL ka "exception handler" hai — Spring MVC ke `@ControllerAdvice` jaisa concept.
- Custom exceptions ko meaningful `GraphQLError` mein convert karo, saath mein proper `path` aur `errorType` set karo taaki frontend ko debugging aasan ho.
- Unmatched exceptions ke liye hamesha `super.resolveToSingleError(ex, env)` call karo — chain ko break mat karo.
- Validation aur security exceptions ke liye Spring already built-in resolvers deta hai — reinvent the wheel mat karo.
- Kabhi bhi raw internal exception details client ko expose mat karo — security risk hai.

**Previous:** [[04-Data-Fetching-N-Plus-One]]
**Next:** [[06-Testing-GraphQL]]
