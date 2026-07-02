# MOC: Microservices, Messaging, Observability, Deployment

Socho ek second ke liye — Zomato ka order place karte ho. Tumne app khola, restaurant select kiya, item cart mein daala, payment kiya, order track kiya. Ye sab ek hi codebase se nahi hota. Alag-alag teams hain — ek team payment handle karti hai, ek team restaurant listing karti hai, ek team delivery tracking karti hai. Har team independently deploy karti hai, independently scale karti hai, independently fail karti hai.

Yehi hai microservices ka asli maqsad — bade, complex systems ko manageable, independently deployable pieces mein todna.

Lekin — aur ye ek bada lekin hai — microservices ka matlab hai distributed systems. Aur distributed systems ki duniya mein, **ek hi Spring Boot app chalana alag baat hai, aur 10 services ko saath mein chalana bilkul alag khel hai**. Network failures, partial failures, data consistency issues, service discovery, load balancing — ye sab problems suddenly tumhara headache ban jaati hain.

Ye MOC (Map of Content) usi ke liye hai — jab tumhare paas ek Spring Boot app hai aur ab tum "next level" pe jaana chahte ho.

> [!info] Ye MOC kya cover karta hai?
> Ek single Spring Boot service se aage ka safar — service discovery, async messaging, observability (logs/metrics/traces), containerization, aur Kubernetes deployment. Plus resilience patterns jo distributed systems ko giraane se bachate hain.

> [!tip] Padhne ka sahi order
> Microservices fundamentals → messaging → observability → deployment. **Microservices mein mat jaao jab tak monolith dard na de.** Zyaadatar teams ko pehle ek hi Spring Boot service ko properly deploy karna + observe karna sikhna chahiye.

---

## Node.js Background Se Aaye Ho? Ye Pehle Samjho

Tumhare liye kuch context — Node.js mein tum usually ek hi Express/Fastify app chalate ho. Scaling ke liye `cluster` ya PM2 use karte ho, ya phir horizontal scaling with a load balancer ke peeche. Sab kuch ek process mein, ek codebase mein.

Spring Boot microservices mein:

| Concept | Node.js/Express | Spring Boot Microservices |
|---|---|---|
| Service discovery | Manually env vars mein URLs | Eureka / Consul / k8s DNS |
| Load balancing | Nginx / ALB | Spring Cloud LoadBalancer |
| Config management | `.env` files | Spring Cloud Config Server / k8s ConfigMaps |
| Circuit breaking | `opossum` library (rarely used) | Resilience4j (first-class citizen) |
| Distributed tracing | Manual (mostly skipped) | Micrometer Tracing (built-in) |
| Messaging | Bull/BullMQ, simple queues | Spring Kafka, RabbitMQ, Spring Cloud Stream |

Node.js ecosystem mein ye sab "optional extras" hain. Spring Boot microservices mein ye **survival tools** hain.

---

## Microservices Fundamentals

### Kya Hota Hai Aur Kyun Zaruri Hai?

Imagine karo BigBasket ka codebase. Pehle ek hi Rails monolith tha. Jab 10 developers the, sab kuch theek tha. Jab 200 developers ho gaye, aur har team dusri team ka wait karti thi deploy karne ke liye — tab microservices ki zarurat aayi.

Microservices ka matlab hai: **chota, single-responsibility service jo independently deploy ho sake, independently scale ho sake, aur independently fail ho sake** (aur failure poore system ko crash na kare).

- [[01-Microservices-Overview]] — kab microservices, kab nahi, aur ye kya tax lagate hain. **Ye pehle padho.** Premature microservices ek real problem hai — Netflix bhi monolith se start kiya tha.

- [[02-Service-Discovery]] — Eureka, Consul, k8s native service discovery. Problem: 10 services hain, har service ka IP dynamically assign hota hai containers mein — kaun kahan hai? Service registry solve karta hai ye.

- [[03-API-Gateway]] — Spring Cloud Gateway. Ye tumhara single entry point hai bahar se. Authentication, rate limiting, routing — sab yahan. Node.js mein ye Nginx ya Express Gateway jaisa hai, lekin zyaada powerful.

- [[04-Centralized-Config]] — Spring Cloud Config Server, k8s ConfigMaps. 20 services hain, har ek ka alag `application.properties` hai — maintenance nightmare. Config Server ek jagah se sab ko config deta hai.

- [[05-Inter-Service-Communication]] — sync (REST/gRPC) vs async (events). Kab synchronous call karo, kab Kafka event publish karo — ye decision bahut important hai architecture ke liye.

