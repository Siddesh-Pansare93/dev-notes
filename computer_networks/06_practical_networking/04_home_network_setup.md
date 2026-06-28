# Setting Up a Home Network

## What You'll Learn

- Identify home network components and their roles (modem, router, switch, AP)
- Configure a router: SSID, password, channel selection, security mode
- Set up DHCP with address reservations for key devices
- Configure **port forwarding** to expose internal services
- Choose optimal DNS providers and understand the tradeoffs
- Compare **WPA2 vs WPA3** and implement Wi-Fi security best practices
- Set up a **guest network** for visitor isolation
- Use **VLANs** for network segmentation
- Apply **QoS** rules to prioritize critical traffic
- Design a **home lab** for hands-on networking practice

---

## 1. Home Network Components

```
Internet
   |
   |  Coaxial / Fiber / DSL
   v
+--------+        +--------+        +--------+
| Modem  |------->| Router |------->| Switch |
| (ISP)  |  WAN   | (NAT,  |  LAN   | (extra |
|        |        |  DHCP, |        |  ports)|
+--------+        |  FW)   |        +--------+
                  +--------+           |   |
                   |    |          PC  NAS Printer
                   |    |
              +----+    +----+
              |              |
          +--------+    +--------+
          | Wi-Fi  |    | Wi-Fi  |
          |  AP 1  |    |  AP 2  |
          +--------+    +--------+
           2.4/5GHz      5GHz
```

| Component | Function |
|-----------|----------|
| **Modem** | Converts ISP signal (coax/fiber/DSL) to Ethernet; bridges ISP and home network |
| **Router** | Assigns IPs (DHCP), performs NAT, routes between WAN and LAN, includes firewall |
| **Switch** | Expands available Ethernet ports; operates at Layer 2 |
| **Access Point (AP)** | Provides Wi-Fi connectivity; bridges wireless clients to the wired LAN |
| **Combo device** | Most consumer "routers" combine modem + router + switch + AP in one box |

---

## 2. Router Configuration

### Initial Setup

Most consumer routers are accessed at `192.168.1.1` or `192.168.0.1` via a web browser. Default credentials are usually on a sticker on the device.

**First steps after login:**
1. Change the default admin password immediately
2. Update the firmware to the latest version
3. Configure WAN connection (usually auto-detected or set by ISP)

### SSID and Wi-Fi Configuration

```
Recommended Wi-Fi Settings:

+----------------------------------------------+
| Setting          | Recommendation            |
|------------------|---------------------------|
| SSID             | Unique name, no personal  |
|                  | info (not "John's House") |
| Security Mode    | WPA3 or WPA2-PSK (AES)   |
| Password         | 16+ chars, mix of types   |
| SSID Broadcast   | Keep enabled (hiding      |
|                  | provides no real security)|
| Band             | Enable both 2.4 + 5 GHz  |
+----------------------------------------------+
```

### Wi-Fi Channel Selection

```
2.4 GHz Non-overlapping Channels:

Channel: 1    2  3  4  5    6    7  8  9  10   11
         |====|              |====|              |====|
         Ch 1               Ch 6               Ch 11

Use only channels 1, 6, or 11 to avoid interference.

5 GHz: Many more non-overlapping channels (36, 40, 44, 48,
       149, 153, 157, 161, 165). Less congested overall.
```

**How to choose:** Use a Wi-Fi analyzer app (e.g., WiFi Analyzer on Android) to scan nearby networks. Pick the least congested channel.

---

## 3. DHCP Setup and Reservations

DHCP automatically assigns IP addresses to devices on your network.

```
DHCP Process:

Client                          Router (DHCP Server)
  |                                    |
  |--- DHCP Discover (broadcast) ----->|
  |                                    |
  |<--- DHCP Offer (IP: 192.168.1.50)-|
  |                                    |
  |--- DHCP Request (accept offer) --->|
  |                                    |
  |<--- DHCP ACK (confirmed) ---------|
  |                                    |
```

### Typical DHCP Configuration

| Setting | Recommended Value |
|---------|-------------------|
| Start Address | 192.168.1.100 |
| End Address | 192.168.1.200 |
| Subnet Mask | 255.255.255.0 |
| Lease Time | 24 hours (home), 8 hours (guest) |
| DNS Servers | 1.1.1.1, 8.8.8.8 (or router IP) |

