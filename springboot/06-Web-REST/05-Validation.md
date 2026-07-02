# Validation — Input Data Ko Trust Mat Karo

Socho ek second ke liye — Zomato pe koi order place kar raha hai. Usne address field mein kuch bhi likh diya: "abcdef", phone number mein "xyz", aur pincode mein "0". Agar backend ne bina check kiye ye data database mein daal diya, toh kya hoga? Delivery fail, customer angry, support ticket, aur ultimately — brand damage.

Yahi validation ka kaam hai. **Har incoming request ko trust mat karo.** Client-side validation sirf UX ke liye hai — backend validation tumhari asli line of defense hai.

Spring Boot mein ye kaam karta hai **Jakarta Bean Validation** (pehle JSR-380 kehte the), aur iska reference implementation hai **Hibernate Validator**. Agar tum Node.js/TypeScript se aaye ho, toh samjho — ye Java ka `Zod` hai. Bas annotations se kaam ho jaata hai, runtime pe manually parse nahi karna padta.

---

## Setup — Dependency Ek Hi Hai

`pom.xml` mein bas ek dependency add karo:

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-validation</artifactId>
</dependency>
```

Bas. Spring Boot baaki sab wire kar dega — Hibernate Validator automatically activate ho jaata hai. Koi extra config nahi chahiye.

> [!info] Node.js comparison
> TypeScript mein tum `zod` ya `class-validator` manually install karte ho, phir manually `parse()` ya `validate()` call karte ho. Spring Boot mein ye sab framework level pe hota hai — tum sirf annotations lagate ho aur Spring khud validation run karta hai **controller method call hone se pehle**.

---

## Kaise Kaam Karta Hai — Flow Samjho

Jab koi POST request aati hai `/api/v1/orders` pe with a JSON body:

1. Spring pehle JSON ko Java object mein deserialize karta hai (Jackson ka kaam)
2. Phir Bean Validation run hoti hai — har annotated field check hota hai
3. Agar koi bhi field fail kare — `MethodArgumentNotValidException` throw hoti hai
4. Ye exception automatically `400 Bad Request` mein map ho jaati hai
5. **Tumhara controller method kabhi call hi nahi hota** — security!

Ye flow tabhi kaam karta hai jab tum `@Valid` lagaate ho controller parameter pe. Bina `@Valid` ke, Spring deserialize karega lekin validate nahi karega — bahut common gotcha hai ye.

---

## Do Driver Annotations — `@Valid` vs `@Validated`

| Annotation | Kahan Lagate Hain | Kya Karta Hai |
|---|---|---|
| `@Valid` | Method parameter pe (mostly `@RequestBody`) | Object ke andar ke fields validate karta hai |
| `@Validated` | Class level pe (ya method param pe groups ke saath) | Path variables, query params pe bhi validation enable karta hai; validation groups bhi support karta hai |

Seedha rule yaad rakho:
- `@RequestBody` ke saath? Use `@Valid`
- `@PathVariable` / `@RequestParam` pe constraints? Controller class pe `@Validated` lagao
- Validation groups use karne hain? `@Validated(GroupName.class)` use karo

---

## Built-in Constraints — Kitne Hain Ye

Spring ke saath itne annotations aate hain ki zyada cases mein custom validator ki zaroorat hi nahi padti:

```java
// Null checks
@NotNull            // sirf null check — empty string allow hai
@NotEmpty           // null nahi + size > 0 (strings, collections, arrays)
@NotBlank           // null nahi + trim ke baad bhi kuch hona chahiye (sirf strings)

// Size aur length
@Size(min=2, max=100)   // string length ya collection size

// Numbers
@Min(1)
@Max(999)
@Positive           // > 0
@PositiveOrZero     // >= 0
@Negative           // < 0
@NegativeOrZero     // <= 0
@DecimalMin("0.01")
@DecimalMax("99999.99")
@Digits(integer=5, fraction=2)  // jaise price: 12345.67

// String format
@Email
@Pattern(regexp="^[A-Z]{2}\\d{4}$")  // custom regex

// Dates (java.time ke saath kaam karta hai)
@Past               // date past mein honi chahiye
@PastOrPresent
@Future             // date future mein honi chahiye
@FutureOrPresent