- [[06-Saga-Pattern]] — distributed transactions. Ek order place karne mein payment service, inventory service, aur order service — teeno mein kuch likhna hai. Ek fail ho gaya to? Traditional 2PC nahi chalega. Saga pattern ye solve karta hai.

- [[07-Outbox-Pattern]] — reliable event publishing. Database mein save kiya, Kafka mein publish karne se pehle service crash ho gaya — to event lost. Outbox pattern guarantee deta hai ki event publish hoga.

- [[08-Idempotency-and-Deduplication]] — same event/request baar baar aaye to? Duplicate operations se bachne ke patterns.

---

## Resilience Patterns — Jab Kuch Bhi Kabhi Bhi Toot Sakta Hai

### Kyun Zaruri Hai?

Distributed system mein ye assume karo: **kuch na kuch kabhi fail karega**. Network timeout, downstream service down, database overloaded. Tumhara code in failures ke against resilient hona chahiye.

Ye wahi moment hai jab Node.js background wale developers ko culture shock lagta hai. Express mein agar ek external API slow hai, timeout kar dete ho, done. Microservices mein ye cascading failure ban jaata hai — ek slow service ne poore call chain ko block kar diya, aur suddenly 50 services hang hain.

> [!warning] Cascading Failure — Real Danger
> Service A → Service B → Service C. Agar C slow ho jaya, B ke threads/connections exhaust ho jaate hain, aur A bhi hang ho jaata hai. Ek service ki slow response ne 3 services ko effectively down kar diya. Circuit breaker ye rokta hai.

- [[01-Resilience-Patterns-Overview]] — timeouts, retries, bulkheads, circuit breakers. Teeno ko samjho before diving into implementation.

- [[02-Resilience4j-Circuit-Breakers]] — Spring Boot ka go-to library resilience ke liye. Circuit breaker 3 states mein hota hai: Closed (normal), Open (fail fast, downstream ko call mat karo), Half-Open (thodi calls try karo dekho kaisa hai). Swiggy ke delivery partner service pe socho — agar 5 baar consecutive fail ho, to circuit open karo aur cached response do.

- [[03-Retry-and-Backoff]] — network blip pe retry karo, lekin exponential backoff ke saath. Seedha retry mat karo — agar service already overloaded hai, aggressive retries usse aur maar denge.

- [[04-Bulkhead-and-Rate-Limiting]] — bulkhead pattern ships se aaya hai. Agar ek compartment mein paani ghus aaya, poora ship nahi doobega. Ye idea: ek service ke liye alag thread pool, taaki uski failure doosri services ko affect na kare.

- [[05-Timeout-Strategy]] — har external call pe timeout hona chahiye. Koi default nahi hota. Bina timeout ke thread indefinitely block rahegi.

---

## Messaging — Async Ka Asli Khel

### Kya Hota Hai Jab Sync Nahi Chalega?

Socho Flipkart pe Big Billion Day sale. Order place hua. Kya payment service, inventory service, notification service, analytics service — sab synchronously ek ke baad ek call karo? Agar notification service slow hai, customer 10 second wait kare order confirmation ke liye?

Nahi. Order place hone ke baad ek event publish karo — `order.created`. Notification service, analytics service, loyalty points service — sab independently consume karein us event ko. Customer ko milliseconds mein response milega. Baaki background mein hoga.

Yehi hai event-driven architecture ka core idea.

- [[01-Spring-Kafka]] — producers, consumers, listeners. Kafka high-throughput, persistent messaging ke liye. CRED jaisi company logs, events sab Kafka se process karti hai. Seekho kaise Spring Boot mein producers aur consumers likhte hain.

- [[02-Event-Driven-Architecture]] — events ke around design karna. OrderPlaced, PaymentProcessed, ItemShipped — ye events hain. Services inhe publish aur consume karti hain. Coupling kam hoti hai, flexibility badti hai.

- [[03-Spring-AMQP-RabbitMQ]] — RabbitMQ use case: jab tumhe complex routing chahiye (exchanges, queues, binding keys). Kafka se different hai — RabbitMQ message delivery ke liye, Kafka event streaming ke liye. Use case ke hisab se choose karo.

- [[04-Spring-Cloud-Stream]] — vendor-neutral abstraction Kafka aur RabbitMQ ke upar. Kal Kafka se RabbitMQ pe switch karna ho to code nahi badlega. Achha abstraction, lekin leaky abstraction bhi — internals samajhna padega eventually.

