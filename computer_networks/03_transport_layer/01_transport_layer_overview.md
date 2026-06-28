# Transport Layer Overview

The transport layer is responsible for end-to-end communication between **processes** running on different hosts. While the network layer delivers packets between hosts, the transport layer extends this delivery to specific application processes using port numbers.

---

## What You'll Learn

- The role of the transport layer in the protocol stack
- Key services: multiplexing, demultiplexing, and error detection
- The difference between connection-oriented and connectionless services
- Where the transport layer fits in OSI and TCP/IP models
- When to choose TCP vs UDP for your application

---

## Role of the Transport Layer

The network layer (IP) provides **host-to-host** communication. But a single host runs many applications simultaneously -- a web browser, email client, file transfer, etc. The transport layer provides **process-to-process** communication by identifying the correct application endpoint.

```
  Host A                                          Host B
+-----------+                                  +-----------+
| App 1 (80)|---+                          +---| App 1 (80)|
| App 2 (443)|--+---+                  +---+---| App 2 (443)|
| App 3 (22) |--+   |                  |   +---| App 3 (22) |
+-----------+  |    |                  |    |  +-----------+
               v    v                  ^    ^
          +------------+          +------------+
          | Transport  |          | Transport  |
          |   Layer    |--------->|   Layer    |
          +------------+          +------------+
               |                       ^
          +------------+          +------------+
          |  Network   |--------->|  Network   |
          |   Layer    |          |   Layer    |
          +------------+          +------------+
```

### Core Responsibilities

1. **Process-to-process delivery** -- Route data to the correct application
2. **Multiplexing/Demultiplexing** -- Handle multiple conversations simultaneously
3. **Error detection** -- Detect corrupted data using checksums
4. **Reliability** (TCP only) -- Guarantee data arrives completely and in order
5. **Flow control** (TCP only) -- Prevent sender from overwhelming receiver
6. **Congestion control** (TCP only) -- Prevent sender from overwhelming the network

---

## Services Provided

### Multiplexing and Demultiplexing

**Multiplexing** at the sender: gathering data from multiple application processes, adding transport headers (including port numbers), and passing segments to the network layer.

**Demultiplexing** at the receiver: examining port numbers in incoming segments and delivering data to the correct application process.

```
        Multiplexing (Sender)              Demultiplexing (Receiver)
  +-------+ +-------+ +-------+     +-------+ +-------+ +-------+
  | App A | | App B | | App C |     | App A | | App B | | App C |
  | :5000 | | :5001 | | :5002 |     | :80   | | :443  | | :22   |
  +---+---+ +---+---+ +---+---+     +---^---+ +---^---+ +---^---+
      |         |         |             |         |         |
      v         v         v             |         |         |
  +---------------------------+     +---------------------------+
  |     Transport Layer       |     |     Transport Layer       |
  | Add src/dst port headers  |     | Read dst port, deliver    |
  +---------------------------+     +---------------------------+
              |                                 ^
              v                                 |
  +---------------------------+     +---------------------------+
  |      Network Layer        |---->|      Network Layer        |
  +---------------------------+     +---------------------------+
```

#### How Demultiplexing Works

- **UDP demultiplexing**: Uses the **destination port** only. All UDP segments arriving at the same destination port go to the same socket, regardless of source IP or source port.
- **TCP demultiplexing**: Uses a **4-tuple** (source IP, source port, destination IP, destination port). Each unique combination maps to a different socket.

```python
# TCP 4-tuple identification
connection_1 = ("192.168.1.10", 50001, "10.0.0.5", 80)
connection_2 = ("192.168.1.10", 50002, "10.0.0.5", 80)
# These are TWO different TCP connections even though dest is the same
```

### Error Detection

Both TCP and UDP include a **checksum** field in their headers. The checksum is computed over the header, data, and a pseudo-header (containing IP addresses) to detect bit errors introduced during transmission.

