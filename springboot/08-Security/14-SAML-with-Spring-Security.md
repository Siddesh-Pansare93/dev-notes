---
tags: [security, production, saml, sso, spring-security, okta, azure-ad, adfs]
aliases: [SAML, SAML2, Spring SAML, SAML Service Provider]
stage: advanced
---

# SAML with Spring Security

> [!info] For the Express/TS dev
> This is the Spring equivalent of `@node-saml/passport-saml`. SAML is XML-heavy and the config is verbose, but the concepts translate directly: you register your app as a Service Provider (SP), download the IdP's metadata, and handle the `SAMLResponse` POST at your Assertion Consumer Service URL.

## Concept / mental model

The SAML web SSO flow (SP-initiated):

```
1. User → GET /saml2/authenticate/{registrationId}
   Spring Security detects no session → redirects to IdP SSO URL

2. IdP authenticates user (password, MFA, smart card...)

3. IdP → POST {your-app}/login/saml2/sso/{registrationId}
   Body: SAMLResponse (Base64-encoded signed XML)

4. Spring verifies: signature, conditions (audience, timing), attributes

5. Spring creates Authentication → your CustomSamlUserDetailsService runs
   → session created → user redirected to original URL
```

---

## Dependencies

```xml
<!-- pom.xml -->
<dependency>
    <groupId>org.springframework.security</groupId>
    <artifactId>spring-security-saml2-service-provider</artifactId>
</dependency>
<!-- OpenSAML is included transitively; you may need to pin the version -->
```

> [!warning]
> `spring-security-saml2-service-provider` is in `spring-security-*` not `spring-boot-starter-*`. It does not have auto-configuration — you must write the `SecurityFilterChain` bean manually.

---

## Code examples

### Generating SP metadata and keys

You need an RSA key pair for your SP: the private key signs outgoing requests (AuthnRequest); the certificate is shared with the IdP (in your metadata).

```bash
# Generate a self-signed certificate for SP signing
openssl req -newkey rsa:2048 -nodes \
  -keyout sp-signing.key \
  -x509 -days 3650 \
  -out sp-signing.crt \
  -subj "/CN=my-app-sp"
```

Store the private key in Vault/Secrets Manager. See [[17-Secrets-Management]].

```yaml
# application.yml
spring:
  security:
    saml2:
      relyingparty:
        registration:
          okta:
            entity-id: https://my-app.example.com/saml2/service-provider-metadata/okta
            asserting-party:
              metadata-uri: https://my-okta-domain.okta.com/app/${OKTA_APP_ID}/sso/saml/metadata
            signing:
              credentials:
                - private-key-location: classpath:saml/sp-signing.key
                  certificate-location:  classpath:saml/sp-signing.crt
            decryption:
              credentials:
                - private-key-location: classpath:saml/sp-encryption.key
                  certificate-location:  classpath:saml/sp-encryption.crt
            acs:
              location: "{baseUrl}/login/saml2/sso/{registrationId}"

          azure-ad:
            entity-id: https://my-app.example.com/saml2/sp/azure
            asserting-party:
              metadata-uri: https://login.microsoftonline.com/${AZURE_TENANT_ID}/federationmetadata/2007-06/federationmetadata.xml
            signing:
              credentials:
                - private-key-location: classpath:saml/sp-signing.key
                  certificate-location:  classpath:saml/sp-signing.crt
```

> [!tip]
> Use `asserting-party.metadata-uri` whenever possible — Spring fetches and refreshes the IdP metadata automatically, including certificate rotation. Hard-coding IdP certificates leads to outages when IdPs rotate their signing certs.

### `SecurityFilterChain` — SAML SP config

```java
@Configuration
@EnableMethodSecurity
@RequiredArgsConstructor
public class SamlSecurityConfig {

    private final CustomSamlUserDetailsService samlUserDetailsService;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/", "/login", "/error",
                    "/saml2/**", "/actuator/health").permitAll()
                .anyRequest().authenticated()
            )
            .saml2Login(saml2 -> saml2
                .loginPage("/login")
                .userDetailsService(samlUserDetailsService)
                .successHandler(samlAuthenticationSuccessHandler())
                .failureHandler(samlAuthenticationFailureHandler())
            )
            .saml2Logout(saml2Logout -> saml2Logout
                .logoutUrl("/logout")
                .logoutRequest(req -> req
                    .logoutRequestResolver(samlLogoutRequestResolver()))
                .logoutResponse(res -> res
                    .logoutResponseResolver(samlLogoutResponseResolver()))
            );

        return http.build();
    }
}
```

### `Saml2AuthenticatedPrincipal` to Spring authorities

