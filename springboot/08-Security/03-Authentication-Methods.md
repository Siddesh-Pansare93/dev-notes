# Authentication Methods

Socho ek second ke liye — jab bhi koi user tumhare app pe aata hai, sabse pehla sawaal yehi hota hai: **"Tu hai kaun?"** Yeh jo verification process hai na, isi ko authentication kehte hain. Ab yeh verification kaise ho — username/password se, session cookie se, JWT token se, ya Google/GitHub jaise kisi third-party se — uske alag-alag tareeke hain. Aaj hum yehi saare tareeke dekhenge, ekdum practically, Spring Security ke saath.

> [!info] Express/TS wale dev ke liye
> Tumne Node/Express mein yeh options already dekhe honge:
> - **HTTP Basic** — username/password seedha header mein. Sirf local-dev ke liye theek hai.
> - **Form login** — server-rendered apps ke liye; session cookie use hota hai.
> - **JWT bearer** — stateless API auth, mobile/SPA ke liye popular.
> - **OAuth2 / OIDC** — federated identity (Google, Auth0, Keycloak) — matlab "Login with Google" wala flow.
>
> Spring Security in chaaron ko support karta hai, aur ek hi app mein multiple `SecurityFilterChain` beans banake inhe combine bhi kar sakte ho — jaise Zomato app mein customer login alag hota hai aur delivery partner login alag.

## Decision matrix — kab kaunsa use karna hai?

Yeh table samajh lo cheat-sheet jaisa. Jab bhi confusion ho ki "iss project mein kaunsa auth lagau", yahan wapas aa jana.

| Method | Token | State | Kab use karna hai |
| --- | --- | --- | --- |
| HTTP Basic | `Authorization: Basic base64(user:pass)` | Stateless | Internal tools, dev environment, machine-to-machine (TLS ke saath) |
| Form login + session | `JSESSIONID` cookie | Stateful | Server-rendered apps (Thymeleaf jaise) |
| JWT bearer | `Authorization: Bearer <jwt>` | Stateless | SPA / mobile app / microservices |
| OAuth2 client | Cookie/session of the IdP | Stateful (usually) | "Login with Google" jaise flows |
| OAuth2 resource server | JWT ya opaque token IdP se | Stateless | Backend jo kisi external IdP se protect hota hai |

## HTTP Basic — sabse simple, lekin sabse "kaccha"

**Kya hota hai?** Har request ke header mein `username:password` ko base64 encode karke bhej diya jaata hai. Browser khud ek native popup dikhata hai login ke liye — woh ugly wala dialog box jo tumne kabhi na kabhi dekha hoga.

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

**Kyun careful rehna hai?** Base64 encoding hai, encryption nahi. Matlab agar koi network traffic sniff kar le (bina HTTPS ke), toh username-password seedha nikal sakta hai — jaise koi tumhara UPI PIN plaintext mein bhej de. Isliye production mein almost kabhi use nahi karte. `/actuator` endpoints ko VPN ke peeche protect karne jaisi cheezon ke liye theek hai.

## Form login (server-side rendered apps)

**Kya hota hai?** Yeh woh classic wala login hai — HTML form bharo, submit karo, server session banata hai aur `JSESSIONID` cookie browser ko de deta hai. Ab har request pe woh cookie automatically jaata hai, aur server pehchan leta hai "arre yeh toh wahi user hai".

Node ke `express-session` + Passport `LocalStrategy` ka Spring Security version samjho isse.

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

Login template (`src/main/resources/templates/login.html`, agar Thymeleaf use kar rahe ho):

```html
<form method="post" action="/login">
    <input type="hidden" name="_csrf" th:value="${_csrf.token}"/>
    <input name="username" required/>
    <input name="password" type="password" required/>
    <button type="submit">Sign in</button>
</form>
```

Ab yeh users kahan se aayenge? Woh batata hai `UserDetailsService` — yeh interface bolta hai "mujhe email do, main tumhe user ka pura data doonga (password hash, roles, sab kuch)":

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

> [!tip] Node comparison
> Yeh bilkul `passport.use(new LocalStrategy(async (username, password, done) => {...}))` jaisa hai — jahan tum khud DB se user dhoondh ke `done(null, user)` call karte ho.

## JWT bearer — typical SPA backend ka setup

Ab yeh wala sabse zyada use hota hai aajkal — React/Angular frontend, mobile app, ya microservices ke beech communication. Yahan koi session/cookie nahi hota, sirf ek token jo har request ke header mein jaata hai: `Authorization: Bearer <token>`.

Spring Security mein iske do parts hain, confuse mat hona:

1. **Resource server** — yeh tumhare app mein aane wale JWT ko **validate** karta hai (sabse common case). Dekh lo [[08-OAuth2-Resource-Server]] aur [[04-JWT-with-Spring-Security]].
2. **Self-issued JWT** — jab tumhara khud ka app token **banata** hai (custom login endpoint ke through).

**Resource server** ka quickstart (yeh maan ke chal raha hai ki JWT kisi configured issuer se aa raha hai):

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

Bas itna hi! Spring khud JWKS (public keys) fetch kar lega, signature verify karega, aur tumhare controller mein `@AuthenticationPrincipal Jwt` inject kar dega. Ekdum jaadu jaisa lagta hai pehli baar, but yeh bas standard OAuth2/OIDC flow follow kar raha hai.

