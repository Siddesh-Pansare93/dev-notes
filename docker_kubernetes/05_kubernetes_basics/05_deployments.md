# Deployments

## What You'll Learn

- Create and manage Deployments
- Scale replicas up and down
- Perform rolling updates
- Roll back to a previous version
- Understand the Deployment → ReplicaSet → Pod hierarchy

---

## Why Deployments?

A Deployment is a controller that ensures your desired number of Pods are always running and healthy. It provides:

- **Self-healing**: replaces failed Pods automatically
- **Scaling**: easily change the number of replicas
- **Rolling updates**: update without downtime
- **Rollback**: revert to a previous version instantly

---

## Deployment YAML

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-api
  labels:
    app: my-api
spec:
  replicas: 3                        # run 3 pods

  selector:
    matchLabels:
      app: my-api                    # manages pods with this label

  template:                          # pod template
    metadata:
      labels:
        app: my-api                  # must match selector.matchLabels
    spec:
      containers:
        - name: api
          image: my-api:v1.0.0
          ports:
            - containerPort: 3000
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
            initialDelaySeconds: 5
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 30
```

```bash
kubectl apply -f deployment.yaml

kubectl get deployments
# NAME     READY   UP-TO-DATE   AVAILABLE   AGE
# my-api   3/3     3            3           1m

kubectl get pods
# NAME                      READY   STATUS    RESTARTS   AGE
# my-api-7d8f9c6b8d-abc12   1/1     Running   0          1m
# my-api-7d8f9c6b8d-def34   1/1     Running   0          1m
# my-api-7d8f9c6b8d-ghi56   1/1     Running   0          1m
```

---

## The Deployment → ReplicaSet → Pod Hierarchy

```
Deployment: my-api (spec: 3 replicas, image: my-api:v1)
└── ReplicaSet: my-api-7d8f9c6b8d (manages v1 pods)
     ├── Pod: my-api-7d8f9c6b8d-abc12
     ├── Pod: my-api-7d8f9c6b8d-def34
     └── Pod: my-api-7d8f9c6b8d-ghi56
```

When you update the image (new version), a **new ReplicaSet** is created:

```
Deployment: my-api (spec: 3 replicas, image: my-api:v2)
├── ReplicaSet: my-api-7d8f9c6b8d (v1 pods, scaling down)
│    └── Pod: my-api-7d8f9c6b8d-abc12 (being terminated)
└── ReplicaSet: my-api-9b3a2f1e5c (v2 pods, scaling up)
     ├── Pod: my-api-9b3a2f1e5c-jkl78
     └── Pod: my-api-9b3a2f1e5c-mno90
```

Old ReplicaSets are kept for rollback purposes.

---

## Scaling

```bash
# Scale to 5 replicas
kubectl scale deployment my-api --replicas=5

kubectl get pods
# 5 pods now running

# Scale down to 2
kubectl scale deployment my-api --replicas=2

# Scale to 0 (stops all pods, keeps deployment)
kubectl scale deployment my-api --replicas=0

# Scale via editing the YAML
kubectl edit deployment my-api
# Change spec.replicas in your editor, save → applied immediately

# Update replicas in file and re-apply
# Edit deployment.yaml: replicas: 5
kubectl apply -f deployment.yaml
```

---

## Rolling Updates

A rolling update replaces Pods gradually — old Pods are terminated as new ones become ready.

### Update the Image

```bash
# Set new image version
kubectl set image deployment/my-api api=my-api:v2.0.0
#                                    ↑   ↑
#                              container name  new image

# Watch the rollout
kubectl rollout status deployment/my-api
# Waiting for deployment "my-api" rollout to finish: 1 out of 3 new replicas have been updated...
# Waiting for deployment "my-api" rollout to finish: 2 out of 3 new replicas have been updated...
# Waiting for deployment "my-api" rollout to finish: 1 old replicas are pending termination...
# deployment "my-api" successfully rolled out
```

Or update the image in the YAML and re-apply:
```yaml
spec:
  template:
    spec:
      containers:
        - name: api
          image: my-api:v2.0.0   # changed from v1.0.0
```

```bash
kubectl apply -f deployment.yaml
```

### Rolling Update Strategy

```yaml
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1     # max pods that can be unavailable during update
      maxSurge: 1           # max extra pods that can be created during update
```

With 3 replicas, `maxUnavailable: 1, maxSurge: 1`:
1. Create 1 new Pod (now 4 total)
2. Wait for new Pod to be Ready
3. Terminate 1 old Pod (back to 3)
4. Repeat until all old Pods replaced

```yaml
# Recreate strategy: stop all old pods, then start new ones (causes downtime)
spec:
  strategy:
    type: Recreate
```

---

## Rollback

```bash
# See rollout history
kubectl rollout history deployment/my-api

# REVISION  CHANGE-CAUSE
# 1         <none>
# 2         <none>
# 3         <none>

# Add change cause (annotation)
kubectl annotate deployment my-api kubernetes.io/change-cause="Upgrade to v2.0.0"

# Rollback to previous version
kubectl rollout undo deployment/my-api

# Rollback to specific revision
kubectl rollout undo deployment/my-api --to-revision=1

# Watch the rollback
kubectl rollout status deployment/my-api

# Verify current image
kubectl describe deployment my-api | grep Image
```

---

## Pause and Resume Rollouts

Useful when you want to make multiple changes before triggering a rollout:

```bash
# Pause rollout
kubectl rollout pause deployment/my-api

# Make multiple changes
kubectl set image deployment/my-api api=my-api:v2.0.0
kubectl set env deployment/my-api LOG_LEVEL=debug
kubectl set resources deployment/my-api -c api --limits=memory=512Mi

# Resume (applies all changes in one rollout)
kubectl rollout resume deployment/my-api
```

---

## Self-Healing Demo

```bash
# Start a deployment
kubectl apply -f deployment.yaml    # 3 replicas

# Delete a pod manually
kubectl get pods
kubectl delete pod my-api-7d8f9c6b8d-abc12

# Watch — Deployment immediately creates a replacement
kubectl get pods -w
# my-api-7d8f9c6b8d-abc12   1/1     Running             0   5m
# my-api-7d8f9c6b8d-abc12   1/1     Terminating         0   5m
# my-api-7d8f9c6b8d-xyz99   0/1     Pending             0   0s
# my-api-7d8f9c6b8d-xyz99   0/1     ContainerCreating   0   0s
# my-api-7d8f9c6b8d-xyz99   1/1     Running             0   3s
# Always 3 replicas!
```

---

## Complete Deployment Example

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-api
  labels:
    app: my-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-api
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
      maxSurge: 1
  template:
    metadata:
      labels:
        app: my-api
        version: v1.0.0
    spec:
      containers:
        - name: api
          image: my-api:v1.0.0
          ports:
            - containerPort: 3000
          env:
            - name: NODE_ENV
              value: production
            - name: PORT
              value: "3000"
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
            failureThreshold: 3
```

---

**Next**: [Services](./06_services.md) — expose your Deployment to traffic
