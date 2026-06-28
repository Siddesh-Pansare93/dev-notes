# Load Balancing and High Availability

## What You'll Learn

- What load balancing is and why modern systems require it
- Compare load balancing algorithms: round robin, least connections, weighted, IP hash
- Distinguish **Layer 4** (transport) from **Layer 7** (application) load balancing
- Compare hardware and software load balancer options
- Configure basic load balancing with **Nginx** and **HAProxy**
- Implement **health checks** and automatic failover
- Handle **session persistence** (sticky sessions) and understand the tradeoffs
- Design **high availability** architectures with active-passive and active-active patterns
- Differentiate a **reverse proxy** from a **load balancer**

---

## 1. What Is Load Balancing?

A load balancer distributes incoming traffic across multiple backend servers so that no single server is overwhelmed.

```
Without Load Balancing:              With Load Balancing:

  Clients                              Clients
  ||||||                               ||||||
    |                                    |
    v                                    v
+--------+                        +-----------+
| Single |                        |   Load    |
| Server |                        | Balancer  |
| (all   |                        +-----------+
| traffic|                         /    |    \
+--------+                        v    v    v
                              +----+ +----+ +----+
  Single point of failure     | S1 | | S2 | | S3 |
  Capacity ceiling            +----+ +----+ +----+
                              
                              No SPOF, scales horizontally
```

### Why Load Balance?

| Benefit | Description |
|---------|-------------|
| **Scalability** | Add more servers to handle more traffic |
| **Availability** | If one server fails, others continue serving |
| **Performance** | Distribute load evenly, reducing response times |
| **Maintenance** | Take servers offline for updates without downtime |
| **Flexibility** | Route traffic based on content, geography, or capacity |

---

## 2. Load Balancing Algorithms

### Round Robin

Requests are distributed sequentially across servers in order.

```
Request 1 --> Server A
Request 2 --> Server B
Request 3 --> Server C
Request 4 --> Server A  (cycle repeats)
Request 5 --> Server B
```

- **Pros:** Simple, even distribution when servers are identical
- **Cons:** Ignores server load; a slow server gets the same traffic as a fast one

### Weighted Round Robin

Like round robin, but servers with higher weight receive proportionally more requests.

```
Server A (weight=5):  ■■■■■
Server B (weight=3):  ■■■
Server C (weight=2):  ■■

Out of every 10 requests: A gets 5, B gets 3, C gets 2
```

### Least Connections

New requests go to the server with the fewest active connections.

```
Server A: 12 active connections
Server B:  3 active connections  <-- next request goes here
Server C:  8 active connections
```

- **Pros:** Adapts to varying request durations; ideal for long-lived connections
- **Cons:** Slightly more overhead to track connection counts

### IP Hash

The client's IP address is hashed to determine which server receives the request. The same client always reaches the same server.

```
hash(client_ip) % num_servers = server_index

hash(10.0.0.1) % 3 = 0 --> Server A (always)
hash(10.0.0.2) % 3 = 2 --> Server C (always)
hash(10.0.0.3) % 3 = 1 --> Server B (always)
```

- **Pros:** Provides session persistence without cookies
- **Cons:** Uneven distribution if client IPs are not diverse; breaks when servers are added/removed

### Algorithm Comparison

| Algorithm | Even Distribution | Session Affinity | Server-Aware | Best For |
|-----------|:-:|:-:|:-:|-----------|
| Round Robin | Yes | No | No | Stateless services, equal servers |
| Weighted RR | Configurable | No | Partially | Mixed-capacity servers |
| Least Connections | Adaptive | No | Yes | Varying request durations |
| IP Hash | Depends | Yes | No | Stateful apps without shared sessions |
| Least Response Time | Adaptive | No | Yes | Latency-sensitive applications |
| Random | Statistical | No | No | Large server pools |

---

## 3. Layer 4 vs Layer 7 Load Balancing

```
OSI Model Context:

Layer 7 (Application)  -- HTTP, HTTPS, WebSocket
Layer 6 (Presentation)
Layer 5 (Session)
Layer 4 (Transport)    -- TCP, UDP
Layer 3 (Network)      -- IP
Layer 2 (Data Link)
Layer 1 (Physical)
```

