---
tags: [web-rest, response, http, status-codes]
aliases: [ResponseEntity, HTTP Status, Response Headers]
stage: intermediate
---

# Response Handling

> [!info] For the Express/TS dev
> `res.status(201).header('X-Foo', 'bar').json(body)` becomes `ResponseEntity.status(201).header("X-Foo", "bar").body(body)`. Spring also lets you use annotations (`@ResponseStatus`) or a plain return value when you don't need to customize the response.

## Concept / How it works

Three ways to control the HTTP response:

1. **Return a domain object directly** — Spring uses `200 OK`, serializes via Jackson. Simplest case.
2. **`@ResponseStatus`** on the method — sets the default status (e.g., `201 Created`).
3. **`ResponseEntity<T>`** — full programmatic control over status, headers, and body. Use when status varies based on logic.

Underneath, Spring writes the response via an `HttpMessageConverter` (Jackson for JSON, see [[09-Content-Negotiation-Jackson]]).

## Code example

```java
@RestController
@RequestMapping("/api/v1/articles")
public class ArticleController {

    private final ArticleService articleService;

    public ArticleController(ArticleService articleService) {
        this.articleService = articleService;
    }

    // 1) Plain return — 200 OK, JSON body
    @GetMapping("/{id}")
    public ArticleDto get(@PathVariable Long id) {
        return articleService.find(id);
    }

    // 2) @ResponseStatus — fixed status code
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ArticleDto create(@RequestBody @Valid CreateArticleRequest req) {
        return articleService.create(req);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        articleService.delete(id);
    }

    // 3) ResponseEntity — full control
    @PostMapping("/with-location")
    public ResponseEntity<ArticleDto> createWithLocation(
            @RequestBody @Valid CreateArticleRequest req) {
        ArticleDto created = articleService.create(req);
        URI location = ServletUriComponentsBuilder
                .fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.id())
                .toUri();
        return ResponseEntity
                .created(location)
                .header("X-Resource-Version", "1")
                .body(created);
    }

    // Conditional: return 304 when ETag matches
    @GetMapping("/{id}/cacheable")
    public ResponseEntity<ArticleDto> getCacheable(@PathVariable Long id,
                                                    WebRequest request) {
        ArticleDto dto = articleService.find(id);
        String etag = "\"" + dto.version() + "\"";

        if (request.checkNotModified(etag)) {
            return ResponseEntity.status(HttpStatus.NOT_MODIFIED).build();
        }
        return ResponseEntity.ok().eTag(etag).body(dto);
    }

    // Optional → 404 when absent
    @GetMapping("/maybe/{id}")
    public ResponseEntity<ArticleDto> maybe(@PathVariable Long id) {
        return articleService.findOptional(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // Streaming a large file
    @GetMapping("/{id}/export")
    public ResponseEntity<StreamingResponseBody> export(@PathVariable Long id) {
        StreamingResponseBody body = out -> articleService.streamExport(id, out);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=article-" + id + ".csv")
                .body(body);
    }
}
```

### Key static factories on `ResponseEntity`

```java
ResponseEntity.ok(body);                    // 200
ResponseEntity.created(uri).body(body);     // 201 + Location
ResponseEntity.accepted().body(body);       // 202
ResponseEntity.noContent().build();         // 204
ResponseEntity.badRequest().body(err);      // 400
ResponseEntity.notFound().build();          // 404
ResponseEntity.unprocessableEntity().body(err); // 422
ResponseEntity.status(503).body(err);       // arbitrary
```

## Express/TS comparison

| Express | Spring |
| --- | --- |
| `res.status(201).json(x)` | `ResponseEntity.status(201).body(x)` |
| `res.location(url)` | `.created(uri)` or `.header("Location", url)` |
| `res.set('X-Foo', 'bar')` | `.header("X-Foo", "bar")` |
| `res.sendStatus(204)` | `.noContent().build()` |
| `res.json({ error })` w/ middleware | `@ControllerAdvice` ([[06-Exception-Handling]]) |
| `res.write(...); res.end()` (stream) | `StreamingResponseBody` |
| Manual `If-None-Match` check | `WebRequest.checkNotModified(etag)` |

## Gotchas

> [!warning] `void` + no annotation = 200 OK with empty body
> If you want **204 No Content** for `DELETE`, add `@ResponseStatus(HttpStatus.NO_CONTENT)` or return `ResponseEntity.noContent().build()`.

> [!warning] Returning `null`
> Returning `null` from a controller method gives `200 OK` with body `null` (literal text). Almost always wrong. Use `Optional<T>` + `ResponseEntity` or throw a `NotFoundException` and let `@ControllerAdvice` map it.

> [!warning] `@ResponseStatus` is overridden by `ResponseEntity`
> If you use both, `ResponseEntity`'s status wins. Pick one strategy per endpoint.

> [!tip] Use `ProblemDetail` for errors (RFC 7807)
> Don't invent your own error envelope. Spring 6 ships `ProblemDetail` — see [[06-Exception-Handling]].

> [!tip] Don't expose entities
> Returning JPA `@Entity` objects causes lazy-loading explosions and accidental field leakage. Always return DTOs ([[04-DTOs-and-Mapping]]).

## Related

- [[01-RestController-Basics]]
- [[04-DTOs-and-Mapping]]
- [[06-Exception-Handling]]
- [[09-Content-Negotiation-Jackson]]
- [[10-File-Upload-Download]]
