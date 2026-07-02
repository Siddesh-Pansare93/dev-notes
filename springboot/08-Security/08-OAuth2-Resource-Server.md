# OAuth2 Resource Server

> [!info] Express/TS wale dev ke liye
> Agar tumne Auth0/Cognito/Keycloak Node se use kiya hai, toh tumhe pata hai ki poora dance kya hota hai: JWKS fetch karo, `jose` library se token validate karo, claims nikaalo, `req.user` pe chipka do. Spring Security ka **resource server** yehi poora dance hai — bas ek starter dependency ke through. `issuer-uri` configure karo aur bas, kaam khatam — JWKS rotation, audience validation, scope mapping sab automatic. Yeh modern, recommended pattern hai backend services ke liye.

## Concept / Kaam kaise karta hai

Socho tum Zomato ka backend bana rahe ho. User apna login Google se karta hai (ya koi bhi identity provider se) — us login provider ko bolte hain **authorization server** (Keycloak, Auth0, Cognito, Okta, ya khud ka bhi bana sakte ho). Woh server user ko ek access token deta hai. Ab jab user tumhare "orders" API ko hit karta hai, tumhara Spring Boot app — jo yahan **resource server** hai — us token ko dekh ke decide karta hai: "haan bhai andar aa" ya "nahi, 401 le ja".

```
[ User ] → [ Auth Server ] (issues token)
              │
              ▼
[ User w/ token ] → [ Resource Server (your Spring app) ] → 200 / 401 / 403
```

**Kyun zaruri hai?** Kyunki tum nahi chahte ki har microservice apna khud ka login/password system banaye. Ek central authority (auth server) tokens issue karta hai, aur baaki saare services (resource servers) sirf us token ko validate karke kaam karte hain — bilkul waise jaise Paytm ek baar tumhe verify kar leta hai, phir uske baad tum wallet, UPI, insurance — sab services use kar paate ho bina baar-baar OTP dale.

Do tarah ke token formats hote hain:
- **JWT** — self-contained, signed token. Resource server ise **locally** validate kar leta hai JWKS (public keys) ka use karke. Fast hai, scale karta hai, kyunki auth server se baar-baar poochna nahi padta.
- **Opaque** — bas ek random string, jaisa session ID. Resource server ko har baar auth server ke introspection endpoint pe call karke poochna padta hai "yeh token valid hai kya?". Thoda slow, lekin fayda yeh hai ki turant revoke kar sakte ho (jaise koi employee ko fire kiya aur uska access turant band karna hai).

## Code example — JWT (sabse common)

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

Bas itna likhne se Spring automatically `issuer-uri` pe jaake `.well-known/openid-configuration` fetch karega, wahan se JWKS URL nikalega, public keys download karega, aur unhe cache karke rakhega token verify karne ke liye. Tumhe manually kuch bhi fetch/cache nahi karna — yeh sab andar hi ho jaata hai, jaise IRCTC ka backend automatically train availability check kar leta hai bina tumhe manually database query likhwaaye.

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

Yahan kya ho raha hai, step by step samjho:

1. `csrf().disable()` — kyunki yeh ek stateless API hai (JWT use ho raha hai, cookies nahi), CSRF attack ka risk hi nahi hai. Node mein bhi tum pure JWT-based APIs pe CSRF middleware nahi lagate.
2. `sessionCreationPolicy(STATELESS)` — Spring koi session store nahi karega. Har request apne aap mein complete hai (token ke andar hi saari info hai) — bilkul stateless microservice jaisa design.
3. `authorizeHttpRequests` — yeh URL-level rules define karta hai: kaun se paths public hain, kaun se GET/POST ke liye kya scope chahiye.
4. `jwtAuthenticationConverter` — yeh sabse important part hai. Default behaviour yeh hai ki Spring `scope` claim ko `SCOPE_xyz` authority mein convert karta hai. Lekin Keycloak jaise IdPs apna khud ka format use karte hain (`realm_access.roles`), toh humein custom converter likhna padta hai jo dono — scopes aur roles — ko authorities mein map kare.

> [!tip] SCOPE_ vs ROLE_ prefix
> Spring Security mein convention hai: OAuth2 scopes ko `SCOPE_` prefix milta hai, aur application roles ko `ROLE_` prefix. `hasAuthority("SCOPE_read")` aur `hasRole("ADMIN")` (jo internally `ROLE_ADMIN` check karta hai) — dono alag concepts hain, mix mat karo.

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

**Audience** matlab "yeh token kiske liye issue hua tha?". Socho ek hi Keycloak instance se Zomato ka "orders-service" aur "payments-service" dono tokens issue karwate hain. Agar audience check nahi lagaya, toh orders-service ka token payments-service pe bhi chal jaayega — jo ek security hole hai. `aud` claim check karke tum yeh ensure karte ho ki token specifically tumhare service ke liye hi bana tha.

### Principal access karna

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

`@AuthenticationPrincipal Jwt jwt` — bas yeh ek annotation lagao aur poora decoded JWT tumhare controller method mein inject ho jaata hai. Node mein iske equivalent hota `req.user` jo tumne `jwtVerify` ke baad manually set kiya hota — yahan Spring khud kar deta hai.

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

Spring har request pe introspection endpoint ko POST karega. Yeh aggressively cache karo (built-in caching available hai `OpaqueTokenIntrospector` decorators ke through).

**Kab use karein?** Jab tumhe instant revocation chahiye — jaise agar CRED app se koi user ko turant logout/ban karna hai, opaque token best hai kyunki auth server se real-time check hota hai. JWT self-contained hone ki wajah se expire hone tak valid rehta hai chahe backend usse "revoke" bhi kar de (jab tak koi blocklist na maintain karo).