## OAuth2 client — "Login with Google/Auth0/Keycloak"

**Kya hota hai?** Jab tum khud password store nahi karna chahte — user Google se login kare, Google confirm kare "haan yeh sahi bandaa hai", aur tumhara app trust kar le. Bilkul CRED ya Swiggy jaisa — "Continue with Google" button dabao, redirect ho jao, wapas aa jao logged-in.

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

`/oauth2/authorization/google` pe jao, aur Spring sab kuch khud handle kar leta hai — redirect Google ko, authorization code wapas lena, token exchange karna, sab automatic.

Logged-in user ka data chahiye? Bas yeh:

```java
@GetMapping("/me")
public Map<String, Object> me(@AuthenticationPrincipal OidcUser principal) {
    return principal.getAttributes();
}
```

## Combining methods — ek hi app mein multiple auth types

Real projects mein aksar aisa hota hai — tumhara `/api/**` JWT se protect hai (mobile app ke liye), aur `/`, `/dashboard` waala web UI session-based login use karta hai. Dono ek saath chal sakte hain, do alag `SecurityFilterChain` beans ke through:

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

> [!warning] Order matters!
> `@Order(1)` wala chain pehle try hota hai. Jo request `securityMatcher` se match nahi karti, woh agle chain ke paas jaati hai. Agar order galat rakh doge, toh galat rule apply ho sakta hai — jaise Ola driver-app ka request accidentally customer-app ke rules follow kar le.

## Express/TS comparison

Tumhare liye direct mapping table — Passport strategies vs Spring Security:

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

Basically jo kaam tum Node mein manually strategies likh ke, middleware chain set karke karte ho, woh Spring Security mein configuration + annotations se ho jaata hai. Thoda "magic" zyada lagta hai shuru mein, lekin ek baar pattern samajh aa jaaye toh boilerplate bahut kam ho jaata hai.

## Gotchas — yeh galtiyan mat karna

> [!warning] HTTP Basic bina TLS ke
> Base64 encoding hai, encryption nahi. Localhost ke alawa har environment mein HTTPS mandatory rakho. Warna password plaintext mein ghoomta rahega jaise unencrypted WhatsApp message.

> [!danger] Khud ke JWT issue karna
> Yeh galat karna bahut aasaan hai — weak secret keys, `aud` (audience) validation missing, koi key rotation nahi, revoke karne ka koi tareeka nahi. Jab tak koi bahut strong reason na ho, established IdP (Keycloak, Auth0, AWS Cognito) use karo aur resource server ban jao. Agar khud issue karna hi hai, toh `nimbus-jose-jwt` library use karo aur keys rotate karte raho.

> [!warning] JWT ke saath session policy
> `STATELESS` set karna mat bhoolna. Nahi toh Spring har request pe ek `HttpSession` bana dega — jo poore JWT/stateless approach ka matlab hi khatam kar dega. Yeh waisi hi galti hai jaise REST API banake bhi har request pe cookie session maintain karna — dono duniya ka fayda nahi milega.

> [!warning] CSRF aur form login
> Session-based auth use kar rahe ho toh CSRF protection zaruri hai. Spring ka CSRF protection automatic hai, lekin tumhare forms mein token include hona chahiye (jaise upar `th:value="${_csrf.token}"` mein dikhaya).

> [!warning] OAuth2 redirect URIs
> IdP ke paas jo register kiya hai, redirect URI usse **EXACTLY** match hona chahiye — ek bhi trailing slash ya http/https mismatch aur poora flow fail. `http://localhost:8080/login/oauth2/code/google` Google ke liye default hai.

> [!tip] `PasswordEncoderFactories.createDelegatingPasswordEncoder()` use karo
> Yeh future-proof karta hai — agar kabhi hashing algorithm change karna pade (bcrypt se argon2 ya kuch aur), toh migration easy ho jaata hai. Detail ke liye [[06-Password-Encoding]] dekho.

## Related

- [[01-Spring-Security-Concepts]]
- [[02-Configuration-and-SecurityFilterChain]]
- [[04-JWT-with-Spring-Security]]
- [[06-Password-Encoding]]
- [[08-OAuth2-Resource-Server]]

## Key Takeaways

- **HTTP Basic** — sabse simple, sabse insecure bina TLS ke. Sirf internal/dev use ke liye.
- **Form login** — server-rendered apps ke liye, session/cookie based, CSRF protection zaruri.
- **JWT bearer (resource server)** — SPA/mobile/microservices ka standard, hamesha `STATELESS` session policy ke saath.
- **OAuth2 client** — "Login with Google/Auth0" jaisa federated login, redirect URI exact match hona chahiye.
- Ek app mein multiple `SecurityFilterChain` beans banake alag-alag URL patterns ke liye alag auth strategy use kar sakte ho — order (`@Order`) sahi rakhna zaruri hai.
- Khud JWT issue karne se bachna — established IdP use karo jab tak koi strong reason na ho.
- Passport strategies ki tarah hi Spring Security ke bhi building blocks hain — bas config-driven aur annotation-based zyada hai.
