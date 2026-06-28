---
tags: [web-rest, validation, jakarta, bean-validation]
aliases: [Bean Validation, Jakarta Validation, Valid, Validated]
stage: intermediate
---

# Validation

> [!info] For the Express/TS dev
> Bean Validation (formerly JSR-380, now Jakarta Validation) is Java's `Zod` / `Joi` / `class-validator` — declarative, annotation-based input validation. Spring Boot wires it in automatically: add `@Valid` to your `@RequestBody` parameter and any `@NotBlank`, `@Email`, `@Size` etc. on the DTO is enforced before your handler runs. Failures auto-respond with `400 Bad Request`.

## Concept / How it works

The reference implementation is **Hibernate Validator**, included automatically with `spring-boot-starter-validation`.

`pom.xml`:

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-validation</artifactId>
</dependency>
```

Two driver annotations:

| Annotation | Where | Effect |
| --- | --- | --- |
| `@Valid` | Method parameter (especially `@RequestBody`) | Cascades validation into the object's fields |
| `@Validated` | Class-level (or method param for groups) | Enables method-level validation (`@PathVariable`, `@RequestParam` constraints) and validation groups |

When validation fails on a `@RequestBody @Valid` param, Spring throws `MethodArgumentNotValidException` → mapped to `400` (and to a `ProblemDetail` if you've configured it — see [[06-Exception-Handling]]).

## Built-in constraints

```java
@NotNull            // not null
@NotEmpty           // not null & not empty (collection/string/array)
@NotBlank           // not null & has at least one non-whitespace char (string)
@Size(min=, max=)   // length / size
@Min(n) / @Max(n)   // numeric bounds
@Positive / @PositiveOrZero / @Negative / @NegativeOrZero
@Email
@Pattern(regexp="...")
@Past / @PastOrPresent / @Future / @FutureOrPresent
@Digits(integer=, fraction=)
@DecimalMin / @DecimalMax
@AssertTrue / @AssertFalse
```

## Code example

### Request DTO with constraints

```java
public record CreateUserRequest(
        @NotBlank @Email
        String email,

        @NotBlank
        @Size(min = 8, max = 64, message = "password must be 8-64 chars")
        @Pattern(regexp = "^(?=.*[A-Z])(?=.*\\d).+$",
                 message = "password must contain a digit and uppercase")
        String password,

        @NotBlank @Size(max = 100)
        String fullName,

        @NotNull @Past
        LocalDate birthDate,

        @Valid                  // cascade into nested object
        AddressDto address
) {}

public record AddressDto(
        @NotBlank String street,
        @NotBlank String city,
        @NotBlank @Pattern(regexp = "\\d{5}") String zip
) {}
```

### Controller

```java
@RestController
@RequestMapping("/api/v1/users")
@Validated   // enables param-level validation below
public class UserController {

    @PostMapping
    public UserResponse create(@RequestBody @Valid CreateUserRequest req) {
        // If req is invalid, this method is never called.
        return userService.create(req);
    }

    // Param-level constraints need @Validated on the class
    @GetMapping("/{id}")
    public UserResponse get(
            @PathVariable @Min(1) Long id,
            @RequestParam @Size(max = 50) String fields
    ) { ... }
}
```

### Custom validator

```java
@Target({ ElementType.FIELD, ElementType.PARAMETER })
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = UniqueEmailValidator.class)
public @interface UniqueEmail {
    String message() default "email already in use";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}

@Component
public class UniqueEmailValidator implements ConstraintValidator<UniqueEmail, String> {

    private final UserRepository repo;

    public UniqueEmailValidator(UserRepository repo) {
        this.repo = repo;
    }

    @Override
    public boolean isValid(String value, ConstraintValidatorContext ctx) {
        if (value == null) return true; // let @NotNull handle null
        return !repo.existsByEmail(value);
    }
}
```

Use it:
```java
public record CreateUserRequest(
        @NotBlank @Email @UniqueEmail String email, ...
) {}
```

### Validation groups (for create vs update)

```java
public interface OnCreate {}
public interface OnUpdate {}

public record UserUpsert(
        @Null(groups = OnCreate.class)
        @NotNull(groups = OnUpdate.class)
        Long id,

        @NotBlank(groups = { OnCreate.class, OnUpdate.class })
        @Email
        String email
) {}

@PostMapping
public UserResponse create(@RequestBody @Validated(OnCreate.class) UserUpsert req) { ... }

@PutMapping
public UserResponse update(@RequestBody @Validated(OnUpdate.class) UserUpsert req) { ... }
```

### Error response handler

```java
@RestControllerAdvice
public class ValidationExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ProblemDetail> handle(MethodArgumentNotValidException ex) {
        ProblemDetail pd = ProblemDetail.forStatus(HttpStatus.BAD_REQUEST);
        pd.setTitle("Validation failed");
        pd.setProperty("errors", ex.getBindingResult().getFieldErrors().stream()
                .map(e -> Map.of("field", e.getField(),
                                 "message", e.getDefaultMessage()))
                .toList());
        return ResponseEntity.badRequest().body(pd);
    }
}
```

## Express/TS comparison

```ts
// Zod
const CreateUser = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(64).regex(/(?=.*[A-Z])(?=.*\d)/),
  fullName: z.string().min(1).max(100),
  birthDate: z.coerce.date().refine(d => d < new Date()),
});

router.post('/users', (req, res) => {
  const result = CreateUser.safeParse(req.body);
  if (!result.success) return res.status(400).json(result.error);
  // ...
});
```

| Zod / class-validator | Bean Validation |
| --- | --- |
| `z.string().email()` | `@Email` |
| `z.string().min(8)` | `@Size(min = 8)` or `@NotBlank` |
| `z.number().positive()` | `@Positive` |
| `z.date().refine(d => d < new Date())` | `@Past` |
| `.refine(custom)` | Custom `ConstraintValidator` |
| `safeParse` | `MethodArgumentNotValidException` |
| Schema groups (`.partial()` for update) | Validation **groups** |

## Gotchas

> [!warning] Forgetting `@Valid`
> `@RequestBody CreateUserRequest req` (no `@Valid`) — Spring will deserialize but **skip all validations**. Always add `@Valid`.

> [!warning] `@NotNull` vs `@NotBlank` vs `@NotEmpty`
> - `@NotNull`: any object, just non-null
> - `@NotEmpty`: collections/strings — non-null AND size > 0
> - `@NotBlank`: strings only — non-null AND `.trim().length() > 0`
> Use `@NotBlank` for required strings.

> [!warning] Nested validation requires `@Valid` on the field
> Constraints inside `AddressDto` are NOT checked unless the field declares `@Valid`.

> [!warning] Path/query param validation requires `@Validated` on the CLASS
> `@Min(1)` on `@PathVariable Long id` is silently ignored without class-level `@Validated`.

> [!tip] Don't use validation for business rules requiring DB access in hot paths
> A `@UniqueEmail` validator hits the DB on every request. Fine for low-traffic endpoints; for high-traffic, use a unique index + handle the `DataIntegrityViolationException`.

## Related

- [[02-Request-Mapping-Path-Variables]]
- [[04-DTOs-and-Mapping]]
- [[06-Exception-Handling]]
- [[Records]]
