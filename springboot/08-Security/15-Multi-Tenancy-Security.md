---
tags: [security, production, multi-tenancy, tenant-isolation, hibernate, rls, postgresql]
aliases: [Multi-Tenancy, Tenant Isolation, Row-Level Security, TenantContext]
stage: advanced
---

# Multi-Tenancy Security

> [!info] For the Express/TS dev
> In Node you might manage tenancy with a middleware that sets `req.tenantId = getTenantFromSubdomain(req)` and passes it everywhere. Spring's approach is similar conceptually but needs careful handling around `ThreadLocal` vs virtual threads, and Hibernate's multi-tenancy API for the persistence layer.

## Concept / mental model

### Tenancy models — pick one early, migrate is painful

| Model | Data isolation | Cost | When to use |
|---|---|---|---|
| **Pool** (shared DB, shared schema) | Low — app-enforced | Low | SaaS MVP, homogeneous tenants |
| **Bridge** (shared DB, schema-per-tenant) | Medium — DB-enforced via search_path | Medium | Regulated industries, medium isolation need |
| **Silo** (DB-per-tenant) | High — total isolation | High | Enterprise contracts, strong compliance needs |

> [!warning]
> The pool model is cheapest to build but most dangerous: a single bug in tenant filtering exposes all tenant data. Test cross-tenant leakage explicitly in CI. See the testing section below.

---

## Tenant resolution strategies

### Strategy 1: Subdomain

```java
@Component
public class SubdomainTenantResolver implements TenantResolver {

    @Override
    public String resolveTenant(HttpServletRequest request) {
        String host = request.getServerName();   // e.g. "acme.myapp.com"
        String[] parts = host.split("\\.");
        if (parts.length >= 3) {
            return parts[0];  // "acme"
        }
        throw new TenantNotFoundException("Cannot resolve tenant from host: " + host);
    }
}
```

### Strategy 2: Path prefix

```
GET /tenants/{tenantId}/api/orders
```

```java
@Component
public class PathTenantResolver implements TenantResolver {

    private static final Pattern TENANT_PATTERN =
        Pattern.compile("^/tenants/([^/]+)/.*");

    @Override
    public String resolveTenant(HttpServletRequest request) {
        Matcher m = TENANT_PATTERN.matcher(request.getRequestURI());
        if (m.matches()) return m.group(1);
        throw new TenantNotFoundException("No tenant in path: " + request.getRequestURI());
    }
}
```

### Strategy 3: Header

```java
@Component
public class HeaderTenantResolver implements TenantResolver {

    public static final String TENANT_HEADER = "X-Tenant-ID";

    @Override
    public String resolveTenant(HttpServletRequest request) {
        String tenantId = request.getHeader(TENANT_HEADER);
        if (tenantId != null && !tenantId.isBlank()) return tenantId;
        throw new TenantNotFoundException("Missing " + TENANT_HEADER + " header");
    }
}
```

> [!danger]
> Header-based resolution is fine for internal APIs. For public-facing APIs, always validate that the tenantId in the header matches the tenant in the authenticated JWT — otherwise any user can switch tenants by changing the header.

### Strategy 4: JWT claim (most secure for public APIs)

```java
@Component
public class JwtTenantResolver implements TenantResolver {

    @Override
    public String resolveTenant(HttpServletRequest request) {
        // Authentication is already set in SecurityContext by JWT filter
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth instanceof JwtAuthenticationToken jwtToken) {
            String tenantId = jwtToken.getToken().getClaimAsString("tenant_id");
            if (tenantId != null) return tenantId;
        }
        throw new TenantNotFoundException("No tenant_id claim in JWT");
    }
}
```

---

## `TenantContext` — storing the resolved tenant

### Classic ThreadLocal (warning about virtual threads below)

```java
public final class TenantContext {

    private static final ThreadLocal<String> CURRENT_TENANT =
        new InheritableThreadLocal<>();

    private TenantContext() {}

    public static void setTenantId(String tenantId) {
        if (tenantId == null || tenantId.isBlank())
            throw new IllegalArgumentException("Tenant ID cannot be blank");
        CURRENT_TENANT.set(tenantId);
    }

    public static String getTenantId() {
        String tenantId = CURRENT_TENANT.get();
        if (tenantId == null)
            throw new TenantContextMissingException("No tenant in context");
        return tenantId;
    }

    public static void clear() {
        CURRENT_TENANT.remove();
    }
}
```