// Boolean
@AssertTrue
@AssertFalse
```

> [!tip] `@NotBlank` vs `@NotEmpty` vs `@NotNull`
> Ye teen mein confusion bahut hoti hai. Simple rule:
> - Strings ke liye hamesha `@NotBlank` use karo — ye sabse strict hai
> - Collections/arrays ke liye `@NotEmpty` use karo
> - `@NotNull` tab jab koi bhi non-null value acceptable ho (including empty string) — rare case

---

## Code Example — Ek Real Scenario

UPI-style payment app banao. User ko register karna hai. DTO aur controller dono dekhte hain:

### Request DTO with Constraints

```java
// CreateUserRequest.java
public record CreateUserRequest(

        // Email: blank nahi, valid format hona chahiye
        @NotBlank(message = "Email required hai")
        @Email(message = "Valid email format chahiye, jaise user@example.com")
        String email,

        // Password: strong hona chahiye
        @NotBlank(message = "Password required hai")
        @Size(min = 8, max = 64, message = "Password 8 se 64 characters ke beech hona chahiye")
        @Pattern(
            regexp = "^(?=.*[A-Z])(?=.*\\d).+$",
            message = "Password mein kam se kam ek uppercase letter aur ek digit hona chahiye"
        )
        String password,

        // Name: 100 chars se zyada nahi
        @NotBlank(message = "Full name required hai")
        @Size(max = 100, message = "Name 100 characters se zyada nahi ho sakta")
        String fullName,

        // Phone: Indian mobile number format
        @NotBlank(message = "Phone required hai")
        @Pattern(
            regexp = "^[6-9]\\d{9}$",
            message = "Valid Indian mobile number chahiye (10 digits, 6-9 se start)"
        )
        String phoneNumber,

        // Date of birth: past mein honi chahiye (future mein born nahi ho sakte!)
        @NotNull(message = "Date of birth required hai")
        @Past(message = "Date of birth past mein honi chahiye")
        LocalDate dateOfBirth,

        // Nested object — @Valid lagana ZARURI hai cascade ke liye
        @Valid
        @NotNull(message = "Address required hai")
        AddressDto address

) {}
```

```java
// AddressDto.java — nested object
public record AddressDto(

        @NotBlank(message = "Street required hai")
        String street,

        @NotBlank(message = "City required hai")
        String city,

        @NotBlank(message = "State required hai")
        String state,

        // Indian pincode — 6 digits exactly
        @NotBlank(message = "Pincode required hai")
        @Pattern(regexp = "^[1-9][0-9]{5}$", message = "Valid 6-digit Indian pincode chahiye")
        String pincode

) {}
```

### Controller

```java
@RestController
@RequestMapping("/api/v1/users")
@Validated   // Class-level @Validated: path/query param constraints ke liye zaruri
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    // @Valid on @RequestBody — ye validate karega CreateUserRequest ke fields
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponse create(@RequestBody @Valid CreateUserRequest req) {
        // Agar req invalid hai, ye method kabhi call hi nahi hoga
        // Spring khud 400 return kar dega with validation errors
        return userService.create(req);
    }

    // Path variable constraint — @Validated class-level chahiye iske liye
    @GetMapping("/{id}")
    public UserResponse getById(
            @PathVariable @Min(value = 1, message = "User ID 1 se zyada hona chahiye") Long id
    ) {
        return userService.findById(id);
    }

    // Query param constraint
    @GetMapping("/search")
    public List<UserResponse> search(
            @RequestParam
            @NotBlank(message = "Search query blank nahi ho sakti")
            @Size(min = 2, max = 50, message = "Search query 2-50 chars ke beech honi chahiye")
            String query
    ) {
        return userService.search(query);
    }
}
```

---

## Custom Validator — Jab Built-in Kaafi Na Ho

Socho Swiggy pe restaurant register ho raha hai. FSSAI license number unique hona chahiye — koi doosra restaurant same number se register nahi kar sakta. Ye check database se hoga, built-in annotations se nahi hoga. Iske liye custom validator banate hain.

### Step 1: Custom Annotation Banao

```java
// UniqueFssaiLicense.java
@Target({ ElementType.FIELD, ElementType.PARAMETER })
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = UniqueFssaiLicenseValidator.class)
@Documented
public @interface UniqueFssaiLicense {
    // Ye teen methods MANDATORY hain har constraint annotation mein
    String message() default "Ye FSSAI license number already registered hai";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}
