# Your First Container

## What You'll Learn

- Run containers interactively and in the background
- Map ports so you can access services
- View logs and open a shell inside a container
- Run real services: web server, database, Node.js REPL
- Clean up properly

---

## Run hello-world (Warm Up)

```bash
docker run hello-world
```

This is the Docker health check — confirms everything works.

---

## Run Nginx Web Server

Nginx is a popular web server. Let's run it and access it in your browser.

```bash
docker run -d -p 8080:80 --name my-web nginx
```

Breaking down the flags:
- `-d` — **detached**: run in background (don't lock up your terminal)
- `-p 8080:80` — **port mapping**: forward your machine's port 8080 to container's port 80
- `--name my-web` — give it a memorable name

Open your browser: **http://localhost:8080**

You should see: "Welcome to nginx!"

```bash
# Confirm it's running
docker ps

# CONTAINER ID   IMAGE   COMMAND                  STATUS         PORTS                  NAMES
# a3f8c1d92e4b   nginx   "/docker-entrypoint.…"   Up 12 seconds  0.0.0.0:8080->80/tcp   my-web
```

### View Logs

```bash
docker logs my-web
```

Reload your browser a few times, then:

```bash
docker logs my-web    # should show GET / HTTP/1.1 requests
docker logs -f my-web # -f = follow: stream new logs in real-time (Ctrl+C to stop)
```

### Stop and Remove

```bash
docker stop my-web    # graceful shutdown (sends SIGTERM, waits, then SIGKILL)
docker rm my-web      # remove the stopped container
```

Or combine:
```bash
docker rm -f my-web   # force remove (stop + remove in one command)
```

---

## Run an Interactive Container

Sometimes you just want a shell inside a container to explore or test.

```bash
# Run Ubuntu with an interactive shell
docker run -it ubuntu bash
```

- `-i` — **interactive**: keep stdin open
- `-t` — **tty**: allocate a terminal

You're now inside the Ubuntu container:

```bash
root@a3f8c1:/# ls
root@a3f8c1:/# cat /etc/os-release
root@a3f8c1:/# apt-get update && apt-get install -y curl
root@a3f8c1:/# curl --version
root@a3f8c1:/# exit
```

After `exit`, the container **stops** (it was tied to the bash process).

```bash
# --rm removes the container automatically when it exits
docker run --rm -it ubuntu bash
# exit → container is gone, no cleanup needed
```

---

## Run Node.js REPL

```bash
# Open a Node.js interactive session
docker run --rm -it node:20-alpine node
```

You're now in a Node.js REPL:

```javascript
> 1 + 1
2
> const greet = name => `Hello, ${name}!`
> greet('Docker')
'Hello, Docker!'
> .exit
```

No Node.js installation needed on your machine!

---

## Run a PostgreSQL Database

```bash
docker run -d \
  --name my-postgres \
  -e POSTGRES_PASSWORD=secret123 \
  -e POSTGRES_DB=myapp \
  -p 5432:5432 \
  postgres:16-alpine
```

- `-e KEY=value` — **environment variable**: pass config to the container
- `POSTGRES_PASSWORD` and `POSTGRES_DB` are variables the postgres image recognizes

Wait 2-3 seconds for Postgres to start, then connect:

```bash
# Open a psql shell inside the container
docker exec -it my-postgres psql -U postgres -d myapp
```

- `docker exec` — run a command in a **running** container
- `-it` — interactive terminal
- `psql -U postgres -d myapp` — connect to the myapp database as the postgres user

Inside psql:

```sql
CREATE TABLE users (
  id   SERIAL PRIMARY KEY,
  name TEXT NOT NULL
);

INSERT INTO users (name) VALUES ('Alice'), ('Bob');

SELECT * FROM users;
--  id | name
-- ----+-------
--   1 | Alice
--   2 | Bob

\q
```

```bash
# Clean up
docker rm -f my-postgres
```

---

## Run with Auto-Restart

For services you want to survive machine reboots:

```bash
docker run -d \
  --name persistent-nginx \
  --restart unless-stopped \
  -p 8080:80 \
  nginx
```

Restart policies:
- `no` — default, never restart
- `always` — always restart (even if you manually stopped it)
- `unless-stopped` — restart unless you explicitly stopped it
- `on-failure` — restart only on non-zero exit code

```bash
# Clean up
docker rm -f persistent-nginx
```

---

## The --rm Flag

Use `--rm` for one-off tasks where you don't need the container afterward:

```bash
# Run a command and throw away the container
docker run --rm alpine echo "Hello from Alpine!"

# Check your public IP
docker run --rm alpine wget -qO- ifconfig.me

# Run a Python script
docker run --rm -v "$(pwd)":/code python:3.12-alpine python /code/script.py
```

---

## Summary of Common docker run Flags

| Flag | Short | Example | Meaning |
|------|-------|---------|---------|
| `--detach` | `-d` | `-d` | Run in background |
| `--publish` | `-p` | `-p 8080:80` | host_port:container_port |
| `--name` | | `--name web` | Give container a name |
| `--env` | `-e` | `-e KEY=val` | Set environment variable |
| `--volume` | `-v` | `-v /host:/app` | Mount a path |
| `--interactive` | `-i` | `-i` | Keep stdin open |
| `--tty` | `-t` | `-t` | Allocate a terminal |
| `--rm` | | `--rm` | Delete when stopped |
| `--restart` | | `--restart always` | Restart policy |
| `--network` | | `--network mynet` | Connect to network |

---

## Essential Commands Recap

```bash
docker ps           # list running containers
docker ps -a        # list all containers (including stopped)
docker images       # list local images
docker pull nginx   # download image without running
docker stop NAME    # graceful stop
docker start NAME   # start a stopped container
docker rm NAME      # remove stopped container
docker rm -f NAME   # force remove running container
docker logs NAME    # view stdout/stderr
docker logs -f NAME # stream logs
docker exec -it NAME bash  # open shell inside running container
docker stats        # live resource usage for all containers
```

---

## Exercises

### Exercise 1: Redis Cache
```bash
# 1. Run Redis on its default port (6379)
docker run -d --name my-redis -p 6379:6379 redis:alpine

# 2. Connect to the Redis CLI inside the container
docker exec -it my-redis redis-cli

# 3. Run some commands inside redis-cli:
SET greeting "Hello Docker"
GET greeting
INCR counter
INCR counter
GET counter
exit

# 4. Clean up
docker rm -f my-redis
```

### Exercise 2: Explore Alpine Linux
```bash
# Alpine is a 5MB minimal Linux distro used in many Docker images
docker run --rm -it alpine sh

# Inside:
cat /etc/alpine-release
apk add curl          # Alpine's package manager is apk
curl --version
uname -a
exit
```

---

**Next**: [Understanding Images](../02_images/01_understanding_images.md) — learn how images are structured
