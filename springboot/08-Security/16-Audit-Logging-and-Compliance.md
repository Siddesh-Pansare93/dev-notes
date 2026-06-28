---
tags: [security, production, audit, logging, compliance, soc2, gdpr, hipaa]
aliases: [Audit Logging, Compliance Logging, Security Audit, AuthenticationEventPublisher]
stage: advanced
---

# Audit Logging and Compliance

> [!info] For the Express/TS dev
> In Express you log auth events with `winston` and a custom middleware. Spring Security has built-in event publishers (`AuthenticationEventPublisher`, `AuthorizationEventPublisher`) that fire structured events you just need to subscribe to. This note covers the full stack: event capture → structured storage → tamper-evidence → compliance.

## Concept / mental model

### What to audit — the minimum viable audit log

| Category | Events |
|---|---|
| **Authentication** | Login success, login failure (+ reason), logout, lockout, password change, MFA enroll/bypass |
| **Authorization** | Access denied (403), permission check failures, privilege escalation attempts |
| **Data access** | PII reads (medical records, financial data, SSNs), bulk exports, admin reads of user data |
| **Admin actions** | User creation/deletion, role changes, config changes, API key generation/revocation |
| **Security events** | Suspicious patterns (many failed logins), IP blocklist hits, certificate changes |

> [!tip]
> Log *what was attempted*, not just what succeeded. A stream of 500 failed login attempts for the same user is critical context — even if no breach occurred.

---

## Code examples

### Spring Security event publishers

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
> `AuthorizationDeniedEvent` is available from Spring Security 6.3+. For earlier versions, use `ApplicationEventPublisher` to manually publish events from your `PermissionEvaluator` or `@PreAuthorize` deny paths.

### Audit event table — append-only with hash chain

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
> The hash chain means tampering with row N breaks the hash of row N+1, N+2, ... A daily job can verify chain integrity and alert. This is not a full cryptographic audit trail (an attacker who owns the DB can rebuild the chain) but it prevents casual tampering and satisfies many compliance auditors.

### Structured audit log format — who/what/when/where/why/result

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

### Programmatic audit in service methods

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
> Write audit events in the *same transaction* as the business operation. If you audit in a separate transaction and the business operation rolls back, you get a false audit record of an action that didn't happen. Conversely, if the audit insert fails, you want the business operation to also roll back.

---

## Sensitive-field redaction in logs

> [!danger]
> **NEVER log**: passwords, raw JWTs, credit card numbers, SSNs, session tokens, OAuth2 client secrets, encryption keys. Once in logs, they're in log aggregation tools, backups, and likely outside your security perimeter.

### Logback `MessageConverter` — scrub before writing

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

## Compliance touchpoints (high level — not legal advice)

### SOC 2

SOC 2 Type II requires evidence that security controls are operating continuously. Your audit log is the primary evidence artifact.

- **CC6.1** — logical access controls: log every login success/failure, role change
- **CC6.3** — access removal: log user deactivation, role revocation
- **CC7.2** — system monitoring: automated alerting on N failed logins, unusual access patterns
- **CC9.2** — vendor management: log API key usage to third-party systems

### GDPR

- **Data access logs**: log when personal data is accessed, by whom, for what purpose (`why` field)
- **Right of erasure (Art. 17)**: log deletion requests and completion; retain *the log entry* even after the user data is deleted (log entry itself is not personal data if anonymized)
- **Right to portability (Art. 20)**: log data export requests
- **Data breach (Art. 33)**: within 72 hours of discovering a breach, you must notify. Your audit logs are the primary source of breach timeline evidence.
- **Retention**: you can't keep audit logs forever — define retention periods (commonly 1–7 years). Balance against right-to-erasure.

### HIPAA (US Healthcare)

- **§ 164.312(b)** — Audit controls: hardware, software, and procedural mechanisms to record and examine access to ePHI
- Every access to a patient record must be logged (who, when, what, from where)
- Log retention: minimum 6 years
- Audit logs themselves are PHI and must be protected with the same controls as patient data

### Right-to-erasure vs audit log retention conflict

When a user exercises GDPR right-to-erasure, you must delete their personal data — but you cannot delete audit log records because they're required for compliance and legal protection.

Resolution: **pseudonymize** the `actor` field when processing an erasure request:

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

Spring's `AuthenticationEventPublisher` and `AuthorizationEventPublisher` replace manual `res.on('finish')` hooks for security events. The structured `AuditEvent` entity replaces the `winston` call. Spring's advantage: the events fire at the security layer itself — not at the HTTP layer — so they capture internal calls too (from scheduled jobs, message consumers).

---

## Gotchas

> [!danger]
> **Logging passwords.** If your login form submits `username` + `password` and you log request bodies for debugging, you've logged plaintext passwords. Use `@RequestBody` logging filters that redact parameter names like `password`, `token`, `secret`, `authorization`.

> [!warning]
> **Audit log growth.** In a busy app, audit logs grow fast. Partition the `audit_events` table by month in PostgreSQL and archive/compress old partitions. Don't let it fill your primary DB disk.

> [!warning]
> **Async audit writes can lose events.** If you publish audit events to a queue for async processing and the app crashes before the queue is flushed, you lose events. For compliance-critical events, write synchronously in the same DB transaction. For high-volume non-critical events (page views), async is fine.

---

## Production checklist

- [ ] `AuthenticationEventPublisher` configured (Spring Security fires automatically)
- [ ] `AuthorizationDeniedEvent` listener implemented
- [ ] Audit table has append-only constraints (`NO UPDATE`, `NO DELETE`)
- [ ] Hash chain implemented and daily integrity check job running
- [ ] Sensitive fields masked in application logs (password, token, JWT)
- [ ] PII in audit logs pseudonymized on right-to-erasure requests
- [ ] Audit log retention policy documented (e.g., 7 years for SOC 2)
- [ ] Partitioned audit table with archival strategy for old data
- [ ] Alerting on N failed logins in T minutes (see [[19-Rate-Limiting-and-Abuse-Prevention]])
- [ ] Bulk export events logged with who requested and when
- [ ] Admin actions (role changes, user deletion) logged with `reason` field
- [ ] Compliance mapping documented: which events satisfy which controls

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
