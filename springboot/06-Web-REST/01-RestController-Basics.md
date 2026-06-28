---
tags: [web-rest, controllers, spring-mvc, annotations]
aliases: [RestController, Spring MVC Controller, REST Controller Basics]
stage: intermediate
---

# RestController Basics

> [!info] For the Express/TS dev
> A Spring `@RestController` is conceptually a combination of an Express `Router` + JSON serializer + DI-managed singleton. Where in Express you do `const router = express.Router(); router.get('/users/:id', handler)`, in Spring you annotate a class and Spring scans it at startup, instantiates a single bean (see [[Beans-and-Application-Context]]), and wires it into the [[DispatcherServlet]] via [[Auto-Configuration]].

## Concept / How it works

Spring MVC builds on the **DispatcherServlet** — a single front controller servlet that receives every HTTP request and routes it to a handler method based on the annotations you declare. There is no `app.use(router)` call you need to make; component scanning ([[Component-Scanning]]) finds your controllers automatically.

Key annotations:

| Annotation | Purpose |
| --- | --- |
| `@Controller` | Marks a Spring MVC controller. Methods return view names (Thymeleaf, JSP). Rarely used for APIs. |
| `@RestController` | `@Controller` + `@ResponseBody` on every method — return values are serialized to JSON via Jackson. **This is what you want for REST APIs.** |
| `@RequestMapping` | Class- or method-level URL mapping. Supports `path`, `method`, `produces`, `consumes`. |
| `@GetMapping`, `@PostMapping`, `@PutMapping`, `@PatchMapping`, `@DeleteMapping` | Method-level shortcuts for `@RequestMapping(method = ...)`. |

> [!tip] Why singletons?
> Unlike Express handlers (where you typically `new` a service inside a closure), every `@RestController` is a Spring-managed **singleton bean**. Inject dependencies via the constructor — never store per-request state in fields. See [[Dependency-Injection]].

## Code example

```java
package com.example.api.user;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserService userService;

    // Constructor injection — see [[Constructor-vs-Field-Injection]]
    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    public List<UserDto> list() {
        return userService.findAll();
    }

    @GetMapping("/{id}")
    public UserDto getOne(@PathVariable Long id) {
        return userService.findById(id);
    }

    @PostMapping
    public ResponseEntity<UserDto> create(@RequestBody @Valid CreateUserRequest req) {
        UserDto created = userService.create(req);
        return ResponseEntity
                .created(URI.create("/api/v1/users/" + created.id()))
                .body(created);
    }

    @PutMapping("/{id}")
    public UserDto update(@PathVariable Long id,
                          @RequestBody @Valid UpdateUserRequest req) {
        return userService.update(id, req);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        userService.delete(id);
    }
}
```

### `application.yml` analog

```yaml
server:
  port: 8080
  servlet:
    context-path: /            # Like Express app.use('/', router) base
spring:
  mvc:
    log-resolved-exception: true
```

### `pom.xml` (the dependency that gives you all of this)

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>
```

That single starter pulls in Spring MVC, Jackson, Tomcat, validation, and registers the [[DispatcherServlet]] automatically — no app bootstrap code required.

## Express/TS comparison

```ts
// Express
const router = express.Router();

router.get('/users', async (req, res) => {
  res.json(await userService.findAll());
});

router.get('/users/:id', async (req, res) => {
  res.json(await userService.findById(req.params.id));
});

router.post('/users', async (req, res) => {
  const created = await userService.create(req.body);
  res.status(201).location(`/users/${created.id}`).json(created);
});

app.use('/api/v1', router);
```

| Express / TS | Spring |
| --- | --- |
| `express.Router()` | `@RestController` class |
| `router.get('/x', fn)` | `@GetMapping("/x")` method |
| `req.params.id` | `@PathVariable Long id` |
| `req.query.q` | `@RequestParam String q` |
| `req.body` | `@RequestBody Foo body` |
| `res.json(x)` | `return x;` (Jackson serializes) |
| `res.status(201).json(x)` | `ResponseEntity.status(201).body(x)` or `@ResponseStatus(CREATED)` |
| `app.use('/api/v1', router)` | `@RequestMapping("/api/v1/users")` at class level |
| Per-request `new UserService()` | Constructor-injected singleton bean |

## Gotchas

> [!warning] `@Controller` vs `@RestController`
> `@Controller` returns view names (template strings). If you forget the `Rest` prefix and return a `User` object, Spring will try to resolve `"User"` as a Thymeleaf template and 500. Always use `@RestController` for JSON APIs.

> [!warning] Don't put state in fields
> Controllers are singletons. A field like `private User currentUser` is a bug — concurrent requests will overwrite it. Use method-local variables, or inject request-scoped beans explicitly.

> [!warning] Method overload ambiguity
> Two `@GetMapping("/users")` methods in the same class will fail at startup with `Ambiguous mapping`. Differentiate by `params`, `headers`, `consumes`, or `produces`.

> [!tip] Suffix pattern matching is off by default in Boot 3
> `/users.json` will NOT route to `/users` anymore. This is good — explicit is better than implicit.

## Related

- [[DispatcherServlet]]
- [[Auto-Configuration]]
- [[Beans-and-Application-Context]]
- [[Dependency-Injection]]
- [[02-Request-Mapping-Path-Variables]]
- [[03-Response-Handling]]
- [[06-Exception-Handling]]
- [[12-OpenAPI-Swagger]]
