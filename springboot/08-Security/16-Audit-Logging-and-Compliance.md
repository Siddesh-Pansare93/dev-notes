# Audit Logging and Compliance

> [!info] Express/TS wale dev ke liye
> Express mein tum auth events ko `winston` aur ek custom middleware se log karte ho — sab kuch manual hai, tumhe khud decide karna padta hai kahan pe `logger.info()` maarna hai. Spring Security mein built-in event publishers hote hain (`AuthenticationEventPublisher`, `AuthorizationEventPublisher`) jo structured events fire karte hain, tumhe bas unhe subscribe karna hai. Ye note poora pipeline cover karta hai: event capture → structured storage → tamper-evidence → compliance.

## Concept / Mental Model

### Audit kya karna hai — minimum viable audit log

Socho tum Zomato ke backend engineer ho. Ek din CEO puchta hai — "kal raat 2 baje kisi ne ek customer ka refund kyun approve kiya?" Agar tumhare paas audit log nahi hai, toh tumhare paas iska koi jawab nahi hai. Ye exactly wahi gap hai jo audit logging fill karta hai — **kisne, kya, kab, kahan se, kyun kiya** — sab kuch traceable hona chahiye.

| Category | Events |
|---|---|
| **Authentication** | Login success, login failure (+ reason), logout, lockout, password change, MFA enroll/bypass |
| **Authorization** | Access denied (403), permission check failures, privilege escalation attempts |
| **Data access** | PII reads (medical records, financial data, SSNs), bulk exports, admin reads of user data |
| **Admin actions** | User creation/deletion, role changes, config changes, API key generation/revocation |
| **Security events** | Suspicious patterns (many failed logins), IP blocklist hits, certificate changes |

> [!tip]
> *Jo attempt hua usko* log karo, sirf *jo success hua* usko nahi. Ek hi user ke liye 500 failed login attempts ka stream critical context hai — chahe breach hua ho ya nahi. Ye waisa hi hai jaise Paytm ka fraud detection system — agar koi ek account pe 500 baar wrong OTP try kar raha hai, toh chahe woh sab fail ho gaye ho, tumhe pata chalna chahiye ki kuch gadbad ho rahi hai.

---

## Code Examples

### Spring Security event publishers

Kya hota hai? Spring Security internally authentication aur authorization ke har step pe events fire karta hai. Tumhe bas `@EventListener` laga ke sunna hai — jaise Node.js mein EventEmitter pe `.on()` lagate ho, waise hi yahan.

```java
@Component
@RequiredArgsConstructor
@Slf4j
public class SecurityEventListener {

    private final AuditEventRepository auditRepo;
    private final ApplicationEventPublisher eventPublisher;

    // ─── Authentication events ─────────────────────────────────────────

    @EventListener
    public void onAuthSuccess(AuthenticationSuccessEvent event) {
        String principal = event.getAuthentication().getName();
        auditRepo.save(AuditEvent.builder()
            .type("AUTH_SUCCESS")
            .actor(principal)
            .detail("provider", getProvider(event.getAuthentication()))
            .result("SUCCESS")
            .build());
    }

    @EventListener
    public void onAuthFailure(AbstractAuthenticationFailureEvent event) {
        String principal = extractPrincipal(event.getAuthentication());
        String reason    = event.getException().getClass().getSimpleName();

        auditRepo.save(AuditEvent.builder()
            .type("AUTH_FAILURE")
            .actor(principal)
            .detail("reason", reason)
            .detail("ip", getCurrentIp())
            .result("FAILURE")
            .build());

        log.warn("Auth failure for [{}]: {} from IP {}",
            maskEmail(principal), reason, getCurrentIp());
    }

    @EventListener
    public void onAccountLocked(AuthenticationFailureLocked event) {
        // Separate event — account was already locked before this attempt
        auditRepo.save(AuditEvent.builder()
            .type("ACCOUNT_LOCKED_ACCESS_ATTEMPT")
            .actor(extractPrincipal(event.getAuthentication()))
            .result("BLOCKED")
            .build());
    }

    // ─── Authorization events ──────────────────────────────────────────

    @EventListener
    public void onAuthorizationDenied(AuthorizationDeniedEvent<?> event) {
        Authentication auth = event.getAuthentication().get();
        Object securedObj   = event.getObject();

        auditRepo.save(AuditEvent.builder()
            .type("AUTHZ_DENIED")
            .actor(auth != null ? auth.getName() : "anonymous")
            .detail("object", securedObj.toString())
            .detail("decision", event.getAuthorizationDecision().toString())
            .result("DENIED")
            .build());
    }
}
```

