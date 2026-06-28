---
title: "06 - Testing GraphQL"
date: 2026-05-26
tags: [graphql, spring-boot, testing]
---

# Testing Spring GraphQL

> [!info] Testing Approaches
> Spring provides the `GraphQlTester` interface to test your GraphQL endpoints fluently.

## `@GraphQlTest`

Use `@GraphQlTest` for slicing your application context to only include GraphQL components (like `@WebMvcTest` but for GraphQL).

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

## `HttpGraphQlTester`

For integration tests over HTTP, use `HttpGraphQlTester`. This is typically used with `@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)`.

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

**Previous:** [[05-Error-Handling]]