```

### Step 2: Validator Logic Likho

```java
// UniqueFssaiLicenseValidator.java
@Component
public class UniqueFssaiLicenseValidator
        implements ConstraintValidator<UniqueFssaiLicense, String> {

    private final RestaurantRepository restaurantRepo;

    // Constructor injection — Spring Bean hai to injection kaam karega
    public UniqueFssaiLicenseValidator(RestaurantRepository restaurantRepo) {
        this.restaurantRepo = restaurantRepo;
    }

    @Override
    public boolean isValid(String value, ConstraintValidatorContext ctx) {
        // Null handle mat karo yahan — @NotNull alag handle karega
        if (value == null || value.isBlank()) return true;

        // DB check — exist karta hai to invalid
        return !restaurantRepo.existsByFssaiLicense(value);
    }
}
```

### Step 3: Use Karo DTO Mein

```java
public record RegisterRestaurantRequest(

        @NotBlank(message = "Restaurant name required hai")
        String name,

        @NotBlank(message = "FSSAI license required hai")
        @Pattern(regexp = "^\\d{14}$", message = "FSSAI license 14 digits ka hona chahiye")
        @UniqueFssaiLicense  // custom annotation — DB check karega
        String fssaiLicense,

        @Valid
        @NotNull
        AddressDto address

) {}
```

> [!warning] Custom Validator aur Performance
> `@UniqueFssaiLicense` har request pe DB hit karega. Low traffic endpoints pe fine hai. High traffic pe socho — better approach: unique constraint database mein bhi daalo aur `DataIntegrityViolationException` handle karo. Dono layers mein protection.

---

## Validation Groups — Create vs Update Ka Alag Logic

Ye ek advanced feature hai jो bahut useful hai. Problem kya hai?

Flipkart pe product listing:
- **Create karte waqt**: `id` field nahi hona chahiye (database khud generate karega)
- **Update karte waqt**: `id` field mandatory hai (kaunsa product update karein?)

Ek hi DTO use karna hai, lekin dono ke validation rules alag hain. Validation groups solve karta hai ye:

### Groups Define Karo (Simple Marker Interfaces)

```java
// Sirf marker interfaces hain — koi method nahi
public interface OnCreate {}
public interface OnUpdate {}
```

### DTO Mein Groups Lagao

```java
public record ProductUpsertRequest(

        // Create pe: id nahi hona chahiye (null hona chahiye)
        // Update pe: id mandatory hai
        @Null(groups = OnCreate.class, message = "Create pe ID mat do — system generate karega")
        @NotNull(groups = OnUpdate.class, message = "Update pe product ID required hai")
        Long id,

        // Dono cases mein name required
        @NotBlank(groups = { OnCreate.class, OnUpdate.class }, message = "Product name required hai")
        @Size(max = 200, groups = { OnCreate.class, OnUpdate.class })
        String name,

        // Price: create pe mandatory, update pe optional (partial update)
        @NotNull(groups = OnCreate.class, message = "Price required hai new product ke liye")
        @Positive(groups = { OnCreate.class, OnUpdate.class }, message = "Price positive hona chahiye")
        @DecimalMax(value = "99999.99", groups = { OnCreate.class, OnUpdate.class })
        BigDecimal price,

        @NotBlank(groups = OnCreate.class)
        String category

) {}
```

### Controller Mein Groups Use Karo

```java
@RestController
@RequestMapping("/api/v1/products")
@Validated
public class ProductController {

    // Create: @Validated(OnCreate.class) — sirf OnCreate rules apply honge
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProductResponse create(
            @RequestBody @Validated(OnCreate.class) ProductUpsertRequest req
    ) {
        return productService.create(req);
    }

    // Update: @Validated(OnUpdate.class) — sirf OnUpdate rules apply honge
    @PutMapping("/{id}")
    public ProductResponse update(
            @PathVariable @Min(1) Long id,
            @RequestBody @Validated(OnUpdate.class) ProductUpsertRequest req
    ) {
        return productService.update(id, req);
    }
}
```

> [!info] Groups vs `@Valid`
> Jab tum `@Validated(OnCreate.class)` use karte ho, sirf whi constraints apply hote hain jinpe `groups = OnCreate.class` likha hai. Jo constraints bina groups ke hain (default group), woh apply NAHI hote. Agar default + specific group dono chahiye, toh groups mein `Default.class` bhi include karo.

---

## Error Response Handler — Validation Errors Ko Dhang Se Return Karo

By default Spring ka 400 response kuch aisa dikhta hai (Spring Boot 3.x mein `ProblemDetail` format):

```json
{
  "type": "about:blank",
  "title": "Bad Request",
  "status": 400,
  "detail": "Invalid request content.",
  "instance": "/api/v1/users"
}
```

Ye production ke liye theek nahi — client ko exactly pata hona chahiye ki **kaunsa field fail hua aur kyun**. Custom handler banao:

```java
@RestControllerAdvice
public class ValidationExceptionHandler {

