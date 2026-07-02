# Spring Security OIDC Login

> [!info] Express/TS wale dev ke liye
> Yeh Spring ka equivalent hai `passport-openidconnect` + `express-session` + `passport.authenticate('oidc')` ka. Spring Boot session management, CSRF, aur token refresh sab khud handle kar leta hai — bas ek baar config kar do. Par yahan pe catch yeh hai ki configuration file utni choti nahi hai jitni tum expect karte ho.

## Concept / mental model — kya hota hai yahan?

Socho tum Zomato pe login kar rahe ho aur woh tumhe "Login with Google" ka option deta hai. Click karte hi tum Google ke page pe redirect ho jaate ho, wahan password daalte ho, aur Google Zomato ko bata deta hai "haan bhai, yeh banda genuine hai, yeh raha uska proof (token)". Yehi poora flow OIDC (OpenID Connect) hai — aur Spring Security ismein tumhara sabse bada helper hai.

`spring-boot-starter-oauth2-client` dependency add karte hi yeh sab automatically mil jaata hai:
- Ek OAuth2 login filter jo `/oauth2/authorization/{registrationId}` URL ko intercept karke IdP (Identity Provider — Google/Okta/Keycloak) pe redirect kar deta hai
- Ek callback handler `/login/oauth2/code/{registrationId}` pe — jo IdP se aaye code ko tokens ke saath exchange karta hai
- `OAuth2AuthorizedClientRepository` — har user ke access/refresh tokens store karne ke liye
- `@RegisteredOAuth2AuthorizedClient` injection — downstream API calls karne ke liye

Yahan teen alag use cases hain (per registration ek hi choose karo):

| Use case | Configuration | Kab use karo |
|---|---|---|
| Web SSO login | `authorization-code` grant | Users browser se login karte hain |
| API client credentials | `client_credentials` grant | Service-to-service calls |
| Resource server | (use `oauth2ResourceServer()`) | IdP se aaye JWTs validate karna |

Yeh note **web SSO login** pe focus karta hai. Resource server config [[08-OAuth2-Resource-Server]] mein hai.

---

## Dependencies

```xml
<!-- pom.xml -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-oauth2-client</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security</artifactId>
</dependency>
```

---

## Code examples

### `application.yml` — chaar IdPs ka setup

Kyun zaruri hai? Kyunki production mein aksar tumhe multiple login options dene padte hain — koi Google se login karega, koi company ka Okta/Keycloak use karega. Spring har IdP ko ek "registration" ke roop mein treat karta hai.

```yaml
spring:
  security:
    oauth2:
      client:
        registration:

          # Auth0
          auth0:
            client-id: ${AUTH0_CLIENT_ID}
            client-secret: ${AUTH0_CLIENT_SECRET}
            scope: openid, profile, email
            authorization-grant-type: authorization_code
            redirect-uri: "{baseUrl}/login/oauth2/code/{registrationId}"

          # Okta
          okta:
            client-id: ${OKTA_CLIENT_ID}
            client-secret: ${OKTA_CLIENT_SECRET}
            scope: openid, profile, email, groups
            authorization-grant-type: authorization_code

          # Keycloak (self-hosted)
          keycloak:
            client-id: my-app
            client-secret: ${KEYCLOAK_CLIENT_SECRET}
            scope: openid, profile, email, roles
            authorization-grant-type: authorization_code

          # Microsoft Entra ID (pehle Azure AD kehte the)
          entra:
            client-id: ${AZURE_CLIENT_ID}
            client-secret: ${AZURE_CLIENT_SECRET}
            scope: openid, profile, email, https://graph.microsoft.com/.default
            authorization-grant-type: authorization_code

          # Google (public client — PKCE use karo, secret nahi)
          google:
            client-id: ${GOOGLE_CLIENT_ID}
            client-secret: ${GOOGLE_CLIENT_SECRET}
            scope: openid, profile, email

        provider:
          auth0:
            issuer-uri: https://${AUTH0_DOMAIN}/
          okta:
            issuer-uri: https://${OKTA_DOMAIN}/oauth2/default
          keycloak:
            issuer-uri: http://localhost:8080/realms/my-realm
          entra:
            issuer-uri: https://login.microsoftonline.com/${AZURE_TENANT_ID}/v2.0
          google:
            issuer-uri: https://accounts.google.com
```

