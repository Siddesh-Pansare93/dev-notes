# Spring Cloud Overview

> [!info] Express/TS wale dev ke liye
> Socho tumne Zomato jaisa distributed system banaya hai — order service, restaurant service, payment service, delivery service, sab alag-alag chal rahe hain. Ab in sab ko ek dusre se baat karni hai, config share karni hai, ek gir jaaye to poora system na gire, aur jab kuch fail ho to pata bhi chalna chahiye ki kahan fail hua. Yehi cheezein Spring Cloud solve karta hai. Node.js mein tum ye sab khud jodte ho — `axios` + `consul` + `nock` + `opossum` + custom middleware ka jugaad. Spring Cloud isse ek curated, pre-integrated package bana deta hai — zyada tar cheezein sirf "starter add karo, property set karo" jitni easy hoti hain.

## Kya hota hai Spring Cloud?

Ek baat clear kar dete hain — Spring Cloud koi **ek** library nahi hai. Ye ek federation hai, matlab bahut saare alag-alag projects ka ek chhata (umbrella), jisme har project distributed systems ki ek specific problem solve karta hai. Sab projects Spring Boot ke autoconfiguration model ko follow karte hain, isliye adoption zyada tar "starter add karo, property set karo" jaisa hi hota hai — bilkul waise jaise tum npm package install karke `require` kar lete ho.

### Kyun zaruri hai? Ek microservices system mein kya-kya cheezein baar-baar chahiye hoti hain

Jab tum monolith se microservices pe jaate ho (Zomato ka backend socho — order, restaurant, payment, delivery, sab alag services), ye saare sawaal baar-baar aate hain:

- Service B, service A ko dhundhega kaise? (koi hardcoded IP nahi rakh sakte, instances scale up/down hote rehte hain)
- Config kahan se aayega — har service apni `.env` file rakhe ya centralized ho?
- Agar payment-service down ho jaaye, to order-service hang ho jaaye ya gracefully fail kare?
- Ek request jo 5 services se ho ke guzri, use trace kaise karein jab kuch fail ho jaaye?
- External traffic ko andar route kaun karega — direct service tak pahunchne dein ya ek gateway se?

Spring Cloud in sab sawaalon ka jawab deta hai — ek-ek library ke through.

### Major modules — ek table mein sab kuch

| Module | Kya solve karta hai | Note |
|--------|--------|------|
| **Spring Cloud Config** | Centralized config | git-backed config server. Dekho [[05-Centralized-Config-Server]] |
| **Spring Cloud Netflix Eureka** | Service discovery | Netflix ka discovery server. Dekho [[03-Service-Discovery-Eureka]] |
| **Spring Cloud Gateway** | API gateway / edge routing | Reactive hai, Zuul ki jagah leta hai. Dekho [[04-API-Gateway-Spring-Cloud-Gateway]] |
| **Spring Cloud OpenFeign** | Declarative HTTP clients | Isko "REST ke liye Repository" bolte hain. Dekho [[07-OpenFeign]] |
| **Spring Cloud LoadBalancer** | Client-side load balancing | Ribbon ki jagah aaya hai |
| **Spring Cloud Circuit Breaker** | Resilience4j waghera ke upar abstraction | Dekho [[08-Resilience4j]] |
| **Spring Cloud Stream** | Messaging abstraction | Kafka/RabbitMQ binder. Dekho [[../11-Messaging/04-Spring-Cloud-Stream]] |
| **Spring Cloud Sleuth → Micrometer Tracing** | Distributed tracing | Dekho [[09-Distributed-Tracing]] |
| **Spring Cloud Bus** | Config changes ko broadcast karna | ek message broker use karta hai |
| **Spring Cloud Function** | Serverless adapters | AWS Lambda, Azure Functions ke liye |
| **Spring Cloud Kubernetes** | K8s-native discovery/config | K8s pe ho to Eureka ki jagah ye use hota hai |
| **Spring Cloud Vault** | HashiCorp Vault integration | secrets manage karne ke liye |

