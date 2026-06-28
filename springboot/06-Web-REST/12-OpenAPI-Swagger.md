---
tags: [web-rest, openapi, swagger, documentation]
aliases: [Swagger, OpenAPI, springdoc, API Docs]
stage: intermediate
---

# OpenAPI / Swagger

> [!info] For the Express/TS dev
> In Node you might use `swagger-jsdoc` + `swagger-ui-express`, or generate from Zod with `@asteasolutions/zod-to-openapi`. In Spring you add **springdoc-openapi** — it scans your controllers, DTOs (and Bean Validation annotations), and serves both `openapi.json` AND a Swagger UI at `/swagger-ui.html`. Zero handwritten YAML.

## Concept / How it works

`springdoc-openapi-starter-webmvc-ui` introspects:
- `@RestController` and request mappings → paths & operations
- DTO classes + `@NotNull`, `@Size` etc. → schemas with constraints
- `@RequestBody`, `@RequestParam`, `@PathVariable` → parameter definitions
- `ResponseEntity<T>` & return types → response schemas
- `@Operation`, `@Schema`, `@Parameter` annotations → fine-tuning

Generated artifacts:
- **OpenAPI JSON**: `/v3/api-docs`
- **Swagger UI**: `/swagger-ui.html`

## Code example

### Add the dependency

```xml
<dependency>
    <groupId>org.springdoc</groupId>
    <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
    <version>2.6.0</version>
</dependency>
```

That's the whole setup. Run the app, visit `http://localhost:8080/swagger-ui.html`.

### Configure global metadata

```java
@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI api() {
        return new OpenAPI()
                .info(new Info()
                        .title("Acme API")
                        .version("v1")
                        .description("Internal Acme service")
                        .contact(new Contact()
                                .name("Platform")
                                .email("platform@acme.com"))
                        .license(new License().name("Apache 2.0")))
                .addServersItem(new Server().url("https://api.acme.com").description("prod"))
                .addServersItem(new Server().url("http://localhost:8080").description("local"))
                .components(new Components()
                        .addSecuritySchemes("bearer-jwt",
                                new SecurityScheme()
                                        .type(SecurityScheme.Type.HTTP)
                                        .scheme("bearer")
                                        .bearerFormat("JWT")))
                .addSecurityItem(new SecurityRequirement().addList("bearer-jwt"));
    }
}
```

### Annotated controller

```java
@RestController
@RequestMapping("/api/v1/users")
@Tag(name = "Users", description = "User management")
public class UserController {

    @Operation(summary = "Get a user by ID",
               description = "Returns a single user")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Found"),
        @ApiResponse(responseCode = "404", description = "Not found",
                     content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    })
    @GetMapping("/{id}")
    public UserResponse get(
            @Parameter(description = "User ID", example = "42")
            @PathVariable Long id) {
        return service.find(id);
    }

    @Operation(summary = "Create a new user")
    @ApiResponse(responseCode = "201", description = "Created")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponse create(
            @RequestBody(required = true,
                         description = "User to create")
            @Valid CreateUserRequest req) {
        return service.create(req);
    }
}
```

### Schema annotations on DTOs

```java
@Schema(description = "Create-user request")
public record CreateUserRequest(

        @Schema(description = "Email address", example = "alice@example.com")
        @NotBlank @Email
        String email,

        @Schema(description = "Plain-text password (will be hashed)",
                minLength = 8, maxLength = 64,
                accessMode = Schema.AccessMode.WRITE_ONLY)
        @NotBlank @Size(min = 8, max = 64)
        String password,

        @Schema(description = "Full legal name", example = "Alice Liddell")
        @NotBlank @Size(max = 100)
        String fullName
) {}

@Schema(description = "User response")
public record UserResponse(
        @Schema(example = "42") Long id,
        @Schema(example = "alice@example.com") String email,
        String fullName,
        @Schema(example = "2025-05-10T12:00:00Z") Instant createdAt
) {}
```

### `application.yml`

```yaml
springdoc:
  api-docs:
    path: /v3/api-docs
    enabled: true
  swagger-ui:
    path: /swagger-ui.html
    operations-sorter: method
    tags-sorter: alpha
    try-it-out-enabled: true
    persist-authorization: true
  show-actuator: false
  default-produces-media-type: application/json
  packages-to-scan: com.example.api
  paths-to-match: /api/**
```

### Disable in production (if you want)

```yaml
---
spring.config.activate.on-profile: prod
springdoc:
  api-docs:
    enabled: false
  swagger-ui:
    enabled: false
```

### Generate static OpenAPI at build time

`pom.xml`:

```xml
<plugin>
    <groupId>org.springdoc</groupId>
    <artifactId>springdoc-openapi-maven-plugin</artifactId>
    <version>1.4</version>
    <executions>
        <execution>
            <phase>integration-test</phase>
            <goals><goal>generate</goal></goals>
        </execution>
    </executions>
    <configuration>
        <apiDocsUrl>http://localhost:8080/v3/api-docs</apiDocsUrl>
        <outputFileName>openapi.json</outputFileName>
        <outputDir>${project.build.directory}</outputDir>
    </configuration>
</plugin>
```

## Express/TS comparison

```ts
// swagger-jsdoc + swagger-ui-express
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const spec = swaggerJsdoc({
  definition: { openapi: '3.0.0', info: { title: 'Acme', version: '1.0' } },
  apis: ['./src/**/*.ts'],
});
app.use('/docs', swaggerUi.serve, swaggerUi.setup(spec));
```

| TS option | Spring (springdoc) |
| --- | --- |
| Hand-written JSDoc | Inferred from controller code |
| Zod → OpenAPI | Bean Validation → schema (automatic) |
| `swagger-ui-express` | `/swagger-ui.html` |
| `tsoa` (decorator-based) | springdoc + `@Operation`, `@Schema` |

## Gotchas

> [!warning] Spring Security blocks docs by default
> Permit `/v3/api-docs/**` and `/swagger-ui/**` in your SecurityFilterChain or you'll see 401.
> ```java
> .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
> ```

> [!warning] Generic types in responses
> `ResponseEntity<Page<UserResponse>>` works. But `ResponseEntity<List<?>>` is meaningless to OpenAPI — be explicit.

> [!warning] Multiple `@RequestBody` annotations
> Use `io.swagger.v3.oas.annotations.parameters.RequestBody` (the springdoc one) to document, NOT to replace `@org.springframework.web.bind.annotation.RequestBody`. Easy to import the wrong one.

> [!tip] `@Hidden` to exclude
> Apply to a controller, method, or field to omit it from the docs.

> [!tip] Code-first vs spec-first
> springdoc is **code-first**. If your team prefers spec-first (write OpenAPI YAML → generate code/stubs), use `openapi-generator` instead.

## Related

- [[01-RestController-Basics]]
- [[05-Validation]]
- [[02-Configuration-and-SecurityFilterChain]]
