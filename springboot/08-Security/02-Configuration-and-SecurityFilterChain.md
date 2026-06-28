---
tags: [security, spring-security, configuration, filter-chain]
aliases: [SecurityFilterChain, HttpSecurity, Lambda DSL]
stage: intermediate
---

# Configuration & SecurityFilterChain

> [!info] For the Express/TS dev
> If you've used Express, you've chained middleware: `app.use(cors()); app.use(authMiddleware); app.use(routeMiddleware)`. Spring Security's `SecurityFilterChain` bean is the same idea, declared via the **lambda DSL** introduced in Spring Security 5.7+ and standard in 6+. The old `WebSecurityConfigurerAdapter` extending pattern is **gone** — bean-only config now.

## Concept / How it works

You declare one or more `SecurityFilterChain` beans. Each chain is matched by request matchers (`securityMatcher`), so you can have different rules per path. Inside each chain, you configure auth, authorization, sessions, CORS, CSRF, etc., using the lambda DSL.

## Code example

### A complete production-ish config

```java
@Configuration
@EnableWebSecurity
@EnableMethodSecurity        // enables @PreAuthorize ([[05-Method-Security]])
public class SecurityConfig {

    @Bean
    @Order(1)                 // matched first
    public SecurityFilterChain apiChain(HttpSecurity http,
                                         JwtAuthFilter jwtFilter) throws Exception {
        return http
            .securityMatcher("/api/**")                          // only /api/**
            .cors(Customizer.withDefaults())
            .csrf(csrf -> csrf.disable())                         // stateless API
            .sessionManagement(s -> s.sessionCreationPolicy(STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers("/api/v1/auth/**", "/api/v1/public/**").permitAll()
                .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/v1/users/**").hasAuthority("users:read")
                .requestMatchers(HttpMethod.POST, "/api/v1/users/**").hasAuthority("users:write")
                .anyRequest().authenticated())
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
            .exceptionHandling(eh -> eh
                .authenticationEntryPoint(this::unauthorized)
                .accessDeniedHandler(this::forbidden))
            .headers(h -> h
                .frameOptions(f -> f.deny())
                .contentSecurityPolicy(csp -> csp
                    .policyDirectives("default-src 'self'")))
            .build();
    }

    @Bean
    @Order(2)
    public SecurityFilterChain webChain(HttpSecurity http) throws Exception {
        return http
            .securityMatcher("/**")
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/", "/login", "/css/**", "/js/**", "/error").permitAll()
                .anyRequest().authenticated())
            .formLogin(form -> form.loginPage("/login").defaultSuccessUrl("/dashboard"))
            .logout(logout -> logout.logoutSuccessUrl("/"))
            .build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return PasswordEncoderFactories.createDelegatingPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration cfg = new CorsConfiguration();
        cfg.setAllowedOrigins(List.of("https://app.example.com"));
        cfg.setAllowedMethods(List.of("GET","POST","PUT","PATCH","DELETE"));
        cfg.setAllowedHeaders(List.of("*"));
        cfg.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource src = new UrlBasedCorsConfigurationSource();
        src.registerCorsConfiguration("/**", cfg);
        return src;
    }

    private void unauthorized(HttpServletRequest req, HttpServletResponse res,
                              AuthenticationException ex) throws IOException {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(
                HttpStatus.UNAUTHORIZED, "Authentication required");
        writeProblem(res, HttpStatus.UNAUTHORIZED, pd);
    }

    private void forbidden(HttpServletRequest req, HttpServletResponse res,
                           AccessDeniedException ex) throws IOException {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(
                HttpStatus.FORBIDDEN, "Access denied");
        writeProblem(res, HttpStatus.FORBIDDEN, pd);
    }

    private void writeProblem(HttpServletResponse res, HttpStatus s, ProblemDetail pd)
            throws IOException {
        res.setStatus(s.value());
        res.setContentType("application/problem+json");
        new ObjectMapper().writeValue(res.getOutputStream(), pd);
    }
}
```