### DHCP Reservations (Static Leases)

Reserve fixed IPs for devices that need consistent addressing (servers, printers, NAS):

| Device | MAC Address | Reserved IP |
|--------|-------------|-------------|
| NAS | AA:BB:CC:11:22:33 | 192.168.1.10 |
| Printer | AA:BB:CC:44:55:66 | 192.168.1.11 |
| Home Server | AA:BB:CC:77:88:99 | 192.168.1.12 |
| Smart Hub | AA:BB:CC:AA:BB:CC | 192.168.1.13 |

> **Best Practice:** Keep reserved IPs outside the DHCP dynamic range (e.g., use .10-.49 for reservations, .100-.200 for dynamic).

---

## 4. Port Forwarding

Port forwarding allows external traffic to reach services inside your network through the router's NAT.

```
Port Forwarding Flow:

Internet User                    Your Router                 Home Server
(public IP)                   (WAN: 203.0.113.5)          (LAN: 192.168.1.12)
     |                              |                            |
     |--- Request to 203.0.113.5:8080 -->|                       |
     |                              |                            |
     |                   NAT translates:                         |
     |                   dst 203.0.113.5:8080                    |
     |                    -> 192.168.1.12:80                     |
     |                              |                            |
     |                              |--- Forward to :80 -------->|
     |                              |                            |
     |                              |<-- Response ---------------|
     |<--- Response (src rewritten) |                            |
```

### Common Port Forwarding Rules

| Service | External Port | Internal IP | Internal Port | Protocol |
|---------|---------------|-------------|---------------|----------|
| Web Server | 8080 | 192.168.1.12 | 80 | TCP |
| SSH | 2222 | 192.168.1.12 | 22 | TCP |
| Minecraft | 25565 | 192.168.1.50 | 25565 | TCP |
| Plex | 32400 | 192.168.1.10 | 32400 | TCP |

> **Security:** Avoid forwarding well-known ports directly (e.g., use 2222 externally for SSH, not 22). Always keep forwarded services patched and secured.

---

## 5. DNS Settings

### Why Change Default DNS?

Your ISP's DNS may be slow, log your queries, or inject ads. Alternatives offer speed, privacy, or filtering.

| Provider | Primary | Secondary | Features |
|----------|---------|-----------|----------|
| Cloudflare | 1.1.1.1 | 1.0.0.1 | Fastest, privacy-focused |
| Google | 8.8.8.8 | 8.8.4.4 | Reliable, global |
| Quad9 | 9.9.9.9 | 149.112.112.112 | Malware blocking |
| OpenDNS | 208.67.222.222 | 208.67.220.220 | Content filtering options |
| AdGuard | 94.140.14.14 | 94.140.15.15 | Ad and tracker blocking |

### Where to Configure

- **Router level** (recommended): All devices on the network use the custom DNS automatically via DHCP
- **Device level**: Only that device uses the custom DNS
- **Pi-hole / AdGuard Home**: Run a local DNS server that blocks ads and trackers for the entire network

---

## 6. Wi-Fi Security

### WPA2 vs WPA3

| Feature | WPA2 (2004) | WPA3 (2018) |
|---------|-------------|-------------|
| Encryption | AES-CCMP (128-bit) | AES-GCMP (128 or 256-bit) |
| Key Exchange | PSK (Pre-Shared Key) | SAE (Simultaneous Auth of Equals) |
| Offline Attack Resistance | Vulnerable to dictionary attacks | Resistant (SAE prevents offline cracking) |
| Forward Secrecy | No | Yes (past traffic safe if key compromised) |
| Open Network Protection | None | OWE (Opportunistic Wireless Encryption) |
| Device Support | Universal | Newer devices required |

**Recommendation:** Use **WPA3** if all your devices support it. Otherwise, use **WPA2/WPA3 Transition Mode** (supports both). Never use WEP or WPA (both are broken).

### Additional Wi-Fi Security Measures

