---
tags: [security, oauth2, resource-server, jwt, jwks]
aliases: [OAuth2 Resource Server, Resource Server, Bearer Tokens]
stage: advanced
---

# OAuth2 Resource Server

> [!info] For the Express/TS dev
> If you've used Auth0/Cognito/Keycloak from Node, you know the dance: fetch JWKS, validate tokens with `jose`, extract claims, attach to `req.user`. Spring Security's **resource server** is that whole dance as a single starter dependency. Configure `issuer-uri` and you're done — including JWKS rotation, audience validation, scope mapping. This is the modern, recommended pattern for backend services.

## Concept / How it works

A **resource server** is your backend. It receives access tokens (JWT or opaque) issued by an **authorization server** (Keycloak, Auth0, Cognito, Okta, your own). It validates them and authorizes requests.

```
[ User ] → [ Auth Server ] (issues token)
              │
              ▼
[ User w/ token ] → [ Resource Server (your Spring app) ] → 200 / 401 / 403
```

Two token formats:
- **JWT** — self-contained, signed. Resource server validates locally with JWKS. Faster, scalable.
- **Opaque** — random string. Resource server calls auth server's introspection endpoint to validate. Slower, but supports immediate revocation.

## Code example — JWT (most common)

`pom.xml`:

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-oauth2-resource-server</artifactId>
</dependency>
```

`application.yml`:

```yaml
spring:
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: https://auth.example.com/realms/acme
          # Spring fetches:
          # - Configuration: {issuer-uri}/.well-known/openid-configuration
          # - JWKS:          (jwks_uri from above)
          audiences:
            - acme-api
```

```java
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain chain(HttpSecurity http) throws Exception {
        return http
            .csrf(c -> c.disable())
            .sessionManagement(s -> s.sessionCreationPolicy(STATELESS))
            .authorizeHttpRequests(a -> a
                .requestMatchers("/api/v1/public/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/**").hasAuthority("SCOPE_read")
                .requestMatchers("/api/**").hasAuthority("SCOPE_write")
                .anyRequest().authenticated())
            .oauth2ResourceServer(o -> o
                .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthConverter())))
            .build();
    }

    private JwtAuthenticationConverter jwtAuthConverter() {
        // Default: claims["scope"] (space-separated) → SCOPE_<value> authorities
        // Customize for Keycloak's "realm_access.roles" claim:
        JwtAuthenticationConverter conv = new JwtAuthenticationConverter();
        conv.setJwtGrantedAuthoritiesConverter(jwt -> {
            Collection<GrantedAuthority> authorities = new ArrayList<>();

            // Standard scopes
            String scopes = jwt.getClaimAsString("scope");
            if (scopes != null) {
                for (String s : scopes.split(" ")) {
                    authorities.add(new SimpleGrantedAuthority("SCOPE_" + s));
                }
            }

            // Keycloak realm roles
            Map<String, Object> realmAccess = jwt.getClaim("realm_access");
            if (realmAccess != null) {
                @SuppressWarnings("unchecked")
                List<String> roles = (List<String>) realmAccess.get("roles");
                if (roles != null) {
                    for (String r : roles) {
                        authorities.add(new SimpleGrantedAuthority("ROLE_" + r.toUpperCase()));
                    }
                }
            }
            return authorities;
        });
        // Use sub or a custom claim as the principal name
        conv.setPrincipalClaimName("preferred_username");
        return conv;
    }
}
```

### Audience validation

```java
@Bean
public JwtDecoder jwtDecoder(OAuth2ResourceServerProperties props) {
    NimbusJwtDecoder decoder = JwtDecoders.fromIssuerLocation(
            props.getJwt().getIssuerUri());

    OAuth2TokenValidator<Jwt> withAudience = new JwtClaimValidator<List<String>>(
            JwtClaimNames.AUD,
            aud -> aud != null && aud.contains("acme-api"));
    OAuth2TokenValidator<Jwt> withIssuer =
            JwtValidators.createDefaultWithIssuer(props.getJwt().getIssuerUri());

    decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(withIssuer, withAudience));
    return decoder;
}
```

### Accessing the principal

```java
@RestController
@RequestMapping("/api/v1")
public class MeController {

