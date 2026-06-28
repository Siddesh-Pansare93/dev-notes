---
tags: [microservices, service-mesh, istio, linkerd, infrastructure]
aliases: [Service Mesh, Sidecar, Istio]
stage: advanced
---

# Service Mesh vs Library (Istio/Linkerd vs Spring Cloud)

> [!info] For the Express/TS dev
> Cross-cutting concerns — mTLS, retries, circuit breakers, traffic shifting, observability — can live in your **app** (libraries: Spring Cloud, Resilience4j) or in the **platform** (a service mesh: Istio, Linkerd, Consul Connect). Each strategy has tradeoffs. Polyglot teams gravitate to meshes; Java-only teams often stick with Spring Cloud.

## Concept

A **service mesh** runs a tiny proxy (a "sidecar") next to every service. All traffic in/out of the service goes through the proxy. The proxies are configured centrally (the "control plane") and provide:

- mTLS (encrypted, authenticated traffic between services)
- Retries, timeouts, circuit breakers
- Load balancing
- Traffic splitting (canary, A/B)
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

The app itself becomes simpler — no Resilience4j, no mTLS, no retries in code.

### Library approach (Spring Cloud)

The app contains all the resilience logic:

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

### Comparison

| Concern | Library (Spring Cloud) | Mesh (Istio) |
|---------|----------------------|--------------|
| Where it runs | In your JVM | In a sidecar proxy (Envoy) |
| Language | Java/Spring only | Any language |
| Config | YAML in app | CRDs / VirtualService / DestinationRule |
| Updates | Redeploy app | Update mesh config (no app redeploy) |
| mTLS | Manual (Spring Security or custom) | Free, automatic |
| Latency cost | Negligible | +1-3ms per hop |
| Operational complexity | Lower (no extra infra) | Higher (control plane, sidecars) |
| Resource cost | App memory only | +50-200MB RAM per pod for sidecar |
| Polyglot | Doesn't help non-Java services | Works for any service |
| Local dev | Just run apps | Hard (no mesh) |

### When to use which

**Use libraries (Spring Cloud) if:**
- Mostly Java/Kotlin services
- Not on Kubernetes
- Small team, want simpler ops
- Need fine-grained control inside business logic

**Use a mesh if:**
- Polyglot stack (Java + Go + Python + Node)
- On Kubernetes already
- Need uniform mTLS / zero-trust
- Have platform engineers
- Want to update traffic rules without redeploying

**Hybrid (common):**
- App keeps OpenFeign for declarative clients + Resilience4j for fine-grained policies
- Mesh provides mTLS, observability, traffic shifting
- Avoid duplicating retries (turn off mesh retries OR Resilience4j retries — not both)

## Code example

### Spring Cloud (library) — the in-app way

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

### Istio (mesh) — the platform way

The Spring app is **stripped of resilience code**:

```java
@FeignClient(name = "payment-service", url = "http://payment-service")
interface PaymentClient {
    @PostMapping("/charge")
    ChargeResponse charge(@RequestBody ChargeRequest req);
}
```

The retry/circuit-breaker behavior comes from Istio CRDs in the cluster:

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

mTLS comes from a single mesh-wide policy:

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

Now every service-to-service call is encrypted and authenticated — without a single line of app code.

### Canary deployment with Istio

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

Doing the same in app code requires custom load-balancer logic and feature flags — far more work.

### Observability for free

Istio emits standard metrics for every request:

```
istio_requests_total{source_workload="order-service",destination_service="payment-service",response_code="200"}
istio_request_duration_milliseconds_bucket{...}
```

Tracing spans are auto-generated by Envoy if you propagate the headers (Spring Boot does this automatically with Micrometer Tracing). See [[09-Distributed-Tracing]].

## Express/Node comparison

| Library | Mesh |
|---------|------|
| Node: `opossum`, `axios-retry`, `consul-resolver` | Istio works for Node services with **zero changes** |
| Spring Cloud equivalent | Linkerd, Consul Connect, AWS App Mesh — all language-agnostic |

A mesh's biggest selling point: **the same policies apply uniformly** to your Java service AND your Node service AND your Python service. A library approach forces you to reimplement them per language.

## Gotchas

> [!danger] Don't double-retry
> If both Resilience4j and Istio retry, you get N×M retry attempts on failure — load amplifies catastrophically. Pick one layer per concern.

> [!warning] Sidecar startup ordering
> Apps can start calling networks before Envoy is ready (in K8s pre-1.29). Istio recommends `holdApplicationUntilProxyStarts: true`.

> [!warning] Sidecar resource cost
> 100-200MB RAM × thousands of pods adds up. Linkerd's Rust-based proxy is leaner (~10MB) than Envoy.

> [!warning] Local dev without mesh
> Devs running services on localhost don't have a mesh. Either: (a) use Tilt/Skaffold to deploy locally to k8s, (b) keep behavior identical with-or-without mesh, (c) run lightweight in-app fallbacks.

> [!warning] Gateway vs mesh
> A mesh handles **east-west** traffic (service-to-service). For **north-south** (client → gateway → services), you still want a gateway like Spring Cloud Gateway or Istio Gateway. They're complementary.

> [!tip] Linkerd if you're new to meshes
> Istio is feature-rich but complex. Linkerd is simpler, lighter, easier to operate. Start there if you're not bought in to Istio's ecosystem.

> [!tip] Don't adopt a mesh "to be ready"
> Mesh ROI starts when you have ~10+ services AND pain (mTLS demands, polyglot retries, blue/green, etc.). Below that threshold, libraries beat the operational cost.

## Related
- [[02-Spring-Cloud-Overview]]
- [[06-Inter-Service-Communication]]
- [[08-Resilience4j]]
- [[04-API-Gateway-Spring-Cloud-Gateway]]
- [[09-Distributed-Tracing]]
