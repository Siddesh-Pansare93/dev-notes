# UDP and Use Cases

UDP (User Datagram Protocol) is the lightweight alternative to TCP. It strips away connection management, reliability, and ordering to provide the fastest possible delivery. Understanding when and why to use UDP is a core networking skill.

---

## What You'll Learn

- UDP datagram structure and header fields
- Why UDP is faster than TCP
- Real-world use cases for UDP (DNS, DHCP, streaming, gaming, VoIP)
- UDP-based protocols: QUIC, RTP, TFTP
- Security considerations including UDP flooding
- How to build a simple UDP client and server in Python

---

## UDP Datagram Structure

The UDP header is just **8 bytes** -- one of the simplest headers in the entire protocol stack.

```
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|          Source Port          |       Destination Port        |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|            Length             |           Checksum            |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                          Data (Payload)                       |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

### Header Fields

| Field | Size | Description |
|-------|------|-------------|
| Source Port | 16 bits | Port of the sending process (optional, can be 0) |
| Destination Port | 16 bits | Port of the receiving process |
| Length | 16 bits | Total length of header + data in bytes (min = 8) |
| Checksum | 16 bits | Error detection (optional in IPv4, mandatory in IPv6) |

### Compared to TCP

```
TCP Header: 20-60 bytes            UDP Header: 8 bytes
+---------------------------+      +-----------------------+
| Source Port (16)          |      | Source Port (16)      |
| Dest Port (16)            |      | Dest Port (16)        |
| Sequence Number (32)      |      | Length (16)            |
| Ack Number (32)           |      | Checksum (16)         |
| Offset/Flags/Window (32)  |      +-----------------------+
| Checksum/Urgent (32)      |      That's it. 8 bytes.
| Options (0-40 bytes)      |
+---------------------------+
```

---

## Why UDP Is Faster

UDP achieves lower latency and higher throughput in several ways:

### 1. No Connection Setup

TCP requires a three-way handshake before any data is sent. This adds at least **1 RTT** of latency. UDP sends data immediately.

```
TCP (3-way handshake + request):       UDP (immediate):

Client       Server                    Client       Server
  |-- SYN ----->|  }                     |            |
  |<- SYN-ACK --|  } 1 RTT              |-- Data --->|  Immediate!
  |-- ACK ----->|  }                     |            |
  |-- Data ---->|  } 1 RTT              Total: 0 RTT before data
  |<- Response -|  }
                                        
Total: 2 RTT before response
```

### 2. No Ordering Overhead

TCP must reorder out-of-sequence segments and hold them in a buffer. UDP delivers each datagram independently. If datagram 3 arrives before datagram 2, the application receives datagram 3 immediately.

### 3. No Congestion Control

TCP throttles sending rate when it detects congestion. UDP sends at whatever rate the application dictates. This is beneficial for real-time applications but can be harmful to the network if used irresponsibly.

### 4. No Connection State

TCP maintains per-connection state (buffers, timers, sequence numbers). UDP is stateless -- a server can handle more concurrent "connections" because each datagram is independent.

### 5. Smaller Header

8 bytes vs 20+ bytes per segment means less overhead, especially for small messages.

---

## UDP Use Cases

### DNS (Domain Name System)

DNS queries are typically small (< 512 bytes) and independent. UDP is the default transport:

```
Client                              DNS Server
  |                                     |
  |-- UDP Query: "example.com A?" ----->|
  |<-- UDP Response: "93.184.216.34" ---|
  |                                     |
  Single request-response. No connection needed.
  If lost, client simply retries after timeout.
```

> DNS falls back to TCP for responses larger than 512 bytes (or when EDNS0 is not available) and for zone transfers.

### DHCP (Dynamic Host Configuration Protocol)

DHCP uses UDP because the client doesn't have an IP address yet -- it cannot establish a TCP connection.

```
Client (no IP)     DHCP Server
  |                     |
  |-- DISCOVER (broadcast, UDP 67) -->|
  |<-- OFFER (UDP 68) ---------------|
  |-- REQUEST (UDP 67) ------------->|
  |<-- ACK (UDP 68) -----------------|
```

### Video/Audio Streaming

For live streaming, a dropped frame is better than a delayed frame. Buffering caused by TCP retransmissions creates stuttering that degrades user experience more than occasional lost data.

```
Live Video Stream (30 fps = 33ms per frame):

  Frame 1 --> arrives on time   --> displayed
  Frame 2 --> lost              --> skipped (barely noticeable)
  Frame 3 --> arrives on time   --> displayed
  Frame 4 --> arrives on time   --> displayed