```
Checksum Calculation (simplified):

1. Treat segment as sequence of 16-bit integers
2. Sum all 16-bit words using one's complement addition
3. Take one's complement of the result
4. Store in checksum field

Receiver repeats calculation:
  - If result is all 1s (0xFFFF) --> no error detected
  - Otherwise --> error detected, segment discarded
```

> **Note**: Checksums detect errors but do not correct them. They also cannot detect all possible errors (e.g., two compensating bit flips).

---

## Connection-Oriented vs Connectionless Services

The transport layer offers two fundamentally different service models:

### Connection-Oriented (TCP)

A logical connection is established **before** data transfer begins. This connection involves:

1. **Connection establishment** -- Three-way handshake
2. **Data transfer** -- Bidirectional, reliable, ordered
3. **Connection teardown** -- Four-way handshake

```
  Client                  Server
    |                       |
    |--- SYN ------------->|   1. Connection
    |<-- SYN-ACK ----------|      Establishment
    |--- ACK ------------->|
    |                       |
    |--- Data Segment 1 -->|   2. Data
    |<-- ACK --------------|      Transfer
    |--- Data Segment 2 -->|
    |<-- ACK --------------|
    |                       |
    |--- FIN ------------->|   3. Connection
    |<-- ACK --------------|      Teardown
    |<-- FIN --------------|
    |--- ACK ------------->|
    |                       |
```

### Connectionless (UDP)

No connection is established. Each datagram is independent. The sender transmits data without knowing if the receiver is ready or if the data arrived.

```
  Client                  Server
    |                       |
    |--- Datagram 1 ------>|   No handshake.
    |--- Datagram 2 ------>|   No acknowledgment.
    |--- Datagram 3 ------>|   No ordering guarantee.
    |                       |   Fire and forget.
```

### Service Model Comparison

| Property | Connection-Oriented (TCP) | Connectionless (UDP) |
|----------|---------------------------|----------------------|
| Setup required | Yes (3-way handshake) | No |
| State maintained | Yes (per connection) | No |
| Reliability | Guaranteed | Best-effort |
| Ordering | In-order delivery | No ordering |
| Overhead | Higher | Lower |
| Latency | Higher initial latency | Lower latency |
| Analogy | Phone call | Postal mail |

---

## Transport Layer in the Protocol Models

### OSI Model (Layer 4)

In the 7-layer OSI model, the transport layer is **Layer 4**. It provides a clear boundary between the upper layers (application-facing) and the lower layers (network-facing).

```
+---+---------------------+
| 7 | Application Layer   |
+---+---------------------+
| 6 | Presentation Layer  |
+---+---------------------+
| 5 | Session Layer       |   Upper Layers
+---+---------------------+   (Host layers)
| 4 | TRANSPORT LAYER     | <--- YOU ARE HERE
+---+---------------------+
| 3 | Network Layer       |   Lower Layers
+---+---------------------+   (Media layers)
| 2 | Data Link Layer     |
+---+---------------------+
| 1 | Physical Layer      |
+---+---------------------+
```

### TCP/IP Model

In the practical TCP/IP model, the transport layer sits between the application layer and the internet layer. The two primary protocols are TCP and UDP.

```
+-------------------------+
|   Application Layer     |  HTTP, FTP, DNS, SMTP
+-------------------------+
|   Transport Layer       |  TCP, UDP
+-------------------------+
|   Internet Layer        |  IP, ICMP, ARP
+-------------------------+
|   Network Access Layer  |  Ethernet, Wi-Fi
+-------------------------+
```

### Protocol Data Units

Each layer has its own terminology for the unit of data:

| Layer | PDU Name | Example |
|-------|----------|---------|
| Application | Message / Data | HTTP request body |
| Transport | **Segment** (TCP) / **Datagram** (UDP) | TCP segment with port info |
| Network | Packet | IP packet with addresses |
| Data Link | Frame | Ethernet frame with MAC |
| Physical | Bits | Electrical signals |

