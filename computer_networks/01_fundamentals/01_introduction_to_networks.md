# Introduction to Computer Networks

## What You'll Learn

- What computer networks are and why they're important
- Different types of networks (LAN, WAN, MAN, PAN)
- Basic network architecture and components
- A brief history of networking and the internet
- Key networking terminology

## What is a Computer Network?

A **computer network** is a collection of interconnected devices (computers, servers, printers, smartphones, etc.) that can communicate and share resources with each other. Networks enable:

- **Resource Sharing**: Files, printers, internet connections
- **Communication**: Email, messaging, video calls
- **Data Transfer**: Moving files between devices
- **Collaboration**: Multiple users working together
- **Centralized Management**: Easier administration and security

### Network Components

Every network consists of:

1. **Nodes/Hosts**: Devices connected to the network (computers, phones, IoT devices)
2. **Network Interface Cards (NICs)**: Hardware that connects devices to the network
3. **Transmission Media**: Physical or wireless medium for data transfer (cables, Wi-Fi)
4. **Network Devices**: Equipment that directs traffic (routers, switches, hubs)
5. **Protocols**: Rules governing communication (TCP/IP, HTTP, etc.)
6. **Network Software**: Operating systems, drivers, applications

## Types of Networks

### 1. Personal Area Network (PAN)

**Range**: 1-10 meters  
**Purpose**: Connect personal devices around an individual

```
Examples:
- Bluetooth headphones connecting to phone
- Smartwatch syncing with smartphone
- Wireless keyboard/mouse connection
```

**Technologies**: Bluetooth, USB, Infrared

**Use Cases**:
- Personal device connectivity
- Wearable technology
- Short-range file transfer

### 2. Local Area Network (LAN)

**Range**: 10 meters to a few kilometers  
**Purpose**: Connect devices within a limited area

```
Typical LAN Setup:

    [Internet]
       |
   [Router]
       |
    [Switch]
       |
  +----+----+----+
  |    |    |    |
[PC1][PC2][PC3][Printer]
```

**Technologies**: Ethernet (cables), Wi-Fi (wireless)

**Characteristics**:
- High data transfer rates (100 Mbps to 10+ Gbps)
- Low latency
- Owned and managed by single organization
- Common in homes, offices, schools

**Use Cases**:
- Office networks
- Home Wi-Fi
- School computer labs
- Small business networks

### 3. Metropolitan Area Network (MAN)

**Range**: City or metropolitan area (up to 50 km)  
**Purpose**: Connect multiple LANs within a city

```
City-Wide MAN:

[Branch Office LAN] ----\
                         \
[University Campus] ------[MAN]------ [ISP/Internet]
                         /
[Hospital LAN] ---------/
```

**Technologies**: Fiber optic cables, wireless (WiMAX)

**Characteristics**:
- Covers larger geographical area than LAN
- Higher cost than LAN
- May be owned by single or multiple organizations

**Use Cases**:
- City-wide Wi-Fi networks
- Cable TV networks
- University multi-campus networks
- Corporate branch office connections

### 4. Wide Area Network (WAN)

**Range**: Countries, continents, global  
**Purpose**: Connect devices across vast geographical distances

```
Global WAN:

[Office NYC] -----\
                   \
[Office London] ---[WAN/Internet]--- [Data Center]
                   /
[Office Tokyo] ---/
```

**Technologies**: Leased lines, satellite, cellular networks, internet

**Characteristics**:
- Spans large geographical areas
- Lower data rates compared to LAN (though improving)
- Higher latency
- Often uses public infrastructure

**The Internet**: The largest WAN connecting billions of devices worldwide

**Use Cases**:
- The internet itself
- Corporate networks spanning multiple cities/countries
- Banking networks (ATMs nationwide)
- Cloud service connectivity

## Network Comparison Table

| Type | Range | Speed | Cost | Use Case |
|------|-------|-------|------|----------|
| PAN | 1-10m | High | Low | Personal devices |
| LAN | 10m-1km | Very High | Low-Medium | Office, home |
| MAN | 1-50km | Medium-High | Medium-High | City-wide |
| WAN | 50km+ | Medium | High | Global connectivity |

## Network Architecture

### Client-Server Architecture

```
Multiple Clients, One Server:

[Client 1] \
[Client 2] --[Server]-- [Database]
[Client 3] /

- Server provides resources/services
- Clients request and consume resources
- Centralized control and management
```

**Advantages**:
- Centralized data management
- Better security
- Easier backup and maintenance
- Scalable

**Examples**: Email, web browsing, online banking

### Peer-to-Peer (P2P) Architecture

```
All Nodes are Equal:

[Peer 1] ---- [Peer 2]
    |      X      |
    |    /   \    |
[Peer 3] ---- [Peer 4]

- No central server
- Each node can be client and server
- Distributed resources
```

**Advantages**:
- No single point of failure
- Lower cost (no dedicated server)
- Scalable by adding more peers

**Examples**: File sharing (BitTorrent), blockchain, some messaging apps

## Key Networking Concepts

### 1. Bandwidth

The maximum amount of data that can be transmitted over a network connection in a given time.

```
Think of it like a highway:
- More lanes = more bandwidth
- More cars can travel simultaneously
```

**Measured in**: bps (bits per second), Mbps, Gbps

