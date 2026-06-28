---
title: "05 - Error Handling"
date: 2026-05-26
tags: [graphql, spring-boot, errors]
---

# Error Handling in Spring GraphQL

> [!info] GraphQL Errors
> In REST, errors are usually represented by HTTP status codes (404, 500). In GraphQL, HTTP 200 OK is almost always returned. Errors are instead populated in the `errors` array of the JSON response.

## `DataFetcherExceptionResolver`

Spring provides `DataFetcherExceptionResolver` to map Java exceptions to GraphQL `GraphQLError` objects.

### Implementing a Custom Resolver

You can create a `@ControllerAdvice` equivalent for GraphQL by implementing `DataFetcherExceptionResolver` or extending `DataFetcherExceptionResolverAdapter`.

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

> [!tip] Built-in Resolvers
> Spring automatically handles validation exceptions (`ConstraintViolationException`, `MethodArgumentNotValidException`) and security exceptions if the respective dependencies are present.

**Previous:** [[04-Data-Fetching-N-Plus-One]]
**Next:** [[06-Testing-GraphQL]]
