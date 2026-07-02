# Centralized Config (Spring Cloud Config Server)

> [!info] Express/TS wale dev ke liye
> Spring Cloud Config Server basically config ko externalize kar deta hai ek git repo mein. Har service startup pe (aur chaho to runtime pe bhi) apna config ek central server se pull karta hai. Socho isko "etcd/Consul KV, but git-backed aur Spring-native version." Kubernetes pe generally ConfigMaps + Secrets isi kaam ko replace kar dete hain — Config Server zyada shine karta hai jab tum K8s ke bahar ho.

## Concept

**Kya problem solve karta hai?**

Socho tumhare paas 10 microservices hain — order-service, payment-service, catalog-service, sab ke apne database URLs, API keys, thresholds waghera. Ab agar yeh sab values JAR ke andar hardcode ya har environment ke liye alag `.env` file mein bikhri padi hain, toh:

- Kal ko DB password change karna hai? Poori service rebuild + redeploy karni padegi.
- Secrets code mein ghuse hain — koi bhi jo repo access rakhta hai, sab dekh sakta hai.
- Kaun sa config kab change hua, kisne kiya — koi audit trail nahi.
- Production mein galti se ek galat value daal di? Rollback ka koi seedha tarika nahi.

Config Server yeh sab solve karta hai:

- Env-specific values ko JAR ke andar bake mat karo.
- Secrets ko code se bahar rakho.
- Config changes ko audit/version karo (git history se — bilkul waise jaise tum code ka history dekhte ho).
- Bina service redeploy kiye config update karo (`@RefreshScope` ke saath).
- Config ko independently rollback karo — bas git revert.

Basically, jaise tum Node mein `.env` files ya AWS Parameter Store use karte ho, waise hi yahan ek dedicated **Config Server** hai jo git repo se config serve karta hai.

### Architecture

Poori setup dekho — ek git repo hai jisme har service ka config file hai, Config Server usko clone/pull karta hai, aur har microservice startup pe HTTP call karke apna config maang leta hai:

```
                ┌──────────────┐
                │  git repo    │  config-repo/
                │              │   ├── order-service.yml
                │              │   ├── order-service-prod.yml
                │              │   └── application.yml
                └──────┬───────┘
                       │ pulls
                ┌──────▼───────┐
                │ Config Server │   :8888
                └──────┬────────┘
                       │ HTTP
   ┌───────────────────┼───────────────────┐
   │                   │                   │
┌──▼────────┐    ┌─────▼────┐       ┌──────▼─────┐
│order-svc  │    │payment-  │       │catalog-svc │
└───────────┘    │svc       │       └────────────┘
                 └──────────┘
```

Naming convention simple hai: repo mein `{application}-{profile}.yml` format follow karo. Har service apna `spring.application.name` + active profile bhejta hai request mein, aur server dono ko merge karke wapis bhej deta hai.

> [!tip] Zomato analogy
> Socho Zomato ke paas ek central "restaurant-config" repo hai — har restaurant (service) apni menu-config, delivery-radius, minimum-order-value waghera yahin se fetch karta hai startup pe. Kisi restaurant ka config badalna hai? Git mein commit karo, restaurant ko dobara deploy karne ki zaroorat nahi — bas refresh signal bhej do.

## Code example

### Config Server

Pehle dependency daalo:

```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-config-server</artifactId>
</dependency>
```

Fir `@EnableConfigServer` laga do apni main class pe — bas itna hi karna hai server ko "Config Server mode" mein daalne ke liye:

```java
@SpringBootApplication
@EnableConfigServer
public class ConfigServerApp {
    public static void main(String[] args) {
        SpringApplication.run(ConfigServerApp.class, args);
    }
}
```

Aur is server ka apna config — yeh batayega ki git repo kahan hai:

```yaml
server:
  port: 8888

spring:
  application:
    name: config-server
  cloud:
    config:
      server:
        git:
          uri: https://github.com/myorg/config-repo
          default-label: main
          search-paths: '{application}'   # ek folder per service
          clone-on-start: true
        encrypt:
          enabled: true

encrypt:
  key: ${CONFIG_ENCRYPT_KEY}   # {cipher}... values ke liye
```

