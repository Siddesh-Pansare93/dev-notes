# Project: Full-Stack App to Kubernetes

## What You'll Build

Take the full-stack app from the Compose section and deploy it to Kubernetes (Docker Desktop). You'll create:
- Namespace for isolation
- PostgreSQL with persistent storage
- Redis deployment
- Node.js API deployment
- Frontend deployment
- Services for all components
- Ingress for external routing

---

## Architecture

```
                Ingress (myapp.local)
                 /          /api/
                ↓            ↓
          frontend-svc    api-svc
                ↓            ↓
            frontend      api pods (2)
                              ↓         ↓
                           db-svc   redis-svc
                              ↓         ↓
                           postgres   redis
                           (+ PVC)
```

---

## Directory Structure

```
k8s/
├── namespace.yaml
├── secrets.yaml
├── configmap.yaml
├── postgres/
│   ├── pvc.yaml
│   ├── deployment.yaml
│   └── service.yaml
├── redis/
│   ├── deployment.yaml
│   └── service.yaml
├── api/
│   ├── deployment.yaml
│   └── service.yaml
├── frontend/
│   ├── deployment.yaml
│   └── service.yaml
└── ingress.yaml
```

---

## Step 1: Namespace

```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: myapp
  labels:
    app: myapp
```

```bash
kubectl apply -f k8s/namespace.yaml
kubectl config set-context --current --namespace=myapp
```

---

## Step 2: Secrets and ConfigMap

```yaml
# k8s/secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
  namespace: myapp
type: Opaque
stringData:
  DB_PASSWORD: "devsecret123"
  DATABASE_URL: "postgres://appuser:devsecret123@postgres:5432/myapp"
  REDIS_URL: "redis://redis:6379"
  JWT_SECRET: "my-jwt-secret-change-in-production"
```

```yaml
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: myapp
data:
  NODE_ENV: "production"
  PORT: "3000"
  LOG_LEVEL: "info"
```

```bash
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/configmap.yaml
```

---

## Step 3: PostgreSQL

```yaml
# k8s/postgres/pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-pvc
  namespace: myapp
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 2Gi
```

```yaml
# k8s/postgres/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
  namespace: myapp
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
        - name: postgres
          image: postgres:16-alpine
          env:
            - name: POSTGRES_DB
              value: myapp
            - name: POSTGRES_USER
              value: appuser
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: app-secrets
                  key: DB_PASSWORD
            - name: PGDATA
              value: /var/lib/postgresql/data/pgdata
          ports:
            - containerPort: 5432
          resources:
            requests:
              memory: "256Mi"
              cpu: "100m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          readinessProbe:
            exec:
              command: ["pg_isready", "-U", "appuser", "-d", "myapp"]
            initialDelaySeconds: 10
            periodSeconds: 10
          volumeMounts:
            - name: postgres-storage
              mountPath: /var/lib/postgresql/data
      volumes:
        - name: postgres-storage
          persistentVolumeClaim:
            claimName: postgres-pvc
```

```yaml
# k8s/postgres/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: myapp
spec:
  selector:
    app: postgres
  ports:
    - port: 5432
      targetPort: 5432
```

---

## Step 4: Redis

```yaml
# k8s/redis/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: myapp
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
        - name: redis
          image: redis:7-alpine
          ports:
            - containerPort: 6379
          resources:
            requests:
              memory: "64Mi"
              cpu: "50m"
            limits:
              memory: "128Mi"
              cpu: "200m"
          readinessProbe:
            exec:
              command: ["redis-cli", "ping"]
            initialDelaySeconds: 5
            periodSeconds: 10
```

```yaml
# k8s/redis/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: redis
  namespace: myapp
spec:
  selector:
    app: redis
  ports:
    - port: 6379
      targetPort: 6379
```

---

## Step 5: API

