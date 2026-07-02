# Service Mesh vs Library (Istio/Linkerd vs Spring Cloud)

> [!info] Express/TS dev ke liye
> mTLS, retries, circuit breakers, traffic shifting, observability — ye saare cross-cutting concerns (jo har service ko chahiye) do jagah rakhe ja sakte hain: tumhare **app code** mein (libraries jaise Spring Cloud, Resilience4j) ya phir **platform level** pe (ek service mesh jaise Istio, Linkerd, Consul Connect). Dono ke apne tradeoffs hain. Polyglot teams (multiple languages) mesh ki taraf jaati hain; pure Java/Spring teams often Spring Cloud pe hi tike rehte hain.

## Concept

Socho tumhare paas 50 microservices hain — kuch Java mein, kuch Node mein, kuch Python mein. Har service ko chahiye: retries, timeouts, encryption, load balancing. Ab do raaste hain — ya to har service ke andar ye logic likho (library approach), ya phir ek "common guard" har service ke bahar khada kar do jo ye sab automatically handle kare (mesh approach).

**Service mesh** bilkul yahi karta hai — har service ke saath ek chhota sa proxy chalata hai jise **"sidecar"** kehte hain (jaise Zomato delivery partner ke saath ek assistant chalta ho jo traffic, payment verification, aur route optimization sab sambhal le, delivery partner sirf khana deliver karne pe focus kare). Service ka saara traffic — in bhi, out bhi — is proxy se hokar guzarta hai. Ye proxies centrally configure hote hain ek **"control plane"** se, aur ye provide karte hain:

- mTLS (services ke beech encrypted, authenticated traffic)
- Retries, timeouts, circuit breakers
- Load balancing
- Traffic splitting (canary, A/B testing)
- Observability (metrics, logs, tracing)
- Authorization policies

```
┌─────────────────────┐    ┌─────────────────────┐
│ Pod                 │    │ Pod                 │
│ ┌────────┐ ┌──────┐ │    │ ┌────────┐ ┌──────┐ │
│ │ App    │─│Envoy │─┼────┼─│ Envoy  │─│ App  │ │
│ └────────┘ └──────┘ │    │ └────────┘ └──────┘ │
└─────────────────────┘    └─────────────────────┘
        │                          │
        └─────► Control Plane ◄────┘
            (Istio, Linkerd, etc.)
```

Yahan interesting baat ye hai — app khud simple ho jaata hai. Koi Resilience4j nahi, koi mTLS setup nahi, code mein koi retry logic nahi. Sab kuch sidecar proxy sambhal leta hai.

### Library approach (Spring Cloud)

Isme resilience ka saara logic app ke andar hi baitha hota hai:

```
┌─────────────────────────────┐
│ Spring Boot App             │
│ ├─ OpenFeign (client)       │
│ ├─ Resilience4j             │
│ ├─ Spring Cloud Gateway     │
│ ├─ Micrometer Tracing       │
│ └─ Eureka client            │
└─────────────────────────────┘
```

Yaani app khud apna bouncer hai — apni security, apni retries, sab kuch khud handle karta hai.

### Comparison

Kya farak padta hai dono approach mein? Table dekho:

| Concern | Library (Spring Cloud) | Mesh (Istio) |
|---------|----------------------|--------------|
| Kahan chalta hai | Tumhare JVM ke andar | Sidecar proxy mein (Envoy) |
| Language | Sirf Java/Spring | Koi bhi language |
| Config | App ke andar YAML | CRDs / VirtualService / DestinationRule |
| Updates | App redeploy karna padega | Sirf mesh config update karo (app redeploy nahi chahiye) |
| mTLS | Manual (Spring Security ya custom) | Free, automatic |
| Latency cost | Negligible | +1-3ms per hop |
| Operational complexity | Kam (extra infra nahi chahiye) | Zyada (control plane, sidecars manage karne padenge) |
| Resource cost | Sirf app memory | +50-200MB RAM per pod sidecar ke liye |
| Polyglot support | Non-Java services ke liye kaam nahi aata | Kisi bhi service ke liye kaam karta hai |
| Local dev | Bas apps run karo | Mushkil (mesh nahi hota local mein) |

### Kaunsa use karein kab?

**Libraries (Spring Cloud) use karo agar:**
- Zyadatar services Java/Kotlin mein hain
- Kubernetes pe nahi ho
- Team chhoti hai, simple ops chahiye
- Business logic ke andar fine-grained control chahiye

**Mesh use karo agar:**
- Polyglot stack hai (Java + Go + Python + Node — jaise Swiggy ka backend jisme alag alag teams alag language use karti hain)
- Pehle se hi Kubernetes pe ho
- Uniform mTLS / zero-trust chahiye sab services ke beech
- Tumhare paas platform engineers hain jo ye complexity manage kar sakein
- Traffic rules update karne ho bina redeploy kiye

**Hybrid (sabse common approach):**
- App mein OpenFeign rakho declarative clients ke liye + Resilience4j fine-grained policies ke liye
- Mesh de mTLS, observability, traffic shifting
- > [!warning] Dhyan rakhna — retries duplicate mat karo (mesh retries YA Resilience4j retries — dono ek saath nahi)

## Code example

### Spring Cloud (library) — in-app tareeka

```java
@FeignClient(name = "payment-service")
interface PaymentClient {
    @PostMapping("/charge")
    @CircuitBreaker(name = "paymentClient")
    @Retry(name = "paymentClient")
    ChargeResponse charge(@RequestBody ChargeRequest req);
}
```