```java
@Service
@RequiredArgsConstructor
public class CustomSamlUserDetailsService
        implements Saml2UserDetailsService {

    private final UserRepository userRepo;

    @Override
    @Transactional
    public Saml2AuthenticatedPrincipal loadUserBySaml2AuthenticationToken(
            Saml2AuthenticationToken token) {

        Saml2AuthenticatedPrincipal principal =
            (Saml2AuthenticatedPrincipal) token.getPrincipal();

        String nameId    = principal.getName();      // NameID
        String email     = getAttribute(principal, "email",
                               "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress");
        String firstName = getAttribute(principal, "firstName",
                               "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname");
        List<String> groups = principal.getAttribute("groups");

        // JIT provisioning
        User user = userRepo.findBySamlNameId(nameId)
            .orElseGet(() -> createUserFromSaml(nameId, email, firstName, groups));

        // Update attributes from IdP on each login
        syncUserAttributes(user, email, firstName, groups);

        List<GrantedAuthority> authorities = mapGroupsToAuthorities(user, groups);

        return new DefaultSaml2AuthenticatedPrincipal(nameId, Map.of(
            "email",      List.of(email),
            "authorities", authorities.stream()
                               .map(GrantedAuthority::getAuthority)
                               .toList()
        ), authorities);
    }

    private String getAttribute(Saml2AuthenticatedPrincipal principal,
                                 String... names) {
        for (String name : names) {
            List<String> values = principal.getAttribute(name);
            if (values != null && !values.isEmpty()) return values.get(0);
        }
        return null;
    }

    private User createUserFromSaml(String nameId, String email,
                                     String firstName, List<String> groups) {
        // JIT provisioning — create local user on first SSO login
        User user = new User();
        user.setSamlNameId(nameId);
        user.setEmail(email);
        user.setFirstName(firstName);
        user.setRoles(defaultRolesFor(groups));
        return userRepo.save(user);
    }

    private List<GrantedAuthority> mapGroupsToAuthorities(User user, List<String> idpGroups) {
        List<GrantedAuthority> authorities = new ArrayList<>();
        // Local DB roles always win
        user.getRoles().stream()
            .map(r -> new SimpleGrantedAuthority(r.getName()))
            .forEach(authorities::add);

        // IdP group → role mapping
        if (idpGroups != null) {
            idpGroups.stream()
                .filter(g -> g.startsWith("myapp-"))
                .map(g -> new SimpleGrantedAuthority("ROLE_" + g.replace("myapp-", "").toUpperCase()))
                .forEach(authorities::add);
        }
        return authorities;
    }
}
```

### SP metadata endpoint

Spring auto-generates the SP metadata XML:

```
GET /saml2/service-provider-metadata/{registrationId}
```

Give this URL to your IdP admin (Okta: App settings > SAML Setup > "View Setup Instructions"; Azure AD: Enterprise App > Single sign-on > Upload metadata file).

---

## Certificate rotation playbook

> [!danger]
> Certificate rotation in SAML is the #1 outage cause. Always do this in two phases with an overlap window.

**Phase 1 — Add the new certificate (both sides)**
1. Generate new key pair (`openssl req -newkey rsa:2048 ...`)
2. Add the new credential to your SP config (keep the old one too — Spring supports multiple):
   ```yaml
   signing:
     credentials:
       - private-key-location: classpath:saml/sp-signing-old.key   # old
         certificate-location:  classpath:saml/sp-signing-old.crt
       - private-key-location: classpath:saml/sp-signing-new.key   # new
         certificate-location:  classpath:saml/sp-signing-new.crt
   ```
3. Re-deploy. Your updated SP metadata XML now contains *both* certificates.
4. Give the IdP admin the updated metadata URL — they refresh it and now trust both certs.
5. **Wait at least 24 hours.** All sessions using the old cert must expire.

**Phase 2 — Remove the old certificate**
1. Remove the old credential from `application.yml`
2. Re-deploy.
3. Verify logins still work.
4. Revoke/archive the old private key.

> [!tip]
> Schedule certificate rotation with 6-month notice. TLS and SAML certs have a way of expiring at 3 AM on a Saturday.

---

## Common gotchas

### Clock skew

SAML assertions have `NotBefore` and `NotOnOrAfter` attributes. Default tolerance in Spring Security is 60 seconds.

```java
// Increase clock skew tolerance if your IdP or server has clock drift
@Bean
public OpenSaml4AuthenticationProvider authProvider(
        CustomSamlUserDetailsService userDetailsService) {

    var provider = new OpenSaml4AuthenticationProvider();

    // Custom response validator with 5-minute skew allowance
    provider.setResponseValidator(
        OpenSaml4AuthenticationProvider.createDefaultResponseValidator()
    );
    // Override the assertion validator:
    provider.setAssertionValidator(assertion ->
        OpenSaml4AuthenticationProvider.createDefaultAssertionValidatorWithParameters(
            params -> params.add(SAML2AssertionValidationParameters.CLOCK_SKEW,
                Duration.ofMinutes(5))
        ).convert(assertion)
    );

    provider.setResponseAuthenticationConverter(
        responseToken -> {
            Saml2Authentication auth = OpenSaml4AuthenticationProvider
                .createDefaultResponseAuthenticationConverter()
                .convert(responseToken);
            // Load user details and set authorities
            return auth;
        }
    );

    return provider;
}
```

### NameID format mismatch

Different IdPs use different NameID formats. Azure AD defaults to `urn:oasis:names:tc:SAML:2.0:nameid-format:persistent`; many apps expect email format.

