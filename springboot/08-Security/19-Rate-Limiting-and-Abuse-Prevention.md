# Rate Limiting and Abuse Prevention

> [!info] Express/TS dev ke liye
> Tumne `express-rate-limit` ko Redis store ke saath use kiya hoga. Spring ka equivalent hai Bucket4j — same sliding-window/token-bucket semantics, same Redis backend option, bas security filter chain ke saath tighter integration. Ye note account lockout, bot defenses, aur "upstream pe kya chhodna hai vs app mein kya handle karna hai" — sab cover karta hai.

## Concept / Mental Model

Socho tum Zomato ke ek delivery partner app ka backend chala rahe ho. Agar koi bandaa 1 second mein 500 baar "order accept karo" API hit kare, toh ya toh woh bot hai, ya koi script chala raha hai, ya phir genuinely kuch gadbad hai. Rate limiting basically ek bouncer hai jo darwaze pe khada hokar bolta hai — "bhai itni jaldi jaldi mat aa, line mein lag."

### Kaunsa algorithm kab use karna hai?

Alag-alag rate limiting algorithms alag-alag tarike se "kitna traffic allow karna hai" decide karte hain:

| Algorithm | Behavior | Burst allowed? | Memory | Use case |
|---|---|---|---|---|
| **Fixed window** | Har N seconds mein counter reset ho jata hai | Haan (boundary pe) | O(1) | Simple, high-throughput endpoints |
| **Sliding window log** | Last N seconds ke requests ka exact count | Nahi | O(requests) | Accurate, kam traffic wale endpoints |
| **Sliding window counter** | Do windows ka weighted average | Minimal | O(1) | Balanced; Redis-friendly |
| **Token bucket** | Tokens constant rate se refill hote hain; bucket capacity tak burst allowed | Haan (capacity tak) | O(1) | APIs jahan bursty clients expected hain |
| **Leaky bucket** | Queue constant rate se drain hoti hai; overflow = reject | Nahi | O(queue size) | Smooth output rate (video streaming waghera) |

> [!tip]
> **Token bucket** (jo Bucket4j implement karta hai) zyada tar REST APIs ke liye best choice hai. Isme legitimate burst traffic allow hoti hai (jaise koi user jaldi jaldi 3-4 actions kar de), lekin sustained abuse se protect bhi karta hai. Matlab, agar koi user ek saath 5 quick clicks kare toh woh block nahi hoga, lekin agar koi bot continuously hammer kare toh woh pakda jayega.

---

## Code Examples

### Bucket4j — per-endpoint, per-user rate limiting

Sabse pehle dependency daalo:

```xml
<!-- pom.xml -->
<dependency>
    <groupId>com.github.vladimir-bukhtoyarov</groupId>
    <artifactId>bucket4j-core</artifactId>
    <version>8.9.0</version>
</dependency>
<!-- For Redis-backed distributed limiting: -->
<dependency>
    <groupId>com.github.vladimir-bukhtoyarov</groupId>
    <artifactId>bucket4j-redis</artifactId>
    <version>8.9.0</version>
</dependency>
<dependency>
    <groupId>io.lettuce</groupId>
    <artifactId>lettuce-core</artifactId>
</dependency>
```

Ab ek `OncePerRequestFilter` banate hain jo har request ke liye check karega ki rate limit exceed toh nahi ho gaya:

