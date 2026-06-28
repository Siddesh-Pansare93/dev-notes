# ICMP and Network Diagnostics

## What You'll Learn

- What ICMP is and its role in the IP protocol suite
- Common ICMP message types (Echo, Destination Unreachable, Time Exceeded, Redirect)
- How to use `ping` effectively, including options and interpreting output
- How `traceroute`/`tracert` works internally and how to read its output
- `pathping` on Windows for combined ping/traceroute analysis
- MTU, Path MTU Discovery, and fragmentation
- Practical diagnostic scenarios and troubleshooting workflows

## What is ICMP?

**ICMP** (Internet Control Message Protocol) is a supporting protocol in the IP suite used by network devices to send **error messages** and **operational information**. ICMP itself does not carry application data -- it exists to help diagnose and report network problems.

```
Where ICMP Fits:

  +----------------------------+
  |     Application Layer      |
  +----------------------------+
  |     Transport (TCP/UDP)    |
  +----------------------------+
  |  Network Layer (IP + ICMP) |   <-- ICMP lives here, alongside IP
  +----------------------------+
  |     Data Link / Physical   |
  +----------------------------+

  ICMP messages are encapsulated inside IP packets.
  Protocol number: 1 (in the IP header's Protocol field)
```

### ICMP is Not a Transport Protocol

ICMP does not establish connections or transfer user data. It is a **diagnostic and control protocol** that helps the network layer function correctly.

## ICMP Message Types

Each ICMP message has a **Type** and **Code** that identify its purpose:

### Key ICMP Message Types

| Type | Code | Name | Description |
|------|------|------|-------------|
| 0 | 0 | Echo Reply | Response to a ping |
| 3 | 0 | Dest. Unreachable: Net | Network unreachable |
| 3 | 1 | Dest. Unreachable: Host | Host unreachable |
| 3 | 3 | Dest. Unreachable: Port | Port unreachable (UDP) |
| 3 | 4 | Fragmentation Needed | Packet too large, DF bit set |
| 4 | 0 | Source Quench | Slow down (deprecated) |
| 5 | 0 | Redirect | Use a better gateway |
| 8 | 0 | Echo Request | Ping request |
| 11 | 0 | Time Exceeded: TTL | TTL expired in transit |
| 11 | 1 | Time Exceeded: Fragment | Fragment reassembly timeout |

```
ICMP Packet Structure:

  +--------+--------+-------------------+
  | Type   | Code   |    Checksum       |
  | (8 bit)| (8 bit)|    (16 bit)       |
  +--------+--------+-------------------+
  |       Message-Specific Data         |
  |     (varies by type/code)           |
  +-------------------------------------+
```

### Common Scenarios

```
Scenario 1: Host Unreachable

  [Your PC] ---> [Router] --X-- [Dead Host]
                    |
                    +---> ICMP Type 3, Code 1 (Host Unreachable)
                          sent back to Your PC

Scenario 2: TTL Exceeded

  [Your PC] ---> [R1] ---> [R2] ---> [R3] ---> ...
  TTL=3           TTL=2     TTL=1     TTL=0!
                                       |
                                       +---> ICMP Type 11, Code 0
                                             sent back to Your PC

Scenario 3: Port Unreachable

  [Your PC] ---> [Server]
  UDP to port 9999          (no service listening)
                    |
                    +---> ICMP Type 3, Code 3 (Port Unreachable)
```

## The ping Command

`ping` sends ICMP Echo Request messages to a target and waits for Echo Reply messages. It is the most basic connectivity test.

### Basic Usage

```bash
# Linux/macOS (runs until interrupted with Ctrl+C)
$ ping 8.8.8.8
PING 8.8.8.8 (8.8.8.8) 56(84) bytes of data.
64 bytes from 8.8.8.8: icmp_seq=1 ttl=118 time=12.3 ms
64 bytes from 8.8.8.8: icmp_seq=2 ttl=118 time=11.8 ms
64 bytes from 8.8.8.8: icmp_seq=3 ttl=118 time=12.1 ms
^C
--- 8.8.8.8 ping statistics ---
3 packets transmitted, 3 received, 0% packet loss, time 2004ms
rtt min/avg/max/mdev = 11.8/12.067/12.3/0.205 ms
```

