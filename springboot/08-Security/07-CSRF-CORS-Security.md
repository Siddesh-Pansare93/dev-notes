# CSRF & CORS Security

> [!info] Express/TS dev ke liye
> Spring Security mein CSRF protection state-changing methods (POST/PUT/PATCH/DELETE) ke liye **by default ON** hoti hai. Stateless JWT API mein tum ise disable karte ho. Cookie-session wale app mein ise ON hi rakhna hai. Yeh farak samajhna — aur "kyun" samajhna — hi decide karta hai ki tumhari app safe rahegi ya security incident ban jayegi.

## CSRF — kya hai aur kab lagta hai?

Socho tum logged in ho apne bank ke website pe — `mybank.com` — aur usne tumhe ek session cookie de rakhi hai. Ab tum ek dusra tab khol ke `evil-site.com` pe chale gaye (jo ek discount coupon promise kar raha hai). Us page pe ek hidden form hai jo silently `mybank.com/transfer?to=hacker&amount=50000` pe POST kar deta hai. Browser automatically tumhari `mybank.com` wali cookie attach kar dega us request ke saath — kyunki cookies domain-based hoti hain, page kahin se bhi load hua ho. Bank ke server ko lagega yeh request tumne khud bheji.

Yehi hai **CSRF (Cross-Site Request Forgery)** — browser ka credentials automatically attach karne wala "feature" hi exploit ban jata hai.

**Defense kya hai?** Ek token jo sirf tumhari app ke pages ko pata hota hai — form submission mein include hota hai, server-side validate hota hai. Attacker ke page ko yeh token pata nahi hota (same-origin policy ki wajah se), isliye uska forged request fail ho jata hai. Spring Security yeh sab automate kar deta hai.

### CSRF kab CHAHIYE?

- Browser-based apps jo **session cookies** se auth karte hain
- Server-rendered pages jinme `<form>` POST hote hain
- Koi bhi endpoint jahan credentials browser automatically bhej deta hai

### CSRF kab DISABLE kar sakte ho?

- **Stateless API** (koi cookie nahi; auth `Authorization: Bearer …` header se)
- Sirf mobile/native clients use karte hain
- Endpoint browser se call hi nahi hota

**Reasoning:** CSRF tabhi kaam karta hai jab browser khud-ba-khud credentials attach kar de. JWT `Authorization` header mein hota hai — aur woh JS code ko explicitly add karna padta hai. Cross-origin JS aisa nahi kar sakta (same-origin policy + CORS isko rokte hain). Isliye JWT-based stateless API mein CSRF ka threat model hi apply nahi hota.

> [!tip] Zomato analogy
> Socho Zomato ka order-place karne wala form session cookie use karta hai. Agar CSRF protection na ho, toh koi bhi malicious website silently "order 10 pizzas" wala form tumhare naam se submit kar sakti hai jab tak tum Zomato pe logged in ho. CSRF token ek "secret handshake" hai jo sirf Zomato ke apne pages jaante hain — attacker ka page yeh handshake nahi kar sakta.

## Code example

### Default behavior

```java
@Bean
public SecurityFilterChain chain(HttpSecurity http) throws Exception {
    return http
        .authorizeHttpRequests(a -> a.anyRequest().authenticated())
        .formLogin(Customizer.withDefaults())
        .build();    // CSRF on by default
}
```

Spring ke `_csrf` model attribute se generate hue forms mein token automatically include ho jata hai. Lekin SPA clients (React/Angular/Vue) ko yeh token khud cookie (`XSRF-TOKEN`) se read karke header (`X-XSRF-TOKEN`) mein wapas bhejna padta hai.

### CSRF for SPA + cookies

```java
@Bean
public SecurityFilterChain chain(HttpSecurity http) throws Exception {
    return http
        .csrf(csrf -> csrf
            .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
            .csrfTokenRequestHandler(new SpaCsrfTokenRequestHandler()))
        .authorizeHttpRequests(a -> a.anyRequest().authenticated())
        .build();
}
```

Yahan Spring `XSRF-TOKEN` naam ki cookie set karta hai jo JS se readable hai (`withHttpOnlyFalse()` — isliye `HttpOnly` nahi hai, warna JS read hi nahi kar pata). Server expect karta hai ki tum `X-XSRF-TOKEN` header mein wahi value wapas bhejo. Axios yeh kaam **by default automatically** karta hai — cookie se read karke header mein daal deta hai. Fetch API mein tumhe manually likhna padega.

### Disable CSRF (stateless API)

