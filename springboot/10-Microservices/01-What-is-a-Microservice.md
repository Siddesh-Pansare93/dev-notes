# What is a Microservice (and when NOT to use one)

> [!info] Express/TS wale dev ke liye
> Tumne shayad Node teams ko dekha hoga jo backend ko 10 microservices mein tod dete hain sirf isliye kyunki "Netflix aisa karta hai." Spring ka tooling microservices ko itna easy bana deta hai ki temptation aur badh jaata hai. Honest baat yeh hai: **modular monolith se start karo.** Microservices tab lo jab tumhare paas koi real organizational ya scaling reason ho, na ki isliye ki architecture diagram cool lag raha hai.

## Concept

Kya hota hai ek microservice? Simple bhasha mein — ek chota, independently-deployed service jiska apna data store hota hai aur apni team responsibility hoti hai. Socho Swiggy ka backend — order lena, restaurant manage karna, delivery partner track karna, payment karna — yeh sab agar alag-alag independently deployable cheezein hain, apne apne database ke saath, toh yeh microservices hain.

Defining traits:

- **Ek team ka ownership** — Conway's Law kehta hai ki services tumhare org structure ko mirror karti hain. Jaise team ho, waisi hi service boundaries ban jaati hain.
- **Independently deployable** — Service A ko deploy karne ke liye B, C, D ko redeploy karne ki zaroorat nahi.
- **Apna data owns karta hai** — koi doosri service uske DB ko touch nahi karti. Dekho [[13-Database-per-Service]].
- **Network ke through communicate karta hai** — REST, gRPC, ya async messaging.
- **Failure-isolated** — ek service down hone se poora system down nahi hota (agar resilience sahi se set hai toh).

### Log microservices kyun choose karte hain?

1. **Independent deployment** — chhoti teams bina coordination ke apna kaam ship kar sakti hain.
2. **Independent scaling** — sirf recommendation engine ko 50 replicas chahiye, baaki ko nahi. Jaise Flipkart pe Big Billion Day ke time sirf checkout aur search service scale karni padti hai, poora system nahi.
3. **Tech heterogeneity** — transactions ke liye Java, ML ke liye Python, proxies ke liye Go. Har kaam ke liye best tool use kar sakte ho.
4. **Fault isolation** — `notifications` service mein memory leak ho jaaye toh `checkout` service nahi marti.
5. **Org scaling** — 200 engineers ek hi repo mein kaam karein toh coordination ek nightmare ban jaata hai.

### Log microservices ka pachhtaava kyun karte hain?

1. **Distributed systems HARD hote hain.** Network failures, partial outages, retries, idempotency, eventual consistency — har problem ab ek distributed problem ban jaati hai.
2. **Operational overhead** — 30 services × deploy pipelines × dashboards × oncall rotations. Matlab 30 gunA zyada operational headache.
3. **Debugging bahut mushkil ho jaati hai** — ek request ab 8 services se hokar guzarti hai. Dekho [[09-Distributed-Tracing]].
4. **Distributed transactions** — services ke beech koi `BEGIN; ...; COMMIT;` nahi hota. Dekho [[10-Saga-Pattern]].
5. **Latency ka cost** — har network hop ~1-10ms lagta hai. Chhota lage but 8 hops mein add ho jaata hai.
6. **Data consistency** — tumhara nice ACID monolith gaya. Ab welcome to [[14-Eventual-Consistency]].

> [!danger] Sam Newman ka rule
> "Agar tum ek well-structured monolith nahi bana sakte, toh kya lagta hai microservices tumhare liye answer hain?"

### Monolith first — pehle monolith banao

Kya hota hai modular monolith? Ek hi deployable unit hoti hai, lekin uske andar strict module boundaries hoti hain — separate Maven modules, koi cross-module DB access nahi, defined APIs. Yeh almost hamesha sahi starting point hota hai.

```
my-app (monolith)
├── modules/
│   ├── orders/        ← baad mein service ban sakta hai
│   ├── catalog/
│   ├── shipping/
│   └── payments/
└── application.java
```

Jab ek module ke paas yeh saari cheezein ho:
- Ek clear, stable API
- Apni khud ki scaling needs
- Ek team jo use end-to-end owns kare
- Independently deploy karne ka ek real reason

...tab usse extract karo. Uske pehle nahi.

### "Kya mujhe microservices use karne chahiye?" — honest checklist

Microservices use karo agar **zyadatar** yeh baatein sach hain:

