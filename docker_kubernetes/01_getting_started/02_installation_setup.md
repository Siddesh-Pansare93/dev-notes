# Installation & Setup

## What You'll Learn

- Install Docker Desktop on Windows, Mac, or Linux
- Understand what Docker Desktop installs for you
- Configure WSL2 on Windows (recommended)
- Verify your installation works

---

## Docker Desktop

**Docker Desktop** is the recommended way to run Docker locally. It installs:
- Docker Engine (the daemon)
- Docker CLI (`docker` command)
- Docker Compose
- Kubernetes (optional, built-in)
- A GUI dashboard

### Windows

**System requirements**: Windows 10/11 64-bit, WSL2 backend recommended

#### Step 1 — Enable WSL2

WSL2 (Windows Subsystem for Linux 2) gives Docker better performance on Windows.

Open PowerShell as Administrator:

```powershell
# Enable WSL and Virtual Machine Platform
wsl --install

# After reboot, set WSL2 as default
wsl --set-default-version 2

# Install Ubuntu (or any distro you prefer)
wsl --install -d Ubuntu
```

> If you already have WSL1, upgrade: `wsl --set-version Ubuntu 2`

#### Step 2 — Install Docker Desktop

1. Download from [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/)
2. Run the installer — accept defaults
3. On the configuration screen: **Use WSL 2 based engine** should be checked
4. Restart when prompted

#### Step 3 — Configure WSL Integration

After Docker Desktop starts:
1. Open **Settings** (gear icon)
2. Go to **Resources → WSL Integration**
3. Enable integration for your Ubuntu distro
4. Click **Apply & Restart**

Now `docker` commands work inside your Ubuntu terminal too.

---

### Mac

**System requirements**: macOS 12+ (both Intel and Apple Silicon supported)

1. Download Docker Desktop for Mac from [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/)
   - Choose **Mac with Apple Chip** (M1/M2/M3) or **Mac with Intel Chip**
2. Open the `.dmg` file and drag Docker to Applications
3. Launch Docker from Applications
4. Follow the onboarding wizard

Docker Desktop on Mac uses a lightweight Linux VM — you don't need WSL.

---

### Linux

On Linux you can install Docker Engine directly (no VM needed — containers run natively).

#### Ubuntu / Debian

```bash
# Remove old versions if any
sudo apt-get remove docker docker-engine docker.io containerd runc

# Install prerequisites
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg

# Add Docker's GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add the Docker repository
echo \
  "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Start and enable Docker
sudo systemctl start docker
sudo systemctl enable docker

# Add your user to the docker group (avoid needing sudo every time)
sudo usermod -aG docker $USER
newgrp docker   # reload group without logout
```

> Docker Desktop is also available for Linux if you want the GUI — download the `.deb` or `.rpm` from the Docker website.

---

## Verify Your Installation

Run these commands after installing. All should succeed:

```bash
# Check Docker CLI version
docker --version
# Docker version 27.x.x, build ...

# Check Docker Compose version
docker compose version
# Docker Compose version v2.x.x

# Check the daemon is running
docker info
# Should show server info, not an error

# Run the hello-world test container
docker run hello-world
```

Expected output from `hello-world`:
```
Hello from Docker!
This message shows that your installation appears to be working correctly.
...
```

---

## What Just Happened with hello-world?

```
docker run hello-world

1. Docker CLI sends request to Docker daemon
2. Daemon checks: do I have "hello-world" image locally? NO
3. Daemon pulls hello-world:latest from Docker Hub
4. Daemon creates a container from that image
5. Container runs, prints the message, then exits
6. Container stops (image is still cached locally)
```

Confirm the image is now cached:
```bash
docker images
# REPOSITORY    TAG       IMAGE ID       CREATED        SIZE
# hello-world   latest    d2c94e258dcb   ...            13.3kB
```

---

## Docker Desktop Startup

After installation, Docker Desktop runs in the background (system tray on Windows/Mac). You must have Docker Desktop running before using `docker` commands.

```bash
# Check if Docker daemon is running
docker info

# If you get "Cannot connect to the Docker daemon" → start Docker Desktop
```

On Windows: look for the whale icon in the taskbar tray.
On Mac: look for the whale icon in the menu bar.
On Linux: `sudo systemctl status docker`

---

## Useful Docker Desktop Settings

| Setting | Location | Recommendation |
|---------|----------|----------------|
| Memory limit | Resources → Advanced | At least 4GB for K8s |
| CPU limit | Resources → Advanced | At least 2 CPUs for K8s |
| WSL integration | Resources → WSL Integration | Enable your distro |
| Start on login | General | Enable for convenience |
| Enable Kubernetes | Kubernetes | Enable when ready for Section 5 |

---

**Next**: [Docker Desktop Tour](./03_docker_desktop_tour.md) — explore the GUI
