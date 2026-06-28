# Local Kubernetes Setup

## What You'll Learn

- Enable Kubernetes in Docker Desktop
- Install and configure kubectl
- Verify your cluster is working
- Understand kubeconfig and contexts

---

## Enable Kubernetes in Docker Desktop

1. Open **Docker Desktop**
2. Click the ⚙️ **Settings** icon
3. Go to **Kubernetes**
4. Check **Enable Kubernetes**
5. Click **Apply & Restart**

Docker Desktop will pull Kubernetes component images and start the cluster. This takes **2-5 minutes** the first time.

You'll see a green Kubernetes icon in the Docker Desktop status bar when it's ready.

### Resource Recommendation

Kubernetes needs more resources than plain Docker:

**Settings → Resources → Advanced**:
- Memory: **6 GB** minimum (8 GB recommended)
- CPU: **4** cores recommended

---

## Install kubectl

`kubectl` is the Kubernetes CLI. Docker Desktop installs it automatically.

Verify:
```bash
kubectl version --client
# Client Version: v1.29.x
```

If kubectl is missing, install it manually:

**Windows** (Chocolatey):
```powershell
choco install kubernetes-cli
```

**Mac** (Homebrew):
```bash
brew install kubectl
```

**Linux**:
```bash
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl
sudo mv kubectl /usr/local/bin/
```

---

## Verify the Cluster

```bash
# Check cluster info
kubectl cluster-info

# Kubernetes control plane is running at https://127.0.0.1:6443
# CoreDNS is running at https://127.0.0.1:6443/api/v1/...

# List nodes (should show 1 node: docker-desktop)
kubectl get nodes

# NAME             STATUS   ROLES           AGE   VERSION
# docker-desktop   Ready    control-plane   5m    v1.29.x

# List all running pods in all namespaces (system pods)
kubectl get pods --all-namespaces

# NAMESPACE     NAME                                     READY   STATUS
# kube-system   coredns-xxx                              1/1     Running
# kube-system   etcd-docker-desktop                      1/1     Running
# kube-system   kube-apiserver-docker-desktop            1/1     Running
# kube-system   kube-controller-manager-docker-desktop   1/1     Running
```

---

## Understanding kubeconfig

kubectl uses a **kubeconfig** file to know which cluster to talk to and how to authenticate.

```bash
# Location
~/.kube/config

# View your kubeconfig
kubectl config view
```

The kubeconfig has three concepts:

```yaml
clusters:             # the clusters you know about
  - name: docker-desktop
    server: https://127.0.0.1:6443
    certificate: ...

users:                # credentials for each cluster
  - name: docker-desktop
    client-certificate: ...

contexts:             # combinations of cluster + user + namespace
  - name: docker-desktop
    cluster: docker-desktop
    user: docker-desktop
    namespace: default

current-context: docker-desktop
```

---

## kubectl Contexts

A **context** tells kubectl which cluster/user/namespace to use for commands.

```bash
# See all contexts
kubectl config get-contexts

# CURRENT   NAME             CLUSTER          AUTHINFO         NAMESPACE
# *         docker-desktop   docker-desktop   docker-desktop
#           minikube         minikube         minikube         default

# Current context
kubectl config current-context
# docker-desktop

# Switch context
kubectl config use-context docker-desktop
kubectl config use-context minikube

# Set default namespace for a context
kubectl config set-context --current --namespace=my-namespace
```

When you have multiple clusters (local + staging + production), contexts let you switch between them.

---

## kubectl Autocompletion (Highly Recommended)

```bash
# Bash
echo 'source <(kubectl completion bash)' >> ~/.bashrc
source ~/.bashrc

# Zsh
echo 'source <(kubectl completion zsh)' >> ~/.zshrc
source ~/.zshrc

# Fish
kubectl completion fish | source
```

After setup, Tab completes:
- `kubectl get po<Tab>` → `kubectl get pods`
- `kubectl describe pod my-<Tab>` → shows pod names

---

## k9s — Optional: TUI Dashboard

k9s is a terminal UI for Kubernetes — like Docker Desktop's GUI but for K8s:

```bash
# Mac
brew install k9s

# Windows (Chocolatey)
choco install k9s

# Linux
curl -sS https://webinstall.dev/k9s | bash
```

```bash
k9s    # opens the TUI
# Navigate with arrow keys, press Enter to drill down
# Press : to run commands (e.g. :pod, :svc, :deploy)
# Press d to describe, l for logs, e to edit, Ctrl+D to delete
```

---

## Quick Sanity Test

Let's make sure everything works by running a pod:

```bash
# Run a test pod
kubectl run test --image=nginx --port=80

# Check it's running
kubectl get pods
# NAME   READY   STATUS    RESTARTS   AGE
# test   1/1     Running   0          10s

# View its details
kubectl describe pod test

# Forward a local port to the pod (Ctrl+C to stop)
kubectl port-forward pod/test 8080:80 &
curl http://localhost:8080
# Welcome to nginx!

# Clean up
kubectl delete pod test
```

If that worked, your local Kubernetes cluster is ready.

---

## Kubernetes in Docker Desktop UI

Docker Desktop has a basic Kubernetes view:

1. Click the Kubernetes icon or go to **Settings → Kubernetes**
2. Shows cluster status

For a better GUI, consider:
- **k9s** (terminal UI, recommended)
- **Lens** — full-featured GUI (free, open source)
- **Kubernetes Dashboard** — web UI (needs manual setup)

---

**Next**: [kubectl Fundamentals](./03_kubectl_fundamentals.md) — learn the essential commands
