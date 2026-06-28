---
tags: [web-rest, filters, interceptors, middleware]
aliases: [Servlet Filter, HandlerInterceptor, Middleware]
stage: intermediate
---

# Filters and Interceptors

> [!info] For the Express/TS dev
> Express middleware is a single concept: `(req, res, next) => {}` running at any pipeline stage. Spring splits this into **two layers**:
> - **Servlet Filter** — runs at the servlet container level, BEFORE Spring MVC dispatches. Gets the raw `HttpServletRequest`. Closest to Express middleware.
> - **HandlerInterceptor** — runs INSIDE Spring MVC, around the controller method. Knows which `@Controller` will handle the request. Has `preHandle`, `postHandle`, `afterCompletion`.
> Use filters for cross-cutting concerns (auth, logging, CORS, request ID); use interceptors when you need controller context.

## Concept / How it works

Request flow:

```
HttpServletRequest
   ↓
[ Filter chain ]            ← raw servlet API, before DispatcherServlet
   ↓
DispatcherServlet
   ↓
[ HandlerInterceptor.preHandle ]
   ↓
@Controller method
   ↓
[ HandlerInterceptor.postHandle ]
   ↓
View/Body rendering
   ↓
[ HandlerInterceptor.afterCompletion ]
   ↓
HttpServletResponse
```

Spring Security is itself a chain of filters (see [[01-Spring-Security-Concepts]]).

## Code example

### Servlet Filter — request ID + logging

```java
@Component
@Order(1)   // earlier = runs first
public class RequestLoggingFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(RequestLoggingFilter.class);

    @Override
    protected void doFilterInternal(HttpServletRequest req,
                                    HttpServletResponse res,
                                    FilterChain chain)
            throws ServletException, IOException {

        String requestId = Optional.ofNullable(req.getHeader("X-Request-Id"))
                .orElse(UUID.randomUUID().toString());
        MDC.put("requestId", requestId);
        res.setHeader("X-Request-Id", requestId);

        long start = System.currentTimeMillis();
        try {
            chain.doFilter(req, res);
        } finally {
            long elapsed = System.currentTimeMillis() - start;
            log.info("{} {} -> {} ({} ms)",
                    req.getMethod(), req.getRequestURI(),
                    res.getStatus(), elapsed);
            MDC.clear();
        }
    }
}
```

`OncePerRequestFilter` is the recommended base — guarantees the filter runs once per request even if forwarded.

### Programmatic registration (more control)

```java
@Configuration
public class FilterConfig {

    @Bean
    public FilterRegistrationBean<RequestLoggingFilter> loggingFilter() {
        FilterRegistrationBean<RequestLoggingFilter> bean = new FilterRegistrationBean<>();
        bean.setFilter(new RequestLoggingFilter());
        bean.addUrlPatterns("/api/*");   // scope
        bean.setOrder(1);
        return bean;
    }
}
```

### HandlerInterceptor — auth-y, controller-aware

```java
@Component
public class TenantInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest req, HttpServletResponse res,
                             Object handler) throws Exception {
        if (handler instanceof HandlerMethod hm) {
            // Inspect the controller method
            RequiresTenant ann = hm.getMethodAnnotation(RequiresTenant.class);
            if (ann != null) {
                String tenant = req.getHeader("X-Tenant-Id");
                if (tenant == null) {
                    res.sendError(HttpStatus.BAD_REQUEST.value(), "X-Tenant-Id required");
                    return false;   // STOP processing
                }
                TenantContext.set(tenant);
            }
        }
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest req, HttpServletResponse res,
                                Object handler, Exception ex) {
        TenantContext.clear();
    }
}

@Configuration
public class WebConfig implements WebMvcConfigurer {
    private final TenantInterceptor tenantInterceptor;

    public WebConfig(TenantInterceptor t) { this.tenantInterceptor = t; }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(tenantInterceptor)
                .addPathPatterns("/api/**")
                .excludePathPatterns("/api/v1/health");
    }
}
```

## Filter vs Interceptor — which to use?

| Concern | Filter | Interceptor |
| --- | --- | --- |
| Request ID, logging, request body buffering | YES | no |
| Auth (JWT parsing) | YES (Security uses filters) | no |
| CORS | YES | no |
| Compression | YES | no |
| Modify request/response body | YES | limited |
| Need access to the controller method / annotations | no | YES |
| Need access to handler return value (model) | no | YES (`postHandle`) |
| Skip controller conditionally | YES | YES (`return false` from preHandle) |

## Express/TS comparison

```ts
// Express
app.use((req, res, next) => {
  const id = req.header('X-Request-Id') ?? randomUUID();
  res.set('X-Request-Id', id);
  const start = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.url} -> ${res.statusCode} (${Date.now()-start}ms)`);
  });
  next();
});

// auth on a route
router.get('/admin', requireRole('admin'), handler);
```

| Express | Spring equivalent |
| --- | --- |
| `app.use(fn)` | `@Component` Filter or `FilterRegistrationBean` |
| Conditional middleware (`router.use('/api', m)`) | `addUrlPatterns("/api/*")` or interceptor `addPathPatterns` |
| `next(err)` | throw — Filter chain or `@ControllerAdvice` handles |
| Per-route middleware | Method annotation + `HandlerInterceptor` checking annotation |
| `res.locals.user` | Request attribute or `ThreadLocal` (e.g., `TenantContext`) |

## Gotchas

> [!warning] `ThreadLocal` cleanup is YOUR job
> If you set context (request ID, tenant, user) on a `ThreadLocal`, you MUST clear it in `finally` / `afterCompletion`. Tomcat reuses threads across requests; leaked state bleeds into the next request.

> [!warning] Filter modifying request body
> Reading `request.getInputStream()` in a filter consumes it — the controller then sees nothing. Wrap with `ContentCachingRequestWrapper` if you need to inspect AND forward.

> [!warning] Order matters
> Use `@Order` or `setOrder()` explicitly. Spring Security's filters have specific positions in the chain; if your custom filter does auth, integrate it into the [[02-Configuration-and-SecurityFilterChain]].

> [!tip] `OncePerRequestFilter` over plain `Filter`
> Prevents double-execution on internal forwards (`forward:` / error dispatch).

> [!tip] For reactive (WebFlux): `WebFilter`
> Different API, similar concept. Stay in the servlet world unless you've chosen WebFlux.

## Related

- [[01-RestController-Basics]]
- [[01-Spring-Security-Concepts]]
- [[02-Configuration-and-SecurityFilterChain]]
- [[08-CORS]]
- [[DispatcherServlet]]