    @GetMapping("/me")
    public Map<String, Object> me(@AuthenticationPrincipal Jwt jwt) {
        return Map.of(
            "sub", jwt.getSubject(),
            "username", jwt.getClaimAsString("preferred_username"),
            "email", jwt.getClaimAsString("email"),
            "scopes", jwt.getClaimAsStringList("scope"),
            "iat", jwt.getIssuedAt(),
            "exp", jwt.getExpiresAt()
        );
    }
}
```

## Opaque tokens (introspection)

```yaml
spring:
  security:
    oauth2:
      resourceserver:
        opaquetoken:
          introspection-uri: https://auth.example.com/oauth2/introspect
          client-id:     acme-api
          client-secret: ${RS_SECRET}
```

```java
http.oauth2ResourceServer(o -> o.opaqueToken(Customizer.withDefaults()));
```

Spring will POST to the introspection endpoint on every request. Cache aggressively (built-in caching available via `OpaqueTokenIntrospector` decorators).

## Multiple issuers (multitenant)

```java
@Bean
public AuthenticationManagerResolver<HttpServletRequest> tokenAuthManagerResolver() {
    Map<String, AuthenticationManager> managers = new ConcurrentHashMap<>();
    managers.put("tenant-a", buildManager("https://auth.example.com/realms/tenant-a"));
    managers.put("tenant-b", buildManager("https://auth.example.com/realms/tenant-b"));
    return req -> {
        String tenant = req.getHeader("X-Tenant");
        return managers.get(tenant);
    };
}

http.oauth2ResourceServer(o -> o.authenticationManagerResolver(tokenAuthManagerResolver()));
```

## Scope, role, authority — making it consistent

A common pattern that works:

| Claim source | Mapped authority | Use in `@PreAuthorize` |
| --- | --- | --- |
| `scope: "users:read users:write"` | `SCOPE_users:read`, `SCOPE_users:write` | `hasAuthority('SCOPE_users:read')` |
| `realm_access.roles: ["ADMIN"]` | `ROLE_ADMIN` | `hasRole('ADMIN')` |

Choose ONE convention per app and document it in the README.

## Express/TS comparison

```ts
// Node + jose
import * as jose from 'jose';

const JWKS = jose.createRemoteJWKSet(new URL('https://auth.example.com/.well-known/jwks.json'));

const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ','');
    const { payload } = await jose.jwtVerify(token, JWKS, {
      issuer: 'https://auth.example.com/realms/acme',
      audience: 'acme-api',
    });
    req.user = payload;
    next();
  } catch { res.status(401).end(); }
};
```

| Node | Spring |
| --- | --- |
| `createRemoteJWKSet` | Auto via `issuer-uri` |
| `jwtVerify(...issuer, audience)` | Auto + `audiences` config |
| Manual scope mapping | `JwtAuthenticationConverter` |
| Caching JWKS | Auto |
| Rotation handling | Auto |

## Gotchas

> [!warning] Issuer must match EXACTLY
> The `iss` claim must equal `issuer-uri`. Trailing slash mismatches are common (Keycloak adds one, Auth0 doesn't). The reference message: `The iss claim is not valid`.

> [!warning] Clock skew
> If your server clock is ahead of the IdP, freshly issued tokens fail with `exp` validation. Spring's default skew tolerance is 60 seconds — usually enough; sync NTP.

> [!warning] Don't forget audience validation
> Tokens for service-A would otherwise be accepted by service-B. Set `audiences:` or add a `JwtClaimValidator`.

> [!warning] Caching the JWKS too long
> Spring caches keys; on rotation, in-flight tokens fail until re-fetch. Default behavior is fine; if you self-host a decoder, ensure `cache-duration` is reasonable (e.g., 5 min).

> [!warning] Mapping authorities incorrectly
> If your IdP claims `roles: ["admin"]` but your code does `.hasRole("ADMIN")`, casing/prefix mismatch causes silent 403s. Log effective authorities in dev:
> ```java
> SecurityContextHolder.getContext().getAuthentication().getAuthorities();
> ```

> [!tip] Token relay between services
> If service A calls service B, propagate the user's token (or get a new on-behalf-of token via OAuth2 token exchange). `OAuth2AuthorizedClientManager` handles client-credentials and token-exchange flows.

> [!tip] Keycloak local dev
> ```bash
> docker run -p 8081:8080 -e KEYCLOAK_ADMIN=admin \
>   -e KEYCLOAK_ADMIN_PASSWORD=admin quay.io/keycloak/keycloak start-dev
> ```
> Realm import + your app's `issuer-uri: http://localhost:8081/realms/acme` and you're testing OAuth2 in 5 minutes.

## Related

- [[01-Spring-Security-Concepts]]
- [[02-Configuration-and-SecurityFilterChain]]
- [[03-Authentication-Methods]]
- [[04-JWT-with-Spring-Security]]
- [[05-Method-Security]]
