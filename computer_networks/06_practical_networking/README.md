# Practical Networking

Welcome to **Section 06: Practical Networking** — the hands-on portion of your networking journey. This section bridges theory and practice by walking you through real tools, real configurations, and real-world network scenarios.

## What You'll Learn

- How to diagnose and troubleshoot network problems systematically
- Packet-level analysis using Wireshark and tcpdump
- Configuring networks on Linux and Windows systems
- Setting up and securing a home network from scratch
- Load balancing strategies for scalable applications
- Modern networking paradigms: SDN, NFV, and cloud networking

## Section Overview

| # | Tutorial | Description | Est. Time |
|---|----------|-------------|-----------|
| 1 | [Troubleshooting Tools](./01_troubleshooting_tools.md) | Master ping, traceroute, dig, netstat, nmap, mtr, tcpdump, and a systematic troubleshooting methodology | 45 min |
| 2 | [Wireshark & Packet Analysis](./02_wireshark_packet_analysis.md) | Capture and analyze packets with Wireshark, use display/capture filters, follow TCP streams, and detect anomalies | 50 min |
| 3 | [Network Configuration](./03_network_configuration.md) | Configure networking on Linux (ip, netplan, NetworkManager) and Windows (netsh, PowerShell), set static IPs, DNS, and routes | 45 min |
| 4 | [Home Network Setup](./04_home_network_setup.md) | Design a home network with router config, DHCP, port forwarding, Wi-Fi security, VLANs, QoS, and home lab setup | 40 min |
| 5 | [Load Balancing & High Availability](./05_load_balancing.md) | Understand load balancing algorithms, L4 vs L7, Nginx/HAProxy configs, health checks, sticky sessions, and HA patterns | 50 min |
| 6 | [SDN & Network Virtualization](./06_sdn_virtualization.md) | Explore Software-Defined Networking, OpenFlow, NFV, overlay networks, container networking, and cloud VPC concepts | 50 min |

**Total Estimated Time: 4-5 hours**

## Prerequisites

Before starting this section, you should be comfortable with:

- TCP/IP fundamentals (IP addressing, subnetting, ports)
- OSI model layers and their functions
- Basic DNS, DHCP, and routing concepts
- Command-line usage on Linux or Windows

## How This Section Is Organized

```
+--------------------------------------------------+
|          06_practical_networking/                 |
|                                                  |
|  Diagnostics          Configuration              |
|  +-----------+        +-----------+              |
|  | 01 Tools  |------->| 03 Config |              |
|  +-----------+        +-----------+              |
|       |                    |                     |
|       v                    v                     |
|  +-----------+        +-----------+              |
|  | 02 Wire-  |        | 04 Home   |              |
|  |   shark   |        |  Network  |              |
|  +-----------+        +-----------+              |
|                            |                     |
|       Architecture         v                     |
|  +-----------+        +-----------+              |
|  | 06 SDN &  |<-------| 05 Load   |              |
|  |   NFV     |        | Balancing |              |
|  +-----------+        +-----------+              |
+--------------------------------------------------+
```

The tutorials progress from **diagnostic skills** (knowing what's wrong) to **configuration skills** (making it right) to **architecture skills** (designing it well).

## Recommended Learning Paths

### Path A: Network Administrator Focus
1. Troubleshooting Tools
2. Wireshark & Packet Analysis
3. Network Configuration
4. Home Network Setup

### Path B: DevOps / Cloud Engineer Focus
1. Troubleshooting Tools
2. Network Configuration
3. Load Balancing & High Availability
4. SDN & Network Virtualization

### Path C: Complete Coverage
Work through all six tutorials in order for the most thorough understanding.

## Tools You'll Need

| Tool | Used In | Install Notes |
|------|---------|---------------|
| ping, traceroute, netstat | Tutorial 1 | Built into most OSes |
| nmap | Tutorial 1 | `apt install nmap` / [nmap.org](https://nmap.org) |
| mtr | Tutorial 1 | `apt install mtr` |
| tcpdump | Tutorials 1, 2 | `apt install tcpdump` |
| Wireshark | Tutorial 2 | [wireshark.org](https://www.wireshark.org) |
| ip / netsh / PowerShell | Tutorial 3 | Built into Linux / Windows |
| Nginx or HAProxy | Tutorial 5 | `apt install nginx` / `apt install haproxy` |
| Docker | Tutorial 6 | [docker.com](https://www.docker.com) |

## Key Concepts at a Glance

```
Troubleshooting Approach (OSI Layer Method):
+---------------------------------------------------+
| Layer 7: Application  | curl, browser, app logs   |
| Layer 4: Transport    | netstat, ss, telnet        |
| Layer 3: Network      | ping, traceroute, ip route |
| Layer 2: Data Link    | arp, ip link, ethtool      |
| Layer 1: Physical     | cable check, link lights   |
+---------------------------------------------------+
  Start from the bottom and work up (or bisect)
```

## Navigation

| Previous Section | Home | Next Section |
|:-----------------|:----:|-------------:|
| [05_Network_Security](../05_network_security/) | [Computer Networks](../README.md) | [07_Advanced_Topics](../07_advanced_topics/) |

---

*This section is designed for hands-on practice. Open a terminal, fire up Wireshark, and follow along with every example. Reading alone won't build the muscle memory you need for real-world networking.*