> [!warning]
> `AuthorizationDeniedEvent` Spring Security 6.3+ se available hai. Purane versions mein, apne `PermissionEvaluator` ya `@PreAuthorize` ke deny path se manually `ApplicationEventPublisher` use karke event publish karo.

### Audit event table — append-only, hash chain ke saath

Kyun zaruri hai? Agar koi attacker (ya khud tumhara disgruntled admin) database mein ghus jaaye aur audit records edit ya delete kar de, toh poora audit trail bekaar ho jaata hai. Isliye hum table ko **append-only** banate hain aur ek **hash chain** lagate hain — bilkul blockchain jaisa concept, jahan har row ka hash pichhle row ke hash pe depend karta hai. Isse koi bhi row beech mein change karega toh chain toot jaayegi.

```sql
CREATE TABLE audit_events (
    id            BIGSERIAL    PRIMARY KEY,
    type          VARCHAR(100) NOT NULL,
    actor         VARCHAR(255),          -- who performed the action
    resource_type VARCHAR(100),          -- what type of resource was accessed
    resource_id   VARCHAR(255),          -- which specific resource
    action        VARCHAR(50),           -- what action was performed
    result        VARCHAR(20)  NOT NULL, -- SUCCESS | FAILURE | DENIED
    ip_address    INET,
    user_agent    TEXT,
    details       JSONB,                 -- flexible key-value pairs
    tenant_id     VARCHAR(100),          -- for multi-tenant apps
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    prev_hash     CHAR(64),              -- SHA-256 of previous row (hash chain)
    row_hash      CHAR(64) GENERATED ALWAYS AS (
        encode(sha256((
            id::text || type || COALESCE(actor,'') ||
            COALESCE(resource_id,'') || result ||
            created_at::text || COALESCE(prev_hash,'')
        )::bytea), 'hex')
    ) STORED
);

-- Append-only enforcement
CREATE RULE no_update_audit AS ON UPDATE TO audit_events DO INSTEAD NOTHING;
CREATE RULE no_delete_audit AS ON DELETE TO audit_events DO INSTEAD NOTHING;

-- App user can only INSERT, not UPDATE/DELETE
REVOKE UPDATE, DELETE ON audit_events FROM app_user;
```

> [!tip]
> Hash chain ka matlab hai — row N ke saath chhedkhaani karogi toh row N+1, N+2, ... sabka hash bigad jaayega. Ek daily job chain integrity verify kar sakta hai aur alert bhej sakta hai. Ye ek full cryptographic audit trail nahi hai (jo attacker poora DB hi control karta hai woh chain rebuild kar sakta hai), lekin casual tampering rok deta hai aur zyadatar compliance auditors ko satisfy kar deta hai.

### Structured audit log format — who/what/when/where/why/result

Kya hota hai? Ye entity ek "template" hai jo har audit event ko same structure mein rakhta hai — jaise IRCTC ke ticket booking system mein har transaction ka ek fixed format hota hai (PNR, kisne book kiya, kab, kitne paise).

```java
@Entity
@Table(name = "audit_events")
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditEvent {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // WHO
    private String actor;          // "user@example.com" or "service:payment-service"
    private String actorId;        // User primary key

    // WHAT
    private String type;           // "ORDER_APPROVED", "USER_DELETED", "AUTH_FAILURE"
    private String resourceType;   // "Order", "User", "Config"
    private String resourceId;     // "42", "uuid-..."

    // HOW / ACTION
    private String action;         // "read", "write", "delete", "approve"

    // WHERE
    private String ipAddress;
    private String userAgent;
    private String requestId;      // correlation ID from MDC

    // WHY (optional — for admin actions)
    private String reason;         // "Customer support ticket #12345"

    // RESULT
    private String result;         // "SUCCESS", "FAILURE", "DENIED"
    private String errorCode;      // for failures

    // CONTEXT
    @Column(columnDefinition = "jsonb")
    @Convert(converter = JsonbConverter.class)
    private Map<String, String> details;

    private String tenantId;

    @Column(updatable = false)
    private Instant createdAt = Instant.now();
}
```

