# Helm: Kubernetes Package Manager

> Simplify Kubernetes deployments with Helm charts and templating.

## Helm Basics

```bash
# Install Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Add repository
helm repo add stable https://charts.helm.sh/stable
helm repo update

# Search chart
helm search repo nginx

# Install chart
helm install my-nginx stable/nginx --values values.yaml

# List releases
helm list

# Upgrade
helm upgrade my-nginx stable/nginx --values values.yaml

# Rollback
helm rollback my-nginx 1

# Uninstall
helm uninstall my-nginx
```

## Chart Structure

```
my-chart/
├── Chart.yaml
├── values.yaml
├── templates/
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── configmap.yaml
│   └── _helpers.tpl
└── charts/
```

### Chart.yaml

```yaml
apiVersion: v2
name: myapp
version: 1.0.0
appVersion: "1.0"
description: My application Helm chart
```

### values.yaml

```yaml
replicaCount: 3

image:
  repository: myapp
  tag: "1.0.0"
  pullPolicy: IfNotPresent

service:
  type: LoadBalancer
  port: 80
  targetPort: 3000

resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 250m
    memory: 256Mi

ingress:
  enabled: true
  hosts:
    - host: myapp.com
      paths:
        - path: /
```

### deployment.yaml Template

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "myapp.fullname" . }}
spec:
  replicas: {{ .Values.replicaCount }}
  template:
    spec:
      containers:
      - name: app
        image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
        ports:
        - containerPort: {{ .Values.service.targetPort }}
        resources: {{ toYaml .Values.resources | nindent 10 }}
```

## Advanced Features

### Values Overrides

```bash
# Override during install
helm install my-app myapp \
  --set replicaCount=5 \
  --set image.tag=2.0.0 \
  -f custom-values.yaml
```

### Hooks

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migration
  annotations:
    "helm.sh/hook": pre-install
    "helm.sh/hook-weight": "-5"
spec:
  template:
    spec:
      containers:
      - name: migrate
        image: myapp:1.0.0
        command: ["./migrate.sh"]
```

### Dependencies

```yaml
# Chart.yaml
dependencies:
  - name: postgresql
    version: "12.x"
    repository: "https://charts.bitnami.com/bitnami"
```

---

## Popular Helm Charts

- **nginx** - Web server
- **PostgreSQL/MySQL** - Databases
- **Redis** - Caching
- **Prometheus** - Monitoring
- **ELK** - Logging
- **Cert-Manager** - SSL certificates
- **Ingress-NGINX** - Ingress controller

---

## Summary

- **Helm** packages Kubernetes apps
- **Charts** define application structure
- **Values** customize deployments
- **Templating** enables reusability
- **Hooks** handle lifecycle events
- **Repositories** share community charts

Next: [Infrastructure as Code](../05_infrastructure_as_code/01_iac_concepts.md)