## Multiple issuers (multitenant)

Socho tum ek SaaS bana rahe ho jahan alag-alag companies (tenants) apna khud ka Keycloak realm use karte hain — jaise OYO ke alag-alag hotel chains apna khud ka admin panel access rakhte hain. Ek hi resource server ko multiple issuers handle karne padte hain:

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

Yahan `X-Tenant` header dekh ke Spring decide karta hai ki kaunse issuer ke against token verify karna hai — har tenant ka apna JWKS, apna issuer, sab alag.

## Scope, role, authority — consistency banaye rakho

Ek common pattern jo kaam karta hai:

| Claim source | Mapped authority | `@PreAuthorize` mein use |
| --- | --- | --- |
| `scope: "users:read users:write"` | `SCOPE_users:read`, `SCOPE_users:write` | `hasAuthority('SCOPE_users:read')` |
| `realm_access.roles: ["ADMIN"]` | `ROLE_ADMIN` | `hasRole('ADMIN')` |

**EK** convention chuno poore app ke liye aur usse README mein likh do. Mix mat karo — nahi toh 6 mahine baad tum khud confuse ho jaaoge ki kaunsi API scope check karti hai aur kaunsi role check.

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

Basically jo kaam tumne Node mein middleware likh ke, `jose` library ke saath manually kiya, Spring mein woh sab configuration ban jaata hai. Kam code, zyada declarative — trade-off yeh hai ki flexibility thodi kam lagti hai shuru mein jab tak tumhe pata nahi hota ki kya customize kar sakte ho (jaise upar wala `jwtAuthConverter`).

## Gotchas

> [!warning] Issuer EXACTLY match hona chahiye
> `iss` claim ka value bilkul `issuer-uri` ke barabar hona chahiye. Trailing slash ka mismatch bahut common issue hai (Keycloak ek slash add karta hai, Auth0 nahi). Error message dikhega: `The iss claim is not valid`. Copy-paste karte waqt slash dhyan se check karo.

> [!warning] Clock skew
> Agar tumhare server ka clock IdP se aage hai, toh freshly issued tokens `exp` validation mein fail ho jaayenge (aisa lagega jaise token already expire ho gaya). Spring ka default skew tolerance 60 seconds hai — usually kaafi hai; phir bhi NTP sync rakho apne servers pe.

> [!warning] Audience validation bhoolna mat
> Agar audience check nahi lagaya, toh service-A ka token service-B bhi accept kar lega. `audiences:` config karo ya `JwtClaimValidator` add karo — jaise humne upar dekha.

> [!warning] JWKS ko zyada der cache karna
> Spring keys ko cache karta hai; rotation ke time, in-flight tokens tab tak fail honge jab tak re-fetch nahi hota. Default behavior fine hai; agar tum khud ka decoder bana rahe ho, toh `cache-duration` reasonable rakho (jaise 5 min).

> [!warning] Authorities galat map karna
> Agar tumhare IdP ka claim hai `roles: ["admin"]` (lowercase) lekin tumhara code karta hai `.hasRole("ADMIN")` (uppercase), toh casing/prefix mismatch ki wajah se silent 403 milega — koi clear error nahi, bas access denied. Dev mein effective authorities log karo:
> ```java
> SecurityContextHolder.getContext().getAuthentication().getAuthorities();
> ```

> [!tip] Service-to-service token relay
> Agar service A, service B ko call kar raha hai, toh user ka token propagate karo (ya OAuth2 token exchange se naya "on-behalf-of" token lo). `OAuth2AuthorizedClientManager` client-credentials aur token-exchange dono flows handle karta hai — jaise Swiggy ka order-service, payment-service ko call karte waqt user ka context carry forward karta hai.

> [!tip] Keycloak local dev setup
> ```bash
> docker run -p 8081:8080 -e KEYCLOAK_ADMIN=admin \
>   -e KEYCLOAK_ADMIN_PASSWORD=admin quay.io/keycloak/keycloak start-dev
> ```
> Realm import karo, apne app mein `issuer-uri: http://localhost:8081/realms/acme` daalo, aur 5 minute mein tum locally OAuth2 test kar rahe ho — bina kisi cloud Auth0/Cognito account ke.

## Key Takeaways

- **Resource server** = tumhara backend jo access tokens validate karta hai; **authorization server** = alag system jo tokens issue karta hai (Keycloak, Auth0, Cognito).
- **JWT** self-contained hota hai (local validation, fast, scalable); **Opaque** token ke liye har baar auth server se poochna padta hai (slow, but instant revocation possible).
- Sirf `issuer-uri` daal do `application.yml` mein — Spring khud JWKS fetch, cache, aur rotation handle kar leta hai.
- `JwtAuthenticationConverter` customize karke tum apni marzi se scopes/roles ko Spring authorities mein map kar sakte ho — Keycloak jaise providers ke custom claims ke liye zaruri hai.
- **Audience validation** zaruri hai — nahi toh ek service ka token doosri service pe bhi chal jaayega.
- Issuer ka trailing slash, clock skew, aur authority casing mismatch — yeh teen sabse common "silent failure" gotchas hain, in per dhyan do.
- Multitenant setup ke liye `AuthenticationManagerResolver` use karo — request header (jaise `X-Tenant`) ke basis pe alag-alag issuer resolve karne ke liye.
- Node/Express ke comparison mein: jo kaam tum `jose` library se manually karte the (JWKS fetch, verify, scope parse), Spring configuration se automatically ho jaata hai.

## Related

- [[01-Spring-Security-Concepts]]
- [[02-Configuration-and-SecurityFilterChain]]
- [[03-Authentication-Methods]]
- [[04-JWT-with-Spring-Security]]
- [[05-Method-Security]]
