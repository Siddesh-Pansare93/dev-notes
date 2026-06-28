# TCP/IP Model

## What You'll Learn

- The 4 layers of the TCP/IP model and their responsibilities
- How TCP/IP compares to the OSI model (side-by-side)
- The TCP/IP protocol suite and common protocols at each layer
- Data flow through the TCP/IP stack
- How to trace a real-world network request through all layers
- The TCP three-way handshake and connection lifecycle

## What is the TCP/IP Model?

The **TCP/IP (Transmission Control Protocol / Internet Protocol) Model** is the practical networking model used by the modern internet. Unlike the OSI model, which is a theoretical reference framework, TCP/IP was designed as a working implementation and evolved from the ARPANET project in the 1970s.

```
Key Difference:
- OSI Model  = Theoretical reference (7 layers)
- TCP/IP Model = Practical implementation (4 layers)
- TCP/IP is what the internet actually runs on
```

### Why TCP/IP Over OSI?

- **Practical**: Designed around real protocols, not abstract concepts
- **Proven**: Powers the entire internet since 1983
- **Simpler**: 4 layers instead of 7, easier to implement
- **Flexible**: Does not enforce strict layer boundaries

## The 4 Layers of TCP/IP

```
+-----------------------------------+
|  Layer 4: Application Layer       |  HTTP, FTP, DNS, SMTP, SSH
+-----------------------------------+
|  Layer 3: Transport Layer         |  TCP, UDP
+-----------------------------------+
|  Layer 2: Internet Layer          |  IP, ICMP, ARP, IGMP
+-----------------------------------+
|  Layer 1: Network Access Layer    |  Ethernet, Wi-Fi, PPP
+-----------------------------------+
         Physical Medium
    (cables, fiber, radio waves)
```

## Layer 1: Network Access Layer

Also called the **Link Layer** or **Network Interface Layer**, this combines OSI Layers 1 (Physical) and 2 (Data Link).

### Responsibilities

- Physical transmission of data over the network medium
- Framing data for the physical network
- MAC addressing and hardware-level communication
- Error detection at the frame level
- Media access control (managing who talks when)

### Common Protocols and Technologies

| Protocol/Technology | Purpose |
|---------------------|---------|
| Ethernet (802.3) | Wired LAN standard |
| Wi-Fi (802.11) | Wireless LAN standard |
| PPP | Point-to-point serial links |
| ARP | Maps IP addresses to MAC addresses |
| DSL | Digital Subscriber Line (broadband) |
| DOCSIS | Cable modem communication |

### How ARP Works

```
Scenario: Host A (192.168.1.10) wants to send data to Host B (192.168.1.20)

Step 1: Host A checks ARP cache for Host B's MAC address
Step 2: If not found, Host A broadcasts ARP Request:
        "Who has 192.168.1.20? Tell 192.168.1.10"

        [Host A] ---> ARP Request (Broadcast) ---> [All Hosts]

Step 3: Host B replies with ARP Response:
        "192.168.1.20 is at MAC AA:BB:CC:DD:EE:FF"

        [Host B] ---> ARP Reply (Unicast) ---> [Host A]

Step 4: Host A caches the mapping and sends data
```

### Viewing ARP Cache

```bash
# Windows
arp -a

# Linux / macOS
arp -n

# Example output:
# Address         HWtype  HWaddress           Flags Mask  Iface
# 192.168.1.1     ether   00:1a:2b:3c:4d:5e   C           eth0
# 192.168.1.20    ether   aa:bb:cc:dd:ee:ff   C           eth0
```

## Layer 2: Internet Layer

Corresponds to OSI Layer 3 (Network). Responsible for logical addressing, routing, and packet forwarding across network boundaries.

### Responsibilities

- Logical addressing (IP addresses)
- Routing packets between different networks
- Packet fragmentation and reassembly
- Delivering packets from source to destination across multiple hops

### Common Protocols

| Protocol | Full Name | Purpose |
|----------|-----------|---------|
| IPv4 | Internet Protocol v4 | 32-bit addressing, packet routing |
| IPv6 | Internet Protocol v6 | 128-bit addressing, larger address space |
| ICMP | Internet Control Message Protocol | Error messages, diagnostics (ping) |
| IGMP | Internet Group Management Protocol | Multicast group management |

### IPv4 vs IPv6

