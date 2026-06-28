---
tags: [web-rest, dto, mapstruct, architecture]
aliases: [DTOs, Data Transfer Objects, MapStruct]
stage: intermediate
---

# DTOs and Mapping

> [!info] For the Express/TS dev
> In TypeScript you often have `User` (the Prisma model) and `UserDto` / `CreateUserInput` / `UserResponse` — usually just plain interfaces. In Java the difference is concrete: an `@Entity` class is hooked into Hibernate's persistence context. Returning entities directly from controllers is a known footgun (lazy-load explosions, accidental field leaks, schema-coupled API). DTOs decouple your wire format from your persistence model.

## Concept / How it works

A **DTO** (Data Transfer Object) is a plain object that crosses an API boundary. Three common roles:

| Role | Example | Notes |
| --- | --- | --- |
| Request | `CreateUserRequest` | What the client sends. Validate with `@Valid` ([[05-Validation]]). |
| Response | `UserResponse` | What the API returns. Excludes `passwordHash`, internal IDs. |
| Internal command | `CreateUserCommand` | Service-layer input, may differ from request. |

Java 17+ `record` types make DTOs trivial — immutable, with auto-generated equals/hashCode/toString. Use them.

You then need **mapping** between DTOs and entities. Three approaches:

1. **Manual mapping** — fine for small projects, explicit, no magic.
2. **MapStruct** — annotation-processor that generates mapping code at compile time. Zero runtime reflection. Recommended.
3. **ModelMapper / BeanUtils** — reflection-based, slower, error-prone. Avoid.

## Code example

### Records as DTOs

```java
// Request DTO
public record CreateUserRequest(
        @NotBlank @Email String email,
        @NotBlank @Size(min = 8) String password,
        @NotBlank String fullName
) {}

// Response DTO — note: NO password
public record UserResponse(
        Long id,
        String email,
        String fullName,
        Instant createdAt
) {}
```

### Manual mapping (perfectly fine)

```java
@Service
public class UserService {

    private final UserRepository repo;
    private final PasswordEncoder encoder;

    public UserResponse create(CreateUserRequest req) {
        User entity = new User();
        entity.setEmail(req.email());
        entity.setPasswordHash(encoder.encode(req.password()));
        entity.setFullName(req.fullName());

        User saved = repo.save(entity);
        return toResponse(saved);
    }

    private UserResponse toResponse(User u) {
        return new UserResponse(
                u.getId(),
                u.getEmail(),
                u.getFullName(),
                u.getCreatedAt()
        );
    }
}
```

### MapStruct (the scalable option)

`pom.xml`:

```xml
<dependency>
    <groupId>org.mapstruct</groupId>
    <artifactId>mapstruct</artifactId>
    <version>1.6.3</version>
</dependency>
<!-- annotation processor -->
<dependency>
    <groupId>org.mapstruct</groupId>
    <artifactId>mapstruct-processor</artifactId>
    <version>1.6.3</version>
    <scope>provided</scope>
</dependency>
```

```java
@Mapper(componentModel = "spring")
public interface UserMapper {

    UserResponse toResponse(User entity);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "passwordHash", source = "password",
             qualifiedByName = "encodePassword")
    @Mapping(target = "createdAt", ignore = true)
    User toEntity(CreateUserRequest req, @Context PasswordEncoder encoder);

    @Named("encodePassword")
    default String encodePassword(String raw, @Context PasswordEncoder encoder) {
        return encoder.encode(raw);
    }
}
```

Use it:

```java
@Service
public class UserService {
    private final UserRepository repo;
    private final UserMapper mapper;
    private final PasswordEncoder encoder;

    public UserResponse create(CreateUserRequest req) {
        User entity = mapper.toEntity(req, encoder);
        return mapper.toResponse(repo.save(entity));
    }
}
```

MapStruct **generates** `UserMapperImpl.class` at compile time. You can open it in `target/generated-sources/` and read plain Java. No reflection at runtime.

### `package.json` analog

```json
{
  "dependencies": {
    "zod": "^3.x",
    "class-transformer": "^0.5.x"
  }
}
```
TypeScript doesn't have a direct MapStruct equivalent — closest is `class-transformer` or hand-rolled `toResponse()` functions on each model.

## Express/TS comparison

```ts
// Express + Prisma
const user = await prisma.user.create({ data });
return res.json({                       // hand-rolled DTO
  id: user.id,
  email: user.email,
  fullName: user.fullName,
  createdAt: user.createdAt
});
```

| TS pattern | Java equivalent |
| --- | --- |
| Plain interface | `record` |
| `Pick<User, 'id' \| 'email'>` | A separate response record |
| Hand-written `toDto()` | Manual mapper or MapStruct |
| Zod parse → typed input | `@Valid CreateUserRequest` |

## Gotchas

> [!warning] Never return `@Entity` from a controller
> - Lazy-loaded relations cause `LazyInitializationException` after the transaction closes.
> - Internal fields (`passwordHash`, audit columns) leak.
> - Renaming a column breaks the API.
> Always go through a DTO. See [[06-N-Plus-One-and-Fetching]].

> [!warning] Don't reuse the same DTO for request and response
> Tempting, but you'll end up with optional/nullable mush. Separate `CreateXRequest` and `XResponse` keeps validation and serialization clean.

> [!tip] Generate at compile time
> MapStruct, like Lombok, runs as an annotation processor. Make sure your IDE (IntelliJ: Settings → Annotation Processors → Enable) is configured, or you'll see "method not found" errors despite the build passing.

> [!warning] MapStruct + Lombok ordering
> If you use both, the `lombok-mapstruct-binding` artifact and processor ordering matters. With Maven 3.6+ and `maven-compiler-plugin` 3.11+, list Lombok BEFORE MapStruct in `annotationProcessorPaths`.

## Related

- [[01-RestController-Basics]]
- [[02-Request-Mapping-Path-Variables]]
- [[05-Validation]]
- [[02-Entity-Basics]]
- [[Records]]
- [[Lombok]]