### Repo layout

Ab yeh dekho — actual git repo jisme sab services ke config files hain:

```
config-repo/
├── application.yml              # sab services ke liye shared
├── application-prod.yml          # shared, sirf prod ke liye
├── order-service.yml
├── order-service-prod.yml
├── payment-service.yml
├── payment-service-prod.yml
└── ...
```

`application.yml` mein woh cheezein daalo jo **har** service ko chahiye — jaise monitoring endpoints, logging level:

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus

logging:
  level:
    org.springframework: info
```

`order-service.yml` — sirf order-service ke liye specific config, default (non-prod) values ke saath:

```yaml
order:
  free-shipping-threshold: 50
  default-currency: USD

payment:
  base-url: http://payment-service
```

`order-service-prod.yml` — jab prod profile active ho, toh yeh values upar wali ko override karengi (dhyan do, DB credentials encrypted hain `{cipher}` prefix ke saath):

```yaml
order:
  free-shipping-threshold: 100

spring:
  datasource:
    url: jdbc:postgresql://prod-db:5432/orders
    username: '{cipher}AQB...'
    password: '{cipher}AQC...'
```

### Client — config fetch karna

Ab service ki side pe (order-service) yeh dependency chahiye:

```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-config</artifactId>
</dependency>
```

Aur service ko batao ki config kahan se import karna hai:

```yaml
# bootstrap.yml ya application.yml — Boot 2.4+ mein spring.config.import use hota hai
spring:
  application:
    name: order-service
  config:
    import: optional:configserver:http://config-server:8888

  cloud:
    config:
      fail-fast: true
      retry:
        max-attempts: 6
```

Ab jab `order-service` ko `--spring.profiles.active=prod` ke saath start karoge, toh yeh sequence mein fetch hoga:

1. `application.yml` (defaults)
2. `application-prod.yml` (prod defaults)
3. `order-service.yml` (service-specific)
4. `order-service-prod.yml` (sabse zyada priority)

Sab merge hote hain isi order mein — **baad wala jeetega** (jaise CSS specificity, jo baad mein aaya usne override kar diya).

### Verify karo kya load hua

Curl maar ke directly dekh sakte ho ki server ne kya resolve kiya:

```bash
curl http://config-server:8888/order-service/prod
# returns JSON of resolved config
```

### Encrypted values

Config server `{cipher}` prefix wali values ko decrypt kar sakta hai:

```bash
curl -X POST http://config-server:8888/encrypt -d 'mySecret'
# AQA7d8...

# yeh `{cipher}AQA7d8...` apni YAML mein daal do
```

Server encrypted blob store karta hai; client ko plaintext milta hai — matlab tumhara git repo mein raw secret kabhi nahi jaata.

### `@RefreshScope` — runtime pe config reload

Yeh sabse interesting part hai. Normally Spring beans ek baar bante hain aur fixed rehte hain. Lekin agar tum config change karke bina restart kiye naya value chahte ho, `@RefreshScope` use karo:

```java
@Component
@RefreshScope
public class OrderProperties {
    @Value("${order.free-shipping-threshold}")
    private int threshold;

    public int threshold() { return threshold; }
}
```

Jab git mein config change ho jaaye, bas yeh hit karo:

```bash
curl -X POST http://order-service/actuator/refresh
```

Spring config dobara padhta hai aur `@RefreshScope` wale beans ko rebuild kar deta hai. Ek service ke liye toh theek hai, lekin agar 20 instances chal rahe hain toh sabko individually refresh karna pain hai — isliye **Spring Cloud Bus** ke saath combine karo taaki ek hi call se sabko refresh signal chala jaaye.

> [!tip] Node comparison
> Yeh kaafi kuch waisa hai jaise Node mein tum `fs.watch()` laga ke config file ka change dekh ke process ko reload karte ho, ya PM2 ke `graceful reload` se workers ko restart karte ho — bas yahan restart nahi hota, sirf specific beans rebuild hote hain.

### Spring Cloud Bus (optional)

Jab tumhare paas multiple instances hon aur ek saath sabko refresh karna ho:

```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-bus-amqp</artifactId>
</dependency>
```

`POST /actuator/busrefresh` — kisi bhi ek node pe maaro, woh RabbitMQ pe ek refresh event publish kar deta hai → har service instance khud ko refresh kar leta hai. Ek hi call, sab services updated.

### Failsafe — `optional:` prefix

```yaml
spring:
  config:
    import: optional:configserver:http://config-server:8888