```
IPv4 Address: 192.168.1.100       (32-bit, ~4.3 billion addresses)
IPv6 Address: 2001:0db8:85a3:0000:0000:8a2e:0370:7334  (128-bit)

IPv4 Header:
+--------+------+----------+-------------+
|Version | IHL  |   ToS    | Total Length |
+--------+------+----------+-------------+
|    Identification    |Flags| Frag Offset|
+----------------------+-----+------------+
|   TTL  | Protocol    | Header Checksum |
+--------+-------------+-----------------+
|          Source IP Address              |
+----------------------------------------+
|        Destination IP Address          |
+----------------------------------------+
```

### Routing Example

```
Network A              Router             Network B
(192.168.1.0/24)     (Gateway)         (10.0.0.0/24)

[PC1: 192.168.1.10] --> [Router] --> [Server: 10.0.0.5]
                         |    |
                    eth0: 192.168.1.1
                    eth1: 10.0.0.1

Routing Table:
Destination      Gateway        Interface
192.168.1.0/24   0.0.0.0        eth0
10.0.0.0/24      0.0.0.0        eth1
0.0.0.0/0        ISP_Gateway    eth2    (default route)
```

## Layer 3: Transport Layer

Same as OSI Layer 4. Provides end-to-end communication between applications running on different hosts.

### Responsibilities

- End-to-end data delivery between processes
- Segmentation and reassembly
- Flow control and congestion control
- Error detection and recovery (TCP)
- Port-based multiplexing

### TCP vs UDP Comparison

| Feature | TCP | UDP |
|---------|-----|-----|
| Connection | Connection-oriented | Connectionless |
| Reliability | Guaranteed delivery | Best-effort delivery |
| Ordering | Maintains order | No ordering guarantee |
| Speed | Slower (overhead) | Faster (minimal overhead) |
| Header Size | 20-60 bytes | 8 bytes |
| Flow Control | Yes (sliding window) | No |
| Congestion Control | Yes | No |
| Use Cases | Web, email, file transfer | Streaming, gaming, DNS |

### TCP Three-Way Handshake

```
  Client                          Server
    |                                |
    |  ---- SYN (seq=100) ------>   |   Step 1: Client initiates
    |                                |
    |  <-- SYN-ACK (seq=300,    --- |   Step 2: Server acknowledges
    |       ack=101)                 |
    |                                |
    |  ---- ACK (seq=101,    -----> |   Step 3: Client confirms
    |       ack=301)                 |
    |                                |
    |   [Connection Established]     |
    |                                |
    |  ---- Data Transfer ----->    |
    |  <---- Data Transfer -----    |
    |                                |
    |  ---- FIN ----------------->  |   Connection teardown
    |  <--- ACK ------------------  |
    |  <--- FIN ------------------  |
    |  ---- ACK ----------------->  |
    |                                |
```

### Port Numbers

```python
# Python example: TCP server and client

# TCP Server
import socket

server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
server.bind(('0.0.0.0', 8080))
server.listen(5)
print("Server listening on port 8080...")

conn, addr = server.accept()
print(f"Connection from {addr}")
data = conn.recv(1024)
conn.send(b"Hello from server!")
conn.close()

# UDP Client
import socket

client = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
client.sendto(b"Hello UDP!", ('127.0.0.1', 9090))
data, addr = client.recvfrom(1024)
print(f"Received: {data.decode()} from {addr}")
client.close()
```

## Layer 4: Application Layer

Combines OSI Layers 5, 6, and 7 (Session, Presentation, Application). This is where user-facing protocols live.

### Responsibilities

- Providing network services to user applications
- Data representation and encoding
- Session management
- Application-specific protocols

### Common Protocols

| Protocol | Port | Purpose |
|----------|------|---------|
| HTTP | 80 | Web pages (unencrypted) |
| HTTPS | 443 | Web pages (encrypted with TLS) |
| FTP | 20/21 | File transfer |
| SSH | 22 | Secure remote access |
| SMTP | 25 | Sending email |
| POP3 | 110 | Retrieving email |
| IMAP | 143 | Retrieving email (synced) |
| DNS | 53 | Domain name resolution |
| DHCP | 67/68 | Automatic IP assignment |
| SNMP | 161/162 | Network management |
| Telnet | 23 | Remote access (insecure) |
| NTP | 123 | Time synchronization |

### DNS Resolution Example

