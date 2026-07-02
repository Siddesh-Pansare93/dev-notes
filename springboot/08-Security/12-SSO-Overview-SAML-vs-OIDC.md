# SSO Overview — SAML vs OIDC

> [!info] Express/TS dev ke liye
> Tumne `passport-google-oauth20` aur `passport-openidconnect` use kiya hi hoga. OIDC wahi hai jo yeh packages implement karte hain. SAML uska enterprise wala cousin hai — XML se bhara hua, certificate-based, aur jab bhi tum Fortune 500 companies ko bechne jaoge, unavoidable ban jaata hai. Yeh note concepts cover karta hai taaki enterprise IdP team ke saath din pehle hi informed conversation kar sako.

## Concept / mental model

### Federation ke characters — kaun kya hai?

SSO samajhne se pehle in players ko jaan lo, warna documentation padhte hue confuse ho jaoge:

| Term | Matlab | Example |
|---|---|---|
| **IdP** (Identity Provider) | Identity assertions issue karta hai. Jaanta hai tum kaun ho. | Okta, Azure AD, Google Workspace, ADFS |
| **SP** (Service Provider) — SAML term | IdP se assertions consume karta hai. Yeh tumhara app hai. | Tumhara Spring Boot service |
| **RP** (Relying Party) — OIDC term | Same role jo SP ka hai, bas OIDC/OAuth2 ki terminology mein | Tumhara Spring Boot service |
| **Assertion** (SAML) | Signed XML document jisme identity claims hote hain | `<saml:Assertion>` |
| **ID Token** (OIDC) | Signed JWT jisme identity claims hote hain | `eyJ...` |
| **Claim** | User ke baare mein ek key-value pair | `email`, `groups`, `department` |
| **Metadata** (SAML) | XML document jo IdP ya SP describe karta hai (endpoints, certs) | `metadata.xml` |
| **JWKS** (OIDC) | JSON Web Key Set — ID token verify karne ke liye public keys | `/.well-known/jwks.json` |

Basically SP aur RP same role play karte hain — bas naming convention alag hai kyunki dono protocols alag standards bodies se aaye hain.

### SSO flow — 4 steps mein (dono protocols ke liye same)

Socho tum Zomato pe login karte ho apne Google account se. Kya hota hai backstage?

1. User tumhare app pe bina session ke aata hai → app use IdP pe redirect karta hai (jaise "Login with Google" click karna)
2. IdP user ko authenticate karta hai (password, MFA, waghera)
3. IdP tumhare app ko ek assertion/token bhejta hai wapas
4. Tumhara app us assertion/token ko validate karta hai, session banata hai, aur original URL pe redirect kar deta hai

Difference sirf itna hai ki assertion *kaise* transport hota hai aur *kis format* mein aata hai.

---

## SAML 2.0 vs OIDC — comparison table

Yeh table baar-baar refer karoge, so bookmark kar lo:

| Dimension | SAML 2.0 | OIDC |
|---|---|---|
| **Format** | XML (`<saml:Assertion>`) | JSON (JWT) |
| **Transport** | HTTP POST (browser form) ya HTTP Redirect (URL-encoded) | HTTP Redirect (code) + HTTPS back-channel (token fetch) |
| **Initial flow mein browser chahiye?** | Haan — browser form ko SP pe POST karta hai | Haan — browser code ko RP pe redirect karta hai; phir RP back-channel call karta hai |
| **Mobile/SPA friendly?** | Kharab — form POST flow mobile apps mein natively nahi chalta | Haan — PKCE extension isi ke liye design hua hai |
| **Session management** | SAML sessions + SLO (complex) | OAuth2 sessions, token revocation |
| **Standard ki age** | 2005 (aur dikhta bhi hai) | 2014, regularly update hota rehta hai |
| **Config complexity** | High — metadata XML exchange, certs | Moderate — discovery URL, client ID/secret |
| **Tooling ecosystem** | Enterprise-heavy | Bada, modern |
| **Spec complexity** | Bahut high | Moderate (OAuth2 ke upar bana hai) |

### Kab tumhe SAML implement karna hi padega

Kyun zaruri hai yeh jaanna? Kyunki bade clients tumse yeh maang sakte hain, aur tab decide karna late ho jaata hai.

1. **Enterprise B2B customers** — badi enterprises ke paas already Okta/Azure AD/ADFS SAML ke liye configured hota hai, aur woh sirf tumhare liye reconfigure nahi karenge.
2. **Healthcare/Government** — procurement requirements mein aksar SAML mandate hota hai.
3. **Federated university login** — Shibboleth IdPs SAML hi bolte hain.