- [[05-Schema-Evolution-and-Avro]] — event ka schema badal gaya? Old consumers kaise handle karenge? Avro + Schema Registry ka combo. Ye production mein bahut important hai — ek naively changed event schema ne downstream services tod di, ye common failure mode hai.

- [[06-Dead-Letter-Topics]] — message process nahi ho pa raha, baar baar fail ho raha hai? Dead letter topic pe bhejo. Manual inspection aur reprocessing ke liye. Bina DLT ke, poison pill messages tumhara consumer indefinitely block kar denge.

> [!warning] Premature Kafka — Mat Karo Ye Galti
> Kafka add karna 2-service system mein sirf "events achhe lagte hain" ki wajah se galat hai. Synchronous REST calls + retries + Resilience4j zyaada simple hain. Kafka tab laao jab real fanout ho, replay ki zarurat ho, ya bahut saare consumers ho.

---

## Observability — Andhere Mein Kya Ho Raha Hai?

### Kyun Zameen Se Juda Rehna Zaruri Hai?

10 microservices chal rahe hain. User ne complain kiya — "checkout slow hai." Tumhare paas koi logs nahi, koi metrics nahi, koi tracing nahi. Ab kaha se start karoge? Poore system ka guess-work?

Ye hai observability ka problem. Observability ka matlab hai: **production mein kya ho raha hai ye samajhne ki capability, bina naya code deploy kiye.**

> [!tip] Observability Ke Teen Pillars
> 1. **Logs** — kya hua? (`ERROR: Payment failed for orderId=12345`)
> 2. **Metrics** — kitni baar hua? Kitna time laga? (`http_requests_total`, `jvm_memory_used`)
> 3. **Traces** — request kahan-kahan gayi aur kitna time kahin laga? (Service A → B → C ka pura journey)
>
> Teeno chahiye production mein. Ek bhi missing ho to aandha hai tumhara debugging.

- [[01-Spring-Boot-Actuator]] — Spring Boot ka built-in observability Swiss Army knife. `/actuator/health`, `/actuator/metrics`, `/actuator/info` endpoints free mein milte hain. Node.js mein ye manually setup karna padta hai.

- [[02-Micrometer-Metrics]] — Micrometer metrics abstraction hai — Prometheus, Datadog, CloudWatch pe push kar sako bina code change kiye. JVM memory, garbage collection, HTTP request latencies — sab auto-instrumented. Custom business metrics bhi add kar sakte ho: `howManyOrdersProcessed.increment()`.

- [[03-Logging-Best-Practices]] — JSON structured logging, correlation IDs, log levels. Plain text logs se kuch nahi milega jab 10 services chal rahi hain. JSON logs Elasticsearch/Splunk/CloudWatch mein searchable hote hain. Ye basic hai, lekin most beginners galat karte hain.

- [[04-Distributed-Tracing]] — **ye ek hi cheez hai jo distributed debugging possible banati hai**. Ek user request 5 services se guzri — kaun sa service slow tha? Micrometer Tracing + Zipkin/Jaeger tumhe pura picture deta hai. TraceId har service ke logs mein propagate hoti hai — ek search mein poora request journey milta hai.

- [[05-Health-Checks-and-Readiness]] — k8s mein liveness aur readiness probes. Liveness: "kya service zinda hai?" Readiness: "kya service traffic le sakti hai?" Ye dono alag hain. Service zinda ho sakti hai (JVM chal raha hai) lekin ready nahi (database connection nahi mili abhi tak).

---

## Deployment — Code Ko Real World Mein Laana

### Ye Sirf `npm start` Nahi Hai

Production deployment ka matlab hai: containerization, orchestration, health checks, rollouts, rollbacks, environment-specific config. Ye sab manually nahi hoga.

- [[01-Packaging-Fat-JAR]] — Spring Boot ka executable JAR — sab kuch ek file mein, JVM ke baad kuch install karne ki zarurat nahi. Node.js mein `node dist/index.js` jaisa hai, lekin self-contained.

- [[02-Docker-for-Spring-Boot]] — Spring Boot ko Docker image mein kaise bandho theek se. Multi-stage builds, layer caching, non-root user — ye sab production best practices hain. Node.js Docker best practices se similar, lekin kuch Spring-specific gotchas hain.

- [[03-GraalVM-Native-Image]] — Spring Boot ko native binary mein compile karo. Koi JVM nahi, instant startup (milliseconds mein vs seconds), bahut kam memory. Serverless functions ke liye game-changer. Cost: build time zyaada, kuch libraries support nahi karte.