```java
@Component
@RequiredArgsConstructor
public class RateLimitingFilter extends OncePerRequestFilter {

    private final RateLimitService rateLimitService;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                     HttpServletResponse response,
                                     FilterChain filterChain)
            throws ServletException, IOException {

        String key = resolveKey(request);
        RateLimitResult result = rateLimitService.tryConsume(key, request.getRequestURI());

        if (!result.isAllowed()) {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setHeader("X-RateLimit-Limit",     String.valueOf(result.getLimit()));
            response.setHeader("X-RateLimit-Remaining", String.valueOf(result.getRemaining()));
            response.setHeader("Retry-After",           String.valueOf(result.getRetryAfterSeconds()));
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.getWriter().write("""
                {"error":"Too many requests","retryAfter":%d}
                """.formatted(result.getRetryAfterSeconds()));
            return;
        }

        response.addHeader("X-RateLimit-Remaining", String.valueOf(result.getRemaining()));
        filterChain.doFilter(request, response);
    }

    private String resolveKey(HttpServletRequest request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !(auth instanceof AnonymousAuthenticationToken)) {
            return "user:" + auth.getName();
        }
        return "ip:" + getClientIp(request);
    }

    private String getClientIp(HttpServletRequest req) {
        String forwarded = req.getHeader("X-Forwarded-For");
        return forwarded != null ? forwarded.split(",")[0].trim() : req.getRemoteAddr();
    }
}
```

Gaur karo `resolveKey()` pe — agar user login hai toh uske username se limit lagegi, warna IP address se. Ye isliye zaruri hai kyunki agar sirf IP se limit lagayenge toh office ke NAT ke peeche baithe 50 logon ka ek hi IP dikhega, aur unmein se ek bhi rate limit hit kar de toh sabko block ho jayega.

Ab actual bucket logic — kaunse endpoint pe kitni limit hai, woh define karte hain:

```java
@Service
@RequiredArgsConstructor
public class RateLimitService {

    private final Map<String, BandwidthConfig> endpointConfigs;
    // Local cache for non-distributed setups:
    private final Cache<String, Bucket> localBuckets =
        Caffeine.newBuilder().maximumSize(100_000).expireAfterAccess(1, TimeUnit.HOURS).build();

    // Per-endpoint per-user limits
    private static final Map<String, BandwidthConfig> ENDPOINT_LIMITS = Map.of(
        "/api/auth/login",   new BandwidthConfig(5,  Duration.ofMinutes(1)),   // 5/min
        "/api/orders",       new BandwidthConfig(100, Duration.ofMinutes(1)),   // 100/min
        "/api/reports/",     new BandwidthConfig(10, Duration.ofMinutes(1)),    // 10/min
        "default",           new BandwidthConfig(200, Duration.ofMinutes(1))    // 200/min
    );

    public RateLimitResult tryConsume(String key, String path) {
        BandwidthConfig config = resolveConfig(path);
        String bucketKey = key + ":" + resolveEndpointGroup(path);

        Bucket bucket = localBuckets.get(bucketKey, k -> buildBucket(config));
        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);

        if (probe.isConsumed()) {
            return RateLimitResult.allowed(config.getLimit(), probe.getRemainingTokens());
        } else {
            long retryAfter = TimeUnit.NANOSECONDS.toSeconds(probe.getNanosToWaitForRefill());
            return RateLimitResult.denied(config.getLimit(), 0, retryAfter);
        }
    }

    private Bucket buildBucket(BandwidthConfig config) {
        Bandwidth limit = Bandwidth.builder()
            .capacity(config.getLimit())
            .refillGreedy(config.getLimit(), config.getPeriod())
            .build();
        return Bucket.builder().addLimit(limit).build();
    }
}
```

Notice karo — login endpoint pe sirf 5/min hai (bruteforce se bachne ke liye), lekin orders pe 100/min (kyunki genuine users bhi frequently orders check karte hain). Ye per-endpoint tuning hi asli power hai — Zomato jaise app mein "restaurant search" pe zyada relaxed limit hoga, lekin "OTP verify" pe bahut tight limit hoga.

### Distributed rate limiting — Redis-backed Bucket4j

Ab socho tumhara app single instance pe nahi, balki 5 pods mein chal raha hai (Kubernetes pe). Agar har pod apna local `Caffeine` cache use kare, toh ek attacker easily limit bypass kar sakta hai — bas requests ko round-robin karke different pods pe bhej de, aur har pod independently uska count karega. Isiliye multi-instance deployments mein state **shared** honi chahiye — yahi Redis ka kaam hai:

```java
@Configuration
public class RedisRateLimitConfig {

    @Bean
    public ProxyManager<String> bucketProxyManager(RedissonClient redisson) {
        return Bucket4jRedisson.casBasedBuilder(redisson).build();
    }
}

@Service
@RequiredArgsConstructor
public class DistributedRateLimitService {

    private final ProxyManager<String> proxyManager;

    public RateLimitResult tryConsume(String key, BandwidthConfig config) {
        BucketConfiguration bucketConfig = BucketConfiguration.builder()
            .addLimit(Bandwidth.builder()
                .capacity(config.getLimit())
                .refillGreedy(config.getLimit(), config.getPeriod())
                .build())
            .build();

        Bucket bucket = proxyManager.builder()
            .build(key, () -> bucketConfig);

        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);
        // ... same as before
    }
}
```

> [!tip]
> Redis ke saath, bucket ka state saare instances mein shared hota hai. Lekin iska tradeoff hai — har rate limit check ab ek Redis round trip ban jata hai (~1ms). Toh auth endpoints aur critical paths pe Redis use karo; high-throughput business endpoints ke liye local Bucket4j hi kaafi hai. Har check pe Redis maarna zyada overhead ban sakta hai agar traffic bahut zyada hai.

### Spring Cloud Gateway `RequestRateLimiter` — gateway level pe

Agar tumhare paas API gateway hai (jaise Spring Cloud Gateway), toh request app tak pahunche usse pehle hi wahan limit laga sakte ho:

```yaml
# application.yml — Spring Cloud Gateway
spring:
  cloud:
    gateway:
      routes:
        - id: orders-service
          uri: lb://orders-service
          predicates:
            - Path=/api/orders/**
          filters:
            - name: RequestRateLimiter
              args:
                redis-rate-limiter.replenishRate: 100     # tokens/sec added
                redis-rate-limiter.burstCapacity:  200    # max bucket size
                redis-rate-limiter.requestedTokens: 1
                key-resolver: "#{@userKeyResolver}"
```

```java
@Bean
public KeyResolver userKeyResolver() {
    return exchange -> {
        String userId = exchange.getRequest().getHeaders().getFirst("X-User-ID");
        return userId != null
            ? Mono.just("user:" + userId)
            : Mono.just("ip:" + exchange.getRequest().getRemoteAddress().getAddress().getHostAddress());
    };
}
```

**Gateway vs Application-level rate limiting — kaunsa kab use karna hai?**

| | Gateway | Application |
|---|---|---|
| Latency | Kam (routing se pehle hi reject ho jata hai) | Thodi zyada |
| Granularity | Route-level | Method-level |
| Context | Limited (default mein auth info nahi hota) | Full security context |
| Bypass risk | Agar service directly expose ho jaye toh bypass ho sakta hai | Hamesha enforce hota hai |
| Best for | Public API, DDoS-adjacent abuse | Business logic rate limits |

> [!tip]
> **Dono use karo.** Gateway limits network perimeter ko protect karte hain. Application limits business rules enforce karte hain (jaise "ek user 1 minute mein max 3 approvals kar sakta hai", chahe backend mein kitne bhi instances ho). Ye bilkul waise hi hai jaise CRED app mein OTP resend ki limit gateway pe bhi hai aur app service ke andar bhi — dono layers mil kar protect karti hain.

---

## Login Fail Hone Par Account Lockout

Ab baat karte hain ek aur zaruri cheez ki — agar koi attacker tumhare user ka password guess karne ki koshish kare (brute force / credential stuffing), toh usse rokna hoga. Ye kaise karte hain?

