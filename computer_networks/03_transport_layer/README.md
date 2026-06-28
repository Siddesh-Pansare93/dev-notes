# Transport Layer

The transport layer is the backbone of end-to-end communication in computer networks. It sits between the application layer and the network layer, providing crucial services like reliable data delivery, flow control, and multiplexing. This section covers everything from the fundamentals of TCP and UDP to advanced topics like congestion control and reliable data transfer protocols.

---

## What You'll Learn

- How the transport layer enables communication between application processes
- The inner workings of TCP: connection management, reliability, and flow control
- When and why to use UDP over TCP
- How port numbers and sockets identify network endpoints
- Congestion control algorithms that keep the internet stable
- The theory behind reliable data transfer protocols

---

## Tutorials

| # | Tutorial | Description | Est. Time |
|---|----------|-------------|-----------|
| 1 | [Transport Layer Overview](./01_transport_layer_overview.md) | Role of the transport layer, services provided, connection-oriented vs connectionless communication, and TCP vs UDP at a glance | 25 min |
| 2 | [TCP Deep Dive](./02_tcp_deep_dive.md) | TCP segment structure, three-way handshake, connection teardown, TCP states, sequence numbers, window size, retransmission, and Wireshark analysis | 40 min |
| 3 | [UDP and Use Cases](./03_udp_and_use_cases.md) | UDP datagram structure, performance advantages, real-world use cases (DNS, gaming, VoIP), UDP-based protocols like QUIC, and security considerations | 30 min |
| 4 | [Port Numbers and Sockets](./04_ports_and_sockets.md) | Well-known, registered, and ephemeral ports; socket programming basics in Python; inspecting connections with netstat/ss | 30 min |
| 5 | [Flow Control and Congestion Control](./05_flow_and_congestion_control.md) | Sliding window, slow start, congestion avoidance, AIMD, TCP Reno vs Tahoe vs CUBIC, ECN, and real-world performance impact | 35 min |
| 6 | [Reliable Data Transfer](./06_reliable_data_transfer.md) | Stop-and-Wait, Go-Back-N, Selective Repeat, ARQ mechanisms, pipelining, and how TCP implements reliability end-to-end | 30 min |

**Total Estimated Time: 3 - 4 hours**

---

## Prerequisites

Before starting this section, you should be familiar with:

- Basic networking concepts (IP addresses, packets)
- The OSI and TCP/IP reference models
- How the network layer routes packets between hosts

---

## Learning Path

```
Start Here
    |
    v
01_Transport Layer Overview -----> Understand the big picture
    |
    v
02_TCP Deep Dive ----------------> Master connection-oriented transport
    |
    v
03_UDP and Use Cases ------------> Learn connectionless transport
    |
    v
04_Ports and Sockets ------------> Understand addressing and programming
    |
    v
05_Flow and Congestion Control --> Control data rates and prevent collapse
    |
    v
06_Reliable Data Transfer ------> Theory behind reliability mechanisms
```

---

## Key Concepts at a Glance

```
+-------------------------------------------------------------+
|                     APPLICATION LAYER                        |
|          (HTTP, FTP, DNS, SMTP, SSH, etc.)                   |
+-------------------------------------------------------------+
                          |   ^
                          v   |
+-------------------------------------------------------------+
|                     TRANSPORT LAYER                          |
|                                                              |
|   +-------------+    +-------------+    +----------------+   |
|   |     TCP     |    |     UDP     |    | Ports/Sockets  |   |
|   | - Reliable  |    | - Fast      |    | - Multiplexing |   |
|   | - Ordered   |    | - Stateless |    | - Addressing   |   |
|   | - Flow ctrl |    | - Minimal   |    | - 0 - 65535    |   |
|   +-------------+    +-------------+    +----------------+   |
|                                                              |
|   +-------------------+    +-----------------------------+   |
|   | Congestion Control |    | Reliable Data Transfer     |   |
|   | - Slow start       |    | - Stop-and-Wait            |   |
|   | - AIMD             |    | - Go-Back-N                |   |
|   | - TCP CUBIC        |    | - Selective Repeat          |   |
|   +-------------------+    +-----------------------------+   |
+-------------------------------------------------------------+
                          |   ^
                          v   |
+-------------------------------------------------------------+
|                      NETWORK LAYER                           |
|               (IP routing, forwarding)                       |
+-------------------------------------------------------------+
```

---

## Quick Reference: TCP vs UDP

| Feature | TCP | UDP |
|---------|-----|-----|
| Connection | Connection-oriented | Connectionless |
| Reliability | Guaranteed delivery | Best-effort |
| Ordering | In-order delivery | No ordering |
| Speed | Slower (overhead) | Faster (minimal overhead) |
| Header size | 20-60 bytes | 8 bytes |
| Use cases | Web, email, file transfer | DNS, streaming, gaming |

---

## Navigation

- **Previous Section**: [Network Layer](../02_network_layer/)
- **Next Section**: [Application Layer](../04_application_layer/)
- **Home**: [Computer Networks](../README.md)