With TCP: Frame 2 retransmission delays Frames 3, 4, 5...
  --> visible stutter / buffering
```

### Online Gaming

Game state updates are sent 20-60 times per second. Old state is worthless; only the latest matters.

```
Game Server sends player positions:

  t=0ms:   Player at (100, 200) --> arrived
  t=16ms:  Player at (105, 202) --> lost
  t=33ms:  Player at (110, 204) --> arrived

The lost update at t=16ms doesn't matter.
The player jumps from (100,200) to (110,204) -- a tiny skip.
Retransmitting the t=16ms state would be pointless by the time it arrives.
```

### VoIP (Voice over IP)

Voice calls prioritize low latency. Human speech is tolerant of small amounts of data loss (< 5%) but very sensitive to delay (> 150ms becomes noticeable).

---

## UDP vs TCP Comparison

| Feature | TCP | UDP |
|---------|-----|-----|
| Header size | 20-60 bytes | 8 bytes |
| Connection setup | 3-way handshake (1 RTT) | None |
| Reliability | Guaranteed delivery | Best-effort |
| Ordering | In-order delivery | No ordering |
| Flow control | Sliding window | None |
| Congestion control | Yes (slow start, AIMD) | None |
| Message boundaries | No (byte stream) | Yes (datagram) |
| Broadcast/Multicast | No | Yes |
| State per connection | Yes (buffers, timers) | None |
| Overhead | Higher | Lower |
| Latency | Higher | Lower |
| Use case | Reliability needed | Speed needed |

---

## UDP-Based Protocols

Several modern protocols are built on top of UDP, adding selected features while avoiding TCP's full overhead.

### QUIC (Quick UDP Internet Connections)

QUIC is developed by Google and standardized in RFC 9000. It provides:
- Reliable, encrypted transport built on UDP
- 0-RTT connection establishment (vs TCP+TLS = 2-3 RTT)
- Multiplexed streams without head-of-line blocking
- Connection migration (survives IP address changes)
- Used by HTTP/3

```
TCP + TLS Connection:             QUIC Connection:

Client        Server              Client        Server
  |-- SYN ------->|                 |               |
  |<- SYN-ACK ----|  } TCP         |-- Initial --->|  } Combined crypto
  |-- ACK ------->|  } handshake   |<- Handshake --|  } + connection setup
  |-- ClientHello>|               |-- Data ------->|  } = 1 RTT total
  |<- ServerHello-|  } TLS         |               |
  |-- Finished -->|  } handshake   |  (0-RTT possible for
  |-- Data ------>|               |   resumed connections)
  |               |               |
  Total: 3 RTT                    Total: 1 RTT (or 0-RTT)
```

### RTP (Real-time Transport Protocol)

RTP carries real-time audio and video data. It adds:
- Sequence numbers (for reordering detection, not retransmission)
- Timestamps (for playback synchronization)
- Payload type identification
- Used alongside RTCP (control protocol) for quality feedback

### TFTP (Trivial File Transfer Protocol)

A simple file transfer protocol using UDP port 69. Used for booting diskless workstations and firmware updates. Implements its own simple reliability (stop-and-wait ACKs).

### Other UDP-Based Protocols

| Protocol | Port | Purpose |
|----------|------|---------|
| DNS | 53 | Name resolution |
| DHCP | 67/68 | IP address assignment |
| SNMP | 161/162 | Network management |
| NTP | 123 | Time synchronization |
| TFTP | 69 | Simple file transfer |
| Syslog | 514 | Log message forwarding |
| RIP | 520 | Routing protocol |
| mDNS | 5353 | Multicast DNS (local discovery) |

---

## UDP Flooding and Security Considerations

### UDP Flood Attack

Since UDP is connectionless and stateless, it is easy to spoof source addresses and flood a target with UDP datagrams:

```
Attacker sends massive volume of UDP packets:

  Spoofed IPs ---> [UDP packets] ---> Target Server
                                         |
                                    Port unreachable?
                                    Send ICMP response
                                    for each packet
                                         |
                                    Server overwhelmed
                                    (bandwidth + CPU)
```

### Mitigation Strategies

| Strategy | Description |
|----------|-------------|
| Rate limiting | Limit UDP packets per second per source IP |
| Firewall rules | Block unexpected UDP ports, allow only required services |
| DDoS protection | Use services like Cloudflare, AWS Shield |
| Ingress filtering | ISPs filter packets with spoofed source IPs (BCP 38) |
| UDP reflection defense | Disable or rate-limit services commonly used for amplification (DNS, NTP, memcached) |

### UDP Amplification Attacks

Some UDP services respond with much more data than the request. Attackers exploit this by sending small requests with a spoofed source IP (the victim's IP), causing large responses to flood the victim.

```
Amplification factors:
  DNS:       up to 54x
  NTP:       up to 556x
  Memcached: up to 51,000x
  SSDP:      up to 30x
