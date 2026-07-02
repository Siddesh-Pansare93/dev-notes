# Tumhara Stack (Eureka + Gateway + Feign + Security + JPA) Kubernetes Pe

> [!info] Ye note kis baare mein hai
> Ye ek practical map hai *tumhare specific* tech stack ko — Spring Cloud (Eureka client + Spring Cloud Gateway + OpenFeign), Spring Security, Spring Data JPA — Kubernetes pe deploy karne ke liye. Jab ye sab technologies k8s se milti hain, toh kuch real gotchas aate hain. Ye note un sabko ek jagah collect karta hai.

## Sabse bada architectural sawaal

> [!warning] Eureka + Kubernetes — pehle ye padho
> Kubernetes already **DNS ke through service discovery** deta hai (har Service ko ek naam milta hai jaise `orders-api.default.svc.cluster.local`). Eureka bhi bilkul yahi kaam karta hai, bas tumhare apps ke andar se. **Dono ko ek saath chalana duplicate kaam hai** — aur confusion ka common source bhi.

> Do valid raaste hain:
> 1. **Eureka rakho** — tumhara code `@LoadBalanced` / Feign logical names ke saath use karta hai. Eureka pods ko track karta hai. K8s sirf runtime hai. Ye tab acha hai jab team Spring Cloud achhe se jaanti ho, ya tum VMs se migrate kar rahe ho.
> 2. **Eureka hatao, k8s DNS use karo** — `lb://orders-api` ko `http://orders-api` se replace karo. Simpler. K8s-native raasta.
>
> Ye note **option 1** cover karta hai (kyunki ye tumhara stack hai), lekin jahan option 2 cleaner hota, wahan flag bhi karega.

## Architecture ka overview

Socho ek Zomato jaisa system — customer (Client) app kholta hai, request Ingress (jaise Zomato ka load balancer) se hoti hui Gateway tak jaati hai. Gateway JWT check karta hai, phir Eureka se puchta hai "orders-service kahan hai bhai?", aur request forward kar deta hai. Orders-service ko agar users ka data chahiye toh woh Feign ke through users-service ko call karta hai — bilkul waise jaise Zomato ka order-service, restaurant-service ko internally call karta hai.

```mermaid
flowchart TD
    Client(["🌐 Client"])

    subgraph k8s["Kubernetes Cluster"]
        ING["🔀 Ingress (nginx)\nHTTPS termination\napi.example.com"]

        subgraph gw_ns["Gateway namespace"]
            GW["⚡ Spring Cloud Gateway\nJWT auth · Rate limit · Routing\nDeployment × 2 pods"]
        end

        subgraph registry["Discovery"]
            EUR["📋 Eureka Server\nStatefulSet × 1\n:8761"]
        end

        subgraph services["Backend Services"]
            OS["📦 orders-service\nDeployment × 3\n@EurekaClient"]
            US["👤 users-service\nDeployment × 2\n@EurekaClient"]
        end

        subgraph dbs["Databases (own DB per service)"]
            DB1["🗄 Postgres\norders_db"]
            DB2["🗄 Postgres\nusers_db"]
        end
    end

    Client --> ING --> GW
    GW -- "lb://orders-service\n(via Eureka)" --> OS
    GW -- "lb://users-service\n(via Eureka)" --> US
    GW -- "registry lookup" --> EUR
    OS -- "Feign → lb://users-service" --> US
    OS --> DB1
    US --> DB2
    OS -- "register + heartbeat" --> EUR
    US -- "register + heartbeat" --> EUR

    style k8s fill:#f8fafc,stroke:#94a3b8
    style gw_ns fill:#fef3c7,stroke:#f59e0b
    style registry fill:#ede9fe,stroke:#7c3aed
    style services fill:#f0fdf4,stroke:#86efac
    style dbs fill:#f0f9ff,stroke:#0ea5e9
    style GW fill:#f59e0b,color:#000
    style EUR fill:#7c3aed,color:#fff
```

## 1. Eureka Server on k8s

Kya hota hai? Eureka khud bhi ek Spring Boot app hai — lekin iske paas **state** hoti hai (registry) aur clients isse continuously heartbeat bhejte rehte hain. Isliye normal **Deployment** nahi, **StatefulSet** use karo — taaki isko ek stable DNS naam mile, jaise ek fixed table number restaurant mein.

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: eureka
spec:
  serviceName: eureka       # required for stable DNS
  replicas: 1               # bump to 2-3 for HA, then peer them
  selector:
    matchLabels: { app: eureka }
  template:
    metadata:
      labels: { app: eureka }
    spec:
      containers:
        - name: eureka
          image: ghcr.io/me/eureka-server:1.0.0
          ports: [{ name: http, containerPort: 8761 }]
          env:
            - name: SPRING_PROFILES_ACTIVE
              value: prod
            - name: EUREKA_INSTANCE_HOSTNAME
              valueFrom:
                fieldRef: { fieldPath: metadata.name }
          readinessProbe:
            httpGet: { path: /actuator/health/readiness, port: http }
          livenessProbe:
            httpGet: { path: /actuator/health/liveness, port: http }