    // @RequestBody validation failures
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ProblemDetail> handleValidationErrors(
            MethodArgumentNotValidException ex,
            HttpServletRequest request
    ) {
        // Field-level errors collect karo
        List<Map<String, String>> fieldErrors = ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .map(error -> Map.of(
                        "field", error.getField(),
                        "rejectedValue", String.valueOf(error.getRejectedValue()),
                        "message", error.getDefaultMessage()
                ))
                .toList();

        ProblemDetail pd = ProblemDetail.forStatus(HttpStatus.BAD_REQUEST);
        pd.setTitle("Validation Failed");
        pd.setDetail("Request mein " + fieldErrors.size() + " validation error(s) hain");
        pd.setProperty("errors", fieldErrors);
        pd.setProperty("path", request.getRequestURI());

        return ResponseEntity.badRequest().body(pd);
    }

    // Path variable / query param validation failures
    // (@Validated class-level se trigger hota hai)
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ProblemDetail> handleConstraintViolations(
            ConstraintViolationException ex
    ) {
        List<Map<String, String>> violations = ex.getConstraintViolations()
                .stream()
                .map(cv -> Map.of(
                        "param", cv.getPropertyPath().toString(),
                        "message", cv.getMessage()
                ))
                .toList();

        ProblemDetail pd = ProblemDetail.forStatus(HttpStatus.BAD_REQUEST);
        pd.setTitle("Parameter Validation Failed");
        pd.setProperty("violations", violations);

        return ResponseEntity.badRequest().body(pd);
    }
}
```

Ab response kuch aisa aayega:

```json
{
  "type": "about:blank",
  "title": "Validation Failed",
  "status": 400,
  "detail": "Request mein 3 validation error(s) hain",
  "errors": [
    {
      "field": "email",
      "rejectedValue": "not-an-email",
      "message": "Valid email format chahiye, jaise user@example.com"
    },
    {
      "field": "phoneNumber",
      "rejectedValue": "12345",
      "message": "Valid Indian mobile number chahiye (10 digits, 6-9 se start)"
    },
    {
      "field": "address.pincode",
      "rejectedValue": "abc",
      "message": "Valid 6-digit Indian pincode chahiye"
    }
  ],
  "path": "/api/v1/users"
}
```

---

## Node.js / TypeScript Se Comparison

Agar tum Zod use karte the, toh mapping samajh lo:

```ts
// TypeScript + Zod equivalent
const CreateUserSchema = z.object({
  email: z.string().email("Valid email format chahiye"),
  password: z.string()
    .min(8, "Minimum 8 chars")
    .max(64, "Maximum 64 chars")
    .regex(/^(?=.*[A-Z])(?=.*\d).+$/, "Uppercase + digit required"),
  fullName: z.string().min(1).max(100),
  phoneNumber: z.string().regex(/^[6-9]\d{9}$/, "Valid Indian mobile number"),
  dateOfBirth: z.coerce.date().refine(d => d < new Date(), "Past date chahiye"),
  address: z.object({
    street: z.string().min(1),
    city: z.string().min(1),
    pincode: z.string().regex(/^[1-9][0-9]{5}$/)
  })
});

