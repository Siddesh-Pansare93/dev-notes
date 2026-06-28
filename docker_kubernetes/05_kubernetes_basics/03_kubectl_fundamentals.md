# kubectl Fundamentals

## What You'll Learn

- The kubectl command pattern
- get, describe, apply, delete, logs, exec
- Reading YAML manifests
- Namespaces
- Useful flags

---

## kubectl Command Pattern

```bash
kubectl [command] [resource-type] [resource-name] [flags]

# Examples:
kubectl get pods
kubectl get pod my-pod
kubectl describe deployment my-api
kubectl delete service my-service
kubectl logs pod/my-pod
```

---

## get — List Resources

```bash
# List pods
kubectl get pods
kubectl get pod               # same (singular = plural)
kubectl get po                # abbreviation

# List all resource types (shows abbreviations)
kubectl api-resources

# Common abbreviations:
# pods = po
# services = svc
# deployments = deploy
# replicasets = rs
# configmaps = cm
# namespaces = ns
# persistentvolumes = pv
# persistentvolumeclaims = pvc
# ingresses = ing
# nodes = no

# List with more detail
kubectl get pods -o wide
# NAME       READY   STATUS    IP           NODE             AGE
# my-api-1   1/1     Running   10.1.0.10    docker-desktop   5m

# Get specific resource
kubectl get pod my-api-1
kubectl get service my-service

# Watch (refresh automatically)
kubectl get pods -w

# Output formats
kubectl get pods -o yaml       # full YAML definition
kubectl get pods -o json       # JSON
kubectl get pods -o name       # just names

# Get a specific field
kubectl get pod my-pod -o jsonpath='{.status.podIP}'

# All namespaces
kubectl get pods --all-namespaces
kubectl get pods -A             # same
```

---

## describe — Detailed Info

`describe` gives human-readable details including **events** — very useful for debugging.

```bash
kubectl describe pod my-pod
kubectl describe deployment my-api
kubectl describe node docker-desktop
kubectl describe service my-service
```

Output includes:
```
Name:         my-api-7d8f9c-abc12
Namespace:    default
...
Status:       Running
IP:           10.1.0.10
...
Containers:
  api:
    Image:    my-api:v1.0.0
    Port:     3000/TCP
    ...
    Liveness:  http-get http://:3000/health
    ...
Events:
  Type    Reason     Age   Message
  ----    ------     ----  -------
  Normal  Scheduled  5m    Successfully assigned default/my-api to docker-desktop
  Normal  Pulled     5m    Successfully pulled image
  Normal  Created    5m    Created container api
  Normal  Started    5m    Started container api
```

**Always check Events at the bottom** — they explain why a pod is failing.

---

## apply — Create or Update Resources

```bash
# Apply a YAML file (create if doesn't exist, update if it does)
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml

# Apply all YAML files in a directory
kubectl apply -f ./manifests/

# Apply from URL
kubectl apply -f https://raw.githubusercontent.com/...

# Dry run (see what would change without applying)
kubectl apply -f deployment.yaml --dry-run=client
kubectl apply -f deployment.yaml --dry-run=server
```

`apply` is **idempotent** — safe to run multiple times. Always use `apply` over `create`.

---

## delete — Remove Resources

```bash
# Delete by resource type + name
kubectl delete pod my-pod
kubectl delete deployment my-api
kubectl delete service my-service

# Delete from YAML file
kubectl delete -f deployment.yaml

# Delete all pods (they'll be recreated by Deployment)
kubectl delete pods --all

# Delete everything in the current namespace
kubectl delete all --all

# Force delete (skip graceful shutdown)
kubectl delete pod my-pod --force --grace-period=0
```

---

## logs — View Container Logs

```bash
# Pod logs
kubectl logs my-pod
kubectl logs my-pod -f              # follow (stream)
kubectl logs my-pod --tail=50       # last 50 lines
kubectl logs my-pod --since=1h      # last 1 hour

# If pod has multiple containers:
kubectl logs my-pod -c container-name

# Logs from a deployment (picks one of the pods)
kubectl logs deployment/my-api
kubectl logs deployment/my-api -f

# Logs from previous crashed container
kubectl logs my-pod --previous
```

---

## exec — Shell Inside a Pod

```bash
# Interactive shell
kubectl exec -it my-pod -- bash
kubectl exec -it my-pod -- sh          # if bash not available

# Run a command
kubectl exec my-pod -- ls /app
kubectl exec my-pod -- env
kubectl exec my-pod -- cat /etc/config/settings.json

# If pod has multiple containers:
kubectl exec -it my-pod -c api -- sh

# Exec into a pod from a deployment
kubectl exec -it deployment/my-api -- sh
```

---

## port-forward — Local Access to Pods/Services

```bash
# Forward local port to pod
kubectl port-forward pod/my-pod 8080:3000
# Now: http://localhost:8080 → pod's port 3000

# Forward to a service
kubectl port-forward service/my-service 8080:80

# Forward to a deployment
kubectl port-forward deployment/my-api 8080:3000

# Bind to all interfaces (accessible from network)
kubectl port-forward --address 0.0.0.0 service/my-service 8080:80

# Run in background
kubectl port-forward service/my-service 8080:80 &
```

---

## Reading a YAML Manifest

```yaml
apiVersion: apps/v1         # API group and version
kind: Deployment            # what type of resource
metadata:                   # name, namespace, labels
  name: my-api
  namespace: default
  labels:
    app: my-api
spec:                       # desired state (differs per resource type)
  replicas: 3
  selector:
    matchLabels:
      app: my-api
  template:                 # pod template
    metadata:
      labels:
        app: my-api
    spec:                   # pod spec
      containers:
        - name: api
          image: my-api:v1.0.0
          ports:
            - containerPort: 3000
```

Every K8s object has:
- `apiVersion` — which API group handles this
- `kind` — the resource type
- `metadata` — name, namespace, labels
- `spec` — desired state

---

## Namespaces

Namespaces logically separate resources within a cluster.

```bash
# List namespaces
kubectl get namespaces
# NAME              STATUS   AGE
# default           Active   5h     ← default for your resources
# kube-system       Active   5h     ← Kubernetes internal components
# kube-public       Active   5h     ← public cluster info

# Create a namespace
kubectl create namespace my-app

# Run commands in a specific namespace
kubectl get pods -n my-app
kubectl apply -f deployment.yaml -n my-app
kubectl logs my-pod -n my-app

# Set default namespace (so you don't type -n every time)
kubectl config set-context --current --namespace=my-app

# Reset to default
kubectl config set-context --current --namespace=default
```

---

## explain — Built-in Docs

```bash
# Explain a resource
kubectl explain deployment
kubectl explain pod

# Explain a specific field
kubectl explain deployment.spec.replicas
kubectl explain pod.spec.containers
kubectl explain pod.spec.containers.resources
```

---

## Useful Aliases

Add to `~/.bashrc` or `~/.zshrc`:

```bash
alias k=kubectl
alias kgp='kubectl get pods'
alias kgs='kubectl get services'
alias kgd='kubectl get deployments'
alias kdp='kubectl describe pod'
alias klogs='kubectl logs'
alias kex='kubectl exec -it'

# Show what's in all namespaces
alias kall='kubectl get pods --all-namespaces'
```

---

**Next**: [Pods](./04_pods.md) — the fundamental unit of Kubernetes
