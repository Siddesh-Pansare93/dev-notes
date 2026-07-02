# OpenAPI / Swagger

Socho ek second ke liye — tumne ek kaafi bada REST API banaya. Zomato jaisi app ke liye, jisme `/orders`, `/restaurants`, `/menu`, `/payments` — sab kuch hai. Ab tumhara frontend team aata hai aur poochta hai: "Yaar, `/api/v1/orders` mein kya bhejein? Request body ka format kya hai? Kaunsa field required hai? Kaunsa response aayega — 200? 201? 404?"

Aur tum manually Word document banate ho. Ya Notion page. Ya WhatsApp pe bata dete ho. Aur phir code change hota hai, documentation outdated ho jaata hai. Classic problem.

**OpenAPI** iska solution hai. Aur **Swagger UI** uski "face" hai — ek interactive browser-based documentation jo live API ke saath kaam karta hai.

---

## OpenAPI Kya Hai? (Problem First, Solution Second)

**OpenAPI Specification (OAS)** ek standard format hai API ko describe karne ka — machine-readable JSON ya YAML mein. Iska pehla naam "Swagger Specification" tha, tab se log "Swagger" bolte hain chahe actual standard ka naam OpenAPI ho.

Is spec mein hota hai:
- Kaun kaun se endpoints hain (`/api/v1/orders`)
- Har endpoint ka HTTP method kya hai (`GET`, `POST`, etc.)
- Request body ka schema kya hai (kaunsa field required, kaunsa optional, kaunsa type)
- Query params, path variables, headers — sab
- Response codes aur unka schema (200 mein kya milega, 404 mein kya)
- Authentication kaise hogi (Bearer JWT, API Key, etc.)

Jab yeh spec ready ho, tum usse:
1. **Swagger UI** mein render kar sakte ho — beautiful interactive docs
2. Client code generate kar sakte ho (TypeScript, Kotlin, Python — koi bhi)
3. Mock server bana sakte ho
4. Contract testing kar sakte ho

---

## Springdoc-OpenAPI: Spring Ka Magic

Node.js mein agar docs banana hai toh `swagger-jsdoc` ke saath har route pe JSDoc comments likhte the — manually. Tedious tha.

Spring mein **springdoc-openapi** library automatically docs generate karti hai — sirf ek dependency add karo. Woh tumhare codebase ko "introspect" karti hai:

- `@RestController` + `@GetMapping`/`@PostMapping` etc. → endpoints detect ho jaate hain
- DTO classes + `@NotNull`, `@Size`, `@Email` etc. → schema constraints automatically aati hain
- `@RequestBody`, `@RequestParam`, `@PathVariable` → parameters automatically map ho jaate hain
- Return types (`ResponseEntity<UserResponse>`) → response schema generate ho jaata hai
- Fine-tuning ke liye `@Operation`, `@Schema`, `@Parameter` annotations use kar sakte ho

**Generated artifacts:**
- **OpenAPI JSON/YAML**: `/v3/api-docs`
- **Swagger UI**: `/swagger-ui.html`

Ek dependency, ek restart — aur teri poori API ki documentation live hai. Zero handwritten YAML.

> [!tip] Node.js se aaye ho?
> `swagger-jsdoc` mein har route pe JSDoc likhna padta tha, tab bhi manually. `tsoa` thoda better tha — decorators se generate hota tha. Spring ka springdoc `tsoa` se bhi zyada automatic hai — Bean Validation annotations (`@NotNull`, `@Size`) bhi schema mein automatically reflect ho jaate hain, alag se kuch nahi likhna.

---

## Setup: Sirf Ek Dependency

### Step 1 — Dependency Add Karo

```xml
<!-- pom.xml mein add karo -->
<dependency>
    <groupId>org.springdoc</groupId>
    <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
    <version>2.6.0</version>
</dependency>
```

Bas itna. App restart karo aur `http://localhost:8080/swagger-ui.html` kholo.

> [!info] WebFlux use kar rahe ho?
> Tab `springdoc-openapi-starter-webmvc-ui` ki jagah `springdoc-openapi-starter-webflux-ui` use karo. MVC aur WebFlux ke liye alag starter hai.

---

## Global Metadata Configure Karna

Default docs thoda bland hote hain — "Generated API" jaisa title. Real projects mein tum isko customize karte ho: API ka naam, version, contact info, servers, aur security scheme.

