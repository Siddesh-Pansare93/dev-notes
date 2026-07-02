# CORS — Cross-Origin Resource Sharing

Socho Zomato ka frontend `app.zomato.com` pe chal raha hai, aur uska backend API `api.zomato.com` pe hai. Jab browser `app.zomato.com` se `api.zomato.com` ko request maarta hai — yeh do alag "origins" hain. Browser ek nayi baat check karta hai: "Kya server ne permission di hai is doosre origin ko apna data dikhane ki?" Agar nahi di, toh browser request rok deta hai — aur tumhare console mein woh khatarnak red error aata hai:

```
Access to fetch at 'https://api.zomato.com/orders' from origin 
'https://app.zomato.com' has been blocked by CORS policy.
```

Yahi hai **CORS — Cross-Origin Resource Sharing**. Aur Spring Boot mein isko theek se configure karna ek common headache hai beginners ke liye.

---

## CORS Kya Hota Hai? Browser Ka Security Guard

Browser ka ek built-in rule hai jise kehte hain **Same-Origin Policy**. Yeh rule kehta hai: "Ek webpage sirf usi origin ke resources fetch kar sakta hai jahan se woh khud aaya hai."

**Origin = Protocol + Domain + Port**

| URL | Same Origin as `https://api.zomato.com:443`? |
|---|---|
| `https://api.zomato.com/orders` | Haan (same protocol, domain, port) |
| `http://api.zomato.com` | Nahi (protocol alag — http vs https) |
| `https://app.zomato.com` | Nahi (subdomain alag) |
| `https://api.zomato.com:8080` | Nahi (port alag) |

CORS is policy ko **relax** karne ka official tarika hai — server bolta hai "haan, main in origins ko apna data access karne deta hoon."

> [!info] Node.js/Express walo ke liye
> Express mein tum yeh kaam ek middleware se karte the: `app.use(cors({ origin: '...', credentials: true }))`. Spring mein yeh kaam teen alag layers pe ho sakta hai — annotation per-controller (`@CrossOrigin`), global MVC config (`WebMvcConfigurer`), ya Spring Security ke through (`CorsConfigurationSource` + `SecurityFilterChain`). Jab Spring Security classpath pe ho, **sirf Security wali config count hoti hai** — baaki sab ignore ho jaata hai.

---

## Browser Preflight — Yeh Kya Hota Hai?

CORS ke do types ki requests hoti hain:

### 1. Simple Requests
Kuch basic requests hain (sirf `GET`/`POST` with certain headers) jinhe browser seedha bhej deta hai. Server ke response mein CORS headers check karta hai. Agar nahi mile — block.

### 2. Preflight Requests (OPTIONS)
Jab request "non-simple" hoti hai — jaise `PUT`, `DELETE`, ya custom headers jaise `Authorization` — browser **pehle ek `OPTIONS` request** bhejta hai. Yeh ek dry-run hai — "Bhai server, kya main yeh request bhej sakta hoon?"

Server ko OPTIONS request ka proper CORS headers ke saath jawab dena padta hai. Tabhi browser actual request bhejta hai.

```
Browser                          Server (api.zomato.com)
   |                                     |
   |--- OPTIONS /api/orders ------------>|
   |    Origin: https://app.zomato.com  |
   |    Access-Control-Request-Method: DELETE
   |                                     |
   |<-- 200 OK -------------------------|
   |    Access-Control-Allow-Origin: https://app.zomato.com
   |    Access-Control-Allow-Methods: GET, POST, DELETE
   |    Access-Control-Max-Age: 3600    |
   |                                     |
   |--- DELETE /api/orders/123 -------->|  (actual request)
   |                                     |
```

Spring Boot yeh sab automatically handle karta hai — tumhe bas configure karna hai.

---

## Teen Levels Ka Configuration

Spring mein CORS configure karne ke teen tarike hain. Har ek ka use-case alag hai:

| Level | Kahan likhte hain | Kab use karo |
|---|---|---|
| `@CrossOrigin` | Controller class ya method pe | Quick fix, specific endpoint ke liye alag policy |
| `WebMvcConfigurer#addCorsMappings` | Global config class | Jab Spring Security **nahi** hai |
| `CorsConfigurationSource` + `SecurityFilterChain` | Security config | **Jab Spring Security hai — yahi sahi tarika hai** |

