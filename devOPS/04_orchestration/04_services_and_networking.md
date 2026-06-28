# Kubernetes Services & Networking

> Expose applications and enable inter-pod communication with Kubernetes Services.

## Service Types

### ClusterIP (Default)

```yaml
apiVersion: v1
kind: Service
metadata:
  name: myapp
spec:
  type: ClusterIP
  selector:
    app: myapp
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
```

- Internal only, no external access
- DNS: `myapp.default.svc.cluster.local`

### NodePort

```yaml
apiVersion: v1
kind: Service
metadata:
  name: myapp
spec:
  type: NodePort
  selector:
    app: myapp
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
    nodePort: 30000  # Exposed on every node
```

- Access via `node-ip:30000`
- Good for local testing

### LoadBalancer

```yaml
apiVersion: v1
kind: Service
metadata:
  name: myapp
spec:
  type: LoadBalancer
  selector:
    app: myapp
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
```

- Creates cloud load balancer (AWS ELB, GCP LB)
- External IP assigned

### Ingress

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - myapp.com
    secretName: myapp-tls
  rules:
  - host: myapp.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: myapp
            port:
              number: 80
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: api-service
            port:
              number: 5000
```

## DNS & Discovery

```bash
# Service DNS names
# myapp.default.svc.cluster.local
# myapp.default.svc
# myapp.default
# myapp

# In pods
curl http://myapp/api
```

## Network Policies

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-api
spec:
  podSelector:
    matchLabels:
      app: api
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: web
    ports:
    - protocol: TCP
      port: 5000
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: db
    ports:
    - protocol: TCP
      port: 5432
```

---

## Summary

- **ClusterIP** for internal communication
- **NodePort** for external access without LB
- **LoadBalancer** for public access
- **Ingress** for complex routing and SSL/TLS
- **Network Policies** restrict traffic
- **DNS discovery** enables service communication

Next: [ConfigMaps & Secrets](./05_configmaps_and_secrets.md)
