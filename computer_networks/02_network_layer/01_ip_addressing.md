# IP Addressing Fundamentals

## What You'll Learn

- What an IP address is and why every networked device needs one
- The structure of an IPv4 address (32-bit, dotted decimal notation)
- IP address classes (A, B, C, D, E) and their ranges
- How the network portion and host portion of an address work together
- Special and reserved IP addresses (loopback, broadcast, private)
- The difference between public and private IP addresses (RFC 1918)
- Static vs dynamic IP assignment and how DHCP works
- How to find your IP address on any operating system

## What is an IP Address?

An **IP address** (Internet Protocol address) is a unique numerical label assigned to every device connected to a network that uses the Internet Protocol. It serves two purposes:

1. **Host Identification** -- uniquely identifies a device on a network
2. **Location Addressing** -- provides the device's location in the network topology

Think of it like a postal address: the city identifies the general area (network), and the house number identifies the specific building (host).

```
Analogy:

  Postal Address:    123 Main Street, Springfield, IL 62704
                     ^^^^^^^^^^^^     ^^^^^^^^^^^^^^^^^^^
                     Host (house)     Network (city/state/zip)

  IP Address:        192.168.1.25
                     ^^^^^^^^^  ^^
                     Network    Host
```

## IPv4 Address Structure

An IPv4 address is a **32-bit** number, usually written in **dotted decimal notation** -- four groups of numbers (octets) separated by dots.

```
Dotted Decimal:   192  .  168  .    1  .   25
                   |       |       |       |
Binary:       11000000.10101000.00000001.00011001
              |________|________|________|________|
              Octet 1   Octet 2  Octet 3  Octet 4
              (8 bits)  (8 bits) (8 bits) (8 bits)

              Total: 8 x 4 = 32 bits
```

Each octet can range from **0 to 255** (because 2^8 = 256 possible values).

### Converting Between Binary and Decimal

Each bit position represents a power of 2:

```
Bit position:  7    6    5    4    3    2    1    0
Power of 2:   128   64   32   16    8    4    2    1

Example: 192 in binary
128 + 64 = 192
  1    1    0    0    0    0    0    0  =  11000000

Example: 168 in binary
128 + 32 + 8 = 168
  1    0    1    0    1    0    0    0  =  10101000
```

## IP Address Classes

The original IP addressing scheme divided addresses into **five classes** based on the first few bits of the address. This is called **classful addressing**.

```
Class A:  0xxxxxxx . xxxxxxxx . xxxxxxxx . xxxxxxxx
          |Network |         Host          |

Class B:  10xxxxxx . xxxxxxxx . xxxxxxxx . xxxxxxxx
          |   Network        |    Host     |

Class C:  110xxxxx . xxxxxxxx . xxxxxxxx . xxxxxxxx
          |       Network               |Host|

Class D:  1110xxxx . xxxxxxxx . xxxxxxxx . xxxxxxxx
          (Multicast -- no network/host split)

Class E:  1111xxxx . xxxxxxxx . xxxxxxxx . xxxxxxxx
          (Reserved for experimental use)
```

### Class Ranges and Details

| Class | First Octet | Range | Default Mask | Networks | Hosts/Network | Purpose |
|-------|-------------|-------|--------------|----------|---------------|---------|
| A | 1-126 | 1.0.0.0 - 126.255.255.255 | 255.0.0.0 (/8) | 126 | ~16.7 million | Large organizations |
| B | 128-191 | 128.0.0.0 - 191.255.255.255 | 255.255.0.0 (/16) | 16,384 | ~65,534 | Medium organizations |
| C | 192-223 | 192.0.0.0 - 223.255.255.255 | 255.255.255.0 (/24) | 2,097,152 | 254 | Small organizations |
| D | 224-239 | 224.0.0.0 - 239.255.255.255 | N/A | N/A | N/A | Multicast |
| E | 240-255 | 240.0.0.0 - 255.255.255.255 | N/A | N/A | N/A | Experimental |

> **Note**: 127.x.x.x is reserved for loopback and is not included in any class for normal use.

## Network Portion vs Host Portion

Every IP address is split into two parts:

- **Network portion**: Identifies which network the device belongs to
- **Host portion**: Identifies the specific device within that network

The **subnet mask** determines where the split occurs.

