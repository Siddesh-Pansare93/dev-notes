---
tags: [security, production, sso, saml, oidc, federation, identity]
aliases: [SSO, Single Sign-On, SAML vs OIDC, Federation]
stage: advanced
---

# SSO Overview — SAML vs OIDC

> [!info] For the Express/TS dev
> You've used `passport-google-oauth20` and `passport-openidconnect`. OIDC is what those are implementing. SAML is the enterprise cousin — XML-heavy, certificate-based, and unavoidable when selling to Fortune 500 companies. This note covers the concepts so you can have an informed conversation with the enterprise IdP team on day one.

## Concept / mental model

### Federation concepts — the cast of characters

| Term | Meaning | Example |
|---|---|---|
| **IdP** (Identity Provider) | Issues identity assertions. Knows who you are. | Okta, Azure AD, Google Workspace, ADFS |
| **SP** (Service Provider) — SAML term | Consumes assertions from IdP. Your app. | Your Spring Boot service |
| **RP** (Relying Party) — OIDC term | Same role as SP but in OIDC/OAuth2 terminology | Your Spring Boot service |
| **Assertion** (SAML) | Signed XML document containing identity claims | `<saml:Assertion>` |
| **ID Token** (OIDC) | Signed JWT containing identity claims | `eyJ...` |
| **Claim** | A key-value pair about the user | `email`, `groups`, `department` |
| **Metadata** (SAML) | XML document describing an IdP or SP (endpoints, certs) | `metadata.xml` |
| **JWKS** (OIDC) | JSON Web Key Set — public keys for ID token verification | `/.well-known/jwks.json` |

### The SSO flow in 4 steps (both protocols)

1. User hits your app without a session → app redirects to IdP
2. IdP authenticates the user (password, MFA, etc.)
3. IdP sends an assertion/token back to your app
4. Your app validates the assertion/token, creates a session, redirects to original URL

The difference is *how* the assertion is transported and *what format* it takes.

---

## SAML 2.0 vs OIDC comparison

| Dimension | SAML 2.0 | OIDC |
|---|---|---|
| **Format** | XML (`<saml:Assertion>`) | JSON (JWT) |
| **Transport** | HTTP POST (browser form) or HTTP Redirect (URL-encoded) | HTTP Redirect (code) + HTTPS back-channel (token fetch) |
| **Signature** | XML Digital Signature (RSA/DSA) on the Assertion | JWS (RS256, ES256, HS256) on the JWT |
| **Browser required for initial flow?** | Yes — browser posts form to SP | Yes — browser redirects code to RP; then RP makes back-channel call |
| **Mobile/SPA friendly?** | Poor — form POST flow doesn't work natively in mobile apps | Yes — PKCE extension designed for this |
| **Session management** | SAML sessions + SLO (complex) | OAuth2 sessions, token revocation |
| **Standard age** | 2005 (feels it) | 2014, regularly updated |
| **Config complexity** | High — metadata XML exchange, certs | Moderate — discovery URL, client ID/secret |
| **Tooling ecosystem** | Enterprise-heavy | Large, modern |
| **Spec complexity** | Very high | Moderate (built on OAuth2) |

### When you'll be forced into SAML

1. **Enterprise B2B customers** — large enterprises have Okta/Azure AD/ADFS configured for SAML and won't reconfigure just for you.
2. **Healthcare/Government** — SAML is often mandated by procurement requirements.
3. **Federated university login** — Shibboleth IdPs speak SAML.

If any of these apply to your product, you *will* implement SAML eventually. Build a feature flag from day one: `sso.provider = oidc | saml`.

### When you can use OIDC (choose it when you can)

- SaaS product targeting tech-forward companies
- Consumer apps (Google, Apple, GitHub login)
- Internal company SSO with a modern IdP (Keycloak, Auth0, Okta OIDC endpoint)
- Mobile and SPA applications

---

## Trust establishment

### SAML: metadata XML exchange

SP generates a metadata XML file and shares it with the IdP (email, URL, or IdP admin portal). The IdP does the same. Each party pins the other's signing certificate from the metadata.

```
Your app (SP) → uploads to Okta/Azure AD admin portal → IdP registers SP
IdP → provides metadata URL → Your app downloads and trusts it
```

> [!warning]
> **Certificate rotation in SAML is painful.** The new certificate must be added to both sides before the old one is removed. Plan for a 2-week overlap window and document the exact steps. See [[14-SAML-with-Spring-Security]] for the playbook.

