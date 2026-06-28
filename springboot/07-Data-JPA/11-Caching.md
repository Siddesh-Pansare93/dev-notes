---
tags: [data-jpa, caching, redis, caffeine, performance]
aliases: [Cacheable, Caffeine, Redis Cache, Cache Abstraction]
stage: intermediate
---

# Caching

> [!info] For the Express/TS dev
> Spring's caching abstraction is what `node-cache` + `ioredis` would be if they were unified behind a single annotation API. You annotate methods with `@Cacheable` and Spring takes care of key generation, serialization, eviction. Swap the implementation (Caffeine in-process / Redis distributed) by changing one starter dependency. The hard part isn't the code — it's the **invalidation strategy**.

## Concept / How it works

| Annotation | Effect |
| --- | --- |
| `@Cacheable` | If cached → return; else invoke method, cache result, return |
| `@CachePut` | Always invoke method, cache result (write-through) |
| `@CacheEvict` | Remove from cache (single key or `allEntries = true`) |
| `@Caching` | Combine multiple cache annotations |

Spring picks an implementation via the `CacheManager` bean — `CaffeineCacheManager`, `RedisCacheManager`, `ConcurrentMapCacheManager`, etc.

## Code example

### Enable caching

```java
@Configuration
@EnableCaching
public class CachingConfig { }
```

### Caffeine (in-process, fast, recommended default)

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-cache</artifactId>
</dependency>
<dependency>
    <groupId>com.github.ben-manes.caffeine</groupId>
    <artifactId>caffeine</artifactId>
</dependency>
```

`application.yml`:

```yaml
spring:
  cache:
    type: caffeine
    cache-names: users, products
    caffeine:
      spec: maximumSize=10000,expireAfterWrite=10m,recordStats
```

### Annotated service

```java
@Service
public class UserService {

    private final UserRepository repo;
    public UserService(UserRepository repo) { this.repo = repo; }

    @Cacheable(value = "users", key = "#id")
    public UserResponse find(Long id) {
        return repo.findById(id)
                .map(this::toResponse)
                .orElseThrow();
    }

    // Multiple keys (e.g., look up by email and id)
    @Cacheable(value = "users", key = "'email:' + #email")
    public UserResponse findByEmail(String email) {
        return repo.findByEmail(email).map(this::toResponse).orElseThrow();
    }

    @CachePut(value = "users", key = "#result.id()")
    public UserResponse update(UpdateRequest req) {
        User u = repo.findById(req.id()).orElseThrow();
        u.setFullName(req.fullName());
        return toResponse(repo.save(u));
    }

    @CacheEvict(value = "users", key = "#id")
    public void delete(Long id) {
        repo.deleteById(id);
    }

    @CacheEvict(value = "users", allEntries = true)
    public void purgeAll() {
        repo.deleteAll();
    }

    @Caching(evict = {
        @CacheEvict(value = "users", key = "#id"),
        @CacheEvict(value = "users", key = "'email:' + #email")
    })
    public void invalidate(Long id, String email) { }

    // Conditional caching
    @Cacheable(value = "users", key = "#id",
               condition = "#id != null",
               unless = "#result == null")
    public UserResponse maybeFind(Long id) { ... }
}
```

### Redis (distributed cache)

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-redis</artifactId>
</dependency>
```

`application.yml`:

```yaml
spring:
  cache:
    type: redis
  data:
    redis:
      host: localhost
      port: 6379
      timeout: 2000ms
  redis:
    cache:
      time-to-live: 10m
      key-prefix: "acme:"
      use-key-prefix: true
      cache-null-values: false
```