> [!tip]
> `issuer-uri` daalte hi OIDC discovery trigger ho jaati hai — Spring startup pe `{issuer}/.well-known/openid-configuration` fetch karke saare endpoint URLs aur JWKS cache kar leta hai. Matlab tumhe individual endpoint URLs kahin hardcode karne ki zarurat hi nahi. Bilkul Postman ke "import from URL" jaisa — ek URL do, baaki sab apne aap set ho jaata hai.

### `SecurityFilterChain` — OIDC login config

Yeh woh jagah hai jahan tum decide karte ho kaun se routes public hain, login page kaun sa hai, aur logout pe kya hoga.

```java
@Configuration
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final CustomOAuth2UserService oAuth2UserService;
    private final CustomOidcUserService   oidcUserService;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/", "/login", "/error", "/actuator/health").permitAll()
                .anyRequest().authenticated()
            )
            .oauth2Login(oauth2 -> oauth2
                .loginPage("/login")                    // apna custom login page
                .userInfoEndpoint(userInfo -> userInfo
                    .userService(oAuth2UserService)     // non-OIDC ke liye (GitHub, etc.)
                    .oidcUserService(oidcUserService)   // OIDC IdPs ke liye
                )
                .successHandler(oAuth2SuccessHandler())
                .failureHandler(oAuth2FailureHandler())
            )
            .logout(logout -> logout
                .logoutUrl("/logout")
                .logoutSuccessHandler(oidcLogoutSuccessHandler())
                .deleteCookies("JSESSIONID")
                .invalidateHttpSession(true)
            )
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED)
                .maximumSessions(1)                     // ek user, ek hi session
                .maxSessionsPreventsLogin(false)        // naya login hote hi purana session logout
            );

        return http.build();
    }

    @Bean
    public OidcClientInitiatedLogoutSuccessHandler oidcLogoutSuccessHandler(
            ClientRegistrationRepository registrations) {
        var handler = new OidcClientInitiatedLogoutSuccessHandler(registrations);
        handler.setPostLogoutRedirectUri("{baseUrl}/");
        return handler;
    }
}
```

### Custom `OidcUserService` — IdP ke claims ko apne local user se map karo

Kyun zaruri hai? Kyunki Google/Keycloak sirf yeh bata sakta hai "yeh banda hai kaun", lekin tumhare app mein uske roles, permissions, aur database record khud tumhe manage karna padta hai. Yeh service woh bridge hai.

```java
@Service
@RequiredArgsConstructor
public class CustomOidcUserService extends OidcUserService {

    private final UserRepository userRepo;

    @Override
    @Transactional
    public OidcUser loadUser(OidcUserRequest userRequest) throws OAuth2AuthenticationException {
        // Pehle Spring ko base OIDC user load karne do
        OidcUser oidcUser = super.loadUser(userRequest);

        String email    = oidcUser.getEmail();
        String provider = userRequest.getClientRegistration().getRegistrationId();
        String subject  = oidcUser.getSubject();

        // Local user dhoondo ya naya banao
        User user = userRepo.findByEmail(email)
            .orElseGet(() -> createLocalUser(email, provider, subject, oidcUser));

        // Database ke roles ko GrantedAuthority mein convert karo
        List<GrantedAuthority> authorities = buildAuthorities(user, oidcUser, provider);

        return new DefaultOidcUser(
            authorities,
            oidcUser.getIdToken(),
            oidcUser.getUserInfo()
        );
    }

    private User createLocalUser(String email, String provider,
                                 String subject, OidcUser oidcUser) {
        User user = new User();
        user.setEmail(email);
        user.setName(oidcUser.getFullName());
        user.setSsoProvider(provider);
        user.setSsoSubject(subject);
        user.setRoles(Set.of(defaultUserRole()));
        return userRepo.save(user);
    }

    private List<GrantedAuthority> buildAuthorities(User user,
                                                     OidcUser oidcUser,
                                                     String provider) {
        List<GrantedAuthority> authorities = new ArrayList<>();

        // Hamesha local database ke roles add karo
        user.getRoles().stream()
            .map(r -> new SimpleGrantedAuthority(r.getName()))
            .forEach(authorities::add);

        // IdP ke groups ko local roles se map karo
        if ("keycloak".equals(provider)) {
            List<String> keycloakRoles = oidcUser.getClaimAsStringList("realm_access.roles");
            if (keycloakRoles != null) {
                keycloakRoles.stream()
                    .filter(r -> r.startsWith("app_"))  // sirf app-specific roles
                    .map(r -> new SimpleGrantedAuthority("ROLE_" + r.toUpperCase()))
                    .forEach(authorities::add);
            }
        } else if ("entra".equals(provider)) {
            List<String> groups = oidcUser.getClaimAsStringList("groups");
            mapEntraGroupsToAuthorities(groups, authorities);
        }

        return List.copyOf(authorities);
    }
}
```