```java
@Service
@RequiredArgsConstructor
public class LoginAttemptService {

    private final Cache<String, LoginAttemptInfo> attemptCache =
        Caffeine.newBuilder()
            .expireAfterWrite(1, TimeUnit.HOURS)
            .maximumSize(100_000)
            .build();

    // Thresholds
    private static final int SOFT_LOCK_THRESHOLD = 5;   // show CAPTCHA
    private static final int HARD_LOCK_THRESHOLD = 10;  // lock account
    private static final Duration LOCK_DURATION  = Duration.ofMinutes(15);

    public void recordFailure(String email) {
        LoginAttemptInfo info = attemptCache.get(email,
            k -> new LoginAttemptInfo());
        info.incrementFailures();
        info.setLastFailureAt(Instant.now());
        attemptCache.put(email, info);

        if (info.getFailures() >= HARD_LOCK_THRESHOLD) {
            lockAccountInDb(email);           // persistent lock, survives restart
            publishEvent(new AccountLockedEvent(email, info.getFailures()));
        }
    }

    public void recordSuccess(String email) {
        attemptCache.invalidate(email);
        unlockAccountInDb(email);
    }

    public LockStatus checkStatus(String email) {
        LoginAttemptInfo info = attemptCache.getIfPresent(email);
        if (info == null) return LockStatus.CLEAR;

        if (info.getFailures() >= HARD_LOCK_THRESHOLD) {
            Duration lockedFor = Duration.between(info.getLastFailureAt(), Instant.now());
            if (lockedFor.compareTo(LOCK_DURATION) < 0) {
                return LockStatus.hardLocked(LOCK_DURATION.minus(lockedFor));
            } else {
                // Auto-unlock after duration
                attemptCache.invalidate(email);
                unlockAccountInDb(email);
                return LockStatus.CLEAR;
            }
        }

        if (info.getFailures() >= SOFT_LOCK_THRESHOLD) {
            return LockStatus.CAPTCHA_REQUIRED;
        }
        return LockStatus.CLEAR;
    }

    // Exponential backoff response — tell the client how long to wait
    public Duration getBackoffDuration(String email) {
        LoginAttemptInfo info = attemptCache.getIfPresent(email);
        if (info == null) return Duration.ZERO;
        int failures = info.getFailures();
        // 0: 0s, 1: 1s, 2: 2s, 3: 4s, 4: 8s, 5+: 30s
        long seconds = failures < 5 ? (long) Math.pow(2, failures - 1) : 30;
        return Duration.ofSeconds(Math.max(0, seconds));
    }
}
```

Yahan do thresholds hain: 5 failures pe CAPTCHA dikhao (soft lock — ye distinguish karta hai ki insaan hai ya bot), aur 10 failures pe account 15 minute ke liye poori tarah lock kar do (hard lock). Ye ek staged approach hai — pehle thoda friction, phir poora block.

> [!warning]
> **Username enumeration via lockout timing.** Agar locked accounts fast response dete hain (turant 423 status) lekin unknown accounts slow response dete hain (attempt + 401), toh tumne attacker ko bata diya ki kaunse emails registered hain. Isse bachne ke liye, unknown accounts ke liye bhi ek artificial constant-time delay add karo taaki dono cases mein response time same lage. Socho jaise IRCTC pe agar "user not found" turant aaye lekin "wrong password" mein 2 second lage, toh attacker easily figure kar lega ki konsa email exist karta hai.

---

## Bot Aur Credential-Stuffing Se Bachne Ke Tarike

### Have I Been Pwned k-anonymity API

Ye ek bahut smart trick hai — jab user register kare ya password change kare, tum check kar sakte ho ki uska password kisi known data breach mein already leak toh nahi hua, **bina apna poora password kahin bheje**:

```java
@Service
public class PwnedPasswordService {

    private final RestClient restClient =
        RestClient.builder()
            .baseUrl("https://api.pwnedpasswords.com")
            .build();

    /**
     * Returns the number of times this password appears in known breaches.
     * Uses k-anonymity: only the first 5 chars of the SHA-1 hash are sent.
     */
    public int checkPassword(String password) {
        String sha1 = sha1Hex(password).toUpperCase();
        String prefix = sha1.substring(0, 5);
        String suffix = sha1.substring(5);

        String response = restClient.get()
            .uri("/range/{prefix}", prefix)
            .retrieve()
            .body(String.class);

        return Arrays.stream(response.split("\n"))
            .filter(line -> line.startsWith(suffix + ":"))
            .mapToInt(line -> Integer.parseInt(line.split(":")[1].trim()))
            .sum();
    }

    private String sha1Hex(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-1");
            byte[] hash = md.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException(e);
        }
    }
}

// Use during registration and password change:
@PostMapping("/auth/register")
public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest req) {
    int pwnedCount = pwnedPasswordService.checkPassword(req.password());
    if (pwnedCount > 0) {
        throw new ValidationException(
            "This password has appeared in " + pwnedCount +
            " data breaches. Please choose a different password."
        );
    }
    // ...
}
```

