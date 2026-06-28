---
tags: [web-rest, cors, security]
aliases: [CORS, Cross-Origin]
stage: intermediate
---

# CORS

> [!info] For the Express/TS dev
> In Express you reach for `cors()` middleware: `app.use(cors({ origin: '...', credentials: true }))`. Spring offers three layers — annotation per-controller (`@CrossOrigin`), per-app (`WebMvcConfigurer.addCorsMappings`), or via Spring Security (`SecurityFilterChain`). When Security is on the classpath, the Security CORS config is the one that matters.

## Concept / How it works

CORS is a browser-enforced policy. The browser sends an `Origin` header (and a preflight `OPTIONS` for non-simple requests) and the server must respond with `Access-Control-Allow-*` headers. Spring builds these responses for you.

Three configuration levels:

| Level | Where | When to use |
| --- | --- | --- |
| `@CrossOrigin` | On controller class or method | Quick & dirty / different policy per endpoint |
| `WebMvcConfigurer#addCorsMappings` | Global config | Most common for non-Security apps |
| `CorsConfigurationSource` + `SecurityFilterChain.cors(...)` | Security-aware apps | **Required** if Spring Security is on the classpath |

## Code example

### Annotation style (per-controller)

```java
@RestController
@RequestMapping("/api/v1/public")
@CrossOrigin(origins = "https://app.example.com",
             allowedHeaders = "*",
             methods = { RequestMethod.GET, RequestMethod.POST },
             maxAge = 3600)
public class PublicController { ... }
```

### Global config (no Spring Security)

```java
@Configuration
public class CorsConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins("https://app.example.com",
                                "http://localhost:5173")
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE")
                .allowedHeaders("*")
                .exposedHeaders("X-Total-Count", "X-Request-Id")
                .allowCredentials(true)
                .maxAge(3600);
    }
}
```

### With Spring Security (the production setup)

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
                .cors(Customizer.withDefaults())  // delegates to bean below
                .csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .anyRequest().authenticated())
                .build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of(
                "https://app.example.com",
                "http://localhost:5173"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE"));
        config.setAllowedHeaders(List.of("*"));
        config.setExposedHeaders(List.of("X-Total-Count", "X-Request-Id"));
        config.setAllowCredentials(true);
        config.setMaxAge(Duration.ofHours(1));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }
}
```

### `application.yml` (Boot 3.2+ shorthand for Actuator only)

```yaml
management:
  endpoints:
    web:
      cors:
        allowed-origins: "https://app.example.com"
        allowed-methods: GET, POST
```

## Express/TS comparison

```ts
// Express
import cors from 'cors';
app.use(cors({
  origin: ['https://app.example.com', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE'],
  exposedHeaders: ['X-Total-Count'],
  maxAge: 3600,
}));
```

| Express `cors` option | Spring equivalent |
| --- | --- |
| `origin` | `allowedOrigins` / `allowedOriginPatterns` |
| `credentials: true` | `allowCredentials(true)` |
| `methods` | `allowedMethods` |
| `allowedHeaders` | `allowedHeaders` |
| `exposedHeaders` | `exposedHeaders` |
| `maxAge` | `maxAge` |
| `preflightContinue` | (no analog — Spring handles preflight) |

## Gotchas

> [!warning] `allowCredentials(true)` + `allowedOrigins("*")` is forbidden
> The CORS spec disallows it. Use `allowedOriginPatterns("*")` instead (pattern-matched, not literal `*`).

> [!warning] Spring Security ignores `WebMvcConfigurer#addCorsMappings`
> When Security is on the classpath, the security filter chain runs before MVC. You must call `http.cors(...)` AND register a `CorsConfigurationSource` bean. Otherwise CORS preflights get blocked by Security with a 401.

> [!warning] Preflight `OPTIONS` and auth
> Browsers DON'T send credentials on preflight. Make sure preflight (`OPTIONS`) is permitted: `requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()`.

> [!warning] `@CrossOrigin` is per-controller — don't mix with global
> If both are configured for the same path, the resolution can surprise you. Pick one strategy.

> [!tip] CORS is browser-only
> CLI tools (`curl`, server-to-server, Postman) ignore CORS entirely. If your client says "CORS error" but `curl` works fine, the problem is in the browser-server CORS handshake, not your business logic.

> [!danger] `allowedOrigins("*")` in production
> Combined with credentials it's forbidden; alone it's a hostile-friendly setup that breaks cookie-based auth. Always whitelist real origins.

## Related

- [[01-RestController-Basics]]
- [[07-Filters-Interceptors]]
- [[02-Configuration-and-SecurityFilterChain]]
- [[07-CSRF-CORS-Security]]