```
IP Address:    192.168.1.25
Subnet Mask:   255.255.255.0

Binary:
IP:    11000000.10101000.00000001.00011001
Mask:  11111111.11111111.11111111.00000000
       |---- Network Portion ---|-- Host -|

Network Address:  192.168.1.0    (host bits all 0)
Broadcast:        192.168.1.255  (host bits all 1)
Usable Hosts:     192.168.1.1  to  192.168.1.254
```

To find the **network address**, perform a bitwise AND of the IP and subnet mask:

```
IP Address:     11000000.10101000.00000001.00011001  (192.168.1.25)
Subnet Mask:    11111111.11111111.11111111.00000000  (255.255.255.0)
                ──────────────── AND ────────────────
Network Addr:   11000000.10101000.00000001.00000000  (192.168.1.0)
```

## Special and Reserved Addresses

Several IP addresses have special meaning and cannot be assigned to regular hosts.

| Address | Name | Purpose |
|---------|------|---------|
| `0.0.0.0` | Default / unspecified | "This network" or "any address" (used during boot) |
| `127.0.0.1` | Loopback | Testing local network stack (localhost) |
| `127.0.0.0/8` | Loopback range | Entire 127.x.x.x block reserved for loopback |
| `255.255.255.255` | Limited broadcast | Broadcast to all hosts on the local network |
| `x.x.x.0` | Network address | Identifies the network itself (not assignable) |
| `x.x.x.255` | Directed broadcast | Broadcast to all hosts on a specific network |
| `169.254.0.0/16` | Link-local (APIPA) | Auto-assigned when DHCP fails |

### Loopback Address

```bash
# Testing the loopback address
$ ping 127.0.0.1
PING 127.0.0.1: 56 data bytes
64 bytes from 127.0.0.1: icmp_seq=0 ttl=64 time=0.031 ms

# "localhost" resolves to 127.0.0.1
$ ping localhost
PING localhost (127.0.0.1): 56 data bytes
64 bytes from 127.0.0.1: icmp_seq=0 ttl=64 time=0.028 ms
```

Packets sent to `127.0.0.1` never leave the machine -- they are looped back internally.

## Public vs Private IP Addresses

### The Problem

There are only ~4.3 billion IPv4 addresses. With billions of devices, we ran out. The solution: **private IP addresses** that can be reused inside any private network, with NAT translating them to public addresses for internet access.

### RFC 1918 Private Address Ranges

| Class | Private Range | CIDR | # of Addresses |
|-------|---------------|------|----------------|
| A | 10.0.0.0 - 10.255.255.255 | 10.0.0.0/8 | 16,777,216 |
| B | 172.16.0.0 - 172.31.255.255 | 172.16.0.0/12 | 1,048,576 |
| C | 192.168.0.0 - 192.168.255.255 | 192.168.0.0/16 | 65,536 |

```
How Private/Public Addressing Works:

  [Your PC]         [Router]                  [Web Server]
  192.168.1.25  --> NAT Translation  -->  93.184.216.34
  (Private IP)      Public IP: 73.45.2.100   (Public IP)

  Private addresses are NOT routable on the internet.
  Your router translates (NAT) your private IP to its public IP.
```

### Key Differences

| Feature | Public IP | Private IP |
|---------|-----------|------------|
| Assigned by | ISP / IANA | Network admin / DHCP |
| Routable on internet | Yes | No |
| Unique globally | Yes | Only unique within the local network |
| Cost | Allocated by ISP | Free to use |
| Example | 8.8.8.8 | 192.168.1.1 |

## Static vs Dynamic IP Addresses

### Static IP

A **static IP** is manually configured and does not change.

```bash
# Linux: Set a static IP
$ sudo ip addr add 192.168.1.100/24 dev eth0
$ sudo ip route add default via 192.168.1.1

# Windows: Set via netsh
> netsh interface ip set address "Ethernet" static 192.168.1.100 255.255.255.0 192.168.1.1
```

**Used for**: Servers, printers, network equipment -- anything that needs a predictable address.

### Dynamic IP (DHCP)

A **dynamic IP** is automatically assigned by a **DHCP server** (Dynamic Host Configuration Protocol).