Kaise kaam karta hai ye k-anonymity trick? Password ka SHA-1 hash nikalo, phir sirf pehle 5 characters (prefix) HIBP ko bhejo. Woh tumhe us prefix se match hone wale saare hashes ka list de deta hai — asli match tum apni taraf locally check karte ho. Matlab poora password ya poora hash kabhi network pe nahi jaata — bilkul UPI PIN verify karne jaisa, jahan poora PIN kabhi third party ko nahi dikhta, sirf ek verification signal jaata hai.

### Device Fingerprinting Signals (Passive)

Poori fledged fingerprinting implement karna zaruri nahi hai — bas kuch signals collect karlo jo tumhara rules/ML system baad mein use kar sake:

```java
@Component
public class DeviceSignalCollector {

    public DeviceSignal collect(HttpServletRequest request) {
        return DeviceSignal.builder()
            .userAgent(request.getHeader("User-Agent"))
            .acceptLanguage(request.getHeader("Accept-Language"))
            .acceptEncoding(request.getHeader("Accept-Encoding"))
            .ip(getClientIp(request))
            .timeZoneOffset(request.getHeader("X-TZ-Offset"))  // custom header from JS
            .screenResolution(request.getHeader("X-Screen"))   // custom header from JS
            .build();
    }
}
```

Ye signals login history ke saath pair karo: agar user pehli baar naye country se, naye device se, ya kisi ajeeb time pe login kare (jaise 3 baje raat ko), toh alert bhejo. Ye bilkul waisa hi hai jaise tumhara bank ka app karta hai — "New device login detected" wala SMS.

---

## DDoS Upstream Ka Problem Hai

> [!note]
> Tumhara Spring Boot app volumetric DDoS attack se effectively khud ko defend nahi kar sakta. Attack scale itna bada hota hai (lakhon-crores requests/sec) ki tumhara app ka rate limiter kabhi chalega hi nahi — TCP/network stack hi overwhelm ho jayega tumhare code tak pahunchne se pehle.

**DDoS ko kaun handle karta hai:**
- **CDN with WAF** (Cloudflare, AWS CloudFront + WAF, Akamai)
- **Cloud provider DDoS protection** (AWS Shield, GCP Cloud Armor)
- **Upstream rate limiting** load balancer mein

**Tumhara app kya kar sakta hai:**
- Authenticated users ko rate limit karo (abusive-but-legitimate traffic)
- Circuit breakers implement karo (Resilience4j) taaki load gracefully shed ho sake
- Connections ko queue mein hamesha ke liye latkane ki bajaye `Retry-After` ke saath 503 return karo
- Health endpoint ko cheap rakho (koi DB call na ho)
- API gateway ke peeche deploy karo jo load shedding handle kare

Socho isse aise — DDoS ek tsunami hai, aur tumhara app ek chhota sa dukaan hai. Dukaan ka darwaza kitna bhi mazboot ho, tsunami ko woh nahi rok sakta. Uske liye tumhe upstream — dam, seawall (CDN/WAF) chahiye. Tumhara app sirf itna kar sakta hai ki jo genuine customers hain unhe fairly serve kare aur khud crash na ho.

---

## Express/TS Comparison

```typescript
// express-rate-limit
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';

const client = createClient({ url: process.env.REDIS_URL });

const limiter = rateLimit({
  windowMs:  60 * 1000,    // 1 minute
  max:       100,
  standardHeaders: true,
  legacyHeaders:   false,
  store: new RedisStore({ sendCommand: (...args) => client.sendCommand(args) }),
  keyGenerator: (req) => req.user?.id ?? req.ip,
});

app.use('/api/', limiter);

// Account lockout — similar concept, typically in auth service
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5,                      // 5 attempts
  skipSuccessfulRequests: true,
});
app.post('/auth/login', loginLimiter, loginHandler);
```

