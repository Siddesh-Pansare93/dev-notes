# Kubernetes Deployments

> Manage application deployments, updates, and rollbacks with Kubernetes Deployments.

## Deployment Basics

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  labels:
    app: myapp
spec:
  replicas: 3
  revisionHistoryLimit: 10  # Keep last 10 revisions
  selector:
    matchLabels:
      app: myapp
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1        # One extra pod during update
      maxUnavailable: 1  # Max one pod down
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
      - name: myapp
        image: myapp:1.0.0
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: production
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 512Mi
```

### Deploy

```bash
# Create deployment
kubectl apply -f deployment.yaml

# Check rollout
kubectl rollout status deployment/myapp

# View pods
kubectl get pods -l app=myapp

# View deployment
kubectl describe deployment myapp
```

## Updates & Rollbacks

### Update Image

```bash
# Update image
kubectl set image deployment/myapp \
  myapp=myapp:2.0.0 --record

# Check rollout
kubectl rollout status deployment/myapp

# View history
kubectl rollout history deployment/myapp

# Rollback to previous version
kubectl rollout undo deployment/myapp

# Rollback to specific revision
kubectl rollout undo deployment/myapp --to-revision=2
```

### Pause & Resume

```bash
# Pause deployment (prevents rollouts)
kubectl rollout pause deployment/myapp

# Make multiple changes
kubectl set image deployment/myapp myapp=myapp:2.0.0
kubectl set resources deployment/myapp -c=myapp --limits=cpu=500m

# Resume rollout
kubectl rollout resume deployment/myapp
```

## Scaling

```bash
# Scale to 5 replicas
kubectl scale deployment/myapp --replicas=5

# Autoscale
kubectl autoscale deployment myapp --min=2 --max=10 --cpu-percent=80
```

## Summary

- **Deployments** manage replica sets and updates
- **Rolling updates** provide zero-downtime deployments
- **Readiness/Liveness** probes ensure health
- **Resource limits** prevent runaway pods
- **Rollback** recovers from bad deployments
- **History** tracks revisions for auditing

Next: [Services & Networking](./04_services_and_networking.md)
