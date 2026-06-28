---
tags: [microservices, spring-cloud, overview]
aliases: [Spring Cloud]
stage: advanced
---

# Spring Cloud Overview

> [!info] For the Express/TS dev
> Spring Cloud is an umbrella for the cross-cutting concerns of distributed systems: service discovery, config, gateways, circuit breakers, distributed tracing. Where Node teams stitch together `axios` + `consul` + `nock` + `opossum` + custom middleware, Spring Cloud gives you a curated set of integrated libraries — most just-add-a-starter.

## Concept

Spring Cloud is **not** a single library — it's a federation of projects, each addressing one distributed-systems concern. They all share Spring Boot's autoconfiguration model, so adoption is mostly "add starter, set property."

### The major modules

| Module | Solves | Note |
|--------|--------|------|
| **Spring Cloud Config** | Centralized config | git-backed config server. See [[05-Centralized-Config-Server]] |
| **Spring Cloud Netflix Eureka** | Service discovery | Netflix's discovery server. See [[03-Service-Discovery-Eureka]] |
| **Spring Cloud Gateway** | API gateway / edge routing | Reactive, replaces Zuul. See [[04-API-Gateway-Spring-Cloud-Gateway]] |
| **Spring Cloud OpenFeign** | Declarative HTTP clients | "Repository for REST." See [[07-OpenFeign]] |
| **Spring Cloud LoadBalancer** | Client-side load balancing | Replaces Ribbon |
| **Spring Cloud Circuit Breaker** | Abstraction over Resilience4j etc. | See [[08-Resilience4j]] |
| **Spring Cloud Stream** | Messaging abstraction | Kafka/RabbitMQ binder. See [[../11-Messaging/04-Spring-Cloud-Stream]] |
| **Spring Cloud Sleuth → Micrometer Tracing** | Distributed tracing | See [[09-Distributed-Tracing]] |
| **Spring Cloud Bus** | Broadcast config changes | uses a message broker |
| **Spring Cloud Function** | Serverless adapters | for AWS Lambda, Azure Functions |
| **Spring Cloud Kubernetes** | K8s-native discovery/config | replaces Eureka if on k8s |
| **Spring Cloud Vault** | HashiCorp Vault integration | secrets |

> [!warning] Netflix OSS components are mostly in maintenance mode
> Eureka, Hystrix, Ribbon, Zuul — Netflix open-sourced them, then largely stopped maintaining. Spring Cloud picked some up; others (Hystrix, Ribbon, Zuul 1) are deprecated. The successors are: **Resilience4j** (was Hystrix), **Spring Cloud LoadBalancer** (was Ribbon), **Spring Cloud Gateway** (was Zuul). Eureka still works but Kubernetes-native discovery is preferred for new K8s deployments.

### Two paths in 2025

**Spring Cloud + Netflix-era tools** (Eureka, Config Server, Gateway, OpenFeign, Resilience4j):
- Self-contained, runs anywhere (VMs, bare metal, Docker, K8s).
- More moving parts you operate yourself.
- Good for non-K8s environments.

**Kubernetes-native** (kube DNS for discovery, ConfigMaps + Secrets, Ingress + service mesh):
- Less Spring code; let the platform handle it.
- Spring Cloud Kubernetes bridges the gap (e.g. read ConfigMap as `application.yml`).
- Industry direction.

Most production systems are hybrid: Spring Cloud Gateway as the edge + OpenFeign + Resilience4j + tracing, but discovery/config delegated to Kubernetes.

## Code example

### Spring Cloud BOM

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

This BOM aligns versions of all Spring Cloud starters. Match it to your Spring Boot version (release notes show the matrix).

### Then add starters as needed

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

### A typical microservice setup

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

That's: discovery, config, circuit breaker, tracing — all wired with one YAML and three starters.

### A reference topology

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

Edge: Spring Cloud Gateway → routes /orders/** to order-service
Tracing: Micrometer Tracing → Zipkin/Tempo
```

## Express/Node comparison

| Spring Cloud | Node ecosystem |
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

The differentiator: **integration**. In Node you assemble best-of-breed libraries with glue. Spring Cloud ships pre-glued, but it's also more opinionated.

## Gotchas

> [!warning] Don't add the whole stack on day one
> A team I saw started day one with: Eureka + Config Server + Gateway + Sleuth + Hystrix + Bus + Vault. Three weeks later, no actual product code. Add components when you feel the pain they solve.

> [!warning] Version skew
> Spring Cloud and Spring Boot have a release matrix — mismatched versions = autoconfiguration failures with cryptic error messages. Always use the BOM.

> [!warning] Eureka's CAP tradeoff
> Eureka chooses **AP** (availability over consistency). It can return stale instance lists during partitions. Usually fine; sometimes surprising.

> [!tip] Most teams just need: Gateway + OpenFeign + Resilience4j + tracing
> If you're on Kubernetes, use kube DNS for discovery and ConfigMaps for config — skip Eureka and Config Server.

## Related
- [[01-What-is-a-Microservice]]
- [[03-Service-Discovery-Eureka]]
- [[04-API-Gateway-Spring-Cloud-Gateway]]
- [[05-Centralized-Config-Server]]
- [[07-OpenFeign]]
- [[08-Resilience4j]]
- [[09-Distributed-Tracing]]