### OIDC: discovery endpoint

The IdP publishes a well-known discovery document:

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

Your app fetches this once at startup and caches it. Key rotation is handled via `kid` (Key ID) in the JWT header — your app fetches the new JWKS when it sees an unknown `kid`. No manual intervention required.

---

## PKCE — public clients

PKCE (Proof Key for Code Exchange, RFC 7636) prevents authorization code interception in mobile/SPA apps that can't store a client secret:

```
1. App generates code_verifier (random 32-64 bytes)
2. App computes code_challenge = BASE64URL(SHA256(code_verifier))
3. Auth request includes code_challenge + code_challenge_method=S256
4. Token request includes code_verifier — IdP verifies SHA256(verifier) == challenge
```

Spring Security handles PKCE automatically for public clients when configured properly (see [[13-Spring-Security-OIDC-Login]]).

---

## Single Logout (SLO) — why it's hard

SAML SLO is the mechanism for logging out of the IdP *and* all SPs simultaneously. It sounds useful. In practice:

1. IdP sends a logout request to every SP that has a session for the user.
2. Every SP must have an SLO endpoint, process the request synchronously, and respond.
3. If any SP is down or slow, SLO hangs.
4. Browser-based SLO requires chains of redirects — breaks in mobile/SPA.

**The honest reality**: most enterprises implement SLO but users don't notice because their session cookies expire anyway. Many teams skip front-channel SLO and implement only:
- Short session lifetimes (1 hour)
- Back-channel token revocation (OIDC) or RP-initiated logout
- A "logout" button that clears local session

OIDC's RP-Initiated Logout (OIDC Session Management, OIDC Back-Channel Logout) is more reliable than SAML SLO but still complex. See [[13-Spring-Security-OIDC-Login]] for the Spring implementation.

> [!warning]
> Don't promise "SSO logout logs you out everywhere instantly" in your product documentation unless you've tested it end-to-end with all your SP integrations. It rarely works perfectly.

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

Spring equivalents: `spring-security-saml2-service-provider` (see [[14-SAML-with-Spring-Security]]) and `spring-boot-starter-oauth2-client` (see [[13-Spring-Security-OIDC-Login]]). The conceptual mapping is 1:1; Spring's implementation is more configuration-heavy but has deeper integration with the rest of the security filter chain.

---

## Gotchas

> [!danger]
> **Never validate SAML assertions without checking the signature AND the audience restriction.** A signed assertion from your IdP can be replayed by a malicious SP at another SP if the audience restriction check is skipped. Spring Security's SAML implementation does this correctly — but only if you don't bypass it.

> [!warning]
> **Clock skew in SAML.** SAML assertions have `NotBefore` and `NotOnOrAfter` timestamps. If your app server's clock is > 2–5 minutes off the IdP's clock, assertion validation fails. Run NTP on your servers. Spring Security's SAML support allows configuring a `clockSkew` tolerance.

> [!warning]
> **OIDC `nonce` and `state` parameters** are critical for security. The `state` parameter prevents CSRF on the callback endpoint; the `nonce` prevents ID token replay. Spring Security handles both automatically. Don't implement OAuth2/OIDC flows manually unless you deeply understand these.

> [!tip]
> When debugging SAML, use the browser network inspector to capture the POST to the `/saml2/authenticate/{id}` endpoint and Base64-decode the SAMLResponse. `echo 'BASE64DATA' | base64 -d | xmllint --format -` gives you readable XML. Essential for diagnosing assertion validation failures.

---

## Production checklist

- [ ] Decision documented: OIDC vs SAML (with rationale — don't implement both without a use case)
- [ ] Trust chain documented: which certificates are used, rotation schedule
- [ ] SLO scope documented and agreed with customer: "local logout only" is a valid choice
- [ ] IdP metadata/discovery URL version-pinned in config (not `latest` wildcards)
- [ ] Clock synchronization (NTP) verified on all app servers
- [ ] Certificate rotation runbook written and tested before first rotation
- [ ] Fallback authentication path defined: what happens when IdP is down?

---

## Related

- [[13-Spring-Security-OIDC-Login]]
- [[14-SAML-with-Spring-Security]]
- [[08-OAuth2-Resource-Server]]
- [[03-Authentication-Methods]]
- [[01-Spring-Security-Concepts]]
- [[15-Multi-Tenancy-Security]]
- [[17-Secrets-Management]]