```cmd
REM Windows (sends 4 pings by default)
> ping 8.8.8.8
Pinging 8.8.8.8 with 32 bytes of data:
Reply from 8.8.8.8: bytes=32 time=12ms TTL=118
Reply from 8.8.8.8: bytes=32 time=11ms TTL=118
Reply from 8.8.8.8: bytes=32 time=12ms TTL=118
Reply from 8.8.8.8: bytes=32 time=11ms TTL=118

Ping statistics for 8.8.8.8:
    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss),
Approximate round trip times in milli-seconds:
    Minimum = 11ms, Maximum = 12ms, Average = 11ms
```

### Interpreting ping Output

| Field | Meaning |
|-------|---------|
| `bytes` | Size of the ICMP payload |
| `icmp_seq` | Sequence number (detects packet loss and reordering) |
| `ttl` | Time to Live remaining (initial TTL minus hops traversed) |
| `time` | Round-trip time in milliseconds |
| `packet loss` | Percentage of packets that never received a reply |
| `rtt min/avg/max` | Round-trip time statistics |

### Useful ping Options

```bash
# Linux/macOS
$ ping -c 5 8.8.8.8           # Send exactly 5 packets
$ ping -i 0.2 8.8.8.8         # 0.2 second interval between pings
$ ping -s 1472 8.8.8.8        # Send with specific payload size (MTU test)
$ ping -t 10 8.8.8.8          # Set TTL to 10 (macOS: -m on Linux)
$ ping -W 2 8.8.8.8           # Timeout after 2 seconds per reply
$ ping -f 8.8.8.8             # Flood ping (root only, stress test)
$ ping -4 google.com          # Force IPv4
$ ping -6 google.com          # Force IPv6
```

```cmd
REM Windows
> ping -n 10 8.8.8.8          &REM Send 10 packets
> ping -t 8.8.8.8             &REM Ping continuously until Ctrl+C
> ping -l 1472 8.8.8.8        &REM Set packet size (MTU test)
> ping -i 10 8.8.8.8          &REM Set TTL to 10
> ping -w 2000 8.8.8.8        &REM Timeout 2000 ms
> ping -4 google.com          &REM Force IPv4
> ping -6 google.com          &REM Force IPv6
```

### Common ping Results and What They Mean