- [[04-Kubernetes-Basics]] — Spring Boot ke liye Kubernetes manifests — Deployment, Service, ConfigMap, Secret, Ingress. Ye sab samjho before k8s pe deploy karo.

- [[05-CI-CD-Pipeline-Example]] — GitHub Actions ya Jenkins pipeline jo build → test → Docker image → k8s deploy kare. Automated pipeline ke bina microservices maintain karna insaan ki capacity se bahar hai.

- [[06-Profiles-Per-Environment]] — `dev`, `staging`, `prod` — har environment ka alag config. Spring profiles iske liye perfect hai. `application-dev.properties`, `application-prod.properties` — Spring automatically right one load karta hai.

- [[07-Twelve-Factor-Spring]] — 12-Factor App principles Spring Boot ke context mein. Config environment variables mein, stateless processes, port binding, logs to stdout — ye production-ready app ke fundamentals hain.

- [[08-Kubernetes-From-Scratch]] — Docker jaante ho? K8s tumhare containers manage karta hai. Ye file Docker-familiar developers ke liye k8s primer hai — Pods, Deployments, Services, Ingress sab Docker analogies ke saath explain kiya gaya hai.

- [[09-Stack-Specific-Eureka-Gateway-Feign-on-K8s]] — Eureka + Gateway + Feign + Security + JPA — poora stack ek saath k8s pe. End-to-end guide. Jab teena sab padh lo tab ye karo.

---

## Security in Distributed Systems

### Ab Ek Bhi Service Public Ho Sakti Hai — Security Doubled

Monolith mein ek entry point tha. Microservices mein har service potentially ek attack surface hai. Service-to-service communication bhi secure karna padega.

- [[04-JWT-with-Spring-Security]] — stateless auth across services. User authenticate hua API Gateway pe, JWT mila, aur wo JWT har downstream service call mein header mein jaata hai. Har service apne aap verify karti hai JWT — koi central auth call nahi. Node.js mein `jsonwebtoken` + `express-jwt` jaisa, lekin Spring Security mein zyaada streamlined.

- [[05-OAuth2-OIDC-with-Spring]] — jab real Identity Provider chahiye. Google, Keycloak, Auth0, Okta. User ne Google se login kiya, token aaya, Spring Security ne validate kiya. Enterprise apps ke liye standard.

- [[07-CSRF-Sessions-and-Stateless-APIs]] — stateless REST APIs mein CSRF kyun nahi chahiye, kab sessions use karo, kab nahi. Common confusion — isko clear karo.

---

## Cross-References

- [[03-MOC-Spring]] — single service ke liye sab kuch. Pehle wo padho.
- [[01-Library-Cheatsheet]] — Resilience4j, Caffeine, Spring Kafka quick reference

---

## Pragmatic Adoption Order — Sahi Kram Mein Seekho

> [!tip] Kya adopt karo, kis order mein
> 1. **Pehle ek Spring Boot service** properly deploy karo — Docker + k8s + Actuator + Prometheus + JSON logs. ([[02-Docker-for-Spring-Boot]], [[02-Micrometer-Metrics]], [[03-Logging-Best-Practices]])
> 2. **Distributed tracing early add karo** ([[04-Distributed-Tracing]]) — ek service pe bhi useful hai, aur baad mein nahi add karna chahoge
> 3. **Resilience** outbound calls pe add karo ([[02-Resilience4j-Circuit-Breakers]]) — har external HTTP call ko protect karo
> 4. **Pehli secondary service** tab split karo jab team ya scale genuinely demand kare
> 5. **Async messaging** ([[01-Spring-Kafka]]) tab laao jab legitimate event-driven flows hon — sirf "decouple karna hai" is reason se nahi
> 6. **Service discovery / gateway** ([[02-Service-Discovery]], [[03-API-Gateway]]) tab reach karo jab 3+ services ho jaaye

---

## Common Traps — Ye Galtiyan Mat Karna

> [!warning] Distributed Monolith — Sabse Badi Galti
> Agar tumhare services:
> - Ek hi database share karte hain
> - Saath deploy hote hain (ek service change hoi to sab deploy karo)
> - Saath fail hote hain
>
> ...to tumne distributed monolith banaya hai. Latency ka tax le liya, microservices ka koi fayda nahi mila. Read [[01-Microservices-Overview]] before splitting anything.