### Public clients ke liye PKCE

Spring Security PKCE (Proof Key for Code Exchange) ko automatically enable kar deta hai jab client `public` register ho (matlab koi client secret nahi) ya `client-authentication-method: none` set ho. Isse samjho jaise OTP verification — bina secret ke bhi tum prove kar sakte ho ki request wahi banda bhej raha hai jisne shuru ki thi.

```yaml
spring:
  security:
    oauth2:
      client:
        registration:
          my-spa-backend:
            client-id: ${CLIENT_ID}
            client-authentication-method: none  # PKCE trigger hota hai
            authorization-grant-type: authorization_code
            scope: openid, profile, email
```

### Refresh token handling

Kya problem solve karta hai? Access tokens short-lived hote hain (15-60 min). Agar token expire ho gaya aur tum user ko baar baar login karwaoge, toh UX ekdum khराब hoga — bilkul waise jaise Swiggy app baar baar OTP maange. Refresh token isi headache ko solve karta hai.

```java
@RestController
@RequiredArgsConstructor
public class ApiController {

    private final OAuth2AuthorizedClientService clientService;

    @GetMapping("/api/protected")
    public ResponseEntity<?> protectedEndpoint(
            @RegisteredOAuth2AuthorizedClient("keycloak")
            OAuth2AuthorizedClient authorizedClient,
            Authentication authentication) {

        // Agar token expire ho gaya hai toh Spring khud refresh kar leta hai
        // (iske liye refresh_token scope aur RefreshTokenOAuth2AuthorizedClientProvider chahiye)
        String accessToken = authorizedClient.getAccessToken().getTokenValue();

        // downstream APIs call karne ke liye accessToken use karo
        return ResponseEntity.ok(Map.of("token_type", "refreshed automatically"));
    }
}
```

> [!tip]
> Refresh token support enable karne ke liye apne `OAuth2AuthorizedClientManager` bean mein `RefreshTokenOAuth2AuthorizedClientProvider` register karo. Iske bina, expired access tokens downstream services se seedhe 401 dilwa denge — bina automatic recovery ke.

```java
@Bean
public OAuth2AuthorizedClientManager authorizedClientManager(
        ClientRegistrationRepository registrations,
        OAuth2AuthorizedClientRepository authorizedClients) {

    var providers = OAuth2AuthorizedClientProviderBuilder.builder()
        .authorizationCode()
        .refreshToken()                  // automatic refresh enable karta hai
        .clientCredentials()
        .password()
        .build();

    var manager = new DefaultOAuth2AuthorizedClientManager(
        registrations, authorizedClients);
    manager.setAuthorizedClientProvider(providers);
    return manager;
}
```

### RP-initiated logout + token revocation

Sirf apne app se logout karna kaafi nahi — IdP (Google/Keycloak) pe bhi session khatam karna chahiye, warna user "logged out" dikhega par IdP ke paas session zinda rahega. Isko RP-initiated logout kehte hain (RP = Relying Party, yaani tumhara app).

