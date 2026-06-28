---
tags: [security, production, rbac, authorization, roles, authorities]
aliases: [RBAC, Role-Based Access Control, Roles vs Authorities]
stage: advanced
---

# RBAC — Production Patterns

> [!info] For the Express/TS dev
> You're used to middleware like `checkRole('admin')` or libraries like `accesscontrol` / `casbin`. Spring Security has a richer but more verbose model: every principal carries a `Collection<GrantedAuthority>` and every access decision is a comparison against those strings. This note is about doing that *right* at scale — not just getting it to compile.

## Concept / mental model

### Roles vs Authorities vs Scopes — clear definitions

| Term | Spring model | Example string | How to check |
|---|---|---|---|
| **Role** | `GrantedAuthority` with `ROLE_` prefix | `ROLE_ADMIN` | `hasRole("ADMIN")` |
| **Authority / Permission** | `GrantedAuthority` without prefix | `order:approve` | `hasAuthority("order:approve")` |
| **Scope** (OAuth2) | `GrantedAuthority` with `SCOPE_` prefix | `SCOPE_read:orders` | `hasAuthority("SCOPE_read:orders")` |

`hasRole("ADMIN")` is syntactic sugar — it prepends `ROLE_` and delegates to `hasAuthority("ROLE_ADMIN")`.  
`hasAuthority("order:approve")` checks the exact string, zero prefix magic.

> [!danger]
> **The classic prefix trap**: writing `hasRole("ROLE_ADMIN")` produces a check for `ROLE_ROLE_ADMIN` — silently always false. Always write `hasRole("ADMIN")` or `hasAuthority("ROLE_ADMIN")`. Pick one style and ban the other in a ArchUnit test.

### The full authority model

```
User  ──<  user_roles  >──  Role  ──<  role_permissions  >──  Permission
```

At authentication time your app loads *all* permissions for the user, flattens them into the `Authentication` object's authority list, and never hits the DB again during the request. The filter chain is pure in-memory after that.

---

## Schema design (PostgreSQL DDL)

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
> Add `granted_by` and `expires_at` from day one. The audit trail saves you during incidents; `expires_at` handles contractors and temporary on-call elevations without a manual cleanup ticket.

---

## Code examples

### Loading authorities at auth time — `UserDetailsService`

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

### JWT authority extraction — `JwtAuthenticationConverter`

For stateless JWT-based APIs (your own token or Keycloak/Auth0):

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
> **JWT role staleness**: You promote a user to ADMIN. Their 24-hour JWT still carries `USER`. They won't see the change until re-login. Mitigations ranked by cost: (a) short JWT TTL (15 min) + refresh token, (b) `roles_version` claim validated against a Redis counter on each request, (c) JWT blocklist keyed by `jti`. Most teams do (a). Do *not* skip this design decision — it bites you in production within the first month.

### Hierarchical roles — `RoleHierarchy` bean

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

### Caching authorities — Caffeine + invalidation

Re-loading permissions on every request is a DB killer. Cache them:

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

---

## Enums and constants — kill string typos

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
> `@PreAuthorize` is SpEL evaluated at runtime. A typo in the string won't fail at compile time. Write an integration test that calls each secured method with and without the required authority using `@WithMockUser(authorities = "...")`.

---

## Role drift and privilege creep

Privilege creep is inevitable: roles get assigned but never revoked because removal needs a ticket. Counter-strategies:

1. **Access recertification** — quarterly automated job emails managers a list of their reports' roles with click-to-revoke links.
2. **Time-bounded elevated roles** — `expires_at` column in `user_roles`; nightly scheduler revokes expired grants.
3. **Self-limiting grants** — a user can only grant roles they themselves hold (enforce in service layer).
4. **Unused-permission audit** — query your audit log (see [[16-Audit-Logging-and-Compliance]]) for permissions never exercised in 90 days and auto-remove them.

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

## Express/TS comparison

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

Spring's `RoleHierarchy` covers the `.extend()` pattern. The structural difference: Spring enforces authorization *inside the service method* (not route middleware), so it's enforced even when called from a scheduled job or Kafka consumer — not just via HTTP. This is the single biggest architectural advantage.

---

## Gotchas

> [!warning]
> **`@EnableMethodSecurity` is required.** Without it, `@PreAuthorize` compiles fine but does absolutely nothing at runtime. Add `@EnableMethodSecurity` (Spring Security 6+) to your `@Configuration`. In older Boot versions it was `@EnableGlobalMethodSecurity(prePostEnabled = true)`.

> [!danger]
> **Self-invocation bypasses AOP.** Calling a `@PreAuthorize`-annotated method from another method *in the same bean* skips the security proxy. Restructure so the call goes through the proxy, or inject the bean lazily into itself.

> [!warning]
> **ROLE_ prefix in DB.** Store roles in the DB with the `ROLE_` prefix (e.g., `ROLE_ADMIN`) so the `SimpleGrantedAuthority` created from the DB value matches what `hasRole()` expects after it prepends the prefix. Document this convention; a future developer will try to "clean it up."

---

## Production checklist

- [ ] Roles stored in DB with `ROLE_` prefix
- [ ] Permissions defined as enum + `Authorities` constants class
- [ ] `@EnableMethodSecurity` present in at least one `@Configuration`
- [ ] `UserDetailsService` loads permissions in a single JOIN (no N+1)
- [ ] Caffeine cache on authority loading, TTL ≤ 5 min
- [ ] Cache eviction triggered on role change
- [ ] `RoleHierarchy` bean wired into both web and method expression handlers
- [ ] JWT TTL ≤ 15 min OR blocklist OR `roles_version` claim strategy documented
- [ ] `user_roles.expires_at` column with scheduled cleanup for temporary grants
- [ ] `granted_by`/`granted_at` audit columns in `user_roles`
- [ ] Unit tests: `@PreAuthorize` tested with `@WithMockUser` for both grant and deny paths
- [ ] Quarterly access recertification process documented in runbook

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