```java
@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI api() {
        return new OpenAPI()
                // API ki basic info — title, version, description
                .info(new Info()
                        .title("Zomato Order Service API")
                        .version("v1.0")
                        .description("Order management service — restaurants, items, delivery tracking")
                        .contact(new Contact()
                                .name("Backend Platform Team")
                                .email("platform@zomato.com"))
                        .license(new License().name("Internal Only")))

                // Kaunse servers hain? Local aur production dono add karo
                .addServersItem(new Server()
                        .url("https://api.zomato.com")
                        .description("Production"))
                .addServersItem(new Server()
                        .url("http://localhost:8080")
                        .description("Local Dev"))

                // JWT Bearer auth ka security scheme define karo
                .components(new Components()
                        .addSecuritySchemes("bearer-jwt",
                                new SecurityScheme()
                                        .type(SecurityScheme.Type.HTTP)
                                        .scheme("bearer")
                                        .bearerFormat("JWT")
                                        .description("Login karo, token lo, Swagger UI mein 'Authorize' mein dalo")))

                // Yeh security scheme globally apply karo sab endpoints pe
                .addSecurityItem(new SecurityRequirement().addList("bearer-jwt"));
    }
}
```

`addSecurityItem` globally all endpoints pe JWT requirement lagaata hai. Agar koi public endpoint hai (jaise `/api/health`), toh controller method pe `@SecurityRequirements({})` laga do — wo endpoint unarranged ho jaayega.

---

## Controller Ko Annotate Karna

Springdoc automatically controller se docs generate karta hai. Lekin `@Operation`, `@ApiResponse`, `@Parameter` se tum aur detailed information add kar sakte ho.

```java
@RestController
@RequestMapping("/api/v1/orders")
@Tag(name = "Orders", description = "Zomato order lifecycle — place, track, cancel")
// @Tag se Swagger UI mein grouping hoti hai — Orders ek section mein, Users alag section mein
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    // --------- GET /api/v1/orders/{id} ---------
    @Operation(
        summary = "Get order by ID",
        description = "Ek specific order fetch karta hai. 404 return karta hai agar order exist nahi karta."
    )
    @ApiResponses({
        @ApiResponse(
            responseCode = "200",
            description = "Order mila",
            content = @Content(schema = @Schema(implementation = OrderResponse.class))
        ),
        @ApiResponse(
            responseCode = "404",
            description = "Order nahi mila",
            content = @Content(schema = @Schema(implementation = ProblemDetail.class))
        ),
        @ApiResponse(
            responseCode = "401",
            description = "Token nahi diya ya expired hai",
            content = @Content
        )
    })
    @GetMapping("/{id}")
    public OrderResponse getOrder(
            @Parameter(description = "Order ID (numeric)", example = "10042")
            @PathVariable Long id) {
        return orderService.findById(id);
    }

    // --------- POST /api/v1/orders ---------
    @Operation(
        summary = "Place a new order",
        description = "Naya order place karta hai. Cart items aur delivery address required hai."
    )
    @ApiResponse(responseCode = "201", description = "Order successfully placed")
    @ApiResponse(responseCode = "400", description = "Validation error — fields check karo")
    @ApiResponse(responseCode = "409", description = "Restaurant abhi closed hai")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OrderResponse placeOrder(
            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                description = "Order placement request — cart + delivery details",
                required = true
            )
            @org.springframework.web.bind.annotation.RequestBody
            @Valid PlaceOrderRequest req) {
        return orderService.place(req);
    }

    // --------- DELETE /api/v1/orders/{id} ---------
    @Operation(summary = "Cancel an order")
    @ApiResponse(responseCode = "204", description = "Order cancelled")
    @ApiResponse(responseCode = "409", description = "Order already delivered, cancel nahi ho sakta")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void cancelOrder(
            @Parameter(description = "Order ID to cancel", example = "10042")
            @PathVariable Long id) {
        orderService.cancel(id);
    }

    // --------- GET /api/v1/orders?status=PLACED&page=0&size=20 ---------
    @Operation(summary = "List orders with filters")
    @GetMapping
    public Page<OrderResponse> listOrders(
            @Parameter(description = "Filter by status", example = "PLACED")
            @RequestParam(required = false) OrderStatus status,

            @Parameter(description = "Page number (0-indexed)", example = "0")
            @RequestParam(defaultValue = "0") int page,

            @Parameter(description = "Page size", example = "20")
            @RequestParam(defaultValue = "20") int size) {
        return orderService.list(status, PageRequest.of(page, size));
    }
}
```

