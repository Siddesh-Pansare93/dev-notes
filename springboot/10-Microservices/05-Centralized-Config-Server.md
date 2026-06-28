---
tags: [microservices, config, spring-cloud-config]
aliases: [Config Server, Centralized Config]
stage: advanced
---

# Centralized Config (Spring Cloud Config Server)

> [!info] For the Express/TS dev
> Spring Cloud Config Server externalizes configuration to a git repo. Services pull their config at startup (and optionally refresh at runtime) from a central server. It's "etcd/Consul KV but git-backed and Spring-native." On Kubernetes, ConfigMaps + Secrets often replace this — Config Server shines outside K8s.

## Concept

The problems it solves:

- Don't bake env-specific values into the JAR.
- Keep secrets out of code.
- Audit/version config changes (git history).
- Update config without redeploying services (with `@RefreshScope`).
- Roll back config independently.

### Architecture

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

The naming convention: `{application}-{profile}.yml` in the repo. Each service requests `application=spring.application.name` + active profile, server returns the merged config.

## Code example

### Config Server

```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-config-server</artifactId>
</dependency>
```

```java
@SpringBootApplication
@EnableConfigServer
public class ConfigServerApp {
    public static void main(String[] args) {
        SpringApplication.run(ConfigServerApp.class, args);
    }
}
```

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
          search-paths: '{application}'   # one folder per service
          clone-on-start: true
        encrypt:
          enabled: true

encrypt:
  key: ${CONFIG_ENCRYPT_KEY}   # for {cipher}... values
```

### Repo layout

```
config-repo/
├── application.yml              # shared by all services
├── application-prod.yml          # shared, prod-only
├── order-service.yml
├── order-service-prod.yml
├── payment-service.yml
├── payment-service-prod.yml
└── ...
```

`application.yml`:
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

`order-service.yml`:
```yaml
order:
  free-shipping-threshold: 50
  default-currency: USD

payment:
  base-url: http://payment-service
```

`order-service-prod.yml`:
```yaml
order:
  free-shipping-threshold: 100

spring:
  datasource:
    url: jdbc:postgresql://prod-db:5432/orders
    username: '{cipher}AQB...'
    password: '{cipher}AQC...'
```

### Client — fetching config

```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-config</artifactId>
</dependency>
```

```yaml
# bootstrap.yml or application.yml — Boot 2.4+ uses spring.config.import
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

Now starting `order-service` with `--spring.profiles.active=prod` will fetch:
1. `application.yml` (defaults)
2. `application-prod.yml` (prod defaults)
3. `order-service.yml` (service-specific)
4. `order-service-prod.yml` (highest priority)

Merged in that order — later wins.

### Verify what was loaded

```bash
curl http://config-server:8888/order-service/prod
# returns JSON of resolved config
```

### Encrypted values

Config server can decrypt values prefixed with `{cipher}`:

```bash
curl -X POST http://config-server:8888/encrypt -d 'mySecret'
# AQA7d8...

# put `{cipher}AQA7d8...` in your YAML
```

The server stores the encrypted blob; client receives plaintext.

### `@RefreshScope` — runtime config reload

```java
@Component
@RefreshScope
public class OrderProperties {
    @Value("${order.free-shipping-threshold}")
    private int threshold;

    public int threshold() { return threshold; }
}
```

When config changes in git, hit:

```bash
curl -X POST http://order-service/actuator/refresh
```

Spring re-reads config and rebuilds `@RefreshScope` beans. Combine with **Spring Cloud Bus** to broadcast refresh events to all instances at once.

### Spring Cloud Bus (optional)

```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-bus-amqp</artifactId>
</dependency>
```

`POST /actuator/busrefresh` on any one node → publishes a refresh event on RabbitMQ → every service refreshes.

### Failsafe — `optional:` prefix

```yaml
spring:
  config:
    import: optional:configserver:http://config-server:8888
```

`optional:` means "if config server is unreachable, log a warning and continue with local config." Without it, services fail to start if the config server is down.

## Express/Node comparison

| Spring Cloud Config | Node |
|--------------------|------|
| Config Server + git repo | (no direct equivalent — closest is reading from S3/Vault on boot) |
| `@RefreshScope` | reload config + restart workers; or `node-config` watcher |
| `{cipher}...` values | KMS-decrypted env vars |
| Spring Cloud Bus | NATS/Kafka pub-sub for config events |
| `bootstrap.yml` | startup script that pulls config first |
| Profile-based merge | `node-config` env-specific JSON files |

In Node, **environment variables** + a secrets manager (AWS SSM/Parameter Store, Doppler, Vault) is the prevailing pattern. Spring Boot supports the same — Config Server is one option among several.

## Gotchas

> [!warning] Bootstrap vs Application context
> Pre-Boot 2.4: config was fetched in a separate "bootstrap" context. Now use `spring.config.import` in regular `application.yml`. Old tutorials reference `bootstrap.yml` — usually still works but is being phased out.

> [!warning] Config server is on the critical path
> If the config server is down and `fail-fast: true`, services can't start. Run multiple replicas, use `optional:`, or cache last-known-good config.

> [!danger] Plaintext secrets in git
> Without encryption, anyone with repo access has all your secrets. Use `{cipher}...` or — better — Vault.

> [!warning] `@RefreshScope` + immutable beans
> Refreshing rebuilds the bean. If other beans hold a stale reference, they keep the old value. The dependency must also be `@RefreshScope` or look up fresh on each call.

> [!tip] On K8s, prefer ConfigMaps + Secrets
> Spring Cloud Kubernetes can read ConfigMaps as Spring properties. You get the platform's ACLs, audit, and rolling restart for free.

> [!tip] Don't put feature flags here
> Config server is for slow-moving config. Feature flags need a real flag system (LaunchDarkly, Unleash, Flagsmith) with targeting, rollouts, etc.

## Related
- [[02-Spring-Cloud-Overview]]
- [[../05-Spring-Boot/05-Externalized-Configuration|Boot config]]
- [[../05-Spring-Boot/04-Profiles|Profiles]]
- [[../08-Security/03-Secrets-and-Vault|Secrets]]