### Service methods ke andar programmatic audit

```java
@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepo;
    private final AuditService    auditService;

    @Transactional
    public Order approve(Long orderId, String reason) {
        Order order = orderRepo.findById(orderId).orElseThrow();
        order.setStatus(OrderStatus.APPROVED);
        Order saved = orderRepo.save(order);

        // Audit *after* successful DB write, in same transaction
        auditService.record(AuditEvent.builder()
            .type("ORDER_APPROVED")
            .resourceType("Order")
            .resourceId(String.valueOf(orderId))
            .action("approve")
            .reason(reason)
            .result("SUCCESS")
            .details(Map.of(
                "previousStatus", "PENDING",
                "newStatus",      "APPROVED",
                "amount",         order.getAmount().toString()
            ))
            .build());

        return saved;
    }
}
```

> [!warning]
> Audit event ko *usi transaction* mein likho jisme business operation ho raha hai. Agar tum audit ko alag transaction mein karte ho aur business operation rollback ho jaaye, toh tumhare paas ek galat audit record reh jaayega ki ek action hua jo actually hua hi nahi. Ulta bhi sach hai — agar audit insert fail hota hai, toh tum chahte ho ki business operation bhi rollback ho jaaye. Socho Swiggy ka order approve hota hai lekin audit log fail ho jaata hai — agar dono same transaction mein nahi hain, toh ho sakta hai order approve ho jaaye bina kisi trace ke ki kisne approve kiya.

---

## Logs mein sensitive fields ko redact karna

> [!danger]
> **Kabhi log mat karo**: passwords, raw JWTs, credit card numbers, SSNs, session tokens, OAuth2 client secrets, encryption keys. Ek baar ye logs mein chala gaya, toh woh log aggregation tools mein, backups mein, aur likely tumhare security perimeter ke bahar bhi pahunch jaayega. Socho ek engineer debug karte waqt `console.log(req.body)` jaisa kuch Java mein karta hai aur poori request body — password sahit — log ho jaati hai. Ye ek classic mistake hai jo har company mein hoti hai.

### Logback `MessageConverter` — likhne se pehle scrub karo

```java
public class SensitiveDataMaskingConverter extends MessageConverter {

    private static final Pattern JWT_PATTERN =
        Pattern.compile("eyJ[A-Za-z0-9_-]+\\.eyJ[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+");

    private static final Pattern BEARER_PATTERN =
        Pattern.compile("(?i)Bearer\\s+[A-Za-z0-9._~+/-]+=*");

    private static final Pattern CREDIT_CARD_PATTERN =
        Pattern.compile("\\b(?:\\d[ -]?){13,16}\\b");

    @Override
    public String convert(ILoggingEvent event) {
        String msg = event.getFormattedMessage();
        msg = JWT_PATTERN.matcher(msg).replaceAll("[JWT_REDACTED]");
        msg = BEARER_PATTERN.matcher(msg).replaceAll("Bearer [REDACTED]");
        msg = CREDIT_CARD_PATTERN.matcher(msg).replaceAll("[CC_REDACTED]");
        return msg;
    }
}
```

```xml
<!-- logback-spring.xml -->
<configuration>
    <conversionRule conversionWord="msg"
        converterClass="com.example.security.SensitiveDataMaskingConverter"/>

    <appender name="CONSOLE" class="ch.qos.logback.core.ConsoleAppender">
        <encoder>
            <pattern>%d{ISO8601} [%thread] %-5level %logger{36} - %msg%n</pattern>
        </encoder>
    </appender>
</configuration>
```

### Masking helpers

Ye woh chhote utility functions hain jo tum har jagah use karoge jahan sensitive data ko partially hide karke log karna ho — jaise CRED app tumhara card number `•••• •••• •••• 1234` dikhata hai, poora nahi.