> [!warning] `@RequestBody` import ka chakkar
> Do `@RequestBody` annotations exist karte hain:
> - `org.springframework.web.bind.annotation.RequestBody` — Spring ka, request body bind karta hai
> - `io.swagger.v3.oas.annotations.parameters.RequestBody` — Springdoc ka, documentation ke liye
>
> Dono alag-alag kaam karte hain. Spring wala hamesha chahiye body binding ke liye. Springdoc wala sirf documentation customize karne ke liye. Galat import mat karo — compiler error nahi aayega lekin docs wrong honge.

---

## DTOs Pe Schema Annotations

Jab tum DTO class ya record banate ho, `@Schema` annotation se Swagger docs mein description aur examples add kar sakte ho.

```java
// PlaceOrderRequest — Swagger mein iska schema dikhega with examples
@Schema(description = "New order placement request")
public record PlaceOrderRequest(

        @Schema(description = "Restaurant ka ID", example = "5023")
        @NotNull
        Long restaurantId,

        @Schema(description = "Cart items — ek ya zyada items")
        @NotEmpty
        List<CartItemRequest> items,

        @Schema(description = "Delivery address ID", example = "addr_789")
        @NotBlank
        String deliveryAddressId,

        @Schema(description = "Special instructions (optional)", example = "Extra spicy, no onions",
                nullable = true)
        String specialInstructions,

        @Schema(description = "Payment method",
                allowableValues = {"UPI", "CARD", "COD", "WALLET"},
                example = "UPI")
        @NotNull
        PaymentMethod paymentMethod
) {}

// CartItemRequest — nested DTO
@Schema(description = "Single cart item")
public record CartItemRequest(

        @Schema(description = "Menu item ID", example = "menu_456")
        @NotBlank
        String menuItemId,

        @Schema(description = "Quantity (1-10)", minimum = "1", maximum = "10", example = "2")
        @Min(1) @Max(10)
        int quantity
) {}

// OrderResponse — response DTO
@Schema(description = "Order details response")
public record OrderResponse(

        @Schema(example = "10042")
        Long id,

        @Schema(example = "5023")
        Long restaurantId,

        @Schema(example = "PLACED",
                allowableValues = {"PLACED", "ACCEPTED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"})
        OrderStatus status,

        List<OrderItemResponse> items,

        @Schema(description = "Total amount in INR", example = "649.00")
        BigDecimal totalAmount,

        @Schema(description = "Estimated delivery time", example = "2025-05-10T14:30:00Z")
        Instant estimatedDelivery,

        // Password jaisi sensitive fields ke liye WRITE_ONLY use karo
        // — request mein aata hai, response mein nahi dikhna chahiye
        @Schema(accessMode = Schema.AccessMode.READ_ONLY)
        Instant createdAt
) {}
```

> [!tip] `accessMode` — kab use karo
> - `WRITE_ONLY` — field sirf request body mein hoga (jaise password, PIN) — response schema mein nahi dikhega
> - `READ_ONLY` — field sirf response mein hoga (jaise `createdAt`, `id`) — request schema mein nahi dikhega
> - Default — dono jagah dikhega

---

## application.yml Configuration

```yaml
springdoc:
  # OpenAPI JSON/YAML ka path
  api-docs:
    path: /v3/api-docs
    enabled: true

  # Swagger UI settings
  swagger-ui:
    path: /swagger-ui.html
    operations-sorter: method      # HTTP methods ke hisaab se sort karo (GET, POST, PUT, DELETE)
    tags-sorter: alpha             # Tags/controllers alphabetically sort
    try-it-out-enabled: true       # Swagger UI se directly API call kar sako
    persist-authorization: true    # Token dalne ke baad refresh pe bhi rahe — dev ke liye helpful

  show-actuator: false             # /actuator endpoints docs mein mat dikhao

  # Specific package scan karo — sab controllers pick nahi karna
  packages-to-scan: com.example.zomato.orders

  # Sirf /api/ se shuru hone wale paths include karo
  paths-to-match: /api/**

  # Default media type
  default-produces-media-type: application/json
```

---

## Production Mein Docs Disable Karna

