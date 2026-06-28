# Network Troubleshooting Tools

## What You'll Learn

- Use **ping** to test connectivity and measure latency
- Trace packet paths with **traceroute / tracert** and **mtr**
- Query DNS records with **nslookup** and **dig**
- Inspect open ports and connections with **netstat / ss**
- View and configure interfaces with **ifconfig / ip addr**
- Examine ARP tables and scan networks with **arp** and **nmap**
- Capture raw packets with **tcpdump**
- Apply a systematic, OSI-layer-based troubleshooting methodology

---

## 1. ping — ICMP Echo Requests

`ping` sends ICMP Echo Request packets and listens for Echo Replies. It is the first tool you reach for when testing basic connectivity.

```bash
# Basic ping (Linux sends indefinitely, Ctrl+C to stop)
ping 8.8.8.8

# Send exactly 5 packets
ping -c 5 8.8.8.8

# Set packet size to 1400 bytes (test MTU issues)
ping -s 1400 -c 3 8.8.8.8

# Set TTL (useful for scoping reach)
ping -t 10 -c 3 8.8.8.8

# Windows: sends 4 by default; continuous with -t
ping -n 5 8.8.8.8
ping -t 8.8.8.8
```

### Interpreting Results

```
PING 8.8.8.8 (8.8.8.8) 56(84) bytes of data.
64 bytes from 8.8.8.8: icmp_seq=1 ttl=118 time=12.3 ms
64 bytes from 8.8.8.8: icmp_seq=2 ttl=118 time=11.8 ms
64 bytes from 8.8.8.8: icmp_seq=3 ttl=118 time=14.1 ms

--- 8.8.8.8 ping statistics ---
3 packets transmitted, 3 received, 0% packet loss, time 2003ms
rtt min/avg/max/mdev = 11.8/12.7/14.1/0.98 ms
```

| Field | Meaning |
|-------|---------|
| `ttl=118` | Time-To-Live; hops remaining (started at 128 = Windows host) |
| `time=12.3 ms` | Round-trip time for this packet |
| `0% packet loss` | All packets received replies |
| `mdev` | Standard deviation — measures jitter |

> **Tip:** High `mdev` values indicate inconsistent latency (jitter), common on congested or wireless links.

---

## 2. traceroute / tracert — Hop-by-Hop Path Analysis

Traceroute reveals every router between you and the destination by sending packets with incrementing TTL values.

```bash
# Linux
traceroute 8.8.8.8

# Use ICMP instead of UDP (may bypass some firewalls)
traceroute -I 8.8.8.8

# Windows
tracert 8.8.8.8
```

### Reading the Output

```
traceroute to 8.8.8.8, 30 hops max, 60 byte packets
 1  gateway (192.168.1.1)     1.234 ms  1.112 ms  1.056 ms
 2  isp-router (10.0.0.1)    8.432 ms  8.221 ms  8.109 ms
 3  * * *
 4  72.14.236.204             12.44 ms  11.98 ms  12.11 ms
 5  dns.google (8.8.8.8)     12.33 ms  12.01 ms  12.22 ms
```

- Each line = one hop (router)
- Three time values = three probe packets
- `* * *` = that router didn't respond (firewall or ICMP rate-limiting)

---

## 3. nslookup and dig — DNS Troubleshooting

### nslookup (cross-platform)

```bash
# Basic A record lookup
nslookup example.com

# Query a specific DNS server
nslookup example.com 8.8.8.8

# Look up MX records
nslookup -type=MX example.com

# Reverse lookup
nslookup 93.184.216.34
```

### dig (Linux/macOS — more detailed)

```bash
# Standard query
dig example.com

# Query specific record type
dig example.com MX
dig example.com AAAA
dig example.com NS

# Short answer only
dig +short example.com

# Trace the full delegation path
dig +trace example.com

# Query a specific server
dig @8.8.8.8 example.com
```

### dig Output Explained

```
;; ANSWER SECTION:
example.com.    3600    IN    A    93.184.216.34

;; Query time: 23 msec
;; SERVER: 192.168.1.1#53(192.168.1.1)
;; MSG SIZE  rcvd: 56
```

| Field | Meaning |
|-------|---------|
| `3600` | TTL in seconds (cache duration) |
| `IN` | Internet class |
| `A` | Record type (IPv4 address) |
| `SERVER` | DNS server that answered |
| `Query time` | How long the lookup took |

---

## 4. netstat / ss — Socket and Connection Statistics

### netstat (legacy but widely available)

```bash
# Show all listening TCP ports
netstat -tlnp

# Show all connections with PID
netstat -anp

# Show routing table
netstat -rn

# Windows: show all connections with PID
netstat -ano
```

