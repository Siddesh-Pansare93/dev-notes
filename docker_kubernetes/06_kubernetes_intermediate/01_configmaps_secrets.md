# ConfigMaps & Secrets

## What You'll Learn

- Store configuration in ConfigMaps
- Store sensitive data in Secrets
- Mount them as environment variables or files
- Update config without rebuilding images

---

## ConfigMaps

A ConfigMap stores non-sensitive key-value configuration data.

### Create a ConfigMap

```yaml
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  NODE_ENV: production
  PORT: "3000"
  LOG_LEVEL: info
  MAX_CONNECTIONS: "10"

  # Multi-line values (config files)
  nginx.conf: |
    server {
        listen 80;
        location / {
            proxy_pass http://api:3000;
        }
    }

  settings.json: |
    {
      "featureFlags": {
        "newDashboard": true,
        "betaFeature": false
      }
    }
```

```bash
kubectl apply -f configmap.yaml

# Or create imperatively:
kubectl create configmap app-config \
  --from-literal=NODE_ENV=production \
  --from-literal=PORT=3000 \
  --from-file=nginx.conf=./nginx.conf

kubectl get configmap app-config
kubectl describe configmap app-config
```

### Use ConfigMap as Environment Variables

```yaml
spec:
  containers:
    - name: api
      image: my-api:v1
      # All keys from ConfigMap become env vars
      envFrom:
        - configMapRef:
            name: app-config

      # Or reference specific keys
      env:
        - name: NODE_ENV
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: NODE_ENV
        - name: PORT
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: PORT
```

### Mount ConfigMap as Files

```yaml
spec:
  containers:
    - name: nginx
      image: nginx:alpine
      volumeMounts:
        - name: nginx-config
          mountPath: /etc/nginx/conf.d
          readOnly: true

  volumes:
    - name: nginx-config
      configMap:
        name: app-config
        items:
          - key: nginx.conf
            path: default.conf    # filename in the container
```

---

## Secrets

Secrets store sensitive data (passwords, tokens, keys). They're base64-encoded, not encrypted by default.

> For production, use encrypted Secrets via Sealed Secrets, AWS Secrets Manager, or Vault.

### Create a Secret

```yaml
# secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-secret
type: Opaque
stringData:               # use stringData to write plain text (auto base64-encoded)
  DB_PASSWORD: mysecretpassword
  DB_USER: appuser
  DATABASE_URL: postgres://appuser:mysecretpassword@db:5432/myapp

# OR use data: with base64-encoded values:
# data:
#   DB_PASSWORD: bXlzZWNyZXRwYXNzd29yZA==
```

```bash
kubectl apply -f secret.yaml

# Or create imperatively:
kubectl create secret generic db-secret \
  --from-literal=DB_PASSWORD=mysecretpassword \
  --from-literal=DB_USER=appuser

# Create from file:
kubectl create secret generic tls-secret \
  --from-file=tls.crt=./cert.pem \
  --from-file=tls.key=./key.pem

kubectl get secrets
kubectl describe secret db-secret   # values are hidden

# Decode a value (for debugging):
kubectl get secret db-secret -o jsonpath='{.data.DB_PASSWORD}' | base64 --decode
```

### Use Secret as Environment Variables

```yaml
spec:
  containers:
    - name: api
      image: my-api:v1
      # All keys from secret
      envFrom:
        - secretRef:
            name: db-secret

      # Specific keys
      env:
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: DB_PASSWORD
```

### Mount Secret as Files

```yaml
spec:
  containers:
    - name: api
      volumeMounts:
        - name: secrets-vol
          mountPath: /run/secrets
          readOnly: true

  volumes:
    - name: secrets-vol
      secret:
        secretName: db-secret
        defaultMode: 0400   # file permissions (owner read-only)
```

Inside the container:
```
/run/secrets/
├── DB_PASSWORD    (contains the password)
├── DB_USER        (contains the username)
└── DATABASE_URL   (contains the full URL)
```

Your app reads them:
```javascript
const password = require('fs').readFileSync('/run/secrets/DB_PASSWORD', 'utf8').trim();
```

---

## Updating Config Without Redeploy

When you update a ConfigMap, Pods don't automatically see the change unless:
1. They read files from mounted volumes (files update automatically after ~60s)
2. You restart/redeploy the pods

For env vars (envFrom/env), you must restart:

```bash
# Update the ConfigMap
kubectl apply -f configmap.yaml

# Rolling restart the deployment (recreates all pods)
kubectl rollout restart deployment/my-api
```

---

## ConfigMap vs Secret — Quick Reference

| | ConfigMap | Secret |
|---|---|---|
| **Sensitive data** | No | Yes |
| **Storage** | Plain text | Base64-encoded |
| **Use for** | Config, feature flags, file content | Passwords, tokens, certificates |
| **kubectl describe** | Shows values | Hides values |
| **Production security** | Fine | Needs encryption (Sealed Secrets/Vault) |

---

## Full Example: App with Config + Secrets

```yaml
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  NODE_ENV: production
  PORT: "3000"
  LOG_LEVEL: info

---
# secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
type: Opaque
stringData:
  DATABASE_URL: postgres://appuser:secret@db:5432/myapp
  JWT_SECRET: supersecretjwtsigningkey
  REDIS_URL: redis://redis:6379

---
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-api
spec:
  replicas: 2
  selector:
    matchLabels:
      app: my-api
  template:
    metadata:
      labels:
        app: my-api
    spec:
      containers:
        - name: api
          image: my-api:v1.0.0
          envFrom:
            - configMapRef:
                name: app-config
            - secretRef:
                name: app-secrets
          ports:
            - containerPort: 3000
```

```bash
kubectl apply -f configmap.yaml -f secret.yaml -f deployment.yaml

# Verify
kubectl exec deployment/my-api -- env | grep NODE_ENV
kubectl exec deployment/my-api -- env | grep DATABASE
```

---

**Next**: [Persistent Volumes](./02_persistent_volumes.md) — stateful apps with durable storage