Agar in mein se koi bhi tumhare product pe apply hota hai, tum *zaroor* SAML implement karoge kabhi na kabhi. Din pehle se ek feature flag bana lo: `sso.provider = oidc | saml`.

### Kab OIDC use kar sakte ho (jab option ho, ise choose karo)

- SaaS product jo tech-forward companies ko target karta hai
- Consumer apps (Google, Apple, GitHub login — bilkul "Continue with Google" jaisa jo tumne Swiggy pe dekha hoga)
- Internal company SSO with a modern IdP (Keycloak, Auth0, Okta OIDC endpoint)
- Mobile aur SPA applications

---

## Trust establish kaise hota hai?

### SAML: metadata XML exchange

SP ek metadata XML file generate karta hai aur IdP ke saath share karta hai (email se, URL se, ya IdP admin portal se). IdP bhi wahi karta hai. Har party doosre ka signing certificate metadata se pin kar leti hai.

```
Tumhara app (SP) → Okta/Azure AD admin portal pe upload karta hai → IdP SP ko register karta hai
IdP → metadata URL provide karta hai → Tumhara app download karke trust karta hai
```

> [!warning]
> **SAML mein certificate rotation dard-bhara hota hai.** Naya certificate dono taraf add hona chahiye purane ko remove karne se pehle. 2-week overlap window plan karo aur exact steps document karo. Playbook ke liye [[14-SAML-with-Spring-Security]] dekho.

### OIDC: discovery endpoint

IdP ek well-known discovery document publish karta hai — yeh ek tarah ka "yahan sab kuch mil jayega" JSON hota hai:

```
GET https://accounts.google.com/.well-known/openid-configuration

{
  "issuer": "https://accounts.google.com",
  "authorization_endpoint": "https://accounts.google.com/o/oauth2/v2/auth",
  "token_endpoint": "https://oauth2.googleapis.com/token",
  "jwks_uri": "https://www.googleapis.com/oauth2/v3/certs",
  ...
}
```

Tumhara app isse startup pe ek baar fetch karta hai aur cache kar leta hai. Key rotation `kid` (Key ID) se handle hota hai JWT header mein — jab bhi tumhara app koi unknown `kid` dekhta hai, naya JWKS fetch kar leta hai. Koi manual intervention nahi chahiye. Isliye OIDC ka config experience SAML se kaafi zyada smooth feel hota hai.

---

## PKCE — public clients ke liye

**Kya hota hai?** PKCE (Proof Key for Code Exchange, RFC 7636) authorization code interception ko rokta hai un mobile/SPA apps mein jo client secret store nahi kar sakte (kyunki frontend code decompile ho sakta hai — secret chhupa nahi rahega).

```
1. App code_verifier generate karta hai (random 32-64 bytes)
2. App code_challenge compute karta hai = BASE64URL(SHA256(code_verifier))
3. Auth request mein code_challenge + code_challenge_method=S256 include hota hai
4. Token request mein code_verifier bheja jaata hai — IdP verify karta hai SHA256(verifier) == challenge
```

Socho jaise tum ek locked box (challenge) bhejte ho pehle, aur baad mein chaabi (verifier) dikhate ho — agar chaabi box ko unlock karti hai, tabhi trust hoga.

Spring Security PKCE ko automatically handle karta hai public clients ke liye jab properly configure kiya ho (dekho [[13-Spring-Security-OIDC-Login]]).

---

## Single Logout (SLO) — yeh itna hard kyun hai?

SAML SLO woh mechanism hai jo IdP *aur* saare SPs se ek saath logout kar deta hai. Sunne mein useful lagta hai. Practically:

1. IdP har us SP ko logout request bhejta hai jiska user ke liye session hai.
2. Har SP ka apna SLO endpoint hona chahiye, request ko synchronously process kare, aur respond kare.
3. Agar koi ek bhi SP down ya slow hai, poora SLO hang ho jaata hai.
4. Browser-based SLO redirects ki chain maangta hai — mobile/SPA mein toot jaata hai.

**Honest reality**: zyada enterprises SLO implement toh karte hain, lekin users ko farak nahi padta kyunki unke session cookies anyway expire ho jaate hain. Bahut saari teams front-channel SLO skip karke sirf yeh karti hain:
- Short session lifetimes (1 hour) — jaise UPI apps mein bhi session jaldi expire hota hai
- Back-channel token revocation (OIDC) ya RP-initiated logout
- Ek "logout" button jo sirf local session clear karta hai