> [!warning] Netflix OSS components zyada tar maintenance mode mein hain
> Eureka, Hystrix, Ribbon, Zuul — ye sab Netflix ne open-source kiya tha, phir zyada maintain karna chhod diya. Spring Cloud ne kuch ko adopt kar liya; baaki (Hystrix, Ribbon, Zuul 1) deprecated ho chuke hain. Inke successors hain: **Resilience4j** (Hystrix ki jagah), **Spring Cloud LoadBalancer** (Ribbon ki jagah), **Spring Cloud Gateway** (Zuul ki jagah). Eureka abhi bhi kaam karta hai, lekin naye Kubernetes deployments ke liye K8s-native discovery zyada preferred hai.

### 2025 mein do raaste

**Spring Cloud + Netflix-era tools** (Eureka, Config Server, Gateway, OpenFeign, Resilience4j):
- Self-contained hai, kahin bhi chal jaata hai (VMs, bare metal, Docker, K8s).
- Zyada moving parts hain jo khud operate karne padte hain.
- Non-K8s environments ke liye achha hai.

**Kubernetes-native** (discovery ke liye kube DNS, config ke liye ConfigMaps + Secrets, Ingress + service mesh):
- Kam Spring code likhna padta hai; platform khud handle karta hai.
- Spring Cloud Kubernetes gap ko bridge karta hai (jaise ConfigMap ko `application.yml` ki tarah read karna).
- Industry ka rukh isi taraf hai.

Zyada tar production systems **hybrid** hote hain: edge pe Spring Cloud Gateway + OpenFeign + Resilience4j + tracing, lekin discovery/config Kubernetes ko de diya jaata hai. Bilkul waise jaise Zomato apna order-flow khud control karega lekin infra ka scaling AWS/K8s pe chhod dega.

## Code example

### Kya hota hai? Spring Cloud BOM

Sabse pehle samjho ki BOM kya hai. Version-matching ka headache tumne Node mein bhi dekha hoga — jab `package.json` mein alag-alag versions ke packages ek dusre se conflict karte hain. Spring Cloud BOM (Bill of Materials) ye guarantee karta hai ki tumhare saare Spring Cloud starters ke versions aapas mein compatible hain.

```xml
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>org.springframework.cloud</groupId>
            <artifactId>spring-cloud-dependencies</artifactId>
            <version>2024.0.0</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>
```

Ye BOM saare Spring Cloud starters ke versions ko align kar deta hai. Ise apne Spring Boot version ke saath match karo — release notes mein version matrix diya hota hai, wahan dekh lena.

### Ab zaroorat ke hisaab se starters add karo

```xml
<!-- discovery client -->
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-netflix-eureka-client</artifactId>
</dependency>

<!-- declarative HTTP client -->
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-openfeign</artifactId>
</dependency>

<!-- circuit breaker -->
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-circuitbreaker-resilience4j</artifactId>
</dependency>
```

### Ek typical microservice ka setup

```yaml
spring:
  application:
    name: order-service
  config:
    import: optional:configserver:http://config-server:8888

eureka:
  client:
    service-url:
      defaultZone: http://eureka:8761/eureka/

resilience4j:
  circuitbreaker:
    instances:
      paymentClient:
        sliding-window-size: 20
        failure-rate-threshold: 50

management:
  tracing:
    sampling:
      probability: 1.0
```

Bas itna hi — discovery, config, circuit breaker, tracing, sab kuch ek YAML file aur teen starters se wired ho gaya. Node mein isi kaam ke liye tumhe alag-alag libraries setup karke unhe manually glue karna padta.

### Reference topology — poora picture

```
                ┌────────────────┐
                │  Config Server │ (git-backed)
                └────────┬───────┘
                         │
   ┌─────────────────────┼─────────────────────┐
   │                     │                     │
┌──▼───┐            ┌────▼────┐           ┌────▼────┐
│Eureka│ ◄──────────│ Order   │──────────►│ Payment │
└──────┘ register   │ Service │  OpenFeign│ Service │
                    └────┬────┘           └────┬────┘
                         │                     │
                         └──────► Kafka ◄──────┘
                                    │
                              (notifications,
                               saga events)

Edge: Spring Cloud Gateway → /orders/** ko order-service pe route karta hai
Tracing: Micrometer Tracing → Zipkin/Tempo
```