### Multiple chains: when to use them

| Reason | Pattern |
| --- | --- |
| API + web UI in the same app | One stateless chain for `/api/**`, one form-login chain for the rest |
| Public endpoints with their own headers/CORS | Separate chain to skip auth filters entirely |
| Admin sub-app with stricter CSP | Separate chain with stricter `headers` config |

The `@Order` matters — the first matching chain wins.

### Disabling defaults

```java
http.csrf(AbstractHttpConfigurer::disable)
    .formLogin(AbstractHttpConfigurer::disable)
    .httpBasic(AbstractHttpConfigurer::disable);
```

### Custom authentication entry point + access denied handler

By default, an unauthenticated request gets `401` with `WWW-Authenticate: Basic`. For a JSON API, override:

```java
.exceptionHandling(eh -> eh
    .authenticationEntryPoint((req, res, ex) -> {
        res.setStatus(401);
        res.setContentType("application/json");
        res.getWriter().write("{\"error\":\"unauthorized\"}");
    })
    .accessDeniedHandler((req, res, ex) -> {
        res.setStatus(403);
        res.getWriter().write("{\"error\":\"forbidden\"}");
    }))
```

## Request matchers

```java
auth
  .requestMatchers("/api/v1/users/**")                  // path
  .requestMatchers(HttpMethod.GET, "/api/v1/users/**")  // method + path
  .requestMatchers(antMatcher("/api/**"))               // explicit Ant
  .requestMatchers(regexMatcher("^/api/v\\d+/.*$"))     // regex
  .anyRequest()                                          // catch-all (last)
```

## Express/TS comparison

```ts
// Express
app.use('/api', cors());
app.use('/api', helmet());
app.use('/api', jwtAuth);
app.use('/api/admin', requireRole('admin'));
app.use('/api', routes);
```

| Express | Spring Security |
| --- | --- |
| `app.use(cors())` | `.cors(...)` |
| `helmet()` | `.headers(...)` |
| `jwtAuth` middleware | `.addFilterBefore(jwtFilter, ...)` |
| Per-route auth check | `.requestMatchers(...).hasRole(...)` |
| `app.use('/api', router1); app.use('/web', router2)` | Two `SecurityFilterChain` beans with different `securityMatcher` |
| `csurf` middleware | `.csrf(...)` (on by default) |

## Gotchas

> [!warning] `securityMatcher` vs `requestMatchers`
> `securityMatcher` selects which requests this CHAIN handles. `requestMatchers` inside `authorizeHttpRequests` selects which requests get a particular AUTHORIZATION rule. Don't confuse them.

> [!warning] Order of `requestMatchers` matters
> First match wins. Put specific matchers BEFORE general ones.
> ```java
> // BUG: every request authenticated, second rule never reached
> .anyRequest().authenticated()
> .requestMatchers("/public").permitAll()
> ```

> [!warning] `@Order(N)` on chains
> Without `@Order`, multiple chains may resolve in surprising order. Always set it when you have more than one chain.

> [!warning] Forgetting OPTIONS for CORS preflight
> Browsers send OPTIONS without credentials. Permit it, or preflights 401. ([[08-CORS]])

> [!danger] `csrf.disable()` for browser-facing apps
> Stateless APIs (JWT in `Authorization` header) — yes, disable. Browser apps using cookies — DO NOT disable. ([[07-CSRF-CORS-Security]])

> [!tip] `springSecurity()` MockMvc helper
> When testing controllers behind security:
> ```java
> mockMvc.perform(get("/api/me").with(user("alice").roles("ADMIN")));
> ```

## Related

- [[01-Spring-Security-Concepts]]
- [[03-Authentication-Methods]]
- [[04-JWT-with-Spring-Security]]
- [[06-Password-Encoding]]
- [[08-OAuth2-Resource-Server]]
- [[08-CORS]]