Public production environment mein Swagger UI expose karna generally bad idea hai — internal API structure leak ho sakti hai, aur bots scan karte hain.

```yaml
# application-prod.yml — prod profile ke liye
---
spring.config.activate.on-profile: prod

springdoc:
  api-docs:
    enabled: false
  swagger-ui:
    enabled: false
```

Jab `SPRING_PROFILES_ACTIVE=prod` hoga, docs completely off ho jaayenge.

> [!info] Alag approach — IP whitelist
> Kuch teams docs completely disable nahi karte production mein, balki Spring Security se sirf specific IPs ko allow karte hain (jaise VPN ke through). Depends on your team's preference.

---

## Build Time Pe Static OpenAPI Generate Karna

Kuch cases mein runtime pe docs serve karna nahi chahte — instead, CI/CD mein ek static `openapi.json` file generate karo aur use client code generation ya contract testing ke liye use karo.

`pom.xml` mein yeh plugin add karo:

```xml
<plugin>
    <groupId>org.springdoc</groupId>
    <artifactId>springdoc-openapi-maven-plugin</artifactId>
    <version>1.4</version>
    <executions>
        <execution>
            <!-- integration-test phase mein run hoga — app start hona chahiye pehle -->
            <phase>integration-test</phase>
            <goals>
                <goal>generate</goal>
            </goals>
        </execution>
    </executions>
    <configuration>
        <!-- Running app se JSON fetch karega -->
        <apiDocsUrl>http://localhost:8080/v3/api-docs</apiDocsUrl>
        <!-- Output file name -->
        <outputFileName>openapi.json</outputFileName>
        <!-- target/ directory mein save hoga -->
        <outputDir>${project.build.directory}</outputDir>
    </configuration>
</plugin>
```

Is `openapi.json` ko phir `openapi-generator` se TypeScript client, Android SDK, ya kuch bhi generate kar sakte ho — bilkul automatically CI mein.

---

## Express/TS se Comparison

Node.js mein kya hota tha, Spring mein kya hota hai:

```typescript
// Node.js approach 1 — swagger-jsdoc (manual JSDoc)
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const spec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: { title: 'Zomato API', version: '1.0' },
  },
  // Har route file mein JSDoc comments likhne padte hain
  apis: ['./src/**/*.ts'],
});

app.use('/docs', swaggerUi.serve, swaggerUi.setup(spec));

// Problem: Agar route change kiya aur JSDoc update bhool gaye
// toh docs aur code out of sync ho jaate hain — Spring mein yeh problem nahi
```

```typescript
// Node.js approach 2 — tsoa (decorator based, Spring jaisa)
import { Route, Get, Tags, Path, Security } from 'tsoa';

@Route('orders')
@Tags('Orders')
@Security('jwt')
export class OrderController {
  @Get('{id}')
  async getOrder(@Path() id: number): Promise<OrderResponse> {
    // ...
  }
}
// tsoa bhi code-first hai, Spring jaisa — lekin explicit codegen step chahiye
```

| Feature | TypeScript (swagger-jsdoc) | TypeScript (tsoa) | Spring (springdoc) |
|---|---|---|---|
| Documentation source | Manual JSDoc comments | Decorators + types | Controllers + annotations (auto) |
| Validation → Schema | Manual sync | Partial | Bean Validation auto-reflects |
| Swagger UI | `swagger-ui-express` | `swagger-ui-express` | Built-in `/swagger-ui.html` |
| Out of sync risk | High | Medium | Very Low |
| Setup effort | Low (JSDoc) | Medium (codegen step) | Very Low (1 dependency) |

Spring ka approach sabse "magical" hai — tumhara validation code (`@NotBlank @Size(min=8)`) automatically OpenAPI schema mein constraints ke roop mein dikhta hai. Node mein yeh manually sync karna padta tha.

---

## Gotchas — Common Mistakes

> [!warning] Spring Security Docs Ko Block Karta Hai
> Jab Spring Security project mein ho, `/v3/api-docs/**` aur `/swagger-ui/**` by default secured ho jaate hain — tum 401 dekhoge. Explicitly permit karo:
>
> ```java
> @Bean
> public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
>     return http
>         .authorizeHttpRequests(auth -> auth
>             // Docs ke liye permit — production mein yeh hataao ya restrict karo
>             .requestMatchers(
>                 "/v3/api-docs/**",
>                 "/swagger-ui/**",
>                 "/swagger-ui.html"
>             ).permitAll()
>             .anyRequest().authenticated()
>         )
>         .build();
> }
> ```