### ss (modern replacement on Linux)

```bash
# List all TCP connections
ss -t

# Show listening sockets with process info
ss -tlnp

# Show socket statistics summary
ss -s

# Filter by port
ss -t dst :443
ss -t sport = :80
```

### TCP Connection States

```
ESTABLISHED ──── Active data transfer
SYN_SENT    ──── Client sent SYN, waiting for SYN-ACK
SYN_RECV    ──── Server received SYN, sent SYN-ACK
FIN_WAIT_1  ──── Sent FIN, waiting for ACK
FIN_WAIT_2  ──── Received ACK for FIN, waiting for peer FIN
TIME_WAIT   ──── Waiting to ensure peer received final ACK
CLOSE_WAIT  ──── Peer sent FIN, application hasn't closed yet
LISTEN      ──── Socket waiting for incoming connections
```

> **Warning:** Many `CLOSE_WAIT` sockets indicate an application bug (not closing connections). Many `TIME_WAIT` sockets are normal on busy servers.

---

## 5. ifconfig / ip addr — Interface Configuration

### ip (modern Linux — preferred)

```bash
# Show all interfaces
ip addr show

# Show specific interface
ip addr show eth0

# Show routing table
ip route show

# Show link-layer info (MAC, state)
ip link show

# Add an IP address (temporary)
sudo ip addr add 192.168.1.100/24 dev eth0

# Bring interface up/down
sudo ip link set eth0 up
sudo ip link set eth0 down
```

### ifconfig (legacy)

```bash
# Show all interfaces
ifconfig

# Show specific interface
ifconfig eth0
```

---

## 6. arp — ARP Table

```bash
# View ARP cache (IP-to-MAC mappings)
arp -a

# Linux: ip neighbor
ip neigh show

# Delete an entry
sudo arp -d 192.168.1.50

# Windows
arp -a
```

ARP issues cause problems when two devices claim the same IP (ARP spoofing) or when a device's MAC changes but the cache is stale.

---

## 7. nmap — Network Scanning

```bash
# Ping sweep — discover live hosts
nmap -sn 192.168.1.0/24

# TCP SYN scan (common ports)
nmap 192.168.1.1

# Scan specific ports
nmap -p 22,80,443 192.168.1.1

# Scan all 65535 ports
nmap -p- 192.168.1.1

# OS and service detection
nmap -A 192.168.1.1

# UDP scan (slower)
nmap -sU -p 53,67,68,161 192.168.1.1
```

> **Important:** Only scan networks you own or have explicit permission to scan. Unauthorized scanning may violate laws and policies.

---

## 8. mtr — Combining ping and traceroute

`mtr` continuously probes each hop, giving real-time loss and latency statistics.

```bash
# Interactive mode
mtr 8.8.8.8

# Report mode (10 cycles, then print summary)
mtr -r -c 10 8.8.8.8

# Use TCP instead of ICMP
mtr --tcp -P 443 8.8.8.8
```

```
Host                 Loss%   Snt   Last   Avg  Best  Wrst StDev
1. gateway            0.0%    10    1.2   1.3   0.9   2.1   0.4
2. isp-router         0.0%    10    8.5   9.1   7.8  12.3   1.4
3. core-rtr           0.0%    10   11.2  11.8  10.5  14.2   1.1
4. dns.google         0.0%    10   12.1  12.4  11.6  13.9   0.7
```

**Key insight:** If loss appears at one hop but **not** at later hops, the intermediate router is simply deprioritizing ICMP — it is not actually dropping your traffic.

---

## 9. tcpdump — Command-Line Packet Capture

```bash
# Capture on interface eth0
sudo tcpdump -i eth0

# Capture only TCP port 80
sudo tcpdump -i eth0 tcp port 80

# Capture DNS traffic
sudo tcpdump -i eth0 udp port 53

# Save to file for Wireshark analysis
sudo tcpdump -i eth0 -w capture.pcap

# Read a capture file
tcpdump -r capture.pcap

# Show packet contents in ASCII
sudo tcpdump -i eth0 -A tcp port 80

# Limit to 100 packets
sudo tcpdump -i eth0 -c 100
```

### Useful tcpdump Filters

| Filter | Captures |
|--------|----------|
| `host 10.0.0.5` | Traffic to/from 10.0.0.5 |
| `src host 10.0.0.5` | Traffic from 10.0.0.5 only |
| `net 192.168.1.0/24` | Traffic on entire subnet |
| `port 443` | HTTPS traffic |
| `icmp` | Ping and ICMP messages |
| `tcp[tcpflags] & tcp-syn != 0` | TCP SYN packets only |

---