```java
@Configuration
@EnableCaching
public class RedisCacheConfig {

    @Bean
    public RedisCacheConfiguration cacheConfiguration() {
        return RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofMinutes(10))
                .disableCachingNullValues()
                .serializeKeysWith(RedisSerializationContext.SerializationPair
                        .fromSerializer(new StringRedisSerializer()))
                .serializeValuesWith(RedisSerializationContext.SerializationPair
                        .fromSerializer(new GenericJackson2JsonRedisSerializer()));
    }

    @Bean
    public RedisCacheManagerBuilderCustomizer customizer() {
        return builder -> builder
                .withCacheConfiguration("users",
                    RedisCacheConfiguration.defaultCacheConfig()
                        .entryTtl(Duration.ofMinutes(15)))
                .withCacheConfiguration("products",
                    RedisCacheConfiguration.defaultCacheConfig()
                        .entryTtl(Duration.ofHours(1)));
    }
}
```

### Hibernate second-level cache (different layer!)

Distinct from Spring's caching: Hibernate has its own L2 cache for entities, queries, collections.

```xml
<dependency>
    <groupId>org.hibernate.orm</groupId>
    <artifactId>hibernate-jcache</artifactId>
</dependency>
```

```java
@Entity
@Cache(usage = CacheConcurrencyStrategy.READ_WRITE)
public class Country {
    @Id Long id;
    String name;   // small, immutable lookup table — perfect for L2
}
```

`application.yml`:

```yaml
spring:
  jpa:
    properties:
      hibernate:
        cache:
          use_second_level_cache: true
          use_query_cache: true
          region:
            factory_class: org.hibernate.cache.jcache.JCacheRegionFactory
```

Use sparingly — only for read-mostly reference data.

## Express/TS comparison

```ts
// node-cache (in-process)
import NodeCache from 'node-cache';
const cache = new NodeCache({ stdTTL: 600 });

async function findUser(id: number) {
  const k = `user:${id}`;
  const hit = cache.get<User>(k);
  if (hit) return hit;
  const u = await prisma.user.findUnique({ where: { id } });
  cache.set(k, u);
  return u;
}
```

| Node | Spring |
| --- | --- |
| Manual cache.get/set wrapping | `@Cacheable` annotation |
| `cache.del(key)` | `@CacheEvict` |
| `node-cache` | Caffeine |
| `ioredis` + `redlock` | Spring Data Redis + `RedisCacheManager` |
| Hand-rolled key | SpEL expression in `key=` |
| Per-call TTL | Per-cache TTL via config |

## Gotchas

> [!warning] Self-invocation problem (again)
> `@Cacheable` is AOP. Calling a `@Cacheable` method from another method in the SAME class bypasses the proxy — no caching. Same fix as `@Transactional` ([[05-Transactions]]).

> [!warning] `null` results
> By default Spring caches `null`. To skip: `unless = "#result == null"`. For Redis: `cache-null-values: false` (default in newer Boot).

> [!warning] Cache key collisions
> Default key generator uses all parameters. `find("a", 1)` and `find("a", "1")` may collide. Use explicit `key = "'prefix:' + #x"`.

> [!danger] Caching mutable objects
> If you cache a `User` and downstream mutates it, the cache holds a mutated reference. Always cache **immutable** DTOs / records, never entities.

> [!warning] Distributed cache + non-serializable values
> Redis needs serialization. Make values `Serializable` or configure a JSON serializer (`GenericJackson2JsonRedisSerializer`).

> [!warning] Caching reads from a transactional method
> If `find()` is `@Cacheable` AND `@Transactional`, the order of advices matters. Default order: tx → cache. Generally you want tx INSIDE the cached method, so cache hits don't open a tx. Spring's default is correct; just be aware.

> [!tip] Cache stampede / thundering herd
> When a hot key expires, N concurrent requests all miss and call the underlying method. Caffeine's `LoadingCache` and Redis lock-based loading help. For the simple cases, Caffeine `expireAfterWrite` + `refreshAfterWrite` does it.

> [!tip] Don't cache what's already fast
> A 200 µs query in HikariCP doesn't need caching. Cache cross-service calls, expensive joins, third-party API calls.

## Related

- [[04-Repositories]]
- [[06-N-Plus-One-and-Fetching]]
- [[Spring-AOP]]
- [[Observability-Basics]]