```java
@Bean
public OidcClientInitiatedLogoutSuccessHandler oidcLogoutSuccessHandler(
        ClientRegistrationRepository registrations) {

    // Local logout ke baad IdP ke end_session_endpoint pe redirect karta hai
    var handler = new OidcClientInitiatedLogoutSuccessHandler(registrations);
    handler.setPostLogoutRedirectUri("{baseUrl}/logged-out");
    return handler;
}
```

Token revocation ke liye (IdP pe refresh token ko invalidate karna):

```java
@Service
@RequiredArgsConstructor
public class TokenRevocationService {

    private final RestTemplate restTemplate;

    public void revokeToken(OAuth2AuthorizedClient client) {
        String revokeEndpoint = client.getClientRegistration()
            .getProviderDetails()
            .getConfigurationMetadata()
            .getOrDefault("revocation_endpoint", "").toString();

        if (!revokeEndpoint.isEmpty()) {
            restTemplate.postForEntity(
                revokeEndpoint,
                Map.of(
                    "token", client.getRefreshToken().getTokenValue(),
                    "client_id", client.getClientRegistration().getClientId()
                ),
                Void.class
            );
        }
    }
}
```

---

## OIDC login ko stateless JWT ke saath combine karna

Kaafi architectures mein browser SSO ke liye OIDC use hota hai, lekin API calls ke liye apna khud ka short-lived JWT issue kiya jaata hai. Isko BFF (Backend-for-Frontend) pattern kehte hain — bilkul waise jaise IRCTC apne backend se ek session token deta hai, chahe underlying payment kisi bhi bank/UPI provider se hui ho.

```java
@Component
@RequiredArgsConstructor
public class OAuth2LoginSuccessHandler implements AuthenticationSuccessHandler {

    private final JwtTokenService jwtService;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication auth) throws IOException {

        OidcUser oidcUser = (OidcUser) auth.getPrincipal();
        String jwt = jwtService.generateToken(oidcUser);

        // Apna khud ka JWT HttpOnly cookie mein set karo
        Cookie cookie = new Cookie("access_token", jwt);
        cookie.setHttpOnly(true);
        cookie.setSecure(true);
        cookie.setPath("/");
        cookie.setMaxAge(900);  // 15 minute
        response.addCookie(cookie);

        response.sendRedirect("/app");
    }
}
```

---

## Multiple IdPs ko ek hi user se map karna

Challenge yeh hai: user@company.com office mein Google se login karta hai, aur personal projects ke liye GitHub se — email same hai, par har IdP ka `subject` (sub claim) alag hoga. Bilkul waise jaise ek hi bande ka Paytm aur PhonePe pe alag-alag UPI ID ho sakti hai, par bank account ek hi hai.

```java
@Entity
public class UserIdentity {
    @Id @GeneratedValue
    private Long id;

    @ManyToOne
    private User user;

    private String provider;      // "google", "github", "keycloak"
    private String providerUserId; // us IdP ka sub claim

    @Column(unique = true)
    private String providerKey;    // provider + ":" + providerUserId
}

// OidcUserService mein:
private User resolveUser(String email, String provider, String subject) {
    String providerKey = provider + ":" + subject;

    // Pehli koshish: provider identity se dhoondo
    return identityRepo.findByProviderKey(providerKey)
        .map(UserIdentity::getUser)
        .or(() ->
            // Doosri koshish: email se dhoondo, naya identity link karo
            userRepo.findByEmail(email).map(existing -> {
                linkIdentity(existing, provider, subject, providerKey);
                return existing;
            })
        )
        .orElseGet(() ->
            // Teesri: isi IdP se bilkul naya user banao
            createUserWithIdentity(email, provider, subject, providerKey)
        );
}
```

> [!warning]
> Email se accounts link karna tabhi safe hai jab IdP email ownership verify karta ho. Google karta hai. Kuch chhote IdPs nahi karte. Agar ID token mein `email_verified: true` nahi hai, toh usse unverified maano aur explicit account-link step maango — warna koi bhi fake email se tumhare existing account mein ghus sakta hai.