Isko Zomato ke context mein socho: `Order Service` order place karta hai, Eureka mein register hota hai taaki dusre services use dhundh sakein, `Payment Service` ko OpenFeign se call karta hai, aur kisi bhi event (order confirmed, payment done) ko Kafka pe daal deta hai jo notification-service aur dusre consumers sunte hain. Edge pe Gateway hai jo bahar se aane wali requests ko sahi service tak route karta hai, aur Micrometer Tracing har request ko track karta hai poore system mein.

## Express/Node comparison

| Spring Cloud | Node ecosystem mein equivalent |
|--------------|---------------|
| Spring Cloud Config | `node-config`, `dotenv-vault`, AWS SSM |
| Eureka | Consul, etcd, k8s service DNS |
| Spring Cloud Gateway | Kong, Express Gateway, Traefik |
| OpenFeign | `axios` + interceptors, `got` |
| Resilience4j | `opossum`, `cockatiel` |
| Spring Cloud LoadBalancer | client lib + `consul-resolver` |
| Spring Cloud Stream | NestJS Microservices, `kafkajs` |
| Sleuth/Micrometer Tracing | OpenTelemetry SDK |
| Spring Cloud Bus | `kafkajs` + custom config refresh |

Asli farak ye hai: **integration**. Node mein tum best-of-breed libraries khud chunte ho aur unhe glue code se jodte ho — flexibility zyada milti hai lekin kaam bhi zyada karna padta hai. Spring Cloud pehle se glued-together aata hai, isliye setup fast hai, lekin thoda zyada opinionated bhi hai — matlab "Spring ka tarika" follow karna padta hai.

## Gotchas — ye galtiyan mat karna

> [!warning] Din pehle hi poora stack mat daal do
> Maine ek team dekhi thi jisne day one pe hi Eureka + Config Server + Gateway + Sleuth + Hystrix + Bus + Vault — sab kuch ek saath daal diya. Teen hafte baad, ek bhi actual product feature nahi bana tha, sirf infra setup karte reh gaye. Sirf wahi component add karo jiska dard tumhe abhi mehsoos ho raha ho — jaise pehle CRED app banate waqt sirf payment flow pe focus karoge, notification-microservice-mesh pe nahi.

> [!warning] Version skew ka jhamela
> Spring Cloud aur Spring Boot ka apna ek release matrix hota hai — agar versions mismatch ho gaye, to autoconfiguration fail hoga aur error messages bhi confusing honge (samajh hi nahi aayega ki problem kahan hai). Hamesha BOM use karo taaki versions automatically align rahein.

> [!warning] Eureka ka CAP tradeoff
> Eureka **AP** choose karta hai (consistency se zyada availability). Matlab network partition ke time ye stale (purani) instance list de sakta hai. Zyada tar cases mein ye fine hota hai, lekin kabhi-kabhi surprise de sakta hai — jaise ek instance down ho gaya lekin Eureka abhi bhi use "healthy" bata raha ho.

> [!tip] Zyada tar teams ko sirf itna hi chahiye: Gateway + OpenFeign + Resilience4j + tracing
> Agar tum Kubernetes pe ho, to discovery ke liye kube DNS aur config ke liye ConfigMaps use karo — Eureka aur Config Server ko skip kar do. Zaroorat na ho to extra complexity mat lo.

## Related
- [[01-What-is-a-Microservice]]
- [[03-Service-Discovery-Eureka]]
- [[04-API-Gateway-Spring-Cloud-Gateway]]
- [[05-Centralized-Config-Server]]
- [[07-OpenFeign]]
- [[08-Resilience4j]]
- [[09-Distributed-Tracing]]