```
User types: www.example.com

Step 1: Browser checks local cache
Step 2: OS checks hosts file (/etc/hosts)
Step 3: Query sent to configured DNS resolver

   [Browser] --> [Local DNS Resolver] --> [Root DNS Server]
                                              |
                                     "Try .com servers"
                                              |
                      [Local DNS Resolver] --> [.com TLD Server]
                                                   |
                                          "Try ns.example.com"
                                                   |
                      [Local DNS Resolver] --> [Authoritative DNS]
                                                   |
                                          "93.184.216.34"
                                                   |
                      [Local DNS Resolver] --> [Browser]

Step 4: Browser connects to 93.184.216.34
```

## TCP/IP vs OSI Model Comparison

```
OSI Model (7 Layers)          TCP/IP Model (4 Layers)
+---------------------+       +---------------------+
| 7. Application      |       |                     |
+---------------------+       |                     |
| 6. Presentation     |  <==> | 4. Application      |
+---------------------+       |                     |
| 5. Session          |       |                     |
+---------------------+       +---------------------+
| 4. Transport        |  <==> | 3. Transport        |
+---------------------+       +---------------------+
| 3. Network          |  <==> | 2. Internet         |
+---------------------+       +---------------------+
| 2. Data Link        |       |                     |
+---------------------+  <==> | 1. Network Access   |
| 1. Physical         |       |                     |
+---------------------+       +---------------------+
```

### Detailed Comparison Table

| Feature | OSI Model | TCP/IP Model |
|---------|-----------|-------------|
| Layers | 7 | 4 |
| Developed By | ISO (1984) | DARPA (1970s) |
| Approach | Theoretical / reference | Practical / implementation |
| Layer Boundaries | Strict separation | Flexible, blurred |
| Session/Presentation | Separate layers | Merged into Application |
| Protocol Dependence | Protocol-independent | Built around specific protocols |
| Usage | Teaching/reference | Running the internet |
| Development | Model first, then protocols | Protocols first, then model |
| Reliability | Transport layer handles | Transport layer handles |

## Data Flow Through TCP/IP Layers

### Sending a Web Request

```
Application Layer:
  HTTP GET /index.html HTTP/1.1
  Host: www.example.com
  +-----------------------------------------+
  |          HTTP Request Data               |
  +-----------------------------------------+

        | Passed down
        v

Transport Layer (TCP):
  +----------+-----------------------------------------+
  | TCP Hdr  |          HTTP Request Data               |
  | Src:49152|                                         |
  | Dst:80   |                                         |
  +----------+-----------------------------------------+
  [                TCP Segment                         ]

        | Passed down
        v

Internet Layer (IP):
  +--------+----------+-----------------------------------------+
  | IP Hdr | TCP Hdr  |          HTTP Request Data               |
  |Src:    |          |                                         |
  |192.168 |          |                                         |
  |.1.10   |          |                                         |
  |Dst:    |          |                                         |
  |93.184  |          |                                         |
  |.216.34 |          |                                         |
  +--------+----------+-----------------------------------------+
  [                     IP Packet                               ]

        | Passed down
        v

Network Access Layer:
  +-------+--------+----------+--------------------------+-----+
  |Eth Hdr| IP Hdr | TCP Hdr  |      HTTP Data           | FCS |
  |Dst MAC|        |          |                          |     |
  |Src MAC|        |          |                          |     |
  +-------+--------+----------+--------------------------+-----+
  [                     Ethernet Frame                         ]

        | Converted to electrical/optical signals
        v
  Physical Medium: 10110010 01101001 11001010 ...
```

## Real-World Example: Browsing a Website

Let's trace what happens when you type `https://www.github.com` in your browser:

```
1. APPLICATION LAYER (DNS + HTTPS)
   - Browser extracts hostname: www.github.com
   - DNS query resolves to IP: 140.82.121.3
   - Browser prepares HTTP GET request
   - TLS handshake encrypts the connection

2. TRANSPORT LAYER (TCP)
   - TCP three-way handshake with 140.82.121.3:443
   - HTTP request segmented into TCP segments
   - Source port: 52431 (random ephemeral)
   - Destination port: 443 (HTTPS)
   - Sequence numbers assigned for ordering

3. INTERNET LAYER (IP)
   - Source IP: 192.168.1.50 (your computer)
   - Destination IP: 140.82.121.3 (GitHub server)
   - TTL set to 64 (decremented at each hop)
   - Router determines next hop toward destination

4. NETWORK ACCESS LAYER (Ethernet/Wi-Fi)
   - Source MAC: Your NIC's MAC address
   - Destination MAC: Default gateway (router) MAC
   - Frame transmitted over Wi-Fi or Ethernet cable
   - At each router hop, MAC addresses change
     but IP addresses remain the same
```