```java
// Set via Filter — runs before security, before controllers
@Component
@RequiredArgsConstructor
@Order(Ordered.HIGHEST_PRECEDENCE)
public class TenantResolutionFilter extends OncePerRequestFilter {

    private final TenantResolver tenantResolver;
    private final TenantRepository tenantRepo;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                     HttpServletResponse response,
                                     FilterChain filterChain)
            throws ServletException, IOException {

        try {
            String tenantId = tenantResolver.resolveTenant(request);

            // Validate tenant exists and is active
            if (!tenantRepo.existsByIdAndActive(tenantId, true)) {
                response.sendError(HttpServletResponse.SC_NOT_FOUND, "Tenant not found");
                return;
            }

            TenantContext.setTenantId(tenantId);
            filterChain.doFilter(request, response);

        } catch (TenantNotFoundException e) {
            response.sendError(HttpServletResponse.SC_BAD_REQUEST, e.getMessage());
        } finally {
            TenantContext.clear();  // CRITICAL — always clear to prevent leakage
        }
    }
}
```

> [!danger]
> **Always clear `ThreadLocal` in the `finally` block.** If you use a thread pool (which Spring's embedded Tomcat does by default), threads are reused. If you forget to clear, the *next* request on that thread inherits the previous tenant's context. This is a catastrophic data leak.

### Virtual threads in Java 21 — the `ThreadLocal` pitfall

Virtual threads (Project Loom, JDK 21+) are **not** reused like platform threads — each virtual thread is a fresh carrier. `ThreadLocal` works correctly for the *duration* of a single request. However:

- `InheritableThreadLocal` propagates to child threads — but virtual thread semantics make this unreliable with structured concurrency.
- `@Async` methods using virtual threads may not inherit the `ThreadLocal` from the calling thread without explicit configuration.

**Recommended for Java 21+**: Use `ScopedValue` (JEP 446, finalized in Java 21):

```java
// Java 21+ — ScopedValue is immutable and scope-bound
public final class TenantContext {
    public static final ScopedValue<String> TENANT_ID = ScopedValue.newInstance();

    public static String get() {
        if (!TENANT_ID.isBound())
            throw new TenantContextMissingException("No tenant in ScopedValue context");
        return TENANT_ID.get();
    }
}

// In filter: wrap the filter chain execution in a ScopedValue binding
ScopedValue.where(TenantContext.TENANT_ID, resolvedTenantId)
    .run(() -> filterChain.doFilter(request, response));
```

---

## Hibernate multi-tenancy

### Pool model — discriminator column (simplest, most dangerous)

Add `tenant_id` to every table:

```sql
ALTER TABLE orders ADD COLUMN tenant_id VARCHAR(50) NOT NULL;
CREATE INDEX idx_orders_tenant ON orders(tenant_id);
```

```java
@Entity
@FilterDef(name = "tenantFilter",
           parameters = @ParamDef(name = "tenantId", type = String.class))
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class Order {
    @Column(name = "tenant_id", nullable = false)
    private String tenantId;
    // ...
}

// Enable filter on each session (do this in an AOP aspect or JPA SessionFactory wrapper)
@Aspect
@Component
@RequiredArgsConstructor
public class TenantFilterAspect {

    private final EntityManager em;

    @Around("@within(org.springframework.stereotype.Repository)" +
            " || @within(org.springframework.stereotype.Service)")
    public Object applyTenantFilter(ProceedingJoinPoint pjp) throws Throwable {
        Session session = em.unwrap(Session.class);
        session.enableFilter("tenantFilter")
               .setParameter("tenantId", TenantContext.getTenantId());
        try {
            return pjp.proceed();
        } finally {
            session.disableFilter("tenantFilter");
        }
    }
}
```

### Schema-per-tenant (bridge model) — Hibernate `MultiTenantConnectionProvider`

```java
@Component
public class SchemaMultiTenantConnectionProvider
        implements MultiTenantConnectionProvider<String> {

    @Autowired
    private DataSource dataSource;

    @Override
    public Connection getConnection(String tenantIdentifier) throws SQLException {
        Connection conn = dataSource.getConnection();
        conn.createStatement()
            .execute("SET search_path TO tenant_" + sanitize(tenantIdentifier) + ", public");
        return conn;
    }

    @Override
    public void releaseConnection(String tenantIdentifier,
                                   Connection connection) throws SQLException {
        connection.createStatement()
            .execute("SET search_path TO public");
        connection.close();
    }

    private String sanitize(String tenantId) {
        // Prevent SQL injection in schema name
        if (!tenantId.matches("[a-zA-Z0-9_]+"))
            throw new SecurityException("Invalid tenant ID: " + tenantId);
        return tenantId;
    }

    // ... other MultiTenantConnectionProvider methods
}

@Component
public class TenantIdentifierResolver
        implements CurrentTenantIdentifierResolver<String> {

    @Override
    public String resolveCurrentTenantIdentifier() {
        return TenantContext.getTenantId();
    }

    @Override
    public boolean validateExistingCurrentSessions() {
        return true;
    }
}
```

---

## Row-Level Security (RLS) with PostgreSQL — defense in depth

Even if your application filtering has a bug, PostgreSQL RLS provides a second layer of enforcement at the DB level:

```sql
-- Enable RLS on the table
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders FORCE ROW LEVEL SECURITY;  -- applies to superusers too

-- Policy: each app connection can only see rows for its tenant
CREATE POLICY tenant_isolation ON orders
    USING (tenant_id = current_setting('app.tenant_id', true));

-- Create a dedicated app role (not superuser)
CREATE ROLE app_user LOGIN PASSWORD '...';
GRANT SELECT, INSERT, UPDATE, DELETE ON orders TO app_user;

-- Your app sets the tenant on each connection:
SET app.tenant_id = 'acme';  -- or via connection pool hook
```

```java
// Set PostgreSQL session variable via AOP or DataSource wrapper
@Bean
public DataSource tenantAwareDataSource(DataSource original) {
    return new TenantAwareDataSourceWrapper(original);
}

public class TenantAwareDataSourceWrapper extends DelegatingDataSource {
    @Override
    public Connection getConnection() throws SQLException {
        Connection conn = super.getConnection();
        String tenantId = TenantContext.getTenantId();
        try (var stmt = conn.createStatement()) {
            stmt.execute("SET app.tenant_id = '" +
                tenantId.replace("'", "''") + "'");  // escape single quotes
        }
        return conn;
    }
}
```

> [!tip]
> RLS makes cross-tenant leakage a DB-level error, not just an application bug. Even if a developer forgets to add a tenant filter, the DB refuses to return the wrong rows. Enable it from day one — retrofitting it later is painful.

---

## Cross-tenant leakage tests (must-have)

```java
@SpringBootTest
@TestMethodOrder(OrderAnnotation.class)
class CrossTenantLeakageTest {

    @Autowired private OrderRepository orderRepo;
    @Autowired private OrderService    orderService;

    @Test
    @Order(1)
    void setup() {
        // Create orders for tenant "acme" and tenant "globex"
        TenantContext.setTenantId("acme");
        Order acmeOrder = orderRepo.save(buildOrder("acme", "ACME order"));

        TenantContext.setTenantId("globex");
        Order globexOrder = orderRepo.save(buildOrder("globex", "Globex order"));
        TenantContext.clear();
    }

    @Test
    void acme_cannot_see_globex_orders() {
        TenantContext.setTenantId("acme");
        List<Order> orders = orderRepo.findAll();
        TenantContext.clear();

        assertThat(orders).allMatch(o -> "acme".equals(o.getTenantId()));
        assertThat(orders).noneMatch(o -> "globex".equals(o.getTenantId()));
    }

    @Test
    void globex_cannot_fetch_acme_order_by_id() {
        TenantContext.setTenantId("globex");
        // Should throw or return empty — must not return acme's order
        assertThatThrownBy(() -> orderService.findById(acmeOrderId))
            .isInstanceOf(EntityNotFoundException.class);
        TenantContext.clear();
    }
}
```

> [!danger]
> These tests must run in CI on every PR. A cross-tenant data leak is a critical security incident — treat it like SQL injection. Make it mechanically impossible, not just "unlikely."

---

## Tenant onboarding/offboarding security checklist

**Onboarding**:
- [ ] Tenant ID is validated against an allowlist regex (alphanumeric + hyphen)
- [ ] Schema/DB created with proper permissions (silo model) or seed data inserted (pool)
- [ ] Default roles provisioned for the tenant admin
- [ ] Audit log entry for tenant creation (who, when)
- [ ] Rate limiting configuration applied to tenant-specific endpoints

**Offboarding**:
- [ ] All active sessions for tenant users invalidated
- [ ] JWT blocklist updated for all tenant JWTs (or short TTL trusted)
- [ ] Data export completed before deletion (GDPR right to portability)
- [ ] Data deletion confirmed (GDPR right to erasure) with a paper trail
- [ ] Credentials and API keys rotated/revoked
- [ ] Audit logs retained per compliance retention policy (don't delete with the tenant)

---

## Express/TS comparison

```typescript
// Express middleware approach
import { AsyncLocalStorage } from 'async_hooks';

const tenantStorage = new AsyncLocalStorage<string>();

// Middleware
const resolveTenant = (req: Request, res: Response, next: NextFunction) => {
  const tenantId = extractTenantId(req);
  tenantStorage.run(tenantId, () => next());
};

// Access anywhere in the call chain
export const getCurrentTenantId = () => {
  const id = tenantStorage.getStore();
  if (!id) throw new Error('No tenant context');
  return id;
};

// Prisma query with tenant filter
async function findOrders() {
  const tenantId = getCurrentTenantId();
  return prisma.order.findMany({ where: { tenantId } });
}
```

Node's `AsyncLocalStorage` is the exact equivalent of `ScopedValue` in Java 21 (and superior to `ThreadLocal` for async code). Both propagate context through the async/virtual-thread execution chain automatically.

---

## Gotchas

> [!danger]
> **Missing `finally { TenantContext.clear() }`.** The most common multi-tenancy bug. Every place you set the tenant must clear it in a `finally` block — including tests. One leaked thread context exposes all tenants' data to the next request.

> [!warning]
> **Schema names as SQL identifiers.** In the bridge model, the schema name goes into a SQL `SET search_path` or `USE` statement. A tenant ID of `acme; DROP TABLE orders; --` would be catastrophic. Always validate tenant IDs against `[a-zA-Z0-9_-]+` and use parameterized statements or sanitize rigorously.

> [!warning]
> **Hibernate second-level cache is not tenant-aware by default.** If you use Ehcache or Caffeine as L2 cache, cached entities from tenant A are visible to tenant B. Either disable L2 cache, use a tenant-aware cache implementation, or add tenant ID to the cache key region.

> [!warning]
> **`@Async` methods lose the tenant context** if you don't explicitly pass it. Either pass `tenantId` as a method parameter, or configure `DelegatingSecurityContextTaskExecutor` extended with tenant context propagation.

---

## Production checklist

- [ ] Tenancy model (pool/bridge/silo) documented in ADR
- [ ] Tenant ID validation regex enforced at API boundary
- [ ] `TenantContext.clear()` in `finally` in the filter
- [ ] Java 21: `ScopedValue` used instead of `ThreadLocal`
- [ ] PostgreSQL RLS enabled on all shared tables (pool model)
- [ ] Hibernate filter enabled for ALL queries (no unfiltered paths)
- [ ] Cross-tenant leakage tests run in CI on every PR
- [ ] L2 cache tenant isolation verified
- [ ] `@Async` tenant context propagation tested
- [ ] Tenant onboarding/offboarding checklists in runbook
- [ ] Audit log for tenant creation/deletion events

---

## Related

- [[09-RBAC-Production-Patterns]]
- [[10-Permission-Based-Granular-Authorization]]
- [[16-Audit-Logging-and-Compliance]]
- [[01-Spring-Security-Concepts]]
- [[02-Configuration-and-SecurityFilterChain]]
- [[02-Entity-Basics]]
- [[05-Transactions]]
- [[05-Application-Properties]]
