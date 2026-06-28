---
title: "03 - Mutations and Inputs"
date: 2026-05-26
tags: [graphql, spring-boot, mutations]
---

# Mutations and Inputs

> [!info] Mutations
> While queries are for reading data, mutations are for modifying data (create, update, delete). In GraphQL, mutations also return data, often the updated object.

## Schema Definition

First, define the mutation and input types in your SDL:

```graphql
type Mutation {
  addBook(input: BookInput!): Book!
}

input BookInput {
  title: String!
  authorId: ID!
}
```

## `@MutationMapping`

Use the `@MutationMapping` annotation on controller methods to handle mutations.

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

> [!note] Java Records for Inputs
> Java 14+ `record`s are perfect for representing GraphQL input types.
> ```java
> public record BookInput(String title, String authorId) {}
> ```

## Validation

Spring for GraphQL integrates seamlessly with Bean Validation (JSR-380). 

1. Add `spring-boot-starter-validation`.
2. Add constraints to your input types.
3. Use `@Valid` on the `@Argument`.

```java
public record BookInput(
    @NotBlank(message = "Title is required") String title,
    @NotNull(message = "Author ID is required") String authorId
) {}

// In controller:
@MutationMapping
public Book addBook(@Valid @Argument BookInput input) { ... }
```

**Previous:** [[02-Queries-and-Controllers]]
**Next:** [[04-Data-Fetching-N-Plus-One]]