---

## TCP vs UDP: Overview Comparison

| Feature | TCP | UDP |
|---------|-----|-----|
| Full name | Transmission Control Protocol | User Datagram Protocol |
| RFC | RFC 793, RFC 9293 | RFC 768 |
| Connection | Connection-oriented | Connectionless |
| Reliability | Guaranteed delivery via ACKs | No delivery guarantee |
| Ordering | In-order delivery | No ordering |
| Duplicate detection | Yes | No |
| Flow control | Yes (sliding window) | No |
| Congestion control | Yes (slow start, AIMD) | No |
| Header size | 20-60 bytes | 8 bytes |
| Speed | Slower | Faster |
| Overhead | Higher | Lower |
| Broadcast/Multicast | No | Yes |
| Stream-oriented | Yes (byte stream) | No (message boundaries preserved) |
| State | Stateful | Stateless |

---

## When to Use TCP vs UDP

### Use TCP When:

- **Data integrity matters**: File transfers, web pages, emails
- **Order matters**: Database transactions, API calls
- **Complete delivery is required**: Financial transactions, configuration updates
- **You need flow/congestion control**: Large data transfers

**Examples**: HTTP/HTTPS, FTP, SMTP, SSH, Telnet, IMAP/POP3

### Use UDP When:

- **Speed matters more than reliability**: Real-time applications
- **Small, independent messages**: DNS queries, DHCP
- **Loss is tolerable**: Video/audio streaming (a dropped frame is acceptable)
- **Broadcast/multicast needed**: Service discovery, network announcements
- **Application handles its own reliability**: QUIC, custom game protocols

**Examples**: DNS, DHCP, TFTP, SNMP, RTP, online gaming, VoIP

### Decision Flowchart

```
                  Start
                    |
                    v
          Must every byte arrive?
           /                 \
         Yes                  No
          |                    |
          v                    v
   Order matters?       Latency critical?
    /         \          /           \
  Yes          No      Yes            No
   |            |       |              |
   v            v       v              v
  TCP        TCP*     UDP          Either
 (web,      (rare      (gaming,    (depends on
  file       case)      VoIP)      specifics)
  xfer)
```

---

## Exercises

### Beginner

1. List three services that the transport layer provides that the network layer does not.
2. Explain the difference between multiplexing and demultiplexing in your own words.
3. A host receives a UDP datagram on port 53 from two different source IPs. How many sockets are needed?

### Intermediate

4. Why does TCP demultiplexing use a 4-tuple while UDP uses only the destination port? What problem does this solve?
5. An application sends time-sensitive stock price updates every 100ms. If a packet is lost, the data is stale by the time a retransmission arrives. Should this application use TCP or UDP? Justify your answer.
6. Explain why the transport layer checksum includes a pseudo-header with IP addresses, even though IP has its own checksum.

### Advanced

7. Design a protocol on top of UDP that provides reliable delivery but with lower latency than TCP for small messages (under 1 KB). Describe the key mechanisms you would use.
8. QUIC is a modern transport protocol built on UDP. Research and explain why Google chose to build QUIC over UDP rather than creating a new transport-layer protocol or modifying TCP.

---

## Key Takeaways

- The transport layer extends network-layer host-to-host delivery to **process-to-process** delivery
- **Multiplexing** and **demultiplexing** use port numbers to route data to the correct application
- **TCP** is connection-oriented, reliable, ordered, and includes flow/congestion control
- **UDP** is connectionless, fast, and lightweight -- ideal for latency-sensitive applications
- Both TCP and UDP provide **error detection** via checksums
- The choice between TCP and UDP depends on the application's requirements for reliability, speed, and overhead

---

## Navigation

- **Previous**: [Transport Layer Section Home](./README.md)
- **Next**: [TCP Deep Dive](./02_tcp_deep_dive.md)
- **Section Home**: [Transport Layer](./README.md)