```
DHCP Process (DORA):

  Client                           DHCP Server
    |                                   |
    |--- DISCOVER (broadcast) --------->|  1. "Any DHCP server out there?"
    |                                   |
    |<---------- OFFER (unicast) -------|  2. "Here's an available IP"
    |                                   |
    |--- REQUEST (broadcast) ---------->|  3. "I'll take that one, please"
    |                                   |
    |<-- ACKNOWLEDGMENT (unicast) ------|  4. "It's yours for X hours"
    |                                   |
```

DHCP assigns:
- IP address
- Subnet mask
- Default gateway
- DNS server addresses
- Lease duration

## How to Find Your IP Address

### Linux

```bash
# Modern command (recommended)
$ ip addr show
2: eth0: <BROADCAST,MULTICAST,UP> mtu 1500
    inet 192.168.1.25/24 brd 192.168.1.255 scope global eth0

# Legacy command
$ ifconfig
eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>
    inet 192.168.1.25  netmask 255.255.255.0  broadcast 192.168.1.255

# Show only IPv4 addresses
$ hostname -I
192.168.1.25
```

### Windows

```cmd
REM Show IP configuration
> ipconfig
Ethernet adapter Ethernet:
   IPv4 Address. . . . . . . : 192.168.1.25
   Subnet Mask . . . . . . . : 255.255.255.0
   Default Gateway . . . . . : 192.168.1.1

REM Detailed information (includes DHCP, DNS, MAC)
> ipconfig /all
```

### macOS

```bash
# Using ifconfig
$ ifconfig en0
en0: flags=8863<UP,BROADCAST,RUNNING,SIMPLEX,MULTICAST>
    inet 192.168.1.25 netmask 0xffffff00 broadcast 192.168.1.255

# Using ipconfig (macOS-specific)
$ ipconfig getifaddr en0
192.168.1.25
```

### Finding Your Public IP

```bash
# Using command line
$ curl ifconfig.me
73.45.2.100

$ curl icanhazip.com
73.45.2.100

# Using nslookup (queries OpenDNS)
$ nslookup myip.opendns.com resolver1.opendns.com
```

## Exercises

### Beginner

1. Convert the following IP addresses to binary:
   - `10.0.0.1`
   - `172.16.5.200`
   - `192.168.0.1`

2. Identify the class of each IP address:
   - `8.8.8.8`
   - `172.20.1.5`
   - `192.168.100.10`
   - `224.0.0.5`

3. Is each address public or private?
   - `10.255.255.1`
   - `73.45.2.100`
   - `192.168.1.1`
   - `172.32.0.1`

### Intermediate

4. Given IP `192.168.10.50` with mask `255.255.255.0`, determine:
   - Network address
   - Broadcast address
   - Range of usable host addresses
   - Total number of usable hosts

5. Run the following commands on your machine and note the results:
   ```bash
   # Find your private IP
   ip addr show     # Linux
   ipconfig         # Windows

   # Find your public IP
   curl ifconfig.me

   # Test loopback
   ping 127.0.0.1
   ```

6. Explain why `192.168.1.0` and `192.168.1.255` cannot be assigned to hosts (with a /24 mask).

### Advanced

7. A company has been assigned the Class B address `150.100.0.0`. How many hosts can it support? If they need 500 subnets, is this possible using classful addressing? What approach would solve this?

8. Explain the complete journey of a packet from your computer (`192.168.1.25`) to `google.com` (`142.250.80.46`), focusing on how the IP addresses change at each step (hint: think about NAT).

9. Research why the 127.0.0.0/8 range has over 16 million addresses reserved for loopback when practically only `127.0.0.1` is used. Is this a waste of address space?

## Key Takeaways

- An IPv4 address is a 32-bit number written as four decimal octets (e.g., `192.168.1.1`)
- Classful addressing (A/B/C/D/E) was the original scheme; modern networks use classless (CIDR)
- The subnet mask determines the boundary between the network and host portions
- Private addresses (10.x, 172.16-31.x, 192.168.x) are not routable on the internet
- DHCP dynamically assigns IP addresses using the DORA process
- Special addresses like 127.0.0.1 (loopback) and 0.0.0.0 (unspecified) have reserved roles
- Use `ip addr`, `ifconfig`, or `ipconfig` to view your IP address depending on your OS

---

[← Back to Network Layer](./README.md) | [Next: Subnetting and CIDR →](./02_subnetting_and_cidr.md)
