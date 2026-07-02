# Caching

> [!info] Express/TS wale dev ke liye
> Spring ka caching abstraction basically `node-cache` + `ioredis` ko unify kar ke ek single annotation API bana diya gaya version hai. Tum method pe `@Cacheable` laga do, baaki ka kaam — key banana, serialize karna, evict karna — Spring khud sambhal lega. Implementation switch karni ho (Caffeine in-process se Redis distributed pe) toh bas ek starter dependency badal do. Asli mushkil code likhna nahi hai — asli mushkil hai **invalidation strategy** sochna. Cache invalidate kab karna hai, yeh decide karna hi sabse bada dukh hai (jaise woh famous quote hai — "there are only two hard things in computer science: cache invalidation and naming things").

## Concept / Kaam kaise karta hai?

Socho tum Zomato pe restaurant list dekh rahe ho. Har baar jab tum home screen kholte ho, Zomato database se saara data fetch nahi karta — usne pehle se ek cached version rakha hota hai jo har 5-10 minute mein refresh hota hai. Yehi cache ka core idea hai: **expensive kaam baar baar mat karo, ek baar karke result yaad rakh lo.**

Spring mein yeh kaam annotations se hota hai:

| Annotation | Kya karta hai |
| --- | --- |
| `@Cacheable` | Agar cache mein data hai → wahi return kar do; nahi hai → method call karo, result cache mein daalo, phir return karo |
| `@CachePut` | Hamesha method call karega, result cache mein daal dega (write-through — cache hit/miss ka concept hi nahi, seedha update) |
| `@CacheEvict` | Cache se entry hata do (ek specific key ya `allEntries = true` se sab kuch) |
| `@Caching` | Multiple cache annotations ko combine karne ke liye |

Spring yeh decide karta hai ki actual caching kis backend pe ho rahi hai — `CaffeineCacheManager` (in-memory, single instance), `RedisCacheManager` (distributed, multiple instances share karte hain), `ConcurrentMapCacheManager` (bilkul basic, testing ke liye) — yeh sab `CacheManager` bean se control hota hai. Tumhare `@Cacheable` code mein kuch change nahi karna padta, bas configuration badalti hai.

## Code Example

### Caching enable karna

Sabse pehle, `@EnableCaching` laga do kisi bhi `@Configuration` class pe — warna saare `@Cacheable` annotations chup chaap ignore ho jayenge (koi error nahi aayega, bas caching kaam hi nahi karegi, jo debug karna sabse zyada frustrating hota hai):

```java
@Configuration
@EnableCaching
public class CachingConfig { }
```

### Caffeine (in-process, fast, default recommend karta hoon)

Caffeine ek **in-memory cache** hai — matlab data tumhare JVM process ke andar hi store hota hai, RAM mein. Fast hai kyunki koi network call nahi lagti, lekin agar tumhare 3 server instances chal rahe hain (load balancer ke peeche), toh har instance ka apna alag cache hoga — woh sync nahi honge. Single-instance apps ke liye, ya jab thoda sa staleness chalta ho, Caffeine perfect hai.

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

Yahan `maximumSize=10000` bol raha hai — max 10,000 entries rakhega, uske baad LRU (least recently used) evict hoga. `expireAfterWrite=10m` matlab entry likhne ke 10 minute baad automatically expire ho jayegi — chahe koi use kare ya na kare.

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

    // Multiple keys (jaise email aur id dono se lookup karna ho)
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

Yahan gaur karo — `key = "#id"` ya `key = "'email:' + #email"` — yeh **SpEL** (Spring Expression Language) hai. Tum method ke parameters ko `#paramName` se reference kar sakte ho, aur `@CachePut` mein `#result` se method ka return value bhi access kar sakte ho (jaise `update()` mein `#result.id()`).

`condition` vs `unless` mein confuse mat ho:
- `condition` — method call **hone se pehle** evaluate hota hai. False ho toh caching hi skip.
- `unless` — method call hone ke **baad** evaluate hota hai. Result dekh ke decide karta hai cache karna hai ya nahi.

### Redis (distributed cache)

Ab socho tumhare paas 5 server instances hain, aur sabko ek hi cache dikhna chahiye — jaise IRCTC ke multiple servers ek hi train availability cache share karte hain. Yahan Caffeine kaam nahi karega (har instance ka apna alag cache hoga), isliye **Redis** use karte hain — ek centralized, network-accessible cache jo sab instances share karte hain.

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

Dekho yahan `customizer()` bean mein — hum **per-cache TTL** set kar rahe hain. `users` cache 15 minute mein expire hoga, `products` cache 1 ghante mein. Yeh bilkul waisa hi hai jaise tum Redis mein alag alag key patterns pe alag `EXPIRE` set karte ho, bas Spring ne isko declarative bana diya.

### Hibernate second-level cache (bilkul alag layer hai!)

Yeh confusion sabse zyada hoti hai — log sochte hain ki `@Cacheable` aur Hibernate ka L2 cache same cheez hain. **Nahi hain.** Spring ka `@Cacheable` method-level caching hai (method ka return value cache hota hai). Hibernate ka second-level cache **entity-level** hai — yeh JPA/Hibernate ke andar chhupa hua ek alag cache hai jo entities, queries, aur collections ko cache karta hai, taaki same entity ko baar baar DB se load na karna pade across different sessions.

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
    String name;   // chhoti, immutable lookup table — L2 cache ke liye perfect candidate
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

