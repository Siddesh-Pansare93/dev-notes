# Pods

## What You'll Learn

- What a Pod is and how it works
- Write a Pod YAML manifest
- Labels and selectors
- Liveness and readiness probes
- Multi-container pods
- Pod lifecycle

---

## What is a Pod?

A Pod is the **smallest deployable unit** in Kubernetes. It wraps one or more containers that:

- Share the same network namespace (same IP, same ports)
- Share storage volumes
- Are scheduled together on the same node

```
Pod: my-api-7d8f9c-abc12
  Network: 10.1.0.10
  ├── Container: api       (port 3000)
  └── Volume: /app/data
```

In most cases, one Pod = one container. Multi-container Pods are for tightly coupled helper processes (sidecars).

---

## Your First Pod YAML

```yaml
# pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-nginx
  labels:
    app: nginx
    environment: dev
spec:
  containers:
    - name: nginx
      image: nginx:alpine
      ports:
        - containerPort: 80
```

```bash
# Create the pod
kubectl apply -f pod.yaml

# Check it
kubectl get pods
# NAME       READY   STATUS    RESTARTS   AGE
# my-nginx   1/1     Running   0          10s

# Access it
kubectl port-forward pod/my-nginx 8080:80
# Open http://localhost:8080

# Delete
kubectl delete pod my-nginx
```

---

## Pod Spec Fields

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-app
  namespace: default
  labels:
    app: my-app
    version: v1
  annotations:
    description: "Main application pod"

spec:
  containers:
    - name: app
      image: my-app:v1.0.0

      # Command and args (override Dockerfile CMD/ENTRYPOINT)
      command: ["node"]           # overrides ENTRYPOINT
      args: ["server.js", "--port", "3000"]   # overrides CMD

      # Ports (documentation only — doesn't affect networking)
      ports:
        - name: http
          containerPort: 3000
          protocol: TCP

      # Environment variables
      env:
        - name: NODE_ENV
          value: production
        - name: PORT
          value: "3000"
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: password
        - name: LOG_LEVEL
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: log_level

      # Resources
      resources:
        requests:             # minimum guaranteed
          memory: "128Mi"
          cpu: "100m"         # 100 millicores = 0.1 CPU
        limits:               # maximum allowed
          memory: "256Mi"
          cpu: "500m"

      # Volume mounts
      volumeMounts:
        - name: config-volume
          mountPath: /app/config
          readOnly: true
        - name: data-volume
          mountPath: /app/data

  # Volumes
  volumes:
    - name: config-volume
      configMap:
        name: app-config
    - name: data-volume
      persistentVolumeClaim:
        claimName: my-pvc

  # Which node to run on (optional)
  nodeSelector:
    kubernetes.io/os: linux

  # Restart policy
  restartPolicy: Always    # Always, OnFailure, Never
```

---

## Labels and Selectors

Labels are **key-value pairs** attached to resources. They're used everywhere:
- Services use them to find which Pods to send traffic to
- Deployments use them to manage their Pods
- You use them to filter `kubectl get` results

```yaml
metadata:
  labels:
    app: my-api          # application name
    version: v2.0        # version
    environment: prod    # environment
    tier: backend        # tier
```

```bash
# Filter by label
kubectl get pods -l app=my-api
kubectl get pods -l environment=prod,tier=backend

# Show labels in output
kubectl get pods --show-labels
```

---

## Liveness and Readiness Probes

Probes are health checks Kubernetes runs continuously.

### Readiness Probe

**Is the Pod ready to receive traffic?**

Kubernetes won't send traffic to a Pod until its readiness probe passes. A Pod that fails readiness is removed from Service endpoints but stays running.

Use case: waiting for the app to finish startup, connections to DB, warming cache.

### Liveness Probe

**Is the Pod still alive/healthy?**

If the liveness probe fails repeatedly, Kubernetes **restarts** the container. Use for detecting deadlocks or unhealthy states that require a restart.

### Probe Types

```yaml
spec:
  containers:
    - name: api
      image: my-api:v1

      # HTTP probe (most common for web apps)
      readinessProbe:
        httpGet:
          path: /health
          port: 3000
        initialDelaySeconds: 5   # wait 5s before first check
        periodSeconds: 10        # check every 10s
        timeoutSeconds: 5        # fail if no response in 5s
        successThreshold: 1      # 1 success = healthy
        failureThreshold: 3      # 3 failures = not ready

      livenessProbe:
        httpGet:
          path: /health
          port: 3000
        initialDelaySeconds: 30
        periodSeconds: 30
        timeoutSeconds: 5
        failureThreshold: 3

      # TCP probe (for non-HTTP services)
      readinessProbe:
        tcpSocket:
          port: 5432
        initialDelaySeconds: 5
        periodSeconds: 10

      # Exec probe (run a command, exit 0 = healthy)
      livenessProbe:
        exec:
          command: ["redis-cli", "ping"]
        periodSeconds: 10
```

---

## Pod Lifecycle

```
Pending → Running → Succeeded/Failed/Unknown
```

### Pending

Pod accepted but not yet running:
- Waiting for a node to be scheduled
- Pulling container image
- Container starting up

### Running

At least one container is running. `READY` shows `1/1` (or `2/2` for two containers).

### Succeeded

All containers exited with code 0. For Jobs (one-off tasks).

### Failed

At least one container exited with non-zero code and won't restart.

### CrashLoopBackOff

Container keeps crashing. Kubernetes adds increasing delays between restarts (1s, 2s, 4s, 8s...).

```bash
# Debug CrashLoopBackOff:
kubectl describe pod my-pod   # check Events section
kubectl logs my-pod           # see crash logs
kubectl logs my-pod --previous  # logs from BEFORE the crash
```

---

## Multi-Container Pods

Useful for sidecars (logging agents, proxies, adapters):

```yaml
spec:
  containers:
    - name: app
      image: my-app:v1
      ports:
        - containerPort: 3000

    - name: log-shipper
      image: fluent-bit:latest
      volumeMounts:
        - name: logs
          mountPath: /logs

  volumes:
    - name: logs
      emptyDir: {}    # temporary shared directory
```

Both containers share the same IP and can communicate via `localhost`:

```
Pod: my-app
  IP: 10.1.0.10
  ├── Container: app (localhost:3000)
  └── Container: log-shipper (reads from /logs volume)
```

---

## Init Containers

Run **before** main containers. Used for setup tasks (waiting for DB, running migrations):

```yaml
spec:
  initContainers:
    - name: wait-for-db
      image: busybox
      command: ['sh', '-c', 'until nc -z db 5432; do sleep 2; done']

    - name: run-migrations
      image: my-app:v1
      command: ["node", "scripts/migrate.js"]
      env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: url

  containers:
    - name: app
      image: my-app:v1
      # starts only after init containers complete
```

---

## Note: Don't Manage Pods Directly

In practice, you **don't create individual Pods** — you create **Deployments**, which manage Pods for you. Pods created directly have no self-healing.

```bash
# Pod dies → it's gone (no auto-restart)
kubectl delete pod my-nginx

# Deployment pod dies → Deployment creates a new one
kubectl delete pod my-api-7d8f9c-abc12
# → Deployment notices, creates my-api-7d8f9c-xyz99 automatically
```

---

**Next**: [Deployments](./05_deployments.md) — run and update Pods reliably
