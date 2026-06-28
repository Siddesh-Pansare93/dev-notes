---
tags: [web-rest, request-mapping, parameters, binding]
aliases: [PathVariable, RequestParam, RequestBody, RequestHeader]
stage: intermediate
---

# Request Mapping & Path Variables

> [!info] For the Express/TS dev
> In Express you reach into `req.params`, `req.query`, `req.body`, `req.headers` manually. Spring **declaratively binds** each piece via parameter annotations and converts types for you. No `Number(req.params.id)` — declare `Long id` and Spring handles parsing + validation errors.

## Concept / How it works

Every parameter on a controller method can be annotated to tell Spring where to pull data from:

| Annotation | Source | Express analog |
| --- | --- | --- |
| `@PathVariable` | URI path segment | `req.params.x` |
| `@RequestParam` | Query string or form data | `req.query.x` / `req.body.x` (urlencoded) |
| `@RequestBody` | Deserialized JSON/XML body | `JSON.parse(req.body)` (express.json()) |
| `@RequestHeader` | HTTP header | `req.headers.x` |
| `@CookieValue` | Cookie | `req.cookies.x` |
| `@ModelAttribute` | Form-encoded → object | `req.body` (multer/urlencoded) |
| `@RequestPart` | Multipart parts | `req.files`, `req.body` |

Spring's `HandlerMethodArgumentResolver` chain inspects each parameter, finds the matching resolver, and produces the value — including type conversion via the [[ConversionService]].

## Code example

```java
@RestController
@RequestMapping("/api/v1/orders")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    // GET /api/v1/orders/42
    @GetMapping("/{orderId}")
    public OrderDto getOrder(@PathVariable Long orderId) {
        return orderService.findById(orderId);
    }

    // GET /api/v1/orders/42/items/9
    @GetMapping("/{orderId}/items/{itemId}")
    public OrderItemDto getItem(@PathVariable Long orderId,
                                @PathVariable Long itemId) {
        return orderService.findItem(orderId, itemId);
    }

    // GET /api/v1/orders?status=PAID&page=0&size=20
    @GetMapping
    public Page<OrderDto> list(
            @RequestParam(required = false) OrderStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(name = "q", required = false) String query
    ) {
        return orderService.search(status, query, PageRequest.of(page, size));
    }

    // POST /api/v1/orders
    // Body: { "customerId": 1, "items": [...] }
    @PostMapping
    public OrderDto create(@RequestBody @Valid CreateOrderRequest req) {
        return orderService.create(req);
    }

    // Read a header
    @GetMapping("/me")
    public OrderDto myLatest(@RequestHeader("X-Tenant-Id") String tenantId,
                             @RequestHeader(value = "User-Agent",
                                            required = false) String ua) {
        return orderService.latestForTenant(tenantId);
    }

    // Capture all query params into a Map (rare; usually unwise)
    @GetMapping("/dump")
    public Map<String, String> dumpParams(@RequestParam Map<String, String> all) {
        return all;
    }

    // Map directly to a POJO via field binding
    @GetMapping("/search")
    public List<OrderDto> search(OrderSearchCriteria criteria) {
        // criteria.getStatus(), criteria.getFrom() bound from query string
        return orderService.search(criteria);
    }
}
```

### Custom enum binding (a small but real surprise)

```java
public enum OrderStatus { PENDING, PAID, SHIPPED, CANCELLED }
```
By default `?status=PAID` works. If you want `?status=paid` (lowercase), register a converter:

```java
@Component
public class StringToOrderStatusConverter implements Converter<String, OrderStatus> {
    @Override
    public OrderStatus convert(String source) {
        return OrderStatus.valueOf(source.toUpperCase());
    }
}
```

### `@PathVariable` quirks

```java
// Optional path variable — usually better to define two routes
@GetMapping({"/items", "/items/{id}"})
public Object items(@PathVariable(required = false) Long id) { ... }

// Regex constraint on segment — only digits
@GetMapping("/users/{id:\\d+}")
public UserDto byId(@PathVariable Long id) { ... }

// Match the literal "+" or "." in path
@GetMapping("/files/{name:.+}")  // .+ to allow dots in filename
public FileDto file(@PathVariable String name) { ... }
```

## Express/TS comparison

```ts
// Express
router.get('/orders/:orderId/items/:itemId', (req, res) => {
  const orderId = Number(req.params.orderId);   // manual parse
  const itemId  = Number(req.params.itemId);
  if (isNaN(orderId)) return res.status(400).send('bad id');
  // ...
});

router.get('/orders', (req, res) => {
  const status = req.query.status as string | undefined;
  const page   = Number(req.query.page ?? 0);
  // ...
});
```

Spring removes the manual parsing, the `NaN` check (it 400s automatically), and the casting. With Zod you'd validate; here Jackson + the [[ConversionService]] handle conversion, and `@Valid` ([[05-Validation]]) handles structural validation.

## Gotchas

> [!warning] Trailing slash matters in Boot 3
> `/orders` and `/orders/` are now **different**. To restore old behavior, configure `PathMatchConfigurer.setUseTrailingSlashMatch(true)` — but better to be consistent.

> [!warning] `@RequestParam` is required by default
> If the param is absent, you get **400 Bad Request**, not `null`. Use `required = false` or `defaultValue = "..."` for optional params.

> [!warning] Don't mix `@RequestBody` with `@ModelAttribute`
> One says "deserialize the JSON body"; the other says "bind from form fields / query string." A single endpoint should commit to one.

> [!warning] Path variable name MUST match
> `@GetMapping("/{userId}")` + `@PathVariable Long id` — without `@PathVariable("userId") Long id` Spring will fail at startup unless you compiled with `-parameters` (Spring Boot does this by default with the Maven plugin).

> [!tip] Use records for request DTOs
> Java 17+ `record CreateOrderRequest(Long customerId, List<ItemReq> items) {}` is concise and immutable — perfect for `@RequestBody`. See [[Records]].

## Related

- [[01-RestController-Basics]]
- [[03-Response-Handling]]
- [[04-DTOs-and-Mapping]]
- [[05-Validation]]
- [[09-Content-Negotiation-Jackson]]
- [[ConversionService]]
- [[Records]]