```java
@Bean
public SecurityFilterChain chain(HttpSecurity http) throws Exception {
    return http
        .csrf(csrf -> csrf.disable())
        .sessionManagement(s -> s.sessionCreationPolicy(STATELESS))
        .oauth2ResourceServer(o -> o.jwt(Customizer.withDefaults()))
        .authorizeHttpRequests(a -> a.anyRequest().authenticated())
        .build();
}
```

Yeh woh typical setup hai jo tum ek pure REST API (mobile app + SPA, JWT auth) ke liye likhoge — koi session, koi cookie, sirf `Authorization: Bearer <token>` header.

### Selectively disable CSRF

```java
.csrf(csrf -> csrf
    .ignoringRequestMatchers("/api/webhooks/**", "/api/public/**"))
```

Kaam kab aata hai? Jab tumhari app mostly form-based hai (session cookies), lekin kuch specific endpoints server-to-server call hote hain — jaise Razorpay/Stripe ka webhook, jo kabhi browser se hit nahi hoga aur uske paas CSRF token bhejne ka koi tarika nahi hoga.

## Security headers

Spring already sensible defaults set karta hai. Customize karna ho toh:

```java
http.headers(headers -> headers
    .frameOptions(f -> f.deny())                                  // X-Frame-Options
    .contentTypeOptions(Customizer.withDefaults())                // X-Content-Type-Options: nosniff
    .httpStrictTransportSecurity(hsts -> hsts
        .maxAgeInSeconds(63072000)
        .includeSubDomains(true)
        .preload(true))
    .referrerPolicy(r -> r.policy(ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
    .permissionsPolicy(p -> p.policy("geolocation=(), microphone=()"))
    .contentSecurityPolicy(csp -> csp
        .policyDirectives("default-src 'self'; script-src 'self' 'sha256-...'; "
                        + "style-src 'self' 'unsafe-inline'; "
                        + "frame-ancestors 'none'; "
                        + "object-src 'none'")));
```

Har header ka apna kaam hai — inhe samjho jaise apne ghar ke different locks:

| Header | Kaam |
| --- | --- |
| `X-Frame-Options: DENY` | Clickjacking rokta hai (koi tumhari site ko iframe mein daal ke fake button pe click karwa na sake) |
| `X-Content-Type-Options: nosniff` | Browser ko file ka type "guess" karne se rokta hai (MIME sniffing attack) |
| `Strict-Transport-Security` | Poore domain ke liye HTTPS force karta hai — kabhi bhi HTTP pe fall back nahi hoga |
| `Referrer-Policy` | Kitna URL info dusri site ko `Referer` header mein leak hoga, control karta hai |
| `Permissions-Policy` | Browser features (camera, geo, mic) disable/allow karta hai |
| `Content-Security-Policy` | Kaunse sources se script/style/image load ho sakte hain, whitelist karta hai |

> [!info] Kyun zaruri hai?
> Yeh headers "defense in depth" hain — agar kahin ek layer fail ho jaye (jaise koi XSS bug slip ho gaya), toh yeh headers damage limit kar dete hain. Jaise ghar mein ek hi lock nahi, deadbolt + chain + alarm sab hote hain.

## CORS recap

Poori kahani [[08-CORS]] mein hai. Security context ke liye short summary:

- CORS **browser-enforced** hai. Postman, curl, ya koi bhi CLI tool ise ignore kar deta hai — CORS sirf browser ka rule hai.
- CORS **CSRF ka substitute NAHI** hai. Ek misconfigured CORS CSRF ko nahi rokta — woh sirf yeh control karta hai ki browser JS response ko **read** kar sakta hai ya nahi.
- `Access-Control-Allow-Origin: *` + credentials ek saath invalid hai (aur dangerous bhi) — browser khud is combination ko reject kar dega.

## Express/TS comparison

```ts
// Express
import csurf from 'csurf';
import helmet from 'helmet';

app.use(helmet());                 // security headers
app.use(cookieParser());
app.use(csurf({ cookie: true }));  // CSRF protection

app.get('/csrf', (req, res) => res.json({ token: req.csrfToken() }));
```

| Express | Spring Security |
| --- | --- |
| `csurf` middleware | `.csrf(...)` (by default ON) |
| `helmet()` | `.headers(...)` (sensible defaults already) |
| Disable CSRF on `/api` | `.csrf(c -> c.ignoringRequestMatchers("/api/**"))` |
| `cors()` | `.cors(...)` + `CorsConfigurationSource` ([[08-CORS]]) |
| `helmet.contentSecurityPolicy({ directives })` | `.contentSecurityPolicy(...)` |