```yaml
# k8s/api/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  namespace: myapp
spec:
  replicas: 2
  selector:
    matchLabels:
      app: api
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
      maxSurge: 1
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
        - name: api
          image: YOUR_DOCKERHUB_USERNAME/my-api:v1.0.0
          # For local testing: build the image first and use the local name
          ports:
            - containerPort: 3000
          envFrom:
            - configMapRef:
                name: app-config
            - secretRef:
                name: app-secrets
          resources:
            requests:
              memory: "128Mi"
              cpu: "100m"
            limits:
              memory: "256Mi"
              cpu: "500m"
          readinessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 10
            failureThreshold: 3
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 30
```

```yaml
# k8s/api/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: api
  namespace: myapp
spec:
  selector:
    app: api
  ports:
    - port: 80
      targetPort: 3000
```

---

## Step 6: Frontend

```yaml
# k8s/frontend/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: myapp
spec:
  replicas: 2
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
        - name: frontend
          image: YOUR_DOCKERHUB_USERNAME/my-frontend:v1.0.0
          ports:
            - containerPort: 80
          resources:
            requests:
              memory: "64Mi"
              cpu: "50m"
            limits:
              memory: "128Mi"
              cpu: "200m"
          readinessProbe:
            httpGet:
              path: /
              port: 80
            initialDelaySeconds: 5
            periodSeconds: 10
```

```yaml
# k8s/frontend/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: frontend
  namespace: myapp
spec:
  selector:
    app: frontend
  ports:
    - port: 80
      targetPort: 80
```

---

## Step 7: Ingress

```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
  namespace: myapp
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /$2
spec:
  ingressClassName: nginx
  rules:
    - host: myapp.local
      http:
        paths:
          - path: /api(/|$)(.*)
            pathType: ImplementationSpecific
            backend:
              service:
                name: api
                port:
                  number: 80
          - path: /()(.*)
            pathType: ImplementationSpecific
            backend:
              service:
                name: frontend
                port:
                  number: 80
```

---

## Deploy Everything

```bash
# Apply in order (dependencies first)
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/configmap.yaml

kubectl apply -f k8s/postgres/
kubectl apply -f k8s/redis/

# Wait for postgres to be ready
kubectl wait --for=condition=ready pod -l app=postgres -n myapp --timeout=60s

kubectl apply -f k8s/api/
kubectl apply -f k8s/frontend/
kubectl apply -f k8s/ingress.yaml

# Watch everything come up
kubectl get pods -n myapp -w
```

---

## Verify

```bash
# All pods running?
kubectl get pods -n myapp
# NAME                         READY   STATUS    RESTARTS   AGE
# api-7d8f9c-abc12             1/1     Running   0          2m
# api-7d8f9c-def34             1/1     Running   0          2m
# frontend-5b3a2c-ghi56        1/1     Running   0          1m
# frontend-5b3a2c-jkl78        1/1     Running   0          1m
# postgres-9f1e2d-mno90        1/1     Running   0          3m
# redis-4c7b8a-pqr12           1/1     Running   0          3m

# Services?
kubectl get services -n myapp

# Ingress?
kubectl get ingress -n myapp

# Add to /etc/hosts (or C:\Windows\System32\drivers\etc\hosts):
# 127.0.0.1  myapp.local

# Test
curl http://myapp.local/api/users
curl http://myapp.local/         # frontend
```

---

## HPA for the API

```yaml
# k8s/api/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-hpa
  namespace: myapp
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  minReplicas: 2
  maxReplicas: 8
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 60
```

```bash
kubectl apply -f k8s/api/hpa.yaml
kubectl get hpa -n myapp
```

---

## Clean Up

```bash
# Delete entire namespace (removes everything)
kubectl delete namespace myapp

# Or delete individual resources
kubectl delete -f k8s/ -n myapp
```

---

## What You've Accomplished

You've built and deployed:
- Multi-container application in Docker Compose for local dev
- Production-grade Kubernetes manifests
- Persistent storage for PostgreSQL
- Config/secrets management with K8s objects
- Rolling updates and self-healing
- HTTP routing with Ingress
- Auto-scaling with HPA

These same patterns apply to real production clusters on AWS EKS, Google GKE, or Azure AKS — the manifests are nearly identical.