- [ ] 20+ engineers ek hi codebase pe kaam kar rahe hain.
- [ ] Alag-alag parts ke scaling profiles bilkul alag hain.
- [ ] Alag-alag parts ko genuinely alag tech stacks chahiye.
- [ ] Tumhare paas mature DevOps capability hai (CI/CD, monitoring, on-call).
- [ ] Tum latency ka cost absorb kar sakte ho.
- [ ] Tum shared logic ko 4 baar rewrite karne ke liye ya shared libs mein invest karne ke liye tayaar ho.

Agar zyadatar false hain: **modular monolith jao.** Baad mein hamesha extract kar sakte ho. Ulta direction ("services ka jaal" → monolith) ek multi-quarter project ban jaata hai — bahut painful hota hai.

## Code example

Ek modular monolith Maven mein (jo baad mein microservices mein extract ho sake):

```xml
<!-- parent pom.xml -->
<modules>
    <module>app-orders</module>
    <module>app-catalog</module>
    <module>app-shipping</module>
    <module>app-shell</module>   <!-- yeh hai asli Boot app -->
</modules>
```

Module boundaries [Spring Modulith](https://spring.io/projects/spring-modulith) ke through enforce ki jaati hain:

```java
// app-orders/src/main/java/com/example/orders/package-info.java
@org.springframework.modulith.ApplicationModule(
    allowedDependencies = { "shared" }
)
package com.example.orders;
```

`orders` module ka `OrderService` `shipping` se directly import nahi kar sakta — sirf published events ya APIs ke through. Tests isko prove karte hain:

```java
@Test
void modulesRespectBoundaries() {
    ApplicationModules.of(MyApp.class).verify();
}
```

Jab baad mein tum `orders` ko apni khud ki service mein extract karoge, boundary pehle se hi ready hoti hai.

### Ek simple HTTP-based microservice (Spring Boot)

```java
@SpringBootApplication
public class OrderServiceApp {
    public static void main(String[] args) {
        SpringApplication.run(OrderServiceApp.class, args);
    }
}

@RestController
@RequestMapping("/api/orders")
class OrderController {
    private final OrderService service;
    OrderController(OrderService service) { this.service = service; }

    @PostMapping
    OrderResponse place(@RequestBody @Valid CreateOrder cmd) {
        return service.place(cmd);
    }
}
```

Bas itna hi. Spring mein ek microservice sirf ek focused-responsibility wala Boot app hai. Complexity kisi ek service se nahi aati — woh **poore system** se aati hai jab tum sabko jodte ho.

## Express/Node comparison

| Spring world | Node world |
|--------------|------------|
| Spring Modulith wala modular monolith | Nx monorepo with library boundaries |
| Spring Cloud + Eureka + Config Server | NestJS Microservices, ya Kubernetes-native |
| Resilience4j circuit breakers | `opossum` |
| OpenFeign | `axios` retry interceptors ke saath |
| Spring Cloud Stream | `kafkajs` / `bullmq` |
| Service mesh (Istio) | (same — Istio language-agnostic hai) |

Spring Cloud ecosystem tumhe batteries-included tools deta hai jo Node teams ko haftey lagte hain assemble karne mein.

## Gotchas

> [!danger] Microservices ek organizational pattern hai, technical nahi
> Agar tumhara org coordinated changes ship nahi kar sakta, microservices usko fix nahi karenge — woh problem ko aur zyada painfully surface karenge.

> [!warning] "Nano-services" ka jaal
> 50 services jinme se 30 sirf ek table ke around CRUD wrappers hain. Tumne method calls ko network calls bana diya aur badle mein kuch bhi nahi mila.

> [!warning] Distributed monolith
> Paanch "microservices" jinhe saath mein deploy karna padta hai kyunki woh ek DB share karte hain ya unme synchronous chains hain. Yeh dono duniya ka sabse bura combo hai — microservices ki complexity, monolith ki flexibility bhi nahi.

> [!warning] Har service ≈ ek team
> Ek team plausibly 1-3 services own kar sakti hai. 5 services per 2-person team ka matlab hai koi bhi unme se kisi ko theek se nahi samajhta.

> [!tip] Ek service se start karo
> Chahe tumhe "pata" ho ki microservices chahiye, phir bhi ek service ship karo. Doosri tab add karo jab clear seam dikhe. Architecture emerge hota hai — top-down design nahi hota.

## Related
- [[02-Spring-Cloud-Overview]]
- [[13-Database-per-Service]]
- [[14-Eventual-Consistency]]
- [[10-Saga-Pattern]]
- [[12-Service-Mesh-vs-Library]]
- [[06-Inter-Service-Communication]]