### Layer 4 (Transport Layer)

Operates on TCP/UDP connections. Makes routing decisions based on IP addresses and port numbers without inspecting the content.

```
Layer 4 Load Balancer:

Client --[TCP SYN]--> LB --[TCP SYN]--> Server B
                       |
         Sees: src IP, dst IP, src port, dst port
         Does NOT see: HTTP headers, URL, cookies
```

### Layer 7 (Application Layer)

Inspects the full HTTP request (URL, headers, cookies, body) and makes intelligent routing decisions.

```
Layer 7 Load Balancer:

Client --[HTTP GET /api/users]--> LB
                                   |
              Sees everything: URL path, Host header,
              cookies, content type, etc.
                                   |
              /api/*    --> API server pool
              /static/* --> CDN / static server
              /ws/*     --> WebSocket server pool
```

### Comparison

| Feature | Layer 4 | Layer 7 |
|---------|---------|---------|
| Routing basis | IP + port | URL, headers, cookies, content |
| Performance | Faster (less processing) | Slower (deep inspection) |
| TLS termination | Pass-through or terminate | Typically terminates TLS |
| Content routing | No | Yes (path-based, host-based) |
| WebSocket support | Pass-through | Full support with inspection |
| Caching | No | Can cache responses |
| Use case | TCP services, databases, simple web | Microservices, API gateways |
| Example tools | AWS NLB, HAProxy (TCP mode) | AWS ALB, Nginx, HAProxy (HTTP mode) |

---

## 4. Hardware vs Software Load Balancers

| Aspect | Hardware | Software |
|--------|----------|----------|
| Examples | F5 BIG-IP, Citrix ADC, A10 | Nginx, HAProxy, Envoy, Traefik |
| Cost | $10K - $100K+ | Free (open source) to moderate |
| Performance | Very high (dedicated ASICs) | High (depends on server specs) |
| Flexibility | Vendor-dependent updates | Fully customizable |
| Scaling | Buy bigger hardware | Add more instances |
| Cloud-native | Not applicable | Native fit (containers, K8s) |
| Management | Proprietary GUI/CLI | Config files, APIs |

Modern architectures overwhelmingly favor **software load balancers** due to cost, flexibility, and cloud integration.

---

## 5. Popular Load Balancing Tools

### Nginx Configuration

```nginx
# /etc/nginx/conf.d/loadbalancer.conf

upstream backend_servers {
    # Algorithm: default is round robin
    # least_conn;           # Use least connections instead
    # ip_hash;              # Use IP hash instead

    server 10.0.0.11:8080 weight=3;   # Higher weight = more traffic
    server 10.0.0.12:8080 weight=2;
    server 10.0.0.13:8080 weight=1;
    server 10.0.0.14:8080 backup;      # Only used if all others are down
}

server {
    listen 80;
    server_name example.com;

    location / {
        proxy_pass http://backend_servers;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 5s;
        proxy_read_timeout 60s;
    }

    # Path-based routing (Layer 7)
    location /api/ {
        proxy_pass http://api_servers;
    }

    location /static/ {
        proxy_pass http://static_servers;
    }
}
```

### HAProxy Configuration

```
# /etc/haproxy/haproxy.cfg

global
    log /dev/log local0
    maxconn 4096
    user haproxy
    group haproxy
    daemon

defaults
    log     global
    mode    http
    option  httplog
    option  dontlognull
    timeout connect 5s
    timeout client  30s
    timeout server  30s
    retries 3

frontend http_front
    bind *:80
    default_backend web_servers

    # ACL-based routing (Layer 7)
    acl is_api path_beg /api
    use_backend api_servers if is_api

backend web_servers
    balance roundrobin
    option httpchk GET /health
    http-check expect status 200

    server web1 10.0.0.11:8080 check weight 3
    server web2 10.0.0.12:8080 check weight 2
    server web3 10.0.0.13:8080 check weight 1
    server web4 10.0.0.14:8080 check backup

backend api_servers
    balance leastconn
    option httpchk GET /api/health

    server api1 10.0.0.21:3000 check
    server api2 10.0.0.22:3000 check

listen stats
    bind *:8404
    stats enable
    stats uri /stats
    stats refresh 10s
```