---

## Express/TS comparison

```typescript
// passport-openidconnect (simplified)
passport.use('oidc', new OidcStrategy({
  issuer: process.env.ISSUER,
  authorizationURL: '...',
  tokenURL: '...',
  userInfoURL: '...',
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: '/auth/callback',
  scope: 'openid profile email',
}, async (tokenset, userinfo, done) => {
  const user = await User.findOrCreate({
    where: { email: userinfo.email },
    defaults: { name: userinfo.name }
  });
  return done(null, user);
}));

router.get('/auth/login', passport.authenticate('oidc'));
router.get('/auth/callback',
  passport.authenticate('oidc', { failureRedirect: '/login' }),
  (req, res) => res.redirect('/')
);
```

Spring callback URL registration, token exchange, session management, aur CSRF — sab kuch khud handle kar leta hai. Tradeoff yeh hai: magic zyada, par initial flow mein flexibility kam. `CustomOidcUserService` bilkul passport ke verify callback jaisa hi kaam karta hai.

---

## Gotchas — yeh cheezein sabko ek baar burn karti hain

> [!danger]
> **Login endpoints ke liye CSRF disable mat karo.** OAuth2 callback endpoint by default CSRF se protected hota hai. Agar tumne apni stateless JWT API ke liye globally CSRF disable kar rakha hai (jo common hai), toh OAuth2 login flow ke liye ise wapas enable karna padega ya stateless alternative use karna padega.

> [!warning]
> **Clustered deployments mein `nonce` mismatch.** Spring OIDC ka nonce HTTP session mein store karta hai. Agar tumhare paas multiple instances hain bina sticky sessions ya shared session storage (Redis) ke, toh callback pe nonce mil hi nahi payega aur login ek cryptic error ke saath fail ho jaayega. Instances ke beech session share karne ke liye Spring Session with Redis use karo.

> [!warning]
> **ID token vs access token — dono alag cheez hain.** ID token tumhare app ke liye hai, taaki user ko identify kar sako "yeh banda kaun hai". Access token uske taraf se APIs call karne ke liye hai. Kabhi bhi ID token ko downstream API pe bearer token ke roop mein mat bhejo — woh uske liye bana hi nahi hai.

> [!danger]
> **Keycloak ka `realm_access.roles` ek nested JSON claim hai**, flat string list nahi. `oidcUser.getClaimAsStringList("realm_access.roles")` seedha `null` return karega — pehle isko Map ke roop mein extract karna padega: `oidcUser.getClaim("realm_access")`. Yeh galti almost har ek dev karta hai pehli baar mein.

---

## Production checklist

- [ ] Har IdP ke liye `issuer-uri` configured hai (OIDC discovery use karta hai)
- [ ] Refresh token scope request kiya + `RefreshTokenOAuth2AuthorizedClientProvider` register kiya
- [ ] Public clients (SPAs, mobile) ke liye PKCE enable hai
- [ ] RP-initiated logout implement + har IdP ke saath test kiya hai
- [ ] Clustered deployments ke liye Spring Session + Redis (nonce/state storage ke liye)
- [ ] Email se account link karne se pehle `email_verified` claim check ho raha hai
- [ ] Multi-IdP account linking strategy document ki hui hai
- [ ] Login flow ke liye CSRF disable nahi hai
- [ ] `OidcUserService` mock IdP responses ke saath test kiya hai (WireMock use karo)
- [ ] Secrets (`client-secret`) Vault/Secrets Manager se load ho rahe hain, `application.yml` se nahi

---

## Related

- [[12-SSO-Overview-SAML-vs-OIDC]]
- [[14-SAML-with-Spring-Security]]
- [[08-OAuth2-Resource-Server]]
- [[04-JWT-with-Spring-Security]]
- [[03-Authentication-Methods]]
- [[17-Secrets-Management]]
- [[15-Multi-Tenancy-Security]]
- [[09-RBAC-Production-Patterns]]
