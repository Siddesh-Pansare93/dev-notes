---
tags: [security, production, oidc, oauth2, spring-security, keycloak, auth0, okta]
aliases: [OIDC Login, OAuth2 Client, Spring OIDC, Keycloak Spring, Auth0 Spring]
stage: advanced
---

# Spring Security OIDC Login

> [!info] For the Express/TS dev
> This is the Spring equivalent of `passport-openidconnect` + `express-session` + `passport.authenticate('oidc')`. Spring Boot does the session management, CSRF, and token refresh automatically once configured — but the configuration file is bigger than you expect.

## Concept / mental model

`spring-boot-starter-oauth2-client` adds:
- An OAuth2 login filter that intercepts `/oauth2/authorization/{registrationId}` → redirects to IdP
- A callback handler at `/login/oauth2/code/{registrationId}` → exchanges code for tokens
- `OAuth2AuthorizedClientRepository` to store access/refresh tokens per user
- `@RegisteredOAuth2AuthorizedClient` injection for downstream API calls

Three distinct use cases (pick one per registration):

| Use case | Configuration | When to use |
|---|---|---|
| Web SSO login | `authorization-code` grant | Users log in via browser |
| API client credentials | `client_credentials` grant | Service-to-service calls |
| Resource server | (use `oauth2ResourceServer()`) | Validating JWTs from an IdP |

This note focuses on **web SSO login**. Resource server config is in [[08-OAuth2-Resource-Server]].

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

### `application.yml` — four IdPs

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

          # Microsoft Entra ID (formerly Azure AD)
          entra:
            client-id: ${AZURE_CLIENT_ID}
            client-secret: ${AZURE_CLIENT_SECRET}
            scope: openid, profile, email, https://graph.microsoft.com/.default
            authorization-grant-type: authorization_code

          # Google (public client — use PKCE, no secret)
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
> `issuer-uri` triggers OIDC discovery — Spring fetches `{issuer}/.well-known/openid-configuration` at startup and caches all endpoint URLs and JWKS. You don't need to hardcode individual endpoint URLs.

