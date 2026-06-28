# Docker Desktop Tour

## What You'll Learn

- Navigate the Docker Desktop dashboard
- Manage containers, images, and volumes through the GUI
- Use Docker Desktop alongside the CLI (they're in sync)
- Key settings to know

---

## Overview

Docker Desktop gives you a GUI for everything you can do in the CLI. Both are in sync — a container you run in the terminal appears instantly in the dashboard, and vice versa.

Open Docker Desktop — you'll see the left sidebar:

```
Docker Desktop
├── 🏠 Home
├── 📦 Containers
├── 🖼  Images
├── 📂 Volumes
├── 🔨 Builds
├── 🧩 Extensions
└── ⚙️  Settings
```

---

## Containers Tab

This is your main workspace — shows all containers (running and stopped).

### What You See

```
NAME            IMAGE           STATUS      PORTS           ACTIONS
my-nginx        nginx:latest    Running     0.0.0.0:8080    ■ □ ⋮
my-postgres     postgres:16     Exited                      ▶ 🗑 ⋮
```

### Actions Per Container

| Icon | Action |
|------|--------|
| ▶ | Start |
| ■ | Stop |
| ↺ | Restart |
| 🗑 | Delete |
| ⋮ (menu) | Open in terminal, View files, Copy docker run command |

### Container Detail View

Click a container name to open it:

- **Logs** tab — real-time logs, searchable, filterable by level
- **Inspect** tab — full JSON config (same as `docker inspect`)
- **Bind Mounts** / **Volumes** tab — see mounted paths
- **Stats** tab — live CPU, memory, network, disk I/O charts
- **Terminal** tab — shell directly inside the container (same as `docker exec -it`)
- **Files** tab — browse the container's filesystem visually

> **Tip**: The Terminal and Files tabs are very useful for debugging without remembering `docker exec` syntax.

---

## Images Tab

Shows all images stored locally on your machine.

### What You See

```
NAME              TAG         IMAGE ID        SIZE        CREATED
nginx             latest      a72860cb95fd    187 MB      2 weeks ago
node              20-alpine   c962028e7b28    127 MB      1 month ago
hello-world       latest      d2c94e258dcb    13.3 kB     8 months ago
```

### Actions

| Action | What it does |
|--------|-------------|
| ▶ Run | Opens "Run a new container" dialog with form fields |
| Pull | Pull latest version of this image |
| Push to Hub | Upload to your Docker Hub account |
| 🗑 Delete | Remove image from local disk |
| Inspect | View layers, history, config JSON |

### Run Dialog (GUI alternative to `docker run`)

Click **▶ Run** on any image to get a form:
- Container name
- Port mappings (host:container)
- Volumes (host path : container path)
- Environment variables
- Command override

This generates and runs a `docker run` command — useful for learning the flags.

---

## Volumes Tab

Shows named volumes managed by Docker.

```
NAME              DRIVER      SIZE
postgres-data     local       45 MB
redis-data        local       2 MB
```

Click a volume to:
- See which containers use it
- Browse the files inside it (via the GUI file explorer)
- Delete it

> Volumes are independent of containers — deleting a container doesn't delete its volumes.

---

## Builds Tab

Shows Docker build history — useful when working on Dockerfiles.

- See build duration and whether it succeeded/failed
- View the build log for each step
- See cache usage per layer

---

## Dev Environments (Docker Desktop feature)

**Dev Environments** let you package your entire dev setup (code + tools + services) into a container-based environment that teammates can clone with one click.

Located in the left sidebar. Not required for this tutorial but worth exploring once you're comfortable with basic Docker.

---

## Extensions

Docker Desktop has a marketplace of extensions:

- **Logs Explorer** — better log searching
- **Disk Usage** — visualize what's taking space
- **Resource Monitor** — detailed container metrics
- **Snyk** — scan images for vulnerabilities
- **Portainer** — alternative container management UI

Access via the **Extensions** tab → **Browse**.

---

## Settings to Know

Open **Settings** (⚙️ gear icon):

### General
- **Start Docker Desktop when you log in** — recommended
- **Open Docker Dashboard at startup** — your preference

### Resources → Advanced
```
Memory: 4.00 GB minimum (8GB recommended if running Kubernetes)
CPU:    2 minimum (4 recommended)
Swap:   1 GB
```
Increase these if containers are slow or Kubernetes is struggling.

### Resources → WSL Integration (Windows only)
Enable the toggle for your Ubuntu or other WSL distro so you can use `docker` inside WSL terminals.

### Docker Engine
Advanced: edit the Docker daemon JSON config directly. Leave defaults unless you have specific needs (e.g., insecure registries, custom DNS).

### Kubernetes
**Enable Kubernetes** checkbox — we'll come back to this in [Section 5](../05_kubernetes_basics/02_local_setup.md). It starts a single-node K8s cluster inside Docker Desktop.

---

## CLI + GUI Sync Demo

Open a terminal and run:

```bash
docker run -d -p 8080:80 --name demo-nginx nginx
```

Now open Docker Desktop → **Containers** tab.

You'll see `demo-nginx` appear immediately with status **Running** and port `8080:80`.

Click it → **Logs** tab — you'll see nginx startup logs.

Now stop it from the GUI (■ button) and run in terminal:

```bash
docker ps       # container is gone from running list
docker ps -a    # but still exists as Exited
```

**Everything is in sync** — use CLI when faster, GUI when you want to explore.

---

## Useful Keyboard Shortcut

| Action | Shortcut |
|--------|----------|
| Open Docker Desktop | System tray whale icon |
| Search containers/images | Ctrl+K (Cmd+K on Mac) |
| Toggle dark mode | Settings → Appearance |

---

## Clean Up

```bash
# Remove the demo container
docker rm demo-nginx
```

---

**Next**: [Your First Container](./04_first_container.md) — run real containers hands-on
