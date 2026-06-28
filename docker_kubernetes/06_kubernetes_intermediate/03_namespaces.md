# Namespaces

## What You'll Learn

- What namespaces are and why they matter
- Create and use namespaces
- Organize by environment or team
- ResourceQuotas and LimitRanges
- Cross-namespace communication

---

## What are Namespaces?

Namespaces are **virtual clusters** within your Kubernetes cluster. They isolate resources by name — you can have a `my-api` Deployment in both `staging` and `production` namespaces without conflict.

```
Cluster
├── namespace: default          ← your resources go here by default
│    ├── Deployment: my-api
│    └── Service: my-api
├── namespace: staging
│    ├── Deployment: my-api    ← same name, different namespace
│    └── Service: my-api
├── namespace: production
│    ├── Deployment: my-api
│    └── Service: my-api
└── namespace: kube-system      ← K8s internal components
     ├── Pod: coredns-xxx
     └── Pod: kube-apiserver-xxx
```

---

## Default Namespaces

```bash
kubectl get namespaces

# NAME              STATUS   AGE
# default           Active   5h   ← where resources go if you don't specify
# kube-node-lease   Active   5h   ← heartbeat for nodes
# kube-public       Active   5h   ← publicly readable config
# kube-system       Active   5h   ← Kubernetes components
```

---

## Create a Namespace

```bash
# Imperative
kubectl create namespace staging
kubectl create namespace production

# Declarative (recommended — version controlled)
```

```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: staging
  labels:
    environment: staging
```

```bash
kubectl apply -f namespace.yaml
```

---

## Using Namespaces

```bash
# Deploy to a specific namespace
kubectl apply -f deployment.yaml -n staging
kubectl apply -f deployment.yaml --namespace=production

# Or add namespace to the YAML itself
```

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-api
  namespace: staging      # ← namespace in the manifest
spec:
  ...
```

```bash
# List resources in a namespace
kubectl get pods -n staging
kubectl get all -n staging       # pods, services, deployments, etc.

# All resources in all namespaces
kubectl get pods --all-namespaces
kubectl get pods -A

# Set default namespace for current context (avoids -n every time)
kubectl config set-context --current --namespace=staging
# Now all commands target staging by default
kubectl get pods    # shows staging pods

# Reset to default
kubectl config set-context --current --namespace=default
```

---

## Namespace Patterns

### By Environment

```
staging/
  Deployment: api
  Deployment: frontend
  Service: api
  ConfigMap: app-config (staging values)

production/
  Deployment: api
  Deployment: frontend
  Service: api
  ConfigMap: app-config (production values)
```

### By Team

```
team-payments/
  Deployment: payment-api
  Deployment: payment-worker

team-users/
  Deployment: user-api
  Deployment: user-service
```

---

## ResourceQuota — Limit Namespace Resources

Prevent one namespace from consuming all cluster resources:

```yaml
# quota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: staging-quota
  namespace: staging
spec:
  hard:
    pods: "20"                  # max 20 pods
    requests.cpu: "4"           # max 4 CPUs total requested
    requests.memory: 4Gi        # max 4Gi memory requested
    limits.cpu: "8"             # max 8 CPUs limit
    limits.memory: 8Gi          # max 8Gi memory limit
    services: "10"              # max 10 services
    persistentvolumeclaims: "5" # max 5 PVCs
```

```bash
kubectl apply -f quota.yaml
kubectl describe resourcequota -n staging
```

---

## LimitRange — Default Limits for Pods

Automatically apply default resource limits to Pods that don't specify them:

```yaml
# limitrange.yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: default-limits
  namespace: staging
spec:
  limits:
    - type: Container
      default:               # default limits (if not specified)
        cpu: "200m"
        memory: "256Mi"
      defaultRequest:        # default requests (if not specified)
        cpu: "100m"
        memory: "128Mi"
      max:                   # maximum allowed
        cpu: "2"
        memory: "2Gi"
      min:                   # minimum required
        cpu: "50m"
        memory: "64Mi"
```

---

## Cross-Namespace Communication

Services in different namespaces communicate using the full DNS name:

```
<service-name>.<namespace>.svc.cluster.local

# Examples:
postgres.default.svc.cluster.local
my-api.staging.svc.cluster.local
payment-service.team-payments.svc.cluster.local
```

```yaml
# staging/api can reach production/shared-service:
env:
  - name: SHARED_SERVICE_URL
    value: "http://shared-service.production.svc.cluster.local"
```

---

## Delete a Namespace

```bash
# This deletes EVERYTHING in the namespace!
kubectl delete namespace staging
```

---

**Next**: [Ingress](./04_ingress.md) — HTTP routing into your cluster