```

`optional:` ka matlab hai — "agar config server unreachable hai, toh warning log karo aur local config ke saath aage badh jao." Iske bina, agar config server down hai toh service **start hi nahi hogi**. Production mein yeh bahut zaruri hai — imagine Diwali sale ke din config server down ho jaaye aur saari services boot hi na ho paayein.

## Express/Node comparison

| Spring Cloud Config | Node |
|--------------------|------|
| Config Server + git repo | (direct equivalent nahi hai — closest hai boot time pe S3/Vault se read karna) |
| `@RefreshScope` | config reload karke workers restart karo; ya `node-config` ka watcher |
| `{cipher}...` values | KMS-decrypted env vars |
| Spring Cloud Bus | NATS/Kafka pub-sub config events ke liye |
| `bootstrap.yml` | startup script jo pehle config pull karti hai |
| Profile-based merge | `node-config` ke env-specific JSON files |

Node mein zyada prevalent pattern yeh hai — **environment variables** + secrets manager (AWS SSM/Parameter Store, Doppler, Vault). Spring Boot bhi yehi support karta hai — Config Server sirf ek option hai kaafi options mein se, mandatory nahi hai.

## Gotchas

> [!warning] Bootstrap vs Application context
> Pre-Boot 2.4 mein config ek alag "bootstrap" context mein fetch hota tha. Ab regular `application.yml` mein `spring.config.import` use karo. Purane tutorials `bootstrap.yml` reference karte hain — usually abhi bhi chal jaata hai, lekin phase out ho raha hai. Naya code likh rahe ho toh `spring.config.import` hi use karo.

> [!warning] Config server critical path pe hai
> Agar config server down hai aur `fail-fast: true` set hai, toh services start hi nahi ho paayengi. Iska solution — multiple replicas chalao, `optional:` use karo, ya last-known-good config cache karo. Yeh single point of failure ban sakta hai agar sambhal ke handle na karo.

> [!danger] Git mein plaintext secrets
> Bina encryption ke, jiske paas bhi repo access hai uske paas tumhare saare secrets hain. `{cipher}...` use karo, ya better — Vault use karo. Yeh galti bahut common hai — log jaldi mein password directly YAML mein daal dete hain.

> [!warning] `@RefreshScope` + immutable beans
> Refresh hone pe bean rebuild hota hai. Lekin agar koi doosra bean uska stale reference pakde baitha hai, toh usko purani value hi milti rahegi. Us dependency ko bhi `@RefreshScope` hona chahiye, ya har call pe fresh value lookup karni chahiye.

> [!tip] K8s pe ho toh ConfigMaps + Secrets prefer karo
> Spring Cloud Kubernetes ConfigMaps ko Spring properties ki tarah read kar sakta hai. Isse tumhe platform ka ACLs, audit, aur rolling restart free mein mil jaata hai — alag se Config Server maintain karne ki zarurat nahi.

> [!tip] Feature flags yahan mat rakho
> Config Server slow-moving config ke liye hai (jo baar-baar nahi badalta). Feature flags ke liye ek proper flag system chahiye (LaunchDarkly, Unleash, Flagsmith) jisme targeting, gradual rollouts waghera built-in hote hain — Config Server usko replace nahi karta.

## Related
- [[02-Spring-Cloud-Overview]]
- [[../05-Spring-Boot/05-Externalized-Configuration|Boot config]]
- [[../05-Spring-Boot/04-Profiles|Profiles]]
- [[../08-Security/03-Secrets-and-Vault|Secrets]]
