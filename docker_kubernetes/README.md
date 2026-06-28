# Docker & Kubernetes — From Scratch

> A complete, hands-on guide to Docker (CLI + Docker Desktop) and Kubernetes, starting from zero. Every concept is paired with real commands you run yourself.

---

## Learning Path

```
Docker Foundations → Images & Dockerfiles → Containers Deep Dive
→ Docker Compose → Kubernetes Basics → Kubernetes Intermediate → Real Projects
```

---

## Table of Contents

### [`01_getting_started/`](./01_getting_started/) — Docker Foundations

| # | File | Topics |
|---|------|--------|
| 1 | [What is Docker?](./01_getting_started/01_what_is_docker.md) | Containers vs VMs, why Docker, core concepts |
| 2 | [Installation & Setup](./01_getting_started/02_installation_setup.md) | Docker Desktop on Windows/Mac, WSL2, verify install |
| 3 | [Docker Desktop Tour](./01_getting_started/03_docker_desktop_tour.md) | Dashboard, images/containers UI, volumes, settings |
| 4 | [Your First Container](./01_getting_started/04_first_container.md) | hello-world, nginx, interactive containers, CLI basics |

### [`02_images/`](./02_images/) — Images & Dockerfiles

| # | File | Topics |
|---|------|--------|
| 1 | [Understanding Images](./02_images/01_understanding_images.md) | Layers, copy-on-write, registries, tags, manifest |
| 2 | [Managing Images](./02_images/02_managing_images.md) | pull, list, inspect, tag, remove, prune, Docker Hub |
| 3 | [Writing Dockerfiles](./02_images/03_writing_dockerfiles.md) | FROM, RUN, COPY, ADD, ENV, ARG, EXPOSE, CMD, ENTRYPOINT |
| 4 | [Building Images](./02_images/04_building_images.md) | docker build, build context, tagging, pushing to Docker Hub |
| 5 | [Dockerfile Best Practices](./02_images/05_dockerfile_best_practices.md) | Layer caching, small base images, non-root user, .dockerignore |
| 6 | [Multi-Stage Builds](./02_images/06_multi_stage_builds.md) | Build vs runtime stages, dramatically smaller images |

### [`03_containers/`](./03_containers/) — Containers Deep Dive

| # | File | Topics |
|---|------|--------|
| 1 | [Running Containers](./03_containers/01_running_containers.md) | run flags deep dive, lifecycle, restart policies |
| 2 | [Container Networking](./03_containers/02_networking.md) | Bridge, host, none, custom networks, DNS, port mapping |
| 3 | [Volumes & Storage](./03_containers/03_volumes_storage.md) | Named volumes, bind mounts, tmpfs, data persistence |
| 4 | [Environment & Config](./03_containers/04_environment_config.md) | ENV vars, --env-file, managing config across environments |
| 5 | [Debugging Containers](./03_containers/05_debugging.md) | logs, exec, inspect, stats, top, cp, common issues |

### [`04_compose/`](./04_compose/) — Docker Compose

| # | File | Topics |
|---|------|--------|
| 1 | [Docker Compose Intro](./04_compose/01_compose_intro.md) | What/why Compose, compose.yml structure, services |
| 2 | [Services & Networking](./04_compose/02_services_networking.md) | Multi-service apps, depends_on, custom networks |
| 3 | [Volumes & Environment](./04_compose/03_volumes_environment.md) | Volumes, env_file, .env, override files |
| 4 | [Compose Commands](./04_compose/04_compose_commands.md) | up, down, ps, logs, exec, build, scale, watch |
| 5 | [Real-World Project](./04_compose/05_real_world_project.md) | Full-stack app: React + Node.js API + PostgreSQL + Redis |

### [`05_kubernetes_basics/`](./05_kubernetes_basics/) — Kubernetes Basics

| # | File | Topics |
|---|------|--------|
| 1 | [What is Kubernetes?](./05_kubernetes_basics/01_what_is_kubernetes.md) | Why K8s, architecture (control plane + nodes), key objects |
| 2 | [Local Setup](./05_kubernetes_basics/02_local_setup.md) | Enable K8s in Docker Desktop, install kubectl, verify cluster |
| 3 | [kubectl Fundamentals](./05_kubernetes_basics/03_kubectl_fundamentals.md) | contexts, get, describe, apply, delete, explain, logs |
| 4 | [Pods](./05_kubernetes_basics/04_pods.md) | Pod spec YAML, labels, selectors, lifecycle, multi-container |
| 5 | [Deployments](./05_kubernetes_basics/05_deployments.md) | Deployment YAML, replicas, rolling updates, rollback |
| 6 | [Services](./05_kubernetes_basics/06_services.md) | ClusterIP, NodePort, LoadBalancer, port-forward, DNS |

### [`06_kubernetes_intermediate/`](./06_kubernetes_intermediate/) — Kubernetes Intermediate

| # | File | Topics |
|---|------|--------|
| 1 | [ConfigMaps & Secrets](./06_kubernetes_intermediate/01_configmaps_secrets.md) | Externalizing config, mounting as files or env vars |
| 2 | [Persistent Volumes](./06_kubernetes_intermediate/02_persistent_volumes.md) | PV, PVC, StorageClass, stateful applications |
| 3 | [Namespaces](./06_kubernetes_intermediate/03_namespaces.md) | Isolation, resource quotas, working across namespaces |
| 4 | [Ingress](./06_kubernetes_intermediate/04_ingress.md) | HTTP routing, path-based, host-based, TLS |
| 5 | [Resource Management & HPA](./06_kubernetes_intermediate/05_resource_management_hpa.md) | requests/limits, HorizontalPodAutoscaler, VPA |

### [`07_projects/`](./07_projects/) — Real-World Projects

| # | File | Topics |
|---|------|--------|
| 1 | [Dockerize a Node.js App](./07_projects/01_dockerize_nodejs.md) | Express API, Dockerfile, .dockerignore, production image |
| 2 | [Dockerize a Python FastAPI App](./07_projects/02_dockerize_python_fastapi.md) | FastAPI, multi-stage, Poetry, health checks |
| 3 | [Full-Stack App to Kubernetes](./07_projects/03_fullstack_to_kubernetes.md) | Compose → K8s manifests, Deployments + Services + Ingress |

---

## Prerequisites

- Basic command line usage (any OS)
- No prior Docker or Kubernetes knowledge required

## Tools You'll Install

| Tool | Purpose | Install |
|------|---------|---------|
| **Docker Desktop** | Runs Docker + Kubernetes locally | [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/) |
| **kubectl** | Kubernetes CLI (bundled with Docker Desktop) | Verify: `kubectl version` |

---

## Quick Reference

```bash
# Docker essentials
docker run -d -p 8080:80 --name web nginx   # run container
docker ps                                    # list running
docker logs web                              # view logs
docker exec -it web sh                       # shell inside
docker stop web && docker rm web             # stop + remove

# Kubernetes essentials
kubectl get pods                             # list pods
kubectl apply -f manifest.yaml              # create/update resources
kubectl describe pod <name>                  # debug a pod
kubectl logs <pod>                           # view logs
kubectl port-forward svc/<name> 8080:80     # local access
```
