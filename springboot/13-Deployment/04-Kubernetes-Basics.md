---
tags: [deployment, kubernetes, k8s]
aliases: [Kubernetes, K8s]
stage: intermediate
---

# Kubernetes Basics for Spring Boot

> [!info] For the Express/TS dev
> Same K8s primitives you'd use for a Node app — Deployment, Service, ConfigMap, Secret, Ingress. The Spring-specific bits: probe paths from Actuator, Spring profiles wired via env vars, and config externalization via mounted files or `spring-cloud-kubernetes`.

## Minimum viable manifests

### Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: orders-api
  labels: { app: orders-api }
spec:
  replicas: 3
  selector:
    matchLabels: { app: orders-api }
  template:
    metadata:
      labels: { app: orders-api }
    spec:
      containers:
        - name: app
          image: ghcr.io/me/orders-api:1.0.0
          ports: [{ name: http, containerPort: 8080 }]
          env:
            - name: SPRING_PROFILES_ACTIVE
              value: prod
            - name: JAVA_TOOL_OPTIONS
              value: "-XX:MaxRAMPercentage=75"
            - name: SPRING_DATASOURCE_URL
              valueFrom:
                configMapKeyRef: { name: orders-config, key: db.url }
            - name: SPRING_DATASOURCE_PASSWORD
              valueFrom:
                secretKeyRef: { name: orders-secrets, key: db.password }
          resources:
            requests: { cpu: "250m", memory: "512Mi" }
            limits:   { cpu: "1",    memory: "768Mi" }
          startupProbe:
            httpGet: { path: /actuator/health/liveness, port: http }
            failureThreshold: 30
            periodSeconds: 10
          livenessProbe:
            httpGet: { path: /actuator/health/liveness, port: http }
          readinessProbe:
            httpGet: { path: /actuator/health/readiness, port: http }
            periodSeconds: 5
          lifecycle:
            preStop:
              exec: { command: ["sh", "-c", "sleep 10"] }
      terminationGracePeriodSeconds: 60
```

### Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: orders-api
spec:
  selector: { app: orders-api }
  ports:
    - name: http
      port: 80
      targetPort: http
```

### ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: orders-config
data:
  db.url: jdbc:postgresql://postgres:5432/orders
  feature.newCheckout: "true"
```

### Secret

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: orders-secrets
type: Opaque
stringData:
  db.password: super-secret
  jwt.signing-key: another-secret
```

> [!warning] Don't commit Secrets
> Use Sealed Secrets, External Secrets Operator (Vault/AWS SM/GCP SM), or SOPS. Plain Secret YAML is base64, not encryption.

## Mounting config as files (Spring-friendly)

Spring auto-loads `/config/application.yml` if present:

```yaml
volumeMounts:
  - name: app-config
    mountPath: /config
    readOnly: true
volumes:
  - name: app-config
    configMap:
      name: orders-app-yaml
```

ConfigMap with full YAML:

```yaml
data:
  application.yml: |
    spring:
      datasource:
        url: jdbc:postgresql://postgres:5432/orders
    logging:
      level:
        com.example: INFO
```

## Horizontal Pod Autoscaler

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata: { name: orders-api }
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: orders-api
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource: { name: cpu, target: { type: Utilization, averageUtilization: 70 } }
```

## PodDisruptionBudget

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata: { name: orders-api }
spec:
  minAvailable: 2
  selector: { matchLabels: { app: orders-api } }
```

## Ingress

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: orders-api
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
          - path: /orders
            pathType: Prefix
            backend:
              service: { name: orders-api, port: { number: 80 } }
```

## spring-cloud-kubernetes (optional)

Adds:
- ConfigMap/Secret reload on change
- K8s Service discovery (use service names natively)
- Leader election

```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-kubernetes-client-config</artifactId>
</dependency>
```

## Tools

- **Helm** — templating + releases
- **Kustomize** — overlay-based config (built into kubectl)
- **Skaffold / Tilt** — dev loop
- **ArgoCD / Flux** — GitOps

## Related
- [[05-Health-Checks-and-Readiness]]
- [[02-Docker-for-Spring-Boot]]
- [[06-Profiles-Per-Environment]]
- [[05-CI-CD-Pipeline-Example]]
- [[07-Twelve-Factor-Spring]]
