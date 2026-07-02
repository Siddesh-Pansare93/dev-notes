# Multi-Tenancy Security

> [!info] Express/TS wale dev ke liye
> Node mein tum tenancy ko ek middleware se manage karte ho — `req.tenantId = getTenantFromSubdomain(req)` set karke pura request lifecycle mein pass karte ho. Spring ka approach concept mein same hi hai, bas do cheezon pe extra dhyaan dena padta hai — `ThreadLocal` vs virtual threads ka jhamela, aur persistence layer ke liye Hibernate ka multi-tenancy API.

## Concept / mental model

### Tenancy models — jaldi decide karo, baad mein migrate karna dard hai

Socho tum ek SaaS bana rahe ho — jaise Zomato ne restaurants ke liye ek "restaurant partner dashboard" banaya. Har restaurant (tenant) ka apna data hai — orders, menu, staff. Ab sawaal ye hai ki sab restaurants ka data ek hi database mein rakhoge, ya alag-alag? Yehi decision "tenancy model" kehlata hai.

| Model | Data isolation | Cost | Kab use karo |
|---|---|---|---|
| **Pool** (shared DB, shared schema) | Low — app khud filter karta hai | Low | SaaS MVP, saare tenants same type ke |
| **Bridge** (shared DB, schema-per-tenant) | Medium — DB `search_path` se enforce | Medium | Regulated industries, medium isolation chahiye |
| **Silo** (DB-per-tenant) | High — total isolation | High | Enterprise contracts, strict compliance |

Pool model matlab — ek hi table `orders` hai, aur usme `tenant_id` column hai jo batata hai kis restaurant ka order hai. Silo model matlab — Zomato aur Swiggy dono ke liye alag-alag database, koi mix-up ka chance nahi.

> [!warning]
> Pool model banane mein sabse sasta hai, lekin sabse dangerous bhi. Tenant filtering mein ek chhoti si bug — aur poora tenant data leak ho sakta hai. Isliye CI mein cross-tenant leakage explicitly test karo. Neeche testing section mein dekho.

---

## Tenant resolution strategies

### Kya hota hai?

Har request aane par sabse pehle ye pata karna padta hai — "ye request kis tenant (restaurant/company) ki hai?" Isko hi "tenant resolution" kehte hain. Chaar tareeke hain, chalo ek-ek karke dekhte hain.

### Strategy 1: Subdomain

Jaise `acme.myapp.com` — yahan `acme` hi tenant hai. IRCTC jaisa socho nahi, ye zyada CRED ya kisi B2B SaaS jaisa hai jahan har company ko apna subdomain milta hai.

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

URL ke andar hi tenant ID daal do:

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

Client apne request mein ek custom header bhejta hai:

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
> Header-based resolution internal APIs (jaise microservices ke beech) ke liye theek hai. Lekin public-facing API ke liye ye khatarnak hai — hamesha check karo ki header mein aaya `tenantId` authenticated JWT ke tenant se match karta hai ya nahi. Warna koi bhi user sirf header badal ke doosre tenant ka data access kar lega — jaise koi Zomato user apna "restaurant ID" header change karke doosre restaurant ka dashboard dekh le!

### Strategy 4: JWT claim (public APIs ke liye sabse secure)

Ye sabse safe tareeka hai kyunki tenant ID JWT ke andar signed hoti hai — user usse tamper nahi kar sakta.

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

## `TenantContext` — resolve kiye hue tenant ko store karna

### Kyun zaruri hai?

Tenant resolve toh ho gaya request ke shuru mein — filter mein. Lekin controller, service, repository — sab jagah ye tenant ID chahiye hoga, bina har jagah parameter pass kiye. Isi ke liye `TenantContext` banate hain — ek global-ish jagah jahan se current request ka tenant ID uthaya ja sake.

### Classic ThreadLocal (virtual threads wali warning neeche hai)

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
> **`ThreadLocal` ko `finally` block mein hamesha clear karo.** Spring ka default embedded Tomcat thread pool use karta hai, matlab threads reuse hote hain. Agar tum clear karna bhool gaye, toh usi thread pe agla request pichhle tenant ka context inherit kar lega. Socho — Acme company ka request process hua ek thread pe, uske baad wahi thread reuse hua Globex company ke request ke liye, aur Globex ko Acme ka data dikhne laga. Ye ek **catastrophic data leak** hai — bilkul CRED user ko doosre user ka transaction history dikhne jaisa.

### Virtual threads (Java 21) — `ThreadLocal` ka pitfall

Virtual threads (Project Loom, JDK 21+) platform threads ki tarah reuse **nahi** hote — har virtual thread ek fresh carrier hota hai. `ThreadLocal` ek single request ke *duration* ke liye theek se kaam karta hai. Lekin:

- `InheritableThreadLocal` child threads mein propagate hota hai — lekin virtual thread ke structured concurrency semantics ke saath ye unreliable ho jaata hai.
- `@Async` methods jo virtual threads use karte hain, woh calling thread ka `ThreadLocal` explicit configuration ke bina inherit nahi karte.

**Java 21+ ke liye recommended**: `ScopedValue` (JEP 446, Java 21 mein finalize hua) use karo:

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

`ScopedValue` immutable hai aur sirf uske scope ke andar hi bound rehta hai — scope khatam, context apne aap gone. `finally { clear() }` bhoolne ka risk hi nahi rehta.

---

## Hibernate multi-tenancy

### Pool model — discriminator column (simplest, sabse dangerous)

Har table mein `tenant_id` add karo:

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

Ye Hibernate ka `@Filter` mechanism har query mein automatically `WHERE tenant_id = :tenantId` daal deta hai — bina tumhare har repository method mein manually likhe. Node/Prisma se compare karo toh ye Prisma ke middleware jaisa hai jo har query ko intercept karke `where` clause mein tenant filter inject karta hai.

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