---

## Level 1: `@CrossOrigin` Annotation — Quick Fix

Yeh sabse simple tarika hai. Ek controller ya ek method pe annotation lagao, kaam khatam.

```java
@RestController
@RequestMapping("/api/v1/public")
// Sirf is controller ke liye CORS allow kar rahe hain
@CrossOrigin(
    origins = "https://app.example.com",   // kaunse origin ko allow karo
    allowedHeaders = "*",                   // kaunse headers allow hain
    methods = { RequestMethod.GET, RequestMethod.POST },  // kaunse HTTP methods
    maxAge = 3600                           // preflight cache kitni der tak — 1 ghanta
)
public class PublicController {

    @GetMapping("/items")
    public List<Item> getItems() {
        return itemService.findAll();
    }

    // Sirf is ek method ke liye alag CORS policy chahiye? Method pe lagao:
    @PostMapping("/feedback")
    @CrossOrigin(origins = { "https://app.example.com", "https://beta.example.com" })
    public ResponseEntity<Void> submitFeedback(@RequestBody FeedbackDto dto) {
        feedbackService.save(dto);
        return ResponseEntity.ok().build();
    }
}
```

> [!warning] Yeh sirf chhote projects ya quick testing ke liye hai
> Production app mein har controller pe `@CrossOrigin` lagana — ugh. Maintain karna mushkil ho jaata hai. Agar kal origin change karni ho, toh sau jagah badalna padega. Global config prefer karo.

---

## Level 2: Global Config — `WebMvcConfigurer` (No Security)

Yeh woh setup hai jab tumhare paas Spring Security nahi hai (ya sirf ek simple app hai).

```java
@Configuration
public class CorsConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {

        // /api/** ke sab endpoints ke liye CORS config
        registry.addMapping("/api/**")
                .allowedOrigins(
                    "https://app.example.com",    // production frontend
                    "http://localhost:5173"        // local Vite dev server
                )
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE")
                .allowedHeaders("*")              // sare headers allow
                .exposedHeaders(
                    "X-Total-Count",              // pagination ke liye
                    "X-Request-Id"               // tracing ke liye
                )
                .allowCredentials(true)           // cookies/auth headers allow
                .maxAge(3600);                    // preflight 1 ghante tak cache ho

        // Public endpoints ke liye alag policy chahiye?
        registry.addMapping("/public/**")
                .allowedOrigins("*")             // sabko allow — public data hai
                .allowedMethods("GET")
                .allowCredentials(false);        // credentials nahi chahiye public endpoints pe
    }
}
```

**`exposedHeaders` kya hai?** Browser by default sirf kuch basic response headers hi expose karta hai JavaScript ko. Agar tumhara backend custom headers bhejta hai (jaise pagination ke liye `X-Total-Count`), toh unhe explicitly expose karna padta hai — warna frontend `response.headers.get('X-Total-Count')` kare toh `null` milega.

---

## Level 3: Spring Security Ke Saath — Production Setup

Yeh sabse important setup hai. **Jab Spring Security classpath pe hai, `WebMvcConfigurer` wali CORS config kaam nahi karti.** Kyun? Kyunki Spring Security ka filter chain pehle run hota hai — MVC dispatcher se pehle. Security filter CORS headers nahi dekhta (kyunki MVC ne abhi configure kiya nahi) aur `OPTIONS` preflight ko 401 Unauthorized de deta hai.