### Cloud Load Balancers

| AWS | GCP | Azure | Type |
|-----|-----|-------|------|
| ALB (Application LB) | HTTP(S) LB | Application Gateway | Layer 7 |
| NLB (Network LB) | TCP/UDP LB | Azure Load Balancer | Layer 4 |
| CLB (Classic LB) | — | — | Legacy L4/L7 |
| Global Accelerator | Cloud CDN | Front Door | Global |

---

## 6. Health Checks and Failover

Health checks continuously verify that backend servers are functioning. Failed servers are automatically removed from the pool.

```
Health Check Flow:

Load Balancer                    Backend Servers
     |                          +--------+
     |--- GET /health --------->| S1: OK |  (in pool)
     |<-- 200 OK ---------------|        |
     |                          +--------+
     |                          +--------+
     |--- GET /health --------->| S2: OK |  (in pool)
     |<-- 200 OK ---------------|        |
     |                          +--------+
     |                          +--------+
     |--- GET /health --------->| S3     |  (REMOVED from pool)
     |<-- timeout / 500 --------|  DOWN  |
     |                          +--------+
     |
     | After 3 consecutive failures: remove S3
     | After 2 consecutive successes: re-add S3
```

### Health Check Types

| Type | Checks | Use Case |
|------|--------|----------|
| TCP | Port is open and accepting connections | Basic services, databases |
| HTTP | Returns expected status code (200) | Web applications |
| HTTPS | TLS + HTTP check | Secure endpoints |
| Script | Custom check logic (DB query, disk space) | Complex dependencies |
| gRPC | gRPC health checking protocol | Microservices |

---

## 7. Session Persistence (Sticky Sessions)

Some applications store user state on the server (sessions, shopping carts). Without persistence, consecutive requests from the same user may hit different servers, causing state loss.

```
Without Sticky Sessions:

Request 1 (login)    --> Server A  (session created here)
Request 2 (profile)  --> Server B  (no session! redirected to login)

With Sticky Sessions:

Request 1 (login)    --> Server A  (session created)
Request 2 (profile)  --> Server A  (same server, session found)
Request 3 (checkout) --> Server A  (still sticky)
```

### Methods

| Method | Mechanism | Pros | Cons |
|--------|-----------|------|------|
| Cookie-based | LB inserts a cookie identifying the backend | Reliable, works through NAT | Requires cookie support |
| Source IP | Hash client IP to server | Simple, no cookie needed | Breaks behind shared NAT |
| URL parameter | Session ID in URL | Works without cookies | Ugly URLs, security risk |

### HAProxy Sticky Session Example

```
backend web_servers
    balance roundrobin
    cookie SERVERID insert indirect nocache
    server web1 10.0.0.11:8080 check cookie s1
    server web2 10.0.0.12:8080 check cookie s2
```

> **Better alternative:** Store sessions externally (Redis, database) and keep servers stateless. This eliminates the need for sticky sessions entirely.

---

## 8. High Availability Patterns

### Active-Passive

One load balancer is active; a standby takes over if the primary fails.

```
                    +----------+
Clients ---------->| Active   |-------> Backend Servers
                   | LB (VIP) |
                   +----------+
                        |
                   Heartbeat (VRRP/keepalived)
                        |
                   +----------+
                   | Passive  |  (idle, monitoring)
                   | LB       |
                   +----------+

If Active fails: Passive takes over the VIP (Virtual IP)
Failover time: 1-5 seconds
```

### Active-Active

Both load balancers handle traffic simultaneously. DNS or an upstream device distributes between them.

```
                   +----------+
               +-->| LB 1     |---+
Clients ---+   |   +----------+   |   +----------+
           |   |                   +-->| Backend  |
     DNS   +---+                   +-->| Servers  |
    Round  |   |   +----------+   |   +----------+
    Robin  +-->+-->| LB 2     |---+
               |   +----------+
               |
```

### Comparison

| Feature | Active-Passive | Active-Active |
|---------|---------------|---------------|
| Resource usage | 50% (standby idle) | 100% (both working) |
| Failover time | 1-5 seconds | Near-instant (DNS TTL) |
| Complexity | Lower | Higher (state sync needed) |
| Cost efficiency | Lower | Higher |
| Split-brain risk | Possible | Managed via consensus |

