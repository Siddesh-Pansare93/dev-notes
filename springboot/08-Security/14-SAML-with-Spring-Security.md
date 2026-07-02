# SAML with Spring Security

> [!info] Express/TS wale dev ke liye
> Yeh Spring ka `@node-saml/passport-saml` wala equivalent hai. SAML thoda XML-heavy hai aur config verbose lagega, lekin concept wahi hai jo tumne passport-saml mein dekha hoga: apni app ko Service Provider (SP) bana ke register karo, IdP (Identity Provider — jaise Okta, Azure AD) ka metadata download karo, aur `SAMLResponse` POST request handle karo apne Assertion Consumer Service (ACS) URL pe.

## Concept / mental model

Socho tumhari company ke paas ek "master gate" hai — Okta ya Azure AD — jahan employee apna ek hi password daalta hai aur phir company ki saari internal apps (HR portal, expense tool, Jira, tumhari Spring Boot app) mein bina dobara login kiye ghus jaata hai. Yeh hi SSO (Single Sign-On) hai, aur SAML uska ek purana lekin abhi bhi enterprise mein sabse zyada use hone wala protocol hai.

**Kya ho raha hai actually?** Tumhari app khud kisi ka password check nahi karti — woh sirf IdP (Identity Provider) pe bharosa karti hai. IdP bolta hai "haan bhai, yeh user genuine hai, iska email yeh hai, iske groups yeh hain" — aur yeh sab ek signed XML document (SAML Assertion) ke through bheja jaata hai. Tumhari app (Service Provider / SP) sirf us signature ko verify karti hai aur user ko andar le leti hai.

SAML web SSO flow (SP-initiated — matlab user pehle tumhari app pe aata hai):

```
1. User → GET /saml2/authenticate/{registrationId}
   Spring Security dekhta hai ki koi session nahi hai → IdP ke SSO URL pe redirect kar deta hai

2. IdP user ko authenticate karta hai (password, MFA, smart card...)

3. IdP → POST {your-app}/login/saml2/sso/{registrationId}
   Body mein: SAMLResponse (Base64-encoded signed XML)

4. Spring verify karta hai: signature, conditions (audience, timing), attributes

5. Spring Authentication banata hai → tumhara CustomSamlUserDetailsService chalta hai
   → session create hota hai → user wapas original URL pe redirect ho jaata hai
```

> [!tip] Kyun zaruri hai?
> Enterprise customers (banks, healthcare, government) almost hamesha SAML SSO maangte hain — unka IT department apne employees ke access ko central IdP se control karna chahta hai. Agar tumhari SaaS app enterprise customers bechna chahti hai, SAML support ek "must-have" checkbox ban jaata hai, chahe tumhe personally OIDC zyada modern lage.

---

## Dependencies

```xml
<!-- pom.xml -->
<dependency>
    <groupId>org.springframework.security</groupId>
    <artifactId>spring-security-saml2-service-provider</artifactId>
</dependency>
<!-- OpenSAML transitively aa jaata hai; version pin karna pad sakta hai -->
```

> [!warning]
> `spring-security-saml2-service-provider` `spring-security-*` package mein hai, `spring-boot-starter-*` mein nahi. Iska matlab auto-configuration nahi milega — tumhe `SecurityFilterChain` bean manually likhna padega. Jaise Express mein tum khud middleware wire karte ho, waise hi yahan bhi manual setup hai.

---

## Code examples

### SP metadata aur keys generate karna

Tumhari SP ko ek RSA key pair chahiye: private key outgoing requests (AuthnRequest) ko sign karti hai, aur certificate IdP ke saath share hota hai (tumhare metadata mein). Isko socho jaise tumhare paas ek "signature stamp" hai — jab bhi tum IdP ko koi request bhejte ho, us stamp se sign karte ho taaki IdP pehchan sake ki request genuinely tumhari app se aayi hai, kisi imposter se nahi.

```bash
# SP signing ke liye self-signed certificate generate karo
openssl req -newkey rsa:2048 -nodes \
  -keyout sp-signing.key \
  -x509 -days 3650 \
  -out sp-signing.crt \
  -subj "/CN=my-app-sp"
```

Private key ko Vault/Secrets Manager mein rakho, kabhi bhi classpath jar mein commit mat karo. Dekho [[17-Secrets-Management]].

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
> Jahan bhi ho sake, `asserting-party.metadata-uri` use karo, hardcoded certificate nahi. Isse Spring khud IdP ka metadata fetch aur refresh karta rehta hai — certificate rotation bhi automatically handle ho jaata hai. Agar tum IdP ka certificate hardcode karoge, jab IdP apna cert rotate karega (aksar bina zyada warning ke), tumhara login raat 2 baje production mein fail ho jaayega.

### `SecurityFilterChain` — SAML SP config

Kya ho raha hai yahan? Yeh Spring ko batata hai ki kaunse routes public hain, aur SAML login/logout kaise handle karna hai.

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

