# Kubernetes Basics for Spring Boot

> [!info] Express/TS wale dev ke liye
> Jo K8s primitives tum Node app ke liye use karte — Deployment, Service, ConfigMap, Secret, Ingress — wahi sab yahan bhi chalte hain. Spring-specific cheezein sirf itni hain: probe paths Actuator se aate hain, Spring profiles env vars ke through wire hote hain, aur config externalization mounted files ya `spring-cloud-kubernetes` se hota hai.

Socho Kubernetes ko ek building manager ki tarah — tumhare paas 50 flats (containers) hain, aur manager (K8s) yeh dekhta hai ki koi flat khaali na rahe, bijli-paani (resources) sabko sahi mile, aur agar koi flat mein aag lag jaaye (crash ho jaaye) toh turant naya tenant (pod) shift kar de. Chalo ek-ek karke saare manifests dekhte hain jo ek Spring Boot app ko production mein chalane ke liye chahiye.

## Minimum viable manifests

### Deployment

Kya hota hai? Deployment yeh define karta hai ki tumhara app ka kaunsa version, kitne copies (replicas) mein, kaise resources ke saath chalega — bilkul waise hi jaise Zomato apne order-service ko 10 alag machines pe run karta hai taaki ek machine down ho toh baaki 9 order le sakein.

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

Yahan kuch cheezein gaur karne wali hain:

- `replicas: 3` — teen copies chalengi ek saath. Node ke `pm2 -i 3` jaisa hi socho, bas cluster-level pe.
- `startupProbe` — Spring Boot app boot hone mein time leta hai (JVM warmup, bean initialization, Hibernate). Yeh probe K8s ko bolta hai "abhi patience rakho, isko 30 x 10 second = 5 minute tak startup ke liye time do." Isके bina K8s soch sakta hai app crash ho gaya aur restart maar dega — infinite loop ban sakta hai.
- `livenessProbe` vs `readinessProbe` — yeh confusion sabse zyada hota hai naye logon ko. Liveness poochta hai "kya app zinda hai ya isko restart karna padega?" Readiness poochta hai "kya yeh abhi traffic lene ke liye ready hai?" Jaise Swiggy delivery boy zinda hai (liveness = healthy) lekin abhi restaurant se food le raha hai toh naya order usko assign mat karo (readiness = not ready).
- `JAVA_TOOL_OPTIONS` with `MaxRAMPercentage=75` — container ke andar JVM ko batana zaruri hai ki container ki total memory ka kitna % heap ke liye use kare, warna JVM host machine ki poori RAM dekh ke galat calculation kar sakta hai.
- `preStop` + `sleep 10` — jab pod ko terminate kiya jaata hai, load balancer ko update hone mein thoda time lagta hai. Yeh sleep ensure karta hai ki naya traffic band hone se pehle purana in-flight request complete ho jaaye. Bina iske, graceful shutdown ke bawajood kuch requests fail ho sakte hain.

> [!tip] Node/Express se comparison
> Express mein tum khud `SIGTERM` handle karke server ko gracefully band karte ho (`server.close()`). Spring Boot mein bhi `terminationGracePeriodSeconds` isi kaam ke liye hai — bas yahan JVM shutdown hooks aur Spring ka `ApplicationContext` close hona involve hota hai.

### Service

Kyun zaruri hai? Pods ki IP addresses baar-baar badalti rehti hain (restart, reschedule waghera pe). Service ek stable naam/IP deta hai jispe baaki services (ya Ingress) bharosa kar sakein — bilkul jaise UPI ID tumhare bank account number se stable rehta hai, chahe account details change ho jaayein.

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

Kya hota hai? Non-sensitive configuration — jaise DB URL, feature flags — jo tum code se alag rakhna chahte ho taaki environment badalne pe (dev/staging/prod) sirf ConfigMap badle, image rebuild na karni pade.

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

Passwords, API keys, JWT signing keys — yeh sab Secret mein jaate hain.

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