> [!warning] Sambhal ke use karo
> Sirf **read-mostly reference data** ke liye use karo — jaise countries, categories, ya static lookup tables jo shaayad hi kabhi change hote hain. Agar tum frequently-updated entities (jaise `Order` ya `User`) pe L2 cache laga doge, toh stale data ka risk badh jaata hai aur cache invalidation ka nightmare shuru ho jaata hai.

## Express/TS Comparison

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

Node mein tum manually `if (hit) return; else fetch aur set()` likhte ho — Spring mein woh boilerplate `@Cacheable` ke andar chup jaata hai.

| Node | Spring |
| --- | --- |
| Manually `cache.get`/`set` wrap karna | `@Cacheable` annotation |
| `cache.del(key)` | `@CacheEvict` |
| `node-cache` | Caffeine |
| `ioredis` + `redlock` | Spring Data Redis + `RedisCacheManager` |
| Hand-rolled key banana | SpEL expression `key=` mein |
| Per-call TTL | Per-cache TTL config se |

## Gotchas — yeh cheezein zaroor dhyaan mein rakho

> [!warning] Self-invocation problem (phir se!)
> `@Cacheable` bhi AOP hi hai (proxy-based). Agar tum same class ke andar ek method se doosre `@Cacheable` method ko call karoge, toh proxy bypass ho jaata hai — **caching kaam hi nahi karegi**, aur tumhe pata bhi nahi chalega kyunki koi error nahi aayega. Bilkul wahi issue jo `@Transactional` mein hota hai ([[05-Transactions]]). Fix bhi wahi hai: ya toh self-injection use karo, ya method ko doosri `@Service` class mein nikaal do.

> [!warning] `null` results ka masla
> Default behaviour mein Spring `null` bhi cache kar leta hai — matlab agar `find()` null return kare, toh Spring us null ko bhi cache mein daal dega, aur agli baar bhi null hi return karega (chahe DB mein data ho ya na ho). Isse bachne ke liye `unless = "#result == null"` laga do. Redis ke liye `cache-null-values: false` set karo (naye Boot versions mein yeh already default hai).

> [!warning] Cache key collisions
> Default key generator method ke **saare parameters** ko combine karke key banata hai. Isse subtle bugs aa sakte hain — `find("a", 1)` aur `find("a", "1")` (string "1" vs int 1) kabhi kabhi same key generate kar sakte hain aur collide ho sakte hain. Isliye explicit key likho: `key = "'prefix:' + #x"`.

> [!danger] Mutable objects cache mat karo
> Yeh sabse dangerous gotcha hai. Agar tumne `User` entity cache kar li, aur baad mein kahin us object ko mutate kar diya (field set kar diya), toh cache mein ab woh **mutated reference** baithi hai — matlab agli baar jab tum cache se woh entity nikaaloge, tumhe galat/stale data milega, aur bug dhoondhna nightmare ban jaayega. Isliye hamesha **immutable DTOs / records** cache karo, kabhi bhi live entities cache mat karo.

> [!warning] Distributed cache + non-serializable values
> Redis network ke through data bhejta hai, isliye usko values ko **serialize** karna padta hai. Agar tumhari class `Serializable` nahi hai aur tumne JSON serializer bhi configure nahi kiya, toh runtime pe exception milega. Fix: `GenericJackson2JsonRedisSerializer` use karo (jaisa upar `RedisCacheConfig` mein dikhaya hai).

> [!warning] Transactional method se caching read karna
> Agar `find()` pe `@Cacheable` AND `@Transactional` dono lage hain, toh advice ka order matter karta hai. Default order hai: tx → cache (matlab pehle transaction shuru hoti hai, phir cache check hota hai). Generally tum chahte ho ki tx cached method ke **andar** ho, taaki cache hit hone pe transaction khulna hi na pade (unnecessary overhead bache). Spring ka default order sahi hai — bas iska awareness rakho.

> [!tip] Cache stampede / thundering herd
> Socho ek super popular product page hai (jaise Flipkart Big Billion Days sale ka hot item), aur uska cache entry expire ho gaya. Ab agar 10,000 requests ek saath aa rahi hain, toh sab ke sab cache miss karenge aur sab ke sab underlying method (DB query ya API call) ko simultaneously hit karenge — yeh hai "thundering herd". Iska solution: Caffeine ka `LoadingCache` (jo internally ek hi load karta hai, baaki wait karte hain) ya Redis mein lock-based loading. Simple cases ke liye, Caffeine ka `expireAfterWrite` + `refreshAfterWrite` combo kaafi hota hai — background mein refresh hota rehta hai, kabhi full miss nahi hota.

> [!tip] Jo already fast hai, usko cache mat karo
> Agar HikariCP se ek query 200 microseconds mein complete ho rahi hai, usko cache karne ka koi fayda nahi — ulta complexity badha doge. Caching un cheezon ke liye karo jo genuinely expensive hain: cross-service network calls, complicated joins, third-party API calls (jaise payment gateway status check, ya external pincode/address lookup APIs).

## Related

- [[04-Repositories]]
- [[06-N-Plus-One-and-Fetching]]
- [[Spring-AOP]]
- [[Observability-Basics]]
