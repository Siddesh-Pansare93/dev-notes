# Configuration & SecurityFilterChain

> [!info] Express/TS wale dev ke liye
> Express mein tumne middleware chain kiya hoga: `app.use(cors()); app.use(authMiddleware); app.use(routeMiddleware)`. Spring Security ka `SecurityFilterChain` bean bilkul yehi cheez hai, bas declare karte hain **lambda DSL** ke through — jo Spring Security 5.7+ mein aaya aur 6+ mein standard ban gaya. Purana `WebSecurityConfigurerAdapter` extend karne wala pattern ab **khatam** — ab sirf bean-based config chalta hai.

## Concept / Ye kaam kaise karta hai?

Socho tumhara ek app hai jisme Zomato jaisa setup hai — customer-facing API bhi hai (`/api/**`) aur ek admin dashboard bhi (`/**` baaki sab). Dono ke security rules alag hone chahiye — API stateless JWT se chalega, dashboard session-based login se. Isi problem ko solve karta hai `SecurityFilterChain`.

Tum ek ya zyada `SecurityFilterChain` beans declare karte ho. Har chain request matchers (`securityMatcher`) se match hoti hai, isliye tum har path ke liye alag rules bana sakte ho. Har chain ke andar tum auth, authorization, sessions, CORS, CSRF sab kuch configure karte ho lambda DSL use karke.

## Code example

### Ek complete, production-jaisa config

```java
@Configuration
@EnableWebSecurity
@EnableMethodSecurity        // @PreAuthorize enable karta hai ([[05-Method-Security]])
public class SecurityConfig {

    @Bean
    @Order(1)                 // pehle match hoga
    public SecurityFilterChain apiChain(HttpSecurity http,
                                         JwtAuthFilter jwtFilter) throws Exception {
        return http
            .securityMatcher("/api/**")                          // sirf /api/**
            .cors(Customizer.withDefaults())
            .csrf(csrf -> csrf.disable())                         // stateless API
            .sessionManagement(s -> s.sessionCreationPolicy(STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers("/api/v1/auth/**", "/api/v1/public/**").permitAll()
                .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/v1/users/**").hasAuthority("users:read")
                .requestMatchers(HttpMethod.POST, "/api/v1/users/**").hasAuthority("users:write")
                .anyRequest().authenticated())
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
            .exceptionHandling(eh -> eh
                .authenticationEntryPoint(this::unauthorized)
                .accessDeniedHandler(this::forbidden))
            .headers(h -> h
                .frameOptions(f -> f.deny())
                .contentSecurityPolicy(csp -> csp
                    .policyDirectives("default-src 'self'")))
            .build();
    }

    @Bean
    @Order(2)
    public SecurityFilterChain webChain(HttpSecurity http) throws Exception {
        return http
            .securityMatcher("/**")
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/", "/login", "/css/**", "/js/**", "/error").permitAll()
                .anyRequest().authenticated())
            .formLogin(form -> form.loginPage("/login").defaultSuccessUrl("/dashboard"))
            .logout(logout -> logout.logoutSuccessUrl("/"))
            .build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return PasswordEncoderFactories.createDelegatingPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration cfg = new CorsConfiguration();
        cfg.setAllowedOrigins(List.of("https://app.example.com"));
        cfg.setAllowedMethods(List.of("GET","POST","PUT","PATCH","DELETE"));
        cfg.setAllowedHeaders(List.of("*"));
        cfg.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource src = new UrlBasedCorsConfigurationSource();
        src.registerCorsConfiguration("/**", cfg);
        return src;
    }

    private void unauthorized(HttpServletRequest req, HttpServletResponse res,
                              AuthenticationException ex) throws IOException {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(
                HttpStatus.UNAUTHORIZED, "Authentication required");
        writeProblem(res, HttpStatus.UNAUTHORIZED, pd);
    }

    private void forbidden(HttpServletRequest req, HttpServletResponse res,
                           AccessDeniedException ex) throws IOException {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(
                HttpStatus.FORBIDDEN, "Access denied");
        writeProblem(res, HttpStatus.FORBIDDEN, pd);
    }

    private void writeProblem(HttpServletResponse res, HttpStatus s, ProblemDetail pd)
            throws IOException {
        res.setStatus(s.value());
        res.setContentType("application/problem+json");
        new ObjectMapper().writeValue(res.getOutputStream(), pd);
    }
}
```

