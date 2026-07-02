# RBAC — Production Patterns

> [!info] Express/TS wale dev ke liye
> Tumne pehle `checkRole('admin')` jaisa middleware likha hoga, ya `accesscontrol` / `casbin` jaisi libraries use ki hongi. Spring Security ka model thoda zyada verbose hai lekin zyada powerful bhi — har principal (yaani logged-in user) apne saath `Collection<GrantedAuthority>` carry karta hai, aur har access decision bas un strings ka comparison hai. Ye note isi cheez ko *production scale* pe sahi tarike se karne ke baare mein hai — sirf compile karwane ke baare mein nahi.

## Concept / Mental Model

### Roles vs Authorities vs Scopes — clear definitions

Kya hota hai in teeno mein? Confusion yahin se shuru hoti hai — samjho ek baar clearly:

| Term | Spring model | Example string | Kaise check karein |
|---|---|---|---|
| **Role** | `GrantedAuthority` with `ROLE_` prefix | `ROLE_ADMIN` | `hasRole("ADMIN")` |
| **Authority / Permission** | `GrantedAuthority` without prefix | `order:approve` | `hasAuthority("order:approve")` |
| **Scope** (OAuth2) | `GrantedAuthority` with `SCOPE_` prefix | `SCOPE_read:orders` | `hasAuthority("SCOPE_read:orders")` |

`hasRole("ADMIN")` bas syntactic sugar hai — ye internally `ROLE_` prefix laga deta hai aur `hasAuthority("ROLE_ADMIN")` ko call kar deta hai.
`hasAuthority("order:approve")` exact string check karta hai, koi prefix magic nahi.

> [!danger]
> **Classic prefix trap**: agar tumne `hasRole("ROLE_ADMIN")` likh diya, to ye check ban jaata hai `ROLE_ROLE_ADMIN` ka — jo silently hamesha false rahega, koi error bhi nahi milegi. Hamesha `hasRole("ADMIN")` ya `hasAuthority("ROLE_ADMIN")` likho. Ek style pick karo aur dusri ko ArchUnit test se ban kar do team mein.

### Poora authority model

```
User  ──<  user_roles  >──  Role  ──<  role_permissions  >──  Permission
```

Jaise Zomato pe ek restaurant partner ke paas "orders manage karo", "menu edit karo" jaise alag-alag permissions hote hain jo unke role (owner, manager, staff) se aate hain — waise hi yahan authentication ke time pe tumhara app user ke **saare** permissions load karta hai, unko flatten karke `Authentication` object ke authority list mein daal deta hai, aur us request ke baaki lifecycle mein dobara DB nahi hit karta. Matlab filter chain uske baad pure in-memory chalta hai — fast aur predictable.

---

## Schema Design (PostgreSQL DDL)

```sql
-- Immutable permission catalog — never delete, only add (soft-delete if needed)
CREATE TABLE permissions (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,   -- e.g. "order:approve"
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE roles (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(50)  NOT NULL UNIQUE,   -- always stored as "ROLE_ADMIN"
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE role_permissions (
    role_id       BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id BIGINT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE users (
    id            BIGSERIAL PRIMARY KEY,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    enabled       BOOLEAN      NOT NULL DEFAULT TRUE,
    locked        BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE user_roles (
    user_id    BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id    BIGINT      NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    granted_by BIGINT      REFERENCES users(id),  -- audit trail
    expires_at TIMESTAMPTZ,                        -- NULL = permanent
    PRIMARY KEY (user_id, role_id)
);

-- Hot path: load all permissions for a user (one JOIN)
CREATE INDEX idx_user_roles_user       ON user_roles(user_id);
CREATE INDEX idx_role_permissions_role ON role_permissions(role_id);
-- Cleanup expired grants
CREATE INDEX idx_user_roles_expires    ON user_roles(expires_at)
    WHERE expires_at IS NOT NULL;
```