```yaml
# Force a specific NameID format in the AuthnRequest
spring.security.saml2.relyingparty.registration.azure-ad:
  asserting-party:
    single-sign-on:
      sign-request: true
```

Configure the IdP to send the format your app expects, or — better — accept whatever format the IdP sends and store the `nameID` value as an opaque identifier (which it is).

### Audience restriction

The SAML assertion's `<AudienceRestriction>` must contain your SP's entity ID exactly. A single trailing slash mismatch (`https://app.example.com` vs `https://app.example.com/`) causes validation failure.

```
Caused by: org.opensaml.saml.saml2.assertion.SAML20AssertionValidationException:
  Audience restriction is not met
```

Verify your `entity-id` in `application.yml` matches exactly what you registered with the IdP.

### ADFS — the ancient IdP

Active Directory Federation Services (ADFS) is still widely deployed in enterprise on-premises environments. Key differences from modern IdPs:

- Claims use long URIs: `http://schemas.microsoft.com/ws/2008/06/identity/claims/role`
- `NameID` format is often `windows account name` — not email
- Attribute names need explicit mapping rules configured in ADFS (Claim Rules)
- No OIDC discovery — everything is hardcoded via metadata XML
- Signing algorithms may default to SHA-1 (insecure) — configure ADFS to use SHA-256

```java
// Map the ugly ADFS attribute URIs to readable names
private static final Map<String, String> ADFS_ATTR_MAP = Map.of(
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress", "email",
    "http://schemas.microsoft.com/ws/2008/06/identity/claims/role",       "role",
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname",    "firstName"
);
```

---

## Express/TS comparison

```typescript
// @node-saml/passport-saml
import { Strategy as SamlStrategy } from '@node-saml/passport-saml';

passport.use('saml', new SamlStrategy({
  entryPoint:   process.env.IDP_SSO_URL,
  issuer:       'https://my-app.example.com',
  callbackUrl:  'https://my-app.example.com/auth/saml/callback',
  cert:         process.env.IDP_CERT,      // IdP signing cert
  privateCert:  process.env.SP_PRIVATE_KEY,
  signatureAlgorithm: 'sha256',
  identifierFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
}, (profile, done) => {
  // JIT provisioning
  User.findOrCreate({ where: { samlId: profile.nameID } }, done);
}));

router.get('/auth/saml/login',
  passport.authenticate('saml', { session: false }));

router.post('/auth/saml/callback',
  passport.authenticate('saml', { failureRedirect: '/login' }),
  (req, res) => res.redirect('/dashboard'));

// SP metadata
router.get('/auth/saml/metadata', (req, res) => {
  res.type('application/xml');
  res.send(strategy.generateServiceProviderMetadata(null, process.env.SP_CERT));
});
```

Spring's equivalent: less code in routes, more in `application.yml`. The metadata endpoint is automatic. The JIT provisioning lives in `Saml2UserDetailsService`. Same concepts, different homes.

---

## Gotchas

> [!danger]
> **Never disable signature verification in production.** `OpenSaml4AuthenticationProvider` validates signatures by default. You may be tempted to disable it to make a test environment work — don't. A SAML injection attack via unsigned assertions would give an attacker arbitrary identity.

> [!warning]
> **The SAMLResponse is Base64-encoded, then URL-encoded when delivered via HTTP-Redirect binding.** When debugging, decode in order: URL-decode → Base64-decode → inflate (if compressed) → read XML. Tools: SAML-tracer browser extension, or the IdP's built-in debug view.

> [!warning]
> **Session fixation after SAML login.** Spring Security handles this for standard form login but SAML login also needs `SessionFixationProtectionStrategy`. Verify `session-management.session-fixation.migrate-session` is active (default in Spring Security 6).

---

## Production checklist

- [ ] SP key pair generated with RSA 2048+ / EC 256+
- [ ] Private key stored in Vault/Secrets Manager (not in classpath jar)
- [ ] `metadata-uri` used for IdP metadata (not hardcoded cert)
- [ ] Certificate rotation playbook documented and tested
- [ ] Clock synchronization (NTP) verified on all app instances
- [ ] NameID format agreed with IdP and tested
- [ ] Audience restriction entity ID matches exactly what's registered with IdP
- [ ] Clock skew tolerance configured (≥ 5 minutes for enterprise ADFS)
- [ ] JIT provisioning tested: new user in IdP → automatic local user creation
- [ ] SLO scope documented (front-channel SLO is optional and often skipped)
- [ ] Integration tested with SAML-tracer or IdP's built-in debug
- [ ] `enabled` flag in Spring profile to switch SAML on/off without redeploy

---

## Related

- [[12-SSO-Overview-SAML-vs-OIDC]]
- [[13-Spring-Security-OIDC-Login]]
- [[03-Authentication-Methods]]
- [[01-Spring-Security-Concepts]]
- [[02-Configuration-and-SecurityFilterChain]]
- [[17-Secrets-Management]]
- [[18-Cryptographic-Key-Management]]
- [[16-Audit-Logging-and-Compliance]]