Zyada dar mat khaana isse dekh ke — line by line samjho:
- `apiChain` sirf `/api/**` ke requests handle karta hai, `@Order(1)` ki wajah se pehle check hota hai.
- `csrf().disable()` kyunki ye stateless JWT API hai — cookies use nahi ho rahi, toh CSRF attack ka risk hi nahi (Zomato ka mobile app jaisa, jo token bhejta hai header mein, cookie nahi).
- `webChain` baaki sab requests (`/**`) ke liye hai — normal form login wala flow, jaise koi purana college portal jisme session-cookie based login hota hai.
- `jwtFilter` ko `addFilterBefore` se pipeline mein inject kiya — Express ke `app.use(jwtAuth)` jaisa hi hai, bas thoda zyada explicit.

### Multiple chains: kab use karein?

| Reason | Pattern |
| --- | --- |
| Ek hi app mein API + web UI dono | `/api/**` ke liye stateless chain, baaki ke liye form-login chain |
| Public endpoints jinke apne headers/CORS chahiye | Alag chain jo auth filters skip kar de |
| Admin sub-app jisme extra strict CSP chahiye | Alag chain, stricter `headers` config ke saath |

`@Order` yahan bahut matter karta hai — jo chain pehle match hoti hai, wahi jeetegi. Bilkul Express mein jaise routes top-se-bottom check hote hain, waise hi.

### Defaults ko disable karna

```java
http.csrf(AbstractHttpConfigurer::disable)
    .formLogin(AbstractHttpConfigurer::disable)
    .httpBasic(AbstractHttpConfigurer::disable);
```

### Custom authentication entry point + access denied handler

Kya hota hai default mein? Agar koi unauthenticated request aati hai toh Spring Security by default `401` bhejta hai saath mein `WWW-Authenticate: Basic` header — jo browser ka native login popup trigger kar deta hai. JSON API ke liye ye bilkul useless hai (tumhara React/Angular frontend us popup ko handle nahi kar sakta), isliye override karna padta hai:

```java
.exceptionHandling(eh -> eh
    .authenticationEntryPoint((req, res, ex) -> {
        res.setStatus(401);
        res.setContentType("application/json");
        res.getWriter().write("{\"error\":\"unauthorized\"}");
    })
    .accessDeniedHandler((req, res, ex) -> {
        res.setStatus(403);
        res.getWriter().write("{\"error\":\"forbidden\"}");
    }))
```

Ye bilkul waise hi hai jaise Express mein tum custom error middleware likhte ho jo `401`/`403` ke liye proper JSON response bhejta hai instead of default HTML error page.

## Request matchers

Kya karte hain ye? Ye batate hain ki kaunsa request "kis rule" ke andar aayega — path ke basis pe, method ke basis pe, ya dono ke combination pe.

```java
auth
  .requestMatchers("/api/v1/users/**")                  // sirf path
  .requestMatchers(HttpMethod.GET, "/api/v1/users/**")  // method + path
  .requestMatchers(antMatcher("/api/**"))               // explicit Ant style
  .requestMatchers(regexMatcher("^/api/v\\d+/.*$"))     // regex
  .anyRequest()                                          // catch-all (sabse last mein)
```

## Express/TS comparison

Agar tum Express se aaye ho toh yehi mental model already tumhare paas hai — bas naam alag hain:

```ts
// Express
app.use('/api', cors());
app.use('/api', helmet());
app.use('/api', jwtAuth);
app.use('/api/admin', requireRole('admin'));
app.use('/api', routes);
```