Yahan Postgres ka `search_path` switch karke Hibernate ko batate ho ki "is connection pe ab is tenant ka schema use karo." Ye pool aur silo ke beech ka middle ground hai.

---

## Row-Level Security (RLS) PostgreSQL ke saath — defense in depth

### Kyun zaruri hai?

Maan lo tumhara application-level filtering mein koi bug aa gaya — developer bhool gaya `WHERE tenant_id = ?` lagana kisi query mein. Agar sirf application filtering pe depend karoge, toh ye ek silent data leak ban jaayega. RLS ek **second layer** hai — DB khud enforce karta hai ki galat tenant ka data return na ho, chahe application ki query kaisi bhi ho.

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
> RLS cross-tenant leakage ko application ki bug se DB-level error bana deta hai. Chahe developer tenant filter lagana bhool jaaye, DB khud galat rows return karne se mana kar dega. Isko din 1 se hi enable karo — baad mein retrofit karna bahut painful hota hai. Ye bilkul waise hai jaise UPI mein har transaction pe do-factor verification hoti hai — ek layer fail bhi ho jaaye, doosri layer bacha leti hai.

---

## Cross-tenant leakage tests (must-have)

### Kyun zaruri hai?

Multi-tenancy mein sabse dangerous bug hai — ek tenant ka data doosre tenant ko dikh jaana. Ye bug production mein pakde jaane se pehle CI mein hi pakadna zaruri hai, kyunki ek baar data leak ho gaya toh trust wapas laana mushkil hai (socho agar Swiggy ke ek restaurant ko doosre restaurant ka order data dikhne lage — kitna bada issue ban jaayega).

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
> Ye tests har PR pe CI mein zaroor chalne chahiye. Cross-tenant data leak ek **critical security incident** hai — isko SQL injection jaisa hi seriously lo. Isko mechanically impossible banao, sirf "unlikely" mat maano.

---

## Tenant onboarding/offboarding security checklist

Naya tenant (naya restaurant partner, naya client) onboard karte waqt aur unko offboard karte waqt bhi security ka khayal rakhna padta hai — warna edge cases mein leaks ho sakte hain.

**Onboarding**:
- [ ] Tenant ID ko allowlist regex se validate karo (alphanumeric + hyphen)
- [ ] Schema/DB proper permissions ke saath create ho (silo model) ya seed data insert ho (pool)
- [ ] Tenant admin ke liye default roles provision ho
- [ ] Tenant creation ke liye audit log entry (kisne, kab)
- [ ] Tenant-specific endpoints pe rate limiting configuration lagi ho

**Offboarding**:
- [ ] Tenant ke sab active users ke sessions invalidate karo
- [ ] Tenant ke sab JWTs ke liye JWT blocklist update karo (ya short TTL pe trust karo)
- [ ] Data delete karne se pehle data export complete ho (GDPR right to portability)
- [ ] Data deletion confirm ho (GDPR right to erasure) with paper trail
- [ ] Credentials aur API keys rotate/revoke karo
- [ ] Audit logs compliance retention policy ke hisaab se retain karo (tenant ke saath delete mat karo)

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

Node ka `AsyncLocalStorage` bilkul Java 21 ke `ScopedValue` jaisa hi hai (aur async code ke liye `ThreadLocal` se behtar). Dono hi context ko async/virtual-thread execution chain ke through automatically propagate karte hain — tumhe manually pass karne ki zarurat nahi padti.

---

## Gotchas

> [!danger]
> **`finally { TenantContext.clear() }` bhool jaana.** Ye sabse common multi-tenancy bug hai. Jahan bhi tenant set karo, waha `finally` block mein clear karna hi hai — tests mein bhi. Ek leaked thread context agle request ko saare tenants ka data expose kar sakta hai.

> [!warning]
> **Schema names as SQL identifiers.** Bridge model mein schema name seedha SQL `SET search_path` ya `USE` statement mein jaata hai. Agar tenant ID `acme; DROP TABLE orders; --` ho gaya, toh catastrophe ho jaayega. Hamesha tenant IDs ko `[a-zA-Z0-9_-]+` regex se validate karo aur parameterized statements use karo ya rigorously sanitize karo.

> [!warning]
> **Hibernate second-level cache by default tenant-aware nahi hota.** Agar tum Ehcache ya Caffeine L2 cache ke roop mein use kar rahe ho, toh tenant A ke cached entities tenant B ko bhi dikh sakte hain. Ya toh L2 cache disable karo, ya tenant-aware cache implementation use karo, ya tenant ID ko cache key region mein add karo.

> [!warning]
> **`@Async` methods tenant context kho dete hain** agar tum explicitly pass nahi karte. Ya toh `tenantId` ko method parameter ki tarah pass karo, ya `DelegatingSecurityContextTaskExecutor` ko tenant context propagation ke saath extend karke configure karo.

---

## Production checklist

- [ ] Tenancy model (pool/bridge/silo) ADR mein document ho
- [ ] Tenant ID validation regex API boundary pe enforce ho
- [ ] Filter mein `finally` ke andar `TenantContext.clear()` ho
- [ ] Java 21: `ThreadLocal` ki jagah `ScopedValue` use ho
- [ ] Saare shared tables pe PostgreSQL RLS enabled ho (pool model)
- [ ] Hibernate filter SAARI queries ke liye enabled ho (koi unfiltered path na ho)
- [ ] Cross-tenant leakage tests har PR pe CI mein chale
- [ ] L2 cache tenant isolation verify ho
- [ ] `@Async` tenant context propagation test ho
- [ ] Tenant onboarding/offboarding checklists runbook mein ho
- [ ] Tenant creation/deletion events ke liye audit log ho

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