> [!warning] Generic Types Carefully Use Karo
> `ResponseEntity<Page<OrderResponse>>` — yeh fine hai, springdoc handle kar leta hai.
> `ResponseEntity<List<?>>` — yeh nahi chalega. OpenAPI ko exact type chahiye. `?` wildcard meaningless hai spec ke liye — hamesha concrete type use karo.

> [!warning] `@RequestBody` Import Confusion
> Do alag annotations hain — aur dono same naam ka:
> - `org.springframework.web.bind.annotation.RequestBody` — request body bind karta hai (required)
> - `io.swagger.v3.oas.annotations.parameters.RequestBody` — documentation add karta hai (optional)
>
> Compiler galat import pe error nahi deta. Lekin agar Spring wala nahi lagaya toh body inject nahi hogi. Hamesha Spring wala lagao request binding ke liye, Springdoc wala optional hai sirf documentation ke liye.

> [!warning] Circular References Mein Stack Overflow
> Agar tumhare entities circular references rakhte hain (jaise `Order` → `Restaurant` → `Order`), toh springdoc schema generate karte waqt infinite loop mein ja sakta hai. Solution: Response DTOs/Records use karo — direct entities expose mat karo. DTOs ke saath yeh problem nahi aati.

> [!tip] `@Hidden` — Specific Endpoints Ya Fields Chhupaane Ke Liye
> ```java
> @Hidden  // Yeh controller docs mein nahi aayega
> @RestController
> public class InternalDebugController { ... }
>
> // Ya specific method pe
> @Hidden
> @GetMapping("/internal/ping")
> public String ping() { return "pong"; }
>
> // Ya DTO field pe
> @Schema(hidden = true)  // Docs mein nahi dikhega
> private String internalAuditField;
> ```

> [!tip] Code-First vs Spec-First
> Springdoc **code-first** approach hai — pehle code likhte ho, spec automatically generate hoti hai. Agar tumhari team **spec-first** approach prefer karti hai — pehle OpenAPI YAML likhte ho, phir code/stubs generate karte ho — tab `openapi-generator-maven-plugin` use karo. Dono valid approaches hain, team workflow pe depend karta hai.

---

## Practical Workflow — Real Project Mein Kaise Use Karte Hain

**Development ke doran:**
1. Controller banao, DTO banao, Bean Validation lagao
2. App start karo
3. `http://localhost:8080/swagger-ui.html` kholo
4. Apne endpoints test karo directly Swagger UI se (Try it out button)
5. `@Operation` aur `@Schema` se details add karo jab documentation share karna ho

**Frontend team ke saath:**
1. `/v3/api-docs` ka URL share karo
2. Ya `openapi.json` static file generate karke Notion ya Confluence mein attach karo
3. Frontend wale `openapi-generator` se TypeScript client auto-generate kar sakte hain

**CI/CD mein:**
1. springdoc-openapi-maven-plugin se build time pe `openapi.json` generate karo
2. Is file se client SDKs auto-generate karo
3. Contract testing ke liye use karo — agar API change kiya aur spec nahi update hua toh CI fail ho jaayega

---

## Key Takeaways

- **OpenAPI** ek machine-readable API description format hai — JSON/YAML mein. Swagger UI uski visual representation hai.
- **springdoc-openapi** ek dependency add karne se poori API automatically document ho jaati hai — zero manual YAML.
- Controllers, DTOs, Bean Validation annotations sab automatically spec mein reflect hote hain.
- `@Operation`, `@ApiResponse`, `@Parameter`, `@Schema` se documentation aur refine kar sakte ho — par yeh optional hain, basic docs already generate hote hain.
- **Security gotcha**: Spring Security by default docs ke paths secure kar deta hai — explicitly `permitAll()` karo dev environment mein.
- **`@RequestBody` import trap**: Spring wala (binding) aur Springdoc wala (docs) — dono alag hain, galti mat karo.
- Production mein `springdoc.swagger-ui.enabled: false` karo — internal API structure public mat karo.
- Node.js ki `swagger-jsdoc` se yeh kaafi better hai — code aur docs hamesha sync mein rehte hain kyunki docs code se generate hoti hai.
