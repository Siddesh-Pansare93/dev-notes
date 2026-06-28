---
tags: [security, authentication, jwt, oauth2, basic-auth, form-login]
aliases: [Basic Auth, Form Login, JWT Auth, OAuth2 Auth]
stage: intermediate
---

# Authentication Methods

> [!info] For the Express/TS dev
> Same options you'd reach for in Node:
> - **HTTP Basic** — username/password in header. Local-dev only.
> - **Form login** — server-rendered apps; session cookie.
> - **JWT bearer** — stateless API auth.
> - **OAuth2 / OIDC** — federated identity (Google, Auth0, Keycloak).
> Spring Security supports all four, often combined in one app via multiple `SecurityFilterChain` beans.

## Decision matrix

| Method | Token | State | Use when |
| --- | --- | --- | --- |
| HTTP Basic | `Authorization: Basic base64(user:pass)` | Stateless | Internal tools, dev, machine-to-machine over TLS |
| Form login + session | `JSESSIONID` cookie | Stateful | Server-rendered apps |
| JWT bearer | `Authorization: Bearer <jwt>` | Stateless | SPA / mobile / microservices |
| OAuth2 client | Cookie/session of the IdP | Stateful (usually) | "Login with Google" flows |
| OAuth2 resource server | JWT or opaque token from IdP | Stateless | Backend protected by external IdP |

## HTTP Basic

```java
@Bean
public SecurityFilterChain chain(HttpSecurity http) throws Exception {
    return http
        .authorizeHttpRequests(a -> a.anyRequest().authenticated())
        .httpBasic(Customizer.withDefaults())
        .csrf(c -> c.disable())
        .build();
}
```

Browsers will pop up a native auth dialog. Almost never what you want for production; fine for `/actuator` behind a VPN.

## Form login (server-side rendered)

```java
@Bean
public SecurityFilterChain chain(HttpSecurity http) throws Exception {
    return http
        .authorizeHttpRequests(a -> a
            .requestMatchers("/login", "/css/**", "/error").permitAll()
            .anyRequest().authenticated())
        .formLogin(f -> f
            .loginPage("/login")
            .loginProcessingUrl("/login")
            .defaultSuccessUrl("/dashboard")
            .failureUrl("/login?error"))
        .logout(l -> l
            .logoutSuccessUrl("/login?logout")
            .invalidateHttpSession(true))
        .rememberMe(rm -> rm.key("uniqueAndSecret").tokenValiditySeconds(86400))
        .build();
}
```

Login template (`src/main/resources/templates/login.html` if using Thymeleaf):

```html
<form method="post" action="/login">
    <input type="hidden" name="_csrf" th:value="${_csrf.token}"/>
    <input name="username" required/>
    <input name="password" type="password" required/>
    <button type="submit">Sign in</button>
</form>
```

`UserDetailsService` provides users:

```java
@Service
public class DbUserDetailsService implements UserDetailsService {

    private final UserRepository repo;
    public DbUserDetailsService(UserRepository repo) { this.repo = repo; }

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User u = repo.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException(email));
        return org.springframework.security.core.userdetails.User.builder()
                .username(u.getEmail())
                .password(u.getPasswordHash())
                .authorities(u.getRoles().stream()
                        .map(r -> "ROLE_" + r.getName())
                        .toArray(String[]::new))
                .accountLocked(!u.isActive())
                .build();
    }
}
```

## JWT bearer (the typical SPA backend setup)

Spring Security has two parts you might use:

1. **Resource server** — validates incoming JWT (most common). See [[08-OAuth2-Resource-Server]] and [[04-JWT-with-Spring-Security]].
2. **Self-issued JWT** — your app issues tokens (e.g., custom login endpoint).

Quickstart for resource server (validates JWT from a configured issuer):

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-oauth2-resource-server</artifactId>
</dependency>
```

```yaml
spring:
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: https://auth.example.com/realms/acme
```

```java
http
  .oauth2ResourceServer(oauth -> oauth.jwt(Customizer.withDefaults()))
  .csrf(c -> c.disable())
  .sessionManagement(s -> s.sessionCreationPolicy(STATELESS));