// Express mein manually validate karna padta hai
router.post('/users', (req, res) => {
  const result = CreateUserSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ errors: result.error.flatten() });
  }
  // ...
});
```

```java
// Spring Boot equivalent — controller mein sirf @Valid
@PostMapping
public UserResponse create(@RequestBody @Valid CreateUserRequest req) {
    // Validation automatic — koi safeParse nahi, koi manual check nahi
    return userService.create(req);
}
```

| Zod / class-validator | Bean Validation |
|---|---|
| `z.string().email()` | `@Email` |
| `z.string().min(8).max(64)` | `@Size(min = 8, max = 64)` |
| `z.string().regex(...)` | `@Pattern(regexp = "...")` |
| `z.number().positive()` | `@Positive` |
| `z.coerce.date().refine(d => d < new Date())` | `@Past` |
| `.refine(customFn)` | Custom `ConstraintValidator` |
| `safeParse()` return karta hai | `MethodArgumentNotValidException` throw hoti hai |
| Schema `.partial()` for update | Validation **groups** |
| `z.string().min(1)` for required | `@NotBlank` |

Ek bada farq: Zod mein tum manually decide karte ho kab validate karna hai. Spring mein framework automatically validate karta hai — tumhe bas `@Valid` lagana hai aur field pe annotation. **Less boilerplate, more convention.**

---

## Gotchas — Beginners Ki Galtiyan

> [!warning] Sabse Common: `@Valid` Bhool Gaye
> ```java
> // GALAT — validation kabhi nahi chalegi!
> public UserResponse create(@RequestBody CreateUserRequest req) { ... }
>
> // SAHI — @Valid ke saath
> public UserResponse create(@RequestBody @Valid CreateUserRequest req) { ... }
> ```
> Spring silently deserialize karega, validation skip ho jaayegi, aur invalid data service tak pahunch jaayega. Koi error nahi, koi warning nahi — bas validation missing.

> [!warning] Nested Object Pe `@Valid` Bhool Gaye
> ```java
> // GALAT — AddressDto ke fields validate NAHI honge
> public record CreateUserRequest(
>     @NotNull AddressDto address  // @Valid nahi lagaya
> ) {}
>
> // SAHI — cascade ke liye @Valid zaruri hai
> public record CreateUserRequest(
>     @Valid @NotNull AddressDto address
> ) {}
> ```
> Ye bahut common mistake hai. Address field null check hoga, lekin andar ke street/city/pincode fields skip ho jaayenge.

> [!warning] Path/Query Params: `@Validated` Class Pe Chahiye
> ```java
> // GALAT — @Min silently ignore ho jaayega
> @RestController
> public class UserController {
>     @GetMapping("/{id}")
>     public UserResponse get(@PathVariable @Min(1) Long id) { ... }
> }
>
> // SAHI — class pe @Validated lagao
> @RestController
> @Validated  // <-- ye chahiye
> public class UserController {
>     @GetMapping("/{id}")
>     public UserResponse get(@PathVariable @Min(1) Long id) { ... }
> }
> ```
> Path variable aur query param constraints ke liye class-level `@Validated` mandatory hai. Bina iske, `@Min`, `@Size`, `@NotBlank` annotations completely ignore ho jaate hain.

> [!warning] `@NotNull` vs `@NotEmpty` vs `@NotBlank` — Ye Teen Alag Hain
> ```java
> String s = "   ";  // sirf whitespace
>
> @NotNull  // PASS karega — null nahi hai
> @NotEmpty // PASS karega — length > 0 hai (whitespace bhi count hota hai)
> @NotBlank // FAIL karega — trim ke baad kuch nahi bachta
> ```
> Required string fields ke liye **hamesha `@NotBlank` use karo**. Ye sabse strict hai.

> [!warning] Custom Validator Ka Performance Impact
> `@UniqueEmail`, `@UniqueFssaiLicense` jaisi annotations DB query chalati hain har request pe. High traffic endpoints pe ye bottleneck ban sakta hai. Solution:
> 1. DB level pe unique index zaroor rakho
> 2. `DataIntegrityViolationException` ko service/handler level pe catch karo
> 3. Custom validator ko low-traffic endpoints tak limit karo (jaise registration)

> [!tip] `message` Attribute Customize Karo
> Default messages English mein hain aur generic hain. Production app mein hamesha custom messages likho:
> ```java
> @Size(min = 8, max = 64, message = "Password 8 se 64 characters ke beech hona chahiye")
> @Pattern(regexp = "^[6-9]\\d{9}$", message = "Valid Indian mobile number chahiye")
> ```
> Client developers aur end users dono ko samajh mein aata hai.

> [!tip] DTO Pe Validation, Service Layer Pe Nahi
> Kuch log service layer mein manually validate karte hain. Ye anti-pattern hai. Controller layer pe `@Valid` se validation karo — request controller se aage hi na jaaye agar invalid hai. Service layer business logic ke liye hai, input validation ke liye nahi.

---

## Key Takeaways

- **Dependency**: `spring-boot-starter-validation` add karo — bas itna kaafi hai setup ke liye
- **`@Valid`**: `@RequestBody` ke saath lagao — object ke fields validate honge controller call hone se pehle
- **`@Validated`**: Controller class pe lagao jab `@PathVariable` ya `@RequestParam` pe constraints chahiye
- **`@NotBlank`** required strings ke liye, **`@NotEmpty`** collections ke liye, **`@NotNull`** sirf null check ke liye
- **Nested objects**: `@Valid` field pe lagao tabhi cascade validation chalegi
- **Validation groups**: Ek hi DTO create aur update dono ke liye use karo, alag rules ke saath
- **Custom validators**: `ConstraintValidator` implement karo complex rules ke liye (DB checks, business rules)
- **Error handling**: `MethodArgumentNotValidException` (request body) aur `ConstraintViolationException` (path/query params) ko custom handler se pakdo
- **Performance**: DB-hitting custom validators low traffic pe theek hain; high traffic pe DB unique index + exception handling prefer karo
- **Node.js comparison**: Zod ka declarative style + Express ka manual `safeParse` = Spring ka `@Valid` annotations — same idea, alag execution
