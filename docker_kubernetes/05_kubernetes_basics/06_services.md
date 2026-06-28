# Services

## What You'll Learn

- Why Services exist
- ClusterIP, NodePort, LoadBalancer types
- How Service DNS works
- port-forward for local development
- Connecting a Service to a Deployment

---

## Why Services?

Pods are ephemeral — they get new IP addresses every time they restart. You can't hardcode Pod IPs.

A **Service** provides a **stable network endpoint** (fixed name + IP) that routes traffic to matching Pods via **label selectors**.

```
Service: my-api-service (ClusterIP: 10.96.0.100)
  selector: app=my-api
  ↓ load balances to ↓
  Pod my-api-xxx-1  (10.1.0.10)
  Pod my-api-xxx-2  (10.1.0.11)
  Pod my-api-xxx-3  (10.1.0.12)
```

When a Pod is replaced with a new one, the Service automatically routes to the new IP. Clients always connect to the Service — they don't care which Pod handles the request.

---

## Service Types

### ClusterIP (default)

Internal cluster access only. No external access.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-api-service
spec:
  type: ClusterIP             # default
  selector:
    app: my-api               # route to pods with this label
  ports:
    - port: 80                # service port (what clients connect to)
      targetPort: 3000        # container port (where your app listens)
```

```bash
kubectl apply -f service.yaml

kubectl get services
# NAME             TYPE        CLUSTER-IP     EXTERNAL-IP   PORT(S)   AGE
# my-api-service   ClusterIP   10.96.0.100    <none>        80/TCP    1m

# Access from inside the cluster:
# http://my-api-service           (just service name in same namespace)
# http://my-api-service.default   (service.namespace)
# http://my-api-service.default.svc.cluster.local  (full DNS name)
```

Use ClusterIP for:
- Internal microservice communication
- Databases (should never be exposed externally)
- Backend services

### NodePort

Opens a port on **every Node** in the cluster. Accessible from outside the cluster.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-api-nodeport
spec:
  type: NodePort
  selector:
    app: my-api
  ports:
    - port: 80               # ClusterIP port
      targetPort: 3000       # container port
      nodePort: 30080        # port on each node (30000-32767)
                             # omit to let K8s pick one
```

```bash
# Access from outside:
# http://localhost:30080        (Docker Desktop: use localhost)
# http://NODE_IP:30080          (on cloud: use node's public IP)

kubectl get service my-api-nodeport
# NAME              TYPE       CLUSTER-IP    EXTERNAL-IP   PORT(S)        AGE
# my-api-nodeport   NodePort   10.96.0.101   <none>        80:30080/TCP   1m
```

Use NodePort for:
- Local development access to K8s services
- Simple setups without a load balancer

### LoadBalancer

Creates an **external load balancer** (cloud provider) with a public IP.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-api-lb
spec:
  type: LoadBalancer
  selector:
    app: my-api
  ports:
    - port: 80
      targetPort: 3000
```

```bash
kubectl get service my-api-lb
# NAME         TYPE           CLUSTER-IP    EXTERNAL-IP     PORT(S)        AGE
# my-api-lb    LoadBalancer   10.96.0.102   35.123.45.67   80:31234/TCP   2m
#                                            ↑ public IP assigned by cloud
```

On Docker Desktop, LoadBalancer shows `localhost` as EXTERNAL-IP (works for local testing):
```
my-api-lb    LoadBalancer   10.96.0.102   localhost   80:31234/TCP   2m
```

Use LoadBalancer for:
- Production services that need external access
- Cloud environments (AWS ELB, GCP Load Balancer, Azure LB)

---

## DNS in Kubernetes

Every Service gets a DNS name:

```
<service-name>                            (same namespace)
<service-name>.<namespace>
<service-name>.<namespace>.svc.cluster.local
```

Example:
```yaml
# Service named 'postgres' in namespace 'default'
# DNS names:
# postgres
# postgres.default
# postgres.default.svc.cluster.local
```

In your app config:
```yaml
env:
  - name: DATABASE_URL
    value: "postgres://user:pass@postgres:5432/mydb"
    #                            ↑ service name
```

---

## Port Terminology

```yaml
spec:
  ports:
    - name: http
      port: 80            # service port — clients connect to this
      targetPort: 3000    # container port — your app listens here
      nodePort: 30080     # node port (NodePort type only)
      protocol: TCP
```

```
Client → Service:80 → Container:3000
         ↑ port       ↑ targetPort
```

`targetPort` can also reference a named port from the container:
```yaml
containers:
  - name: api
    ports:
      - name: http
        containerPort: 3000

# In service:
targetPort: http    # references the named port
```

---

## port-forward for Local Development

The easiest way to access a service locally without changing its type:

```bash
# Forward local :8080 to service :80
kubectl port-forward service/my-api-service 8080:80

# Forward to a specific pod
kubectl port-forward pod/my-api-xxx-abc12 8080:3000

# Forward to deployment (picks a pod)
kubectl port-forward deployment/my-api 8080:3000

# Bind to all interfaces
kubectl port-forward --address 0.0.0.0 service/my-api-service 8080:80

# Run in background
kubectl port-forward service/my-api-service 8080:80 &
```

---

## Connecting Deployment + Service

A complete example: Deployment + ClusterIP Service + NodePort Service

```yaml
# api-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-api
  template:
    metadata:
      labels:
        app: my-api     # ← must match Service selector
    spec:
      containers:
        - name: api
          image: my-api:v1.0.0
          ports:
            - containerPort: 3000

---
# Internal service (for other pods in cluster)
apiVersion: v1
kind: Service
metadata:
  name: my-api
spec:
  type: ClusterIP
  selector:
    app: my-api     # ← selects pods with this label
  ports:
    - port: 80
      targetPort: 3000

---
# External service (for local development)
apiVersion: v1
kind: Service
metadata:
  name: my-api-external
spec:
  type: NodePort
  selector:
    app: my-api
  ports:
    - port: 80
      targetPort: 3000
      nodePort: 30080
```

```bash
# Apply all at once (--- separates multiple resources in one file)
kubectl apply -f api-deployment.yaml

# Test external access
curl http://localhost:30080/health

# Internal access (from another pod in the cluster)
kubectl run test --rm -it --image=curlimages/curl -- sh
curl http://my-api/health    # using service name
```

---

## Services in Docker Desktop

When using Docker Desktop with Kubernetes:
- ClusterIP: accessible via `kubectl port-forward`
- NodePort: accessible at `localhost:NODE_PORT`
- LoadBalancer: accessible at `localhost:PORT` (Docker Desktop assigns `localhost`)

---

**Next**: [ConfigMaps & Secrets](../06_kubernetes_intermediate/01_configmaps_secrets.md)