```java
public final class LogMask {

    public static String email(String email) {
        if (email == null) return null;
        int at = email.indexOf('@');
        if (at <= 2) return "***" + email.substring(at);
        return email.charAt(0) + "***" + email.charAt(at - 1) + email.substring(at);
    }

    public static String token(String token) {
        if (token == null || token.length() < 8) return "[REDACTED]";
        return token.substring(0, 4) + "..." + token.substring(token.length() - 4);
    }

    public static String ip(String ip) {
        // For GDPR-compliant logging: truncate last octet
        if (ip == null) return null;
        int lastDot = ip.lastIndexOf('.');
        return lastDot > 0 ? ip.substring(0, lastDot) + ".0" : ip;
    }
}
```

---

## Compliance touchpoints (high level — legal advice nahi hai)

Ye section tumhe batayega ki tumhara audit log kin-kin compliance frameworks ke liye kaam aata hai. Agar tum kabhi ek enterprise SaaS product bana rahe ho — jaise koi B2B tool jo bade clients ko sell hota hai — toh ye teeno terms tumhe zaroor milenge.

### SOC 2

SOC 2 Type II ye demand karta hai ki tumhare security controls *continuously* operate ho rahe hain — sirf ek din ka snapshot kaafi nahi. Tumhara audit log hi primary evidence hai jo auditor ko dikhaya jaata hai.

- **CC6.1** — logical access controls: har login success/failure, role change log karo
- **CC6.3** — access removal: user deactivation, role revocation log karo
- **CC7.2** — system monitoring: N failed logins, unusual access patterns pe automated alerting
- **CC9.2** — vendor management: third-party systems ko API key usage log karo

### GDPR

- **Data access logs**: personal data kab access hua, kisne, kis purpose se (`why` field) — sab log karo
- **Right of erasure (Art. 17)**: deletion requests aur completion log karo; user data delete hone ke baad bhi *log entry* retain karo (agar anonymize kar diya jaaye toh log entry khud personal data nahi maani jaati)
- **Right to portability (Art. 20)**: data export requests log karo
- **Data breach (Art. 33)**: breach discover hone ke 72 hours ke andar notify karna zaruri hai. Tumhare audit logs hi breach timeline ka primary evidence hote hain.
- **Retention**: audit logs hamesha ke liye rakh nahi sakte — retention periods define karo (commonly 1–7 saal). Right-to-erasure ke against balance karo.

### HIPAA (US Healthcare)

- **§ 164.312(b)** — Audit controls: ePHI (electronic protected health information) ki access record aur examine karne ke liye hardware, software, procedural mechanisms
- Patient record ki har access log honi chahiye (kaun, kab, kya, kahan se)
- Log retention: minimum 6 saal
- Audit logs khud PHI maane jaate hain, isliye unhe bhi patient data jaisi hi security se protect karna hai

### Right-to-erasure vs audit log retention ka conflict

Ye ek interesting real-world dilemma hai. Jab koi user GDPR right-to-erasure use karta hai, tumhe uska personal data delete karna hai — lekin audit log records delete nahi kar sakte kyunki woh compliance aur legal protection ke liye zaruri hain.

Solution: erasure request process karte waqt `actor` field ko **pseudonymize** karo — matlab identity ko hash kar do, lekin record ka existence rehne do.

```sql
-- Replace identifying data with a pseudonym before deleting the user
UPDATE audit_events
SET actor = 'deleted-user-' || MD5(actor),
    details = details - 'email'  -- remove email from JSON
WHERE actor = 'user@example.com';

-- Then delete the user
DELETE FROM users WHERE email = 'user@example.com';
```

---

## Express/TS comparison

```typescript
// winston structured audit logger
import winston from 'winston';

const auditLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.File({ filename: 'audit.log' })]
});

// Express middleware
const auditMiddleware = (req, res, next) => {
  res.on('finish', () => {
    auditLogger.info({
      type: 'HTTP_REQUEST',
      actor: req.user?.email,
      action: `${req.method} ${req.path}`,
      result: res.statusCode < 400 ? 'SUCCESS' : 'FAILURE',
      ip: req.ip,
      statusCode: res.statusCode,
    });
  });
  next();
};
```