Isliye jab Security ho, toh CORS config Security ke andar hi karo:

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
                // .cors(Customizer.withDefaults()) ka matlab hai:
                // "CorsConfigurationSource naam ka bean dhundo aur use karo"
                .cors(Customizer.withDefaults())

                // REST API hai toh CSRF disable — cookies use nahi kar rahe
                .csrf(csrf -> csrf.disable())

                .authorizeHttpRequests(auth -> auth
                        // OPTIONS preflight ko bina auth ke pass karne do
                        // Browser credentials preflight pe nahi bhejta — 401 doge toh CORS fail
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .anyRequest().authenticated()
                )
                .build();
    }

    // Yeh bean automatically pick ho jaata hai jab .cors(Customizer.withDefaults()) likho
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();

        // Allowed origins — specific URLs, wildcard nahi (credentials ke saath)
        config.setAllowedOrigins(List.of(
                "https://app.example.com",
                "http://localhost:5173"    // local development
        ));

        // Allowed HTTP methods
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));

        // Allowed request headers
        config.setAllowedHeaders(List.of("*"));

        // Response headers jo frontend JS ko visible chahiye
        config.setExposedHeaders(List.of("X-Total-Count", "X-Request-Id"));

        // Cookies aur Authorization headers allow karo
        config.setAllowCredentials(true);

        // Preflight response 1 ghante tak cache ho — reduce karo OPTIONS requests
        config.setMaxAge(Duration.ofHours(1));

        // Yeh config "/api/**" ke liye register karo
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }
}
```

---

## `application.yml` Shorthand — Sirf Actuator Ke Liye

Yeh sirf Spring Boot Actuator endpoints ke liye hai (3.2+). Actual API endpoints ke liye Java config hi use karo.

```yaml
management:
  endpoints:
    web:
      cors:
        allowed-origins: "https://app.example.com"
        allowed-methods: GET, POST
```

---

## Node.js/Express Se Comparison

Tu Express/TypeScript se aa raha hai — toh direct comparison dekh:

```typescript
// Express mein ek middleware se kaam ho jaata tha:
import cors from 'cors';