## 10. Troubleshooting Methodology — OSI Layer Approach

Work from the bottom of the stack upward:

```
+-----------------------------------------------+
| Step 5: Application Layer                     |
|   curl, wget, browser, app logs               |
+-----------------------------------------------+
| Step 4: Transport Layer                       |
|   ss -tlnp, telnet host 80, nc -zv host 443   |
+-----------------------------------------------+
| Step 3: Network Layer                         |
|   ping gateway, ping remote, traceroute,       |
|   ip route show                                |
+-----------------------------------------------+
| Step 2: Data Link Layer                       |
|   ip link show, arp -a, ethtool eth0           |
+-----------------------------------------------+
| Step 1: Physical Layer                        |
|   Cable connected? Link light on? Wi-Fi SSID?  |
+-----------------------------------------------+
```

### Scenario: "I Can't Reach a Website"

```
1. Physical:  Is the cable plugged in? Is Wi-Fi connected?
              $ ip link show          (look for state UP)

2. Data Link: Do we have a MAC for the gateway?
              $ arp -a                (check gateway entry)

3. Network:   Can we reach the gateway? The internet?
              $ ping 192.168.1.1     (gateway)
              $ ping 8.8.8.8         (internet by IP)

4. DNS:       Can we resolve names?
              $ dig example.com      (if this fails, DNS issue)
              $ ping example.com     (compare with step 3)

5. Transport: Is the port open and reachable?
              $ ss -tlnp             (is the service listening?)
              $ nc -zv example.com 443

6. Application: Does the request work?
              $ curl -v https://example.com
```

### Scenario: "Server Is Slow"

```
1. Check network latency    $ mtr target-server
2. Check for packet loss     $ ping -c 100 target-server
3. Check connection states   $ ss -s  (look for many TIME_WAIT)
4. Check DNS resolution time $ dig example.com (query time)
5. Check bandwidth           $ iperf3 -c target-server
6. Check application logs    (app-specific)
```

---

## Tool Comparison Table

| Tool | Purpose | Protocol | OS |
|------|---------|----------|-----|
| ping | Connectivity + latency | ICMP | All |
| traceroute/tracert | Path discovery | ICMP/UDP | All |
| mtr | Continuous path analysis | ICMP/TCP | Linux/macOS |
| dig | DNS queries (detailed) | DNS/UDP | Linux/macOS |
| nslookup | DNS queries (simple) | DNS/UDP | All |
| netstat | Connections + ports | TCP/UDP | All |
| ss | Connections + ports (faster) | TCP/UDP | Linux |
| ip addr | Interface config | — | Linux |
| arp | ARP cache | ARP | All |
| nmap | Port/host scanning | TCP/UDP/ICMP | All |
| tcpdump | Packet capture (CLI) | All | Linux/macOS |

---

## Exercises

### Beginner

1. Ping `8.8.8.8` and `8.8.4.4`. Compare average RTT and jitter. Which is closer to you?
2. Use `nslookup` to find the MX records for `gmail.com`. What mail servers does Google use?
3. Run `ip addr show` (Linux) or `ipconfig /all` (Windows). Identify your IP, subnet mask, gateway, and DNS server.

### Intermediate

4. Run `traceroute` (or `tracert`) to three different destinations on three different continents. Compare hop counts and latency patterns.
5. Use `ss -tlnp` to list all listening services on your machine. Identify each service by port number.
6. Run `nmap -sn 192.168.1.0/24` on your local network. How many hosts are alive? Can you identify each device?

### Advanced

7. Use `tcpdump` to capture a DNS lookup: `sudo tcpdump -i eth0 udp port 53 -c 5` while running `dig example.com` in another terminal. Examine the query and response.
8. A user reports they can ping `8.8.8.8` but cannot open `https://example.com`. Walk through the OSI-layer methodology to identify the most likely failure point.
9. Use `mtr --tcp -P 443 example.com` and compare the results with a standard ICMP `mtr example.com`. Why might results differ?

---

## Key Takeaways

- **Start simple**: `ping` confirms basic connectivity before you reach for complex tools
- **Layer-based troubleshooting** prevents random guessing — work bottom-up through the OSI stack
- **tcpdump** and **Wireshark** give you ground truth — when in doubt, capture packets
- **mtr** is superior to standalone ping or traceroute because it combines both continuously
- **ss** has replaced **netstat** on modern Linux — learn its filter syntax
- Always get **permission** before scanning networks with nmap

---

## Navigation

| Previous | Home | Next |
|:---------|:----:|-----:|
| [Section Overview](./README.md) | [Practical Networking](./README.md) | [Wireshark & Packet Analysis](./02_wireshark_packet_analysis.md) |