Bucket4j with Redis, Spring ka equivalent hai. Farak sirf itna hai: Spring mein tum per-user token bucket configuration per-endpoint set kar sakte ho, jabki `express-rate-limit` typically per-route hota hai aur usme kam granularity milti hai. Spring ke filter chain integration ka matlab hai ki rate limiting non-HTTP callers pe bhi apply hoti hai (haan, DI-invoked service methods ke liye tumhe alag approach chahiye hoga, jaise AOP aspect).

---

## Gotchas — Yahan Log Fasstе Hain

> [!danger]
> **`X-Forwarded-For` spoofing.** Agar tum `X-Forwarded-For` se IP nikal kar rate limit laga rahe ho, toh CDN ke peeche baitha koi attacker ye header spoof karke limit bypass kar sakta hai. `X-Forwarded-For` sirf tab trust karo jab tumhara reverse proxy/CDN *hamesha* isse set karta ho, aur attacker-provided values ko strip karta ho. Apne proxy ko configure karo ki woh header ko overwrite kare, append nahi.

> [!warning]
> **Distributed rate limit race conditions.** Redis-backed Bucket4j atomicity ke liye Lua scripts use karta hai, lekin bahut high concurrency mein thoda sa token overdraft dikh sakta hai. Rate limit thresholds design karte waqt 10-20% headroom rakho — thoda buffer, taaki edge cases mein bhi cheezein manage ho jaayein.

> [!warning]
> **Account lockout khud ek DoS vector ban sakta hai.** Agar attacker ko kisi user ka email pata hai, toh woh 10 failed logins trigger karke us user ko lock out kar sakta hai. Mitigations: N-2th attempt pe CAPTCHA dikhao, progressive delays lagao, user ko email/SMS se notify karo failed attempts ke baare mein, aur account sirf thodi der (15-30 minutes) ke liye hi lock karo, permanently nahi.

> [!warning]
> **Sirf gateway pe rate limiting** — agar tumhari service internally bhi accessible hai (dusri microservices, admin tools se), toh gateway-level limiting usse protect nahi karegi. Sabhi public-facing endpoints ke liye application-level limits bhi lagao, chahe unhe kaise bhi reach kiya jaaye.

---

## Production Checklist

- [ ] Saare public-facing endpoints ke liye rate limits define kiye hain (sirf `/auth/login` nahi)
- [ ] Multi-instance deployments ke liye distributed (Redis) rate limiting
- [ ] 429 responses pe `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `Retry-After` headers
- [ ] Configurable N failures ke baad account lockout (default: 10)
- [ ] Lockout duration documented hai (15-30 min auto-unlock, ya manual unlock via admin API)
- [ ] `Retry-After` ke through clients ko exponential backoff communicate kiya ja raha hai
- [ ] N/2 failures pe CAPTCHA escalation
- [ ] Registration aur password change pe Have I Been Pwned check
- [ ] Failed login events audit log mein publish ho rahe hain (dekho [[16-Audit-Logging-and-Compliance]])
- [ ] Per user per hour > N failed logins pe alert
- [ ] `X-Forwarded-For` header sirf known proxy IPs se validate/trust ho raha hai
- [ ] CDN/WAF level pe DDoS protection (Cloudflare, AWS Shield, etc.)
- [ ] Critical service dependencies pe circuit breaker (Resilience4j)

---

## Related

- [[01-Spring-Security-Concepts]]
- [[02-Configuration-and-SecurityFilterChain]]
- [[16-Audit-Logging-and-Compliance]]
- [[20-Production-Security-Checklist]]
- [[07-CSRF-CORS-Security]]
- [[03-Authentication-Methods]]
- [[01-Spring-Boot-Actuator]]
