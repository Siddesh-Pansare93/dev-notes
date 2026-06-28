# ConfigMaps & Secrets

> Manage configuration and sensitive data in Kubernetes.

## ConfigMaps

Store non-sensitive configuration.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  LOG_LEVEL: info
  DATABASE_HOST: postgres.default.svc
  API_URL: https://api.example.com
  config.yaml: |
    server:
      port: 3000
      workers: 4
```

### Use ConfigMap in Pod

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
spec:
  containers:
  - name: app
    image: myapp
    env:
    - name: LOG_LEVEL
      valueFrom:
        configMapKeyRef:
          name: app-config
          key: LOG_LEVEL
    volumeMounts:
    - name: config
      mountPath: /etc/config
  volumes:
  - name: config
    configMap:
      name: app-config
```

### CLI Usage

```bash
# Create from file
kubectl create configmap app-config --from-file=config.yaml

# Create from key-value
kubectl create configmap app-config \
  --from-literal=LOG_LEVEL=info \
  --from-literal=DATABASE_HOST=db.default
```

---

## Secrets

Store sensitive data (passwords, tokens, keys).

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
type: Opaque
stringData:
  DATABASE_PASSWORD: secret123
  API_KEY: sk_live_xyz
  PRIVATE_KEY: |
    -----BEGIN PRIVATE KEY-----
    ...
    -----END PRIVATE KEY-----
```

### Use Secret in Pod

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
spec:
  containers:
  - name: app
    image: myapp
    env:
    - name: DATABASE_PASSWORD
      valueFrom:
        secretKeyRef:
          name: app-secrets
          key: DATABASE_PASSWORD
    volumeMounts:
    - name: keys
      mountPath: /etc/keys
      readOnly: true
  volumes:
  - name: keys
    secret:
      secretName: app-secrets
      items:
      - key: PRIVATE_KEY
        path: private.key
```

### CLI Usage

```bash
# Create from literal
kubectl create secret generic app-secrets \
  --from-literal=DATABASE_PASSWORD=secret123

# Create from file
kubectl create secret generic app-secrets \
  --from-file=./private.key

# View secrets (base64 encoded)
kubectl get secret app-secrets -o yaml

# Decode
kubectl get secret app-secrets -o jsonpath='{.data.DATABASE_PASSWORD}' | base64 -d
```

---

## Best Practices

- **ConfigMaps** for configuration, **Secrets** for sensitive data
- **Never commit secrets** to git
- **Use external secret management** (HashiCorp Vault, AWS Secrets Manager)
- **Encrypt secrets at rest** with `--encryption-provider`
- **Restrict secret access** with RBAC
- **Rotate secrets regularly**

---

## Summary

- **ConfigMaps** store non-sensitive configuration
- **Secrets** store sensitive data
- **Both** injected as environment or volumes
- **Never hardcode** in images or manifests
- **Use external systems** for secret management

Next: [Persistent Storage](./06_persistent_storage.md)