Spring ka `AuthenticationEventPublisher` aur `AuthorizationEventPublisher` manual `res.on('finish')` hooks ki jagah leta hai security events ke liye. Structured `AuditEvent` entity `winston` call ki jagah leta hai. Spring ka fayda ye hai — events security layer pe hi fire hote hain, HTTP layer pe nahi — isliye woh internal calls bhi capture karte hain (scheduled jobs, message consumers se aane wale calls bhi, jinke liye Express mein koi HTTP request hi nahi hota).

---

## Gotchas

> [!danger]
> **Passwords log karna.** Agar tumhara login form `username` + `password` submit karta hai aur tum debugging ke liye request bodies log karte ho, toh tumne plaintext passwords log kar diye. `@RequestBody` logging filters use karo jo `password`, `token`, `secret`, `authorization` jaise parameter names ko redact karein.

> [!warning]
> **Audit log ka size badhna.** Ek busy app mein audit logs bahut fast grow karte hain. `audit_events` table ko PostgreSQL mein month-wise partition karo aur purani partitions ko archive/compress karo. Isse apni primary DB disk full mat hone do.

> [!warning]
> **Async audit writes events lose kar sakte hain.** Agar tum audit events ko async processing ke liye ek queue pe publish karte ho aur app queue flush hone se pehle crash ho jaaye, toh events lose ho jaate hain. Compliance-critical events ke liye, same DB transaction mein synchronously likho. High-volume non-critical events (jaise page views) ke liye, async theek hai.

---

## Production checklist

- [ ] `AuthenticationEventPublisher` configured hai (Spring Security automatically fire karta hai)
- [ ] `AuthorizationDeniedEvent` listener implement kiya hai
- [ ] Audit table mein append-only constraints hain (`NO UPDATE`, `NO DELETE`)
- [ ] Hash chain implement kiya hai aur daily integrity check job chal raha hai
- [ ] Application logs mein sensitive fields mask ho rahe hain (password, token, JWT)
- [ ] Right-to-erasure requests pe audit logs ka PII pseudonymize ho raha hai
- [ ] Audit log retention policy documented hai (e.g., SOC 2 ke liye 7 saal)
- [ ] Partitioned audit table hai purani data ke liye archival strategy ke saath
- [ ] N minutes mein N failed logins pe alerting hai (dekho [[19-Rate-Limiting-and-Abuse-Prevention]])
- [ ] Bulk export events log ho rahe hain (kisne request kiya aur kab)
- [ ] Admin actions (role changes, user deletion) `reason` field ke saath log ho rahe hain
- [ ] Compliance mapping documented hai: kaunsa event kaunsa control satisfy karta hai

---

## Key Takeaways

- Audit log ka matlab hai — kisne, kya, kab, kahan se, kyun kiya — sab traceable hona chahiye. Sirf successful actions nahi, failed attempts bhi log karo.
- Spring Security ke `AuthenticationEventPublisher` aur `AuthorizationEventPublisher` security-layer pe events fire karte hain, isliye Express ke HTTP-middleware-based logging se zyada complete coverage milta hai (internal calls bhi capture hote hain).
- Audit table ko append-only banao (DB-level rules se UPDATE/DELETE block karo) aur ek hash chain lagao taki tampering detect ho sake.
- Audit event ko *hamesha* business operation ke saath same transaction mein likho — warna rollback/false-record ki mismatch ho sakti hai.
- Kabhi bhi passwords, JWTs, credit card numbers, ya secrets log mat karo — masking converters aur helper functions use karo.
- SOC 2, GDPR, HIPAA — teeno alag-alag cheezein maangte hain, lekin ek achha structured audit log teeno ko satisfy kar sakta hai.
- GDPR right-to-erasure aur audit retention ka conflict resolve karne ke liye pseudonymization use karo — record delete mat karo, sirf identity hata do.
- Audit logs bhi grow karte hain — table partitioning aur archival strategy plan karo, warna production disk full ho jaayega.

---

## Related

- [[01-Spring-Security-Concepts]]
- [[09-RBAC-Production-Patterns]]
- [[10-Permission-Based-Granular-Authorization]]
- [[15-Multi-Tenancy-Security]]
- [[19-Rate-Limiting-and-Abuse-Prevention]]
- [[20-Production-Security-Checklist]]
- [[01-Spring-Boot-Actuator]]
- [[02-Entity-Basics]]