```
Security Checklist:

[x] Use WPA3 or WPA2-AES with a strong passphrase
[x] Change default router admin credentials
[x] Keep firmware updated
[x] Disable WPS (Wi-Fi Protected Setup) — it's vulnerable
[x] Set up a guest network for visitors
[ ] MAC filtering — adds inconvenience but little real security
[ ] Hidden SSID — security through obscurity, not recommended
```

---

## 7. Guest Network

A guest network provides internet access to visitors while isolating them from your main LAN.

```
Network Isolation:

Main Network (192.168.1.0/24)          Guest Network (192.168.2.0/24)
+----------------------------+          +----------------------------+
| Your PC    192.168.1.100   |          | Guest Phone 192.168.2.50   |
| NAS        192.168.1.10    |          | Guest Laptop 192.168.2.51  |
| Printer    192.168.1.11    |          +----------------------------+
+----------------------------+                     |
          |                                        |
          +------------- Router ------------------+
                           |
                        Internet
                           
   Guests can reach the internet but CANNOT access
   devices on 192.168.1.0/24 (your main LAN).
```

### Guest Network Best Practices

- Enable **client isolation** (guests can't see each other)
- Set a **bandwidth limit** to prevent one guest from hogging the connection
- Use a **shorter DHCP lease** (4-8 hours)
- Set a **different, simpler password** you're comfortable sharing
- Consider enabling a **captive portal** for time-limited access

---

## 8. Network Segmentation with VLANs

VLANs (Virtual LANs) divide a physical network into separate logical networks. This requires a **managed switch** and a **VLAN-aware router**.

```
VLAN Architecture:

+-------- Managed Switch ---------+
|                                 |
| Port 1-4:  VLAN 10 (Trusted)   |--- 192.168.10.0/24
| Port 5-6:  VLAN 20 (IoT)       |--- 192.168.20.0/24
| Port 7-8:  VLAN 30 (Guest)     |--- 192.168.30.0/24
| Port 24:   Trunk (all VLANs)   |--- to Router
|                                 |
+---------------------------------+
```

| VLAN | Name | Subnet | Devices | Internet | LAN Access |
|------|------|--------|---------|----------|------------|
| 10 | Trusted | 192.168.10.0/24 | PCs, phones | Yes | Full |
| 20 | IoT | 192.168.20.0/24 | Smart home, cameras | Yes | None (isolated) |
| 30 | Guest | 192.168.30.0/24 | Visitor devices | Yes | None (isolated) |

**Why segment IoT devices?** Smart home devices (cameras, speakers, thermostats) often have weak security and rarely receive updates. Isolating them prevents a compromised device from accessing your main network.

---

## 9. QoS (Quality of Service)

QoS prioritizes certain traffic types to ensure consistent performance for critical applications.

```
Without QoS:                    With QoS:

All traffic competes:           Traffic is prioritized:
+---------+                     +---------+
| Gaming  |--+                  | Gaming  |---> High Priority
+---------+  |  +----------+   +---------+
| Video   |--+->| Internet |   | Video   |---> Medium Priority
+---------+  |  | Pipe     |   +---------+
| Backup  |--+  +----------+   | Backup  |---> Low Priority (best effort)
+---------+                     +---------+
  All get congested               Gaming and video stay smooth
```

### Common QoS Categories

| Priority | Traffic Type | Examples |
|----------|-------------|----------|
| Highest | Real-time voice/video | VoIP, video calls |
| High | Interactive / gaming | Online games, remote desktop |
| Medium | Streaming | YouTube, Netflix, Spotify |
| Normal | Web browsing | HTTP/HTTPS general |
| Low | Bulk transfers | Backups, large downloads, torrents |

### Router QoS Settings

Most routers offer one of these QoS approaches:

1. **Device-based**: Prioritize specific devices (e.g., your work PC)
2. **Application-based**: Prioritize by port/protocol (e.g., port 3478 for gaming)
3. **Bandwidth allocation**: Guarantee minimum bandwidth per device/category

---

## 10. Home Lab Setup for Learning

A home lab is invaluable for hands-on networking practice.

### Minimal Home Lab

```
+-------------------------------------------+
|  Home Lab - Starter Setup                 |
|                                           |
|  +----------+     +------------------+    |
|  | Old PC / |     | Managed Switch   |    |
|  | Mini PC  |     | (8-port, VLAN    |    |
|  | (Router/ |---->|  capable)        |    |
|  | Server)  |     +------------------+    |
|  +----------+       |     |     |         |
|       |           VLAN1 VLAN2 VLAN3       |
|    Internet                               |
+-------------------------------------------+
```

### Software Options

| Software | Purpose | Cost |
|----------|---------|------|
| **pfSense / OPNsense** | Router/firewall OS | Free |
| **Proxmox VE** | Virtualization platform | Free |
| **GNS3 / EVE-NG** | Network simulation | Free (community) |
| **Pi-hole** | DNS-based ad blocker | Free |
| **Unifi Controller** | AP management | Free (with Ubiquiti hardware) |
| **Docker** | Containerized services | Free |

### Recommended Learning Projects

1. **Replace ISP router** with pfSense/OPNsense on an old PC
2. **Set up VLANs** to segment trusted, IoT, and guest networks
3. **Deploy Pi-hole** as your network-wide DNS ad blocker
4. **Run Nginx** as a reverse proxy for home services
5. **Set up a VPN server** (WireGuard) for secure remote access
6. **Monitor your network** with Grafana + Prometheus or LibreNMS

### Budget Home Lab Bill of Materials

| Item | Example | Approximate Cost |
|------|---------|----------------:|
| Mini PC (router/server) | Intel N100 mini PC | $120-180 |
| Managed Switch | TP-Link TL-SG108E | $30-40 |
| Wi-Fi Access Point | TP-Link EAP225 | $60-80 |
| Raspberry Pi (Pi-hole) | Pi 4 Model B 2GB | $35-50 |
| Ethernet cables | Cat6, various lengths | $15-20 |
| **Total** | | **$260-370** |

---

## Exercises

### Beginner

1. Log into your home router's admin interface. Document the following: WAN IP, LAN IP range, DHCP range, DNS servers, Wi-Fi channel, and security mode.
2. Find the MAC addresses of three devices on your network. Set up DHCP reservations so each device always gets the same IP.
3. Change your router's DNS servers to Cloudflare (1.1.1.1, 1.0.0.1). Test resolution speed before and after using `dig example.com` or `nslookup example.com`.

### Intermediate

4. Set up a guest network on your router with client isolation enabled. Connect a device to it and verify: (a) it can reach the internet, (b) it cannot ping devices on your main network.
5. Configure port forwarding to expose a simple web server (e.g., Python's `python3 -m http.server 8080`) running on your PC to the internet. Test it from a phone on cellular data using your public IP.
6. Use a Wi-Fi analyzer app to survey your 2.4 GHz environment. How many networks are on each channel? Reconfigure your router to the least congested of channels 1, 6, or 11.

### Advanced

7. If you have a managed switch, create two VLANs: one for your main devices and one for IoT. Configure inter-VLAN routing on your router so the main VLAN can initiate connections to IoT (for management) but IoT cannot initiate connections to the main VLAN.
8. Install pfSense or OPNsense in a VM (VirtualBox/Proxmox). Configure it with WAN and LAN interfaces, set up DHCP, DNS (with Unbound), and basic firewall rules. Route a test VM's traffic through it.
9. Set up Pi-hole on a Raspberry Pi or Docker container. Point your router's DHCP DNS setting to the Pi-hole. Monitor the dashboard for a day and analyze: how many queries were blocked? What are the top queried and top blocked domains?

---

## Key Takeaways

- A typical home network has four logical functions: **modem** (ISP bridge), **router** (NAT + firewall), **switch** (wired distribution), **AP** (wireless)
- **DHCP reservations** give servers and printers stable IPs without manual configuration on each device
- **Port forwarding** punches specific holes in your NAT for services you want to expose — limit it to what you need
- **WPA3** is the current standard for Wi-Fi security; at minimum use **WPA2-AES** with a strong passphrase
- **VLANs** let you isolate IoT and guest devices even on a home network — especially important as smart devices multiply
- A **home lab** is the best way to develop practical networking skills — start small and expand as you learn

---

## Navigation

| Previous | Home | Next |
|:---------|:----:|-----:|
| [Network Configuration](./03_network_configuration.md) | [Practical Networking](./README.md) | [Load Balancing & High Availability](./05_load_balancing.md) |