```yaml
resilience4j:
  circuitbreaker:
    instances:
      paymentClient:
        failure-rate-threshold: 50
  retry:
    instances:
      paymentClient:
        max-attempts: 3
```

### Istio (mesh) — platform tareeka

Yahan Spring app se resilience code **hata diya gaya hai** — bilkul plain:

```java
@FeignClient(name = "payment-service", url = "http://payment-service")
interface PaymentClient {
    @PostMapping("/charge")
    ChargeResponse charge(@RequestBody ChargeRequest req);
}
```

Retry aur circuit-breaker ka behavior ab Istio ke CRDs se aata hai cluster mein — app ko pata bhi nahi chalta:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: payment
spec:
  hosts: [payment-service]
  http:
    - route:
        - destination: { host: payment-service }
      retries:
        attempts: 3
        perTryTimeout: 2s
        retryOn: 5xx,reset,connect-failure
      timeout: 6s
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: payment
spec:
  host: payment-service
  trafficPolicy:
    connectionPool:
      tcp: { maxConnections: 100 }
      http: { http1MaxPendingRequests: 100, maxRequestsPerConnection: 10 }
    outlierDetection:                     # circuit breaker
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s
```

mTLS bhi ek single mesh-wide policy se aata hai — ek jagah likho, sab pe apply ho jaata hai:

```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: STRICT
```

Ab har service-to-service call encrypted aur authenticated hai — bina app ki ek bhi line likhe. Jaise UPI ka underlying encryption — tumhe usko implement karne ki zaroorat nahi, platform khud sambhal leta hai.

### Canary deployment Istio ke saath

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
spec:
  hosts: [payment-service]
  http:
    - route:
        - destination: { host: payment-service, subset: v1 }
          weight: 95
        - destination: { host: payment-service, subset: v2 }
          weight: 5
```

Socho — jaise Swiggy naya checkout flow sirf 5% users ko dikhana chahta hai test karne ke liye. Mesh mein ye sirf weight change karna hai. App code mein yahi karna ho to custom load-balancer logic aur feature flags likhne padenge — kaafi zyada kaam.

### Observability free mein

Istio har request ke liye standard metrics emit karta hai — tumhe kuch instrument nahi karna padta:

```
istio_requests_total{source_workload="order-service",destination_service="payment-service",response_code="200"}
istio_request_duration_milliseconds_bucket{...}
```

Tracing spans automatically Envoy generate karta hai, bas headers propagate hone chahiye (Spring Boot ye khud kar deta hai Micrometer Tracing ke saath). Dekho [[09-Distributed-Tracing]].

## Express/Node comparison

Node wale dev ke liye ye samajhna easy hai:

| Library | Mesh |
|---------|------|
| Node: `opossum`, `axios-retry`, `consul-resolver` | Istio Node services ke liye **bina kisi change ke** kaam karta hai |
| Spring Cloud equivalent | Linkerd, Consul Connect, AWS App Mesh — sab language-agnostic |

Mesh ka sabse bada selling point yahi hai: **same policies uniformly** apply hoti hain tumhare Java service pe bhi, Node service pe bhi, aur Python service pe bhi. Library approach mein tumhe har language mein alag se reimplement karna padta hai — jaise agar Zomato ka har team (Java, Node, Python) apna khud ka retry logic likhe, to maintain karna nightmare ban jaayega.

## Gotchas

> [!danger] Double-retry mat karo
> Agar Resilience4j aur Istio dono retry kar rahe hain, to failure hone pe N×M retry attempts ho jaayenge — load catastrophically amplify ho jaata hai. Har concern ke liye ek hi layer choose karo.

> [!warning] Sidecar startup ordering
> Apps network calls karna shuru kar sakte hain Envoy ready hone se pehle bhi (K8s pre-1.29 mein). Istio recommend karta hai `holdApplicationUntilProxyStarts: true` set karna.

> [!warning] Sidecar resource cost
> 100-200MB RAM × hazaaron pods — ye jod ke bahut ho jaata hai. Linkerd ka Rust-based proxy zyada lean hai (~10MB) Envoy ke comparison mein.

> [!warning] Local dev bina mesh ke
> Devs jab localhost pe services chalate hain, wahan mesh nahi hota. Options: (a) Tilt/Skaffold use karo local k8s pe deploy karne ke liye, (b) behavior same rakho with-or-without mesh, (c) lightweight in-app fallbacks rakho.

> [!warning] Gateway vs mesh
> Mesh sirf **east-west** traffic handle karta hai (service-to-service). **North-south** traffic ke liye (client → gateway → services), tumhe abhi bhi ek gateway chahiye jaise Spring Cloud Gateway ya Istio Gateway. Ye dono ek dusre ko complement karte hain, replace nahi.

> [!tip] Naye ho meshes mein to Linkerd try karo
> Istio feature-rich hai lekin complex bhi. Linkerd simpler hai, lighter hai, operate karna easy hai. Agar Istio ke ecosystem mein bought-in nahi ho to Linkerd se start karo.

> [!tip] Mesh "ready rehne ke liye" mat adopt karo
> Mesh ka ROI tabhi shuru hota hai jab tumhare paas ~10+ services hon AND real pain ho (mTLS demands, polyglot retries, blue/green deployments, etc.). Us threshold se neeche, libraries operational cost ke hisaab se better hain.

## Related
- [[02-Spring-Cloud-Overview]]
- [[06-Inter-Service-Communication]]
- [[08-Resilience4j]]
- [[04-API-Gateway-Spring-Cloud-Gateway]]
- [[09-Distributed-Tracing]]