### `SecurityFilterChain` — OIDC login config

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
                .loginPage("/login")                    // custom login page
                .userInfoEndpoint(userInfo -> userInfo
                    .userService(oAuth2UserService)     // for non-OIDC (GitHub, etc.)
                    .oidcUserService(oidcUserService)   // for OIDC IdPs
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
                .maximumSessions(1)                     // single session per user
                .maxSessionsPreventsLogin(false)        // logout old session on new login
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

### Custom `OidcUserService` — map IdP claims to local user + authorities

```java
@Service
@RequiredArgsConstructor
public class CustomOidcUserService extends OidcUserService {

    private final UserRepository userRepo;

    @Override
    @Transactional
    public OidcUser loadUser(OidcUserRequest userRequest) throws OAuth2AuthenticationException {
        // Let Spring load the base OIDC user
        OidcUser oidcUser = super.loadUser(userRequest);

        String email    = oidcUser.getEmail();
        String provider = userRequest.getClientRegistration().getRegistrationId();
        String subject  = oidcUser.getSubject();

        // Find or create local user
        User user = userRepo.findByEmail(email)
            .orElseGet(() -> createLocalUser(email, provider, subject, oidcUser));

        // Map local database roles to GrantedAuthority
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

        // Always add local database roles
        user.getRoles().stream()
            .map(r -> new SimpleGrantedAuthority(r.getName()))
            .forEach(authorities::add);

        // Map IdP groups to local roles
        if ("keycloak".equals(provider)) {
            List<String> keycloakRoles = oidcUser.getClaimAsStringList("realm_access.roles");
            if (keycloakRoles != null) {
                keycloakRoles.stream()
                    .filter(r -> r.startsWith("app_"))  // only app-specific roles
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

### PKCE for public clients

Spring Security enables PKCE automatically when the client is registered as `public` (no client secret) or when `client-authentication-method: none`:

```yaml
spring:
  security:
    oauth2:
      client:
        registration:
          my-spa-backend:
            client-id: ${CLIENT_ID}
            client-authentication-method: none  # triggers PKCE
            authorization-grant-type: authorization_code
            scope: openid, profile, email
```

### Refresh token handling

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

        // Spring automatically refreshes the access token if expired
        // (requires refresh_token scope and the RefreshTokenOAuth2AuthorizedClientProvider)
        String accessToken = authorizedClient.getAccessToken().getTokenValue();

        // Use accessToken to call downstream APIs
        return ResponseEntity.ok(Map.of("token_type", "refreshed automatically"));
    }
}
```

> [!tip]
> Enable refresh token support by registering `RefreshTokenOAuth2AuthorizedClientProvider` in your `OAuth2AuthorizedClientManager` bean. Without this, expired access tokens cause 401s from downstream services without automatic recovery.

```java
@Bean
public OAuth2AuthorizedClientManager authorizedClientManager(
        ClientRegistrationRepository registrations,
        OAuth2AuthorizedClientRepository authorizedClients) {

    var providers = OAuth2AuthorizedClientProviderBuilder.builder()
        .authorizationCode()
        .refreshToken()                  // enables automatic refresh
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

```java
@Bean
public OidcClientInitiatedLogoutSuccessHandler oidcLogoutSuccessHandler(
        ClientRegistrationRepository registrations) {

    // Redirects to IdP's end_session_endpoint after local logout
    var handler = new OidcClientInitiatedLogoutSuccessHandler(registrations);
    handler.setPostLogoutRedirectUri("{baseUrl}/logged-out");
    return handler;
}
```

For token revocation (invalidate the refresh token at the IdP):

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

## Combining OIDC login with stateless JWT

Some architectures use OIDC for the browser SSO flow but issue their own short-lived JWTs for API calls (BFF pattern):

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

        // Set HttpOnly cookie with our own JWT
        Cookie cookie = new Cookie("access_token", jwt);
        cookie.setHttpOnly(true);
        cookie.setSecure(true);
        cookie.setPath("/");
        cookie.setMaxAge(900);  // 15 minutes
        response.addCookie(cookie);

        response.sendRedirect("/app");
    }
}
```

---

## Mapping multiple IdPs to one user

The challenge: user@company.com logs in via Google at work and via GitHub for personal projects — same email, but different IdP subjects.

```java
@Entity
public class UserIdentity {
    @Id @GeneratedValue
    private Long id;

    @ManyToOne
    private User user;

    private String provider;      // "google", "github", "keycloak"
    private String providerUserId; // the sub claim from that IdP

    @Column(unique = true)
    private String providerKey;    // provider + ":" + providerUserId
}

// In OidcUserService:
private User resolveUser(String email, String provider, String subject) {
    String providerKey = provider + ":" + subject;

    // First try: find by provider identity
    return identityRepo.findByProviderKey(providerKey)
        .map(UserIdentity::getUser)
        .or(() ->
            // Second try: find by email, link new identity
            userRepo.findByEmail(email).map(existing -> {
                linkIdentity(existing, provider, subject, providerKey);
                return existing;
            })
        )
        .orElseGet(() ->
            // Third: new user from this IdP
            createUserWithIdentity(email, provider, subject, providerKey)
        );
}
```

> [!warning]
> Linking accounts by email is only safe if the IdP verifies email ownership. Google does. Some smaller IdPs don't. If email is not marked `email_verified: true` in the ID token, treat it as unverified and require an explicit account link step.

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

Spring handles the callback URL registration, token exchange, session management, and CSRF all automatically. The tradeoff: more magic, but less flexibility in the initial flow. The `CustomOidcUserService` is equivalent to passport's verify callback.

---

## Gotchas

> [!danger]
> **Don't disable CSRF for login endpoints.** The OAuth2 callback endpoint is protected by CSRF by default. If you've globally disabled CSRF for your API (common in stateless JWT APIs), you must re-enable it for the OAuth2 login flow or use a stateless alternative.

> [!warning]
> **`nonce` mismatch on clustered deployments.** Spring stores the OIDC nonce in the HTTP session. If you have multiple instances without sticky sessions or shared session storage (Redis), the nonce won't be found on the callback and login fails with a cryptic error. Use Spring Session with Redis to share sessions across instances.

> [!warning]
> **ID token vs access token.** The ID token is for your app to identify the user. The access token is for calling APIs on behalf of the user. Never send the ID token to a downstream API as a bearer token — it's not meant for that.

> [!danger]
> **Keycloak `realm_access.roles` is a nested JSON claim**, not a flat string list. `oidcUser.getClaimAsStringList("realm_access.roles")` returns `null` — you need to extract it as a Map first: `oidcUser.getClaim("realm_access")`. This burns everyone the first time.

---

## Production checklist

- [ ] `issuer-uri` configured for each IdP (uses OIDC discovery)
- [ ] Refresh token scope requested + `RefreshTokenOAuth2AuthorizedClientProvider` registered
- [ ] PKCE enabled for public clients (SPAs, mobile)
- [ ] RP-initiated logout implemented and tested with each IdP
- [ ] Spring Session + Redis for clustered deployments (nonce/state storage)
- [ ] `email_verified` claim checked before linking accounts by email
- [ ] Multi-IdP account linking strategy documented
- [ ] CSRF not disabled for login flow
- [ ] `OidcUserService` tested with mock IdP responses (use WireMock)
- [ ] Secrets (`client-secret`) loaded from Vault/Secrets Manager, not `application.yml`

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