```

That's it. Spring fetches the JWKS, validates signatures, populates `@AuthenticationPrincipal Jwt`.

## OAuth2 client (login with Google / Auth0 / Keycloak)

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-oauth2-client</artifactId>
</dependency>
```

```yaml
spring:
  security:
    oauth2:
      client:
        registration:
          google:
            client-id: ${GOOGLE_CLIENT_ID}
            client-secret: ${GOOGLE_CLIENT_SECRET}
            scope: openid, profile, email
        provider:
          google:
            issuer-uri: https://accounts.google.com
```

```java
http
  .authorizeHttpRequests(a -> a.anyRequest().authenticated())
  .oauth2Login(Customizer.withDefaults());
```

Visit `/oauth2/authorization/google` and Spring handles redirect, code exchange, token storage.

Access user info:

```java
@GetMapping("/me")
public Map<String, Object> me(@AuthenticationPrincipal OidcUser principal) {
    return principal.getAttributes();
}
```

## Combining methods

Two chains, one app:

```java
@Bean @Order(1)
SecurityFilterChain api(HttpSecurity http) throws Exception {
    return http.securityMatcher("/api/**")
        .oauth2ResourceServer(o -> o.jwt(Customizer.withDefaults()))
        .csrf(c -> c.disable())
        .sessionManagement(s -> s.sessionCreationPolicy(STATELESS))
        .authorizeHttpRequests(a -> a.anyRequest().authenticated())
        .build();
}

@Bean @Order(2)
SecurityFilterChain web(HttpSecurity http) throws Exception {
    return http
        .authorizeHttpRequests(a -> a
            .requestMatchers("/", "/login", "/error", "/css/**").permitAll()
            .anyRequest().authenticated())
        .oauth2Login(Customizer.withDefaults())
        .formLogin(Customizer.withDefaults())
        .build();
}
```

## Express/TS comparison

```ts
// Express + Passport
passport.use(new BasicStrategy(verify));
passport.use(new LocalStrategy(verify));
passport.use(new JwtStrategy({ secretOrKey, jwtFromRequest }, verify));
passport.use(new GoogleStrategy({ clientID, clientSecret, callbackURL }, verify));

app.post('/login', passport.authenticate('local'), handler);
app.use('/api', passport.authenticate('jwt', { session: false }));
app.get('/auth/google', passport.authenticate('google'));
```

| Passport strategy | Spring Security |
| --- | --- |
| `BasicStrategy` | `httpBasic()` |
| `LocalStrategy` (form) | `formLogin()` |
| `JwtStrategy` | `oauth2ResourceServer().jwt()` |
| `GoogleStrategy` | `oauth2Login()` + provider config |
| `req.user` | `@AuthenticationPrincipal` |

## Gotchas

> [!warning] HTTP Basic without TLS
> Base64 is encoding, not encryption. Always require HTTPS in any environment that isn't localhost.

> [!danger] Issuing your own JWTs
> Easy to get wrong: weak secrets, missing `aud` validation, no rotation, no revocation. Prefer an established IdP (Keycloak, Auth0, Cognito) and use resource server. If you must issue, use `nimbus-jose-jwt` and rotate keys.

> [!warning] Session management policy for JWT
> Set `STATELESS`. Otherwise Spring creates an `HttpSession` per request, defeating the point.

> [!warning] CSRF and form login
> Required when using session-based auth. Spring's CSRF protection is automatic but your forms must include the token.

> [!warning] OAuth2 redirect URIs
> Must match EXACTLY what the IdP expects. `http://localhost:8080/login/oauth2/code/google` is the default for Google.

> [!tip] Use `PasswordEncoderFactories.createDelegatingPasswordEncoder()`
> Future-proofs against migrating hashing algorithms ([[06-Password-Encoding]]).

## Related

- [[01-Spring-Security-Concepts]]
- [[02-Configuration-and-SecurityFilterChain]]
- [[04-JWT-with-Spring-Security]]
- [[06-Password-Encoding]]
- [[08-OAuth2-Resource-Server]]
