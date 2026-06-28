---
title: "02 - Queries and Controllers"
date: 2026-05-26
tags: [graphql, spring-boot, controllers, queries]
---

# Queries and Controllers in Spring GraphQL

> [!info] Spring Boot Starter
> To use Spring for GraphQL, add the `spring-boot-starter-graphql` dependency. You often pair it with a web starter like `spring-boot-starter-web` (Spring MVC) or `spring-boot-starter-webflux`.

## Controller Annotations

Spring for GraphQL provides an annotation-based programming model similar to Spring MVC.

### `@Controller` and `@QueryMapping`

Instead of `@GetMapping`, we use `@QueryMapping` for GraphQL queries.

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

> [!tip] Naming Convention
> If the method name matches the query name in the schema, you don't need to specify the `name` attribute in `@QueryMapping`.

### `@SchemaMapping`

`@SchemaMapping` is more generic. It maps a handler method to a field in the GraphQL schema. `@QueryMapping` is just a meta-annotation for `@SchemaMapping(typeName="Query")`.

It's extremely useful for resolving nested fields.

```java
import org.springframework.graphql.data.method.annotation.SchemaMapping;

@Controller
public class BookController {
    
    // ... bookById mapping

    @SchemaMapping(typeName = "Book", field = "author")
    public Author getAuthor(Book book) {
        // The source object (Book) is passed as a parameter.
        return authorRepository.findById(book.getAuthorId()).orElse(null);
    }
}
```

**Previous:** [[01-GraphQL-Concepts]]
**Next:** [[03-Mutations-and-Inputs]]