```

---

## Code Example: UDP Client/Server in Python

### UDP Server

```python
import socket

def udp_server(host='127.0.0.1', port=9999):
    """Simple UDP echo server."""
    # Create a UDP socket (SOCK_DGRAM = UDP)
    server_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    server_socket.bind((host, port))
    print(f"UDP server listening on {host}:{port}")

    while True:
        # recvfrom returns (data, client_address)
        # No accept() needed -- UDP is connectionless
        data, client_addr = server_socket.recvfrom(1024)
        message = data.decode('utf-8')
        print(f"Received from {client_addr}: {message}")

        # Echo back the message in uppercase
        response = message.upper().encode('utf-8')
        server_socket.sendto(response, client_addr)
        print(f"Sent to {client_addr}: {response.decode('utf-8')}")

if __name__ == '__main__':
    udp_server()
```

### UDP Client

```python
import socket

def udp_client(host='127.0.0.1', port=9999):
    """Simple UDP client."""
    client_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

    # Optional: set a timeout for recvfrom
    client_socket.settimeout(2.0)

    messages = ["Hello, UDP!", "Transport Layer", "Fast and simple"]

    for msg in messages:
        # No connect() needed -- just sendto with the address
        client_socket.sendto(msg.encode('utf-8'), (host, port))
        print(f"Sent: {msg}")

        try:
            data, server_addr = client_socket.recvfrom(1024)
            print(f"Received: {data.decode('utf-8')}")
        except socket.timeout:
            print("Request timed out (no response from server)")

    client_socket.close()

if __name__ == '__main__':
    udp_client()
```

### Running the Example

```bash
# Terminal 1: Start the server
python udp_server.py
# Output: UDP server listening on 127.0.0.1:9999

# Terminal 2: Run the client
python udp_client.py
# Output:
# Sent: Hello, UDP!
# Received: HELLO, UDP!
# Sent: Transport Layer
# Received: TRANSPORT LAYER
# Sent: Fast and simple
# Received: FAST AND SIMPLE
```

Key differences from TCP socket programming:
- Use `SOCK_DGRAM` instead of `SOCK_STREAM`
- No `listen()`, `accept()`, or `connect()` calls
- Use `sendto()` / `recvfrom()` instead of `send()` / `recv()`
- Each `sendto()` is independent -- no connection state

---

## Exercises

### Beginner

1. What are the four fields in a UDP header? What is the total header size?
2. Why does DNS use UDP by default instead of TCP?
3. A UDP datagram has a Length field value of 50. How many bytes of payload data does it contain?

### Intermediate

4. Explain why QUIC was built on UDP instead of as a modification to TCP. What advantages does this approach provide?
5. Modify the Python UDP server to handle multiple clients simultaneously. Does it need threading? Why or why not?
6. A VoIP application can tolerate up to 3% packet loss but no more than 150ms of one-way delay. Explain why UDP is preferred over TCP for this application, and describe what application-level mechanisms you would add.

### Advanced

7. Design a simple reliable file transfer protocol on top of UDP. Specify how you would handle: (a) packet loss detection, (b) ordering, (c) flow control. Compare your design to TFTP.
8. Research the memcached UDP amplification attack of 2018 (1.7 Tbps DDoS against GitHub). Explain: (a) why memcached was vulnerable, (b) the amplification factor, and (c) what mitigations were deployed.

---

## Key Takeaways

- UDP has an 8-byte header with just four fields: source port, destination port, length, and checksum
- UDP is faster than TCP because it has **no handshake, no ordering, no congestion control, and no state**
- UDP is ideal for **real-time applications** (gaming, VoIP, streaming) where low latency matters more than perfect reliability
- Modern protocols like **QUIC** (HTTP/3) build reliability on top of UDP to get the best of both worlds
- UDP's simplicity makes it a target for **DDoS amplification attacks** -- proper security measures are essential
- UDP preserves **message boundaries**, unlike TCP's byte-stream model

---

## Navigation

- **Previous**: [TCP Deep Dive](./02_tcp_deep_dive.md)
- **Next**: [Port Numbers and Sockets](./04_ports_and_sockets.md)
- **Section Home**: [Transport Layer](./README.md)