---
apiVersion: v1
kind: Service
metadata:
  name: eureka
spec:
  clusterIP: None           # headless service for stable per-pod DNS
  selector: { app: eureka }
  ports:
    - port: 8761
      targetPort: http
```

Eureka server ka `application.yml`:

```yaml
spring:
  application:
    name: eureka-server
server:
  port: 8761
eureka:
  client:
    register-with-eureka: false   # the server doesn't register with itself
    fetch-registry: false
  server:
    enable-self-preservation: false   # disable in single-node dev/test
```

> [!tip] HA Eureka
> Production ke liye, 2-3 Eureka pods chalao jo headless service DNS ke through **ek dusre se peer** karein. Har pod apna `eureka.client.service-url.defaultZone` sab peers ke URLs pe set karega.

## 2. Har service mein Eureka Client config

Har service (Orders, Users, Gateway) ek Eureka client hai:

```yaml
# application.yml in each service
spring:
  application:
    name: orders-api      # ← THIS is the name peers use to find you
eureka:
  client:
    service-url:
      defaultZone: ${EUREKA_CLIENT_SERVICEURL_DEFAULTZONE:http://localhost:8761/eureka/}
    register-with-eureka: true
    fetch-registry: true
  instance:
    prefer-ip-address: true              # use pod IP, not hostname
    instance-id: ${spring.application.name}:${random.uuid}
    lease-renewal-interval-in-seconds: 10
    lease-expiration-duration-in-seconds: 30
```

URL dene wala ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata: { name: cloud-config }
data:
  EUREKA_CLIENT_SERVICEURL_DEFAULTZONE: http://eureka:8761/eureka/
```

> [!warning] prefer-ip-address: true
> Pod hostnames cluster-wide resolve nahi hote. Pod IPs hoti hain (wo cluster ke across routable hoti hain). Ye flag na ho toh Feign calls "Unknown host" error ke saath fail hongi.

## 3. Entry point ke roop mein Spring Cloud Gateway

Tumhara Gateway bhi bas ek aur Eureka client hai — ye Eureka ke through services discover karta hai aur traffic route karta hai.

```yaml
spring:
  application:
    name: api-gateway
  cloud:
    gateway:
      discovery:
        locator:
          enabled: true
          lower-case-service-id: true
      routes:
        - id: orders
          uri: lb://orders-api          # lb:// = "look up via Eureka and load-balance"
          predicates:
            - Path=/orders/**
          filters:
            - StripPrefix=0
        - id: users
          uri: lb://users-api
          predicates:
            - Path=/users/**
```

Gateway Deployment + Service:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
spec:
  replicas: 2
  selector: { matchLabels: { app: api-gateway } }
  template:
    metadata: { labels: { app: api-gateway } }
    spec:
      containers:
        - name: app
          image: ghcr.io/me/api-gateway:1.0.0
          ports: [{ name: http, containerPort: 8080 }]
          envFrom:
            - configMapRef: { name: cloud-config }
          startupProbe:
            httpGet: { path: /actuator/health/liveness, port: http }
            failureThreshold: 30
            periodSeconds: 10
          livenessProbe:
            httpGet: { path: /actuator/health/liveness, port: http }
          readinessProbe:
            httpGet: { path: /actuator/health/readiness, port: http }
---
apiVersion: v1
kind: Service
metadata: { name: api-gateway }
spec:
  selector: { app: api-gateway }
  ports: [{ port: 80, targetPort: http }]
```

Uske baad ek **Ingress**, `api-gateway` Service ki taraf point karta hai:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: public-api
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt
spec:
  ingressClassName: nginx
  tls:
    - hosts: [api.example.com]
      secretName: api-tls
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service: { name: api-gateway, port: { number: 80 } }
```

> [!tip] Public traffic flow
> Internet → Ingress (TLS) → Gateway Service → Gateway pods → (Eureka lookup) → backend Service pods.

## 4. Services ke beech Feign clients

`orders-service` ke andar, `users-service` ko call karna — bilkul waise jaise Swiggy ka order service, delivery-partner service ko internally call karta hai:

```java
@FeignClient(name = "users-api")    // ← Eureka service name
public interface UsersClient {
    @GetMapping("/api/users/{id}")
    UserDto getById(@PathVariable("id") Long id);
}
```

Main class pe enable karo:

```java
@SpringBootApplication
@EnableFeignClients
@EnableDiscoveryClient
public class OrdersApplication { ... }
```

Use karna:

```java
@Service
@RequiredArgsConstructor
public class OrderService {
    private final UsersClient users;

    public OrderDto place(NewOrder cmd) {
        UserDto u = users.getById(cmd.userId());
        // ...
    }
}
```

### JWT ko Feign ke through propagate karna

Ek common trap: user Gateway pe JWT ke saath hit karta hai, Gateway Orders ko forward karta hai, Orders phir Users ko call karta hai — lekin JWT propagate nahi hota. Iske liye ek `RequestInterceptor` add karo:

```java
@Configuration
public class FeignAuthConfig {
    @Bean
    RequestInterceptor bearerTokenForwardingInterceptor() {
        return template -> {
            ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs == null) return;
            String auth = attrs.getRequest().getHeader(HttpHeaders.AUTHORIZATION);
            if (auth != null) template.header(HttpHeaders.AUTHORIZATION, auth);
        };
    }
}
```

Ab Feign automatically bearer token forward karega. Dekho [[04-JWT-with-Spring-Security]], [[07-OpenFeign]].

## 5. Spring Security — Gateway pe vs har service pe

Do patterns hain; ek pick karo:

### Pattern A: Gateway authenticate karta hai, services network pe trust karti hain

- Gateway JWT validate karta hai, user info ko headers mein inject karta hai (`X-User-Id`, `X-User-Roles`)
- Backend services un headers ko trust karti hain aur apna auth skip kar deti hain
- **NetworkPolicies chahiye** taaki sirf Gateway hi backends tak pahunch sake
- Services simple ho jaati hain, lekin agar perimeter fail ho gaya toh zyada dangerous hai

### Pattern B: Har service JWT validate karti hai (defense in depth)

- Gateway JWT forward karta hai
- Har service mein Spring Security ek **OAuth2 Resource Server** ki tarah configure hoti hai, jo JWT validate karti hai
- Zyada CPU lagta hai, lekin zero-trust approach hai

```java
// each service
@Bean
SecurityFilterChain api(HttpSecurity http) throws Exception {
    return http
        .authorizeHttpRequests(a -> a
            .requestMatchers("/actuator/health/**").permitAll()
            .anyRequest().authenticated())
        .oauth2ResourceServer(o -> o.jwt(Customizer.withDefaults()))
        .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .csrf(CsrfConfigurer::disable)
        .build();
}
```

```yaml
spring:
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: ${JWT_ISSUER_URI}
```

> [!tip] Recommendation
> **Pattern B** se start karo — per-service validate karna sasta hai, zyada secure hai, aur agar NetworkPolicies galat configure ho jaayein tab bhi bach jaata hai. Dekho [[01-Spring-Security-Concepts]], [[08-OAuth2-Resource-Server]].

## 6. Spring Data JPA + k8s

JPA khud k8s mein change nahi hoti. Wiring change hoti hai:

```yaml
# application.yml — env vars come from Secret
spring:
  datasource:
    url: jdbc:postgresql://${DB_HOST}:5432/${DB_NAME}
    username: ${DB_USER}
    password: ${DB_PASSWORD}
    hikari:
      maximum-pool-size: 10
  jpa:
    hibernate:
      ddl-auto: validate          # NEVER use 'update' or 'create' in prod
  flyway:
    enabled: true
    baseline-on-migrate: true
```

Key practices — in cheezon ko dhyan mein rakho:
- **Database per service** — har microservice ke liye alag Postgres pod (ya RDS jaisi managed service). BigBasket ke alag-alag warehouses jaise, ek dusre ki inventory se independent
- **Migrations**: Flyway app startup pe chalta hai. Stricter control chahiye toh init container use karo
- **Connection pool sizing**: `replicas × max-pool-size`, Postgres ke `max_connections` se zyada nahi hona chahiye. 3 replicas × 10 = 30 connections. Capacity plan karo
- **DB creds ko image mein bake mat karo** — hamesha Secret-mounted env vars use karo

Dekho [[01-JDBC-vs-JPA-vs-Hibernate]], [[07-Schema-Migration]], [[08-DataSource-Connection-Pool]].

## 7. Sab kuch milaake — deployment order

```
1. Postgres (StatefulSet or managed)
2. Eureka Server (StatefulSet)
3. (wait until Eureka is Ready)
4. Backend services (Orders, Users, ...) — Deployments
5. (services register with Eureka)
6. API Gateway — Deployment
7. Ingress
```

Agar tum ArgoCD/Flux use kar rahe ho, toh **sync waves** define karo taaki ye order maintained rahe. Warna k8s sab kuch ek saath start kar dega aur services Eureka up hone tak retry karti rahengi — usually theek hai, bas startup thoda noisy hota hai.

## 8. Stack-on-k8s ke common gotchas

> [!warning] Ye cheezein tumhe kaatengi
> 1. **Eureka cache lag** — jab ek pod marta hai, Eureka usko evict karne mein ~30-90 second leta hai. Us window mein Feign calls fail hoti hain. Mitigation: `lease-expiration-duration-in-seconds` kam karo; Resilience4j retry/circuit breaker configure karo. Dekho [[08-Resilience4j]].
> 2. **Pod IP badalna** — redeploy hone pe pod ko nayi IP milti hai. `prefer-ip-address: true` ke saath Eureka re-registration handle kar leta hai. Iske bina, stale entries Feign calls todti hain.
> 3. **Slow JVM startup vs probes** — hamesha ek **startupProbe** use karo (details [[05-Health-Checks-and-Readiness]] mein hain). Iske bina, k8s Spring ke boot khatam hone se pehle hi pod kill kar dega.
> 4. **Gateway ka reactive stack** — Spring Cloud Gateway **WebFlux** (reactive) pe based hai. Isme `spring-boot-starter-web` mat add karo — dono conflict karte hain aur app start hi nahi hoga. Sirf `spring-boot-starter-webflux` use karo.
> 5. **Memory limits + JVM** — `-XX:MaxRAMPercentage=75` set karo taaki JVM cgroup limit ko respect kare. Nahi toh OOMKills dikhenge.
> 6. **JWT clock skew** — alag-alag nodes pe pods mein thoda time drift ho sakta hai. Spring Security JWT config mein `clock-skew: 60s` allow karo.
> 7. **Bahut saare pods ke logs** — `kubectl logs -l app=orders-api -f --max-log-requests=10` sab replicas ke logs tail karta hai. Real production mein, Loki/ELK pe ship karo aur wahan query karo.
> 8. **Eureka self-preservation** — dev/test mein ye kabhi-kabhi spuriously trigger ho jaata hai aur dead pods evict karne se mana kar deta hai. Disable karo: `eureka.server.enable-self-preservation: false`.

## 9. Kya tumhe sach mein k8s mein Eureka use karna chahiye?

> [!tip] Honest recommendation
> Agar tum k8s pe fresh start kar rahe ho, toh **Spring Cloud Kubernetes Discovery** consider karo. Ye k8s ki native Service registry use karta hai — alag se Eureka pods nahi chahiye, double bookkeeping nahi. Tumhare Feign clients phir bhi logical names use karte rahenge; bas resolution k8s ke through hoti hai.
>
> ```xml
> <dependency>
>     <groupId>org.springframework.cloud</groupId>
>     <artifactId>spring-cloud-starter-kubernetes-client-loadbalancer</artifactId>
> </dependency>
> ```
>
> Lekin tumhara stack already Eureka choose kar chuka hai — koi baat nahi. Ye kaam karta hai. Bas tradeoff samajh lo taaki future mein tum khud decide kar sako migrate karna hai ya nahi.

## 10. Is stack ke liye local dev

Complexity ke hisaab se ranked kuch options hain:

| Option | Setup | Faithfulness |
|--------|-------|--------------|
| **IDE mein apps, Docker mein Eureka** | `docker run -p 8761:8761 eureka-image`, IDE `localhost:8761` pe point karta hai | High; sabse fast dev loop |
| **docker-compose** | Saari services ek compose file mein | Higher; k8s ke zyada kareeb |
| **kind / minikube** | Apne real k8s manifests locally apply karo | Highest; prod se match karta hai |
| **Tilt / Skaffold** | Save karte hi auto-rebuild + redeploy | Highest; best DX |

k8s seekhne ke liye, `kind` + raw manifests se start karo. Phir Tilt pe graduate ho jaao.

## Aage kya padhna hai

- [[08-Kubernetes-From-Scratch]] — agar ye sab fast laga toh k8s ka primer
- [[03-Service-Discovery-Eureka]] — Eureka deep-dive
- [[04-API-Gateway-Spring-Cloud-Gateway]] — Gateway routing/filters
- [[07-OpenFeign]] — Feign config, error decoders, retries
- [[08-Resilience4j]] — Feign calls ke around circuit breakers
- [[02-Configuration-and-SecurityFilterChain]] — Spring Security 6 config
- [[04-JWT-with-Spring-Security]] — JWT issuance & validation

## Related
- [[08-Kubernetes-From-Scratch]]
- [[04-Kubernetes-Basics]]
- [[02-Spring-Cloud-Overview]]
- [[03-Service-Discovery-Eureka]]
- [[04-API-Gateway-Spring-Cloud-Gateway]]
- [[07-OpenFeign]]
- [[08-Resilience4j]]
- [[01-Spring-Security-Concepts]]
- [[04-JWT-with-Spring-Security]]
- [[05-Health-Checks-and-Readiness]]
- [[02-Docker-for-Spring-Boot]]
