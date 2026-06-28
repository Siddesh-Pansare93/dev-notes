# Wireshark and Packet Analysis

## What You'll Learn

- Install and configure Wireshark for packet capture
- Distinguish between **capture filters** and **display filters**
- Analyze a TCP three-way handshake at the packet level
- Follow TCP streams to reconstruct conversations
- Inspect HTTP, HTTPS, and DNS traffic in detail
- Write effective filter expressions for targeted analysis
- Detect suspicious or anomalous traffic patterns
- Use **tshark** for command-line packet analysis

---

## 1. What Is Wireshark?

Wireshark is a free, open-source network protocol analyzer. It captures packets in real-time and displays them in a human-readable format with full protocol dissection.

```
+-----------------------------------------------------+
|  Wireshark Architecture                             |
|                                                     |
|  +-----------+     +-----------+     +----------+   |
|  | Network   |---->| Capture   |---->| Protocol |   |
|  | Interface |     | Engine    |     | Dissector|   |
|  | (NIC)     |     | (dumpcap) |     | Engine   |   |
|  +-----------+     +-----------+     +----------+   |
|                                            |        |
|                                      +----------+   |
|                                      | GUI /    |   |
|                                      | Display  |   |
|                                      +----------+   |
+-----------------------------------------------------+
```

### Installation