> [!tip]
> `granted_by` aur `expires_at` columns day-one se hi add kar do. Audit trail incident ke time tumhari jaan bachata hai ("kisne kab ye access diya tha?"), aur `expires_at` contractors ya temporary on-call elevation (jaise kisi ko 2 din ke liye admin access) ko bina manual cleanup ticket ke handle kar deta hai.

---

## Code Examples

### Auth time pe authorities load karna — `UserDetailsService`

Jaise Swiggy app login hote hi tumhara pura profile — address, saved cards, preferences — ek baar mein fetch kar leta hai taaki baar-baar server hit na karna pade, waise hi yahan login ke time hi saari permissions ek JOIN query se load ho jaati hain:

```java
@Service
@RequiredArgsConstructor
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UserRepository        userRepo;
    private final PermissionRepository  permissionRepo;

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String email)
            throws UsernameNotFoundException {

        User user = userRepo.findByEmailWithRoles(email)
            .orElseThrow(() -> new UsernameNotFoundException("Not found: " + email));

        // Single JOIN query — no N+1
        List<GrantedAuthority> authorities = permissionRepo
            .findAllByUserId(user.getId())
            .stream()
            .map(p -> (GrantedAuthority) new SimpleGrantedAuthority(p.getName()))
            .collect(Collectors.toCollection(ArrayList::new));

        // Also add ROLE_ strings so hasRole() checks still work
        user.getRoles().stream()
            .map(r -> (GrantedAuthority) new SimpleGrantedAuthority(r.getName()))
            .forEach(authorities::add);

        return new org.springframework.security.core.userdetails.User(
            user.getEmail(),
            user.getPasswordHash(),
            user.isEnabled(),
            /* accountNonExpired     */ true,
            /* credentialsNonExpired */ true,
            /* accountNonLocked      */ !user.isLocked(),
            authorities
        );
    }
}
```

```java
@Repository
public interface PermissionRepository extends JpaRepository<Permission, Long> {

    @Query("""
        SELECT DISTINCT p FROM Permission p
        JOIN p.roles r
        JOIN r.users u
        WHERE u.id = :userId
        """)
    List<Permission> findAllByUserId(@Param("userId") Long userId);
}
```

> [!warning]
> Yahan `findAllByUserId` ek hi query mein saara data laata hai. Agar tum galti se loop mein har role ke liye alag query maarte (N+1 problem), to 5 roles wale user ke liye 5 extra DB calls lag jaatin — production mein ye slowly sab kuch dheema kar deta hai. Ek JOIN query hamesha better hai.

### JWT se authorities nikalna — `JwtAuthenticationConverter`

Stateless JWT-based APIs ke liye (chahe tumhara apna token ho ya Keycloak/Auth0 ka):

```java
@Bean
public JwtAuthenticationConverter jwtAuthenticationConverter() {
    var converter = new JwtAuthenticationConverter();

    converter.setJwtGrantedAuthoritiesConverter(jwt -> {
        List<GrantedAuthority> authorities = new ArrayList<>();

        // Custom claim: ["order:read","order:approve"]
        List<String> permissions = jwt.getClaimAsStringList("permissions");
        if (permissions != null) {
            permissions.stream()
                .map(SimpleGrantedAuthority::new)
                .forEach(authorities::add);
        }

        // Custom claim: ["ADMIN","USER"]  — normalise to ROLE_ prefix
        List<String> roles = jwt.getClaimAsStringList("roles");
        if (roles != null) {
            roles.stream()
                .map(r -> r.startsWith("ROLE_") ? r : "ROLE_" + r)
                .map(SimpleGrantedAuthority::new)
                .forEach(authorities::add);
        }

        return authorities;
    });

    return converter;
}
```