| Result | Likely Cause |
|--------|-------------|
| Replies with low time | Connection is working well |
| High/variable time | Congestion, distance, or slow links |
| `Request timed out` | Host down, firewall blocking, or route issue |
| `Destination host unreachable` | No route to host (router can't reach it) |
| `Destination net unreachable` | No route to the network |
| `TTL expired in transit` | TTL too low or routing loop |
| 100% packet loss | Host down, ICMP blocked, or no route |
| Intermittent loss | Congestion, flapping link, or wireless interference |

## traceroute / tracert

`traceroute` (Linux/macOS) or `tracert` (Windows) maps the path packets take from your machine to a destination, showing every router (hop) along the way.

### How It Works

```
traceroute Mechanism:

  1. Send packet with TTL=1
     First router decrements TTL to 0
     Router sends ICMP Time Exceeded back
     --> You now know Hop 1

  2. Send packet with TTL=2
     First router decrements to 1, forwards
     Second router decrements to 0
     Router sends ICMP Time Exceeded back
     --> You now know Hop 2

  3. Send packet with TTL=3
     ... and so on until you reach the destination

  [PC] --- [R1] --- [R2] --- [R3] --- [Destination]
  TTL=1    reply!
  TTL=2           reply!
  TTL=3                    reply!
  TTL=4                              reply! (Echo Reply)
```

### Reading traceroute Output

```bash
$ traceroute 8.8.8.8
traceroute to 8.8.8.8 (8.8.8.8), 30 hops max, 60 byte packets
 1  192.168.1.1 (192.168.1.1)          1.234 ms   0.987 ms   1.102 ms
 2  10.0.0.1 (10.0.0.1)               5.678 ms   5.432 ms   5.501 ms
 3  isp-router.example.net (72.1.2.3) 12.345 ms  11.987 ms  12.102 ms
 4  * * *
 5  core-rtr.example.net (74.5.6.7)   15.678 ms  15.432 ms  15.501 ms
 6  dns.google (8.8.8.8)              12.789 ms  12.654 ms  12.701 ms

Columns:
 Hop#  Hostname (IP)                    RTT1       RTT2       RTT3
```

| Symbol | Meaning |
|--------|---------|
| `* * *` | No response (firewall blocks ICMP, or rate-limited) |
| `!H` | Host unreachable |
| `!N` | Network unreachable |
| `!X` | Administratively prohibited |
| `!F` | Fragmentation needed (DF bit set) |

### Windows tracert

```cmd
> tracert 8.8.8.8
Tracing route to dns.google [8.8.8.8]
over a maximum of 30 hops:

  1     1 ms     1 ms     1 ms  192.168.1.1
  2     5 ms     5 ms     5 ms  10.0.0.1
  3    12 ms    12 ms    12 ms  isp-router.example.net [72.1.2.3]
  4     *        *        *     Request timed out.
  5    15 ms    15 ms    16 ms  74.5.6.7
  6    12 ms    13 ms    12 ms  dns.google [8.8.8.8]

Trace complete.
```

> **Note**: `traceroute` on Linux/macOS uses UDP by default; `tracert` on Windows uses ICMP.

## pathping (Windows)

`pathping` combines `ping` and `tracert` -- it first traces the route, then sends many pings to each hop to measure packet loss at every point.

```cmd
> pathping 8.8.8.8
Tracing route to dns.google [8.8.8.8]
over a maximum of 30 hops:
  0  mycomputer [192.168.1.100]
  1  192.168.1.1
  2  10.0.0.1
  3  8.8.8.8

Computing statistics for 75 seconds...
            Source to Here   This Node/Link
Hop  RTT    Lost/Sent = Pct  Lost/Sent = Pct  Address
  0                                           192.168.1.100
                                0/ 100 =  0%   |
  1    1ms     0/ 100 =  0%     0/ 100 =  0%  192.168.1.1
                                0/ 100 =  0%   |
  2    5ms     0/ 100 =  0%     0/ 100 =  0%  10.0.0.1
                                2/ 100 =  2%   |
  3   12ms     2/ 100 =  2%     0/ 100 =  0%  8.8.8.8

The "This Node/Link" column pinpoints WHERE packet loss occurs.
```

## MTU and Path MTU Discovery

### What is MTU?

**MTU** (Maximum Transmission Unit) is the largest packet size (in bytes) that a network link can transmit without fragmentation.

```
Common MTU Values:

  Ethernet:        1500 bytes (most common)
  Jumbo frames:    9000 bytes (data centers)
  PPPoE (DSL):     1492 bytes
  VPN tunnels:     1400-1460 bytes (varies by encapsulation)
  Dial-up:         576 bytes
```

### Path MTU Discovery

When a packet is too large for a link and the **Don't Fragment (DF)** bit is set, the router drops the packet and sends an ICMP **Fragmentation Needed** message back. The sender then reduces the packet size.

```
Path MTU Discovery:

  [Sender] --1500B--> [R1] --1500B--> [R2] --X-- link MTU=1400
                                        |
                                        +---> ICMP Type 3, Code 4
                                              "Fragmentation Needed"
                                              "Next-Hop MTU: 1400"
                                        |
  [Sender] <---------------------------+
  (Sender reduces packet size to 1400 and retransmits)
```

### Testing MTU with ping

```bash
# Linux: Test if 1500-byte packets pass without fragmentation
# Payload = MTU - IP header (20) - ICMP header (8) = 1472
$ ping -c 3 -s 1472 -M do 8.8.8.8    # -M do = set DF bit

# If MTU is 1500, this succeeds:
64 bytes from 8.8.8.8: icmp_seq=1 ttl=118 time=12ms

# If payload is too large (e.g., -s 1473), this fails:
ping: local error: message too long, mtu=1500
```

```cmd
REM Windows: Test MTU
> ping -f -l 1472 8.8.8.8
REM -f = Don't Fragment, -l = payload size

REM If too large:
REM Packet needs to be fragmented but DF set.
```

## Common Diagnostic Scenarios

### Scenario 1: "I Can't Reach a Website"

```
Troubleshooting Steps:

  1. ping localhost (127.0.0.1)     --> Tests TCP/IP stack
     Fails? Reinstall network stack

  2. ping your own IP               --> Tests NIC configuration
     Fails? Check IP/NIC settings

  3. ping default gateway            --> Tests local network
     Fails? Check cable/Wi-Fi, gateway config

  4. ping external IP (8.8.8.8)     --> Tests internet connectivity
     Fails? ISP issue or firewall

  5. ping domain name (google.com)  --> Tests DNS resolution
     Fails but step 4 works? DNS problem

  6. traceroute to destination       --> Find where packets stop
```

### Scenario 2: "Connection is Slow"

```
  1. ping gateway: check for high latency or loss
  2. traceroute: identify which hop introduces delay
  3. pathping (Windows): measure per-hop loss over time
  4. Check for bandwidth saturation with iperf/speedtest
  5. Look for duplex mismatch or wireless interference
```

### Scenario 3: "Intermittent Connectivity"

```
  1. ping -t gateway (continuous ping): watch for drops
  2. Check for packet loss patterns (time of day, duration)
  3. traceroute during failure: compare with normal path
  4. Check physical connections (cables, connectors)
  5. Monitor for IP conflicts (two devices with same IP)
```

## Diagnostic Command Summary

| Tool | Platform | Purpose |
|------|----------|---------|
| `ping` | All | Test reachability and round-trip time |
| `traceroute` | Linux/macOS | Map the path to destination (UDP default) |
| `tracert` | Windows | Map the path to destination (ICMP) |
| `pathping` | Windows | Combined trace + per-hop loss analysis |
| `mtr` | Linux | Real-time combined traceroute + ping |
| `ping -s` / `ping -l` | Linux / Windows | Test MTU / fragmentation |
| `ip route get` | Linux | Show which route a destination uses |

## Exercises

### Beginner

1. Use `ping` to test connectivity to the following targets from your machine. Record the RTT and TTL for each:
   - `127.0.0.1` (loopback)
   - Your default gateway
   - `8.8.8.8` (Google DNS)
   - `google.com`

2. What ICMP type and code correspond to:
   - A ping request?
   - A ping reply?
   - TTL expired?
   - Destination host unreachable?

3. Run `traceroute`/`tracert` to `google.com`. How many hops does it take? Can you identify your ISP's routers?

### Intermediate

4. A `traceroute` shows `* * *` at hop 4, but all subsequent hops (5-8) respond normally. Does this mean hop 4 is down? Explain why or why not.

5. Use `ping` with the Don't Fragment flag to determine the Path MTU between your machine and `8.8.8.8`:
   ```bash
   # Start with 1472, decrease until it works
   ping -c 1 -s 1472 -M do 8.8.8.8    # Linux
   ping -f -l 1472 8.8.8.8             # Windows
   ```

6. Explain the difference between how `traceroute` (Linux) and `tracert` (Windows) work at the protocol level. Why might you get different results from the same source?

### Advanced

7. Some organizations block all ICMP traffic at their firewalls. Discuss the security tradeoffs of this approach. What diagnostic capabilities are lost? What alternative tools can be used?

8. Research how `mtr` (My Traceroute) works on Linux. Run it against a target for 60 seconds and analyze the output. What does `mtr` reveal that `traceroute` alone cannot?

9. Explain how a TTL-based attack could be used for network reconnaissance. How does an attacker use traceroute output to map an organization's internal network topology?

## Key Takeaways

- ICMP is a diagnostic protocol that reports errors and provides network information
- `ping` uses ICMP Echo Request/Reply to test reachability and measure round-trip time
- `traceroute`/`tracert` exploits TTL expiration to map the path packets take through the network
- `pathping` (Windows) combines trace and per-hop loss measurement for detailed analysis
- MTU mismatches cause fragmentation or dropped packets; Path MTU Discovery uses ICMP to find the correct size
- A systematic troubleshooting approach (loopback -> NIC -> gateway -> internet -> DNS) isolates problems efficiently
- Blocking ICMP entirely can break Path MTU Discovery and complicate troubleshooting

---

[← Previous: Routing Protocols](./05_routing_protocols.md) | [Back to Network Layer](./README.md) | [Next: NAT and Port Forwarding →](./07_nat_and_port_forwarding.md)