| OS | Method |
|-----|--------|
| Ubuntu/Debian | `sudo apt install wireshark` |
| Fedora/RHEL | `sudo dnf install wireshark` |
| macOS | `brew install --cask wireshark` |
| Windows | Download from [wireshark.org](https://www.wireshark.org/download.html) |

```bash
# Linux: allow non-root capture
sudo usermod -aG wireshark $USER
# Log out and back in for the group change to take effect
```

---

## 2. Capturing Packets

### Selecting an Interface

When you launch Wireshark, the start screen shows all available network interfaces with a live sparkline of activity.

```
+--------------------------------------------------+
|  Wireshark - Capture Interfaces                  |
|                                                  |
|  Interface        Traffic Graph                  |
|  ─────────────────────────────────               |
|  eth0             ▁▂▃▅▇▅▃▂▁▂▃     <-- active    |
|  wlan0            ▁▁▂▁▁▁▁▁▁▁▁                   |
|  lo (loopback)    ▁▁▁▁▁▁▁▁▁▁▁                   |
|  docker0          ▁▁▁▁▁▁▁▁▁▁▁                   |
|                                                  |
|  [Start Capture]                                 |
+--------------------------------------------------+
```

- Select the interface carrying the traffic you want to analyze
- Use `lo` (loopback) for capturing local application traffic
- Double-click an interface to start capturing immediately

### Promiscuous Mode

By default Wireshark enables **promiscuous mode**, which captures all packets the NIC sees, not just those addressed to your MAC. This is essential on shared/hub networks but less relevant on switched networks.

---

## 3. Capture Filters vs Display Filters

These serve different purposes and use **different syntax**.

| Feature | Capture Filter | Display Filter |
|---------|---------------|----------------|
| **When applied** | Before packets are stored | After packets are captured |
| **Syntax** | BPF (Berkeley Packet Filter) | Wireshark display filter syntax |
| **Performance** | Reduces capture file size | No effect on capture size |
| **Can undo?** | No — packets not captured are lost | Yes — toggle filters freely |

### Capture Filter Examples (BPF Syntax)

```
host 192.168.1.100
port 80
tcp port 443
net 10.0.0.0/8
src host 192.168.1.50 and dst port 80
not arp
icmp
```

### Display Filter Examples (Wireshark Syntax)

```
ip.addr == 192.168.1.100
tcp.port == 443
http.request.method == "GET"
dns.qry.name contains "example"
tcp.flags.syn == 1 && tcp.flags.ack == 0
frame.len > 1000
tcp.analysis.retransmission
ip.src == 10.0.0.0/8
!(arp || icmp)
```

### Common Display Filter Reference

| Filter | Shows |
|--------|-------|
| `tcp` | All TCP packets |
| `udp` | All UDP packets |
| `http` | HTTP traffic |
| `tls` | TLS/SSL traffic |
| `dns` | DNS queries and responses |
| `icmp` | Ping and ICMP messages |
| `tcp.flags.reset == 1` | TCP RST packets (connection resets) |
| `tcp.analysis.retransmission` | Retransmitted segments |
| `tcp.analysis.zero_window` | Zero window (receiver buffer full) |
| `ip.addr == X && tcp.port == Y` | Specific host and port |

---

## 4. Analyzing the TCP Three-Way Handshake

The handshake is the foundation of every TCP connection. In Wireshark you will see three packets:

```
Packet Flow (three-way handshake):

Client (10.0.0.5)                    Server (93.184.216.34)
      |                                     |
      |---- SYN (seq=0) ------------------->|   Packet #1
      |                                     |
      |<--- SYN-ACK (seq=0, ack=1) --------|   Packet #2
      |                                     |
      |---- ACK (ack=1) ------------------->|   Packet #3
      |                                     |
      |==== Connection ESTABLISHED =========|
```

### What to Look For in Wireshark

| Packet | Info Column | Key Fields |
|--------|-------------|------------|
| 1 | `SYN` | `tcp.flags.syn==1`, `tcp.flags.ack==0`, seq=0 |
| 2 | `SYN, ACK` | `tcp.flags.syn==1`, `tcp.flags.ack==1` |
| 3 | `ACK` | `tcp.flags.syn==0`, `tcp.flags.ack==1` |

**Display filter for handshakes only:**
```
tcp.flags.syn == 1
```

**Tip:** Right-click a SYN packet and select **Follow > TCP Stream** to see the complete conversation that follows the handshake.

---

## 5. Following TCP Streams

One of Wireshark's most powerful features: reconstructing the full data exchanged between two endpoints.

1. Right-click any packet in the conversation
2. Select **Follow > TCP Stream**
3. A window opens showing the reassembled data

```
+--------------------------------------------------+
| Follow TCP Stream                                |
|                                                  |
| GET / HTTP/1.1                     (red = client)|
| Host: example.com                               |
| User-Agent: curl/7.81.0                         |
|                                                  |
| HTTP/1.1 200 OK                    (blue = server|
| Content-Type: text/html                          |
| Content-Length: 1256                             |
| ...                                             |
|                                                  |
| [Stream index: 4] [Show: ASCII v]               |
+--------------------------------------------------+
```

- **Red text** = data sent by the client
- **Blue text** = data sent by the server
- Use the stream index dropdown to switch between different conversations

---

## 6. HTTP / HTTPS Analysis

### HTTP (unencrypted — port 80)

Filter: `http`

You can see full request and response headers and bodies:

```
GET /index.html HTTP/1.1
Host: example.com
Accept: text/html
```

Useful HTTP filters:

```
http.request.method == "POST"
http.response.code == 404
http.host contains "api"
http.content_type contains "json"
http.request.uri contains "/login"
```

### HTTPS / TLS (encrypted — port 443)

Filter: `tls`

With HTTPS, the payload is encrypted. You see:

```
Packet flow:
  Client Hello  ---->  (lists supported cipher suites, SNI)
  Server Hello  <----  (chosen cipher suite, certificate)
  Key Exchange  <---->
  Application Data (encrypted, unreadable)
```

**Useful TLS filter:**
```
tls.handshake.extensions_server_name contains "example"
```

This shows the **SNI (Server Name Indication)** field, which reveals the hostname even though the content is encrypted.

> **Decrypting TLS in Wireshark:** If you set the `SSLKEYLOGFILE` environment variable before starting your browser, Wireshark can import the session keys to decrypt traffic. See Wireshark docs for details.

---

## 7. DNS Query Analysis

Filter: `dns`

```
DNS Query and Response:

+--------+                        +----------+
| Client |---Query: A example.com--->| DNS     |
|        |<--Response: 93.184.216.34--| Server  |
+--------+                        +----------+
```

### What to Examine

| Field | Where in Wireshark | Meaning |
|-------|-------------------|---------|
| `dns.qry.name` | Queries section | Domain being resolved |
| `dns.qry.type` | Queries section | Record type (A=1, AAAA=28, MX=15) |
| `dns.resp.addr` | Answers section | Resolved IP address |
| `dns.time` | Frame info | Response time |
| `dns.flags.rcode` | Flags | 0=No Error, 3=NXDOMAIN |

### Useful DNS Filters

```
dns.qry.name == "example.com"
dns.flags.rcode == 3                    # NXDOMAIN (domain not found)
dns.qry.type == 28                      # AAAA (IPv6) lookups
dns.time > 0.5                          # Slow DNS responses
dns.resp.addr == 0.0.0.0                # Suspicious sinkhole response
```

---

## 8. Detecting Suspicious Traffic

Packet analysis is critical for security. Here are patterns to watch for:

### Port Scanning Detection

```
# Many SYN packets to different ports from one source
tcp.flags.syn == 1 && tcp.flags.ack == 0
```

Look for a single source IP sending SYN packets to many different destination ports in a short time.

### ARP Spoofing

```
arp.duplicate-address-detected
```

Multiple IPs mapping to the same MAC address, or one IP suddenly switching MAC addresses.

### DNS Exfiltration

```
dns.qry.name contains "."
frame.len > 200 && dns
```

Unusually long DNS query names or high volumes of DNS traffic to a single unusual domain.

### Suspicious Patterns Summary

| Pattern | Filter / Indicator |
|---------|-------------------|
| Port scan | Many SYN-only packets, sequential ports |
| DDoS | Massive volume from many sources to one dest |
| ARP spoof | Duplicate IP-to-MAC mappings |
| DNS tunnel | Large/encoded DNS queries, high query volume |
| Brute force | Repeated connections to SSH (port 22) or RDP (3389) |
| Data exfil | Large outbound transfers to unknown IPs |

---

## 9. Exporting and Saving Captures

### Save Formats

| Format | Extension | Use Case |
|--------|-----------|----------|
| pcapng | `.pcapng` | Default, supports annotations and multiple interfaces |
| pcap | `.pcap` | Legacy, maximum compatibility |
| CSV | `.csv` | Spreadsheet analysis |

### Export Options

- **File > Save As** — save entire capture
- **File > Export Specified Packets** — save only displayed (filtered) packets
- **File > Export Objects > HTTP** — extract files transferred over HTTP
- **File > Export Packet Dissections** — export as text/CSV/XML

### Splitting Large Captures

```bash
# Split a large pcap into 100MB files
editcap -c 50000 large.pcap split_output.pcap

# Extract time range
editcap -A "2025-01-15 10:00:00" -B "2025-01-15 10:05:00" \
    full.pcap timerange.pcap
```

---

## 10. tshark — Command-Line Wireshark

`tshark` is Wireshark's CLI counterpart. It's ideal for servers, scripts, and automation.

```bash
# Capture on eth0 (live)
tshark -i eth0

# Capture with display filter
tshark -i eth0 -Y "http.request"

# Capture with capture filter, save to file
tshark -i eth0 -f "tcp port 80" -w http_traffic.pcap

# Read a pcap file with a filter
tshark -r capture.pcap -Y "dns"

# Extract specific fields
tshark -r capture.pcap -T fields \
    -e frame.time -e ip.src -e ip.dst -e tcp.port

# Show HTTP requests only (method, host, URI)
tshark -r capture.pcap -Y "http.request" -T fields \
    -e http.request.method -e http.host -e http.request.uri

# Count packets per protocol
tshark -r capture.pcap -q -z io,phs

# Show conversation statistics
tshark -r capture.pcap -q -z conv,tcp
```

### tshark vs Wireshark

| Feature | Wireshark | tshark |
|---------|-----------|--------|
| Interface | GUI | CLI |
| Best for | Interactive analysis | Scripting, servers |
| Resource usage | Higher (rendering) | Lower |
| Filter syntax | Same display filter syntax | Same |
| Output formats | Visual + export | Text, JSON, fields |

---

## Wireshark Workflow Summary

```
+-----------------------------------------------------+
| 1. Plan: What are you looking for?                  |
|    - Set capture filter to limit scope              |
+-----------------------------------------------------+
           |
           v
+-----------------------------------------------------+
| 2. Capture: Start recording on the right interface  |
|    - Use Ctrl+E to start/stop                       |
+-----------------------------------------------------+
           |
           v
+-----------------------------------------------------+
| 3. Filter: Apply display filters to focus           |
|    - Use the filter toolbar at the top              |
|    - Green = valid filter, Red = syntax error       |
+-----------------------------------------------------+
           |
           v
+-----------------------------------------------------+
| 4. Analyze: Drill into packets                      |
|    - Expand protocol layers in the middle pane      |
|    - Follow streams, check timestamps               |
+-----------------------------------------------------+
           |
           v
+-----------------------------------------------------+
| 5. Export: Save relevant packets or extracted data   |
+-----------------------------------------------------+
```

---

## Exercises

### Beginner

1. Install Wireshark and capture 30 seconds of traffic on your main network interface. How many packets were captured? What are the top 3 protocols? (Use Statistics > Protocol Hierarchy.)
2. Open a capture and apply the filter `dns`. Find a DNS query. What domain was looked up? What IP address was returned? What was the query time?
3. Apply the filter `tcp.flags.syn == 1 && tcp.flags.ack == 0`. These are connection initiation packets. How many new connections were started in your capture?

### Intermediate

4. Open a browser and visit `http://example.com` (HTTP, not HTTPS). In Wireshark, find the full TCP handshake, the HTTP GET request, and the HTTP 200 response. Follow the TCP stream to see the HTML.
5. Use the display filter `tcp.analysis.retransmission` on a capture. If you find retransmissions, what might be causing them? Check the time between the original packet and the retransmission.
6. Use tshark to extract all DNS queries from a pcap file: `tshark -r capture.pcap -Y "dns.qry.name" -T fields -e dns.qry.name | sort | uniq -c | sort -rn`. What are the most frequently queried domains?

### Advanced

7. Set the environment variable `SSLKEYLOGFILE=~/sslkeys.log`, open Firefox, browse to an HTTPS site, then load the key log file into Wireshark (Edit > Preferences > Protocols > TLS > Pre-Master-Secret log filename). Can you now see the decrypted HTTP/2 traffic?
8. Create a tshark one-liner that monitors your network in real-time and alerts when it sees more than 10 SYN packets per second to a single destination (potential port scan).
9. Capture traffic while performing a `git clone` over HTTPS. Identify the TLS handshake, certificate exchange, and the SNI field. What TLS version was negotiated?

---

## Key Takeaways

- **Capture filters** reduce file size at capture time; **display filters** let you explore after the fact
- The **TCP handshake** (SYN, SYN-ACK, ACK) is visible in every new connection — learn to spot it instantly
- **Follow TCP Stream** reconstructs the full application-layer conversation
- HTTPS encrypts the payload, but **SNI** and **DNS queries** still reveal the destination hostname
- **tshark** brings Wireshark's power to the command line for scripting and remote analysis
- Always capture **more** than you think you need — you can filter later, but you can't recover packets you didn't capture

---

## Navigation

| Previous | Home | Next |
|:---------|:----:|-----:|
| [Troubleshooting Tools](./01_troubleshooting_tools.md) | [Practical Networking](./README.md) | [Network Configuration](./03_network_configuration.md) |