| Express | Spring Security |
| --- | --- |
| `app.use(cors())` | `.cors(...)` |
| `helmet()` | `.headers(...)` |
| `jwtAuth` middleware | `.addFilterBefore(jwtFilter, ...)` |
| Per-route auth check | `.requestMatchers(...).hasRole(...)` |
| `app.use('/api', router1); app.use('/web', router2)` | Do `SecurityFilterChain` beans, alag `securityMatcher` ke saath |
| `csurf` middleware | `.csrf(...)` (by default ON hi rehta hai) |

## Gotchas — yahan log fasate hain

> [!warning] `securityMatcher` vs `requestMatchers`
> `securityMatcher` decide karta hai ki ye CHAIN kaunse requests handle karegi. `requestMatchers` (jo `authorizeHttpRequests` ke andar hota hai) decide karta hai ki kaunse request ko konsa AUTHORIZATION rule milega. Dono ko mix mat karo — ye alag level ke decisions hain.

> [!warning] `requestMatchers` ka order matter karta hai
> Pehla match jeetta hai. Specific matchers ko GENERAL matchers se pehle likho.
> ```java
> // BUG: har request authenticated maana jayega, doosra rule kabhi reach hi nahi hoga
> .anyRequest().authenticated()
> .requestMatchers("/public").permitAll()
> ```
> Ye bilkul Express ke route-order bug jaisa hai — agar catch-all `app.use('*', ...)` pehle likh diya toh baaki routes kabhi hit hi nahi honge.

> [!warning] `@Order(N)` chains pe lagao
> `@Order` ke bina, multiple chains kisi bhi weird order mein resolve ho sakti hain. Jab bhi ek se zyada chain ho, `@Order` zaroor set karo.

> [!warning] CORS preflight ke liye OPTIONS bhool jaana
> Browser CORS preflight ke time `OPTIONS` request bina credentials ke bhejta hai. Agar tumne ise `permitAll()` nahi kiya toh preflight `401` mein fail ho jayega, aur tumhara actual request kabhi bheja hi nahi jayega. ([[08-CORS]])

> [!danger] `csrf.disable()` browser-facing apps mein
> Stateless APIs (JWT `Authorization` header mein) — haan, disable karna sahi hai. Lekin cookies use karne wale browser apps mein — CSRF **kabhi disable mat karo**. Socho jaise CRED ya Paytm jaisa app agar cookie-based session use kare aur CSRF disable kar de — koi malicious site silently tumhare account se payment trigger kara sakta hai. ([[07-CSRF-CORS-Security]])

> [!tip] `springSecurity()` MockMvc helper
> Jab controllers ko security ke peeche test karna ho:
> ```java
> mockMvc.perform(get("/api/me").with(user("alice").roles("ADMIN")));
> ```

## Key Takeaways

- `SecurityFilterChain` bean = Express middleware chain ka Spring Security version, bas lambda DSL se declare hota hai.
- Ek app mein multiple chains ho sakti hain — har ek apne `securityMatcher` se apna path range handle karti hai (jaise `/api/**` ke liye stateless, `/**` ke liye form-login).
- `@Order` hamesha lagao jab multiple chains ho — pehla match jeetta hai.
- `requestMatchers` ka order bhi matter karta hai — specific rules pehle, generic `.anyRequest()` sabse last mein.
- `securityMatcher` (chain-level) aur `requestMatchers` (authorization-level) alag cheezein hain — confuse mat karo.
- Stateless JWT API mein CSRF disable karna theek hai, lekin cookie-based browser apps mein kabhi mat karo.
- CORS preflight (`OPTIONS`) ko hamesha `permitAll()` karo, warna preflight hi fail ho jayega.
- JSON APIs ke liye default `401`/`403` handlers ko override karke proper JSON error response bhejo — browser ka native login popup avoid karne ke liye.