OIDC ka RP-Initiated Logout (OIDC Session Management, OIDC Back-Channel Logout) SAML SLO se zyada reliable hai, par phir bhi complex hai. Spring implementation ke liye [[13-Spring-Security-OIDC-Login]] dekho.

> [!warning]
> Apni product documentation mein yeh promise mat karo ki "SSO logout se sab jagah instantly logout ho jaata hai" jab tak tumne end-to-end test na kiya ho apne saare SP integrations ke saath. Yeh perfectly kaam karna rare hai.

---

## Express/TS comparison

```typescript
// passport-saml
import { Strategy as SamlStrategy } from '@node-saml/passport-saml';

passport.use(new SamlStrategy({
  entryPoint: 'https://idp.example.com/sso/saml',
  issuer:     'https://yourapp.com',
  cert:       process.env.IDP_CERT,
  callbackUrl: 'https://yourapp.com/auth/saml/callback',
}, (profile, done) => {
  // profile.nameID, profile.email, profile['http://...groups']
  User.findOrCreate({ samlId: profile.nameID }, done);
}));

// passport-openidconnect
import { Strategy as OidcStrategy } from 'passport-openidconnect';

passport.use(new OidcStrategy({
  issuer:       'https://accounts.google.com',
  clientID:     process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL:  'https://yourapp.com/auth/oidc/callback',
  scope:        ['openid', 'profile', 'email'],
}, (issuer, profile, done) => {
  User.findOrCreate({ googleId: profile.id }, done);
}));
```

Spring ke equivalents: `spring-security-saml2-service-provider` (dekho [[14-SAML-with-Spring-Security]]) aur `spring-boot-starter-oauth2-client` (dekho [[13-Spring-Security-OIDC-Login]]). Conceptual mapping 1:1 hai; Spring ka implementation zyada configuration-heavy hai, lekin security filter chain ke baaki hisson ke saath deeper integration deta hai.

---

## Gotchas — yahan log fasenge

> [!danger]
> **SAML assertions ko kabhi bhi signature AND audience restriction check kiye bina validate mat karo.** Tumhare IdP se aaya ek signed assertion kisi malicious SP dwara replay kiya ja sakta hai kisi doosre SP pe, agar audience restriction check skip ho jaaye. Spring Security ka SAML implementation yeh correctly karta hai — lekin sirf tab jab tum ise bypass na karo.

> [!warning]
> **SAML mein clock skew.** SAML assertions mein `NotBefore` aur `NotOnOrAfter` timestamps hote hain. Agar tumhare app server ka clock IdP ke clock se 2–5 minutes se zyada off hai, assertion validation fail ho jaayega. Apne servers pe NTP run karo. Spring Security ka SAML support `clockSkew` tolerance configure karne deta hai.

> [!warning]
> **OIDC ke `nonce` aur `state` parameters** security ke liye critical hain. `state` parameter callback endpoint pe CSRF rokta hai; `nonce` ID token replay rokta hai. Spring Security dono ko automatically handle karta hai. OAuth2/OIDC flows manually implement mat karo jab tak in cheezon ko deeply samajh na lo.

> [!tip]
> SAML debug karte waqt, browser network inspector use karo `/saml2/authenticate/{id}` endpoint pe POST capture karne ke liye, aur SAMLResponse ko Base64-decode karo. `echo 'BASE64DATA' | base64 -d | xmllint --format -` tumhe readable XML de dega. Assertion validation failures diagnose karne ke liye essential hai.

---

## Production checklist

- [ ] Decision documented: OIDC vs SAML (rationale ke saath — bina use case ke dono implement mat karo)
- [ ] Trust chain documented: kaunse certificates use ho rahe hain, rotation schedule
- [ ] SLO scope documented aur customer ke saath agree kiya hua: "sirf local logout" bhi ek valid choice hai
- [ ] IdP metadata/discovery URL config mein version-pinned hai (`latest` wildcards nahi)
- [ ] Clock synchronization (NTP) saare app servers pe verify kiya hua
- [ ] Certificate rotation runbook likha aur test kiya hua pehli rotation se pehle
- [ ] Fallback authentication path define kiya hua: jab IdP down ho jaaye toh kya hoga?

---

## Related

- [[13-Spring-Security-OIDC-Login]]
- [[14-SAML-with-Spring-Security]]
- [[08-OAuth2-Resource-Server]]
- [[03-Authentication-Methods]]
- [[01-Spring-Security-Concepts]]
- [[15-Multi-Tenancy-Security]]
- [[17-Secrets-Management]]