app.use(cors({
  origin: ['https://app.example.com', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-Total-Count'],
  maxAge: 3600,
}));
```

Spring mein wahi options, alag names:

| Express `cors` option | Spring equivalent |
|---|---|
| `origin` | `allowedOrigins(...)` ya `allowedOriginPatterns(...)` |
| `credentials: true` | `allowCredentials(true)` |
| `methods` | `allowedMethods(...)` |
| `allowedHeaders` | `allowedHeaders(...)` |
| `exposedHeaders` | `exposedHeaders(...)` |
| `maxAge` | `maxAge(seconds)` ya `setMaxAge(Duration)` |
| `preflightContinue` | Spring khud handle karta hai — koi analog nahi |

Express mein tum conditionally origin check karte the function se:
```typescript
cors({ origin: (origin, cb) => cb(null, allowedOrigins.includes(origin)) })
```

Spring mein iske liye `allowedOriginPatterns` use karo (regex support hai):
```java
config.setAllowedOriginPatterns(List.of(
    "https://*.example.com",   // sare subdomains allow
    "http://localhost:*"       // koi bhi local port
));
```

---

## Common Gotchas — Yahan Phanste Hain Beginners

> [!warning] `allowCredentials(true)` + `allowedOrigins("*")` — Forbidden Combo
> CORS spec mein yeh combination **illegal** hai. Browser aur Spring dono isko reject karte hain. Reason: agar credentials (cookies, Authorization header) allow karo aur origin bhi `*` ho, toh koi bhi site tumhare user ki credentials se request maar sakta hai — CSRF ka khatra.
>
> **Solution:** Ya toh specific origins likho, ya `allowedOriginPatterns("*")` use karo (yeh literal `*` nahi bhejta, pattern matching karta hai — credentials ke saath kaam karta hai).

```java
// GALAT — crash karega
config.setAllowedOrigins(List.of("*"));
config.setAllowCredentials(true);

// SAHI Option 1 — specific origins
config.setAllowedOrigins(List.of("https://app.example.com"));
config.setAllowCredentials(true);

// SAHI Option 2 — pattern (credentials ke saath bhi kaam karta hai)
config.setAllowedOriginPatterns(List.of("*"));
config.setAllowCredentials(true);
```

> [!warning] Spring Security Hai Toh `WebMvcConfigurer` Ki CORS Config Kaam Nahi Karti
> Yeh sabse common mistake hai. Tum `WebMvcConfigurer` mein `addCorsMappings` configure karte ho, Security bhi add karte ho — aur preflight 401 deta rehta hai. Spring Security ka filter chain MVC se pehle run hota hai, isliye MVC ki CORS config kabhi reach nahi hoti.
>
> **Rule:** Agar `spring-boot-starter-security` dependency hai, toh CORS **sirf** `SecurityFilterChain` + `CorsConfigurationSource` se configure karo.

> [!warning] OPTIONS Preflight Ko Auth Se Bahar Rakho
> Browser preflight requests pe credentials nahi bhejta (no cookies, no Authorization header). Isliye agar OPTIONS method ke liye authentication required ho, toh browser ko 401 milega — aur actual request kabhi nahi jayegi.
>
> Hamesha yeh line daalo Security config mein:
> ```java
> .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
> ```

> [!warning] `@CrossOrigin` Aur Global Config Mix Mat Karo
> Agar ek hi endpoint ke liye dono configure ho, toh Spring unhe merge karne ki koshish karta hai — lekin yeh unpredictable behavior de sakta hai. Ek strategy pick karo aur uspe stick karo.

> [!tip] CORS Sirf Browser Ka Problem Hai
> `curl`, Postman, ya server-to-server calls CORS headers ko completely ignore karte hain. Agar tumhara `curl` se kaam ho raha hai lekin browser mein "CORS error" aa raha hai — toh problem CORS configuration mein hai, business logic mein nahi. Don't be confused.

> [!warning] Production Mein `allowedOrigins("*")` Mat Karo
> Public read-only data ke liye theek hai. Lekin agar cookies ya JWTs use ho rahe hain — yeh setup hostile sites ko tumhare users ki credentials se request maarne deta hai. Hamesha specific origins whitelist karo production mein.

> [!tip] Development Mein Dynamic Origins Handle Karna
> Local development mein ports change hote rehte hain. `application-dev.yml` mein allowed origins externalize karo:

```yaml
# application-dev.yml
cors:
  allowed-origins:
    - http://localhost:3000
    - http://localhost:5173
    - http://localhost:4200
```

```java
@Configuration
public class SecurityConfig {

    @Value("${cors.allowed-origins}")
    private List<String> allowedOrigins;

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(allowedOrigins); // properties se aata hai
        // ... baaki config
    }
}
```

---

## Real-World Example — Swiggy Jaisi App

Maan lo tumhara setup hai:
- Frontend: `https://swiggy.com` (React app)
- Backend API: `https://api.swiggy.com`
- Admin Panel: `https://admin.swiggy.com`

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
                .cors(Customizer.withDefaults())
                .csrf(csrf -> csrf.disable())
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/api/public/**").permitAll()
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        .anyRequest().authenticated()
                )
                .build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        // Customer-facing API ke liye config
        CorsConfiguration customerConfig = new CorsConfiguration();
        customerConfig.setAllowedOrigins(List.of(
                "https://swiggy.com",
                "https://www.swiggy.com",
                "http://localhost:3000"  // dev
        ));
        customerConfig.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        customerConfig.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        customerConfig.setExposedHeaders(List.of("X-Total-Count"));
        customerConfig.setAllowCredentials(true);
        customerConfig.setMaxAge(Duration.ofHours(1));

        // Admin panel ke liye alag (zyada strict) config
        CorsConfiguration adminConfig = new CorsConfiguration();
        adminConfig.setAllowedOrigins(List.of("https://admin.swiggy.com"));
        adminConfig.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        adminConfig.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        adminConfig.setAllowCredentials(true);
        adminConfig.setMaxAge(Duration.ofMinutes(30));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/public/**", customerConfig);
        source.registerCorsConfiguration("/api/v1/**", customerConfig);
        source.registerCorsConfiguration("/api/admin/**", adminConfig);
        return source;
    }
}
```

---

## Key Takeaways

- **CORS browser ka rule hai** — server-to-server calls, curl, aur Postman ko yeh nahi dikhta. Sirf browser enforce karta hai
- **Teen layers hain**: `@CrossOrigin` (per-endpoint) → `WebMvcConfigurer` (global, no Security) → `CorsConfigurationSource` (Security ke saath — production standard)
- **Spring Security hai toh `WebMvcConfigurer` ki CORS config ignore ho jaati hai** — yeh sabse badi mistake hai beginners ki
- **OPTIONS preflight ko hamesha permitAll() karo** — browser credentials nahi bhejta preflight pe, toh 401 doge toh actual request kabhi nahi jayegi
- **`allowCredentials(true)` ke saath `allowedOrigins("*")` forbidden hai** — `allowedOriginPatterns("*")` use karo agar sab origins chahiye
- **Production mein specific origins whitelist karo** — `"*"` sirf public read-only APIs ke liye theek hai
- **`exposedHeaders` mat bhulo** — custom response headers (pagination, tracing) frontend ko tabhi dikhte hain jab explicitly expose karo
- **Origins externalize karo `application.yml` mein** — hardcode mat karo, environment ke hisaab se change hoga