> [!danger]
> **JWT role staleness ka masla**: Socho tumne kisi user ko ADMIN bana diya. Lekin uska purana 24-hour wala JWT abhi bhi `USER` carry kar raha hai — jab tak wo dobara login nahi karega, uska access update hi nahi hoga. Bilkul waise jaise CRED app mein tumhara credit score update hone ke baad bhi purana cached score dikhta rahe jab tak app refresh na ho.
>
> Fix karne ke options, cost ke hisaab se:
> - (a) Short JWT TTL (15 min) + refresh token — sabse common approach
> - (b) `roles_version` claim jo Redis counter ke against validate ho har request pe
> - (c) JWT blocklist, `jti` (JWT ID) ke basis pe
>
> Zyada teams (a) use karti hain. Ye design decision skip mat karna — production mein ye pehle mahine ke andar hi bite karega.

### Hierarchical roles — `RoleHierarchy` bean

Kya hota hai ye? Socho ek company structure — SUPER_ADMIN wo sab kar sakta hai jo ADMIN kar sakta hai, ADMIN wo sab kar sakta hai jo MANAGER kar sakta hai, aur aage. Har baar har role ko sab permissions dobara likhne ki zaroorat nahi:

```java
@Bean
public RoleHierarchy roleHierarchy() {
    return RoleHierarchyImpl.withDefaultRolePrefix()
        .role("SUPER_ADMIN").implies("ADMIN")
        .role("ADMIN").implies("MANAGER")
        .role("MANAGER").implies("USER")
        .build();
}

// Wire into web security expressions
@Bean
public DefaultWebSecurityExpressionHandler webSecurityExpressionHandler(
        RoleHierarchy roleHierarchy) {
    var handler = new DefaultWebSecurityExpressionHandler();
    handler.setRoleHierarchy(roleHierarchy);
    return handler;
}

// Wire into method security expressions
@Bean
public MethodSecurityExpressionHandler methodSecurityExpressionHandler(
        RoleHierarchy roleHierarchy) {
    var handler = new DefaultMethodSecurityExpressionHandler();
    handler.setRoleHierarchy(roleHierarchy);
    return handler;
}
```

### Authorities cache karna — Caffeine + invalidation

Har request pe DB se permissions dobara load karna DB ko maar dega — Diwali sale ke din Flipkart agar har click pe DB se pura user profile fetch kare to server crash ho jaayega. Isliye cache karo:

```java
@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {
        var manager = new CaffeineCacheManager("userAuthorities");
        manager.setCaffeine(
            Caffeine.newBuilder()
                .expireAfterWrite(5, TimeUnit.MINUTES)
                .maximumSize(50_000)
                .recordStats()              // expose to Actuator/Micrometer
        );
        return manager;
    }
}

@Service
@RequiredArgsConstructor
public class AuthorityCacheService {

    private final PermissionRepository permissionRepo;

    @Cacheable(value = "userAuthorities", key = "#userId")
    public List<GrantedAuthority> loadAuthorities(Long userId) {
        return permissionRepo.findAllByUserId(userId).stream()
            .map(p -> (GrantedAuthority) new SimpleGrantedAuthority(p.getName()))
            .toList();
    }

    /** Call this whenever a user's roles change */
    @CacheEvict(value = "userAuthorities", key = "#userId")
    public void invalidate(Long userId) {
        // annotation does the work
    }

    /** Bulk invalidation after a role definition change */
    @CacheEvict(value = "userAuthorities", allEntries = true)
    public void invalidateAll() {}
}
```

```java
// Publish an event when roles change; the cache service listens
@Service
@RequiredArgsConstructor
public class RoleAssignmentService {

    private final UserRoleRepository     userRoleRepo;
    private final ApplicationEventPublisher events;
    private final AuthorityCacheService  cache;

    @Transactional
    public void grantRole(Long userId, Long roleId, Long grantedBy) {
        userRoleRepo.save(new UserRole(userId, roleId, grantedBy, null));
        cache.invalidate(userId);
        events.publishEvent(new UserRoleChangedEvent(userId));
    }
}
```

> [!tip]
> Cache TTL 5 minute jaisa short rakho — matlab worst case mein kisi ka access change hone ke 5 min baad tak purana access dikh sakta hai. Ye trade-off hai: bahut chhota TTL = zyada DB load, bahut bada TTL = stale permissions ka risk zyada der. Cache invalidate karna mat bhoolo jab bhi role change ho — warna user ko lagega access mil gaya lekin actually cache stale hai.