> [!warning] Secrets ko commit mat karo
> Sealed Secrets, External Secrets Operator (Vault/AWS SM/GCP SM), ya SOPS use karo. Plain Secret YAML sirf base64-encoded hota hai — encryption nahi! Koi bhi `base64 -d` chala ke padh sakta hai. Yeh aisa hi hai jaise tum apna ATM PIN ek sticky note pe likh ke wallet mein rakh do — chhupa toh diya, lekin surakshit nahi.

## Mounting config as files (Spring-friendly)

Spring khud-ba-khud `/config/application.yml` ko load kar leta hai agar woh present ho — ismein tumhe kuch extra code likhne ki zarurat nahi:

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

ConfigMap poori YAML ke saath:

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

Yeh approach tab kaam aata hai jab tumhara config bahut bada/nested ho aur individual env vars mein todna painful lage.

## Horizontal Pod Autoscaler

Kya hota hai? HPA automatically replicas badhata-ghataata hai based on CPU/memory usage — bilkul Swiggy jaise apps peak lunch/dinner time pe zyada delivery partners "activate" karte hain aur off-peak mein kam.

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

Yahan bola gaya hai: "Agar average CPU usage 70% se zyada jaaye, toh naye pods spin up karo, max 20 tak. Kam ho jaaye toh wapas 3 tak scale down karo."

## PodDisruptionBudget

Kyun zaruri hai? Jab K8s cluster maintenance (node upgrade, drain waghera) karta hai, woh ek saath saare pods down nahi karega agar tumne bata diya "kam se kam 2 pods hamesha available rehne chahiye." Yeh guarantee deta hai ki voluntary disruptions (jaise cluster upgrade) ke dauraan bhi tumhara app zinda rahe.

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata: { name: orders-api }
spec:
  minAvailable: 2
  selector: { matchLabels: { app: orders-api } }
```

## Ingress

Kya hota hai? Ingress woh gate hai jo bahar se aane wale HTTP/HTTPS traffic ko sahi Service tak route karta hai, TLS certificates handle karta hai, aur path-based routing deta hai — jaise IRCTC ka ek hi domain (`irctc.co.in`) hota hai lekin andar-andar alag paths (`/booking`, `/pnr-status`) alag services ko hit karte hain.

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

`cert-manager.io/cluster-issuer: letsencrypt` annotation automatically Let's Encrypt se free SSL certificate issue aur renew karta rehta hai — manually certificate renew karne ka jhanjhat khatam.

## spring-cloud-kubernetes (optional)

Yeh library Spring Boot ko K8s-aware banati hai. Isse milta hai:
- ConfigMap/Secret change hone pe app ka auto-reload (bina restart kiye naya config pick ho jaata hai)
- K8s Service discovery (service names ko directly use karo, jaise `http://orders-api` — Eureka jaisi alag service registry ki zarurat nahi)
- Leader election (multiple instances mein se ek ko "leader" banana kisi scheduled task ke liye)

```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-kubernetes-client-config</artifactId>
</dependency>
```

> [!tip] Kab use karein
> Agar tumhara app sirf ConfigMap/Secret se config utha raha hai aur restart pe reload ho jaana theek hai, toh isse skip kar sakte ho. Lekin agar tumhe bina downtime ke config reload chahiye (jaise feature flags turant flip karna), toh yeh kaafi kaam ka hai.

## Tools

- **Helm** — templating + releases (npm packages jaisa hi socho, but for K8s manifests)
- **Kustomize** — overlay-based config, kubectl mein hi built-in hota hai
- **Skaffold / Tilt** — local dev loop (code change → auto rebuild → auto redeploy)
- **ArgoCD / Flux** — GitOps (Git repo ko source of truth banake, cluster ko usse automatically sync karna)

## Related
- [[05-Health-Checks-and-Readiness]]
- [[02-Docker-for-Spring-Boot]]
- [[06-Profiles-Per-Environment]]
- [[05-CI-CD-Pipeline-Example]]
- [[07-Twelve-Factor-Spring]]