**Example**:
- Dial-up: 56 Kbps
- Home broadband: 100-1000 Mbps
- Data centers: 10-100 Gbps

### 2. Latency

The time delay between sending and receiving data.

```
Latency = Time for data to travel from source to destination
```

**Measured in**: milliseconds (ms)

**Factors affecting latency**:
- Physical distance
- Number of intermediate devices (hops)
- Network congestion
- Processing delays

**Example latencies**:
- LAN: <1 ms
- Cross-country: 20-50 ms
- International: 100-300 ms
- Satellite: 500-700 ms

### 3. Throughput

The actual amount of data successfully transmitted over a network in a given time.

```
Throughput ≤ Bandwidth

Bandwidth = Highway speed limit
Throughput = Actual traffic speed (usually lower due to congestion)
```

### 4. Protocols

Rules and standards that govern network communication.

```
Protocol Stack Example:

Application Layer: HTTP, FTP, SMTP
Transport Layer: TCP, UDP
Network Layer: IP
Data Link Layer: Ethernet, Wi-Fi
```

## Brief History of Networking

### 1960s - ARPANET

```
1969: ARPANET connects 4 computers
- UCLA
- Stanford Research Institute
- UC Santa Barbara  
- University of Utah
```

The first packet-switching network, predecessor to the internet.

### 1970s - TCP/IP

```
1974: TCP/IP protocols developed
- Transmission Control Protocol (TCP)
- Internet Protocol (IP)
- Foundation of modern internet
```

### 1980s - Expansion

```
1983: ARPANET adopts TCP/IP (birth of the Internet)
1989: Tim Berners-Lee invents the World Wide Web
```

### 1990s - Commercial Internet

```
1991: World Wide Web becomes public
1993: Mosaic web browser released
Late 90s: Dot-com boom, widespread adoption
```

### 2000s - Broadband & Mobile

```
2000s: Broadband internet replaces dial-up
2007: iPhone launches, mobile internet explodes
2010s: 4G/LTE, cloud computing
```

### 2020s - Modern Era

```
Current trends:
- 5G networks
- Internet of Things (IoT)
- Edge computing
- Software-Defined Networking (SDN)
- IPv6 adoption
```

## Common Networking Terminology

| Term | Definition |
|------|------------|
| **Node** | Any device connected to a network |
| **Host** | A computer on a network (typically end-user device) |
| **Server** | Computer that provides resources/services |
| **Client** | Computer that requests resources/services |
| **Packet** | Unit of data transmitted over a network |
| **Protocol** | Set of rules for communication |
| **IP Address** | Unique identifier for a device on a network |
| **MAC Address** | Hardware address of a network interface |
| **Router** | Device that forwards data between networks |
| **Switch** | Device that connects devices within a network |
| **Gateway** | Entry/exit point between networks |
| **Topology** | Physical or logical arrangement of network |

## Real-World Example: Home Network

Let's trace a typical home network setup:

```
[Internet] (ISP)
    |
    | (Coaxial/Fiber)
    |
[Modem] (converts signal)
    |
    | (Ethernet)
    |
[Router] (directs traffic, provides Wi-Fi)
    |
    +---- (Wi-Fi) ----+
    |                 |
[Laptop]         [Smartphone]
    |                 |
[Smart TV]       [IoT Devices]
```

**Flow of data when you browse a website**:

1. You type URL on your laptop
2. Laptop sends request via Wi-Fi to router
3. Router forwards request through modem
4. Modem sends request to ISP
5. ISP routes request through internet to web server
6. Web server sends response back
7. Response travels back through ISP → Modem → Router → Laptop
8. Browser displays the webpage

## Why Learn Networking?

### Career Opportunities
- Network Engineer
- Security Analyst
- Cloud Architect
- DevOps Engineer
- System Administrator

### Practical Skills
- Troubleshoot home/office network issues
- Optimize network performance
- Secure your network
- Understand how applications communicate

### Foundation for Other Technologies
- Cloud computing
- Cybersecurity
- IoT development
- Web development
- DevOps

## Exercise

### Beginner
1. Identify all devices on your home network and classify them (client/server/both)
2. Draw a diagram of your home network showing connections
3. List 3 examples each of LAN, WAN, and PAN in your daily life

### Intermediate
4. Research and explain the difference between bandwidth and throughput with an example
5. Use `ping` command to measure latency to different websites:
   ```bash
   ping google.com
   ping github.com
   ```
6. Identify which network type (PAN/LAN/MAN/WAN) would be best for:
   - Connecting office computers in a 5-story building
   - Linking hospital branches across a city
   - Connecting smartwatch to phone

### Advanced
7. Research and compare the bandwidth costs of LAN vs WAN connectivity
8. Design a network architecture for a small business with 3 branches in the same city
9. Explain how the client-server model applies to web browsing

## Key Takeaways

- Networks enable device communication and resource sharing
- Networks are classified by range: PAN < LAN < MAN < WAN
- Key metrics: bandwidth (capacity), latency (delay), throughput (actual speed)
- Client-server vs P2P represent different architectural approaches
- The internet is the largest WAN, built on TCP/IP protocols
- Understanding networking is essential for modern technology careers

## Next Steps

Continue to [OSI Model](./02_osi_model.md) to learn about the layered architecture of network communication.

---

[← Back to Fundamentals](./README.md) | [Next: OSI Model →](./02_osi_model.md)