### Keepalived Example (VRRP)

```
# /etc/keepalived/keepalived.conf (Primary)
vrrp_instance VI_1 {
    state MASTER
    interface eth0
    virtual_router_id 51
    priority 100
    advert_int 1

    authentication {
        auth_type PASS
        auth_pass secret123
    }

    virtual_ipaddress {
        192.168.1.200/24
    }
}
```

```
# /etc/keepalived/keepalived.conf (Backup)
vrrp_instance VI_1 {
    state BACKUP
    interface eth0
    virtual_router_id 51
    priority 90
    advert_int 1

    authentication {
        auth_type PASS
        auth_pass secret123
    }

    virtual_ipaddress {
        192.168.1.200/24
    }
}
```

---

## 9. Reverse Proxy vs Load Balancer

These terms are often confused because the same tools (Nginx, HAProxy) serve both roles.

```
Reverse Proxy (1 backend):        Load Balancer (N backends):

Client --> Reverse Proxy --> S1    Client --> LB --> S1
                                                --> S2
                                                --> S3
```

| Feature | Reverse Proxy | Load Balancer |
|---------|--------------|---------------|
| Primary purpose | Shield backend, add features | Distribute traffic |
| # of backends | Typically one (or few) | Many |
| TLS termination | Yes | Yes |
| Caching | Yes | Sometimes |
| Compression | Yes | Sometimes |
| Request routing | Yes | Yes |
| Health checks | Optional | Essential |

In practice, a single Nginx or HAProxy instance often serves as **both** a reverse proxy and a load balancer.

---

## Exercises

### Beginner

1. Explain in your own words why a single-server architecture is risky. List three problems that load balancing solves.
2. Given servers A (4 CPU), B (2 CPU), and C (2 CPU), what weights would you assign for weighted round robin? Out of 100 requests, how many does each server receive?
3. Compare Layer 4 and Layer 7 load balancing. For each of the following, which layer would you use and why: (a) a database cluster, (b) a microservices API with path-based routing, (c) a real-time gaming server.

### Intermediate

4. Install Nginx on a Linux machine. Create two simple backend servers (e.g., `python3 -m http.server 8081` and `python3 -m http.server 8082`). Configure Nginx to load balance between them using round robin. Verify by making repeated requests with `curl` and checking which backend responds.
5. Modify your Nginx configuration to use `least_conn`. Start a long-running request (e.g., `sleep` endpoint) on one backend. Observe how new requests avoid the busy server.
6. Add a health check to your HAProxy or Nginx configuration. Stop one backend server and verify that traffic automatically shifts to the remaining healthy server.

### Advanced

7. Set up HAProxy with sticky sessions using cookie-based persistence. Verify that the same client consistently reaches the same backend by inspecting the `SERVERID` cookie in the response.
8. Configure a Keepalived active-passive pair using two VMs. Assign a virtual IP (VIP) and verify failover by stopping the primary and confirming the secondary acquires the VIP within seconds.
9. Design a high-availability architecture for a web application handling 10,000 requests/second. Specify: number of load balancers, algorithm choice, health check strategy, session handling approach, and failover mechanism. Justify each decision.

---

## Key Takeaways

- **Round robin** is the simplest algorithm but ignores server capacity; **least connections** adapts to real-time load
- **Layer 4** load balancing is faster but blind to content; **Layer 7** enables intelligent routing (path, host, headers)
- **Health checks** are non-negotiable — without them, you send traffic to dead servers
- Avoid **sticky sessions** when possible; prefer **external session stores** (Redis) for truly stateless backends
- **Active-passive** HA is simpler but wastes standby capacity; **active-active** maximizes resources but adds complexity
- Nginx and HAProxy are the dominant open-source load balancers — learn at least one thoroughly

---

## Navigation

| Previous | Home | Next |
|:---------|:----:|-----:|
| [Home Network Setup](./04_home_network_setup.md) | [Practical Networking](./README.md) | [SDN & Network Virtualization](./06_sdn_virtualization.md) |