Farak yeh hai — Express mein tum har cheez explicitly `use()` karte ho, warna kuch bhi ON nahi hota. Spring Security ka philosophy opposite hai: **secure by default**, tumhe explicitly disable/customize karna padta hai. Dono approach ke apne trade-offs hain — Express flexible hai lekin ek middleware bhoolna easy hai; Spring safe-by-default hai lekin naya dev confuse ho sakta hai "yeh CSRF error kahan se aaya".

## Decision flowchart

```
Auth cookies/session se ho raha hai?
├── HAAN → CSRF ON rakho. CookieCsrfTokenRepository configure karo.
└── NAHI (Authorization header / JWT)
    └── Kya endpoint browser se cross-site call ho sakta hai?
        ├── NAHI → CSRF disable karna safe hai.
        └── HAAN → Ruko, dobara socho. Token cookie mein kyun hai?
```

## Gotchas

> [!danger] "Postman kaam nahi kar raha" isliye CSRF disable kar dena
> Agar tumhari API browsers se use hoti hai, toh CSRF disable karna real risk hai. Postman ko CSRF se koi matlab nahi — woh token toh browsers ke liye hai. Fix yeh hai: Postman mein manually `X-XSRF-TOKEN` header attach karo, CSRF disable mat karo.

> [!warning] Cookie + header auth ek saath accept karna
> Agar tum EK SATH `Cookie: SESSION=...` AUR `Authorization: Bearer ...` dono accept karte ho ek endpoint pe, toh tum vulnerable ho. Har endpoint ke liye ek hi auth flow choose karo — mix mat karo.

> [!warning] Non-idempotent GET requests pe CSRF token laga dena
> CSRF by default sirf state-changing methods (POST/PUT/PATCH/DELETE) ko protect karta hai. Agar tumhara `GET /transfer?to=...&amount=...` state mutate kar raha hai — yeh design hi galat hai. Iska fix hai API ko sahi HTTP method pe move karna, CSRF ko GET tak expand karna nahi.

> [!warning] HSTS preload ek one-way door hai
> `preload` directive tumhare domain ko browser ki built-in HSTS list mein submit kar deta hai. Baad mein isko hataana weeks/months le sakta hai (browser vendors ki list update hone mein time lagta hai). Production mein daalne se pehle thoroughly test karo.

> [!warning] CSP mein `'unsafe-inline'` zyada protection khatam kar deta hai
> Inline scripts ke liye nonces ya hashes use karne mein time lagao. `unsafe-inline` almost har security audit mein critical flag hota hai — isse CSP ka XSS-protection wala fayda kaafi kam ho jata hai.

> [!tip] CORS response READ karne deta hai; CSRF request BHEJNE se rokta hai
> Dono alag threats hain. Browser-based app ke liye tumhe generally DONO sahi se configure karne padenge — sirf ek se kaam nahi chalega.

> [!tip] `OWASP ZAP` ya `Burp` se test karo
> Yeh free tools hain jo tumhare endpoints pe hit karte hain aur missing headers / CSRF gaps report karte hain. Production jaane se pehle ek baar zaroor chalao.

## Key Takeaways

- CSRF exploit karta hai browser ka "automatically credentials bhej dena" behavior — cookie/session-based auth mein hi real threat hai.
- Session-cookie apps mein CSRF **hamesha ON rakho**; JWT/Bearer-token stateless APIs mein disable karna generally safe hai (kyunki attacker cross-origin se header attach nahi kar sakta).
- SPA + cookie combo mein `CookieCsrfTokenRepository` + `X-XSRF-TOKEN` header pattern use karo; Axios yeh khud handle kar leta hai.
- Selective disable (`ignoringRequestMatchers`) webhooks jaise server-to-server endpoints ke liye hai, poori API ke liye nahi.
- Security headers (`X-Frame-Options`, `HSTS`, `CSP`, etc.) defense-in-depth dete hain — CSRF/CORS ke alawa bhi zaruri hain.
- CORS aur CSRF do alag problems solve karte hain — CORS "response padh sakta hai ya nahi" control karta hai, CSRF "request bheja ja sakta hai ya nahi". Confuse mat karo inhe.
- Kabhi bhi "Postman/testing easy banane ke liye" CSRF disable mat karo production code mein — yeh ek real vulnerability chhod deta hai.
- Mixed auth (cookie + header dono ek endpoint pe) avoid karo — ek endpoint, ek auth strategy.

## Related

- [[01-Spring-Security-Concepts]]
- [[02-Configuration-and-SecurityFilterChain]]
- [[03-Authentication-Methods]]
- [[08-CORS]]
- [[07-Filters-Interceptors]]