### `Saml2AuthenticatedPrincipal` ko Spring authorities mein convert karna

Yahan asli maza hai. IdP tumhe user ka NameID aur kuch attributes (email, naam, groups) bhejta hai — lekin tumhari app ke andar us user ka apna local record (roles, permissions, preferences) hona chahiye. Yeh method exactly Zomato ke "Login with Google" jaisa hai: pehli baar jab user Google se login karta hai, Zomato apne DB mein ek naya user record bana leta hai (JIT provisioning), aur agli baar sirf existing record match kar leta hai.

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

        // JIT provisioning — pehli baar login pe local user bana do
        User user = userRepo.findBySamlNameId(nameId)
            .orElseGet(() -> createUserFromSaml(nameId, email, firstName, groups));

        // Har login pe IdP se attributes sync kar lo (naam/email change ho sakta hai)
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
        // JIT provisioning — SSO se pehli baar aane pe local user create karo
        User user = new User();
        user.setSamlNameId(nameId);
        user.setEmail(email);
        user.setFirstName(firstName);
        user.setRoles(defaultRolesFor(groups));
        return userRepo.save(user);
    }

    private List<GrantedAuthority> mapGroupsToAuthorities(User user, List<String> idpGroups) {
        List<GrantedAuthority> authorities = new ArrayList<>();
        // Local DB roles hamesha priority pe rahenge
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

> [!info] Kyun dono jagah roles maintain karte hain?
> IdP ke groups (jaise `myapp-admin`) generic hote hain, lekin tumhari app ke andar fine-grained permissions ho sakti hain jo sirf tumhare DB mein banti hain. Isliye best practice hai: IdP se coarse-grained group aao, aur local DB mein us par apni detailed role mapping karo — bilkul CRED jaise apni internal "credit score" IdP se mile bank data par calculate karta hai, IdP ka data seedha use nahi karta.

### SP metadata endpoint

Spring khud SP metadata XML generate kar deta hai, tumhe kuch likhna nahi padta:

```
GET /saml2/service-provider-metadata/{registrationId}
```

Yeh URL apne IdP admin ko de do (Okta: App settings > SAML Setup > "View Setup Instructions"; Azure AD: Enterprise App > Single sign-on > Upload metadata file). Woh is XML ko import karke IdP side pe tumhari app ko trust karna shuru kar dega.

---

## Certificate rotation playbook

> [!danger]
> SAML mein certificate rotation sabse bada outage cause hai. Ise hamesha do phase mein karo, beech mein ek overlap window rakh ke — jaise bank ka debit card renew karte waqt purana card kuch din tak chalta rehta hai jab tak naya activate na ho jaaye.

**Phase 1 — Naya certificate add karo (dono side)**
1. Naya key pair generate karo (`openssl req -newkey rsa:2048 ...`)
2. Naya credential apni SP config mein add karo, purana bhi rakhe rehne do — Spring multiple credentials support karta hai:
   ```yaml
   signing:
     credentials:
       - private-key-location: classpath:saml/sp-signing-old.key   # purana
         certificate-location:  classpath:saml/sp-signing-old.crt
       - private-key-location: classpath:saml/sp-signing-new.key   # naya
         certificate-location:  classpath:saml/sp-signing-new.crt
   ```
3. Re-deploy karo. Ab tumhari updated SP metadata XML mein *dono* certificates honge.
4. IdP admin ko updated metadata URL do — woh refresh karke dono certs ko trust karna shuru kar dega.
5. **Kam se kam 24 ghante wait karo.** Purane cert waale saare sessions expire ho jaane chahiye.

**Phase 2 — Purana certificate hatao**
1. `application.yml` se purana credential remove karo
2. Re-deploy karo.
3. Verify karo ki logins abhi bhi kaam kar rahe hain.
4. Purani private key ko revoke/archive kar do.

> [!tip]
> Certificate rotation ko 6 mahine pehle se schedule karo. TLS aur SAML certs ka ek ajeeb tarika hota hai — hamesha Saturday raat 3 baje expire hote hain.

---

## Common gotchas

### Clock skew

SAML assertions mein `NotBefore` aur `NotOnOrAfter` attributes hote hain. Spring Security ka default tolerance sirf 60 seconds hai — matlab agar tumhare server ka clock IdP se 61 second bhi off hai, login fail ho jaayega. Yeh production mein bade enterprise setups (jahan NTP thoda drift ho jaata hai) ek common headache hai.

```java
// IdP ya server ke clock drift ke liye clock skew tolerance badhao
@Bean
public OpenSaml4AuthenticationProvider authProvider(
        CustomSamlUserDetailsService userDetailsService) {

    var provider = new OpenSaml4AuthenticationProvider();

    // 5-minute skew allowance ke saath custom response validator
    provider.setResponseValidator(
        OpenSaml4AuthenticationProvider.createDefaultResponseValidator()
    );
    // Assertion validator override karo:
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
            // User details load karo aur authorities set karo
            return auth;
        }
    );

    return provider;
}
```

### NameID format mismatch

Alag-alag IdP alag NameID format use karte hain. Azure AD default mein `urn:oasis:names:tc:SAML:2.0:nameid-format:persistent` bhejta hai; bahut si apps email format expect karti hain. Yeh bilkul aisa hai jaise ek delivery app expect kare pincode format `NNNNNN` mein aaye, lekin koi supplier `NNN NNN` bhej de — mismatch ki wajah se pura flow fail ho jaata hai.

```yaml
# AuthnRequest mein specific NameID format force karo
spring.security.saml2.relyingparty.registration.azure-ad:
  asserting-party:
    single-sign-on:
      sign-request: true
```

IdP ko configure karo ki woh woh format bheje jo tumhari app expect karti hai, ya — behtar approach — jo bhi format IdP bheje usko accept karo aur `nameID` ko ek opaque identifier ki tarah store karo (jo woh actually hai bhi).

### Audience restriction

SAML assertion ka `<AudienceRestriction>` bilkul exactly tumhari SP ki entity ID contain karna chahiye. Ek trailing slash ka farak bhi (`https://app.example.com` vs `https://app.example.com/`) validation fail kar dega — chhoti si cheez, lekin production mein ghanton debug karwa deti hai.

```
Caused by: org.opensaml.saml.saml2.assertion.SAML20AssertionValidationException:
  Audience restriction is not met
```

Apni `entity-id` `application.yml` mein check karo — woh bilkul waisi hi honi chahiye jaisi IdP ke saath register ki thi.

### ADFS — purana zamana wala IdP

Active Directory Federation Services (ADFS) aaj bhi bahut si enterprise on-premises companies mein chal raha hai — socho isko IRCTC ki purani website jaisa, kaam karta hai lekin modern standards follow nahi karta. Modern IdPs se key differences:

- Claims lambe URIs use karte hain: `http://schemas.microsoft.com/ws/2008/06/identity/claims/role`
- `NameID` format aksar `windows account name` hota hai — email nahi
- Attribute names ke liye ADFS mein explicit mapping rules (Claim Rules) configure karni padti hain
- Koi OIDC discovery nahi hai — sab kuch metadata XML se hardcoded hota hai
- Signing algorithms default mein SHA-1 (insecure) ho sakte hain — ADFS ko SHA-256 use karne ke liye configure karo

```java
// ADFS ke ugly attribute URIs ko readable naam mein map karo
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

Spring ka equivalent: routes mein kam code, `application.yml` mein zyada. Metadata endpoint automatic hai. JIT provisioning `Saml2UserDetailsService` mein rehta hai. Concept same hai, bas ghar alag hai.

---

## Gotchas

> [!danger]
> **Production mein signature verification kabhi disable mat karo.** `OpenSaml4AuthenticationProvider` default mein signatures validate karta hai. Test environment ko jaldi chalane ke liye disable karne ka mann karega — mat karo. Unsigned assertions ke through SAML injection attack se attacker ko koi bhi arbitrary identity mil sakti hai — matlab woh khud ko CEO bata ke login kar sakta hai.

> [!warning]
> **SAMLResponse pehle Base64-encoded hota hai, phir HTTP-Redirect binding ke through bhejte waqt URL-encoded bhi ho jaata hai.** Debug karte waqt is order mein decode karo: URL-decode → Base64-decode → inflate (agar compressed hai) → XML padho. Tools: SAML-tracer browser extension, ya IdP ka built-in debug view.

> [!warning]
> **SAML login ke baad session fixation ka risk.** Spring Security standard form login ke liye ise handle kar deta hai, lekin SAML login ke liye bhi `SessionFixationProtectionStrategy` chahiye hoti hai. Verify karo ki `session-management.session-fixation.migrate-session` active hai (Spring Security 6 mein default hai).

---

## Production checklist

- [ ] SP key pair RSA 2048+ / EC 256+ ke saath generate kiya hua hai
- [ ] Private key Vault/Secrets Manager mein stored hai (classpath jar mein nahi)
- [ ] IdP metadata ke liye `metadata-uri` use kiya (hardcoded cert nahi)
- [ ] Certificate rotation playbook documented aur tested hai
- [ ] Saari app instances pe clock synchronization (NTP) verify kiya hai
- [ ] NameID format IdP ke saath agree aur test kiya hua hai
- [ ] Audience restriction entity ID exactly IdP ke saath registered value se match karti hai
- [ ] Clock skew tolerance configured hai (enterprise ADFS ke liye ≥ 5 minutes)
- [ ] JIT provisioning test kiya hua hai: IdP mein naya user → automatic local user creation
- [ ] SLO scope documented hai (front-channel SLO optional hai aur aksar skip kiya jaata hai)
- [ ] SAML-tracer ya IdP ke built-in debug ke saath integration tested hai
- [ ] Spring profile mein `enabled` flag hai taaki bina redeploy ke SAML on/off kiya ja sake

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