---

## Enums aur Constants — string typos ko khatam karo

Kyun zaruri hai? Kyunki agar tum har jagah `"order:approve"` jaisi raw strings likhte raho, to ek jagah typo ho jaayega (`"oder:approve"`) aur compiler tumhe kabhi nahi batayega — runtime mein silently permission check fail hoga:

```java
public enum Permission {
    ORDER_READ    ("order:read"),
    ORDER_WRITE   ("order:write"),
    ORDER_APPROVE ("order:approve"),
    USER_MANAGE   ("user:manage"),
    REPORT_VIEW   ("report:view");

    private final String authority;
    Permission(String a) { this.authority = a; }
    public String authority() { return authority; }
}

// SpEL constant class — use in @PreAuthorize to avoid inline strings
public final class Authorities {
    public static final String ORDER_READ    = "hasAuthority('order:read')";
    public static final String ORDER_APPROVE = "hasAuthority('order:approve')";
    public static final String USER_MANAGE   = "hasAuthority('user:manage')";
    private Authorities() {}
}

@Service
public class OrderService {

    @PreAuthorize(Authorities.ORDER_APPROVE)
    public Order approve(Long orderId) { ... }

    @PreAuthorize(Authorities.ORDER_READ)
    public Order findById(Long orderId) { ... }
}
```

> [!warning]
> `@PreAuthorize` SpEL hai jo runtime pe evaluate hota hai — matlab string mein typo compile time pe pakda hi nahi jaayega. Isliye ek integration test likho jo har secured method ko `@WithMockUser(authorities = "...")` ke saath call kare — dono cases test karo: authority ke saath (allow hona chahiye) aur bina authority ke (deny hona chahiye).

---

## Role Drift aur Privilege Creep

Ye kya cheez hai? Real duniya mein hota kya hai — kisi employee ko 6 mahine ke liye "temporary admin access" diya gaya tha kisi project ke liye, project khatam ho gaya, lekin access kabhi revoke nahi hua kyunki removal ke liye bhi ek ticket lagana padta hai aur koi karta nahi. Ye "privilege creep" hai — samay ke saath log zaroorat se zyada access jama kar lete hain.

Counter-strategies:

1. **Access recertification** — quarterly automated job managers ko ek email bhejta hai unke reports ke roles ki list ke saath, aur click-to-revoke links ke saath.
2. **Time-bounded elevated roles** — `user_roles` table mein `expires_at` column; ek nightly scheduler expired grants ko khud revoke kar deta hai.
3. **Self-limiting grants** — koi user sirf wahi roles grant kar sakta hai jo khud uske paas hain (ye service layer mein enforce karo). Matlab agar tum khud ADMIN nahi ho, to kisi aur ko ADMIN nahi bana sakte.
4. **Unused-permission audit** — apne audit log (dekho [[16-Audit-Logging-and-Compliance]]) se query karo ki kaunse permissions pichle 90 din mein kabhi use hi nahi hue, aur unhe auto-remove kar do.

```sql
-- Users holding a permission they haven't used in 90 days
SELECT u.email, r.name AS role, p.name AS permission
FROM user_roles ur
JOIN users u ON u.id = ur.user_id
JOIN role_permissions rp ON rp.role_id = ur.role_id
JOIN permissions p ON p.id = rp.permission_id
JOIN roles r ON r.id = ur.role_id
WHERE NOT EXISTS (
    SELECT 1 FROM audit_events ae
    WHERE ae.user_id = ur.user_id
      AND ae.permission = p.name
      AND ae.created_at > NOW() - INTERVAL '90 days'
);
```

---

## Express/TS Comparison

Tumhare Node.js background se compare karke samjhte hain:

```typescript
// express + accesscontrol
import { AccessControl } from 'accesscontrol';

const ac = new AccessControl();
ac.grant('user')
  .readOwn('order');
ac.grant('manager').extend('user')
  .readAny('order');
ac.grant('admin').extend('manager')
  .createAny('order').deleteAny('order');

const check = (resource: string, action: string) =>
  (req: Request, res: Response, next: NextFunction) => {
    const perm = ac.can(req.user.role)[action](resource);
    if (!perm.granted) return res.status(403).json({ error: 'Forbidden' });
    next();
  };

router.get('/orders', check('order', 'readAny'), listOrders);
```

Spring ka `RoleHierarchy` bilkul `.extend()` pattern jaisa hi cover karta hai. Lekin **structural difference** yahan hai jo sabse important point hai: Spring authorization ko *service method ke andar* enforce karta hai, route middleware mein nahi. Iska matlab — jab tumhara code kisi scheduled job se call ho, ya Kafka consumer se call ho (yaani HTTP request ke bahar bhi) — tab bhi authorization enforce hoga. Express mein agar tumne sirf route middleware mein check lagaya, to koi internal call ya background job us check ko bypass kar sakta hai. Ye Spring ka sabse bada architectural advantage hai.

---

## Gotchas

> [!warning]
> **`@EnableMethodSecurity` zaroori hai.** Isके bina `@PreAuthorize` compile to ho jaayega bilkul fine, lekin runtime pe kuch bhi nahi karega — silently ignore ho jaayega. `@EnableMethodSecurity` (Spring Security 6+) apni `@Configuration` class pe add karo. Purane Boot versions mein ye `@EnableGlobalMethodSecurity(prePostEnabled = true)` tha.

> [!danger]
> **Self-invocation AOP ko bypass kar deta hai.** Agar same bean ke andar se koi method kisi `@PreAuthorize`-annotated method ko call karta hai, to security proxy skip ho jaata hai — permission check hoga hi nahi. Isse bachne ke liye ya to call ko proxy ke through route karo (dusre bean se call karwao), ya bean ko lazily khud mein inject karo.

> [!warning]
> **DB mein ROLE_ prefix.** Roles DB mein `ROLE_` prefix ke saath store karo (jaise `ROLE_ADMIN`) taaki DB value se banaya gaya `SimpleGrantedAuthority` `hasRole()` ki expectation se match kare (jo apna prefix khud prepend karta hai). Is convention ko document kar do — kal ko koi naya developer isko "clean up" karne ki koshish karega aur sab tod dega.

---

## Production Checklist

- [ ] Roles DB mein `ROLE_` prefix ke saath store hain
- [ ] Permissions enum + `Authorities` constants class ke roop mein define hain
- [ ] `@EnableMethodSecurity` kam se kam ek `@Configuration` mein present hai
- [ ] `UserDetailsService` permissions ek single JOIN mein load karta hai (no N+1)
- [ ] Authority loading pe Caffeine cache hai, TTL ≤ 5 min
- [ ] Role change hone pe cache eviction trigger hoti hai
- [ ] `RoleHierarchy` bean web aur method dono expression handlers mein wired hai
- [ ] JWT TTL ≤ 15 min YA blocklist YA `roles_version` claim strategy documented hai
- [ ] `user_roles.expires_at` column hai temporary grants ke liye, scheduled cleanup ke saath
- [ ] `user_roles` mein `granted_by`/`granted_at` audit columns hain
- [ ] Unit tests: `@PreAuthorize` `@WithMockUser` se dono grant aur deny paths ke liye tested hai
- [ ] Quarterly access recertification process runbook mein documented hai

---

## Related

- [[01-Spring-Security-Concepts]]
- [[02-Configuration-and-SecurityFilterChain]]
- [[05-Method-Security]]
- [[04-JWT-with-Spring-Security]]
- [[08-OAuth2-Resource-Server]]
- [[10-Permission-Based-Granular-Authorization]]
- [[11-ABAC-and-Policy-Engines]]
- [[16-Audit-Logging-and-Compliance]]
- [[02-Entity-Basics]]
- [[05-Application-Properties]]
