---
tags: [security, production, rate-limiting, bucket4j, abuse-prevention, bot-defense, lockout]
aliases: [Rate Limiting, Bucket4j, Account Lockout, Abuse Prevention, Credential Stuffing]
stage: advanced
---

# Rate Limiting and Abuse Prevention

> [!info] For the Express/TS dev
> You've used `express-rate-limit` with a Redis store. Spring's equivalent is Bucket4j — same sliding-window/token-bucket semantics, same Redis backend option, but with tighter integration into the security filter chain. This note also covers account lockout, bot defenses, and what to send upstream vs handle in-app.

## Concept / mental model

### Algorithm comparison

| Algorithm | Behavior | Burst allowed | Memory | Use case |
|---|---|---|---|---|
| **Fixed window** | Count resets every N seconds | Yes (at boundary) | O(1) | Simple, high-throughput endpoints |
| **Sliding window log** | Count of requests in last N seconds | No | O(requests) | Accurate, lower traffic endpoints |
| **Sliding window counter** | Weighted average of two windows | Minimal | O(1) | Good balance; Redis-friendly |
| **Token bucket** | Tokens replenish at constant rate; burst up to bucket size | Yes (up to capacity) | O(1) | APIs with expected bursty clients |
| **Leaky bucket** | Queue drains at constant rate; queue overflow = reject | No | O(queue size) | Smooth output rate (video streaming, etc.) |

> [!tip]
> **Token bucket** (what Bucket4j implements) is the right choice for most REST APIs. It allows legitimate burst traffic (e.g., a user doing several quick actions) while protecting against sustained abuse.

---

## Code examples

### Bucket4j — per-endpoint, per-user rate limiting

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

### Distributed rate limiting — Redis-backed Bucket4j

For multi-instance deployments:

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
> With Redis, the bucket state is shared across all instances. The tradeoff: each rate limit check becomes a Redis round trip (~1ms). Use Redis for auth endpoints and critical paths; use local Bucket4j for high-throughput business endpoints.

### Spring Cloud Gateway `RequestRateLimiter` — gateway-level

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

**Gateway vs app-level rate limiting tradeoffs:**

| | Gateway | Application |
|---|---|---|
| Latency | Lower (rejected before routing) | Slightly higher |
| Granularity | Route-level | Method-level |
| Context | Limited (no auth by default) | Full security context |
| Bypass risk | Bypassed if service exposed directly | Always enforced |
| Best for | Public API, DDoS-adjacent abuse | Business logic rate limits |

> [!tip]
> Use both. Gateway limits protect the network perimeter. Application limits enforce business rules (e.g., max 3 approvals per minute per user, regardless of how many app instances exist).

---

## Account lockout after failed logins

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

> [!warning]
> **Username enumeration via lockout timing.** If locked accounts respond faster (immediate 423) than unknown accounts (attempt + 401), you've revealed which emails are registered. Add a constant-time artificial delay for unknown accounts to match the locked account response time.

---

## Bot and credential-stuffing defenses

### Have I Been Pwned k-anonymity API

Check if a submitted password appears in known breach databases, without sending the full password:

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

### Device fingerprinting signals (passive)

Don't implement full fingerprinting — just collect signals that your ML/rules system can use:

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

Pair device signals with login history: alert when a user logs in from a new country, new device, or at an unusual hour.

---

## DDoS is upstream's problem

> [!note]
> Your Spring Boot app cannot effectively defend against a volumetric DDoS attack. At attack scale (millions of requests/sec), your app's rate limiter never runs — the TCP/network stack is overwhelmed before your code executes.

**What handles DDoS:**
- **CDN with WAF** (Cloudflare, AWS CloudFront + WAF, Akamai)
- **Cloud provider DDoS protection** (AWS Shield, GCP Cloud Armor)
- **Upstream rate limiting** in the load balancer

**What your app CAN do:**
- Rate limit authenticated users (abusive-but-legitimate traffic)
- Implement circuit breakers (Resilience4j) to shed load gracefully
- Return 503 with `Retry-After` instead of letting connections queue forever
- Keep the health endpoint cheap (no DB call)
- Deploy behind an API gateway that handles load shedding

---

## Express/TS comparison

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

Bucket4j with Redis is the Spring equivalent. The key differences: Spring allows per-user token bucket configuration per endpoint, whereas `express-rate-limit` is typically per-route with less granularity. Spring's filter chain integration means rate limiting applies even to non-HTTP callers (though for DI-invoked service methods, you'd need a different approach).

---

## Gotchas

> [!danger]
> **`X-Forwarded-For` spoofing.** If you rate limit by IP from `X-Forwarded-For`, an attacker behind a CDN can spoof this header to bypass the limit. Only trust `X-Forwarded-For` if your reverse proxy/CDN *always* sets it and strips attacker-provided values. Configure your proxy to overwrite, not append, the header.

> [!warning]
> **Distributed rate limit race conditions.** Redis-backed Bucket4j uses Lua scripts for atomicity, but under very high concurrency you may see minor token overdraft. Design rate limit thresholds with 10–20% headroom.

> [!warning]
> **Account lockout as a DoS vector.** If an attacker knows a user's email, they can lock that user out by triggering 10 failed logins. Mitigations: CAPTCHA on failed attempt N-2, progressive delays, notify user of failed attempts via email/SMS, and only lock for short durations (15–30 minutes).

> [!warning]
> **Rate limiting at gateway only** — if your service is also accessible internally (other microservices, admin tools), gateway-level limiting doesn't protect it. Apply application-level limits for all public-facing endpoints regardless of how they're reached.

---

## Production checklist

- [ ] Rate limits defined for all public-facing endpoints (not just `/auth/login`)
- [ ] Distributed (Redis) rate limiting for multi-instance deployments
- [ ] `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `Retry-After` headers on 429 responses
- [ ] Account lockout after configurable N failures (default: 10)
- [ ] Lockout duration documented (15–30 min auto-unlock, or manual unlock via admin API)
- [ ] Exponential backoff communicated to clients via `Retry-After`
- [ ] CAPTCHA escalation at N/2 failures
- [ ] Have I Been Pwned check on registration and password change
- [ ] Failed login events published to audit log (see [[16-Audit-Logging-and-Compliance]])
- [ ] Alert on > N failed logins per user per hour
- [ ] `X-Forwarded-For` header validated/trusted only from known proxy IPs
- [ ] DDoS protection at CDN/WAF level (Cloudflare, AWS Shield, etc.)
- [ ] Circuit breaker (Resilience4j) on critical service dependencies

---

## Related

- [[01-Spring-Security-Concepts]]
- [[02-Configuration-and-SecurityFilterChain]]
- [[16-Audit-Logging-and-Compliance]]
- [[20-Production-Security-Checklist]]
- [[07-CSRF-CORS-Security]]
- [[03-Authentication-Methods]]
- [[01-Spring-Boot-Actuator]]