> [!warning] Premature Microservices — Ye Bhi Trap Hai
> Team 3 developers hai, product abhi bana hi raha hai, aur tum 5 microservices se start kar rahe ho? Galat. Monolith se start karo. Jab real pain points dikhein — specific module independently scale karna hai, ya alag team chahiye — tab split karo. Amazon, Netflix, Uber — sab ne monolith se start kiya.

> [!warning] No Observability = Blind Flying
> 10 microservices deploy kar diye, koi logging strategy nahi, koi tracing nahi, koi metrics nahi. Production mein kuch toot gaya — ab kya? Observability boring lagta hai jab sab kuch chal raha hota hai. Jab kuch toot ta hai tab tumhe pata chalta hai ye kitna critical tha.

> [!warning] Service-to-Service Hardcoded URLs
> `http://localhost:8081/api/orders` hardcode kiya ek service mein? Ye k8s mein kaam nahi karega. Service discovery ya k8s DNS names use karo. `http://order-service/api/orders` — ye sahi hai.

> [!warning] No Health Checks = Broken Pods Serving Traffic
> K8s pe deploy kiya, readiness probe nahi lagayi. Service crash ho gayi ya database connection nahi mili — k8s ko pata nahi, woh traffic bhejta rahega broken pod pe. Health checks mandatory hain.

---

## Tumhare Specific Stack Ke Liye (Eureka + Gateway + Feign + Security + JPA on Docker/k8s)

> [!info] Ye reading order follow karo agar Eureka + Gateway + Feign ka stack use kar rahe ho
> 1. [[02-Spring-Cloud-Overview]] — Spring Cloud umbrella mein kya-kya hai
> 2. [[03-Service-Discovery-Eureka]] — registry kaise kaam karta hai
> 3. [[07-OpenFeign]] — declarative HTTP client services ke beech
> 4. [[04-API-Gateway-Spring-Cloud-Gateway]] — public entry point
> 5. [[08-Resilience4j]] — cascading failures rokna
> 6. [[02-Docker-for-Spring-Boot]] — Spring Boot image banana
> 7. [[08-Kubernetes-From-Scratch]] — Docker se k8s mental model
> 8. [[04-Kubernetes-Basics]] — full Spring Boot k8s manifests
> 9. [[09-Stack-Specific-Eureka-Gateway-Feign-on-K8s]] — sab ek saath jodte hain

---

## Suggested Study Path — Agar Sirf 5 Cheezein Karni Ho

> [!tip] Is MOC se sirf 5 cheezein karo to ye karo
> 1. [[02-Docker-for-Spring-Boot]] — properly containerize karo
> 2. [[08-Kubernetes-From-Scratch]] + [[04-Kubernetes-Basics]] + [[05-Health-Checks-and-Readiness]] — k8s pe theek se chalao
> 3. [[03-Logging-Best-Practices]] + [[04-Distributed-Tracing]] — andhe mat raho production mein
> 4. [[02-Resilience4j-Circuit-Breakers]] — outbound calls protect karo
> 5. [[09-Stack-Specific-Eureka-Gateway-Feign-on-K8s]] — tumhara specific stack wire karo

---

## Key Takeaways

- **Microservices ek solution hai, problem nahi** — pehle monolith banao, jab genuinely dard ho tab split karo
- **Distributed systems ka matlab hai distributed failures** — resilience patterns (circuit breaker, retry, bulkhead, timeout) survival tools hain, optional nahi
- **Observability non-negotiable hai** — logs + metrics + traces teeno chahiye before tum scale karo. Ek bhi missing = debugging nightmare
- **Async messaging tab use karo jab real need ho** — fanout, replay, many consumers. Simple REST + retry zyaadatar cases ke liye enough hai
- **Health checks mandatory hain** — liveness + readiness probes bina k8s meaningful nahi hai
- **Node.js se aaye ho to infrastructure ka tax samjho** — Spring Boot ka ecosystem (Eureka, Gateway, Resilience4j, Actuator) in-built hai, Node.js mein ye sab manually setup karna padta hai
- **Config externalize karo** — hardcoded URLs, passwords, environment-specific values — sab environment variables ya Config Server mein
- **Observability pehle, microservices baad mein** — ek service ko properly observe karna seekho before 10 services manage karne ka try karo

---

## Related
- [[00-README]]
- [[01-Learning-Path]]
- [[03-MOC-Spring]]
- [[07-Twelve-Factor-Spring]]
- [[07-Recommended-Reading]]