### MAC vs IP Address Through the Journey

```
Your PC -----> Router -----> ISP -----> ... -----> GitHub Server

Hop 1: PC to Router
  Src MAC: PC's MAC         Src IP: 192.168.1.50
  Dst MAC: Router's MAC     Dst IP: 140.82.121.3

Hop 2: Router to ISP
  Src MAC: Router's MAC     Src IP: (NAT'd public IP)
  Dst MAC: ISP's MAC        Dst IP: 140.82.121.3

  Note: IP addresses stay the same end-to-end
        MAC addresses change at every hop
```

## TCP/IP Protocol Suite Overview

```
+----------------------------------------------------------------+
|                    APPLICATION LAYER                             |
|  HTTP  HTTPS  FTP  SMTP  POP3  IMAP  DNS  DHCP  SSH  SNMP     |
+----------------------------------------------------------------+
|                    TRANSPORT LAYER                               |
|              TCP                    UDP                          |
+----------------------------------------------------------------+
|                    INTERNET LAYER                                |
|         IP (v4/v6)      ICMP      ARP      IGMP                |
+----------------------------------------------------------------+
|                  NETWORK ACCESS LAYER                            |
|    Ethernet     Wi-Fi     PPP     Token Ring     DSL            |
+----------------------------------------------------------------+
```

## Common Network Diagnostic Commands

```bash
# Test connectivity (ICMP at Internet Layer)
ping 8.8.8.8
ping www.google.com

# Trace the route packets take (hop by hop)
traceroute www.google.com      # Linux/macOS
tracert www.google.com         # Windows

# View active TCP/UDP connections
netstat -an                    # All platforms
ss -tuln                       # Linux (modern)

# DNS lookup
nslookup www.google.com
dig www.google.com             # Linux/macOS

# View routing table
route print                    # Windows
ip route show                  # Linux
netstat -rn                    # macOS

# View network interfaces
ipconfig /all                  # Windows
ifconfig                       # macOS/older Linux
ip addr show                   # Linux (modern)
```

## Exercises

### Beginner
1. List the 4 TCP/IP layers from top to bottom with one protocol example for each
2. What are the two main Transport Layer protocols? Give two use cases for each
3. Using the comparison table, list 3 differences between the OSI model and TCP/IP model
4. Run `ping google.com` on your machine. Which TCP/IP layers are involved?

### Intermediate
5. Trace an HTTP request to `www.example.com` through all 4 TCP/IP layers, describing:
   - What data is added at each layer
   - What protocol is used at each layer
   - What addressing is used at each layer
6. Write a simple Python TCP client that connects to a server and sends a message (use the `socket` module)
7. Use `traceroute` (or `tracert` on Windows) to trace the path to three different websites. Compare the number of hops and explain what each hop represents
8. Explain why MAC addresses change at each hop but IP addresses remain the same

### Advanced
9. Capture network traffic using Wireshark and identify the TCP three-way handshake for an HTTP connection. Document the sequence numbers at each step
10. Explain how NAT (Network Address Translation) modifies packets at the Internet Layer and why it was created
11. Design a diagram showing the complete lifecycle of an HTTPS request, including DNS resolution, TCP handshake, TLS handshake, data transfer, and connection teardown
12. Compare how TCP handles packet loss vs how UDP handles it. Under what circumstances would UDP be preferred despite no reliability guarantee?

## Key Takeaways

- The TCP/IP model has 4 layers: Application, Transport, Internet, and Network Access
- TCP/IP is the practical model that powers the internet; OSI is the theoretical reference
- TCP provides reliable, ordered delivery; UDP provides fast, best-effort delivery
- The TCP three-way handshake (SYN, SYN-ACK, ACK) establishes connections
- IP addresses provide logical end-to-end addressing; MAC addresses provide physical hop-by-hop addressing
- DNS translates human-readable domain names to IP addresses
- Each layer adds its own header (encapsulation) when sending data

## Next Steps

Continue to [Network Topologies](./04_network_topologies.md) to learn about the physical and logical arrangements of network devices.

---

[← Previous: OSI Model](./02_osi_model.md) | [Next: Network Topologies →](./04_network_topologies.md)
